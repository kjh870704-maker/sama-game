/**
 * 전투 보정 묶음(연구·장수 효과) — 둘 다 결국 '어떤 특성을 몇만큼'이다.
 * 같은 특성을 연구와 장수 효과에서 함께 받으면 수치가 더해진다(회심 10 + 5 = 15).
 * 전투를 열 때 배치(Deployment)에 그 순간의 값을 적어 두므로, 저장된 전투를 다시 돌려도 같은 결과가 나온다.
 */
import type {BattleState,Unit} from '../../core/src/index.ts';
import {allTraitIds,familyOf} from '../../core/src/index.ts';

/** [특성 id, 수치] */
export type PerkGrant=[string,number];
export interface PerkGrants {
  /** 아군 전원(연구) */
  all:PerkGrant[];
  /** 장수 이름 → 그 장수만(장수 효과) */
  byName:Record<string,PerkGrant[]>;
  /** 계열(familyOf) → 그 계열 병종만(병종 연구) */
  byFamily?:Record<string,PerkGrant[]>;
}
/** 특성이 아닌 보정: 능력치 %(stat:…)와 책략 숙달·절약(전투 규칙이 traitParams에서 읽는다). */
export const STAT_KEYS=['maxHp','maxMp','attack','defense','intellect','spirit','agility'] as const;
export const PARAM_ONLY=new Set(['strategyMastery','mpThrift']);
const isStat=(id:string)=>id.startsWith('stat:')&&(STAT_KEYS as readonly string[]).includes(id.slice(5));

/** 특성 하나를 입힌다. 이미 있으면 수치를 더한다. */
export function grantPerk(u:Unit,id:string,param:number){
  if(isStat(id)){const k=id.slice(5) as typeof STAT_KEYS[number],s=u.stats,before=s[k],after=Math.round(before*(1+param/100));s[k]=after;
    if(k==='maxHp')u.hp=Math.max(1,Math.round(u.hp*after/Math.max(1,before)));if(k==='maxMp')u.mp=Math.round(u.mp*after/Math.max(1,before));return;}
  if(!PARAM_ONLY.has(id)&&!u.traits.includes(id))u.traits.push(id);
  u.traitParams[id]=(u.traitParams[id]??0)+param;
}
/** 전장의 아군에게 연구·장수 효과를 입힌다. */
export function applyPerkGrants(state:BattleState,g:PerkGrants){
  for(const u of state.living('player')){
    for(const [id,n] of g.all)grantPerk(u,id,n);
    for(const [id,n] of g.byName[u.name]??[])grantPerk(u,id,n);
    for(const [id,n] of g.byFamily?.[familyOf(u.unitClass)]??[])grantPerk(u,id,n);
  }
}
/** 저장된 보정이 올바른가(알 수 없는 특성·터무니없는 수치는 거절). */
export function validGrants(g:unknown):g is PerkGrants{
  if(!g||typeof g!=='object')return false;
  const x=g as PerkGrants,ids=new Set(allTraitIds());
  const ok=(list:unknown)=>Array.isArray(list)&&list.length<=80&&list.every(p=>Array.isArray(p)&&p.length===2&&typeof p[0]==='string'&&(ids.has(p[0])||isStat(p[0])||PARAM_ONLY.has(p[0]))&&Number.isFinite(p[1])&&Math.abs(p[1])<=200);
  return ok(x.all)&&!!x.byName&&typeof x.byName==='object'&&Object.keys(x.byName).length<=40&&Object.values(x.byName).every(ok)&&(x.byFamily===undefined||(typeof x.byFamily==='object'&&Object.keys(x.byFamily).length<=40&&Object.values(x.byFamily).every(ok)));
}

