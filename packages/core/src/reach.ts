/**
 * 공격 범위(사정 모양) — 근접 병종은 진화하면 팔방까지 넓어진다.
 *
 * - 진화 전(1단)은 모든 병종이 십자: 상하좌우 거리(맨해튼)가 사거리 안.
 * - 근접 병종은 진화하면 팔방(대각선으로 붙은 칸까지)이 된다. 그 이상은 넓히지 않는다.
 *   기병·중기병·산적·무도가는 2단부터, 보병·창병은 3단부터, 책사·술사는 4단에서.
 * - 원거리 병종(궁·노·궁기병·투석·수군)은 모양을 넓히지 않는다. 사거리는 프로필(range) 그대로이며,
 *   궁·노는 진화해도 최대 3칸이다.
 *
 * 대각선으로 붙은 칸은 '붙어 있다'(거리 1)로 치며, 대각선으로 친 평타는 정면보다 약하다(EXTENDED_REACH_MUL).
 */
import type { Coord, Unit, UnitClass } from "./types.ts";
import { familyOf, tierOf } from "./classes.ts";

export type ReachShape = "cross" | "square";
/** sq: 대각선까지 닿는 반경(0이면 없음), line: 상하좌우로 사거리보다 더 닿는 칸 수(지금은 쓰지 않는다). */
export interface ReachSpec { sq: number; line: number }

type Tiers = [ReachSpec, ReachSpec, ReachSpec, ReachSpec];
const s = (sq: number, line = 0): ReachSpec => ({ sq, line });
const CROSS = s(0), EIGHT = s(1);
/** 계열별 1~4단 공격 범위. 표에 없는 계열은 3단부터 팔방(근접) 또는 십자 그대로. */
const BY_FAMILY: Partial<Record<UnitClass, Tiers>> = {
  infantry: [CROSS, CROSS, EIGHT, EIGHT],
  spearman: [CROSS, CROSS, EIGHT, EIGHT],
  bandit: [CROSS, EIGHT, EIGHT, EIGHT],
  monk: [CROSS, EIGHT, EIGHT, EIGHT],
  cavalry: [CROSS, EIGHT, EIGHT, EIGHT],
  heavyCav: [CROSS, EIGHT, EIGHT, EIGHT],
  archer: [CROSS, CROSS, CROSS, CROSS],
  crossbow: [CROSS, CROSS, CROSS, CROSS],
  horseArcher: [CROSS, CROSS, CROSS, CROSS],
  catapult: [CROSS, CROSS, CROSS, CROSS],
  navy: [CROSS, CROSS, CROSS, CROSS],
  strategist: [CROSS, CROSS, CROSS, EIGHT],
  fengshui: [CROSS, CROSS, CROSS, EIGHT],
  shaman: [CROSS, CROSS, CROSS, EIGHT],
  maiden: [CROSS, CROSS, CROSS, EIGHT],
  taoist: [CROSS, CROSS, CROSS, EIGHT],
  engineer: [CROSS, CROSS, CROSS, CROSS],
  ram: [CROSS, CROSS, CROSS, CROSS],
};

export function reachSpec(unitClass: UnitClass): ReachSpec {
  const tier = Math.max(1, Math.min(4, tierOf(unitClass))) - 1;
  const row = BY_FAMILY[familyOf(unitClass)];
  if (row) return row[tier]!;
  return tier >= 2 ? EIGHT : CROSS;
}

export function reachShape(unitClass: UnitClass): ReachShape {
  return reachSpec(unitClass).sq > 0 ? "square" : "cross";
}

export const REACH_NAMES: Record<ReachShape, string> = { cross: "십자", square: "팔방(대각선 포함)" };

/** 공격 범위를 한 줄로: 「십자」, 「팔방」, 「십자 · 직선 +1」 등. */
export function reachLabel(unitClass: UnitClass): string {
  const r = reachSpec(unitClass);
  return (r.sq > 0 ? "팔방" : "십자") + (r.line ? ` · 직선 +${r.line}` : "");
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
