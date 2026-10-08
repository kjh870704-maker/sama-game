import {describe,it,expect} from 'vitest';
import {unitCost,fitForcedToCap,pickExtras,storyCostCap,storyCostSheet,taleCostCap,previousClass} from '../src/sortie.ts';
import {chapters} from '../src/session.ts';
import {campaignStage} from '../src/campaign-rules.ts';

describe('극한 출진 코스트',()=>{
 it('병종 코스트는 진화 단계가 높을수록, 기마는 +1',()=>{
  expect(unitCost('infantry')).toBe(2);expect(unitCost('shieldGuard')).toBe(3);expect(unitCost('royalGuard')).toBe(4);expect(unitCost('ironInfantry')).toBe(6);
  expect(unitCost('cavalry')).toBe(3);expect(unitCost('heavyCav')).toBe(3);expect(unitCost('mastermind')).toBe(4);
  expect(storyCostCap('S1-02')).toBe(10);expect(storyCostCap('S2-05')).toBe(13);expect(storyCostCap('S3-01')).toBe(16);
  expect(taleCostCap(1,false)).toBe(12);expect(taleCostCap(3,true)).toBe(20);
 });
 it('필수 장수가 상한을 넘으면 사마의가 아닌 장수부터 한 단계씩 낮춘다',()=>{
  expect(previousClass('ironInfantry')).toBe('royalGuard');expect(previousClass('infantry')).toBe('infantry');
  const fit=fitForcedToCap([{id:'sima_yi',unitClass:'divineStrategist'},{id:'cao_zhen',unitClass:'wujiHeavyCav'}],10);
  expect(fit.get('sima_yi')).toBe('divineStrategist');expect([...fit.values()].reduce((n,c)=>n+unitCost(c),0)).toBeLessThanOrEqual(10);
 });
 it('극한에서는 코스트 상한을 넘는 선택 장수를 데려가지 않는다(일반은 인원만)',()=>{
  const ch=chapters.find(c=>c.stage.id==='S1-05')!,stage=campaignStage(ch.stage);
  const high={sima_yi:30,sima_lang:30,sima_fang:30,cao_zhen:30};
  const normal=pickExtras(stage,ch.map,['sima_lang','sima_fang'],'normal',high);
  const ext=pickExtras(stage,ch.map,['sima_lang','sima_fang'],'extreme',high);
  expect(ext.length).toBeLessThanOrEqual(normal.length);
  const sheet=storyCostSheet(stage,ext,high);expect(sheet.used).toBeLessThanOrEqual(sheet.cap+0);
 });
});
