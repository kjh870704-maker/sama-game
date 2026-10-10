import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import {LARGE_BATTLES} from '../src/large-battle.ts';
import {structureKind} from '../src/campaign-rules.ts';

const open=(id:string,wide:1|2,difficulty:'normal'|'extreme'='normal')=>new Session(chapters.findIndex(c=>c.stage.id===id),difficulty,215,'survival',7,{...deployment(freshCampaign(),true),wide});
const count=(s:Session)=>{const live=s.state.living().filter(u=>!structureKind(u.id));return {ours:live.filter(u=>u.side==='player'||u.side==='ally').length,foes:live.filter(u=>u.side==='enemy').length};};

describe('큰 전투: 중편 후반·하편의 복잡한 장은 아군·적군을 늘린다',()=>{
 it('새로 시작한 넓은 전장(wide 2)에서만 늘린다. 예전 저장(wide 1)은 그대로',()=>{
  const before=count(open('S3-07',1)),after=count(open('S3-07',2));
  expect(after.ours).toBe(before.ours+2);
  expect(after.foes).toBeGreaterThan(before.foes);
  expect(open('S3-07',2).large).toBe(true);
  expect(open('S1-02',2).large).toBe(false);
 });
 it('큰 전투 13곳 모두 배치 공간이 넉넉하고, 늘린 적이 모두 지도에 선다',()=>{
  for(const id of LARGE_BATTLES)for(const d of ['normal','extreme'] as const){
   const a=count(open(id,1,d)),b=count(open(id,2,d));
   expect(b.ours,`${id} ${d} 아군`).toBe(a.ours+2);
   expect(b.foes,`${id} ${d} 적`).toBeGreaterThanOrEqual(a.foes);
  }
 });
 it('하편 평균: 아군 7명 이상, 시작 적 9명 이상',()=>{
  const s3=[...LARGE_BATTLES].filter(id=>id.startsWith('S3'));
  const avg=(f:(c:{ours:number;foes:number})=>number)=>s3.reduce((n,id)=>n+f(count(open(id,2))),0)/s3.length;
  expect(avg(c=>c.ours)).toBeGreaterThanOrEqual(7);
  expect(avg(c=>c.foes)).toBeGreaterThanOrEqual(9);
 });
});
