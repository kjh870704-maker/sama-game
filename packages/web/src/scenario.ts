/**
 * 시나리오 모드 — 게임의 본편. 『삼국지연의』의 사마의 이야기(연의 32장)를 따라가다가,
 * 사마의의 인생에서 세 번 갈림길(201년 출사 · 220년 조조의 죽음 · 234년 이후)을 만난다.
 * 정사를 고르면 연의 장이 이어지고, 다른 길을 고르면 가상 시나리오의 장(가상 전장 3 + 우두머리)이
 * 이어진다. 한 번 가상으로 들어선 길은 결말까지 가상으로 간다(결말은 fate.ts ALL_ENDINGS).
 *
 * 한 장의 흐름: 이야기 장면(사마의의 대사 선택) → 출진 전 정비(반드시) → 전투 → 전투 뒤 장면 → 다음 장.
 * 레벨업용 반복 전투(수련·천명의 원정)는 이 흐름 밖의 '반복 퀘스트'로 따로 둔다.
 *
 * 이 모듈은 순서·상태·선택 효과의 순수 규칙만 둔다. 화면은 scenario-ui.ts, 무대 연출은 story-stage.ts.
 */
import {ROUTES,routeById,routesFor,validRoute,type Route,type Tale} from './fate.ts';
import {STORY_ORDER,RUN_FLOORS,XP_PER_LEVEL,WOUNDED,RELICS,OFFICER_RECRUITS,grantXp,registerTales,landClass,type Run,type RunUnit} from './roguelike.ts';
import {Rng} from '../../core/src/index.ts';
import {checkFaction,customList,type Faction,type CustomOfficer} from './custom.ts';
import {isNewPower,newPowerScript,setFactionContext} from './newpower.ts';
import {evolvedClass,currentClass,type UnitClass} from '../../core/src/index.ts';
import type {ChapterScript,ChoiceEffect,ExtraTale,ScenarioPack,ScriptStep,Look} from './scenario-types.ts';
import history1 from './scenario/history-1.ts';
import history2 from './scenario/history-2.ts';
import history3 from './scenario/history-3.ts';
import ifA from './scenario/if-a.ts';
import ifB from './scenario/if-b.ts';
import ifC from './scenario/if-c.ts';

export const PACKS:ScenarioPack[]=[history1,history2,history3,ifA,ifB,ifC];
const SCRIPTS=new Map<string,ChapterScript>(PACKS.flatMap(p=>p.chapters.map(c=>[c.id,c] as const)));
export const EXTRA_TALES:ExtraTale[]=PACKS.flatMap(p=>p.extraTales??[]);
export const ENDING_NOTES=PACKS.flatMap(p=>p.endingNotes??[]);
export const scriptOf=(id:string)=>SCRIPTS.get(id)??(isNewPower(id)?newPowerScript(id):undefined);

export type StepKind='story'|'fate'|'tale'|'boss'|'ending';
export interface ScenarioStep {
  id:string;kind:StepKind;act:1|2|3;
  /** 연의 장의 스테이지 id */
  stage?:string;
  /** 가상 전장 */
  tale?:Tale;
  /** 이 장이 속한 루트 */
  route?:string;
}

export interface ScenarioOfficer {name:string;unitClass:UnitClass;level:number;xp:number}
export interface ScenarioState {
  version:1;
  route:{1?:string;2?:string;3?:string};
  /** 마친 장 id(연의·가상·갈림길·결말) */
  done:string[];
  /** 대사 선택으로 남은 표식 */
  flags:string[];
  /** 장 id → 고른 선택지 id */
  choices:Record<string,string>;
  /** 가상 루트에서 함께 싸우는 장수(이름 → 병종·레벨·경험치) */
  officers:Record<string,ScenarioOfficer>;
  /** 가상 전장 바꿔치기: 원래 전장 id → 다른 전장 id */
  paths:Record<string,string>;
  /** 로그라이크 회차(천명의 길 한 번). 없으면 화면이 열 때 만든다. */
  run?:ScenarioRun;
}

/**
 * 본편은 로그라이크다: 한 회차는 언제나 연의 첫 장(S1-01)에서 시작해 결말이나 패배로 끝난다.
 * 장과 장 사이에는 씨앗으로 정해지는 '행군로' 세 갈래(전투·정예·모병·의원·보물고·수련) 중 하나를 고르고,
 * 쓰러진 장수는 떠나지 않고 중상(체력 25%)으로 돌아오며, 체력과 보물은 다음 싸움으로 이어진다. 장수는 설득해야 합류한다(persuade.ts).
 * 지면 회차가 끝나고(천명의 가호가 있으면 한 번 견딘다) 천명을 얻어 다음 회차를 강하게 한다(meta.ts 해금).
 */
