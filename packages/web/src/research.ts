/**
 * 연구 — 회차를 넘어 남는 영구 강화(로그라이크의 메타 진행).
 *
 * 전투·내정·편성 세 갈래의 나무. 칸마다 단계(랭크)가 있고 천명으로 한 단계씩 올린다.
 * 앞 칸을 배워야 다음 칸이 열리고(선행), 어떤 칸은 회차를 거듭해야만 열린다(조건: 회차 수·이긴 연의 전장·본 결말).
 * 그래서 처음엔 몇 칸만 보이고, 여러 번 죽고 다시 걸을수록 나무가 서서히 열린다.
 *
 * 전투 칸은 아군 전원(또는 사마의)에게 특성을 입히고(perks.ts), 내정·편성 칸은 원정의 규칙 수치를 바꾼다.
 */
import type {MetaState} from './meta.ts';
import type {PerkGrant,PerkGrants} from './perks.ts';

export type ResearchTab='battle'|'domestic'|'formation'|'legend'|'drill'|'corps'|'arms'|'mind';
export const RESEARCH_TABS:Array<{id:ResearchTab;name:string;blurb:string}>=[
  {id:'battle',name:'전투',blurb:'전투에서 쓰이는 기술을 연구한다. 아군 전원에게 적용된다.'},
  {id:'domestic',name:'내정',blurb:'군영을 다스려 경험치·회복·천명을 늘린다.'},
  {id:'formation',name:'편성',blurb:'부대를 짜는 법을 연구한다. 장수 효과 칸과 사마의를 강하게 한다.'},
  {id:'legend',name:'고사',blurb:'사백 년 전 초한 영웅들의 고사에서 배운다. 여러 생을 거쳐야 열린다.'},
  {id:'drill',name:'단련',blurb:'아군 전원의 체력·공격·방어·지력·정신·순발·MP를 한 단계에 조금씩 늘린다. 열 단계까지.'},
  {id:'corps',name:'군단',blurb:'보병·창병·기병·중기병·경보병·무승을 계열마다 따로 단련한다. 조련 → 갑주 → 특기 순으로 열린다.'},
  {id:'arms',name:'사수·공성',blurb:'궁병·노병·궁기병과 공성·수군 부대를 계열마다 따로 단련한다.'},
  {id:'mind',name:'책사·술사',blurb:'책사·풍수사·술사 계열을 단련하고, 책략 진화를 앞당기고 MP를 아끼는 법을 익힌다.'},
];
export interface Gate {runs?:number;chronicle?:number;endings?:number;wins?:number;officerLv?:number}
export interface ResearchNode {
  id:string;tab:ResearchTab;name:string;glyph:string;
  /** 나무 그림의 자리(열·행) */
  col:number;row:number;
  max:number;
  /** 다음 단계 비용(지금 단계 r → r+1) */
  cost:(r:number)=>number;
  requires?:Array<[string,number]>;
  gate?:Gate;
  /** r단계일 때의 효과 설명 */
  effect:(r:number)=>string;
  /** 전투 특성: 아군 전원(또는 사마의만, 또는 그 계열 병종만)에게 단계당 n */
  perk?:{trait:string;per:number;hero?:true;families?:readonly string[]};
  /** 강화 구간: [이 단계부터, 조건] — 그 단계를 넘어 올리려면 조건이 필요하다(예: 6단계부터 연의 3승, 9단계부터 회차 3번) */
  rankGates?:ReadonlyArray<readonly [number,Gate]>;
}
const c=(base:number,step:number)=>(r:number)=>base+step*r;
export const RESEARCH:ResearchNode[]=[
  // ── 전투 ──
  {id:'drill',tab:'battle',name:'조련',glyph:'조',col:0,row:1,max:3,cost:c(2,1),effect:r=>`물리 공격 피해 +${r*3}%`,perk:{trait:'physicalPower',per:3}},
  {id:'archery',tab:'battle',name:'궁술',glyph:'궁',col:1,row:0,max:2,cost:c(3,1),requires:[['drill',1]],effect:r=>`두 칸 이상 물리 공격 +${r*5}%`,perk:{trait:'rangedPower',per:5}},
  {id:'aim',tab:'battle',name:'정조',glyph:'정',col:2,row:0,max:3,cost:c(3,1),requires:[['archery',1]],effect:r=>`명중 +${r*4}%p`,perk:{trait:'accuracyBoost',per:4}},
  {id:'volley',tab:'battle',name:'일제사격',glyph:'일',col:3,row:0,max:2,cost:c(5,2),requires:[['aim',2]],gate:{chronicle:5},effect:r=>`두 칸 이상 물리 공격 +${r*5}%`,perk:{trait:'rangedPower',per:5}},
  {id:'blade',tab:'battle',name:'연마',glyph:'연',col:1,row:1,max:2,cost:c(3,1),requires:[['drill',1]],effect:r=>`회심 확률 +${r*4}%`,perk:{trait:'critical',per:4}},
  {id:'pierce',tab:'battle',name:'파갑술',glyph:'파',col:2,row:1,max:3,cost:c(4,1),requires:[['blade',1]],gate:{chronicle:2},effect:r=>`적 방어 ${r*6}% 무시`,perk:{trait:'penetrate',per:6}},
  {id:'vanguard',tab:'battle',name:'선봉',glyph:'선',col:3,row:1,max:2,cost:c(5,2),requires:[['pierce',1]],gate:{runs:2},effect:r=>`움직인 뒤 물리 공격 +${r*6}%`,perk:{trait:'chargePower',per:6}},
  {id:'unrivaled',tab:'battle',name:'무쌍',glyph:'무',col:4,row:1,max:1,cost:c(12,0),requires:[['vanguard',2]],gate:{endings:1},effect:r=>`물리 공격 피해 +${r*8}%`,perk:{trait:'physicalPower',per:8}},
  {id:'stratagem',tab:'battle',name:'병법',glyph:'병',col:1,row:2,max:3,cost:c(3,1),requires:[['drill',1]],effect:r=>`책략 공격 피해 +${r*4}%`,perk:{trait:'strategyPower',per:4}},
  {id:'insight',tab:'battle',name:'간파',glyph:'간',col:2,row:2,max:2,cost:c(4,1),requires:[['stratagem',1]],effect:r=>`적 책략 명중 -${r*5}%p`,perk:{trait:'strategyEvasion',per:5}},
  {id:'arcana',tab:'battle',name:'비전',glyph:'비',col:3,row:2,max:2,cost:c(5,2),requires:[['insight',1]],gate:{runs:3},effect:r=>`책략 공격 피해 +${r*5}%`,perk:{trait:'strategyPower',per:5}},
  {id:'calm',tab:'battle',name:'정심',glyph:'정',col:4,row:2,max:3,cost:c(5,1),requires:[['arcana',1]],gate:{chronicle:8},effect:r=>`차례 시작에 MP +${r}`,perk:{trait:'manaRegen',per:1}},
  {id:'armor',tab:'battle',name:'갑주',glyph:'갑',col:0,row:3,max:3,cost:c(2,1),effect:r=>`받는 물리 피해 -${r*3}%`,perk:{trait:'physicalDamageReduction',per:3}},
  {id:'ward',tab:'battle',name:'정신 수양',glyph:'정',col:1,row:3,max:3,cost:c(3,1),requires:[['armor',1]],effect:r=>`받는 책략 피해 -${r*4}%`,perk:{trait:'strategyDamageReduction',per:4}},
  {id:'seasoned',tab:'battle',name:'노련',glyph:'노',col:2,row:3,max:2,cost:c(4,1),requires:[['ward',1]],gate:{runs:2},effect:r=>`체력 절반 이하에서 받는 피해 -${r*8}%`,perk:{trait:'veteran',per:8}},
  {id:'camp',tab:'battle',name:'재정비',glyph:'재',col:3,row:3,max:2,cost:c(5,2),requires:[['seasoned',1]],gate:{chronicle:6},effect:r=>`차례 시작에 체력 ${r*3}% 회복`,perk:{trait:'regen',per:3}},
  {id:'ironwall',tab:'battle',name:'철벽',glyph:'철',col:4,row:3,max:1,cost:c(12,0),requires:[['camp',1]],gate:{endings:1},effect:r=>`받는 모든 피해 -${r*5}%`,perk:{trait:'defenseBoost',per:5}},
  // ── 내정 ──
  {id:'training',tab:'domestic',name:'훈련장',glyph:'훈',col:0,row:0,max:3,cost:c(2,1),effect:r=>`전투 경험치 +${r*10}%`},
  {id:'academy',tab:'domestic',name:'강무당',glyph:'강',col:1,row:0,max:2,cost:c(5,2),requires:[['training',2]],gate:{runs:3},effect:r=>`전투 경험치 +${r*10}%`},
  {id:'medic',tab:'domestic',name:'의원',glyph:'의',col:0,row:1,max:2,cost:c(2,1),effect:r=>`휴식 회복량 +${r*15}%`},
  {id:'herbal',tab:'domestic',name:'약초원',glyph:'약',col:1,row:1,max:2,cost:c(4,1),requires:[['medic',1]],gate:{chronicle:3},effect:r=>`회복 책략의 회복량 +${r*10}%`,perk:{trait:'healPower',per:10}},
  {id:'granary',tab:'domestic',name:'군량',glyph:'군',col:0,row:2,max:3,cost:c(3,2),gate:{runs:1},effect:r=>`회차가 끝날 때 천명 +${r}`},
  {id:'tribute',tab:'domestic',name:'공물',glyph:'공',col:1,row:2,max:1,cost:c(10,0),requires:[['granary',2]],gate:{endings:1},effect:r=>`회차가 끝날 때 천명 +${r*2}`},
  {id:'archive',tab:'domestic',name:'서고',glyph:'서',col:2,row:0,max:2,cost:c(5,1),requires:[['academy',1]],gate:{chronicle:10},effect:r=>`책략 공격 피해 +${r*3}%`,perk:{trait:'strategyPower',per:3}},
  // ── 편성 ──
  {id:'temper',tab:'formation',name:'단련',glyph:'단',col:0,row:0,max:3,cost:c(3,2),effect:r=>`새 회차의 사마의 Lv +${r}`},
  {id:'elite',tab:'formation',name:'정예 모병',glyph:'정',col:1,row:0,max:3,cost:c(3,1),requires:[['temper',1]],effect:r=>`영입·귀순 장수 Lv +${r}`},
  {id:'guard',tab:'formation',name:'호신',glyph:'호',col:0,row:1,max:3,cost:c(2,1),effect:r=>`사마의가 받는 모든 피해 -${r*4}%`,perk:{trait:'defenseBoost',per:4,hero:true}},
  {id:'drillForm',tab:'formation',name:'진형 훈련',glyph:'진',col:1,row:1,max:3,cost:c(3,1),requires:[['guard',1]],gate:{runs:1},effect:r=>`적 명중 -${r*3}%p`,perk:{trait:'evasionBoost',per:3}},
  {id:'slot',tab:'formation',name:'장수 효과 칸',glyph:'장',col:2,row:1,max:1,cost:c(8,0),requires:[['drillForm',1]],gate:{officerLv:10},effect:r=>`장수 효과 장착 칸 +${r}`},
  {id:'slot2',tab:'formation',name:'명장의 그릇',glyph:'명',col:3,row:1,max:1,cost:c(14,0),requires:[['slot',1]],gate:{endings:1},effect:r=>`장수 효과 장착 칸 +${r}`},
  // ── 고사(초한) ──
  {id:'jiangdong',tab:'legend',name:'강동 팔천',glyph:'강',col:0,row:0,max:2,cost:c(6,2),gate:{runs:3},effect:r=>`물리 공격 피해 +${r*4}%`,perk:{trait:'physicalPower',per:4}},
  {id:'burnboats',tab:'legend',name:'파부침주',glyph:'파',col:1,row:0,max:2,cost:c(7,2),requires:[['jiangdong',1]],effect:r=>`체력이 낮을수록 공격력 상승(최대 +${r*10}%)`,perk:{trait:'lastStand',per:10}},
  {id:'hongmenLore',tab:'legend',name:'홍문의 칼',glyph:'홍',col:2,row:0,max:2,cost:c(8,3),requires:[['burnboats',1]],gate:{endings:1},effect:r=>`회심 확률 +${r*5}%`,perk:{trait:'critical',per:5}},
  {id:'tactics',tab:'legend',name:'운주유악',glyph:'운',col:0,row:1,max:2,cost:c(6,2),gate:{runs:4},effect:r=>`책략 공격 피해 +${r*5}%`,perk:{trait:'strategyPower',per:5}},
  {id:'fourSongsLore',tab:'legend',name:'사면초가',glyph:'사',col:1,row:1,max:2,cost:c(8,2),requires:[['tactics',1]],gate:{endings:2},effect:r=>`적 명중 -${r*4}%p`,perk:{trait:'evasionBoost',per:4}},
  {id:'backwaterLore',tab:'legend',name:'배수진',glyph:'배',col:0,row:2,max:2,cost:c(6,2),gate:{chronicle:4},effect:r=>`체력 절반 이하에서 받는 피해 -${r*8}%`,perk:{trait:'veteran',per:8}},
  {id:'ledger',tab:'legend',name:'소하의 장부',glyph:'소',col:1,row:2,max:2,cost:c(8,3),requires:[['backwaterLore',1]],gate:{runs:5},effect:r=>`회차가 끝날 때 천명 +${r}`},
  {id:'unify',tab:'legend',name:'천하 통일',glyph:'천',col:3,row:1,max:1,cost:c(20,0),requires:[['hongmenLore',1],['fourSongsLore',1],['ledger',1]],gate:{wins:1},effect:r=>`받는 모든 피해 -${r*5}% · 물리·책략 피해 +${r*5}%`,perk:{trait:'defenseBoost',per:5}},
];
// ─────────────────────────────────────────────── 잘게 쪼갠 10단계 연구(v42)
/** 1~5단계 기본, 6~8단계 숙련(연의 전장 3승), 9~10단계 극의(천명의 길 3회차) */
export const DEEP_GATES:ReadonlyArray<readonly [number,Gate]>=[[5,{chronicle:3}],[8,{runs:3}]];
const fine=(r:number)=>1+r+Math.floor(r/5)*2;
const pct=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
function deep(id:string,tab:ResearchTab,name:string,col:number,row:number,trait:string,per:number,text:(v:string)=>string,o:{families?:readonly string[];max?:number;requires?:Array<[string,number]>}={}):ResearchNode{
  return {id,tab,name,glyph:name[0]!,col,row,max:o.max??10,cost:fine,...(o.requires?{requires:o.requires}:{}),rankGates:DEEP_GATES,
    effect:r=>text(pct(per*r)),perk:{trait,per,...(o.families?{families:o.families}:{})}};
}
const STAT_NODES:Array<[string,string,string,number,(v:string)=>string]>=[
  ['s_hp','체력 단련','stat:maxHp',2,v=>`아군 전원 최대 체력 +${v}%`],['s_atk','근력 단련','stat:attack',1.5,v=>`아군 전원 공격 +${v}%`],
  ['s_def','방호 단련','stat:defense',1.5,v=>`아군 전원 방어 +${v}%`],['s_agi','몸놀림 단련','stat:agility',1.5,v=>`아군 전원 순발 +${v}%`],
  ['s_int','학문','stat:intellect',1.5,v=>`아군 전원 지력 +${v}%`],['s_spi','심지','stat:spirit',1.5,v=>`아군 전원 정신 +${v}%`],['s_mp','책략 수련','stat:maxMp',3,v=>`아군 전원 최대 MP +${v}%`],
];
STAT_NODES.forEach(([id,name,trait,per,text],i)=>RESEARCH.push(deep(id,'drill',name,i%4,Math.floor(i/4),trait,per,text)));
/** 계열 단련: [탭, id 접두, 이름, 계열들, 특기(특성·단계당·이름·설명), 책략형?] */
const CORPS:Array<[ResearchTab,string,string,readonly string[],[string,number,string,(v:string)=>string],('mind'|'heal')?]>=[
  ['corps','inf','보병',['infantry'],['counterBoost',3,'반격 진형',v=>`보병 반격 위력 +${v}%`]],
  ['corps','spr','창병',['spearman'],['penetrate',1.5,'창끝 관통',v=>`창병 적 방어 ${v}% 무시`]],
  ['corps','cav','기병',['cavalry'],['chargePower',2,'돌격 숙련',v=>`기병 움직인 뒤 물리 공격 +${v}%`]],
  ['corps','hcv','중기병',['heavyCav'],['veteran',2,'철갑 버팀',v=>`중기병 체력 절반 이하에서 받는 피해 -${v}%`]],
  ['corps','ban','경보병',['bandit'],['critical',1.5,'급소 찌르기',v=>`경보병 회심 +${v}%`]],
  ['corps','mnk','무승',['monk'],['lifesteal',1,'금강 호흡',v=>`무승 입힌 피해의 ${v}% 회복`]],
  ['arms','arc','궁병',['archer'],['rangedPower',2,'곡사',v=>`궁병 두 칸 이상 물리 공격 +${v}%`]],
  ['arms','xbw','노병',['crossbow'],['penetrate',2,'강노',v=>`노병 적 방어 ${v}% 무시`]],
  ['arms','hra','궁기병',['horseArcher'],['evasionBoost',1,'기사',v=>`궁기병 적 명중 -${v}%p`]],
  ['arms','sge','공성·수군',['engineer','catapult','ram','navy'],['stat:maxHp',3,'보강 목재',v=>`공성·수군 최대 체력 +${v}%`]],
  ['mind','stg','책사',['strategist'],['manaRegen',1,'정심',v=>`책사 차례 시작에 MP +${v}`],'mind'],
  ['mind','fsh','풍수사',['fengshui'],['strategyEvasion',1,'간파',v=>`풍수사 적 책략 명중 -${v}%p`],'heal'],
  ['mind','cst','술사',['shaman','maiden','taoist'],['strategyEvasion',1,'호신부',v=>`술사 적 책략 명중 -${v}%p`],'mind'],
];
CORPS.forEach(([tab,key,name,fams,[sp,spPer,spName,spText],kind],i)=>{
  const col=CORPS.filter(c=>c[0]===tab).findIndex(c=>c[1]===key);void i;
  const atk:[string,number,string,(v:string)=>string]=kind==='heal'?['healPower',3,'의술',v=>`${name} 회복량 +${v}%`]:kind==='mind'?['strategyPower',1.5,'책략 조련',v=>`${name} 책략 피해 +${v}%`]:['physicalPower',1.5,'조련',v=>`${name} 물리 피해 +${v}%`];
  const def:[string,number,string,(v:string)=>string]=kind?['strategyDamageReduction',1.5,'정신 수양',v=>`${name} 받는 책략 피해 -${v}%`]:['physicalDamageReduction',1.2,'갑주',v=>`${name} 받는 물리 피해 -${v}%`];
  RESEARCH.push(deep(`c_${key}_atk`,tab,`${name} ${atk[2]}`,col,0,atk[0],atk[1],atk[3],{families:fams}));
  RESEARCH.push(deep(`c_${key}_def`,tab,`${name} ${def[2]}`,col,1,def[0],def[1],def[3],{families:fams,requires:[[`c_${key}_atk`,3]]}));
  RESEARCH.push(deep(`c_${key}_sp`,tab,`${name} ${spName}`,col,2,sp,spPer,spText,{families:fams,requires:[[`c_${key}_def`,3]],...(sp==='manaRegen'?{max:5}:{})}));
});
RESEARCH.push(deep('s_mastery','mind','책략 숙달',3,0,'strategyMastery',1,v=>`아군 전원 책략 진화(숙련·극의)가 레벨 ${v} 빨리`,{max:6}));
RESEARCH.push(deep('s_thrift','mind','책략 절약',3,1,'mpThrift',2,v=>`아군 전원 책략 소모 MP -${v}%`,{requires:[['s_mastery',2]]}));

