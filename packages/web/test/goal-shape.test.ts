import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import type {Coord} from '../../core/src/index.ts';

const cells=(id:string,region:string)=>{const s=new Session(chapters.findIndex(c=>c.stage.id===id),'normal',215,'survival',5,{...deployment(freshCampaign(),true),wide:1}).state;return {s,c:s.map.regionCoords(region)};};
/** 칸들이 위아래·옆으로 모두 이어져 있는가 */
const joined=(c:readonly Coord[])=>{const left=new Set(c.map(a=>`${a.x},${a.y}`)),q=[c[0]!];left.delete(`${c[0]!.x},${c[0]!.y}`);
  while(q.length){const a=q.pop()!;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${a.x+dx},${a.y+dy}`;if(left.delete(k))q.push({x:a.x+dx,y:a.y+dy});}}return left.size===0;};
const box=(c:readonly Coord[])=>[Math.max(...c.map(a=>a.x))-Math.min(...c.map(a=>a.x))+1,Math.max(...c.map(a=>a.y))-Math.min(...c.map(a=>a.y))+1];
describe('넓은 전장의 목표 지점은 붙은 칸 묶음',()=>{
 it('탈출 지점은 2×2로 붙어 있다',()=>{
  for(const [id,r] of [['S1-09','exit'],['S1-10','exit'],['S2-02','exit'],['S2-03','exit'],['S1-03','east_pass'],['S1-03','ravine_exit']] as const){
   const {s,c}=cells(id,r);expect(c,`${id} ${r}`).toHaveLength(4);expect(box(c),`${id} ${r}`).toEqual([2,2]);
   for(const a of c)expect(['cliff','wall','mountain','water'],`${id} ${r}`).not.toContain(s.map.tileAt(a).terrain);
  }
 });
 it('남문은 가로 3칸, 상륙 지점은 물길 2칸',()=>{
  const g=cells('S1-02','south_gate');expect(g.c).toHaveLength(3);expect(box(g.c)).toEqual([3,1]);expect(g.c.every(a=>g.s.map.tileAt(a).terrain==='gate')).toBe(true);
  const l=cells('S3-07','landing');expect(l.c).toHaveLength(2);expect(joined(l.c)).toBe(true);expect(l.c.every(a=>l.s.map.tileAt(a).terrain==='water')).toBe(true);
 });
 it('그 밖의 도달·점령 목표도 원래 크기로 붙어 있다',()=>{
  for(const [id,r,n] of [['S2-08','camp',9],['S2-11','join',20],['S2-13','rally',16],['S2-09','citadel',6],['S3-06','yongning',4]] as const){
   const {c}=cells(id,r);expect(c,`${id} ${r}`).toHaveLength(n);expect(joined(c),`${id} ${r}`).toBe(true);
  }
 });
 it('지형이 바뀌는 지역(부교·다리·수문 길)은 빈틈없이 채운다',()=>{
  for(const [id,r] of [['S1-09','bridge_span'],['S3-04','span'],['S3-07','water_gate'],['S2-13','exit_gate']] as const){
   const {c}=cells(id,r);const [w,h]=box(c);expect(c,`${id} ${r}`).toHaveLength(w!*h!);expect(joined(c),`${id} ${r}`).toBe(true);
  }
  // S2-13 퇴로: 열리는 길(exit_gate) 안에 탈출 지점이 있다
  const g=new Set(cells('S2-13','exit_gate').c.map(a=>a.x+','+a.y));expect(cells('S2-13','exit').c.every(a=>g.has(a.x+','+a.y))).toBe(true);
 });
});