export interface ScenarioRun {
  seed:number;
  /** 전황 카드·전공 보상으로 쌓은 천명(회차가 끝날 때 함께 받는다) */
  bonus?:number;
  /** 몇 번째 회차인가 */
  no:number;
  /** 체력 비율(이름 → 0~1, 없으면 1): 가상 전장·행군 전투 사이에 이어진다 */
  hp:Record<string,number>;
  relics:string[];
  /** 예전 기록의 쓰러진 장수 목록(지금은 쓰지 않는다 — 쓰러진 장수는 중상으로 돌아온다) */
  fallen:string[];
  /** 행군로를 지난 자리(앞 장 id) */
  marched:string[];
  /** 지금 치르는 행군 전투의 갈래(끝나기 전에 다른 갈래로 빠질 수 없다) */
  march?:MarchKind;
  /** 천명의 가호가 남았나 */
  guard:boolean;
  /** 지나온 행군 갈래 수(천명 정산) */
  nodes:number;
  status:'alive'|'over'|'complete';
  /** 천명을 이미 받았나 */
  settled?:boolean;
  /** 신세력으로 시작한 회차: 세력 이름·문장·깃발 색 */
  faction?:Faction;
}
export type MarchKind='battle'|'elite'|'recruit'|'rest'|'treasure'|'training';
export interface MarchNode {kind:MarchKind;label:string;detail:string}
export const freshScenario=():ScenarioState=>({version:1,route:{},done:[],flags:[],choices:{},officers:{},paths:{}});

const KEY='sama-scenario-v1';
export function readScenario(raw:string|null):ScenarioState{
  try{
    const s=JSON.parse(raw??'null') as Partial<ScenarioState>|null;if(!s||s.version!==1)return freshScenario();
    const route=s.route&&typeof s.route==='object'?s.route:{};
    const clean:ScenarioState={version:1,route:validRoute(route)?{...route}:{},done:Array.isArray(s.done)?s.done.filter(x=>typeof x==='string'):[],
      flags:Array.isArray(s.flags)?s.flags.filter(x=>typeof x==='string'):[],choices:{},officers:{},paths:{}};
    for(const [k,v] of Object.entries(s.choices??{}))if(typeof v==='string')clean.choices[k]=v;
    for(const [k,v] of Object.entries(s.paths??{}))if(typeof v==='string'&&EXTRA_TALES.some(t=>t.id===v&&t.replaces===k))clean.paths[k]=v;
    const run=readRun(s.run);if(run)clean.run=run;
    for(const [k,o] of Object.entries(s.officers??{}))if(o&&typeof o.unitClass==='string'&&Number.isInteger(o.level)&&o.level>=1&&o.level<=60&&Number.isInteger(o.xp)&&o.xp>=0&&o.xp<XP_PER_LEVEL)clean.officers[k]={name:k,unitClass:currentClass(o.unitClass),level:o.level,xp:o.xp};
    return clean;
  }catch{return freshScenario();}
}
const MARCH_KINDS:MarchKind[]=['battle','elite','recruit','rest','treasure','training'];
function readRun(r:unknown):ScenarioRun|undefined{
  if(!r||typeof r!=='object')return undefined;const x=r as Partial<ScenarioRun>;
  if(!Number.isSafeInteger(x.seed)||!Number.isInteger(x.no)||(x.no??0)<1)return undefined;
  const strs=(a:unknown)=>Array.isArray(a)?a.filter((v):v is string=>typeof v==='string'):[];
  const hp:Record<string,number>={};for(const [k,v] of Object.entries(x.hp??{}))if(typeof v==='number'&&v>0&&v<=1)hp[k]=v;
  return {seed:x.seed!,no:x.no!,hp,relics:strs(x.relics).filter(id=>RELICS.some(q=>q.id===id)),fallen:strs(x.fallen),marched:strs(x.marched),...(x.march&&MARCH_KINDS.includes(x.march)?{march:x.march}:{}),
    ...(Number.isInteger(x.bonus)&&x.bonus!>0&&x.bonus!<10000?{bonus:x.bonus!}:{}),guard:!!x.guard,nodes:Number.isInteger(x.nodes)&&x.nodes!>=0?x.nodes!:0,status:x.status==='over'||x.status==='complete'?x.status:'alive',...(x.settled?{settled:true}:{}),
    ...(x.faction&&typeof x.faction==='object'&&!checkFaction(x.faction)?{faction:{name:x.faction.name,emblem:x.faction.emblem,color:x.faction.color}}:{})};
}
export function loadScenario(){let s:ScenarioState;try{s=readScenario(localStorage.getItem(KEY));}catch{s=freshScenario();}syncFaction(s);return s;}
/** 신세력 대본이 지금 회차의 세력 이름·동료를 쓰게 한다. */
export function syncFaction(s:ScenarioState){
  const LOOK:Record<string,Look>={infantry:'infantry',spearman:'spear',archer:'archer',cavalry:'cavalry',heavyCav:'heavy',crossbow:'crossbow',strategist:'strategist',horseArcher:'horseArcher',bandit:'bandit',monk:'monk',taoist:'taoist',fengshui:'sage'};
  const f=s.run?.faction;setFactionContext({name:f?.name??'신세력',emblem:f?.emblem??'신',companions:Object.values(s.officers).map(o=>({name:o.name,look:LOOK[o.unitClass]??'infantry'}))});
}
export function saveScenario(s:ScenarioState){syncFaction(s);try{localStorage.setItem(KEY,JSON.stringify(s));}catch{/* storage optional */}}

