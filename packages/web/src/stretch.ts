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

/** 점수 비교: 앞 항목부터 작은 쪽이 낫다. */
const before=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]!<b[i]!;return false;};
/** 지나갈 수 없는 지형: 목표 칸을 새로 잡을 때 피한다(원래 목표가 그 지형이면 그 지형만 쓴다). */
const BLOCKED=new Set(['cliff','wall','mountain','water','rapids']);
/** 칸 수를 정해 둔 목표(가로·세로 어느 방향이든 한 줄로 붙인다). */
const LINE_GOALS:Record<string,number>={south_gate:3,landing:2};
/** 대본(승리 조건·전투 중 바뀌는 조건) 안에서 도달·점령 목표 지역 이름을 모은다. */
export function goalRegions(stage:StageDef):Set<string>{
  const out=new Set<string>();
  const walk=(o:unknown)=>{if(Array.isArray(o)){o.forEach(walk);return;}if(!o||typeof o!=='object')return;
    const r=o as Record<string,unknown>;if((r.type==='reach'||r.type==='capture')&&typeof r.target==='string')out.add(r.target);
    for(const v of Object.values(r))walk(v);};
  walk(stage);return out;
}
/** 대본 안에서 지형을 바꾸는(terrain_change) 지역 이름. */
export function changedRegions(stage:StageDef):Set<string>{
  const out=new Set<string>();
  const walk=(o:unknown)=>{if(Array.isArray(o)){o.forEach(walk);return;}if(!o||typeof o!=='object')return;
    const r=o as Record<string,unknown>;if(r.type==='terrain_change'&&typeof r.region==='string')out.add(r.region);
    for(const v of Object.values(r))walk(v);};
  walk(stage);return out;
}
/**
 * 목표 지점을 붙은 칸 묶음으로 다시 놓는다.
 * 넓은 전장은 칸을 1.5배 간격으로 옮기므로 2×2 목표가 띄엄띄엄 흩어진다. 원래 칸이 늘어난 자리(덮는 칸) 안에서
 * - 탈출 지점(exit·gate·pass): 2×2로 붙인다. 남문은 가로 3칸, 상륙 지점은 2칸 한 줄.
 * - 그 밖의 도달·점령 목표: 원래 크기(가로×세로) 그대로 붙인다.
 * 칸은 덮는 칸과 가장 많이 겹치고, 가운데에 가까우며, 탈출 지점은 지도 가장자리에 가까운 쪽을 고른다.
 * 지형이 바뀌는 지역(부교·다리 등)은 덮는 칸 전부로 채운다.
 */
export function shapeGoals(map:MapFile,stage:StageDef,source:MapFile=map):MapFile{
  const regions={...(map.regions??{})},wide=map!==source,H=map.rows.length,W=map.rows[0]!.length;
  const terrain=(x:number,y:number)=>map.legend[map.rows[y]![x]!]??'plain';
  /** 원래 칸들이 늘어난 지도에서 차지하는 자리 전부(빈틈 없음). */
  const coverOf=(r:readonly Coord[])=>{const own=new Set(r.map(c=>`${c.x},${c.y}`));
    return wide?[...Array(H).keys()].flatMap(y=>[...Array(W).keys()].filter(x=>own.has(`${src(x)},${src(y)}`)).map(x=>({x,y}))):r.map(c=>({x:c.x,y:c.y}));};
  // 지형이 바뀌는 지역(부교·다리·수문 길·홍수)은 빈틈없이 채운다: 띄엄띄엄 바뀌면 다리 가운데가 물로 남는다.
  for(const name of changedRegions(stage)){const r=source.regions?.[name];if(Array.isArray(r)&&r.length)regions[name]=coverOf(r);}
  for(const name of goalRegions(stage)){
    const r=source.regions?.[name];if(!r||!Array.isArray(r)||!r.length)continue;// 사각형으로 적은 지역은 늘려도 붙어 있다
    const cover=coverOf(r);
    const inCover=new Set(cover.map(c=>`${c.x},${c.y}`));
    const kinds=new Set(cover.map(c=>terrain(c.x,c.y))),ok=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&(kinds.has(terrain(x,y))||!BLOCKED.has(terrain(x,y)));
    const xs=r.map(c=>c.x),ys=r.map(c=>c.y),escape=/exit|gate|pass/.test(name),line=LINE_GOALS[name];
    const shapes:[number,number][]=line?[[line,1],[1,line]]:escape?[[2,2]]:[[Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1]];
    const cx=cover.reduce((n,c)=>n+c.x,0)/cover.length,cy=cover.reduce((n,c)=>n+c.y,0)/cover.length;
    const x0=Math.min(...cover.map(c=>c.x)),y0=Math.min(...cover.map(c=>c.y)),x1=Math.max(...cover.map(c=>c.x)),y1=Math.max(...cover.map(c=>c.y));
    let best:{cells:Coord[];score:number[]}|undefined;
    for(const [w,h] of shapes)for(let y=y0-h;y<=y1+1;y++)for(let x=x0-w;x<=x1+1;x++){
      const cells:Coord[]=[];for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)cells.push({x:x+dx,y:y+dy});
      if(!cells.every(c=>ok(c.x,c.y)))continue;
      const hit=cells.filter(c=>inCover.has(`${c.x},${c.y}`)).length;if(!hit)continue;
      const mx=x+(w-1)/2,my=y+(h-1)/2,edge=Math.min(mx,my,W-1-mx,H-1-my);
      const score=[-hit,Math.round(Math.hypot(mx-cx,my-cy)*100),escape?edge:0];
      if(!best||before(score,best.score))best={cells,score};
    }
    if(best){regions[name]=best.cells;
      // 같은 칸을 이름만 달리 적어 둔 지역(지도 표시용 objective 등)도 같은 자리로 옮긴다.
      const key=(cs:readonly Coord[])=>cs.map(c=>`${c.x},${c.y}`).sort().join(' '),same=key(r);
      for(const [other,o] of Object.entries(source.regions??{}))if(other!==name&&Array.isArray(o)&&key(o)===same)regions[other]=best.cells;}
  }
  return {...map,regions};
}
