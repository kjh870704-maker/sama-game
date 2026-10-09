/**
 * 전투 수식. 모든 수치 밸런스의 단일 출처(single source of truth).
 * 상세 근거는 docs/tech/전투규칙-사양.md 참조.
 */
import type { Unit, UnitClass, DamageResult, DamageBreakdown, StrategyDef } from "./types.ts";
import type { BattleMap } from "./grid.ts";
import { manhattan } from "./grid.ts";
import { engageDistance, reachMul } from "./reach.ts";
import type { Rng } from "./rng.ts";
import { applyTraitHooks, capHit, combine, type AttackKind, type DamageContext } from "./traits.ts";
import { familyOf } from "./classes.ts";
import { hasTrait, traitParam } from "./traits.ts";
import { tacticMultiplier } from "./tactics.ts";
import { ccHitChance, ccRatioChance, ccPhysicalBase, ccStrategyBase, terrainEfficiency } from "./cc-rules.ts";

/** 최소 보장 피해. 방어력이 아무리 높아도 이만큼은 들어간다. */
export const MIN_DAMAGE = 1;
export const CRITICAL_MULTIPLIER = 1.5;
export const BASE_ACCURACY = 90;

/**
 * 병종 상성표 [공격자][방어자] → 배율.
 * 조조전 계열의 가위바위보 구조를 따른다:
 *   창병 > 기병 > 궁병/책사 > 보병 > 창병
 */
const MATCHUP: Partial<Record<UnitClass, Partial<Record<UnitClass, number>>>> = {
  infantry:   { spearman: 1.3, catapult: 1.3, engineer: 1.5, cavalry: 0.8, heavyCav: 0.7 },
  spearman:   { cavalry: 1.5, heavyCav: 1.5, infantry: 0.8, archer: 0.9 },
  cavalry:    { archer: 1.4, crossbow: 1.4, strategist: 1.4, fengshui: 1.4, catapult: 1.3, spearman: 0.6 },
  heavyCav:   { archer: 1.4, crossbow: 1.4, strategist: 1.5, fengshui: 1.5, catapult: 1.4, spearman: 0.5 },
  archer:     { infantry: 1.2, spearman: 1.2, navy: 1.3, cavalry: 0.9 },
  crossbow:   { heavyCav: 1.3, infantry: 1.2, cavalry: 1.2, strategist: 0.9 },
  strategist: { infantry: 1.1, spearman: 1.1, heavyCav: 1.2 },
  fengshui:   { infantry: 1.1, spearman: 1.1, heavyCav: 1.2 },
  catapult:   { infantry: 1.3, spearman: 1.3, crossbow: 1.2, cavalry: 0.7 },
  ram: {infantry:.7,cavalry:.5,heavyCav:.5},
  engineer:   {},
  navy:       { infantry: 1.2, cavalry: 1.3 },
  civilian:   {},
  shaman: { infantry: 1.1, spearman: 1.1, heavyCav: 1.2 },
  maiden:   { infantry: 1.1, spearman: 1.1, heavyCav: 1.2 },
  taoist: { infantry: 1.1, spearman: 1.1, heavyCav: 1.2 },
  monk:   { spearman: 1.3, catapult: 1.3, engineer: 1.5, cavalry: 0.8, heavyCav: 0.7 },
  horseArcher:    { archer: 1.4, crossbow: 1.4, strategist: 1.4, fengshui: 1.4, catapult: 1.3, spearman: 0.6 },
  bandit:   { spearman: 1.3, catapult: 1.3, engineer: 1.5, cavalry: 0.8, heavyCav: 0.7 },
};

// New troop families inherit the established defensive counters.
for(const row of Object.values(MATCHUP))for(const [kind,base] of Object.entries({shaman:'strategist',maiden:'fengshui',taoist:'strategist',monk:'infantry',horseArcher:'cavalry',bandit:'infantry'}))if(row[base as UnitClass]!==undefined)row[kind as UnitClass]=row[base as UnitClass]!;

