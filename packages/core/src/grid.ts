import type { Coord, Tile, TerrainKind, UnitClass, Unit } from "./types.ts";
import { familyOf } from "./classes.ts";

export const key = (c: Coord): string => `${c.x},${c.y}`;
export const manhattan = (a: Coord, b: Coord): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const sameCoord = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

const NEIGHBORS: readonly Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export const adjacent = (c: Coord): Coord[] =>
  NEIGHBORS.map((d) => ({ x: c.x + d.x, y: c.y + d.y }));

/** 병종별 지형 이동 비용. Infinity = 진입 불가.
 * 산지: 경기병·궁기병은 6(사실상 한 칸), 중기병·공성은 진입 불가.
 * 급류: 수군도 3이 들어 물살에 발이 묶인다. 절벽은 모든 병종이 넘지 못한다. */
const MOVE_COST: Partial<Record<UnitClass, Partial<Record<TerrainKind, number>>>> = {
  infantry:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  spearman:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  cavalry:    { plain: 1, road: 1, forest: 3, hill: 3, mountain: 6, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 4, plank: 3, ford: 2 },
  heavyCav:   { plain: 1, road: 1, forest: 4, hill: 4, mountain: Infinity, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: Infinity, plank: Infinity, ford: 3 },
  archer:     { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  crossbow:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 4, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  strategist: { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  fengshui:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  ram: {plain:2,road:1,forest:4,hill:4,mountain:Infinity,water:Infinity,rapids:Infinity,bridge:2,fort:1,gate:1, cliff: Infinity, marsh: Infinity, plank: Infinity, ford: Infinity },
  catapult:   { plain: 2, road: 1, forest: 4, hill: 4, mountain: Infinity, water: Infinity, rapids: Infinity, bridge: 2, fort: 1, gate: 1, cliff: Infinity, marsh: Infinity, plank: Infinity, ford: Infinity },
  engineer:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  navy:       { plain: Infinity, road: Infinity, forest: Infinity, hill: Infinity, mountain: Infinity, water: 1, rapids: 3, bridge: Infinity, fort: Infinity, gate: Infinity, cliff: Infinity, marsh: 2, plank: Infinity, ford: 2 },
  civilian:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  shaman: { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  maiden:   { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  taoist: { plain: 1, road: 1, forest: 2, hill: 2, mountain: 3, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 3, plank: 2, ford: 3 },
  monk:   { plain: 1, road: 1, forest: 1, hill: 2, mountain: 2, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 2, plank: 1, ford: 2 },
  horseArcher:    { plain: 1, road: 1, forest: 3, hill: 3, mountain: 6, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 4, plank: 3, ford: 2 },
  bandit:   { plain: 1, road: 1, forest: 1, hill: 2, mountain: 2, water: Infinity, rapids: Infinity, bridge: 1, fort: 1, gate: 1, cliff: Infinity, marsh: 2, plank: 1, ford: 2 },
};

/** 병종 × 지형 전투 상성 계수 (공격 위력 배율). */
const TERRAIN_AFFINITY: Partial<Record<UnitClass, Partial<Record<TerrainKind, number>>>> = {
  infantry:   { plain: 1.0, forest: 1.1, mountain: 1.0, hill: 1.05, fort: 1.1 },
  spearman:   { plain: 1.0, forest: 1.0, mountain: 1.1, hill: 1.2, fort: 1.1 },
  cavalry:    { plain: 1.2, road: 1.2, forest: 0.8, mountain: 0.6, hill: 0.8, marsh: 0.7, ford: 0.9, plank: 0.8 },
  heavyCav:   { plain: 1.25, road: 1.2, forest: 0.7, mountain: 0.5, hill: 0.7, ford: 0.8 },
  archer:     { plain: 1.0, forest: 1.1, mountain: 1.2, hill: 1.15, marsh: 1.1 },
  crossbow:   { plain: 1.05, forest: 1.0, mountain: 1.1, hill: 1.1, fort: 1.2 },
  strategist: { plain: 1.0, forest: 1.05, mountain: 1.05, hill: 1.05 },
  fengshui:   { plain: 1.0, forest: 1.05, mountain: 1.05, hill: 1.05 },
  ram: {plain:1,road:1,fort:1},
  catapult:   { plain: 1.1, road: 1.1, hill: 1.15, fort: 1.0 },
  engineer:   { plain: 1.0 },
  navy:       { water: 1.3, rapids: 1.0, marsh: 0.9, ford: 0.9 },
  civilian:   { plain: 0.5 },
  shaman: { plain: 1.0, forest: 1.05, mountain: 1.05, hill: 1.05 },
  maiden:   { plain: 1.0, forest: 1.05, mountain: 1.05, hill: 1.05 },
  taoist: { plain: 1.0, forest: 1.05, mountain: 1.05, hill: 1.05 },
  monk:   { plain: 1.0, forest: 1.1, mountain: 1.0, hill: 1.05, fort: 1.1 },
  horseArcher:    { plain: 1.2, road: 1.2, forest: 0.8, mountain: 0.6, hill: 0.8, marsh: 0.7, ford: 0.9 },
  bandit:   { plain: 1.0, forest: 1.3, mountain: 1.25, hill: 1.05, fort: 1.1, marsh: 1.2 },
};

/** 회피 보너스 (백분율 포인트). 방어자가 서 있는 지형. */
const TERRAIN_EVASION: Partial<Record<TerrainKind, number>> = {
  forest: 15,
  mountain: 20,
  hill: 10,
  fort: 10,
  rapids: -5,
  marsh: 15,   // 갈대 속 은폐
  plank: -10,  // 벼랑길에 노출
  ford: -10,   // 물살에 발이 묶임
};

export class BattleMap {
  readonly width: number;
  readonly height: number;
  private readonly tiles: Tile[];
  /** 이름 붙은 영역 (승리 조건 · 이벤트 트리거 대상) */
  readonly regions: Map<string, Coord[]>;
  /** 넓힌 전장: 모든 부대의 이동력 보정(거리가 늘어난 만큼) */
  moveBonus = 0;

  constructor(width: number, height: number, tiles: Tile[], regions: Map<string, Coord[]> = new Map()) {
    if (tiles.length !== width * height) {
      throw new Error(`BattleMap: 타일 수 불일치 (기대 ${width * height}, 실제 ${tiles.length})`);
    }
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.regions = regions;
  }

  inBounds(c: Coord): boolean {
    return c.x >= 0 && c.y >= 0 && c.x < this.width && c.y < this.height;
  }

  tileAt(c: Coord): Tile {
    if (!this.inBounds(c)) throw new Error(`BattleMap: 범위 밖 좌표 ${key(c)}`);
    return this.tiles[c.y * this.width + c.x]!;
  }

  moveCost(unitClass: UnitClass, c: Coord, ignoreRough = false): number {
    const t = this.tileAt(c);
    const cost = (MOVE_COST[unitClass] ?? MOVE_COST[familyOf(unitClass)]!)[t.terrain] ?? Infinity;
    // 험로 이동 특성: 유한한 비용은 모두 1로 압축
    if (ignoreRough && Number.isFinite(cost)) return 1;
    return cost;
  }

  terrainAffinity(unitClass: UnitClass, c: Coord): number {
    return (TERRAIN_AFFINITY[unitClass] ?? TERRAIN_AFFINITY[familyOf(unitClass)]!)[this.tileAt(c).terrain] ?? 1.0;
  }

  evasionBonus(c: Coord): number {
    return TERRAIN_EVASION[this.tileAt(c).terrain] ?? 0;
  }

  heightAt(c: Coord): number {
    return this.tileAt(c).height;
  }

  regionCoords(name: string): Coord[] {
    const r = this.regions.get(name);
    if (!r) throw new Error(`BattleMap: 정의되지 않은 영역 "${name}"`);
    return r;
  }

  /**
   * 목표 지점들로부터의 실제 이동 거리 장(場). (다익스트라, 유닛 무시)
   *
   * AI의 전진을 맨해튼 거리로 재면 벽을 돌아가야 하는 지형에서 지역 최소값에
   * 갇힌다 — 우회로의 모든 칸이 목표와의 직선 거리가 "더 멀어" 보이기 때문이다.
   * 실제로 S1-04(벽 뒤 어전)에서 유닛이 52턴을 제자리에 서 있었다.
   * 유닛 점유는 넣지 않는다. 장은 지형만 반영해야 턴마다 흔들리지 않는다.
   */
  travelField(unitClass: UnitClass, goals: Coord[], ignoreRough = false): Map<string, number> {
    const dist = new Map<string, number>();
    const queue: Array<{ c: Coord; d: number }> = [];
    for (const g of goals) {
      if (!this.inBounds(g)) continue;
      dist.set(key(g), 0);
      queue.push({ c: g, d: 0 });
    }

    while (queue.length > 0) {
      queue.sort((a, b) => a.d - b.d);
      const { c, d } = queue.shift()!;
      if (d > (dist.get(key(c)) ?? Infinity)) continue;

      // 진입 비용은 "들어가는 칸"의 비용이다. 장은 목표에서 거꾸로 퍼지므로
      // 이웃 n에서 c로 들어오는 비용, 즉 c의 비용을 더한다.
      const cost = this.moveCost(unitClass, c, ignoreRough);
      if (!Number.isFinite(cost)) continue;

      for (const n of adjacent(c)) {
        if (!this.inBounds(n)) continue;
        if (!Number.isFinite(this.moveCost(unitClass, n, ignoreRough))) continue;

        const nd = d + cost;
        if (nd < (dist.get(key(n)) ?? Infinity)) {
          dist.set(key(n), nd);
          queue.push({ c: n, d: nd });
        }
      }
    }
    return dist;
  }

  /**
   * 이동 가능 범위 계산 (다익스트라).
   * 적 유닛이 점유한 타일은 통과 불가, 아군 점유 타일은 통과 가능하되 정지 불가.
   */
  reachable(unit: Unit, occupancy: Map<string, Unit>, ignoreRough = false): Map<string, number> {
    const base = effectiveMovement(unit);
    const budget = base > 0 ? base + this.moveBonus : 0;
    const dist = new Map<string, number>([[key(unit.pos), 0]]);
    // 소규모 그리드이므로 단순 정렬 큐로 충분 (유닛당 최대 수백 타일)
    const queue: Array<{ c: Coord; d: number }> = [{ c: unit.pos, d: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.d - b.d);
      const { c, d } = queue.shift()!;
      if (d > (dist.get(key(c)) ?? Infinity)) continue;

      for (const n of adjacent(c)) {
        if (!this.inBounds(n)) continue;
        const blocker = occupancy.get(key(n));
        if (blocker && isHostile(unit.side, blocker.side)) continue;

        const cost = this.moveCost(unit.unitClass, n, ignoreRough);
        if (!Number.isFinite(cost)) continue;

        // M-19: 불길 칸은 지나가는 데 이동력이 2 더 든다 — 지나치기만 해도 공짜가 아니다.
        const nd = d + cost + (this.tileAt(n).hazard === "fire" ? 2 : 0);
        if (nd > budget) continue;
        if (nd < (dist.get(key(n)) ?? Infinity)) {
          dist.set(key(n), nd);
          queue.push({ c: n, d: nd });
        }
      }
    }

    // 다른 유닛이 점유한 타일에는 정지할 수 없다
    for (const k of [...dist.keys()]) {
      if (k !== key(unit.pos) && occupancy.has(k)) dist.delete(k);
    }
    return dist;
  }
}

export function effectiveMovement(unit: Unit): number {
  let mv = unit.stats.movement;
  for (const s of unit.statuses) {
    if (s.kind === "haste") mv += s.magnitude;
    if (s.kind === "slow") mv -= 2 * s.magnitude;
    if (s.kind === "immobile" || s.kind === "bound") return 0;
  }
  return Math.max(0, mv);
}

export function isHostile(a: import("./types.ts").Side, b: import("./types.ts").Side): boolean {
  const aEnemy = a === "enemy";
  const bEnemy = b === "enemy";
  return aEnemy !== bEnemy;
}

/**
 * 해당 유닛이 이 타일에 진입할 수 있는가.
 * M-09(포위 구속) 판정에서 "벽도 봉쇄의 일부"로 치기 위해 필요하다 —
 * 실제 플레이에서는 지형에 몰아붙여 가두는 것이 정석 해법이다.
 */
export function passableFor(map: BattleMap, unitClass: UnitClass, c: Coord): boolean {
  if (!map.inBounds(c)) return false;
  return Number.isFinite(map.moveCost(unitClass, c));
}
