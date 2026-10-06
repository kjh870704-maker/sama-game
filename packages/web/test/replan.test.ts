import {deployment,freshCampaign} from '../src/progression.ts';
import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {CONTROLLABLE,decide,key,manhattan} from '../../core/src/index.ts';

function nextTurn(s:Session){
  const turn=s.state.turn;
  for(let i=0;i<100&&s.state.turn===turn&&s.state.outcome==='ongoing'&&!s.state.activeDialogue;i++){
    if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();
  }
}
function move(s:Session,unit:string,x:number,y:number){const r=s.act({kind:'move',unit,to:{x,y}});expect(r.ok,r.error).toBe(true);}
describe('replanned campaign scenarios',()=>{
  it('latches the warehouse, transforms a refugee preserving identity and replays/undoes the conversion',()=>{
    const s=new Session(2);
    expect(s.act({kind:'attack',unit:'sima_yi',target:'raider_n'}).ok).toBe(false);
    move(s,'sima_yi',4,5);expect(s.state.captured.has('warehouse')).toBe(true);
    move(s,'refugee_b',4,4);expect(s.state.get('refugee_b').unitClass).toBe('infantry');
    expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());
    expect(s.undo()).toBe(true);expect(s.state.get('refugee_b').unitClass).toBe('civilian');
    expect(s.state.captured.has('warehouse')).toBe(true);
  });
  it('consumes scout action and restores its information on undo',()=>{
    const s=new Session(0);
    expect(s.act({kind:'item',unit:'sima_yi',item:'scout'}).ok).toBe(true);
    expect(s.scouted).toBe(true);expect(s.state.get('sima_yi').hasActed).toBe(true);
    expect(Session.load(s.save()).scouted).toBe(true);
    s.undo();expect(s.scouted).toBe(false);expect(s.state.get('sima_yi').hasActed).toBe(false);
  });
  it('charges both immediate and delayed bribes and restores the wallet',()=>{
    for(const delayed of [false,true]){
      const s=new Session(0);move(s,'sima_yi',6,3);
      if(delayed)s.act({kind:'choose',nodeId:'bribe',optionId:'lie'});
      expect(s.act({kind:'choose',nodeId:delayed?'lie_failed':'bribe',optionId:delayed?'pay_late':'pay'}).ok).toBe(true);
      expect(s.funds).toBe(2000);expect(s.bribes).toBe(1);
      const restored=Session.load(s.save());expect(restored.funds).toBe(2000);restored.undo();expect(restored.funds).toBe(3000);
    }
  });
  it.each([false,true,'newRules'] as const)('admits a one-bribe route (campaign=%s)',campaign=>{
    const c=freshCampaign();c.xp.sima_yi=140;const s=new Session(0,'normal',215,'survival',campaign==='newRules'?4:3,campaign?deployment(c):undefined);
    move(s,'sima_yi',7,3);s.act({kind:'choose',nodeId:'bribe',optionId:'pay'});
    move(s,'sima_lang',8,4);nextTurn(s);
    move(s,'sima_yi',7,8);move(s,'sima_lang',8,9);nextTurn(s);
    move(s,'sima_yi',6,campaign==='newRules'?10:11);move(s,'sima_lang',7,campaign==='newRules'?10:11);
    expect(s.state.activeDialogue).toBe('gate_payment');expect(s.funds).toBe(2000);
    expect(s.act({kind:'choose',nodeId:'gate_payment',optionId:'pay_gate'}).ok).toBe(true);
    expect(s.state.outcome).toBe('victory');expect(s.funds).toBe(1000);
    expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());
    s.undo();expect(s.funds).toBe(2000);expect(s.state.activeDialogue).toBe('gate_payment');
  });
  it('supplies two medicines and replays consumed healing after actual damage',()=>{
    const s=new Session(0);move(s,'sima_yi',6,3);s.act({kind:'choose',nodeId:'bribe',optionId:'lie'});s.act({kind:'choose',nodeId:'lie_failed',optionId:'pay_late'});
    const hp=s.state.get('sima_yi').hp;
    expect(s.act({kind:'item',unit:'sima_yi',item:'medicine'}).ok).toBe(true);
    expect(s.medicine).toBe(1);expect(s.state.get('sima_yi').hp).toBeGreaterThan(hp);
    const loaded=Session.load(s.save());expect(loaded.medicine).toBe(1);expect(loaded.state.snapshot()).toEqual(s.state.snapshot());
    s.undo();expect(s.medicine).toBe(2);expect(s.state.get('sima_yi').hp).toBe(hp);
  });
  it.each(['normal','extreme'] as const)('allows a silent escape and all three seals on %s',difficulty=>{
    const s=new Session(0,difficulty);
    for(const pair of [[[5,2],[7,2]],[[7,5],[7,6]],[[7,10],[7,11]]] as const){
      move(s,'sima_yi',...pair[0]);s.act({kind:'wait',unit:'sima_yi'});
      move(s,'sima_lang',...pair[1]);s.act({kind:'wait',unit:'sima_lang'});nextTurn(s);
      expect(s.state.activeDialogue).toBeNull();
    }
    move(s,'sima_yi',6,11);expect(s.state.activeDialogue).toBe('gate_payment');
    s.act({kind:'choose',nodeId:'gate_payment',optionId:'pay_gate'});
    expect(s.state.outcome).toBe('victory');expect(s.funds).toBe(2000);expect(s.seals).toEqual([1,2,3]);
    expect(Session.load(s.save()).funds).toBe(2000);
  });
  it('restores the objective checkpoint before the warehouse transition',()=>{
    const s=new Session(2);s.act({kind:'item',unit:'sima_lang',item:'scout'});move(s,'sima_yi',4,5);
    const restored=Session.load(s.save());expect(restored.phaseCheckpoint).toBe(s.phaseCheckpoint);
    expect(restored.restorePhase()).toBe(true);expect(restored.phase).toBe('창고 확보');expect(restored.scouted).toBe(true);
    expect(restored.state.captured.has('warehouse')).toBe(false);
  });
  it.each([false,true,'newRules'] as const)('completes the estate defense with a noncombat protagonist (campaign=%s)',campaign=>{
    const s=new Session(2,'normal',215,'survival',campaign==='newRules'?4:3,campaign?deployment(freshCampaign()):undefined);move(s,'sima_yi',4,5);move(s,'refugee_b',4,4);
    for(let i=0;i<600&&s.state.outcome==='ongoing';i++){
      if(CONTROLLABLE.has(s.state.currentSide)){
        const u=s.state.living(s.state.currentSide).find(u=>!u.hasActed);
        if(!u)s.tick();else if(u.unitClass==='civilian'||u.hasMoved)s.act({kind:'wait',unit:u.id});
        else{for(const cmd of decide(s.state,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;s.act(cmd);}if(!u.hasActed)s.act({kind:'wait',unit:u.id});}
      }else s.tick();
    }
    expect(s.state.outcome,JSON.stringify({failure:s.failure,turn:s.state.turn,units:[...s.state.units.values()].map(u=>({id:u.id,hp:u.hp,level:u.level})),log:s.state.log.slice(-5)})).toBe('victory');expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());
  });
});
