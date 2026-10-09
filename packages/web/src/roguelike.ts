/**
 * 천명의 원정 — 로그라이크 모드의 순수 규칙.
 *
 * 게임의 중심. 한 번의 원정은 상편·중편·하편 3편 18층(6층마다 우두머리). 층마다 갈림길 중 하나를 고른다.
 * 연의 32전장은 원정 안의 '연의 전장' 갈림길로 나온다. 한 번 이긴 연의 전장은 영구 기록(천명 기록)에 남아
 * 다음 원정은 그다음 이야기로 이어진다. 원정이 끝나면 천명을 얻어 영구 해금에 쓴다(meta.ts).
 * 전장은 원정 씨앗과 층으로 결정론적으로 생성되고, 쓰러진 부대는 원정에서 영원히 빠진다.
 * 경험치로 레벨이 오르면 병종이 진화한다(classes.ts의 계통).
 * 화면과 저장은 main.ts가 맡는다. 이 모듈은 상태를 바꾸는 순수 함수만 둔다.
 */
import {ccLevelDelta} from './cc-apply.ts';
import {Rng,VARIANTS,makeUnit,evolvedClass,nextEvolution,profileOf,evolveUnit,familyOf,statsFor,type UnitClass,type StageDef,type MapFile,type UnitSpawnSpec,type BattleState,type LogEntry,type Unit} from '../../core/src/index.ts';
import {classNames,troopStrategies} from './troops.ts';
import {availableStrategies,allStrategies} from './officers.ts';
import {ROUTES,routeById,routesFor,fatePoint,type Tale} from './fate.ts';
import {romanceOf,romanceStats} from './romance.ts';
import {을를} from './josa.ts';

export const FLOORS_PER_ACT=6;
export const RUN_FLOORS=18;
/** 사마의를 포함한 원정 부대 상한(출진 칸 7개) */
export const PARTY_LIMIT=7;
export const XP_PER_LEVEL=100;
/** 쓰러진 부대가 돌아올 때의 체력(중상). 원정·본편 공통. */
export const WOUNDED=.25;

export interface RunUnit {id:string;name:string;unitClass:UnitClass;level:number;xp:number;/** 체력 비율 0~1 */hp:number;hero?:true;/** 이름 있는 장수(연의 장수록 능력을 받고, 진화해도 이름이 바뀌지 않는다) */officer?:true}
export type NodeKind='battle'|'elite'|'boss'|'recruit'|'rest'|'treasure'|'training'|'story'|'fate'|'tale';
export interface RunNode {kind:NodeKind;label:string;detail:string;/** 연의 전장의 스테이지 id */stage?:string;/** 가상 전장 id */tale?:string}
export interface Relic {id:string;name:string;effect:string}
export interface Run {
  version:1;seed:number;floor:number;party:RunUnit[];relics:string[];fallen:string[];
  status:'map'|'reward'|'won'|'lost';nextId:number;
  /** 지금 치르는 전투(끝나기 전에 다른 갈림길로 빠질 수 없다) */
  active?:NodeKind;
  /** 보상 화면에서 고를 수 있는 것 */
  offer?:RewardOption[];
  /** 마지막으로 일어난 일 (진화·레벨업 등), 화면에 한 번 보여 준다 */
  news:string[];
  /** 지금 치르는 연의 전장 */
  activeStage?:string;
  /** 지금까지 이긴 연의 전장(원정 시작 때 천명 기록을 이어받는다) */
  chronicle?:string[];
  /** 이번 원정에서 이긴 연의 전장 */
  storyDone?:string[];
  /** 이번 원정에서 꺾은 우두머리 수 */
  bosses?:number;
  /** 원정 시작 때 적용된 영구 해금 */
  unlocks?:string[];
  /** 천명의 가호: 한 번 패배해도 원정이 끝나지 않는다 */
  secondChance?:boolean;
  /** 원정 종료 보상(천명)을 이미 받았는지 */
  mandateGranted?:boolean;
  /** 운명의 갈림길에서 고른 길(편 → 루트 id) */
  route?:{1?:string;2?:string;3?:string};
  /** 이번 원정에서 이긴 가상 전장 */
  talesDone?:string[];
  /** 지금 치르는 가상 전장 */
  activeTale?:string;
}
export type RewardOption={kind:'recruit';unitClass:UnitClass;level:number;/** 장수 영입이면 그 이름 */officer?:string}|{kind:'heal';amount:number}|{kind:'relic';relic:string}|{kind:'xp';amount:number};

export const RELICS:Relic[]=[
  {id:'whetstone',name:'숫돌',effect:'모든 부대 공격 +3'},
  {id:'lamellar',name:'찰갑',effect:'모든 부대 방어 +3'},
  {id:'warhorse',name:'준마',effect:'기병 계열 이동 +1'},
  {id:'drum',name:'진군고',effect:'보병·창병 계열 이동 +1'},
  {id:'banner',name:'군기',effect:'전투 시작 2턴 동안 사기 상승'},
  {id:'herbs',name:'약초 꾸러미',effect:'전투 뒤 체력 20% 추가 회복'},
  {id:'sunzi',name:'손자병법서',effect:'책략 MP +12, 지력 +3'},
  {id:'quiver',name:'화살통',effect:'궁·노 계열 공격 +5'},
  // 초한 영웅의 유물
  {id:'bawangJi',name:'패왕의 극',effect:'보병·기병 계열 공격 +5'},
  {id:'huangshi',name:'황석공 소서',effect:'책략 MP +8, 지력 +5'},
  {id:'xiaoheLedger',name:'소하의 장부',effect:'모든 부대 최대 체력 +12'},
  {id:'yuJade',name:'우희의 옥패',effect:'모든 부대 순발 +5'},
];

/** 세 편: 상편(관중) · 중편(기산) · 하편(요동). 편마다 지형·적 구성·우두머리가 다르다. */
export interface Region {name:string;arc:string;terrain:0|1|2;boss:{name:string;unitClass:UnitClass};pool:UnitClass[]}
export const REGIONS:Region[]=[
  {name:'관중 평원',arc:'상편',terrain:0,boss:{name:'마초',unitClass:'cavalry' as UnitClass},pool:['infantry','spearman','cavalry','archer','crossbow','pirate','horseArcher'] as UnitClass[]},
  {name:'기산 산악',arc:'중편',terrain:1,boss:{name:'제갈량',unitClass:'strategist' as UnitClass},pool:['infantry','spearman','bandit','assassin','archer','crossbow','taoist','strategist','heavyCav'] as UnitClass[]},
  {name:'요동 요수',arc:'하편',terrain:2,boss:{name:'공손연',unitClass:'lord' as UnitClass},pool:['infantry','spearman','cavalry','horseArcher','crossbow','archer','heavyCav','bandit','rattan'] as UnitClass[]},
];
export const actOf=(floor:number)=>Math.min(3,Math.max(1,Math.ceil(floor/FLOORS_PER_ACT)));
export const regionOf=(floor:number)=>REGIONS[actOf(floor)-1]!;
/** 그 원정이 고른 길의 지역: 상편은 하나, 중편·하편은 운명의 갈림길에서 고른 루트(고르기 전에는 정사). */
export function regionFor(run:{route?:Run['route']},floor:number):Region{
  const act=actOf(floor) as 1|2|3;
  return routeById(run.route?.[act])?.region??REGIONS[act-1]!;
}
/** 이 편이 정사를 따라가는가(연의 전장이 이어지는가). 하편 정사는 중편도 정사여야 한다. */
export function onHistory(run:{route?:Run['route']},act:number){
  if(act===1)return (run.route?.[1]??'refuse')==='refuse';
  const r2=run.route?.[2]??'wei';if(act===2)return r2==='wei';
  return r2==='wei'&&(run.route?.[3]??'patience')==='patience';
}
export const isBossFloor=(floor:number)=>floor%FLOORS_PER_ACT===0;

