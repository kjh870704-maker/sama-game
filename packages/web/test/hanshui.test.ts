import {describe,it,expect} from 'vitest';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';

const create=()=>new Session(8,'normal',215,'survival',4,deployment(freshCampaign(),true));
function nextPlayerTurn(s:Session){s.act({kind:'endPhase'});for(let i=0;i<300&&s.state.currentSide!=='player'&&s.state.outcome==='ongoing';i++){if(s.state.currentSide==='ally')s.act({kind:'endPhase'});else s.tick();}}
describe('한중 공방전 上 · 쳇바퀴',()=>{
 it('is the ninth battle of the upper arc',()=>{expect(chapters[8]!.stage.id).toBe('S1-09');expect(campaignOrder.indexOf(8)).toBe(campaignOrder.indexOf(1)+1);});
 it('keeps the far bank out of reach until the bank is held for two turns',()=>{
  const s=create(),span={x:12,y:7};
  expect(s.state.map.tileAt(span).terrain).toBe('water');expect(s.phase).toContain('부교 재건 0/2');
  const hero=s.state.get('cao_zhen');hero.pos={x:11,y:7};
  for(let turn=0;turn<3&&s.state.outcome==='ongoing';turn++)nextPlayerTurn(s);
  expect(s.state.map.tileAt(span).terrain).toBe('bridge');
  expect(s.state.log.some(e=>e.t==='terrain'&&e.region==='bridge_span')).toBe(true);
  expect(s.phase).toContain('조조 호위');
 });
 it('gives Cao Cao a sturdy, unarmed escort profile',()=>{const c=create().state.get('cao_cao');expect(c.hp).toBe(160);expect(c.range).toEqual([0,0]);expect(c.side).toBe('allyAi');});
});
import {encircled} from '../src/campaign-rules.ts';
describe('한중 공방전 下 · 범람',()=>{
 const flood=()=>new Session(9,'normal',215,'survival',4,deployment(freshCampaign(),true));
 it('counts the shut sides around Zhao Yun and locks him when all four are closed',()=>{
  const s=flood(),zy=s.state.get('zhao_yun');zy.pos={x:16,y:7};
  expect(encircled(s.state,'zhao_yun')).toBe(0);expect(s.phase).toContain('조운 봉쇄 0/4');
  const ids=[...s.state.living('player'),...s.state.living('ally')].map(u=>u.id).slice(0,4),around=[{x:15,y:7},{x:17,y:7},{x:16,y:6},{x:16,y:8}];
  ids.forEach((id,i)=>{s.state.get(id).pos=around[i]!;});
  expect(encircled(s.state,'zhao_yun')).toBe(4);
  expect(s.act({kind:'wait',unit:ids[0]!}).ok).toBe(true);
  expect(s.state.firedEvents.has('flood/lock')).toBe(true);
  expect(zy.statuses.some(x=>x.kind==='immobile')).toBe(true);expect(s.phase).toContain('조조 탈출');
 });
 it('floods the low fields into fords as the turns pass',()=>{
  const s=flood(),cell=s.state.map.regionCoords('flood_1')[0]!;
  for(let t=0;t<3&&s.state.outcome==='ongoing';t++)nextPlayerTurn(s);
  expect(s.state.map.tileAt(cell).terrain).toBe('ford');
 });
});
describe('동오 설득전 · 혀에 걸린 사활',()=>{
 const court=(d:'normal'|'extreme'='normal')=>new Session(10,d,215,'survival',4,deployment(freshCampaign(),true));
 const answer=(s:Session,id:string)=>s.act({kind:'choose',nodeId:s.state.activeDialogue!,optionId:id});
 it('opens with Zhang Zhao and wins with four right arguments and the pledge',()=>{
  const s=court();expect(s.state.activeDialogue).toBe('zhang_zhao');expect(s.phase).toContain('신뢰 3/3');
  for(const id of ['present','cede','loan','pledge','seal'])expect(answer(s,id).ok).toBe(true);
  expect(s.state.outcome).toBe('victory');expect(s.seals).toEqual([1,2,3]);
 });
 it('re-asks after a wrong argument and fails when trust runs out',()=>{
  const s=court('extreme');answer(s,'arrogant');expect(s.state.activeDialogue).toBe('zhang_zhao');expect(s.trust).toBe(1);
  answer(s,'threat');expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('신뢰');
 });
 it('keeps one wrong answer from the no-mistake seal but still clears',()=>{
  const s=court();for(const id of ['present','han','cede','loan','pledge','seal'])answer(s,id);
  expect(s.state.outcome).toBe('victory');expect(s.seals).toEqual([1,3]);
 });
});