/** 그 루트의 가상 전장(선택으로 바뀐 것 반영). */
export function routeTales(route:Route,state:Pick<ScenarioState,'paths'>):Tale[]{
  return route.tales.map(t=>{const alt=EXTRA_TALES.find(x=>x.id===state.paths[t.id]);return alt?{id:alt.id,title:alt.title,intro:alt.intro,target:alt.target}:t;});
}
/** 가상 전장 id(원래 것이든 바뀐 것이든)로 찾는다. */
export function scenarioTale(id:string|undefined):Tale|undefined{
  if(!id)return undefined;const base=ROUTES.flatMap(r=>r.tales).find(t=>t.id===id);if(base)return base;
  const alt=EXTRA_TALES.find(t=>t.id===id);return alt?{id:alt.id,title:alt.title,intro:alt.intro,target:alt.target}:undefined;
}

// 원정·세션이 다른 가상 전장 id도 알아보게 한다(저장 검증·재생).
registerTales(id=>scenarioTale(id));

/**
 * 지금까지의 선택으로 정해지는 장의 순서. 아직 고르지 않은 갈림길에서 끊긴다(그 갈림길까지 포함).
 */
export function scenarioPath(state:ScenarioState):ScenarioStep[]{
  const out:ScenarioStep[]=[],r=state.route;
  const history=(act:1|2|3,ids:string[])=>{for(const id of ids)out.push({id,kind:'story',act,stage:id});};
  const ifRoute=(route:Route)=>{for(const t of routeTales(route,state))out.push({id:t.id,kind:'tale',act:route.act,tale:t,route:route.id});out.push({id:`${route.id}:boss`,kind:'boss',act:route.act,route:route.id});};
  // 상편: 출사 전 네 장(하내·낙양·육혼산·꿈) 뒤에 첫 갈림길.
  history(1,STORY_ORDER[1].slice(0,4));
  out.push({id:'fate:1',kind:'fate',act:1});
  const r1=routeById(r[1]);if(!r1)return out;
  if(r1.history)history(1,STORY_ORDER[1].slice(4));else ifRoute(r1);
  out.push({id:`fate:2:${r1.id}`,kind:'fate',act:2});
  const r2=routeById(r[2]);if(!r2)return out;
  if(r2.history)history(2,STORY_ORDER[2]);else ifRoute(r2);
  out.push({id:`fate:3:${r2.id}`,kind:'fate',act:3});
  const r3=routeById(r[3]);if(!r3)return out;
  if(r3.history)history(3,STORY_ORDER[3]);else ifRoute(r3);
  out.push({id:`ending:${r3.id}`,kind:'ending',act:3,route:r3.id});
  return out;
}
/** 지금 할 장(마치지 않은 첫 장). 모두 마쳤으면 undefined(결말까지 본 것). */
export function currentStep(state:ScenarioState){const done=new Set(state.done);return scenarioPath(state).find(s=>!done.has(s.id));}
export const isDone=(state:ScenarioState,id:string)=>state.done.includes(id);

/** 갈림길 장 id의 선택지(루트 id). */
export function fateChoices(state:ScenarioState,stepId:string):Route[]{
  const [,actText]=stepId.split(':'),act=Number(actText) as 1|2|3;
  return routesFor(act,state.route,!!state.run?.faction);
}

