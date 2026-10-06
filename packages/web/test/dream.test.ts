import {deployment,freshCampaign} from '../src/progression.ts';
import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {decide, key, manhattan} from '../../core/src/index.ts';
import {runEvents, applyAction} from '../../core/src/events.ts';

function step(s:Session){
  const st=s.state;
  if(s.activeDuel){const d=s.activeDuel;expect(s.act({kind:'item',unit:d.player.id,item:'duel-round:'+(['rally','special','guard','attack','attack'][d.round])}).ok).toBe(true);return;}
  if(st.activeDialogue){expect(s.act({kind:'choose',nodeId:st.activeDialogue,optionId:'continue'}).ok).toBe(true);return;}
  if(st.currentSide!=='player'){s.tick();return;}
  const u=st.get('sima_yi');
  if(u.hasActed){s.tick();return;}
  if(u.hp<u.stats.maxHp*.5&&s.medicine>0){expect(s.act({kind:'item',unit:u.id,item:'medicine'}).ok).toBe(true);return;}
  if(st.scenarioPhase==='황제에게 접근'){
    if(u.hasMoved){s.act({kind:'wait',unit:u.id});return;}
    // The player's route goes through the opening, not straight into the wall.
    const goal=u.pos.x<=5?{x:6,y:5}:{x:11,y:2};
    const at=[...st.map.reachable(u,st.occupancy()).keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};}).sort((a,b)=>manhattan(a,goal)-manhattan(b,goal))[0]!;
    expect(s.act({kind:'move',unit:u.id,to:at}).ok).toBe(true);return;
  }
  const boss=st.living('enemy').find(e=>['chen_gong','lu_bu','zhou_yu'].includes(e.id));
  if(boss){
    // Lü Bu is a stronger physical opponent in the new rules. Challenge his
    // intellect rather than trading blows with him at close range.
    if(s.revision===4&&boss.id==='lu_bu'&&manhattan(u.pos,boss.pos)<=3&&s.act({kind:'item',unit:u.id,item:'debate',target:boss.id}).ok)return;
    if(manhattan(u.pos,boss.pos)>4&&!u.hasMoved){
      const at=[...st.map.reachable(u,st.occupancy()).keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};}).filter(p=>key(p)!==key(u.pos)).sort((a,b)=>Math.abs(manhattan(a,boss.pos)-4)-Math.abs(manhattan(b,boss.pos)-4))[0]!;
      expect(s.act({kind:'move',unit:u.id,to:at}).ok).toBe(true);return;
    }
    if(u.mp>=st.strategies.get('windDragon')!.mpCost&&manhattan(u.pos,boss.pos)<=4){expect(s.act({kind:'strategy',unit:u.id,strategy:'windDragon',at:boss.pos}).ok).toBe(true);return;}
  }
  for(const cmd of decide(st,u)){
    if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;
    const result=s.act(cmd);expect(result.ok,result.error).toBe(true);
    if(st.activeDialogue||st.outcome!=='ongoing')break;
  }
  if(!u.hasActed&&!st.activeDialogue&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});
}

describe('흉몽 · 세 대결과 황제 접근',()=>{
  it.each(['normal','extreme','campaign','newRules'] as const)('completes all segments with replay and undo on %s',mode=>{
    const c=freshCampaign();c.xp.sima_yi=420;const s=new Session(4,mode==='extreme'?'extreme':'normal',215,'survival',mode==='newRules'?4:3,['campaign','newRules'].includes(mode)?deployment(c):undefined);const seen=new Set<string>();let transitions=0;
    for(let n=0;n<500&&s.state.outcome==='ongoing';n++){
      const old=s.phase;step(s);seen.add(s.phase);
      if(old!==s.phase){
        transitions++;
        const hero=s.state.get('sima_yi');expect(hero.hp).toBe(hero.stats.maxHp);expect(hero.mp).toBe(hero.stats.maxMp);
        const restored=Session.load(JSON.parse(JSON.stringify(s.save())));
        expect(restored.state.snapshot()).toEqual(s.state.snapshot());
        expect(restored.restorePhase()).toBe(true);expect(restored.phase).toBe(old);
      }
    }
    expect([...seen],JSON.stringify({outcome:s.state.outcome,turn:s.state.turn,hero:s.state.get('sima_yi'),log:s.state.log.slice(-10)})).toEqual(['진궁과의 대결','여포와의 대결','주유와의 대결','황제에게 접근']);
    expect(transitions).toBe(3);expect(s.state.outcome,JSON.stringify({turn:s.state.turn,hero:s.state.get('sima_yi').pos,hp:s.state.get('sima_yi').hp,log:s.state.log.slice(-8)})).toBe('victory');
    expect(s.state.living('enemy').length).toBeGreaterThan(0);
    const saved=Session.load(s.save());expect(saved.state.snapshot()).toEqual(s.state.snapshot());
    expect(saved.undo()).toBe(true);expect(saved.state.outcome).toBe('ongoing');
  });
  it('does not award victory for early arrival or an empty intermediate arena',()=>{
    const s=new Session(4);s.state.get('sima_yi').pos={x:11,y:2};
    s.act({kind:'choose',nodeId:'dream_0',optionId:'continue'});
    expect(s.state.outcome).toBe('ongoing');
    s.state.retreat(s.state.get('chen_gong'));s.act({kind:'wait',unit:'sima_yi'});
    expect(s.phase).toBe('여포와의 대결');expect(s.state.outcome).toBe('ongoing');
  });
  it('ignores expired segment events and preserves phase in a core snapshot',()=>{
    const s=new Session(4),st=s.state,snapshot=st.snapshot();
    st.scenarioPhase='황제에게 접근';st.retreat(st.get('chen_gong'));
    runEvents(st,{kind:'after_action'});expect(st.find('lu_bu')).toBeUndefined();
    st.restore(snapshot);expect(st.scenarioPhase).toBe('진궁과의 대결');
    expect(st.get('chen_gong').alive).toBe(true);
  });
  it('scripted departures do not add losses and recovery never resurrects a defeated hero',()=>{
    const st=new Session(4).state;
    applyAction(st,{type:'dismiss_units',targets:['chen_gong']});
    expect(st.losses.enemy).toBe(0);expect(st.find('chen_gong')).toBeUndefined();
    st.retreat(st.get('sima_yi'));applyAction(st,{type:'recover_units',targets:['sima_yi']});
    expect(st.get('sima_yi').alive).toBe(false);
  });
});