export function matchupMultiplier(attacker: UnitClass, defender: UnitClass): number {
  const row = MATCHUP[attacker] ?? MATCHUP[familyOf(attacker)] ?? {};
  return row[defender] ?? row[familyOf(defender)] ?? 1.0;
}
/** 균형 규칙 6은 상성을 절반만 살린다(1.5→1.25, 0.5→0.75): 가위바위보는 남기되 한 번의 상성으로 승부가 끝나지 않게. */
export function effectiveMatchup(attacker: Unit, defender: Unit): number {
  const m = matchupMultiplier(attacker.unitClass, defender.unitClass);
  return attacker.ratioRules ? 1 + (m - 1) * 0.5 : m;
}

/** 사기 보정. 사기 0 → 0.8배, 50 → 1.0배, 100 → 1.2배 */
export function moraleMultiplier(morale: number): number {
  return 0.8 + (clamp(morale, 0, 100) / 100) * 0.4;
}

/** 고저차 보정. 한 칸 높을 때마다 +10%, 낮을 때마다 -10% (±30% 상한) */
export function elevationMultiplier(attackerHeight: number, defenderHeight: number): number {
  return clamp(1 + 0.1 * (attackerHeight - defenderHeight), 0.7, 1.3);
}

export function createDamageContext(
  attacker: Unit,
  defender: Unit,
  kind: AttackKind,
): DamageContext {
  return {
    attacker,
    defender,
    kind,
    distance: engageDistance(attacker.pos, defender.pos),
    attackMul: (attacker.statuses.some(s=>s.kind==='weaken')?(attacker.statuses.some(s=>s.kind==='rally')?1.12:1)*.85:attacker.statuses.some(s=>s.kind==='rally')?1.12:1)*(kind==='physical'?reachMul(attacker,defender.pos):1),
    // 파갑은 받는 피해를 15% 늘린다(감소율을 음수 쪽으로 민다). 파갑이 없으면 예전 값 그대로(저장 재생이 달라지지 않게).
    reduction: defender.statuses.some(s=>s.kind==='breach')?1-(1-(defender.statuses.some(s=>s.kind==='guard')?.15:0))*1.15:defender.statuses.some(s=>s.kind==='guard')?.15:0,
    accuracyMod: 0,
    defenseIgnore: 0,
    criticalChance: 0,
    immune: false,
    suppressCounter: false,
    alwaysHit: false,
    reflect: 0,
    lifesteal: 0,
    instantKillChance: 0,
  };
}

/**
 * 명중률 (%).
 *   기본 90 + (공격자 순발력 - 방어자 순발력) * 0.5 - 방어자 지형 회피 + 특성 보정
 */
export function accuracy(ctx: DamageContext, map: BattleMap): number {
  // 조조전 규칙: 물리는 순발력 비율, 책략은 (정신력+사기) 비율로 명중을 정한다. 지형 회피는 지형 효율이 대신한다.
  if (ctx.attacker.ccRules) {
    const a = ctx.attacker.stats, d = ctx.defender.stats;
    const base = ctx.kind === "strategy" ? ccHitChance(a.spirit + a.morale, d.spirit + d.morale) : ccHitChance(a.agility, d.agility);
    return clamp(base + ctx.accuracyMod, 5, 100);
  }
  const agiDiff = ctx.attacker.stats.agility - ctx.defender.stats.agility;
  const raw =
    BASE_ACCURACY + agiDiff * 0.5 - map.evasionBonus(ctx.defender.pos) + ctx.accuracyMod;
  return clamp(raw, 5, 100);
}

