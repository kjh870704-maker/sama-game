import {freshCampaign,deployment} from '../src/progression.ts';
import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {CONTROLLABLE,decide,key,awardedSeals} from '../../core/src/index.ts';

describe('playable client session',()=>{
  it.each([false,true,'newRules'] as const)('has a winning path through the fort race (campaign=%s)',campaign=>{
    let winner:Session|undefined;
    for(let seed=0;seed<(campaign==='newRules'?12:40)&&!winner;seed++){
      const c=freshCampaign();c.xp.sima_yi=campaign==='newRules'?980:560;c.xp.cao_zhen=810;const s=new Session(1,'normal',campaign==='newRules'?215+seed:seed,'survival',campaign==='newRules'?4:3,campaign?deployment(c):undefined);
      for(let step=0;step<600&&s.state.outcome==='ongoing';step++){
        if(CONTROLLABLE.has(s.state.currentSide)){
          const u=s.state.living(s.state.currentSide).find(u=>!u.hasActed);
          if(!u)s.tick();else if(u.hasMoved)s.act({kind:'wait',unit:u.id});else{
            for(const cmd of decide(s.state,u)){
              if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;
              s.act(cmd);if(s.state.outcome!=='ongoing')break;
            }
            if(!u.hasActed&&s.state.outcome==='ongoing')s.act({kind:'wait',unit:u.id});
          }
        }else s.tick();
      }
      if(s.state.outcome==='victory')winner=s;
    }
    expect(winner,'fort stage must admit a winning command path').toBeDefined();
    expect(Session.load(JSON.parse(JSON.stringify(winner!.save()))).state.snapshot()).toEqual(winner!.state.snapshot());
  });
  it('assembles both source stages and gives support strategists their spells',()=>{
    expect(new Session(0).state.living('player')).toHaveLength(2);
    const s=new Session(1);expect(s.state.living('ally')).toHaveLength(8);
    expect(s.state.living('ally').filter(u=>u.unitClass==='strategist').every(u=>u.strategies.includes('windDragon'))).toBe(true);
  });
  it('moves, saves, restores and undoes through command replay',()=>{
    const s=new Session(0),before=s.state.snapshot();
    expect(s.act({kind:'move',unit:'sima_yi',to:{x:5,y:3}}).ok).toBe(true);
    const loaded=Session.load(JSON.parse(JSON.stringify(s.save())));
    expect(loaded.state.snapshot()).toEqual(s.state.snapshot());
    expect(loaded.undo()).toBe(true);expect(loaded.state.snapshot()).toEqual(before);
  });
  it('rejects friendly attacks, wrong-side actions, repeat actions and unimplemented items',()=>{
    const s=new Session(1);
    expect(s.act({kind:'attack',unit:'sima_yi',target:'cao_zhen'}).ok).toBe(false);
    expect(s.act({kind:'wait',unit:'granted_catapult_0'}).ok).toBe(false);
    expect(s.act({kind:'item',unit:'sima_yi',item:'heal'}).ok).toBe(false);
    expect(s.act({kind:'wait',unit:'sima_yi'}).ok).toBe(true);
    expect(s.act({kind:'wait',unit:'sima_yi'}).ok).toBe(false);
    expect(s.checkpoints).toHaveLength(1);
  });
  it('preserves the manually controlled reinforcement phase before enemy AI',()=>{
    const s=new Session(1);s.act({kind:'endPhase'});
    expect(s.state.currentSide).toBe('ally');expect(s.tick()).toBe(false);
    s.act({kind:'endPhase'});expect(s.state.currentSide).toBe('enemy');
    expect(s.tick()).toBe(true);
    expect(Session.load(JSON.parse(JSON.stringify(s.save()))).state.snapshot()).toEqual(s.state.snapshot());
    expect(s.undo()).toBe(true);expect(s.state.currentSide).toBe('ally');
  });
  it('offers and resolves patrol dialogue, then restores the choice on undo',()=>{
    const s=new Session(0);
    expect(s.act({kind:'move',unit:'sima_yi',to:{x:6,y:3}}).ok).toBe(true);
    expect(s.state.activeDialogue).toBe('bribe');
    expect(s.act({kind:'endPhase'}).ok).toBe(false);
    expect(s.act({kind:'choose',nodeId:'bribe',optionId:'pay'}).ok).toBe(true);
    expect(s.state.activeDialogue).toBe(null);
    expect(s.state.living('enemy').every(u=>s.state.hasStatus(u,'confusion'))).toBe(true);
    expect(s.undo()).toBe(true);expect(s.state.activeDialogue).toBe('bribe');
  });
  it('replays attacks with exactly the same counterattack and RNG results',()=>{
    const s=new Session(0);
    s.act({kind:'move',unit:'sima_yi',to:{x:6,y:3}});
    s.act({kind:'choose',nodeId:'bribe',optionId:'pay'});
    expect(s.act({kind:'attack',unit:'sima_yi',target:'patrol_north'}).ok).toBe(true);
    const after=s.state.snapshot(),logs=structuredClone(s.state.log);
    s.undo();s.act({kind:'attack',unit:'sima_yi',target:'patrol_north'});
    expect(s.state.snapshot()).toEqual(after);expect(s.state.log).toEqual(logs);
  });
  it('rejects incompatible and corrupt saved games',()=>{
    for(const raw of [null,{}, {version:2}, {...new Session().save(),chapter:99}, {...new Session().save(),checkpoints:[-1]}])expect(()=>Session.load(raw)).toThrow();
  });
  it('finishes the escape stage, awards seals and replays the entire completed battle',()=>{
    const s=new Session(0);
    for(let i=0;i<500&&s.state.outcome==='ongoing';i++){
      if(s.state.activeDialogue){const node=s.battle.dialogue.node(s.state.activeDialogue);const pick=node.options.find(o=>o.id==='fight')??node.options[0]!;expect(s.act({kind:'choose',nodeId:node.id,optionId:pick.id}).ok).toBe(true);}
      else if(CONTROLLABLE.has(s.state.currentSide)){
        const u=s.state.living(s.state.currentSide).find(u=>!u.hasActed);
        if(!u)s.tick();else if(u.hasMoved)s.act({kind:'wait',unit:u.id});else for(const cmd of decide(s.state,u)){
          if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;
          const result=s.act(cmd);expect(result.ok,result.error).toBe(true);if(s.state.activeDialogue||s.state.outcome!=='ongoing')break;
        }
      }else s.tick();
    }
    expect(s.state.outcome).toBe('victory');expect(s.seals).toContain(1);expect(s.seals).not.toContain(2);
    const loaded=Session.load(JSON.parse(JSON.stringify(s.save())));expect(loaded.state.snapshot()).toEqual(s.state.snapshot());
    expect(s.undo()).toBe(true);expect(s.state.outcome).toBe('ongoing');
  });
});
