/**
 * 조조전 규칙 — 『삼국지 조조전』의 병과 능력 등급과 성장·확률 체계를 이 게임의 병종에 옮긴 것.
 *
 * 1) 병과마다 다섯 능력(공격·정신·방어·순발·사기)에 S/A/B/C 등급이 있다.
 * 2) 부대 능력치 = 장수 능력/2 + 레벨 × 상승치. 상승치는 등급과 장수 능력 구간(0~48·50~68·70~88·90~100)으로 정한다.
 *    무력→공격, 지력→정신(책략 위력·저항), 통솔→방어, 민첩→순발, 운→사기.
 * 3) HP·MP는 병과별 기본치와 레벨당 상승치로 정해지고, 진화(클래스 업) 한 번마다 상승치의 두 배를 더 받는다.
 * 4) 지형 효율: 병과 무리마다 지형에서 공격·방어가 80%(X)·90%(△)·100%(○)·110%(◎)·120%(★)가 된다.
 * 5) 명중·2회 공격·회심은 능력치 비율로 정한다(민첩·순발 비율, 사기 비율).
 * 6) 우군·적군은 한 레벨 낮은 능력치를 갖는다.
 *
 * 이 규칙은 새 전투(규칙판 5)에서만 켠다. 예전 저장과 재생은 예전 규칙 그대로 돌아간다.
 */
import type { Ability, TerrainKind, Unit, UnitClass, UnitStats } from "./types.ts";
import { EVOLUTION, familyOf, tierOf } from "./classes.ts";

export type Grade = "S" | "A" | "B" | "C";
export type { Ability };

export interface GradeProfile {
  /** 조조전 병과 이름(표시용) */
  name: string;
  /** 공격 · 정신 · 방어 · 순발 · 사기 */
  grades: readonly [Grade, Grade, Grade, Grade, Grade];
  /** HP: 1레벨 기본치, 레벨당 상승 */
  hp: readonly [number, number];
  /** MP: 1레벨 기본치, 레벨당 상승 */
  mp: readonly [number, number];
  /** 지형 효율 무리 */
  terrain: TerrainGroup;
}

const g = (name: string, grades: string, hp: [number, number], mp: [number, number], terrain: TerrainGroup): GradeProfile =>
  ({ name, grades: grades.split("") as unknown as GradeProfile["grades"], hp, mp, terrain });

