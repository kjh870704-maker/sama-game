/**
 * 스테이지 데이터 → 실행 가능한 BattleState 조립.
 * 이 파일이 "데이터로만 스테이지를 만든다"는 약속의 실행 지점이다.
 */
import { BattleState } from "./state.ts";
import { loadMap, type MapFile } from "./mapio.ts";
import { makeUnit } from "./units.ts";
import type { StageDef, Difficulty } from "./stage.ts";
import type { Unit, UnitClass, AiBehavior, Coord } from "./types.ts";
import { key } from "./grid.ts";
import { familyOf } from "./classes.ts";

/** 출진 장수 정의 (계보/육성 시스템에서 넘어오는 값). */
export interface RosterEntry {
  id: string;
  name: string;
  unitClass: UnitClass;
  level: number;
  traits?: string[];
  traitParams?: Record<string, number>;
  strategies?: string[];
}

export interface AssembleOptions {
  stage: StageDef;
  map: MapFile;
  difficulty: Difficulty;
  seed: number;
  /** 강제/선택 출진 장수. stage.deployment.forced의 id와 대응해야 한다. */
  roster: RosterEntry[];
}

export function assemble(opts: AssembleOptions): BattleState {
  const { stage, difficulty, seed } = opts;
  const map = loadMap(opts.map);
  const state = new BattleState(stage, map, seed, difficulty);
  const occupied = new Set<string>();

  // A class-specific start (e.g. "navy_start" for boats) wins over the shared one.
  const place = (region: string, unitClass?: UnitClass): Coord => {
    // Only maps that define a class start use it; other maps keep their exact placement
    // so old saves replay unchanged.
    const own = unitClass ? map.regions.get(`${unitClass}_start`) ?? map.regions.get(`${familyOf(unitClass)}_start`) ?? [] : [];
    const coords = own.length
      ? [...own, ...map.regionCoords(region)].filter((c) => Number.isFinite(map.moveCost(unitClass!, c)))
      : map.regionCoords(region);
    for (const c of coords) {
      if (!occupied.has(key(c))) {
        occupied.add(key(c));
        return c;
      }
    }
    throw new Error(
      `[${stage.id}] 배치 공간 부족: 영역 "${region}"의 ${coords.length}칸이 모두 찼습니다. ` +
        `맵의 해당 영역을 넓히거나 배치 유닛 수를 줄이세요.`,
    );
  };

  // 1. 플레이어 출진 장수
  const byId = new Map(opts.roster.map((r) => [r.id, r]));
  for (const id of stage.deployment.forced) {
    const entry = byId.get(id);
    if (!entry) throw new Error(`[${stage.id}] 강제 출진 장수 "${id}"가 로스터에 없음`);
    state.add(fromRoster(entry, "player", place("player_start")));
  }

  // 2. 편입 아군 — 조작 가능, 도구 불가, 아군 손실 카운트 포함 (PRD §3.3)
  const levelShift = state.enemyLevelShift;
  const grantedCounts = new Map<string, number>();
  for (const g of stage.deployment.grantedUnits ?? []) {
    for (let i = 0; i < g.count; i++) {
      state.add(
        makeUnit({
          id: `granted_${g.type}_${(grantedCounts.get(g.type) ?? 0) + i}`,
          name: g.type,
          side: "ally",
          unitClass: g.type,
          level: (g.level ?? 1) + levelShift,
          pos: place("player_start", g.type),
          traits: g.traits ?? [],
          canUseItems: false,
        }),
      );
    }
    grantedCounts.set(g.type, (grantedCounts.get(g.type) ?? 0) + g.count);
  }

  // 3. AI 우군
  for (const g of stage.deployment.allyAi ?? []) {
    for (let i = 0; i < g.count; i++) {
      state.add(
        makeUnit({
          id: `allyai_${g.type}_${i}`,
          name: g.type,
          side: "allyAi",
          unitClass: g.type,
          level: (g.level ?? 1) + levelShift,
          pos: place("west_ally_start"),
          traits: g.traits ?? [],
          behavior: (g.behavior as AiBehavior) ?? "advance",
          canUseItems: false,
          ...(g.goalRegion !== undefined ? { goalRegion: g.goalRegion } : {}),
        }),
      );
    }
  }

  // 적군은 battle_start 이벤트의 spawn_units로 배치된다 — 데이터에만 존재한다.
  return state;
}

function fromRoster(entry: RosterEntry, side: "player", pos: Coord): Unit {
  return makeUnit({
    id: entry.id,
    name: entry.name,
    side,
    unitClass: entry.unitClass,
    level: entry.level,
    pos,
    traits: entry.traits ?? [],
    traitParams: entry.traitParams ?? {},
    strategies: entry.strategies ?? [],
    canUseItems: true,
  });
}