/** 편마다 연의 전장 순서(연의의 시간 순). */
export const STORY_ORDER:Record<1|2|3,string[]>={
  1:Array.from({length:11},(_,i)=>`S1-${String(i+1).padStart(2,'0')}`),
  2:Array.from({length:14},(_,i)=>`S2-${String(i+1).padStart(2,'0')}`),
  3:Array.from({length:7},(_,i)=>`S3-${String(i+1).padStart(2,'0')}`),
};
/** 이 층에서 나올 가상 전장: 고른 루트의 이야기 중 이번 원정에서 아직 치르지 않은 다음 것. */
export function nextTale(run:Run):Tale|undefined{
  const act=actOf(run.floor) as 1|2|3;if(onHistory(run,act))return undefined;
  const route=routeById(run.route?.[act]);if(!route)return undefined;
  const done=new Set(run.talesDone??[]);return route.tales.find(t=>!done.has(t.id));
}
/** 시나리오 모드가 더하는 다른 가상 전장(대사 선택으로 바뀌는 전장)을 찾는 길. scenario.ts가 등록한다. */
let extraTale:(id:string)=>Tale|undefined=()=>undefined;
export function registerTales(find:(id:string)=>Tale|undefined){extraTale=find;}
export const taleById=(id:string|undefined)=>id===undefined?undefined:ROUTES.flatMap(r=>r.tales).find(t=>t.id===id)??extraTale(id);
/** 그 길에서 적으로 만나는 장수(우두머리·가상 전장 적장). */
export function foesOf(routeId:string|undefined){const r=routeById(routeId);return r?[r.region.boss.name,...r.tales.map(t=>t.target.name)]:[];}
/** 그 길을 고르면 떠나는 장수: 그 길에서 적으로 만나는 사람은 부대에 남지 않는다. */
export function departingOfficers(run:Run,routeId:string){const foes=new Set(foesOf(routeId));return run.party.filter(u=>u.officer&&foes.has(u.name));}
/** 운명의 갈림길에서 길을 고른다. 이미 고른 편이거나 다른 편의 길이면 거절한다. */
export function chooseFate(run:Run,routeId:string){
  const act=actOf(run.floor) as 1|2|3,route=routeById(routeId);
  if(!route||route.act!==act||run.route?.[act]||!routesFor(act,run.route).includes(route))return false;
  const leaving=departingOfficers(run,routeId);
  run.route={...run.route,[act]:routeId};run.news=[`운명의 갈림길 — 「${route.choice}」. ${route.history?'역사대로 흘러간다.':'역사가 갈라졌다. 이제부터는 일어나지 않은 이야기다.'}`];
  if(leaving.length){run.party=run.party.filter(u=>!leaving.includes(u));run.news.push(`${leaving.map(u=>u.name).join('·')}${leaving.length>1?'은':fin(leaving[0]!.name)?'은':'는'} 뜻을 달리해 떠났다. 이 길에서는 적으로 만난다.`);}
  return true;
}

/** 이 층에서 나올 연의 전장: 아직 이기지 못한 다음 이야기, 다 이겼으면 이번 원정에서 안 치른 것. */
export function nextStory(run:Run):string|undefined{
  if(!onHistory(run,actOf(run.floor)))return undefined;
  const list=STORY_ORDER[actOf(run.floor) as 1|2|3],known=new Set(run.chronicle??[]),done=new Set(run.storyDone??[]);
  return list.find(id=>!known.has(id))??list.find(id=>!done.has(id));
}

/** 영입 가능한 기본 병종 */
export const RECRUITS:UnitClass[]=['infantry','spearman','cavalry','archer','crossbow','fengshui','horseArcher','pirate','yellowTurban','mountedStrategist','assassin','rattan','elephant','monk','taoist','bandit','heavyCav'];

/** 이름 있는 장수: 연의 장수록(romance.ts)의 능력을 이름으로 받는다. */
export interface OfficerSpec {name:string;unitClass:UnitClass}
/** 원정은 언제나 이 장수들과 함께 떠난다(고르지 않는다): 조진의 기병, 장합의 창병, 곽회의 궁병, 사마랑의 의원. */
export const STARTING_OFFICERS:OfficerSpec[]=[
  {name:'조진',unitClass:'cavalry'},{name:'장합',unitClass:'cavalry'},{name:'곽회',unitClass:'archer'},{name:'사마랑',unitClass:'fengshui'},
];
/** 해금 '넓은 인맥': 사마사가 경기병을 이끌고 처음부터 합류한다. */
export const NETWORK_OFFICER:OfficerSpec={name:'사마사',unitClass:'cavalry'};
/** 원정 중 영입할 수 있는 장수(위의 인재들). 이미 부대에 있거나 쓰러진 장수는 다시 나오지 않는다. */
export const OFFICER_RECRUITS:OfficerSpec[]=[
  {name:'사마사',unitClass:'cavalry'},{name:'사마소',unitClass:'crossbow'},{name:'등애',unitClass:'infantry'},{name:'진태',unitClass:'spearman'},
  {name:'종회',unitClass:'fengshui'},{name:'손례',unitClass:'cavalry'},{name:'왕기',unitClass:'archer'},{name:'조휴',unitClass:'cavalry'},
  {name:'왕릉',unitClass:'infantry'},{name:'문흠',unitClass:'bandit'},{name:'가규',unitClass:'mountedStrategist'},{name:'호준',unitClass:'monk'},
  // 명부대를 이끄는 장수들
  {name:'학소',unitClass:'crossbow'},{name:'만총',unitClass:'infantry'},{name:'서황',unitClass:'swordsman'},{name:'우금',unitClass:'spearman'},
  {name:'가후',unitClass:'wheelSage'},{name:'양준',unitClass:'fengshui'},{name:'견초',unitClass:'xiliang'},{name:'전주',unitClass:'bandit'},
];
const fallenName=(entry:string)=>entry.split(' Lv.')[0];
/** 지금 영입할 수 있는 장수: 부대에 없고, 이번 원정에서 쓰러지지 않은 사람. */
export function availableOfficers(run:Run):OfficerSpec[]{
  const gone=new Set([...run.party.map(u=>u.name),...run.fallen.map(fallenName),...Object.values(run.route??{}).flatMap(id=>foesOf(id))]);
  return OFFICER_RECRUITS.filter(o=>!gone.has(o.name));
}