/** 계통(1단 병종) → 등급. 계통이 없으면 계열(family)의 것을 쓴다. */
const LINE_GRADES: Partial<Record<UnitClass, GradeProfile>> = {
  // 보병 계열
  infantry:   g("보병계", "BASBB", [110, 6], [10, 1], "foot"),
  rattan:     g("등갑병", "BCSBA", [110, 6], [10, 1], "foot"),
  // 창병 계열
  spearman:   g("창병계", "ABABB", [100, 5], [10, 1], "foot"),
  // 기병 계열
  cavalry:    g("기병계", "SBABB", [100, 5], [10, 1], "horse"),
  xiliang:    g("서량기병", "SCSBB", [110, 6], [5, 1], "xiliang"),
  heavyCav:   g("중기병", "SCSCB", [110, 6], [5, 1], "horse"),
  elephant:   g("곰부대형 상병", "SCABB", [110, 6], [5, 1], "beast"),
  horseArcher:g("궁기병계", "SBBBA", [100, 5], [10, 1], "horse"),
  // 궁·노
  archer:     g("궁병계", "ABBBS", [90, 4], [10, 1], "foot"),
  slinger:    g("투석병", "ABBCS", [90, 4], [10, 1], "foot"),
  crossbow:   g("노병", "SBACA", [90, 4], [10, 1], "foot"),
  catapult:   g("포차계", "SBACA", [90, 4], [10, 1], "machine"),
  ram:        g("충차", "ACSCC", [110, 6], [5, 1], "machine"),
  engineer:   g("공병", "BBABB", [90, 4], [10, 1], "foot"),
  navy:       g("해적·수군", "SBBAB", [90, 4], [20, 1], "water"),
  // 문관
  strategist: g("책사계", "BSBBB", [90, 4], [40, 2], "scholar"),
  fengshui:   g("풍수사계", "CSCAA", [80, 3], [50, 2], "scholar"),
  taoist:     g("도사계", "CSBAB", [80, 3], [40, 2], "rough"),
  shaman:     g("주술사", "CSBBA", [80, 3], [60, 3], "scholar"),
  maiden:     g("무희계", "ABBSB", [90, 3], [35, 1], "dancer"),
  // 무예·산적
  monk:       g("무도가계", "ACASB", [90, 4], [20, 1], "monk"),
  bandit:     g("적병계", "SCBBS", [100, 5], [20, 1], "rough"),
  assassin:   g("자객", "ACCSA", [90, 4], [20, 1], "rough"),
  civilian:   g("민중", "CCCCC", [80, 3], [5, 1], "civilian"),
  // 병종 차트로 늘린 계통(chart-classes.ts)
  swordsman:  g("검사계", "SCBAB", [100, 5], [10, 1], "foot"),
  lord:       g("군주계", "AAABA", [107, 5], [30, 1], "horse"),
  commander:  g("도독계", "AABBB", [100, 5], [30, 2], "foot"),
  dancer:     g("무희계", "ABBSB", [90, 3], [35, 1], "dancer"),
  mountainCav:g("산악기병계", "SBBAB", [100, 5], [10, 1], "xiliang"),
  valiantCav: g("효기병계", "SCBAB", [100, 5], [10, 1], "horse"),
  lightChariot:g("전차계", "SCSCB", [110, 6], [5, 1], "machine"),
  siegeTower: g("정란계", "ACSCC", [110, 6], [5, 1], "machine"),
  crownPrince:g("천자계", "BABBA", [90, 4], [40, 2], "scholar"),
  transport:  g("물자대", "CCBCC", [100, 5], [20, 1], "civilian"),
  nanmanRider:g("남만기병", "SCBBA", [100, 5], [5, 1], "horse"),
  gaemaWarrior:g("개마무사", "SCSCB", [110, 6], [5, 1], "horse"),
  halberdCav: g("극기병", "SCABB", [100, 5], [10, 1], "horse"),
  wheelSage:  g("사륜거", "CSBCB", [85, 4], [45, 2], "scholar"),
  yellowTurban:g("황건적", "ACBBB", [100, 5], [10, 1], "rough"),
  ytArcher:   g("황건궁병", "BCBBA", [90, 4], [10, 1], "rough"),
  ytSpear:    g("황건창병", "ACABB", [100, 5], [10, 1], "rough"),
  ytBrawler:  g("황건무인", "ACBAB", [90, 4], [10, 1], "rough"),
  nanmanFoot: g("남만보병", "SCBBB", [110, 6], [5, 1], "rough"),
  northFoot:  g("북방보병", "ACABB", [110, 6], [5, 1], "foot"),
  northRider: g("북방기병", "ABBAB", [100, 5], [10, 1], "horse"),
  palanquin:  g("어가", "CABBA", [90, 4], [40, 2], "civilian"),
  baguaChariot:g("팔괘전차", "AABCB", [100, 5], [30, 2], "machine"),
  flyingBlade:g("비도수", "ACCSA", [90, 4], [20, 1], "rough"),
  bashuRepeater:g("파촉 연노병", "SBACA", [90, 4], [10, 1], "foot"),
};

/** 병종의 계통 뿌리(1단 병종). 진화 사슬을 거꾸로 따라간다. */
const PREV: Partial<Record<UnitClass, UnitClass>> = {};
for (const [from, to] of Object.entries(EVOLUTION)) if (to) PREV[to[0]] = from as UnitClass;
function lineRoot(c: UnitClass): UnitClass {
  let cur = c;
  for (let i = 0; i < 6 && PREV[cur]; i++) cur = PREV[cur]!;
  return cur;
}

export function gradeProfileOf(c: UnitClass): GradeProfile {
  return LINE_GRADES[c] ?? LINE_GRADES[lineRoot(c)] ?? LINE_GRADES[familyOf(c)] ?? LINE_GRADES.infantry!;
}

/** 일반 병사의 능력(등급만으로 정해진 장수 능력): S 80 · A 70 · B 60 · C 40, 민중은 30. */
export function genericAbility(c: UnitClass): Ability {
  const p = gradeProfileOf(c), v = (gr: Grade) => (p.name === "민중" ? 30 : gr === "S" ? 80 : gr === "A" ? 70 : gr === "B" ? 60 : 40);
  return { war: v(p.grades[0]), int: v(p.grades[1]), lead: v(p.grades[2]), agi: v(p.grades[3]), luck: v(p.grades[4]) };
}

/** 레벨당 능력 상승치: 등급 × 장수 능력 구간(0~48 · 50~68 · 70~88 · 90~100). */
const GAIN: Record<Grade, readonly [number, number, number, number]> = {
  S: [2, 3, 3, 4],
  A: [2, 2, 3, 3],
  B: [1, 2, 2, 3],
  C: [1, 1, 2, 2],
};
export function gainOf(grade: Grade, ability: number): number {
  const bracket = ability >= 90 ? 3 : ability >= 70 ? 2 : ability >= 50 ? 1 : 0;
  return GAIN[grade][bracket];
}
/** 일반 병사보다 상승치가 높으면 특화(+1), 낮으면 열화(-1), 같으면 0. */
export function specialization(grade: Grade, ability: number): -1 | 0 | 1 {
  const generic = gainOf(grade, grade === "S" ? 80 : grade === "A" ? 70 : grade === "B" ? 60 : 40), mine = gainOf(grade, ability);
  return mine > generic ? 1 : mine < generic ? -1 : 0;
}