/** 대사 선택을 기록하고 그 효과(표식·바꿔치기·영입)를 상태에 남긴다. 갈림길이면 루트를 고른다. */
export function choose(state:ScenarioState,step:ScenarioStep,optionId:string,effects:ChoiceEffect[]=[],heroLevel=1){
  state.choices[step.id]=optionId;
  if(step.kind==='fate'){
    if(!fateChoices(state,step.id).some(r=>r.id===optionId))return false;
    state.route={...state.route,[step.act]:optionId};
    const route=routeById(optionId)!;
    // 가상으로 들어서면 사마의를 따르는 장수들이 모인다(그 길의 적은 빼고).
    if(!route.history)joinCompanions(state,route,heroLevel);
    else for(const name of Object.keys(state.officers))if(foesOf(route).includes(name))delete state.officers[name];
  }
  for(const e of effects){
    if(e.kind==='flag'&&!state.flags.includes(e.flag))state.flags.push(e.flag);
    if(e.kind==='path'){const alt=EXTRA_TALES.find(t=>t.id===e.tale);if(alt)state.paths[alt.replaces]=alt.id;}
    if(e.kind==='recruit'&&!state.officers[e.name])state.officers[e.name]={name:e.name,unitClass:landClass(e.unitClass),level:Math.max(1,heroLevel-1),xp:0};
  }
  return true;
}
/**
 * 아직 마치지 않은 장의 이야기를 다시 시작할 때: 그 장에서 전에 고른 대사의 효과(표식·바꿔치기·영입)를 걷어 낸다.
 * 그러지 않으면 다른 답을 고를 때 서로 어긋나는 표식(자비와 엄벌 등)과 영입이 함께 남는다. 갈림길·마친 장은 건드리지 않는다.
 */
export function undoChoice(state:ScenarioState,step:ScenarioStep){
  if(step.kind==='fate'||state.done.includes(step.id))return;
  const picked=state.choices[step.id],script=scriptOf(step.id);if(!picked)return;
  delete state.choices[step.id];if(!script)return;
  const effects=[...script.scenes,...(script.after??[])].flatMap(sc=>sc.steps).flatMap(st=>'choice' in st?st.options:[]).find(o=>o.id===picked)?.effects??[];
  // 다른 장에서도 세우는 표식은 남긴다(이 장에서만 세우는 표식만 걷는다).
  const elsewhere=new Set<string>();
  for(const [id,opt] of Object.entries(state.choices)){const sc=scriptOf(id);if(!sc)continue;
    for(const o of [...sc.scenes,...(sc.after??[])].flatMap(x=>x.steps).flatMap(st=>'choice' in st?st.options:[]))if(o.id===opt)for(const e of o.effects??[])if(e.kind==='flag')elsewhere.add(e.flag);}
  for(const e of effects){
    if(e.kind==='flag'&&!elsewhere.has(e.flag))state.flags=state.flags.filter(f=>f!==e.flag);
    if(e.kind==='path'){const alt=EXTRA_TALES.find(t=>t.id===e.tale);if(alt&&state.paths[alt.replaces]===alt.id)delete state.paths[alt.replaces];}
    if(e.kind==='recruit')delete state.officers[e.name];
  }
}
/** 그 길에서 적으로 만나는 사람. */
export function foesOf(route:Route){return [route.region.boss.name,...route.tales.map(t=>t.target.name),...EXTRA_TALES.filter(t=>t.route===route.id).map(t=>t.target.name)];}
/** 가상 루트의 기본 동료: 조진(기병)·장합(창병)·곽회(궁병)·사마랑(의원). 원소 쪽에서 시작한 길에는 조진이 없다. */
export const COMPANIONS:Array<{name:string;unitClass:UnitClass}>=[{name:'조진',unitClass:'cavalry'},{name:'장합',unitClass:'cavalry'},{name:'곽회',unitClass:'archer'},{name:'사마랑',unitClass:'fengshui'}];
export function joinCompanions(state:ScenarioState,route:Route,heroLevel:number){
  const yuanSide=state.route[1]==='yuan',foes=new Set(foesOf(route));
  // 원소 쪽 길: 조진 대신 백마에서 살아남은 문추가 곁에 선다.
  if(yuanSide&&!foes.has('문추')&&!state.officers['문추'])state.officers['문추']={name:'문추',unitClass:'cavalry',level:Math.max(1,heroLevel-1),xp:0};
  for(const name of Object.keys(state.officers))if(foes.has(name))delete state.officers[name];
  for(const c of COMPANIONS){if(foes.has(c.name)||(yuanSide&&c.name==='조진')||state.officers[c.name])continue;state.officers[c.name]={name:c.name,unitClass:c.unitClass,level:Math.max(1,heroLevel-1),xp:0};}
}
export function finishStep(state:ScenarioState,id:string){if(!state.done.includes(id))state.done.push(id);}
/** 가상 전장에서 꺾은 적장이 본래 사마의의 동료(장합 등)라면 귀순해 부대로 돌아온다. 돌아온 이름을 돌려준다. */
export function winOver(state:ScenarioState,step:ScenarioStep,level:number){
  const name=step.tale?.target.name,c=COMPANIONS.find(x=>x.name===name);
  if(step.kind!=='tale'||!c||state.officers[c.name])return undefined;
  state.officers[c.name]={name:c.name,unitClass:c.unitClass,level:Math.max(1,level),xp:0};return c.name;
}