const rngFor=(run:{seed:number},salt:number)=>new Rng((run.seed*7919+salt*104729)>>>0||1);

function unitName(cls:UnitClass){return classNames[cls]??cls;}
/** 한국어 조사: 받침 유무(로는 ㄹ받침도 '로'). */
const fin=(w:string)=>{const c=w.charCodeAt(w.length-1);return c>=0xac00&&c<=0xd7a3?(c-0xac00)%28:0;};
export const ga=(w:string)=>w+(fin(w)?'이':'가'),eul=(w:string)=>w+(fin(w)?'을':'를'),ro=(w:string)=>{const f=fin(w);return w+(f&&f!==8?'으로':'로');};
/** 같은 병종이 둘 이상이면 갑·을·병… 으로 구분한다. */
function uniqueName(run:Run,cls:UnitClass,self?:RunUnit){
  const base=unitName(cls),taken=new Set(run.party.filter(u=>u!==self&&!u.hero).map(u=>u.name));
  if(!taken.has(base))return base;
  for(const tag of ['을','병','정','무','기'])if(!taken.has(`${base} ${tag}`))return `${base} ${tag}`;
  return base;
}

export interface RunOptions {chronicle?:string[];unlocks?:string[];relic?:string}
export const has=(run:Run,unlock:string)=>!!run.unlocks?.includes(unlock);
export function newRun(seed:number,start:Array<UnitClass|OfficerSpec>,opts:RunOptions={}):Run{
  const run:Run={version:1,seed,floor:1,party:[],relics:[],fallen:[],status:'map',nextId:1,news:[],chronicle:[...(opts.chronicle??[])],storyDone:[],bosses:0,unlocks:[...(opts.unlocks??[])]};
  const level=has(run,'veteran_start')?6:4;
  run.party.push({id:'sima_yi',name:'사마의',unitClass:evolvedClass('strategist',level),level,xp:0,hp:1,hero:true});
  for(const s of start)if(typeof s==='string')recruit(run,s,level);else recruitOfficer(run,s,level);
  if(opts.relic&&RELICS.some(r=>r.id===opts.relic))run.relics.push(opts.relic);
  if(has(run,'second_chance'))run.secondChance=true;
  return run;
}

/** 원정의 출발 장수: 고정 편성(해금 '넓은 인맥'이면 사마사가 더해진다). */
export function startingOfficers(unlocks:string[]=[]):OfficerSpec[]{return [...STARTING_OFFICERS,...(unlocks.includes('wide_network')?[NETWORK_OFFICER]:[])];}

/** 출발 부대 후보 세 묶음(병종 3개씩). 예전 원정 화면과 시험용. */
export function startingOffers(seed:number,unlocks:string[]=[]):UnitClass[][]{
  const r=new Rng(seed>>>0||1),pick=()=>RECRUITS[r.int(0,RECRUITS.length-1)]!,wide=unlocks.includes('wide_network');
  const size=wide?4:3,group=()=>Array.from({length:size},pick);
  return [['infantry','archer','cavalry',...(wide?['fengshui' as UnitClass]:[])],group(),group(),...(wide?[group()]:[])];
}

export function recruitOfficer(run:Run,o:OfficerSpec,level:number){
  if(run.party.length>=PARTY_LIMIT||run.party.some(u=>u.name===o.name))return false;
  run.party.push({id:'of'+run.nextId++,name:o.name,unitClass:evolvedClass(o.unitClass,level),level,xp:0,hp:1,officer:true});
  return true;
}
export function recruit(run:Run,cls:UnitClass,level:number){
  if(run.party.length>=PARTY_LIMIT)return false;
  const evolved=evolvedClass(cls,level);
  run.party.push({id:'r'+run.nextId++,name:uniqueName(run,evolved),unitClass:evolved,level,xp:0,hp:1});
  return true;
}

/** 이 층의 갈림길 세 곳. 같은 원정·같은 층이면 언제나 같다. */
export function floorChoices(run:Run):RunNode[]{
  const f=run.floor;
  const act=actOf(f);
  if(!run.route?.[act as 1|2|3]){const p=fatePoint(act as 1|2|3,run.route);return [{kind:'fate',label:`운명의 갈림길 · ${p.title}`,detail:p.prompt}];}
  if(isBossFloor(f)){const g=regionFor(run,f),b=g.boss;return [{kind:'boss',label:`우두머리 · ${b.name}`,detail:`${g.arc}의 끝, ${g.name}의 주인. 격퇴하면 체력이 모두 회복된다.`}];}
  const r=rngFor(run,f),kinds:NodeKind[]=['battle'],size=has(run,'scout_map')?4:3;
  // 각 편의 첫 층을 뺀 모든 층에 연의 전장이 하나 나온다(남아 있다면).
  const story=f%FLOORS_PER_ACT!==1?nextStory(run):undefined,tale=!story&&f%FLOORS_PER_ACT!==1?nextTale(run):undefined;
  if(story)kinds.push('story');if(tale)kinds.push('tale');
  const extra:NodeKind[]=f>=2?['battle','elite','recruit','rest','treasure','training']:['battle','recruit','training'];
  while(kinds.length<size){const k=extra[r.int(0,extra.length-1)]!;if(k!=='battle'&&kinds.includes(k))continue;kinds.push(k);}
  return kinds.map(kind=>kind==='story'?{...describeNode(kind),stage:story!}:kind==='tale'?{...describeNode(kind),tale:tale!.id}:describeNode(kind));
}
function describeNode(kind:NodeKind):RunNode{
  switch(kind){
    case 'battle':return {kind,label:'전투',detail:'적 부대를 섬멸한다. 경험치 120과 보상 하나. 쓰러진 부대는 중상(체력 25%)으로 돌아온다.'};
    case 'elite':return {kind,label:'정예 전투',detail:'진화한 정예가 섞인 강적. 경험치 180과 보물 보상.'};
    case 'boss':return {kind,label:'우두머리',detail:''};
    case 'recruit':return {kind,label:'모병소',detail:'새 병종 하나를 부대에 들인다.'};
    case 'rest':return {kind,label:'의원',detail:'모든 부대의 체력을 60% 회복한다.'};
    case 'treasure':return {kind,label:'보물고',detail:'원정 내내 효과가 이어지는 보물 하나를 고른다.'};
    case 'training':return {kind,label:'수련장',detail:'모든 부대가 경험치 100을 얻는다.'};
    case 'story':return {kind,label:'연의 전장',detail:'연의 이야기 속 전투. 사마의 본대가 출진한다. 이기면 경험치 150과 보물, 영구 기록. 지면 원정이 끝난다.'};
    case 'tale':return {kind,label:'가상 전장',detail:'역사가 갈라진 세계의 전투. 이름난 적장을 물리치면 승리. 경험치 160과 보물, 가상 기록.'};
    case 'fate':return {kind,label:'운명의 갈림길',detail:''};
  }
}