/** 물리 피해의 분산 전 값과 지형 배율(내역 표시용). 실제 계산·AI 추정·공격 미리보기가 같은 계수를 쓴다. */
function physicalRaw(attacker: Unit, defender: Unit, map: BattleMap, ctx: DamageContext, counter: boolean): { base: number; matchup: number; terrain: number; elevation: number; morale: number; tactic: ReturnType<typeof tacticMultiplier> } {
  const matchup = effectiveMatchup(attacker, defender);
  const elevation = elevationMultiplier(map.heightAt(attacker.pos), map.heightAt(defender.pos));
  const tactic = tacticMultiplier(attacker, defender, map, counter);
  if (attacker.ccRules) {
    const atkEff = terrainEfficiency(attacker.unitClass, map.tileAt(attacker.pos).terrain);
    const defEff = terrainEfficiency(defender.unitClass, map.tileAt(defender.pos).terrain);
    const base = ccPhysicalBase(attacker, defender, atkEff, defEff, ctx.attackMul, ctx.defenseIgnore);
    return { base, matchup, terrain: atkEff / defEff, elevation, morale: 1, tactic };
  }
  const atk = attacker.stats.attack * ctx.attackMul;
  const def = defender.stats.defense * (1 - ctx.defenseIgnore);
  return { base: Math.max(MIN_DAMAGE, atk - def), matchup, terrain: map.terrainAffinity(attacker.unitClass, attacker.pos), elevation, morale: moraleMultiplier(attacker.stats.morale), tactic };
}
/** 회심 확률(%): 조조전 규칙은 사기 비율에 특성 보정을 더한다. 이름난 장수는 무력·운에 따른 보너스가 더해진다(물리 공격만). */
function criticalChanceOf(ctx: DamageContext): number {
  const officer = ctx.kind === "physical" ? ctx.attacker.officerCrit ?? 0 : 0;
  return ctx.attacker.ccRules ? Math.min(100, ccRatioChance(ctx.attacker.stats.morale, ctx.defender.stats.morale) + ctx.criticalChance + officer) : Math.min(100, ctx.criticalChance + officer);
}
/** 물리 공격의 회심 확률(%) — 공격 미리보기용. */
export function criticalChance(attacker: Unit, defender: Unit): number {
  const ctx = createDamageContext(attacker, defender, "physical");
  applyTraitHooks(ctx);
  return Math.round(criticalChanceOf(ctx));
}
/** 2회 공격 확률(%): 조조전 규칙에서만, 순발력 비율로. */
export function doubleAttackChance(attacker: Unit, defender: Unit): number {
  return attacker.ccRules ? ccRatioChance(attacker.stats.agility, defender.stats.agility) : 0;
}

/** 물리 공격 피해 계산. */
export function computePhysical(
  attacker: Unit,
  defender: Unit,
  map: BattleMap,
  rng: Rng,
  opts: { isCounter?: boolean } = {},
): DamageResult {
  const ctx = createDamageContext(attacker, defender, "physical");
  applyTraitHooks(ctx);

  if (ctx.immune) return miss(attacker, defender, true);

  const hit = ctx.alwaysHit || rng.chance(accuracy(ctx, map));
  if (!hit) return miss(attacker, defender, false);

  if (ctx.instantKillChance > 0 && rng.chance(ctx.instantKillChance)) {
    return {
      attacker: attacker.id,
      defender: defender.id,
      hit: true,
      damage: defender.hp,
      critical: true,
      lethal: true,
      breakdown: flatBreakdown(defender.hp),
    };
  }

  const { base, matchup, terrain, elevation, morale, tactic } = physicalRaw(attacker, defender, map, ctx, !!opts.isCounter);
  const variance = 0.95 + rng.next() * 0.1;
  const critChance = criticalChanceOf(ctx);
  const critical = critChance > 0 && rng.chance(critChance);

  // 조조전 규칙의 지형 효율은 base에 이미 들어 있다(terrain은 내역 표시용 비율).
  let dmg = base * matchup * (attacker.ccRules ? 1 : terrain) * elevation * morale * variance * (1 - ctx.reduction) * tactic.mul;
  if (critical) dmg *= CRITICAL_MULTIPLIER;
  if (opts.isCounter) dmg *= counterMultiplier(attacker);

  const damage = Math.max(MIN_DAMAGE, Math.round(dmg));
  return {
    attacker: attacker.id,
    defender: defender.id,
    hit: true,
    damage,
    critical,
    lethal: damage >= defender.hp,
    breakdown: { base, matchup, terrain, elevation, morale, variance, reduction: ctx.reduction },
    ...(tactic.name ? { tactic: tactic.name } : {}),
  };
}

/** 책략 피해 계산. 지력 기반, 정신력으로 경감. */
export function computeStrategy(
  caster: Unit,
  target: Unit,
  strategy: StrategyDef,
  map: BattleMap,
  rng: Rng,
): DamageResult {
  const ctx = strategyContext(caster, target, strategy);
  applyTraitHooks(ctx);

  if (ctx.immune) return miss(caster, target, true);

  const hit = ctx.alwaysHit || rng.chance(accuracy(ctx, map));
  if (!hit) return miss(caster, target, false);

  const base = strategyBase(caster, target, strategy, ctx.attackMul);

  const elemental = elementalMultiplier(strategy, map, target);
  const variance = 0.95 + rng.next() * 0.1;
  const damage = Math.max(
    MIN_DAMAGE,
    Math.round(base * elemental * variance * (1 - ctx.reduction)),
  );

  return {
    attacker: caster.id,
    defender: target.id,
    hit: true,
    damage,
    critical: false,
    lethal: damage >= target.hp,
    breakdown: {
      base,
      matchup: elemental,
      terrain: 1,
      elevation: 1,
      morale: 1,
      variance,
      reduction: ctx.reduction,
    },
  };
}