export const nodeById=(id:string)=>RESEARCH.find(n=>n.id===id);
export const rankOf=(m:Pick<MetaState,'research'>,id:string)=>m.research?.[id]??0;

/** 조건을 말로. */
export function gateText(g:Gate){const out:string[]=[];
  if(g.runs)out.push(`회차 ${g.runs}번`);if(g.chronicle)out.push(`연의 전장 ${g.chronicle}승`);if(g.endings)out.push(`결말 ${g.endings}개`);if(g.wins)out.push(`완주 ${g.wins}번`);if(g.officerLv)out.push(`장수 하나가 Lv.${g.officerLv}`);
  return out.join(' · ');}
export function gateOpen(m:MetaState,g?:Gate){if(!g)return true;
  const best=Math.max(0,...Object.values(m.officerBest??{}));
  return (g.runs??0)<=m.runs&&(g.chronicle??0)<=m.chronicle.length&&(g.endings??0)<=m.endings.length&&(g.wins??0)<=m.wins&&(g.officerLv??0)<=best;}
export type NodeState='done'|'open'|'locked'|'hidden';
/** done=끝까지 배움 · open=지금 배울 수 있음(천명이 모자랄 수는 있다) · locked=선행이나 조건이 모자람 */
/** 다음 단계(r→r+1)를 올리는 데 필요한 강화 구간 조건. 없으면 undefined. */
export function rankGate(n:ResearchNode,r:number):Gate|undefined{let g:Gate|undefined;for(const [from,x] of n.rankGates??[])if(r>=from)g={...g,...x};return g;}
/** 단계 구간 이름: 기본(1~5)·숙련(6~8)·극의(9~10) */
export function rankBand(n:ResearchNode,rank:number){const gs=n.rankGates??[];if(!gs.length)return '';return rank>(gs[1]?.[0]??99)?'극의':rank>(gs[0]?.[0]??99)?'숙련':'기본';}
export function nodeState(m:MetaState,n:ResearchNode):NodeState{
  const r=rankOf(m,n.id);if(r>=n.max)return 'done';
  const reqOk=(n.requires??[]).every(([id,k])=>rankOf(m,id)>=k);
  return reqOk&&gateOpen(m,n.gate)&&gateOpen(m,rankGate(n,r))?'open':'locked';
}
/** 한 단계 올린다. 성공하면 true. */
export function buyResearch(m:MetaState,id:string){
  const n=nodeById(id);if(!n||nodeState(m,n)!=='open')return false;
  const r=rankOf(m,id),cost=n.cost(r);if(m.mandate<cost)return false;
  m.mandate-=cost;(m.research??={})[id]=r+1;return true;
}
/** 진행률(배운 단계 / 전체 단계). */
export function researchProgress(m:MetaState,tab?:ResearchTab){const ns=RESEARCH.filter(n=>!tab||n.tab===tab);return {done:ns.reduce((a,n)=>a+Math.min(n.max,rankOf(m,n.id)),0),total:ns.reduce((a,n)=>a+n.max,0)};}

