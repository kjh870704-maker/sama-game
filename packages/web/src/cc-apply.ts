/**
 * 조조전 규칙(규칙판 5)을 전장의 부대에 입힌다.
 * 장수 능력 = 연의 무력·지력·통솔 + 『삼국지 조조전』 장수표의 민첩·운. 표에 없는 장수는 연의 능력으로 어림한다.
 * 일반 병사는 병과 등급으로 정한 능력(S 80 · A 70 · B 60 · C 40)을 쓴다.
 * 이미 맞춰 둔 능력치(우두머리 보정·시련·보물·연구)는 "지금 값 ÷ 옛 기본값" 비율로 새 능력치에 옮긴다.
 */
import {ccStatsFor,genericAbility,statsFor} from '../../core/src/index.ts';
import type {Ability,Unit,UnitStats} from '../../core/src/index.ts';
import {romanceOf} from './romance.ts';

/** 『삼국지 조조전』 장수표의 민첩·운. */
export const CC_OFFICER_AGI_LUCK:Record<string,readonly [number,number]>={조조:[80,84],방덕:[62,60],악진:[54,86],이전:[74,56],조홍:[66,70],서황:[78,96],우금:[92,98],하후돈:[90,66],장료:[78,94],관우:[68,62],조창:[64,60],조인:[70,62],하후연:[66,78],장합:[74,92],조비:[58,100],유엽:[52,82],전위:[98,68],허저:[68,98],순욱:[56,62],정욱:[64,76],순유:[76,78],만총:[78,84],곽가:[82,90],가후:[80,78],사마의:[46,42],초선:[100,82]};

const even=(v:number)=>Math.max(20,Math.min(100,Math.round(v/2)*2));
/** 부대의 장수 능력(무력·지력·통솔·민첩·운). 장수가 아니면 병과 등급으로. */
export function abilityOf(u:Unit):Ability{
  const r=romanceOf(u);if(!r)return genericAbility(u.unitClass);
  const cc=CC_OFFICER_AGI_LUCK[r.name];
  return {war:r.war,int:r.int,lead:r.lead,agi:cc?.[0]??even(.45*r.war+.25*r.int+22),luck:cc?.[1]??even(.6*r.cha+25)};
}
const KEYS=['maxHp','maxMp','attack','defense','intellect','spirit','agility'] as const;
/**
 * 조조전 규칙을 켜고 능력치를 조조전 성장식으로 바꾼다(체력·책략 비율은 그대로).
 * 성문·망루·목책·호위 대상처럼 체력을 일부러 맞춘 부대는 keepHp로 체력·책략 최대치를 그대로 둔다
 * (공격·방어·순발은 새 규칙에 맞춰야 피해가 옛 규칙과 같은 무게로 들어간다).
 */
/** 이름난 장수의 회심 보너스(%p): 무력·운이 높을수록 잘 터진다(5~20). 일반 병사는 0. */
export function officerCritOf(u:Unit):number{
  const r=romanceOf(u);if(!r)return 0;const a=abilityOf(u);
  return Math.max(5,Math.min(20,Math.round(5+(a.war-60)/4+(a.luck-60)/8)));
}
export function applyCC(u:Unit,keepHp=false):void{
  u.ccRules=true;u.ability=abilityOf(u);
  const oc=officerCritOf(u);if(oc>0)u.officerCrit=oc;
  const s=u.stats,base=statsFor(u.unitClass,u.level),cc=ccStatsFor(u.unitClass,u.level,u.ability,u.side,s.movement);
  const hp=u.hp/Math.max(1,s.maxHp),mp=s.maxMp>0?u.mp/s.maxMp:1;
  for(const k of KEYS)if(!keepHp||(k!=='maxHp'&&k!=='maxMp'))s[k]=Math.max(k==='maxMp'?0:1,Math.round(s[k]*cc[k]/Math.max(1,base[k])));
  s.morale=Math.max(1,Math.round(cc.morale*(s.morale||50)/50));
  u.hp=Math.max(1,Math.round(s.maxHp*hp));u.mp=Math.round(s.maxMp*mp);
}
/** 조조전 규칙 부대의 레벨 a→b 성장분. */
export function ccLevelDelta(u:Unit,a:number,b:number):Omit<UnitStats,'movement'>{
  const ab=u.ability??genericAbility(u.unitClass),x=ccStatsFor(u.unitClass,a,ab,u.side,u.stats.movement),y=ccStatsFor(u.unitClass,b,ab,u.side,u.stats.movement);
  return {maxHp:y.maxHp-x.maxHp,maxMp:y.maxMp-x.maxMp,attack:y.attack-x.attack,defense:y.defense-x.defense,intellect:y.intellect-x.intellect,spirit:y.spirit-x.spirit,agility:y.agility-x.agility,morale:y.morale-x.morale};
}
