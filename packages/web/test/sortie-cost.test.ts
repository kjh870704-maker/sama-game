import {describe,it,expect} from 'vitest';
import {unitCost,pickExtras,storyCostCap,storyCostSheet,taleCostCap,forcedCost,storyClassAt} from '../src/sortie.ts';
import {Session} from '../src/session.ts';
import {chapters} from '../src/session.ts';
import {campaignStage} from '../src/campaign-rules.ts';

describe('극한 출진 코스트',()=>{
 it('병종 코스트는 진화 단계가 높을수록, 기마는 +1',()=>{
  expect(unitCost('infantry')).toBe(2);expect(unitCost('shieldGuard')).toBe(3);expect(unitCost('royalGuard')).toBe(4);expect(unitCost('ironInfantry')).toBe(6);
  expect(unitCost('cavalry')).toBe(3);expect(unitCost('heavyCav')).toBe(3);expect(unitCost('mastermind')).toBe(4);
  expect(storyCostCap('S1-02')).toBe(10);expect(storyCostCap('S2-05')).toBe(13);expect(storyCostCap('S3-01')).toBe(16);
  expect(taleCostCap(1,false)).toBe(12);expect(taleCostCap(3,true)).toBe(20);
 });
 it('병종을 낮추지 않는다: 필수 장수는 제 병종 그대로, 상한이 차면 더 데려가지 않는다',()=>{
  const ch=chapters.find(c=>c.stage.id==='S1-05')!,stage=campaignStage(ch.stage);
  const high={sima_yi:30,sima_lang:30,sima_fang:30,cao_zhen:30};
  const sheet=storyCostSheet(stage,[],high);
  for(const r of sheet.rows)expect(r.unitClass).toBe(storyClassAt(r.id,30));
  expect(forcedCost(stage,high)).toBe(sheet.used);
  if(forcedCost(stage,high)>=sheet.cap)expect(pickExtras(stage,ch.map,['sima_lang','sima_fang'],'extreme',high)).toEqual([]);
  // 실제 전장에서도 필수 장수는 레벨대로 진화한 병종으로 선다.
  const s=new Session(chapters.indexOf(ch),'extreme',1,'strategy',5,{levels:high,equipped:{}});
  for(const id of stage.deployment.forced)if(storyClassAt(id,30)!==storyClassAt(id,1)){const u=s.state.find(id);if(u)expect(u.unitClass,id).toBe(storyClassAt(id,30));}
 });
 it('남은 코스트 안에 드는 장수만 고른다',()=>{
  const ch=chapters.find(c=>c.stage.id==='S1-05')!,stage=campaignStage(ch.stage);
  const low={sima_yi:1,sima_lang:1,sima_fang:1,cao_zhen:1};
  const picked=pickExtras(stage,ch.map,['sima_lang','sima_fang'],'extreme',low),sheet=storyCostSheet(stage,picked,low);
  expect(sheet.used).toBeLessThanOrEqual(sheet.cap);expect(sheet.left).toBe(sheet.cap-sheet.used);
 });
 it('극한에서는 코스트 상한을 넘는 선택 장수를 데려가지 않는다(일반은 인원만)',()=>{
  const ch=chapters.find(c=>c.stage.id==='S1-05')!,stage=campaignStage(ch.stage);
  const high={sima_yi:30,sima_lang:30,sima_fang:30,cao_zhen:30};
  const normal=pickExtras(stage,ch.map,['sima_lang','sima_fang'],'normal',high);
  const ext=pickExtras(stage,ch.map,['sima_lang','sima_fang'],'extreme',high);
  expect(ext.length).toBeLessThanOrEqual(normal.length);
  // 필수 장수만으로 상한을 넘을 수 있다(병종은 낮추지 않는다). 그때는 더 데려가지 않는다.
  const sheet=storyCostSheet(stage,ext,high);expect(sheet.used).toBeLessThanOrEqual(Math.max(sheet.cap,forcedCost(stage,high)));
 });
});
