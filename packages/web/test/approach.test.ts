import {describe,it,expect} from 'vitest';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {award,deployment,equip,freshCampaign} from '../src/progression.ts';
import {CONTROLLABLE,decide,key,manhattan} from '../../core/src/index.ts';

function create(difficulty:'normal'|'extreme',seed=215){
  const campaign=freshCampaign();
  for(const i of [2,0,3,4,5,6])award(campaign,chapters[i]!.stage.id,'normal',chapters[i]!.stage.deployment.forced,[1]);
  if(difficulty==='extreme')award(campaign,'S1-07','normal',['sima_yi','cao_zhen'],[1]);
  equip(campaign,'sima_yi','mengde');equip(campaign,'cao_zhen','yitian');
  return new Session(7,difficulty,seed,'strategy',3,deployment(campaign));
}
function play(s:Session){
  for(let i=0;i<1800&&s.state.outcome==='ongoing';i++){
    const st=s.state;
    // 연의 맞수(조진-양앙)가 붙으면 자동 일기토가 열린다: 5합을 마저 치른다.
    if(s.activeDuel){expect(s.act({kind:'item',unit:s.activeDuel.player.id,item:'duel-round:attack'}).ok).toBe(true);continue;}
    if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}
    const u=st.living(st.currentSide).find(u=>!u.hasActed);if(!u){s.tick();continue;}
    if(u.unitClass==='fengshui'&&u.mp>=8){
      const target=st.living().filter(t=>t.side!=='enemy'&&t.hp<t.stats.maxHp-20&&manhattan(t.pos,u.pos)<=3).sort((a,b)=>a.hp/a.stats.maxHp-b.hp/b.stats.maxHp)[0];
      if(target){expect(s.act({kind:'item',unit:u.id,item:'heal',target:target.id}).ok).toBe(true);continue;}
    }
    if(u.canUseItems&&u.hp<u.stats.maxHp*.45&&s.medicine>0){expect(s.act({kind:'item',unit:u.id,item:'medicine'}).ok).toBe(true);continue;}
    // A player keeps an exhausted strategist behind the front line instead of
    // following the aggressive enemy AI into a losing melee.
    if(u.id==='sima_yi'&&u.mp<6){
      const options=[...st.map.reachable(u,st.occupancy()).keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};});
      const safe=options.filter(p=>st.living('enemy').every(e=>manhattan(p,e.pos)>e.range[1]+1)).sort((a,b)=>manhattan(a,u.pos)-manhattan(b,u.pos))[0];
      if(safe&&key(safe)!==key(u.pos))expect(s.act({kind:'move',unit:u.id,to:safe}).ok).toBe(true);
      if(s.activeDuel)continue;
      expect(s.act({kind:'wait',unit:u.id}).ok).toBe(true);continue;
    }
    for(const cmd of decide(st,u)){
      if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;
      const result=s.act(cmd);expect(result.ok,result.error).toBe(true);
      if(st.outcome!=='ongoing'||s.activeDuel)break;
    }
    if(s.activeDuel)continue;
    if(!u.hasActed&&st.outcome==='ongoing')expect(s.act({kind:'wait',unit:u.id}).ok).toBe(true);
  }
}
describe('한중 정벌전 上 · 산길의 수비망',()=>{
  it.each(['normal','extreme'] as const)('completes the new spell and officer rules on %s',difficulty=>{const prior=create(difficulty),s=new Session(7,difficulty,215,'strategy',4,prior.deployment);play(s);expect(s.state.outcome,s.failure).toBe('victory');expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());});
  it('allows a normal clear with no treasures and the default survival preparation',()=>{
    const d=create('normal').deployment!;d.equipped={};
    const s=new Session(7,'normal',215,'survival',3,d);play(s);
    expect(s.state.outcome,JSON.stringify({turn:s.state.turn,failure:s.failure,units:s.state.living().map(u=>[u.id,u.hp,u.mp,u.pos]),log:s.state.log.slice(-12)})).toBe('victory');
  });
  it.each([['normal',215],['normal',917],['extreme',215],['extreme',917]] as const)('can finish %s with seed %s using campaign-level units',(difficulty,seed)=>{
    const s=create(difficulty,seed);play(s);
    expect(s.state.outcome,JSON.stringify({turn:s.state.turn,units:s.state.living().map(u=>[u.id,u.hp,u.pos]),log:s.state.log.slice(-5)})).toBe('victory');
    expect(s.state.living('enemy')).toHaveLength(0);expect(s.seals).toContain(1);
    expect(s.state.get('sima_yi').alive&&s.state.get('cao_zhen').alive).toBe(true);
    const restored=Session.load(s.save());expect(restored.state.snapshot()).toEqual(s.state.snapshot());
    expect(restored.undo()).toBe(true);expect(restored.state.outcome).toBe('ongoing');
  });
  it('requires all defenders, not only the commander, and protects both protagonists',()=>{
    const s=create('normal');s.state.retreat(s.state.get('yang_ang'));s.act({kind:'wait',unit:'sima_yi'});expect(s.state.outcome).toBe('ongoing');
    for(const id of ['sima_yi','cao_zhen']){const loss=create('normal');loss.state.retreat(loss.state.get(id));loss.act({kind:'endPhase'});expect(loss.state.outcome).toBe('defeat');}
  });
  it('connects both routes and preserves every earlier chapter index',()=>{
    const s=create('normal'),st=s.state,seen=new Set<string>(),queue=[st.get('sima_yi').pos];
    while(queue.length){const p=queue.shift()!;if(seen.has(key(p)))continue;seen.add(key(p));for(const n of [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}])if(st.map.inBounds(n)&&Number.isFinite(st.map.moveCost('infantry',n))&&!seen.has(key(n)))queue.push(n);}
    for(const u of st.living())expect(seen.has(key(u.pos)),u.id).toBe(true);
    for(const p of st.map.regionCoords('forest_route'))expect(seen.has(key(p))).toBe(true);
    expect([st.map.width,st.map.height]).toEqual([26,20]);
    expect(chapters.slice(0,7).map(c=>c.stage.id)).toEqual(['S1-02','S1-08','S1-01','S1-03','S1-04','S1-05','S1-06']);
    expect(campaignOrder.slice(5,8)).toEqual([6,7,1]);
  });
  it('awards the new armor once and carries it into the next battle',()=>{
    const c=freshCampaign(),reward=award(c,'S1-07','normal',['sima_yi','cao_zhen'],[1]);
    expect(reward.treasure?.id).toBe('silverarmor');expect(equip(c,'cao_zhen','silverarmor')).toBe(true);
    const s=new Session(1,'normal',215,'survival',3,deployment(c));
    const unequipped=structuredClone(c);unequipped.equipped={};const baseline=new Session(1,'normal',215,'survival',3,deployment(unequipped));
    expect(s.state.get('cao_zhen').stats.defense-baseline.state.get('cao_zhen').stats.defense).toBe(4);
    expect(award(c,'S1-07','normal',['sima_yi'],[1]).xp).toBe(0);
  });
});