/**
 * 책략 기본 피해: 지력을 따라 늘고, 상대의 정신이 높을수록 비율로 줄어든다.
 *   지력 × 위력 × 1.2 × 지력 / (지력 + 정신)
 * 지력과 정신이 같으면 지력 × 위력 × 0.6. 빼기식과 달리 지력이 낮아도 0으로 꺾이지 않고,
 * 지력이 오르는 만큼 꾸준히(제곱에 가깝게) 강해진다.
 */
/**
 * 책략 한 번의 피해 맥락. 병종 특수 스킬(physical)은 물리 공격처럼 순발력으로 명중을 겨루고 물리 방어 특성을 받는다.
 * 다만 기본 공격 사거리 밖의 칸을 쳐도 감쇠하지 않는다(스킬 사거리로 이미 정해져 있다).
 */
function strategyContext(caster: Unit, target: Unit, strategy: StrategyDef): DamageContext {
  if (!strategy.physical) return createDamageContext(caster, target, "strategy");
  const ctx = createDamageContext(caster, target, "physical");
  const reach = reachMul(caster, target.pos);
  if (reach > 0) ctx.attackMul /= reach;
  return ctx;
}

export function strategyBase(caster: Unit, target: Unit, strategy: StrategyDef, attackMul = 1): number {
  if (strategy.physical) {
    if (caster.ccRules) return Math.max(1, ccPhysicalBase(caster, target, 1, 1, attackMul) * (strategy.power / 100));
    const atk = Math.max(1, caster.stats.attack), def = Math.max(1, target.stats.defense);
    return Math.max(MIN_DAMAGE, atk * (strategy.power / 100) * attackMul * 1.2 * atk / (atk + def));
  }
  // 균형 규칙 6: 맵 전체를 치는 책략은 한 대상에게 절반만(모든 적을 한꺼번에 치므로).
  if (caster.ccRules) return ccStrategyBase(caster, target, strategy.power, attackMul) * (caster.ratioRules && strategy.shape === "global" ? 0.5 : 1);
  // 옛 규칙 전투(저장 재생)는 예전 빼기식 그대로.
  if (!caster.classTactics) return Math.max(MIN_DAMAGE, caster.stats.intellect * (strategy.power / 100) * attackMul - target.stats.spirit * 0.5);
  const int = Math.max(1, caster.stats.intellect), spirit = Math.max(1, target.stats.spirit);
  return Math.max(MIN_DAMAGE, int * (strategy.power / 100) * attackMul * 1.2 * int / (int + spirit));
}

/**
 * 회복량: 책략 위력의 절반에 지력의 0.6배를 더하고, 회복 특성(healPower %)을 곱한다.
 * 지력 40이면 소회복(위력 25) 약 36, 지력 100이면 약 72.
 */
export function healAmount(power: number, intellect: number, healPower = 0): number {
  return Math.max(1, Math.round((power * 0.5 + Math.max(0, intellect) * 0.6) * (1 + healPower / 100)));
}

/** 계열 × 대상 지형 보정. 화계는 숲에서, 수계는 수상에서 강해진다. */
function elementalMultiplier(strategy: StrategyDef, map: BattleMap, target: Unit): number {
  const terrain = map.tileAt(target.pos).terrain;
  switch (strategy.element) {
    case "fire": {
      // 등갑병: 기름 먹인 등나무 갑옷은 칼은 막아도 불에는 약하다.
      const burn = hasTrait(target, "fireWeakness") ? 1 + traitParam(target, "fireWeakness") / 100 : 1;
      return burn * (terrain === "forest" ? 1.4 : terrain === "water" || terrain === "rapids" ? 0.6 : 1.0);
    }
    case "water":
      return terrain === "water" || terrain === "rapids" ? 1.3 : 1.0;
    case "thunder":
      return terrain === "water" || terrain === "rapids" ? 1.3 : 1.0;
    case "earth":
      return terrain === "mountain" || terrain === "hill" ? 1.2 : 1.0;
    case "wind":
      return 1.0; // 지형 무관 — 범용 딜링 계열 (사마의 주력)
    case "support":
    case "physical":
      return 1.0;
  }
}