const avgLevel=(run:Run)=>Math.round(run.party.reduce((n,u)=>n+u.level,0)/Math.max(1,run.party.length));
const recruitLevel=(run:Run)=>Math.max(1,avgLevel(run)-1+(has(run,'elite_recruits')?3:0));

/** 비전투 갈림길을 고르면 곧장 결과가 정해진다(모병·보물은 보상 화면으로). */
export function visitNode(run:Run,node:RunNode){
  run.news=[];
  if(node.kind==='rest'){for(const u of run.party)u.hp=Math.min(1,u.hp+(has(run,'field_medic')?1:.6));run.news.push('의원에서 모든 부대의 체력을 회복했다.');advance(run);return;}
  if(node.kind==='training'){grantXp(run,100);advance(run);return;}
  const r=rngFor(run,run.floor*31+7);
  if(node.kind==='recruit'){
    // 모병소는 장수 위주: 영입할 수 있는 장수 둘(남은 만큼)과 병종 부대 하나.
    const officers=pickDistinct(r,availableOfficers(run),2).map(o=>({kind:'recruit' as const,unitClass:o.unitClass,level:recruitLevel(run),officer:o.name}));
    run.offer=[...officers,...pickDistinct(r,RECRUITS,3-officers.length).map(unitClass=>({kind:'recruit' as const,unitClass,level:recruitLevel(run)}))];run.status='reward';return;}
  if(node.kind==='treasure'){run.offer=relicOffer(run,r);run.status='reward';}
}

function pickDistinct<T>(r:Rng,from:T[],n:number){const pool=[...from],out:T[]=[];while(out.length<n&&pool.length)out.push(pool.splice(r.int(0,pool.length-1),1)[0]!);return out;}
function relicOffer(run:Run,r:Rng):RewardOption[]{const left=RELICS.filter(x=>!run.relics.includes(x.id)).map(x=>x.id);return pickDistinct(r,left,3).map(relic=>({kind:'relic' as const,relic}));}

/** 경험치를 나눠 주고 레벨업·진화를 소식으로 남긴다. */
export function grantXp(run:Run,amount:number,who=run.party){
  const ups:string[]=[];
  for(const u of who){
    u.xp+=amount;let leveled=false;
    while(u.xp>=XP_PER_LEVEL){u.xp-=XP_PER_LEVEL;u.level++;leveled=true;
      const to=evolvedClass(u.unitClass,u.level);
      if(to!==u.unitClass){const from=u.hero?'사마의':u.name;u.unitClass=to;if(!u.hero&&!u.officer)u.name=uniqueName(run,to,u);run.news.push(`진화! ${ga(from)} ${ro(unitName(to))} 거듭났다 (Lv.${u.level})${VARIANTS[to]?.bloom?` · 개화 「${VARIANTS[to]!.bloom!.name}」 ${VARIANTS[to]!.bloom!.description}`:''}`);}
    }
    if(leveled)ups.push(`${u.hero?'사마의':u.name} ${u.level}`);
  }
  if(ups.length)run.news.push(`레벨 상승 · ${ups.join(' · ')}`);
}

/** 전투 결과를 원정에 반영한다. survivors: 살아남은 부대의 체력 비율. */
export function finishBattle(run:Run,node:RunNode,victory:boolean,survivors:Record<string,number>,earned:Record<string,number>={}){
  run.news=[];delete run.active;delete run.activeTale;
  // 쓰러진 부대는 떠나지 않는다: 크게 다쳐(체력 25%) 물러났다가 다음 싸움에 다시 나선다.
  const lost=run.party.filter(u=>survivors[u.id]===undefined);
  if(!victory||!survivors.sima_yi){
    for(const u of lost)if(!u.hero)u.hp=WOUNDED;
    if(spendSecondChance(run))return;
    run.news.push(survivors.sima_yi?`${run.floor}층 전투에서 패했다. 원정은 여기서 끝난다.`:`사마의가 ${run.floor}층에서 쓰러졌다. 원정은 여기서 끝난다.`);run.status='lost';return;}
  for(const u of run.party)u.hp=survivors[u.id]===undefined?WOUNDED:Math.max(.05,survivors[u.id]!);
  if(lost.length)run.news.push(`중상: ${lost.map(u=>u.name).join(', ')} — 물러나 치료받고 체력 25%로 다시 나선다.`);
  if(run.relics.includes('herbs'))for(const u of run.party)u.hp=Math.min(1,u.hp+.2);
  if(node.kind==='boss'){for(const u of run.party)u.hp=1;run.bosses=(run.bosses??0)+1;}
  // 전투 중에 싸워서 번 경험치(공격·격파·책략)에 승리 보너스를 더한다.
  const bonus=completionXp(node.kind);
  for(const u of [...run.party])grantXp(run,bonus+(earned[u.id]??0),[u]);
  if(node.kind==='tale'&&node.tale)run.talesDone=[...new Set([...(run.talesDone??[]),node.tale])];
  if(node.kind==='boss'&&run.floor>=RUN_FLOORS){run.status='won';return;}
  const r=rngFor(run,run.floor*53+11);
  if(node.kind==='elite'||node.kind==='boss'||node.kind==='tale'){run.offer=relicOffer(run,r);if(!run.offer.length)run.offer=[{kind:'xp',amount:80}];}
  else{const pool=availableOfficers(run),o=pool.length?pool[r.int(0,pool.length-1)]!:undefined;
    run.offer=[o?{kind:'recruit',unitClass:o.unitClass,level:recruitLevel(run),officer:o.name}:{kind:'recruit',unitClass:RECRUITS[r.int(0,RECRUITS.length-1)]!,level:recruitLevel(run)},{kind:'heal',amount:.4},relicOffer(run,r)[0]??{kind:'xp',amount:80}];}
  run.status='reward';
}

/** 천명의 가호: 한 번 패배를 견딘다. 사마의는 체력 30%로 살아남고 다음 층으로 물러난다(보상 없음). */
function spendSecondChance(run:Run){
  if(!run.secondChance)return false;
  run.secondChance=false;const hero=run.party.find(u=>u.hero);if(hero)hero.hp=.3;
  run.news.push(`천명의 가호 — ${run.floor}층에서 패했지만 사마의가 살아남아 물러났다. (가호는 원정마다 한 번)`);
  advance(run);return true;
}

