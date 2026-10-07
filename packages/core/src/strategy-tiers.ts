import type { StrategyDef } from "./types.ts";

/**
 * 책략 3단 진화. 배운 레벨(learnLevel)에서 시전자 레벨이 오를수록
 * 1단 기본 → 2단 숙련 → 3단 극의로 바뀐다. 위력과 소모 MP가 함께 오르고,
 * 3단은 효과 범위(또는 사거리)가 한 칸 넓어진다.
 * learnLevel이 없는 정의(옛 장 전용 책략)는 진화하지 않는다.
 */
export type StrategyTier = 1 | 2 | 3;
/** 배운 레벨에서 몇 레벨 위에 각 단계가 열리는가 */
export const STRATEGY_TIER_STEPS: readonly [number, number] = [6, 14];
export const STRATEGY_TIER_NAMES: Record<StrategyTier, string> = { 1: "기본", 2: "숙련", 3: "극의" };
const POWER = [1, 1.25, 1.55] as const;
const COST = [1, 1.3, 1.6] as const;

export function strategyTier(def: StrategyDef, casterLevel: number): StrategyTier {
  if (def.learnLevel === undefined) return 1;
  const over = casterLevel - def.learnLevel;
  return over >= STRATEGY_TIER_STEPS[1] ? 3 : over >= STRATEGY_TIER_STEPS[0] ? 2 : 1;
}
/** 단계가 열리는 시전자 레벨 */
export function strategyTierLevel(def: StrategyDef, tier: StrategyTier): number {
  const base = def.learnLevel ?? 1;
  return tier === 1 ? base : base + STRATEGY_TIER_STEPS[tier - 2]!;
}

/**
 * 책략 범위 상한: 넓게 쓸어 버리는 책략이 없도록 모양마다 크기를 묶는다.
 * 주변·십자는 반경 1(5칸), 직선은 3칸, 시전 사거리는 한 부대 5 · 범위 책략 4. 전 맵(global) 책략은 그대로.
 */
export const MAX_SINGLE_RANGE = 5;
export const MAX_AREA_RANGE = 4;
export function capArea<T extends StrategyDef>(def: T): T {
  if (def.shape === "global") return def;
  const radius = def.shape === "line" ? Math.min(def.radius, 2) : def.shape === "single" ? 0 : Math.min(def.radius, 1);
  const range = Math.min(def.range, def.shape === "single" ? MAX_SINGLE_RANGE : MAX_AREA_RANGE);
  if (radius === def.radius && range === def.range) return def;
  // 범위를 줄인 만큼 위력을 조금 올려 준다(반경 한 칸 줄 때마다 +15%).
  const shrunk = def.radius - radius;
  return { ...def, radius, range, power: shrunk > 0 ? Math.round(def.power * (1 + 0.15 * shrunk)) : def.power };
}

const cache = new Map<string, StrategyDef>();
/** 단계를 적용한 정의. 1단이면 원래 정의를 그대로 돌려준다. */
export function tieredStrategy<T extends StrategyDef>(def: T, tier: StrategyTier): T {
  if (tier === 1) return def;
  const k = `${def.id}:${tier}:${def.power}:${def.mpCost}:${def.radius}:${def.range}`;
  const hit = cache.get(k);
  if (hit) return hit as T;
  const i = tier - 1;
  // 3단에서도 효과 범위는 넓히지 않는다(capArea 상한 유지). 한 부대 책략만 사거리가 한 칸 늘어난다(최대 5).
  const out = {
    ...def,
    tier,
    power: Math.round(def.power * POWER[i]!),
    mpCost: Math.ceil(def.mpCost * COST[i]!),
    range: tier === 3 && def.shape === "single" && !def.physical ? Math.max(def.range, Math.min(MAX_SINGLE_RANGE, def.range + 1)) : def.range,
  } as T;
  cache.set(k, out);
  return out;
}
export function evolveStrategy<T extends StrategyDef>(def: T, casterLevel: number): T {
  return tieredStrategy(def, strategyTier(def, casterLevel));
}
