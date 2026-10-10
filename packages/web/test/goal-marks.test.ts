import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import {goalMarks} from '../src/battle-conditions.ts';

const state=(id:string)=>new Session(chapters.findIndex(c=>c.stage.id===id),'normal',215,'survival',5,deployment(freshCampaign(),true)).state;
describe('전투 시작에 깜박여 알릴 목표 지점',()=>{
 it('탈출 목표는 탈출 지점으로, 칸 좌표와 함께',()=>{
  const s=state('S1-09'),marks=goalMarks(s);
  expect(marks.map(m=>[m.kind,m.label,m.who])).toEqual([['escape','조조 탈출\n야곡 출구',['cao_cao']]]);
  expect(marks[0]!.cells).toEqual(s.map.regionCoords('exit'));
  expect(goalMarks(state('S1-02'))[0]).toMatchObject({kind:'escape',label:'사마의·사마랑 탈출\n남문',who:['sima_yi','sima_lang']});
 });
 it('탈출이 아닌 도달은 도착, 같은 지점은 한 번만',()=>{
  expect(goalMarks(state('S3-07')).map(m=>m.label)).toEqual(['수군 아무 부대 도착\n상륙 지점']);
  expect(goalMarks(state('S2-13'))).toHaveLength(1);
 });
 it('차례 목표는 지금 단계만: S1-01은 창고 점령이 둘째 단계라 시작에는 없다',()=>{
  const s=state('S1-01');expect(goalMarks(s)).toEqual([]);
  s.stickyGoals=true;s.goalProgress=1;expect(goalMarks(s).map(m=>m.kind)).toEqual(['capture']);
 });
 it('위치 목표가 없는 전투는 깜박이지 않는다',()=>{
  expect(goalMarks(state('S2-05'))).toEqual([]);
 });
});
