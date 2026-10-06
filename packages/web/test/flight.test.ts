import {deployment,freshCampaign} from '../src/progression.ts';
import {describe,it,expect} from 'vitest';
import {Session,campaignOrder} from '../src/session.ts';
import {CONTROLLABLE,decide,key} from '../../core/src/index.ts';

function play(s:Session){
  for(let i=0;i<600&&s.state.outcome==='ongoing';i++){
    if(CONTROLLABLE.has(s.state.currentSide)){
      const u=s.state.living(s.state.currentSide).find(u=>!u.hasActed);
      if(!u)s.tick();else if(u.hasMoved)s.act({kind:'wait',unit:u.id});else{
        for(const cmd of decide(s.state,u)){
          if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;
          const r=s.act(cmd);expect(r.ok,r.error).toBe(true);
          if(s.state.outcome!=='ongoing')break;
        }
        if(s.state.outcome==='ongoing'&&!u.hasActed)s.act({kind:'wait',unit:u.id});
      }
    }else s.tick();
  }
}
describe('육혼산 도주전',()=>{
  it('preserves old chapter indices and inserts flight in campaign order',()=>{
    expect(campaignOrder.slice(0,8)).toEqual([2,0,3,4,5,6,7,1]);
    for(const id of [0,1,2])expect(Session.load(new Session(id).save()).chapter).toBe(id);
  });
  it.each(['normal','extreme','campaign','newRules'] as const)('completes the guided and ravine routes on %s',mode=>{const difficulty=mode==='extreme'?'extreme':'normal';
    for(const option of ['talk','ravine']){
      const c=freshCampaign();c.xp.sima_yi=280;c.xp.sima_lang=380;const s=new Session(3,difficulty,215,'survival',mode==='newRules'?4:3,['campaign','newRules'].includes(mode)?deployment(c):undefined);
      expect(s.tick()).toBe(false);expect(s.act({kind:'endPhase'}).ok).toBe(false);
      expect(s.act({kind:'choose',nodeId:'mountain_choice',optionId:option}).ok).toBe(true);
      play(s);
      expect(s.state.outcome,`${difficulty}/${option}`).toBe('victory');
      expect(s.seals).toContain(1);
      const saved=Session.load(JSON.parse(JSON.stringify(s.save())));
      expect(saved.state.snapshot()).toEqual(s.state.snapshot());expect(saved.phase).toBe(s.phase);
      expect(saved.undo()).toBe(true);expect(saved.state.outcome).toBe('ongoing');
    }
  });
  it('warns before a bluff, restores ambush and pressure on undo, and admits a breakout',()=>{
    const s=new Session(3);s.act({kind:'choose',nodeId:'mountain_choice',optionId:'bluff'});
    expect(s.state.activeDialogue).toBe('bluff_warning');expect(s.pressure).toBe(0);
    s.act({kind:'choose',nodeId:'bluff_warning',optionId:'commit'});
    expect(s.pressure).toBe(2);expect(s.state.living('enemy')).toHaveLength(4);
    const restored=Session.load(s.save());expect(restored.pressure).toBe(2);restored.undo();
    expect(restored.state.activeDialogue).toBe('bluff_warning');expect(restored.pressure).toBe(0);expect(restored.state.living('enemy')).toHaveLength(2);
    play(s);expect(s.state.outcome).toBe('victory');
  });
  it('restores a first-command phase checkpoint, including the opening choice',()=>{
    const s=new Session(3);s.act({kind:'choose',nodeId:'mountain_choice',optionId:'ravine'});
    expect(s.phaseCheckpoint).toBe(0);expect(s.restorePhase()).toBe(true);
    expect(s.state.activeDialogue).toBe('mountain_choice');expect(s.state.choices).toEqual([]);
  });
  it.each(['normal','extreme'] as const)('fails at the pressure boundary on %s',difficulty=>{
    const s=new Session(3,difficulty);s.act({kind:'choose',nodeId:'mountain_choice',optionId:'talk'});
    s.state.turn=s.pressureLimit+1;
    s.act({kind:'wait',unit:'sima_yi'});
    expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('추격 압박');
  });
});