function counterMultiplier(attacker: Unit): number {
  const boost = attacker.traitParams["counterBoost"];
  return attacker.traits.includes("counterBoost") ? 1 + (boost ?? 0) / 100 : 1;
}

function miss(attacker: Unit, defender: Unit, immune: boolean): DamageResult {
  return {
    attacker: attacker.id,
    defender: defender.id,
    hit: false,
    damage: 0,
    critical: false,
    lethal: false,
    breakdown: { ...flatBreakdown(0), reduction: immune ? 1 : 0 },
  };
}

function flatBreakdown(base: number): DamageBreakdown {
  return { base, matchup: 1, terrain: 1, elevation: 1, morale: 1, variance: 1, reduction: 0 };
}

/**
 * RNG를 소비하지 않는 기대 피해 추정. AI의 행동 선택에만 쓴다.
 * 실제 피해와 같은 계수를 통과하되 분산은 1.0, 회심은 기대값으로 반영하고
 * 마지막에 명중 확률을 곱한다.
 */
export function estimatePhysical(attacker: Unit, defender: Unit, map: BattleMap): number {
  const ctx = createDamageContext(attacker, defender, "physical");
  applyTraitHooks(ctx);
  if (ctx.immune) return 0;

  const r = physicalRaw(attacker, defender, map, ctx, false);
  const raw =
    r.base * r.matchup * (attacker.ccRules ? 1 : r.terrain) * r.elevation * r.morale *
    (1 - ctx.reduction) * r.tactic.mul *
    (1 + (Math.min(100, criticalChanceOf(ctx)) / 100) * (CRITICAL_MULTIPLIER - 1)) *
    (1 + doubleAttackChance(attacker, defender) / 100);

  const hitRate = ctx.alwaysHit ? 1 : accuracy(ctx, map) / 100;
  return Math.max(0, capHit(defender, raw) * hitRate);
}

export function estimateStrategy(
  caster: Unit,
  target: Unit,
  strategy: StrategyDef,
  map: BattleMap,
): number {
  const ctx = strategyContext(caster, target, strategy);
  applyTraitHooks(ctx);
  if (ctx.immune) return 0;

  const base = strategyBase(caster, target, strategy, ctx.attackMul);
  const raw = capHit(target, base * elementalMultiplier(strategy, map, target) * (1 - ctx.reduction));
  const hitRate = ctx.alwaysHit ? 1 : accuracy(ctx, map) / 100;
  return Math.max(0, raw * hitRate);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export { combine };

/** What the player sees before attacking: hit chance and damage on a normal hit,
 * plus the counterattack if the defender survives and can answer. No RNG is drawn. */
export interface AttackPreview { hit: number; damage: number; lethal: boolean; counter?: { hit: number; damage: number } }
function hitPreview(attacker: Unit, defender: Unit, map: BattleMap, counter = false): { hit: number; damage: number } {
  const ctx = createDamageContext(attacker, defender, "physical");
  applyTraitHooks(ctx);
  if (ctx.immune) return { hit: 0, damage: 0 };
  const r = physicalRaw(attacker, defender, map, ctx, counter);
  const dmg = r.base * r.matchup * (attacker.ccRules ? 1 : r.terrain) * r.elevation * r.morale * (1 - ctx.reduction) * r.tactic.mul;
  return { hit: ctx.alwaysHit ? 100 : Math.round(accuracy(ctx, map)), damage: Math.max(MIN_DAMAGE, Math.round(dmg)) };
}
export function previewAttack(attacker: Unit, defender: Unit, map: BattleMap, canCounter: boolean): AttackPreview {
  const strike = hitPreview(attacker, defender, map), lethal = strike.hit > 0 && strike.damage >= defender.hp;
  if (!canCounter || lethal) return { ...strike, lethal };
  const back = hitPreview(defender, attacker, map, true);
  return { ...strike, lethal, counter: { hit: back.hit, damage: Math.max(MIN_DAMAGE, Math.round(back.damage * counterMultiplier(defender))) } };
}