/** 조조전 규칙의 부대 능력치. 우군·적군(side가 player가 아니면)은 한 레벨 낮은 값을 쓴다. */
export function ccStatsFor(unitClass: UnitClass, level: number, ability: Ability, side: string, movement: number): UnitStats {
  const p = gradeProfileOf(unitClass), tier = tierOf(unitClass);
  const L = Math.max(0, side === "player" ? level : level - 1);
  const stat = (gr: Grade, a: number) => Math.floor(a / 2) + gainOf(gr, a) * L;
  const [atk, spi, def, agi, mor] = p.grades;
  const hpBonus = Math.max(0, Math.round((ability.lead - 66) / 2)), mpBonus = Math.max(0, Math.round((ability.int - 60) / 8));
  const up = Math.max(0, tier - 1) * 2;
  return {
    maxHp: p.hp[0] + p.hp[1] * Math.max(0, L - 1) + p.hp[1] * up + hpBonus,
    maxMp: p.mp[0] + p.mp[1] * Math.max(0, L - 1) + p.mp[1] * up + mpBonus,
    attack: stat(atk, ability.war),
    intellect: stat(spi, ability.int),
    spirit: stat(spi, ability.int),
    defense: stat(def, ability.lead),
    agility: stat(agi, ability.agi),
    morale: stat(mor, ability.luck),
    movement,
  };
}

// ── 지형 효율 ──────────────────────────────────────────────
/** 조조전 지형 효율 무리. 같은 무리는 지형에서 같은 배율을 받는다. */
export type TerrainGroup = "foot" | "horse" | "xiliang" | "beast" | "machine" | "water" | "scholar" | "rough" | "monk" | "dancer" | "civilian";
const X = 0.8, D = 0.9, O = 1.0, W = 1.1, STAR = 1.2;
/** 이 게임 지형 → 조조전 지형: 평지·길=평지/초원, 숲=숲, 구릉=황무지, 산지=산지, 늪=습지, 여울=여울, 물·급류=대하, 다리·잔도=다리, 성채=요새(★), 성문=성내. */
const TERRAIN_EFF: Record<TerrainGroup, Partial<Record<TerrainKind, number>>> = {
  //            평지  길   숲  구릉  산지  늪  여울  물  급류 다리 잔도 성채  성문
  foot:     { plain: O, road: O, forest: O, hill: O, mountain: O, marsh: O, ford: O, water: O, rapids: O, bridge: O, plank: O, fort: STAR, gate: W },
  horse:    { plain: W, road: W, forest: D, hill: D, mountain: X, marsh: X, ford: D, water: X, rapids: X, bridge: W, plank: D, fort: STAR, gate: O },
  xiliang:  { plain: O, road: O, forest: X, hill: W, mountain: W, marsh: X, ford: X, water: X, rapids: X, bridge: O, plank: O, fort: STAR, gate: O },
  beast:    { plain: D, road: O, forest: W, hill: W, mountain: W, marsh: X, ford: D, water: X, rapids: X, bridge: O, plank: O, fort: STAR, gate: O },
  machine:  { plain: O, road: O, forest: D, hill: D, mountain: X, marsh: X, ford: X, water: O, rapids: O, bridge: W, plank: X, fort: STAR, gate: W },
  water:    { plain: D, road: D, forest: D, hill: X, mountain: X, marsh: W, ford: W, water: W, rapids: W, bridge: O, plank: D, fort: STAR, gate: O },
  scholar:  { plain: O, road: O, forest: O, hill: D, mountain: X, marsh: D, ford: O, water: X, rapids: X, bridge: O, plank: D, fort: STAR, gate: O },
  rough:    { plain: O, road: O, forest: W, hill: W, mountain: W, marsh: X, ford: X, water: X, rapids: X, bridge: O, plank: W, fort: STAR, gate: O },
  monk:     { plain: O, road: O, forest: O, hill: O, mountain: D, marsh: O, ford: O, water: W, rapids: W, bridge: O, plank: O, fort: STAR, gate: O },
  dancer:   { plain: O, road: O, forest: O, hill: O, mountain: D, marsh: W, ford: W, water: W, rapids: W, bridge: O, plank: O, fort: STAR, gate: O },
  civilian: { plain: D, road: D, forest: D, hill: D, mountain: D, marsh: X, ford: X, water: X, rapids: X, bridge: O, plank: D, fort: STAR, gate: O },
};
export function terrainEfficiency(unitClass: UnitClass, terrain: TerrainKind): number {
  return TERRAIN_EFF[gradeProfileOf(unitClass).terrain][terrain] ?? 1;
}
/** 지형 효율을 기호로: X 80% · △ 90% · ○ 100% · ◎ 110% · ★ 120% */
export function efficiencyMark(v: number): string {
  return v >= 1.2 ? "★" : v >= 1.1 ? "◎" : v >= 1 ? "○" : v >= 0.9 ? "△" : "X";
}