/** 연의 전장의 결과. heroHp: 살아남은 사마의의 체력 비율. 본대만 싸우고 부대는 진영을 지킨다. */
export function finishStory(run:Run,stage:string,victory:boolean,heroHp:number,title=stage,heroEarned=0){
  run.news=[];delete run.active;delete run.activeStage;
  if(!victory){if(spendSecondChance(run))return;run.news.push(`연의 전장 「${title}」에서 패했다. 원정은 여기서 끝난다.`);run.status='lost';return;}
  const hero=run.party.find(u=>u.hero);if(hero)hero.hp=Math.max(.05,Math.min(1,heroHp));
  run.chronicle=[...new Set([...(run.chronicle??[]),stage])];run.storyDone=[...new Set([...(run.storyDone??[]),stage])];
  run.news.push(`연의 전장 ${을를(`「${title}」`)} 이겨 천명 기록에 남겼다.`);
  if(run.relics.includes('herbs'))for(const u of run.party)u.hp=Math.min(1,u.hp+.2);
  grantXp(run,100);const hero2=run.party.find(u=>u.hero);if(hero2&&heroEarned>0)grantXp(run,heroEarned,[hero2]);
  const r=rngFor(run,run.floor*71+3);run.offer=relicOffer(run,r);if(!run.offer.length)run.offer=[{kind:'xp',amount:100}];
  run.status='reward';
}

/** 원정이 끝났을 때 얻는 천명: 오른 층 + 우두머리 3 + 연의·가상 전장 2 + 완주 10. */
export function mandateEarned(run:Run){
  const floors=run.status==='won'?RUN_FLOORS:Math.max(0,run.floor-1);
  return floors+3*(run.bosses??0)+2*(run.storyDone?.length??0)+2*(run.talesDone?.length??0)+(run.status==='won'?10:0);
}

export function takeReward(run:Run,i:number){
  const o=run.offer?.[i];if(!o)return;run.news=[];
  if(o.kind==='recruit'){const ok=o.officer?recruitOfficer(run,{name:o.officer,unitClass:o.unitClass},o.level):recruit(run,o.unitClass,o.level);if(!ok)grantXp(run,60);else run.news.push(`${ga(run.party.at(-1)!.name)} 부대에 들어왔다.`);}
  if(o.kind==='heal')for(const u of run.party)u.hp=Math.min(1,u.hp+o.amount);
  if(o.kind==='relic'){run.relics.push(o.relic);run.news.push(`보물 ${을를(`「${RELICS.find(x=>x.id===o.relic)!.name}」`)} 얻었다.`);}
  if(o.kind==='xp')grantXp(run,o.amount);
  delete run.offer;advance(run);
}
export function skipReward(run:Run){delete run.offer;advance(run);}
function advance(run:Run){run.floor++;run.status='map';}

export function describeReward(o:RewardOption){
  switch(o.kind){
    case 'recruit':{const c=evolvedClass(o.unitClass,o.level),r=o.officer?romanceStats(o.officer):'';return {title:o.officer?`장수 영입 · ${o.officer} (${unitName(c)})`:`영입 · ${unitName(c)}`,detail:`Lv.${o.level}${r?` · ${r}`:''} · ${nextEvolutionText(c)}`};}
    case 'heal':return {title:'휴식',detail:`모든 부대 체력 ${Math.round(o.amount*100)}% 회복`};
    case 'relic':{const r=RELICS.find(x=>x.id===o.relic)!;return {title:`보물 · ${r.name}`,detail:r.effect};}
    case 'xp':return {title:'전훈',detail:`모든 부대 경험치 ${o.amount}`};
  }
}
export function nextEvolutionText(cls:UnitClass){const n=nextEvolution(cls);return n?`Lv.${n.level}에 ${ro(unitName(n.to))} 진화${VARIANTS[n.to]?.bloom?` · 「${VARIANTS[n.to]!.bloom!.name}」 개화`:''}`:'최종 단계';}

// ─────────────────────────────────────────────── 전장 생성

/** 원정·가상 전장의 크기(가로×세로 칸). 연의 전장(24×16 이상)과 비슷한 넓이로. */
export const RUN_MAP_W=34,RUN_MAP_H=24;
const W=RUN_MAP_W,H=RUN_MAP_H;
/** 원정 전장: 지역마다 다른 지형, 좌측 출진 칸과 우측 적진. 모든 칸에 보병이 닿도록 보장한다. */
export function runMap(run:{seed:number;route?:Run['route']},floor:number,kind:NodeKind):MapFile{
  const r=rngFor(run,floor*977+kind.length),region=regionFor(run,floor).terrain;
  const g=Array.from({length:H},()=>Array<string>(W).fill('.'));
  const blob=(ch:string,n:number,size:number,x0=3,x1=W-4)=>{for(let k=0;k<n;k++){const cx=r.int(x0,x1),cy=r.int(1,H-2);for(let i=0;i<size;i++){const x=cx+r.int(-1,1),y=cy+r.int(-1,1);if(x>=2&&x<W-2&&y>=0&&y<H)g[y]![x]=ch;}}};
  blob('f',region===0?14:10,6);blob('h',region===1?12:6,5);
  if(region===1)blob('^',7,5,5,W-7);
  if(region===2){const rx=r.int(13,19);for(let y=0;y<H;y++){g[y]![rx]='~';g[y]![rx+1]='~';}for(const fy of [r.int(1,6),r.int(8,15),r.int(17,H-2)]){g[fy]![rx]='_';g[fy]![rx+1]='_';}blob('m',6,5);}
  const road=r.int(3,H-4);for(let x=0;x<W;x++)if(g[road]![x]==='.'||g[road]![x]==='f'||g[road]![x]==='h')g[road]![x]=',';
  // Keep both camps clear.
  for(let y=0;y<H;y++)for(const x of [0,1,2,3,4,W-6,W-5,W-4,W-3,W-2,W-1])if(!'~_'.includes(g[y]![x]!))g[y]![x]=y===road?',':'.';
  const cells=(xs:number[],ys:number[])=>ys.flatMap(y=>xs.map(x=>({x,y})));
  const mid=Math.floor(H/2);
  return {id:`run-${floor}-${kind}`,name:regionFor(run,floor).name,legend:{'.':'plain',',':'road',f:'forest',h:'hill','^':'mountain','~':'water','_':'ford',m:'marsh'},
    rows:g.map(row=>row.join('')),regions:{player_start:cells([0,1],[mid-2,mid-1,mid,mid+1]),enemy_camp:cells([W-6,W-5,W-4,W-3,W-2],Array.from({length:H-6},(_,i)=>i+3)),objective:cells([W-1],[mid])}};
}