/** 장면 진행: 표식에 따라 보일 단계만 고른다. */
export function visibleSteps(steps:ScriptStep[],flags:readonly string[]){return steps.filter(s=>(!s.when||flags.includes(s.when))&&(!s.unless||!flags.includes(s.unless)));}

/** 가상 전장의 원정 층(적 레벨 기준): 상편 2~6, 중편 8~12, 하편 14~18. */
export function floorFor(step:ScenarioStep,state:ScenarioState){
  const base=(step.act-1)*6;
  if(step.kind==='boss')return base+6;
  const route=routeById(step.route);if(!route)return base+2;
  const i=routeTales(route,state).findIndex(t=>t.id===step.id);
  return Math.min(RUN_FLOORS,base+2+Math.max(0,i));
}

/** 가상 전장에 나가는 부대(사마의 + 고른 장수들, 최대 6). heroLevel/heroXp는 연의 진행의 사마의. */
export function scenarioParty(state:ScenarioState,heroLevel:number,heroXp:number,picked?:string[]):RunUnit[]{
  const hp=(n:string)=>state.run?.hp[n]??1;
  const hero:RunUnit={id:'sima_yi',name:'사마의',unitClass:evolvedClass('strategist',heroLevel),level:heroLevel,xp:Math.min(XP_PER_LEVEL-1,heroXp),hp:hp('사마의'),hero:true};
  const names=(picked??Object.keys(state.officers)).filter(n=>state.officers[n]).slice(0,6);
  return [hero,...names.map((n,i)=>{const o=state.officers[n]!;return {id:'of'+(i+1),name:n,unitClass:evolvedClass(o.unitClass,o.level),level:o.level,xp:o.xp,hp:hp(n),officer:true as const};})];
}

/** 전투가 끝나고: 장수들에게 번 경험치 + 승리 보너스를 주고(진화 포함), 소식 문장을 돌려준다. */
export function rewardOfficers(state:ScenarioState,party:RunUnit[],earned:Record<string,number>,bonus:number,mult=1):string[]{
  const run={party:[] as RunUnit[],news:[] as string[],relics:[],fallen:[]} as unknown as Run;
  for(const u of party){if(u.hero||!state.officers[u.name])continue;const o=state.officers[u.name]!;
    const unit:RunUnit={id:u.id,name:o.name,unitClass:evolvedClass(o.unitClass,o.level),level:o.level,xp:o.xp,hp:1,officer:true};run.party.push(unit);
    grantXp(run,Math.round((bonus+(earned[u.id]??0))*mult),[unit]);
    state.officers[u.name]={name:o.name,unitClass:unit.unitClass,level:unit.level,xp:unit.xp};}
  return run.news;
}

/** 상·중편에서 결말 회고로 꺼내는 줄 수(대본 묶음마다). 하편(연의·가상)의 덧말은 모두 보인다. */
export const ENDING_NOTES_PER_ACT=2;
/** 상·중편 대본 묶음: 연의 상편·중편(history-1·2)과 가상 상·중편(if-a). */
const EARLY_PACKS=new Set([0,1,3]);
/**
 * 결말 덧말: 이번 이야기에서 남긴 표식에 따른 한 줄들 — 상편·중편의 선택이 먼저 회고되고 하편의 덧말이 뒤따른다.
 * 상·중편은 대본에 적힌 순서(무게 순)로 편마다 ENDING_NOTES_PER_ACT줄까지만.
 */
