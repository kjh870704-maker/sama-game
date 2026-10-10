/**
 * 큰 전투 — 중편 후반과 하편의 복잡한 전투는 아군·적군을 늘린다.
 *
 * - 아군: 편입 부대를 2부대 더 준다(그 장의 편입 부대와 같은 병종·레벨).
 * - 적군: 이름 없는 병사 무리(한 번에 2부대 이상 나오는 무리)를 약 40% 늘린다. 이름난 장수는 그대로다.
 * - 지도: 넓은 전장(1.5배)에서 출진 칸과 늘어난 적이 나오는 지역을 빈틈없이 넓혀(원래 칸이 늘어난 자리 전부) 모두 설 자리를 준다.
 *
 * 새로 시작한 넓은 전장(Deployment.wide===2)에만 쓴다. 예전 저장은 그대로 다시 열린다.
 */
import type {StageDef} from '../../core/src/index.ts';

/** S2-14(오장원)는 사마의가 쫓기며 달아나는 장이라 넣지 않는다 — 적이 늘면 달아날 길이 막힌다. */
export const LARGE_BATTLES=new Set(['S2-06','S2-07','S2-08','S2-09','S2-11','S2-12','S3-01','S3-02','S3-03','S3-04','S3-05','S3-06','S3-07']);
/** 이름 없는 병사 무리를 늘리는 비율. */
const ENEMY_GROWTH=.4;
/** 더 주는 편입 부대 수. */
const EXTRA_GRANTED=2;

type SpawnAction={type:string;side?:string;units?:{count?:number;region?:string}[]};
const spawns=(stage:StageDef)=>(stage.events??[]).flatMap(e=>(e.actions??[]) as SpawnAction[]).filter(a=>a.type==='spawn_units');

/** 아군·적군을 늘린 대본(원래 좌표 그대로). */
export function enlargeStage(stage:StageDef):StageDef{
  const s=structuredClone(stage);
  const granted=s.deployment.grantedUnits??[];
  if(granted.length){
    const level=Math.max(...granted.map(g=>g.level??1));
    const extra=Array.from({length:EXTRA_GRANTED},(_,i)=>{const g=granted[i%granted.length]!;return {type:g.type,count:1,level,countsTowardAllyLoss:false};});
    s.deployment={...s.deployment,grantedUnits:[...granted,...extra]};
  }
  for(const a of spawns(s))if((a.side??'enemy')==='enemy')for(const u of a.units??[])if((u.count??1)>=2)u.count=u.count!+Math.max(1,Math.round(u.count!*ENEMY_GROWTH));
  return s;
}
/** 넓은 전장에서 빈틈없이 넓힐 지역: 출진 칸과 늘어난 적 무리가 나오는 지역. */
export function enlargedRegions(stage:StageDef):Set<string>{
  const out=new Set(['player_start']);
  for(const a of spawns(stage))if((a.side??'enemy')==='enemy')for(const u of a.units??[])if((u.count??1)>=2&&u.region)out.add(u.region);
  return out;
}
