import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';

const at=(id:string)=>new Session(chapters.findIndex(c=>c.stage.id===id),'normal',215,'survival',5,deployment(freshCampaign(),true)).conditions;
describe('승리·패배 조건을 실제 판정 조건에서 만든다',()=>{
 it('차례로 해야 하는 승리 조건과 모두 잃어야 지는 패배 조건',()=>{
  const s102=at('S1-02');expect(s102.win[0]).toBe('사마의가 남문에 도달 → 사마랑이 남문에 도달 → 남문 통행료 협상 마치기 (차례로)');
  expect(s102.lose).toEqual(expect.arrayContaining(['사마의 퇴각','사마랑 퇴각']));
  const s105=at('S1-05');expect(s105.win).toEqual(['군량 수송대가 호송 목적지에 도달','부상병 수송대가 호송 목적지에 도달']);
  expect(s105.lose).toContain('군량 수송대·부상병 수송대 모두 퇴각');
 });
 it('기한과 지켜야 할 장수도 패배 조건에 넣는다',()=>{
  expect(at('S2-05').lose).toContain('14턴 안에 끝내지 못함');
  expect(at('S1-06').lose).toContain('조조 퇴각');
  expect(at('S1-04').win[0]).toContain('여포의 환영 격퇴');
  expect(at('S3-07').win[0]).toContain('수군 부대가 상륙 지점에 도달');
 });
});
