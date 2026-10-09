import {describe,it,expect} from 'vitest';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {deployment,freshCampaign,OFFICERS} from '../src/progression.ts';
import {CONTROLLABLE,decide,key} from '../../core/src/index.ts';

/** 대화는 첫 선택지로 넘기며 AI 결정대로 몇 수 둔다. */
function play(s:Session,steps:number){
  for(let i=0;i<steps&&s.state.outcome==='ongoing';i++){
    const st=s.state;
    if(st.activeDialogue){const node=s.battle.dialogue.node(st.activeDialogue);if(!node.options.some(o=>s.act({kind:'choose',nodeId:node.id,optionId:o.id}).ok))break;continue;}
    if(!CONTROLLABLE.has(st.currentSide)){if(!s.tick())break;continue;}
    const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.act({kind:'endPhase'});continue;}
    for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;s.act(cmd);}
    if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});
  }
}

describe('연의 전장에서도 때리고 물리치면 경험치가 오른다',()=>{
 it('출진한 장수가 싸워서 경험치를 벌고, 연의 성장 곡선으로 진행을 보인다',()=>{
  const ch=chapters.findIndex(c=>c.stage.id==='S1-06');expect(campaignOrder).toContain(ch);
  const s=new Session(ch,'normal',215,'survival',5,deployment(freshCampaign(),true));
  play(s,1500);
  const earned=OFFICERS.filter(id=>(s.xpEarned[id]??0)>0);
  expect(earned.length).toBeGreaterThan(0);
  const p=s.xpProgress(earned[0]!)!;
  expect(p.gained).toBe(s.xpEarned[earned[0]!]);
  // 연의 곡선: 레벨 L에서 다음 레벨까지 100+(L-1)×20.
  if(p.need)expect(p.need).toBe(100+(p.level-1)*20);
  const again=Session.load(s.save());expect(again.xpEarned).toEqual(s.xpEarned);
 });
 it('출진 기록의 이번 레벨 경험치에서 이어 쌓는다',()=>{
  const c=freshCampaign(),d=deployment(c,true);
  expect(d.xp).toBeDefined();
  for(const id of OFFICERS)expect(d.xp![id]).toBeGreaterThanOrEqual(0);
 });
});