export function endingNotes(state:ScenarioState){
  const has=(n:{flag:string})=>state.flags.includes(n.flag);
  return PACKS.flatMap((p,i)=>{const got=(p.endingNotes??[]).filter(has);return EARLY_PACKS.has(i)?got.slice(0,ENDING_NOTES_PER_ACT):got;}).map(n=>n.line);
}


// ─────────────────────────────────────────────── 로그라이크 회차

/** 새 회차: 연의 첫 장부터. 사마랑·조진이 곁에 있고, 해금에 따라 사마사·보물·가호가 더해진다. */
export function newScenarioRun(no:number,seed:number,unlocks:readonly string[]=[],heroLevel=1,opts:{faction?:Faction;customs?:readonly CustomOfficer[]}={}):ScenarioState{
  const s=freshScenario(),lv=Math.max(1,heroLevel-1);
  s.officers['사마랑']={name:'사마랑',unitClass:'fengshui',level:lv,xp:0};
  // 신세력: 조씨의 장수 대신 직접 만든 신장수(최대 넷)가 처음부터 함께한다.
  if(opts.faction)for(const c of (opts.customs??[]).slice(0,4))s.officers[c.name]={name:c.name,unitClass:landClass(c.unitClass),level:lv,xp:0};
  else s.officers['조진']={name:'조진',unitClass:'cavalry',level:lv,xp:0};
  if(unlocks.includes('wide_network'))s.officers['사마사']={name:'사마사',unitClass:'cavalry',level:lv,xp:0};
  const r=new Rng(seed>>>0||1),relics=unlocks.includes('heirloom')?[RELICS[r.int(0,RELICS.length-1)]!.id]:[];
  s.run={seed,no,hp:{},relics,fallen:[],marched:[],guard:unlocks.includes('second_chance'),nodes:0,status:'alive',...(opts.faction?{faction:{...opts.faction}}:{})};
  syncFaction(s);return s;
}
/** 회차가 없는 예전 기록은 지금 자리에서 첫 회차로 이어 간다(진행을 지우지 않는다). */
export function ensureRun(state:ScenarioState,seed:number,unlocks:readonly string[]=[],heroLevel=1){
  if(state.run)return false;
  // 곁에 장수가 없으면(연의 길의 예전 기록) 사마랑·조진이 행군에 함께한다(그 길의 적이 아니면).
  if(!Object.keys(state.officers).length){const foes=new Set((['1','2','3'] as const).flatMap(a=>{const rt=routeById(state.route[Number(a) as 1|2|3]);return rt?foesOf(rt):[];}));
    for(const [name,unitClass] of [['사마랑','fengshui'],['조진','cavalry']] as const)if(!foes.has(name))state.officers[name]={name,unitClass,level:Math.max(1,heroLevel-1),xp:0};}
  state.run={seed,no:1,hp:{},relics:[],fallen:[],marched:[],guard:unlocks.includes('second_chance'),nodes:0,status:'alive'};return true;
}
const hashId=(id:string)=>{let h=2166136261;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
/** 장과 장 사이의 행군로: 마친 장 바로 다음 장으로 가기 전에 지나야 하는 자리(앞 장 id). */
export function pendingMarch(state:ScenarioState):string|undefined{
  const run=state.run;if(!run||run.status!=='alive')return undefined;
  const path=scenarioPath(state),done=new Set(state.done),i=path.findIndex(x=>!done.has(x.id));
  if(i<=0)return undefined;const prev=path[i-1]!,next=path[i]!;
  if(next.kind==='ending')return undefined;
  return run.marched.includes(prev.id)?undefined:prev.id;
}
const MARCH_TEXT:Record<MarchKind,[string,string]>={
  battle:['전투','길목의 적을 친다. 장수들이 경험치를 얻고 보상 하나를 고른다. 쓰러진 장수는 중상(체력 25%)으로 돌아온다.'],
  elite:['정예 전투','진화한 정예가 섞인 강적. 이기면 보물 하나.'],
  recruit:['모병소','장수 한 사람을 맞아들인다.'],
  rest:['의원','모든 장수와 사마의의 체력을 되찾는다.'],
  treasure:['보물고','이번 회차 내내 효과가 이어지는 보물 하나를 고른다.'],
  training:['수련장','사마의와 장수들이 경험치를 얻는다.'],
};
/** 행군로 세 갈래(같은 회차·같은 자리면 언제나 같다). 전투는 언제나 하나 있다. */
export function marchNodes(state:ScenarioState,after:string,size=3):MarchNode[]{
  const run=state.run!,r=new Rng((run.seed^hashId(after))>>>0||1),kinds:MarchKind[]=['battle'];
  const pool:MarchKind[]=['elite','recruit','rest','treasure','training','battle'].filter(k=>k!=='recruit'||recruitPool(state).length>0) as MarchKind[];
  while(kinds.length<size&&pool.length){const k=pool.splice(r.int(0,pool.length-1),1)[0]!;if(!kinds.includes(k))kinds.push(k);}
  return kinds.map(kind=>({kind,label:MARCH_TEXT[kind][0],detail:MARCH_TEXT[kind][1]}));
}
/** 맞아들일 수 있는 장수: 곁에 없고, 이번 회차에 쓰러지지 않았고, 고른 길의 적이 아닌 사람. */
export function recruitPool(state:ScenarioState){
  const gone=new Set([...Object.keys(state.officers),...(state.run?.fallen??[]).map(f=>f.split(' Lv.')[0]!),...(['1','2','3'] as const).flatMap(a=>{const rt=routeById(state.route[Number(a) as 1|2|3]);return rt?foesOf(rt):[];})]);
  const customs=customList().map(c=>({name:c.name,unitClass:c.unitClass}));
  return [...COMPANIONS,...OFFICER_RECRUITS,...customs].filter((o,i,a)=>a.findIndex(x=>x.name===o.name)===i&&!gone.has(o.name));
}
/** 모병소·전투 보상에 나오는 장수 둘. */
export function recruitOffer(state:ScenarioState,after:string,n=2){
  const r=new Rng((state.run!.seed^hashId(after+'#recruit'))>>>0||1),pool=recruitPool(state),out:typeof pool=[];
  while(out.length<n&&pool.length)out.push(pool.splice(r.int(0,pool.length-1),1)[0]!);return out;
}
/** 보물고·정예 보상에 나오는 보물 셋. */
export function relicOffer(state:ScenarioState,after:string,n=3){
  const r=new Rng((state.run!.seed^hashId(after+'#relic'))>>>0||1),pool=RELICS.filter(x=>!state.run!.relics.includes(x.id)),out:typeof pool=[];
  while(out.length<n&&pool.length)out.push(pool.splice(r.int(0,pool.length-1),1)[0]!);return out;
}
export function recruitOfficer(state:ScenarioState,name:string,heroLevel:number,elite=false){
  const o=recruitPool(state).find(x=>x.name===name);if(!o||Object.keys(state.officers).length>=8)return false;
  state.officers[name]={name,unitClass:landClass(o.unitClass),level:Math.max(1,heroLevel-1+(elite?3:0)),xp:0};return true;
}
export function healAll(state:ScenarioState,amount=1){const run=state.run!;for(const k of Object.keys(run.hp))run.hp[k]=Math.min(1,run.hp[k]!+amount);for(const [k,v] of Object.entries(run.hp))if(v>=1)delete run.hp[k];}
/** 행군로 한 갈래를 마쳤다. */
export function finishMarch(state:ScenarioState,after:string){const run=state.run!;if(!run.marched.includes(after))run.marched.push(after);run.nodes++;delete run.march;}
/** 행군 전투의 층(적 구성·전장 크기 기준): 그 편 안에서 지난 행군 수만큼 깊어진다. */
export function marchFloor(state:ScenarioState,act:1|2|3){
  const inAct=scenarioPath(state).filter(x=>x.act===act&&state.run?.marched.includes(x.id)).length;
  return (act-1)*6+Math.min(5,2+inAct);
}
/**
 * 싸움이 끝난 뒤의 부대: 살아남은 장수의 체력을 남기고, 쓰러진 장수는 중상(체력 25%)으로 돌아온다.
 * survivors: 이름 → 체력 비율(살아남은 사람만). 쓰러진 이름을 돌려준다.
 */
export function afterFight(state:ScenarioState,party:RunUnit[],survivors:Record<string,number>,where:string){
  const run=state.run;if(!run)return [];const lost:string[]=[];
  for(const u of party){const hp=survivors[u.name];
    // 쓰러진 장수는 떠나지 않는다: 중상(체력 25%)으로 물러나 다음 싸움에 다시 나선다.
    if(hp===undefined){if(u.hero)continue;lost.push(u.name);run.hp[u.name]=WOUNDED;void where;continue;}
    if(hp>=0.999)delete run.hp[u.name];else run.hp[u.name]=Math.max(.05,hp);}
  return lost;
}
/** 졌다: 가호가 있으면 한 번 견디고(사마의 체력 30%) 다시 정비부터, 없으면 회차가 끝난다. 견뎠으면 true. */
export function loseFight(state:ScenarioState){
  const run=state.run;if(!run)return true;
  if(run.guard){run.guard=false;run.hp['사마의']=.3;delete run.march;return true;}
  run.status='over';delete run.march;return false;
}
/** 이번 회차의 천명: 이긴 전투 장 2 · 우두머리 3 · 행군 1 · 결말 10. */
export function runMandate(state:ScenarioState){
  const done=new Set(state.done),path=scenarioPath(state).filter(x=>done.has(x.id));
  return 2*path.filter(x=>x.kind==='story'||x.kind==='tale').length+3*path.filter(x=>x.kind==='boss').length+(state.run?.nodes??0)+(path.some(x=>x.kind==='ending')?10:0)+(state.run?.bonus??0);
}

// ─────────────────────────────────────────────── 연의의 로그라이크: 전황 카드 · 전공 보상
/** 장마다 싸우기 전에 셋 중 하나를 고르는 전황. 이득(사기·방어·MP)이거나, 걸고 이기면 천명을 더 주는 도전이다. */
export interface Omen {id:string;name:string;text:string;mod?:'rally'|'guard'|'insight';goal?:'gamble'|'swift'|'intact';reward?:number}
export const OMENS:Omen[]=[
  {id:'clear',name:'맑은 하늘',text:'아군 처음 2턴 사기 상승',mod:'rally'},
  {id:'wind',name:'동남풍',text:'사마의 책략 MP +15',mod:'insight'},
  {id:'terrain',name:'험한 지세',text:'아군 첫 턴 방어 태세',mod:'guard'},
  {id:'gamble',name:'배수진',text:'사마의가 체력 70%로 나선다 · 이기면 천명 +4',goal:'gamble',reward:4},
  {id:'swift',name:'속전속결',text:'14턴 안에 이기면 천명 +4',goal:'swift',reward:4},
  {id:'intact',name:'무혈 승리',text:'아군이 하나도 퇴각하지 않고 이기면 천명 +3',goal:'intact',reward:3},
];
const omenHash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function omenOffer(state:ScenarioState,stepId:string,n=3){
  const r=new Rng(((state.run?.seed??7)^omenHash(stepId+'#omen'))>>>0||1),pool=[...OMENS],out:Omen[]=[];
  while(out.length<n&&pool.length)out.push(pool.splice(r.int(0,pool.length-1),1)[0]!);return out;
}
export function omenOf(state:ScenarioState,stepId:string){const f=state.flags.find(x=>x.startsWith(`omen:${stepId}:`));return f?OMENS.find(o=>o.id===f.split(':')[2]):undefined;}
export function chooseOmen(state:ScenarioState,stepId:string,id:string){
  const o=OMENS.find(x=>x.id===id);if(!o)return false;state.flags=state.flags.filter(f=>!f.startsWith(`omen:${stepId}:`));state.flags.push(`omen:${stepId}:${id}`);
  if(o.goal==='gamble'&&state.run)state.run.hp['사마의']=Math.min(state.run.hp['사마의']??1,.7);return true;
}
/** 이긴 전투의 전황 도전 결과: 받은 천명(0이면 실패). */
export function omenReward(o:Omen|undefined,b:{turn:number;lost:number}){
  if(!o?.goal)return 0;if(o.goal==='gamble')return o.reward!;if(o.goal==='swift')return b.turn<=14?o.reward!:0;return b.lost===0?o.reward!:0;
}
export function addRunBonus(state:ScenarioState,n:number){if(state.run&&n>0)state.run.bonus=(state.run.bonus??0)+n;}


/** 지금 가상 시나리오 안인가(다음 장의 편이 가상 루트를 걷는 중). 설득은 가상 시나리오에서만 한다. */
export function inWhatIf(state:ScenarioState){const step=currentStep(state);if(!step)return false;const r=routeById(state.route[step.act]);return !!r&&!r.history;}
/** 가상 전장에서 꺾은 적장을 설득해 들인다(성공하면 그 병종·레벨로 합류). */
export function joinCaptive(state:ScenarioState,name:string,unitClass:UnitClass,level:number){
  if(state.officers[name]||Object.keys(state.officers).length>=8)return false;
  state.officers[name]={name,unitClass:landClass(unitClass),level:Math.max(1,level),xp:0};return true;
}
