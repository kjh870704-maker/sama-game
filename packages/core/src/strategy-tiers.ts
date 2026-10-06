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

const cache = new Map<string, StrategyDef>();
/** 단계를 적용한 정의. 1단이면 원래 정의를 그대로 돌려준다. */
export function tieredStrategy<T extends StrategyDef>(def: T, tier: StrategyTier): T {
  if (tier === 1) return def;
  const k = `${def.id}:${tier}:${def.power}:${def.mpCost}:${def.radius}:${def.range}`;
  const hit = cache.get(k);
  if (hit) return hit as T;
  const i = tier - 1;
  const wide = tier === 3 && (def.shape === "spread" || def.shape === "cross" || def.shape === "line");
  const out = {
    ...def,
    tier,
    power: Math.round(def.power * POWER[i]!),
    mpCost: Math.ceil(def.mpCost * COST[i]!),
    radius: wide ? def.radius + 1 : def.radius,
    range: tier === 3 && !wide ? def.range + 1 : def.range,
  } as T;
  cache.set(k, out);
  return out;
}
export function evolveStrategy<T extends StrategyDef>(def: T, casterLevel: number): T {
  return tieredStrategy(def, strategyTier(def, casterLevel));
}