/** 원정 전투의 스테이지. 적은 층·지역·종류로 정해지고, 레벨이 높으면 그들도 진화해 있다. */
/** 원정·가상 전장은 뭍의 싸움이다: 배(수군)는 뭍에서 움직이지 못하니 노병으로 싸운다. */
export const landClass=(c:UnitClass):UnitClass=>familyOf(c)==='navy'?'crossbow':c;
/** 시나리오 모드의 대사 선택이 전투에 남기는 것(scenario-types.ts의 ChoiceEffect). */
export interface BattleMods {reinforce?:Array<{name:string;unitClass:UnitClass;side:'npc'|'ally'}>;scout?:boolean;ambush?:boolean;bold?:boolean;rally?:boolean;guard?:boolean;insight?:boolean}
/** 우두머리 전의 호위 수·우두머리 레벨 차(규칙 7판에서 100% 깨지던 것을 85~90%로). */
export const BOSS_TUNE={escort:3,lag:0,guard:30};
const BOSS_ESCORT_OF=()=>BOSS_TUNE.escort,BOSS_LAG_OF=()=>BOSS_TUNE.lag;
export function runStage(run:Run,kind:NodeKind,map:MapFile,taleId?:string,opts:{mods?:BattleMods;enemyBase?:number}={}):StageDef{
  const f=run.floor,r=rngFor(run,f*613+kind.length),region=regionFor(run,f),tale=kind==='tale'?taleById(taleId):undefined,mods=opts.mods??{};
  const base=opts.enemyBase??2+Math.round(f*1.05)+(f>FLOORS_PER_ACT*2&&kind!=='tale'?1:0)+(kind==='boss'?1:0);
  // 넓은 전장에는 적도 조금 더 많다. 우두머리 전은 호위를 예전 수준으로(우두머리 자체가 강하다).
  // 동료를 잃어 넷 이하로 나선 부대에는 적도 한 부대 적게.
  const count=Math.max(1,Math.min(12,(kind==='boss'?BOSS_ESCORT_OF()+Math.floor(f/4.5):4+Math.floor(f/5)+(kind==='elite'?1:kind==='tale'?-1:0))+(mods.bold?1:0)-(mods.scout?1:0)-(run.party.length<=4?1:0)));
  const camp=(map.regions!.enemy_camp as Array<{x:number;y:number}>).slice();
  const enemies:UnitSpawnSpec[]=[];
  for(let i=0;i<count&&camp.length;i++){
    const at=camp.splice(r.int(0,camp.length-1),1)[0]!,cls=region.pool[r.int(0,region.pool.length-1)]!,level=base+r.int(-1,1)-(kind==='boss'?2:0);
    const elite=(kind==='elite'&&i<2)||(!!mods.bold&&i===0);const evolved=evolvedClass(cls,elite?level+5:level);
    enemies.push({id:`foe_${i}`,name:unitName(evolved),template:evolved,level,at,behavior:i%3===2?'hold':'advance'});
  }
  if(kind==='boss'){const b=region.boss,mid=Math.floor(H/2),bi=camp.reduce((best,c,i)=>Math.abs(c.y-mid)*2+(W-1-c.x)<Math.abs(camp[best]!.y-mid)*2+(W-1-camp[best]!.x)?i:best,0),at=camp.splice(bi,1)[0]??{x:W-1,y:mid};enemies.push({id:'boss',name:b.name,template:evolvedClass(landClass(b.unitClass),base+3),level:base-BOSS_LAG_OF(),...(BOSS_TUNE.guard?{traits:['physicalDamageReduction','strategyDamageReduction'],traitParams:{physicalDamageReduction:BOSS_TUNE.guard,strategyDamageReduction:BOSS_TUNE.guard}}:{}),at,behavior:'hold'});}
  if(tale){const mid=Math.floor(H/2),bi=camp.reduce((best,c,i)=>Math.abs(c.y-mid)*2+(W-1-c.x)<Math.abs(camp[best]!.y-mid)*2+(W-1-camp[best]!.x)?i:best,0),at=camp.splice(bi,1)[0]??{x:W-1,y:mid};// 연의의 맹장은 능력치로 이미 강하다: 무력 75를 넘는 8마다 레벨을 하나 낮춰 균형을 맞춘다.
    const war=romanceOf({id:'target',name:tale.target.name})?.war??70,level=Math.max(1,base-1-Math.max(0,Math.round((war-75)/8)));
    enemies.push({id:'target',name:tale.target.name,template:evolvedClass(landClass(tale.target.unitClass),level),level,at,behavior:'hold'});}
  const party:UnitSpawnSpec[]=run.party.filter(u=>!u.hero).map(u=>({id:u.id,name:u.name,template:u.unitClass,level:u.level,region:'party_start',behavior:'advance'}));
  // 대사 선택으로 합류한 지원군: 'ally'는 직접 지휘하는 편입 아군, 'npc'는 초록 깃발의 자동 우군.
  const hero=run.party.find(u=>u.hero)?.level??base,helpers=(mods.reinforce??[]).slice(0,4);
  const help=(side:'npc'|'ally')=>helpers.map((h,i)=>({h,i})).filter(x=>x.h.side===side).map(({h,i})=>({id:`aid_${i}`,name:h.name,template:evolvedClass(landClass(h.unitClass),Math.max(1,hero-1)),level:Math.max(1,hero-1),region:'aid_start',behavior:'advance' as const}));
  return {id:`R-${String(f).padStart(2,'0')}`,arc:'lower',order:100+f,title:tale?`가상 전장 · ${tale.title}`:`${region.name} · ${f}층`,subtitle:kind==='boss'?`우두머리 ${region.boss.name}`:tale?`적장 ${tale.target.name}`:kind==='elite'?'정예 전투':'원정 전투',
    synopsis:kind==='boss'?`${eul(region.boss.name)} 격퇴하면 승리. 쓰러진 부대는 원정에서 사라진다.`:tale?`${eul(tale.target.name)} 물리치면 승리. ${tale.intro}`:'적을 모두 물리치면 승리. 쓰러진 부대는 원정에서 사라진다.',
    mapId:map.id,deployment:{forced:['sima_yi'],slots:0,grantedUnits:[]},
    victory:kind==='boss'?[{type:'retreat',unit:'boss'}]:tale?[{type:'retreat',unit:'target'}]:[{type:'annihilate',side:'enemy'}],
    defeat:[{type:'retreat',unit:'sima_yi'}],
    seals:[{slot:1,normal:'clear',extreme:'clear'},{slot:2,normal:'clear',extreme:'clear'},{slot:3,normal:'clear',extreme:'clear'}],
    difficulty:{normal:{minEnemyLevel:base,recommendedLevel:base},extreme:{minEnemyLevel:base+2,recommendedLevel:base+2}},
    gimmicks:[],perf:{maxSimultaneousUnits:32,tier:'B'},
    events:[{id:'run/start',trigger:{type:'battle_start'},actions:[
      ...(party.length?[{type:'spawn_units' as const,side:'player' as const,units:party}]:[]),
      ...(help('ally').length?[{type:'spawn_units' as const,side:'ally' as const,units:help('ally')}]:[]),
      ...(help('npc').length?[{type:'spawn_units' as const,side:'allyAi' as const,units:help('npc')}]:[]),
      {type:'spawn_units',side:'enemy',units:enemies}]}]} as StageDef;
}

