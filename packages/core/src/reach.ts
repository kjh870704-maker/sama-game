/**
 * 공격 범위(사정 모양) — 병종 계열마다 평타가 닿는 칸의 모양이 다르다.
 *
 * - 십자(기본): 상하좌우 거리(맨해튼)가 사거리 안. 보병·창병·궁병·노병·책사·투석·수군 등.
 * - 팔방: 대각선으로 붙은 칸까지 둘레 여덟 칸. 말을 탄 기병·중기병, 몸이 빠른 무도가·산적.
 *
 * 프로필의 range[min,max]는 그대로 두고 모양만 넓힌다. 대각선으로 붙은 칸은 '붙어 있다'(거리 1)로 치며,
 * 넓어진 칸(대각선)으로 친 평타는 정면보다 약하다(EXTENDED_REACH_MUL).
 */
import type { Coord, Unit, UnitClass } from "./types.ts";
import { familyOf } from "./classes.ts";

export type ReachShape = "cross" | "square";

const SHAPE: Partial<Record<UnitClass, ReachShape>> = {
  cavalry: "square", heavyCav: "square", monk: "square", bandit: "square",
};

export function reachShape(unitClass: UnitClass): ReachShape {
  return SHAPE[familyOf(unitClass)] ?? "cross";
}

export const REACH_NAMES: Record<ReachShape, string> = { cross: "십자", square: "팔방(대각선 포함)" };

/** `from`에 선 `unit`의 평타가 `to`에 닿는가. */
export function inReach(unit: Pick<Unit, "unitClass" | "range">, from: Coord, to: Coord): boolean {
  const [min, max] = unit.range;
  if (max <= 0) return false;
  const dx = Math.abs(from.x - to.x), dy = Math.abs(from.y - to.y);
  if (dx === 0 && dy === 0) return false;
  const man = dx + dy, cheb = Math.max(dx, dy);
  if (man >= min && man <= max) return true;
  return reachShape(unit.unitClass) === "square" && cheb >= Math.max(1, min) && cheb <= max;
}

/** 붙어서 싸우는 거리: 대각선으로 맞닿은 칸도 1. 그 밖에는 맨해튼 거리. */
export function engageDistance(a: Coord, b: Coord): number {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
  return dx <= 1 && dy <= 1 ? Math.max(dx, dy) : dx + dy;
}

/** 평타가 닿는 칸들의 상대 좌표(표시용). */
export function reachOffsets(unit: Pick<Unit, "unitClass" | "range">): Coord[] {
  const out: Coord[] = [], r = Math.max(2, unit.range[1] + 1), o = { x: 0, y: 0 };
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (inReach(unit, o, { x, y })) out.push({ x, y });
  return out;
}

/** 넓어진 모양(대각선)으로 닿은 평타는 정면보다 약하다. 기본 십자 사거리 안이면 1. */
export const EXTENDED_REACH_MUL = 0.7;
export function reachMul(attacker: Pick<Unit, "pos" | "range">, to: Coord): number {
  const man = Math.abs(attacker.pos.x - to.x) + Math.abs(attacker.pos.y - to.y);
  return man >= attacker.range[0] && man <= attacker.range[1] ? 1 : EXTENDED_REACH_MUL;
}
