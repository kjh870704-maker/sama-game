/**
 * 넓은 전장 — 연의 전장 지도를 1.5배로 늘린다.
 * 지형 칸은 늘어난 칸이 원래 칸을 그대로 이어받고(s(X)=⌊X/1.5⌋), 등장 위치·영역은 같은 비율로 옮긴다(p(x)=⌈1.5x⌉ → 다시 줄이면 원래 칸).
 * 거리가 1.5배가 되므로 전장의 모든 부대는 이동력 +2(BattleMap.moveBonus)로 걸음을 맞춘다.
 * 옛 저장과 맞추려고 새로 시작하는 전투(Deployment.wide)에만 쓴다.
 */
import type {MapFile,StageDef,Coord} from '../../core/src/index.ts';

export const STRETCH=1.5;
/** 너무 큰 지도는 늘리지 않는다(그리기 부담). */
export const STRETCH_MAX_TILES=900;
export const src=(X:number)=>Math.floor(X/STRETCH);
export const toWide=(x:number)=>Math.ceil(x*STRETCH);
export const wideCoord=(c:Coord):Coord=>({x:toWide(c.x),y:toWide(c.y)});
export function canStretch(map:MapFile){return map.rows.length*map.rows[0]!.length<=STRETCH_MAX_TILES;}

export function stretchMap(m:MapFile):MapFile{
  const H=m.rows.length,W=m.rows[0]!.length,W2=Math.ceil(W*STRETCH),H2=Math.ceil(H*STRETCH);
  const line=(row:string)=>Array.from({length:W2},(_,X)=>row[Math.min(W-1,src(X))]!).join('');
  const rows=Array.from({length:H2},(_,Y)=>line(m.rows[Math.min(H-1,src(Y))]!));
  const heights=m.heights?Array.from({length:H2},(_,Y)=>line(m.heights![Math.min(H-1,src(Y))]!)):undefined;
  const regions:NonNullable<MapFile['regions']>={};
  for(const [k,r] of Object.entries(m.regions??{})){
    if(Array.isArray(r))regions[k]=r.map(wideCoord);
    else{const x=toWide(r.x),y=toWide(r.y);regions[k]={x,y,w:Math.max(1,toWide(r.x+r.w)-x),h:Math.max(1,toWide(r.y+r.h)-y)};}
  }
  return {...m,id:m.id+'@wide',rows,...(heights?{heights}:{}),regions};
}
/** 대본 안의 모든 {x,y} 좌표(등장·이동 위치)를 옮긴다. */
export function stretchStage(s:StageDef):StageDef{
  const walk=(o:unknown):unknown=>{
    if(Array.isArray(o))return o.map(walk);
    if(o&&typeof o==='object'){const r=o as Record<string,unknown>;
      if(typeof r.x==='number'&&typeof r.y==='number'&&Object.keys(r).every(k=>k==='x'||k==='y'))return wideCoord(r as unknown as Coord);
      const out:Record<string,unknown>={};for(const [k,v] of Object.entries(r))out[k]=walk(v);return out;}
    return o;
  };
  return walk(s) as StageDef;
}