// ── 확률 ──────────────────────────────────────────────────
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/**
 * 명중률(%). 나의 민첩(순발력) ÷ 상대 민첩.
 *  2배 초과 100 · 높으면 80+비율×10(90~100) · 낮으면 30+비율×60(60~90) · 2배 이상 낮으면 비율×90(30~60) · 3배 이상 낮으면 30
 */
export function ccHitChance(mine: number, theirs: number): number {
  const a = Math.max(1, mine), b = Math.max(1, theirs), r = a / b;
  if (a > 2 * b) return 100;
  if (a >= b) return clampN(80 + r * 10, 90, 100);
  if (a * 3 <= b) return 30;
  if (a * 2 <= b) return clampN(r * 90, 30, 60);
  return clampN(30 + r * 60, 60, 90);
}
/**
 * 2회 공격(순발력 비율)·회심의 일격(사기 비율) 확률(%).
 *  3배 초과 100 · 2배 초과 80×비율−140(20~100) · 높으면 18×비율−16(2~20) · 낮으면 1
 */
export function ccRatioChance(mine: number, theirs: number): number {
  const a = Math.max(1, mine), b = Math.max(1, theirs), r = a / b;
  if (a > 3 * b) return 100;
  if (a > 2 * b) return clampN(80 * r - 140, 20, 100);
  if (a > b) return clampN(18 * r - 16, 2, 20);
  return 1;
}
/** 상태 이상에서 첫 턴에 벗어날 확률(%) = 장수 운의 절반. */
export function ccRecoverChance(u: Unit): number {
  return Math.round((u.ability?.luck ?? 60) / 2);
}

/**
 * 물리 피해(조조전 계산을 이 게임 체력 규모에 맞춘 것):
 *  레벨 1당 +1, 공격력 2당 +1, 방어력 2당 −1. 공격·방어에는 각자 서 있는 지형 효율을 곱한다.
 *  병사들의 기본 장비(무기 공격 +20+2×레벨, 갑옷 방어 +10+레벨)를 더해 초반 피해가 0에 붙지 않게 한다.
 */
const envScale = (k: string) => Number((globalThis as { process?: { env?: Record<string, string> } }).process?.env?.[k]) || 0;
/** 이 게임 체력 규모에 맞춘 피해 배율(전 스테이지 자동 플레이로 예전 규칙과 클리어율이 같아지게 맞춘 값). */
export const CC_DAMAGE_SCALE = envScale("CC_SCALE") || 2;
/** 책략 피해 배율. 1.5·1.75로 낮추면 책략에 기대는 스테이지(S1-02·S2-14)의 클리어율이 0~25%로 떨어져 물리와 같은 2로 둔다. */
export const CC_STRATEGY_SCALE = envScale("CC_STRAT") || 2;
export function ccPhysicalBase(attacker: Unit, defender: Unit, atkEff: number, defEff: number, attackMul = 1, defenseIgnore = 0): number {
  const L = Math.max(1, attacker.side === "player" ? attacker.level : attacker.level - 1);
  const weapon = 20 + 2 * L, armor = 10 + Math.max(1, defender.level);
  const atk = (attacker.stats.attack + weapon) * atkEff * attackMul;
  const def = (defender.stats.defense + armor) * defEff * (1 - defenseIgnore);
  return Math.max(1, (L + atk / 2 - def / 2) * CC_DAMAGE_SCALE);
}
/** 책략 피해: 레벨 1당 +1, 정신력 3당 +1, 상대 정신력 3당 −1, 그 값에 책략 위력(100 = 1배)을 곱한다. */
export function ccStrategyBase(caster: Unit, target: Unit, power: number, attackMul = 1): number {
  const L = Math.max(1, caster.side === "player" ? caster.level : caster.level - 1);
  return Math.max(1, (L + 12 + (caster.stats.intellect * attackMul) / 3 - target.stats.spirit / 3) * (power / 100) * CC_STRATEGY_SCALE);
}
