/**
 * 보물 특수효과 — 능력치·고유 효과에 더해, 보물마다 하나씩 '특기'가 있다.
 * 병서·도술서·부채는 책략을 부여한다(책사가 아니어도 쓸 수 있고, MP도 함께 늘어난다).
 * 명검·명마·갑주는 전투 특성을 더한다. 장착한 장수가 출진하면 전투 시작에 걸린다.
 */
import type {BattleState,Unit} from '../../core/src/index.ts';
import {allStrategies} from './officers.ts';
import {grantPerk} from './perks.ts';

export interface TreasureSpecial {name:string;text:string;strategies?:string[];mp?:number;traits?:Array<[string,number]>}
export const TREASURE_SPECIALS:Record<string,TreasureSpecial>={
  dunjia:{name:'기문둔갑',text:'책략 「돌풍·풍룡·허보」를 쓸 수 있다 · 최대 MP +20 · 차례마다 MP +2',strategies:['gust','windDragon','feint'],mp:20,traits:[['manaRegen',2]]},
  taiping:{name:'태평요술',text:'책략 「소회복·정화·낙뢰」를 쓸 수 있다 · 최대 MP +18 · 차례마다 체력 3% 회복',strategies:['mend','purify','thunder'],mp:18,traits:[['regen',3]]},
  mengde:{name:'맹덕의 병법',text:'책략 「화계·교란·매복」을 쓸 수 있다 · 최대 MP +15 · 책략 피해 +5%',strategies:['fire','confuse','ambush'],mp:15,traits:[['strategyPower',5]]},
  fan:{name:'와룡의 부채',text:'책략 「화계·풍룡·수계」를 쓸 수 있다 · 최대 MP +20 · 책략 피해 +8%',strategies:['fire','windDragon','flood'],mp:20,traits:[['strategyPower',8]]},
  sunzi:{name:'허실',text:'책략 「허보·포위계」를 쓸 수 있다 · 최대 MP +12 · 명중 +5%p',strategies:['feint','encircle'],mp:12,traits:[['accuracyBoost',5]]},
  sixTeachings:{name:'육도의 진',text:'책략 「고무·견고」를 쓸 수 있다 · 최대 MP +12',strategies:['inspire','fortify'],mp:12},
  threeStrategies:{name:'삼략의 행군',text:'책략 「강행·명상」을 쓸 수 있다 · 최대 MP +12',strategies:['march','focus'],mp:12},
  qingshu:{name:'청낭의술',text:'책략 「소회복·대회복」을 쓸 수 있다 · 최대 MP +18 · 회복량 +20%',strategies:['mend','greatMend'],mp:18,traits:[['healPower',20]]},
  seal:{name:'천명의 인',text:'책략 「함성·대고무」를 쓸 수 있다 · 최대 MP +15 · 받는 모든 피해 -5%',strategies:['warCry','grandDrum'],mp:15,traits:[['defenseBoost',5]]},
  craneRobe:{name:'학창 명상',text:'책략 「명상·정화」를 쓸 수 있다 · 최대 MP +10',strategies:['focus','purify'],mp:10},
  jadeSword:{name:'영검',text:'책략 「낙뢰」를 쓸 수 있다 · 최대 MP +10 · 간파 +5%p',strategies:['thunder'],mp:10,traits:[['strategyEvasion',5]]},
  yitian:{name:'의천의 위엄',text:'입힌 피해의 8%만큼 체력 회복 · 회심 +5%',traits:[['lifesteal',8],['critical',5]]},
  qinggang:{name:'청공의 날',text:'적 방어 8% 추가 무시 · 회심 +6%',traits:[['penetrate',8],['critical',6]]},
  greenDragon:{name:'청룡언월',text:'움직인 뒤 물리 공격 +12% · 회심 +6%',traits:[['chargePower',12],['critical',6]]},
  serpentSpear:{name:'장판교의 호통',text:'반격 위력 +25% · 체력이 낮을수록 공격력 상승(최대 20%)',traits:[['counterBoost',25],['lastStand',20]]},
  halberd:{name:'방천화극 무쌍',text:'물리 공격 피해 +8% · 적 방어 8% 무시',traits:[['physicalPower',8],['penetrate',8]]},
  sevenstar:{name:'칠성 자객',text:'회심 +12%',traits:[['critical',12]]},
  redHare:{name:'적토마',text:'움직인 뒤 물리 공격 +12% · 적 명중 -8%p',traits:[['chargePower',12],['evasionBoost',8]]},
  dilu:{name:'적로의 도약',text:'적 명중 -10%p · 체력 절반 이하에서 받는 피해 -15%',traits:[['evasionBoost',10],['veteran',15]]},
  silverarmor:{name:'백은 호신',text:'받는 책략 피해 -10% · 차례마다 체력 3% 회복',traits:[['strategyDamageReduction',10],['regen',3]]},
  ironArmor:{name:'철갑',text:'반격 위력 +10%',traits:[['counterBoost',10]]},
  bow:{name:'명궁',text:'두 칸 이상 물리 공격 +10%',traits:[['rangedPower',10]]},
  brightArmor:{name:'명광개',text:'받는 모든 피해 -6%',traits:[['defenseBoost',6]]},
  taipingYaoshu:{name:'남화의 비술',text:'책략 「낙뢰·속박」을 쓸 수 있다 · 최대 MP +15 · 책략 피해 +5%',strategies:['thunder','bind'],mp:15,traits:[['strategyPower',5]]},
  xishuMap:{name:'촉의 길',text:'적 명중 -6%p',traits:[['evasionBoost',6]]},
  zhansheSword:{name:'한 고조의 검',text:'회심 +8% · 입힌 피해의 5%만큼 체력 회복',traits:[['critical',8],['lifesteal',5]]},
  plantainFan:{name:'파초선',text:'책략 「돌풍·풍룡」을 쓸 수 있다 · 최대 MP +12',strategies:['gust','windDragon'],mp:12},
  fiveFireFan:{name:'오화신염',text:'책략 「화계」를 쓸 수 있다 · 최대 MP +12 · 책략 피해 +6%',strategies:['fire'],mp:12,traits:[['strategyPower',6]]},
  zhugeTurban:{name:'와룡의 계책',text:'책략 「허보·매복」을 쓸 수 있다 · 최대 MP +10',strategies:['feint','ambush'],mp:10},
  lubuBow:{name:'원문사극',text:'두 칸 이상 물리 공격 +10% · 회심 +5%',traits:[['rangedPower',10],['critical',5]]},
  phoenixRobe:{name:'봉황의 깃',text:'차례마다 체력 3% 회복',traits:[['regen',3]]},
  blackArmor:{name:'현철갑',text:'체력이 낮을수록 공격력 상승(최대 15%)',traits:[['lastStand',15]]},
};
export const specialOf=(id:string)=>TREASURE_SPECIALS[id];
/** 장착 보물의 특기를 전장의 장수에게 건다(책략은 전장 책략표에도 올린다). */
export function applyTreasureSpecial(state:BattleState,u:Unit,id:string){
  const sp=TREASURE_SPECIALS[id];if(!sp)return;
  if(sp.mp){u.stats.maxMp+=sp.mp;u.mp+=sp.mp;}
  for(const s of sp.strategies??[]){const d=allStrategies.find(x=>x.id===s);if(!d)continue;if(!state.strategies.has(s))state.strategies.set(s,d);if(!u.strategies.includes(s))u.strategies.push(s);}
  for(const [t,n] of sp.traits??[])grantPerk(u,t,n);
}
