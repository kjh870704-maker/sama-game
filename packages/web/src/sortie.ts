/**
 * 출진 편성 규칙 — 필수 장수는 반드시 나가고, 그 밖의 장수는 난이도에 맞춘 인원 안에서 골라 데려간다.
 *
 * 연의 장: 스테이지가 정한 필수 장수(deployment.forced)에, 그 시기에 사마의 곁에 있을 수 있는
 * 장수를 더 데려갈 수 있다(출진 칸이 남을 때만). 일반 2명, 극한 1명.
 * 가상 전장: 대본이 정한 필수 장수(required)에, 편이 깊을수록 더 많이(상편 3 · 중편 4 · 하편 5,
 * 우두머리 전 +1) 데려간다.
 *
 * 극한은 인원 대신 '출진 코스트'로 제한한다: 병종마다 코스트(진화 단계가 높을수록, 기마는 +1)가 있고,
 * 출진하는 장수들의 코스트 합이 전장의 상한을 넘으면 더 데려갈 수 없다.
 * 연의 장의 필수 장수만으로 상한을 넘으면, 필수 장수는 상한에 맞을 때까지 한 단계 낮은 병종으로 나선다(사마의는 마지막).
 */
import type {MapFile,StageDef,UnitClass} from '../../core/src/index.ts';
import {evolvedClass,familyOf,tierOf} from '../../core/src/index.ts';
import {fourStageCorrectionRows} from './complete-troops.ts';
import {campaignOrder,chapters} from './session.ts';

/** 연의 장에서 사마의 곁에 설 수 있는 시기(스테이지 id 범위, 연의 진행 순서 기준). */
export const SORTIE_WINDOWS:Record<string,[string,string]>={sima_lang:['S1-01','S1-08'],sima_fang:['S1-01','S1-08'],cao_zhen:['S1-05','S2-09']};
/** 이야기상 혼자 서야 하는 장(꿈속·궁정 설전): 더 데려갈 수 없다. */
const ALONE=new Set(['S1-04','S1-11']);
const orderOf=(id:string)=>campaignOrder.findIndex(i=>chapters[i]!.stage.id===id);

export function storySortieLimit(_difficulty:'normal'|'extreme'){return 2;}

// ─────────────────────────────────────────────── 극한 출진 코스트

const TIER_COST=[0,2,3,4,6] as const;
const MOUNTED=new Set(['cavalry','heavyCav','horseArcher','elephant']);
/** 병종 코스트: 1단 2 · 2단 3 · 3단 4 · 4단 6, 말·코끼리를 탄 병종 +1. */
export function unitCost(c:UnitClass){return TIER_COST[Math.min(4,Math.max(1,tierOf(c)))]!+(MOUNTED.has(familyOf(c))?1:0);}
/** 극한 출진 코스트 상한: 연의 장은 부(상·중·하편)마다, 가상 전장은 편마다(우두머리 전 +2). */
export function storyCostCap(stageId:string){const act=Number(/^S(\d)/.exec(stageId)?.[1]??1);return act>=3?16:act===2?13:10;}
export function taleCostCap(act:1|2|3,boss:boolean){return (act===3?18:act===2?15:12)+(boss?2:0);}
/** 연의 장 장수의 본래 병종(레벨이 오르면 진화한다). */
export const STORY_BASE_CLASS:Record<string,UnitClass>={sima_yi:'strategist',sima_lang:'infantry',cao_zhen:'heavyCav',sima_fang:'spearman'};
export const storyClassAt=(id:string,level:number)=>evolvedClass(STORY_BASE_CLASS[id]??'infantry',level);
/** 한 단계 낮은 병종(1단이면 그대로). */
export function previousClass(c:UnitClass):UnitClass{
  for(const line of Object.values(fourStageCorrectionRows) as ReadonlyArray<readonly UnitClass[]>){const i=line.indexOf(c);if(i>0)return line[i-1]!;}
  return c;
}
/**
 * 필수 장수를 상한에 맞춘다: 코스트가 가장 큰 장수부터 한 단계씩 낮춘다(사마의는 다른 장수가 모두 1단일 때만).
 * 돌려주는 값: id → 실제로 나설 병종.
 */
export function fitForcedToCap(units:ReadonlyArray<{id:string;unitClass:UnitClass}>,cap:number){
  const out=new Map(units.map(u=>[u.id,u.unitClass] as const));
  const total=()=>[...out.values()].reduce((n,c)=>n+unitCost(c),0);
  for(let guard=0;guard<40&&total()>cap;guard++){
    const order=[...out.entries()].filter(([,c])=>previousClass(c)!==c).sort((a,b)=>(a[0]==='sima_yi'?1:0)-(b[0]==='sima_yi'?1:0)||unitCost(b[1])-unitCost(a[1]));
    if(!order.length)break;const [id,c]=order[0]!;out.set(id,previousClass(c));
  }
  return out;
}
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
export function pickExtras(stage:StageDef,map:MapFile,wanted:readonly string[],difficulty:'normal'|'extreme',levels?:Readonly<Record<string,number>>){
  const {allowed,capacity}=optionalOfficers(stage,map);
  const picked=wanted.filter((id,i)=>allowed.includes(id)&&wanted.indexOf(id)===i).slice(0,Math.min(capacity,storySortieLimit(difficulty)));
  if(difficulty!=='extreme'||!levels)return picked;
  // 극한: 필수 장수(상한에 맞춘 뒤)의 코스트에 더해 상한 안에 드는 장수만.
  const cap=storyCostCap(stage.id),forced=fitForcedToCap(stage.deployment.forced.filter(id=>STORY_BASE_CLASS[id]).map(id=>({id,unitClass:storyClassAt(id,levels[id]??1)})),cap);
  let used=[...forced.values()].reduce((n,c)=>n+unitCost(c),0);const out:string[]=[];
  for(const id of picked){const c=unitCost(storyClassAt(id,levels[id]??1));if(used+c<=cap){out.push(id);used+=c;}}
  return out;
}
/** 화면용: 연의 장 극한 코스트(필수·선택 장수별 병종·코스트와 합계). */
export function storyCostSheet(stage:StageDef,ids:readonly string[],levels:Readonly<Record<string,number>>){
  const cap=storyCostCap(stage.id),forcedIds=stage.deployment.forced.filter(id=>STORY_BASE_CLASS[id]);
  const fitted=fitForcedToCap(forcedIds.map(id=>({id,unitClass:storyClassAt(id,levels[id]??1)})),cap);
  const rows=[...forcedIds,...ids.filter(id=>!forcedIds.includes(id))].map(id=>{const natural=storyClassAt(id,levels[id]??1),c=fitted.get(id)??natural;return {id,unitClass:c,natural,cost:unitCost(c),forced:forcedIds.includes(id)};});
  return {cap,rows,used:rows.reduce((n,r)=>n+r.cost,0)};
}

/** 가상 전장에 고를 수 있는 장수 수(필수 장수 제외). */
export function taleSortieLimit(act:1|2|3,boss:boolean,_difficulty:'normal'|'extreme'){
  return Math.max(1,(act===1?3:act===2?4:5)+(boss?1:0));
}
