/**
 * 출진 편성 규칙 — 필수 장수는 반드시 나가고, 그 밖의 장수는 난이도에 맞춘 인원 안에서 골라 데려간다.
 *
 * 연의 장: 스테이지가 정한 필수 장수(deployment.forced)에, 그 시기에 사마의 곁에 있을 수 있는
 * 장수를 더 데려갈 수 있다(출진 칸이 남을 때만). 일반 2명, 극한 1명.
 * 가상 전장: 대본이 정한 필수 장수(required)에, 편이 깊을수록 더 많이(상편 3 · 중편 4 · 하편 5,
 * 우두머리 전 +1, 극한 −1) 데려간다.
 */
import type {MapFile,StageDef} from '../../core/src/index.ts';
import {campaignOrder,chapters} from './session.ts';

/** 연의 장에서 사마의 곁에 설 수 있는 시기(스테이지 id 범위, 연의 진행 순서 기준). */
export const SORTIE_WINDOWS:Record<string,[string,string]>={sima_lang:['S1-01','S1-08'],sima_fang:['S1-01','S1-08'],cao_zhen:['S1-05','S2-09']};
/** 이야기상 혼자 서야 하는 장(꿈속·궁정 설전): 더 데려갈 수 없다. */
const ALONE=new Set(['S1-04','S1-11']);
const orderOf=(id:string)=>campaignOrder.findIndex(i=>chapters[i]!.stage.id===id);

export function storySortieLimit(difficulty:'normal'|'extreme'){return difficulty==='extreme'?1:2;}
/** 연의 장에 더 데려갈 수 있는 장수와 남은 출진 칸. */
export function optionalOfficers(stage:StageDef,map:MapFile):{allowed:string[];capacity:number}{
  const forced=stage.deployment.forced;
  if(ALONE.has(stage.id)||!forced.includes('sima_yi'))return {allowed:[],capacity:0};
  const cells=(map.regions?.player_start as unknown[]|undefined)?.length??0;
  const granted=(stage.deployment.grantedUnits??[]).reduce((n,g)=>n+g.count,0);
  const capacity=Math.max(0,cells-forced.length-granted),at=orderOf(stage.id);
  const allowed=Object.entries(SORTIE_WINDOWS).filter(([id,[from,to]])=>!forced.includes(id)&&at>=orderOf(from)&&at<=orderOf(to)).map(([id])=>id);
  return {allowed,capacity};
}
/** 실제로 데려갈 장수: 허용 목록·칸·난이도 인원 안에서. */
export function pickExtras(stage:StageDef,map:MapFile,wanted:readonly string[],difficulty:'normal'|'extreme'){
  const {allowed,capacity}=optionalOfficers(stage,map);
  return wanted.filter((id,i)=>allowed.includes(id)&&wanted.indexOf(id)===i).slice(0,Math.min(capacity,storySortieLimit(difficulty)));
}

/** 가상 전장에 고를 수 있는 장수 수(필수 장수 제외). */
export function taleSortieLimit(act:1|2|3,boss:boolean,difficulty:'normal'|'extreme'){
  return Math.max(1,(act===1?3:act===2?4:5)+(boss?1:0)-(difficulty==='extreme'?1:0));
}