// ─────────────────────────────────────────────── 효과

/** 전투 칸이 입히는 특성: 아군 전원과 사마의만. */
export function researchGrants(m:MetaState):PerkGrants{
  const all:PerkGrant[]=[],hero:PerkGrant[]=[];
  const byFamily:Record<string,PerkGrant[]>={};
  for(const n of RESEARCH){const r=rankOf(m,n.id);if(!r||!n.perk)continue;const v=Math.round(n.perk.per*r*10)/10;
    if(n.perk.families)for(const f of n.perk.families)(byFamily[f]??=[]).push([n.perk.trait,v]);else (n.perk.hero?hero:all).push([n.perk.trait,v]);}
  if(rankOf(m,'unify'))all.push(['physicalPower',5],['strategyPower',5]);
  return {all,byName:hero.length?{'사마의':hero}:{},...(Object.keys(byFamily).length?{byFamily}:{})};
}
export const xpMult=(m:MetaState)=>1+.1*(rankOf(m,'training')+rankOf(m,'academy'));
export const restMult=(m:MetaState)=>1+.15*rankOf(m,'medic');
export const mandateBonus=(m:MetaState)=>rankOf(m,'granary')+2*rankOf(m,'tribute')+rankOf(m,'ledger');
export const heroLevelBonus=(m:MetaState)=>rankOf(m,'temper');
export const recruitBonus=(m:MetaState)=>rankOf(m,'elite');
export const perkSlots=(m:MetaState)=>2+rankOf(m,'slot')+rankOf(m,'slot2');