/** 화면에 보일 이름·설명(수치는 n). */
export const PERK_TEXT:Record<string,{name:string;text:(n:number)=>string}>={
  physicalPower:{name:'무위',text:n=>`물리 공격 피해 +${n}%`},
  strategyPower:{name:'책략 위력',text:n=>`책략 공격 피해 +${n}%`},
  physicalDamageReduction:{name:'갑주',text:n=>`받는 물리 피해 -${n}%`},
  strategyDamageReduction:{name:'정신 수양',text:n=>`받는 책략 피해 -${n}%`},
  critical:{name:'회심',text:n=>`회심(1.5배) 확률 +${n}%`},
  penetrate:{name:'관통',text:n=>`적 방어 ${n}% 무시`},
  counterBoost:{name:'반격 강화',text:n=>`반격 위력 +${n}%`},
  lifesteal:{name:'흡혈',text:n=>`입힌 피해의 ${n}% 회복`},
  veteran:{name:'역전용사',text:n=>`체력 절반 이하에서 받는 피해 -${n}%`},
  lastStand:{name:'배수의 진',text:n=>`체력이 낮을수록 공격력 상승(최대 +${n}%)`},
  turnaround:{name:'전화위복',text:n=>`체력 절반 이하에서 공격력 +${n}%`},
  strategyEvasion:{name:'간파',text:n=>`적 책략 명중 -${n}%p`},
  healPower:{name:'의술',text:n=>`회복량 +${n}%`},
  defenseBoost:{name:'신중',text:n=>`받는 모든 피해 -${n}%`},
  accuracyBoost:{name:'정조',text:n=>`명중 +${n}%p`},
  evasionBoost:{name:'몸놀림',text:n=>`적 명중 -${n}%p`},
  regen:{name:'재정비',text:n=>`차례 시작에 체력 ${n}% 회복`},
  manaRegen:{name:'정심',text:n=>`차례 시작에 MP ${n} 회복`},
  chargePower:{name:'돌격 숙련',text:n=>`움직인 뒤 물리 공격 피해 +${n}%`},
  rangedPower:{name:'원거리 숙련',text:n=>`두 칸 이상 물리 공격 피해 +${n}%`},
  meleePower:{name:'근접 숙련',text:n=>`붙어서 물리 공격 피해 +${n}%`},
  'stat:maxHp':{name:'체력 단련',text:n=>`최대 체력 +${n}%`},'stat:maxMp':{name:'책략 수련',text:n=>`최대 MP +${n}%`},
  'stat:attack':{name:'근력 단련',text:n=>`공격 +${n}%`},'stat:defense':{name:'방호 단련',text:n=>`방어 +${n}%`},
  'stat:intellect':{name:'학문',text:n=>`지력 +${n}%`},'stat:spirit':{name:'심지',text:n=>`정신 +${n}%`},'stat:agility':{name:'몸놀림 단련',text:n=>`순발 +${n}%`},
  strategyMastery:{name:'책략 숙달',text:n=>`책략 진화(숙련·극의)가 레벨 ${n} 빨리 온다`},
  mpThrift:{name:'책략 절약',text:n=>`책략 소모 MP -${n}%`},
};
export const perkText=(id:string,n:number)=>PERK_TEXT[id]?.text(n)??`${id} ${n}`;
/** 병종 특성 한 줄 요약(진화 개화 설명용). 손으로 쓴 설명 대신 실제 수치에서 만든다. */
const CLASS_TRAIT_TEXT:Record<string,(n:number)=>string>={
  attackBoost:n=>`공격 +${n}%`,critical:n=>`회심 +${n}%`,penetrate:n=>`방어 ${n}% 무시`,lifesteal:n=>`피해의 ${n}% 회복`,
  physicalDamageReduction:n=>`물리 피해 -${n}%`,strategyDamageReduction:n=>`책략 피해 -${n}%`,counterBoost:n=>`반격 +${n}%`,
  veteran:n=>`빈사 시 피해 -${n}%`,lastStand:n=>`궁지 공격 최대 +${n}%`,strategyEvasion:n=>`책략 회피 +${n}%p`,healPower:n=>`회복량 +${n}%`,
  strategyPower:n=>`책략 피해 +${n}%`,chargePower:n=>`돌격 피해 +${n}%`,physicalReflect:n=>`물리 피해 ${n}% 반사`,strategyReflect:n=>`책략 피해 ${n}% 반사`,
  fireWeakness:n=>`화계에 약함(+${n}%)`,roughTerrainMove:()=>'험지를 평지처럼',guardian:()=>'옆 아군을 지킨다',unlimitedCounter:()=>'반격 횟수 제한 없음',
};
export function classTraitSummary(traits:Readonly<Record<string,number>>|undefined){
  return Object.entries(traits??{}).map(([k,n])=>CLASS_TRAIT_TEXT[k]?.(n)??(PERK_TEXT[k]?PERK_TEXT[k]!.text(n):'')).filter(Boolean).join(' · ');
}