/** 원정 전투에서 아군 부대가 서는 칸: 사마의 자리를 뺀 출진 칸과 그 옆 열. */
export function partyStart(map:MapFile){return [...(map.regions!.player_start as Array<{x:number;y:number}>).slice(1),...[0,1,2,3].map(d=>({x:2,y:Math.floor(H/2)-2+d}))];}

export function runBattle(run:Run,kind:NodeKind,taleId?:string,opts:{mods?:BattleMods;enemyBase?:number}={}){
  const map=runMap(run,run.floor,kind);
  (map.regions as Record<string,Array<{x:number;y:number}>>).party_start=partyStart(map);
  // 지원군이 서는 칸: 출진 칸 바로 앞(세 번째·네 번째 열).
  (map.regions as Record<string,Array<{x:number;y:number}>>).aid_start=[3,4].flatMap(x=>[0,1,2,3].map(d=>({x,y:Math.floor(H/2)-2+d})));
  return {map,stage:runStage(run,kind,map,taleId,opts)};
}

/** 병종이 책략을 쓰는지 (원정 부대의 책략 목록을 정할 때). */
export const casts=(cls:UnitClass)=>profileOf(cls).canUseStrategy;

/** 세션이 저장하는 원정 전투의 원본: 이것만 있으면 같은 전장을 다시 만든다(저장·무르기 재생). */
export interface RunBattleRef {seed:number;floor:number;kind:NodeKind;party:RunUnit[];relics:string[];route?:Run['route'];tale?:string;
  /** 시나리오 모드: 대사 선택의 효과와 적 레벨 기준(부대 레벨에 맞춘다), 장 id */
  mods?:BattleMods;enemyBase?:number;scenario?:string}
export const battleRef=(run:Run,kind:NodeKind,tale?:string):RunBattleRef=>({seed:run.seed,floor:run.floor,kind,party:structuredClone(run.party),relics:[...run.relics],...(run.route?{route:{...run.route}}:{}),...(tale?{tale}:{})});
export function refBattle(ref:RunBattleRef){
  const run:Run={version:1,seed:ref.seed,floor:ref.floor,party:ref.party,relics:ref.relics,fallen:[],status:'map',nextId:0,news:[],...(ref.route?{route:ref.route}:{})};
  return runBattle(run,ref.kind,ref.tale,{...(ref.mods?{mods:ref.mods}:{}),...(ref.enemyBase!==undefined?{enemyBase:ref.enemyBase}:{})});
}

/** 전투 시작 직후: 원정 부대의 체력·병종·책략, 보물 효과를 전장에 반영한다. */
export function prepareRunBattle(state:BattleState,ref:RunBattleRef){
  for(const ru of ref.party){
    const u=state.find(ru.id);if(!u)continue;
    if(u.unitClass!==ru.unitClass)evolveUnit(u,ru.unitClass);
    if(ru.hero){(u as {name:string}).name='사마의';}
    u.hp=Math.max(1,Math.round(u.stats.maxHp*ru.hp));
    u.strategies=ru.hero&&casts(u.unitClass)?availableStrategies(u.level,true,undefined):troopStrategies(u.unitClass,u.level)??[];
    u.canUseItems=true;
  }
  // 진화 책사·적 술사가 쓰는 책략을 전장 책략표에 올린다.
  for(const u of state.living())for(const id of u.strategies){const d=allStrategies.find(x=>x.id===id);if(d&&!state.strategies.has(id))state.strategies.set(id,d);}
  applyRelics(state,ref.relics);
  if(ref.mods)applyBattleMods(state,ref.mods);
}
/** 대사 선택의 효과: 사기(2턴) · 방어 태세(1턴) · 사마의 책략 MP +15 · 기습(적 체력 80%). 연의 장과 가상 전장 공통. */
export function applyBattleMods(state:BattleState,m:BattleMods){
  for(const u of state.living('player')){if(m.rally)state.applyStatus(u,{kind:'rally',turns:2,magnitude:1});if(m.guard)state.applyStatus(u,{kind:'guard',turns:1,magnitude:1});}
  if(m.insight){const h=state.find('sima_yi');if(h){h.stats.maxMp+=15;h.mp+=15;}}
  if(m.ambush)for(const e of state.living('enemy'))e.hp=Math.max(1,Math.round(e.stats.maxHp*.8));
}

/** 연의 전장에 회차에서 영입한 장수를 사마의 곁 빈 칸에 세운다(연의 장수록 능력은 이름으로 따라온다). */
/** 출진 장수 id → 이름(연의 전장이 직접 세우는 장수). */
const STAGE_OFFICER_NAMES:Record<string,string>={sima_yi:'사마의',sima_lang:'사마랑',sima_fang:'사마방',cao_zhen:'조진'};
/** 연의 전장이 스스로 세우는 이름 있는 장수들(출진 필수 장수 + 사건으로 나오는 장수). 같은 사람을 영입 장수로 또 세우지 않는다. */
export function stageOfficerNames(stage:StageDef):Set<string>{
  const names=new Set<string>((stage.deployment.forced??[]).map(id=>STAGE_OFFICER_NAMES[id]??id));
  for(const ev of stage.events??[])for(const a of ev.actions)if(a.type==='spawn_units')for(const u of a.units??[])if(u.name)names.add(u.name);
  return names;
}
export function addRecruits(state:BattleState,recruits:RunUnit[]){
  const hero=state.find('sima_yi');if(!hero)return;
  // 같은 장수가 둘 서지 않게: 이미 전장에 있거나 이 전장이 나중에 세우는 이름은 건너뛴다(예: 연의 장의 사마랑·조진).
  const taken=new Set([...state.units.values()].map(u=>u.name));for(const n of stageOfficerNames(state.stage))taken.add(n);
  recruits=recruits.filter(r=>!taken.has(r.name));
  const open=['plain','road','fort','forest','hill','grass','bridge'];
  const cells:Array<{x:number;y:number}>=[];for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++)cells.push({x,y});
  const free=cells.filter(p=>!state.unitAt(p)&&open.includes(state.map.tileAt(p).terrain)).sort((a,b)=>(Math.abs(a.x-hero.pos.x)+Math.abs(a.y-hero.pos.y))-(Math.abs(b.x-hero.pos.x)+Math.abs(b.y-hero.pos.y)));
  recruits.forEach((r,i)=>{const pos=free[i];if(!pos||state.find(r.id))return;
    const u=makeUnit({id:r.id,name:r.name,side:'player',unitClass:landClass(r.unitClass),level:r.level,pos});u.hp=Math.max(1,Math.round(u.stats.maxHp*r.hp));u.canUseItems=true;
    u.strategies=troopStrategies(u.unitClass,u.level)??[];
    for(const id of u.strategies){const d=allStrategies.find(x=>x.id===id);if(d&&!state.strategies.has(id))state.strategies.set(id,d);}
    state.add(u);});
}
/** 보물 효과를 아군 전원에 입힌다(원정 전투·연의 전장 공통). */
export function applyRelics(state:BattleState,relics:string[]){
  const has=(id:string)=>relics.includes(id);
  for(const u of [...state.living('player')]){
    const fam=familyOf(u.unitClass);
    if(has('whetstone'))u.stats.attack+=3;
    if(has('lamellar'))u.stats.defense+=3;
    if(has('warhorse')&&['cavalry','heavyCav','horseArcher'].includes(fam))u.stats.movement+=1;
    if(has('drum')&&['infantry','spearman','bandit'].includes(fam))u.stats.movement+=1;
    if(has('quiver')&&['archer','crossbow','horseArcher'].includes(fam))u.stats.attack+=5;
    if(has('sunzi')){u.stats.maxMp+=12;u.mp+=12;u.stats.intellect+=3;}
    if(has('banner'))state.applyStatus(u,{kind:'rally',turns:2,magnitude:1});
    if(has('bawangJi')&&['infantry','cavalry','heavyCav','spearman'].includes(fam))u.stats.attack+=5;
    if(has('huangshi')){u.stats.maxMp+=8;u.mp+=8;u.stats.intellect+=5;}
    if(has('xiaoheLedger')){u.stats.maxHp+=12;u.hp+=12;}
    if(has('yuJade'))u.stats.agility+=5;
  }
}

