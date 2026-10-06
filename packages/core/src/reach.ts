/**
 * 공격 범위(사정 모양) — 진화할수록 넓어진다.
 *
 * - 진화 전(1단)은 모든 병종이 십자: 상하좌우 거리(맨해튼)가 사거리 안.
 * - 진화하면 계열마다 다르게 넓어진다.
 *   · 팔방(sq): 대각선 칸까지(체비쇼프 거리 sq 이하). 기병·산적·무도가는 2단부터, 보병은 3단부터.
 *   · 직선(line): 상하좌우로 사거리보다 line칸 더. 창병의 긴 찌르기, 궁·노·투석의 먼 사격.
 *
 * 프로필의 range[min,max]는 그대로 두고 모양만 넓힌다. 대각선으로 붙은 칸은 '붙어 있다'(거리 1)로 치며,
 * 넓어진 칸(대각선·직선 연장)으로 친 평타는 정면보다 약하다(EXTENDED_REACH_MUL).
 */
import type { Coord, Unit, UnitClass } from "./types.ts";
import { familyOf, tierOf } from "./classes.ts";

export type ReachShape = "cross" | "square";
/** sq: 대각선까지 닿는 반경(0이면 없음), line: 상하좌우로 사거리보다 더 닿는 칸 수. */
export interface ReachSpec { sq: number; line: number }

type Tiers = [ReachSpec, ReachSpec, ReachSpec, ReachSpec];
const s = (sq: number, line = 0): ReachSpec => ({ sq, line });
const CROSS = s(0);
/** 계열별 1~4단 공격 범위. 없는 계열은 3단부터 팔방(근접) 또는 그대로(원거리). */
const BY_FAMILY: Partial<Record<UnitClass, Tiers>> = {
  infantry: [CROSS, CROSS, s(1), s(1)],
  bandit: [CROSS, s(1), s(1), s(1)],
  monk: [CROSS, s(1), s(1), s(1)],
  spearman: [CROSS, s(0, 1), s(0, 1), s(1, 1)],
  cavalry: [CROSS, s(1), s(1), s(1, 1)],
  heavyCav: [CROSS, s(1), s(1), s(1)],
  archer: [CROSS, s(0, 1), s(0, 1), s(2, 1)],
  crossbow: [CROSS, s(0, 1), s(0, 1), s(0, 2)],
  horseArcher: [CROSS, s(0, 1), s(2, 1), s(2, 1)],
  catapult: [CROSS, CROSS, s(0, 1), s(0, 1)],
  navy: [CROSS, CROSS, s(0, 1), s(1, 1)],
  strategist: [CROSS, CROSS, CROSS, s(1)],
  fengshui: [CROSS, CROSS, CROSS, s(1)],
  shaman: [CROSS, CROSS, CROSS, s(1)],
  maiden: [CROSS, CROSS, CROSS, s(1)],
  taoist: [CROSS, CROSS, CROSS, s(1)],
  engineer: [CROSS, CROSS, CROSS, CROSS],
  ram: [CROSS, CROSS, CROSS, CROSS],
};

export function reachSpec(unitClass: UnitClass): ReachSpec {
  const tier = Math.max(1, Math.min(4, tierOf(unitClass))) - 1;
  const row = BY_FAMILY[familyOf(unitClass)];
  if (row) return row[tier]!;
  return tier >= 2 ? s(1) : CROSS;
}

export function reachShape(unitClass: UnitClass): ReachShape {
  return reachSpec(unitClass).sq > 0 ? "square" : "cross";
}

export const REACH_NAMES: Record<ReachShape, string> = { cross: "십자", square: "팔방(대각선 포함)" };

/** 공격 범위를 한 줄로: 「십자」, 「팔방」, 「십자 · 직선 +1」 등. */
export function reachLabel(unitClass: UnitClass): string {
  const r = reachSpec(unitClass);
  return (r.sq > 0 ? (r.sq > 1 ? "팔방 2칸" : "팔방") : "십자") + (r.line ? ` · 직선 +${r.line}` : "");
}

/** `from`에 선 `unit`의 평타가 `to`에 닿는가. */
export function inReach(unit: Pick<Unit, "unitClass" | "range">, from: Coord, to: Coord): boolean {
  const [min, max] = unit.range;
  if (max <= 0) return false;
  const dx = Math.abs(from.x - to.x), dy = Math.abs(from.y - to.y);
  if (dx === 0 && dy === 0) return false;
  const man = dx + dy, cheb = Math.max(dx, dy);
  if (man >= min && man <= max) return true;
  const r = reachSpec(unit.unitClass);
  if (r.sq > 0 && dx > 0 && dy > 0 && cheb >= Math.max(1, min) && cheb <= r.sq) return true;
  return r.line > 0 && (dx === 0 || dy === 0) && man > max && man <= max + r.line;
}

/** 붙어서 싸우는 거리: 대각선으로 맞닿은 칸도 1. 그 밖에는 맨해튼 거리. */
export function engageDistance(a: Coord, b: Coord): number {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return dx <= 1 && dy <= 1 ? Math.max(dx, dy) : dx + dy;
}

/** 평타가 닿는 칸들의 상대 좌표(표시용). */
export function reachOffsets(unit: Pick<Unit, "unitClass" | "range">): Coord[] {
  const out: Coord[] = [], r = Math.max(2, unit.range[1] + 3), o = { x: 0, y: 0 };
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (inReach(unit, o, { x, y })) out.push({ x, y });
  return out;
}

/** 넓어진 모양(대각선)으로 닿은 평타는 정면보다 약하다. 기본 십자 사거리 안이면 1. */
export const EXTENDED_REACH_MUL = 0.7;
export function reachMul(attacker: Pick<Unit, "pos" | "range">, to: Coord): number {
  const man = Math.abs(attacker.pos.x - to.x) + Math.abs(attacker.pos.y - to.y);
  return man >= attacker.range[0] && man <= attacker.range[1] ? 1 : EXTENDED_REACH_MUL;
}