/** 연의 전장의 원본: 세션이 저장하고 불러올 때 쓴다. */
export interface RunStoryRef {seed:number;floor:number;stage:string;heroLevel:number;heroHp:number;relics:string[];/** 원정에서 쌓인 사마의의 경험치(다음 레벨까지) */heroXp?:number}

/** 전투가 끝난 뒤 원정에 넘길 생존자 체력 비율. */
export function survivorsOf(state:BattleState,ref:RunBattleRef){
  const out:Record<string,number>={};
  for(const ru of ref.party){const u=state.find(ru.id);if(u?.alive)out[ru.id]=Math.max(.05,u.hp/u.stats.maxHp);}
  return out;
}

// ─────────────────────────────────────────────── 전투 경험치

/** 이긴 전투의 승리 보너스(살아남은 모든 부대). 나머지는 싸워서 번다(xpFromLog). */
export function completionXp(kind:NodeKind){return kind==='boss'?90:kind==='elite'?70:kind==='tale'?70:50;}
export interface XpGain {unit:string;amount:number;kills:number}
const KILL_XP=20;
/**
 * 전투 기록 한 묶음에서 아군 부대가 버는 경험치(조조전처럼 행동마다).
 * 공격 명중 10(상대가 높은 레벨이면 더, 낮으면 덜, 최소 5) · 빗나감 2 · 반격 명중 6 ·
 * 책략 명중 대상마다 8(최대 24) · 회복·지원 대상마다 8(최대 16) · 적을 물리치면 하나마다 +20(우두머리·적장 +40).
 */
export function xpFromLog(entries:LogEntry[],mine:(id:string)=>boolean,levelOf:(id:string)=>number):Array<{entry:LogEntry;gain:XpGain}>{
  const out:Array<{entry:LogEntry;gain:XpGain}>=[];
  const action=(e:LogEntry)=>e.t==='attack'||e.t==='counter'||e.t==='strategy'||e.t==='move'||e.t==='turnStart';
  const retreated=(i:number,ids:string[],back:boolean)=>{const got=new Set<string>();
    for(let j=back?i-1:i+1;j>=0&&j<entries.length;j+=back?-1:1){const e=entries[j]!;if(action(e))break;if(e.t==='retreat'&&ids.includes(e.unit))got.add(e.unit);}
    return [...got];};
  const killXp=(ids:string[])=>ids.reduce((n,id)=>n+(id==='boss'||id==='target'?KILL_XP*2:KILL_XP),0);
  const diff=(me:string,them:string)=>levelOf(them)-levelOf(me);
  entries.forEach((e,i)=>{
    if(e.t==='attack'&&mine(e.attacker)){const k=e.hit?retreated(i,[e.defender],false):[];
      out.push({entry:e,gain:{unit:e.attacker,amount:(e.hit?Math.max(5,Math.min(20,10+diff(e.attacker,e.defender)*2)):2)+killXp(k),kills:k.length}});}
    else if(e.t==='counter'&&mine(e.attacker)&&e.hit){const k=retreated(i,[e.defender],false);
      out.push({entry:e,gain:{unit:e.attacker,amount:Math.max(3,Math.min(12,6+diff(e.attacker,e.defender)))+killXp(k),kills:k.length}});}
    else if(e.t==='strategy'&&mine(e.caster)){
      const foes=e.targets.filter((id,j)=>!mine(id)&&(e.damage[j]??0)>0),help=e.targets.filter(id=>mine(id)||id==='sima_yi');
      const k=retreated(i,e.targets.filter(id=>!mine(id)),true);
      const base=foes.length?Math.min(24,foes.reduce((n,id)=>n+Math.max(5,Math.min(14,8+diff(e.caster,id)*2)),0)):help.length?Math.min(16,8*help.length):3;
      out.push({entry:e,gain:{unit:e.caster,amount:base+killXp(k),kills:k.length}});}
  });
  return out;
}
/** 전투 중 레벨업: 같은 병종의 성장분만큼 능력치를 올리고, 늘어난 체력·책략만큼 채운다. */
export function levelUpInBattle(u:Unit,to:number){
  if(to<=u.level)return;
  const s=u.stats,a=statsFor(u.unitClass,u.level),b=statsFor(u.unitClass,to);
  // 조조전 규칙 부대는 등급·장수 능력으로 정한 상승치만큼 오른다.
  const d=u.ccRules?ccLevelDelta(u,u.level,to):{maxHp:b.maxHp-a.maxHp,maxMp:b.maxMp-a.maxMp,attack:b.attack-a.attack,defense:b.defense-a.defense,intellect:b.intellect-a.intellect,spirit:b.spirit-a.spirit,agility:b.agility-a.agility,morale:0};
  for(const k of ['maxHp','maxMp','attack','defense','intellect','spirit','agility','morale'] as const)s[k]+=d[k];
  u.hp=Math.min(s.maxHp,u.hp+d.maxHp);u.mp=Math.min(s.maxMp,u.mp+d.maxMp);u.level=to;
}
