import type { Unit, Side, Coord, BattleOutcome, Status, StatusKind, StrategyDef, TerrainKind } from "./types.ts";
import { BattleMap, key, isHostile } from "./grid.ts";
import { Rng, type RngSnapshot } from "./rng.ts";
import { evolveStrategy } from "./strategy-tiers.ts";
import type { StageDef, VictoryCondition, Difficulty } from "./stage.ts";

export type LogEntry =
  | { t: "turnStart"; turn: number; side: Side }
  | { t: "move"; unit: string; from: Coord; to: Coord }
  | { t: "attack"; attacker: string; defender: string; damage: number; hit: boolean; critical: boolean; tactic?: string; double?: boolean }
  | { t: "counter"; attacker: string; defender: string; damage: number; hit: boolean; tactic?: string; double?: boolean }
  | { t: "strategy"; caster: string; strategy: string; targets: string[]; damage: number[] }
  | { t: "retreat"; unit: string; side: Side }
  | { t: "status"; unit: string; kind: StatusKind; turns: number }
  | { t: "spawn"; units: string[]; side: Side }
  | { t: "convert"; unit: string; to: string }
  | { t: "objectiveChanged"; victory: VictoryCondition[] }
  | { t: "event"; id: string }
  | { t: "dialogue"; node: string }
  | { t: "choice"; node: string; option: string; correct?: boolean }
  | { t: "guard"; protector: string; protected: string }
  | { t: "spotted"; watcher: string; target: string }
  | { t: "terrain"; region: string; terrain: TerrainKind }
  | { t: "telegraph"; id: string; cells: Coord[]; turns: number; label?: string; warning?: boolean }
  | { t: "strike"; id: string; cells: Coord[]; hits: Array<{ unit: string; damage: number }> }
  | { t: "outcome"; outcome: BattleOutcome };

/** 턴 순서. 우군 AI는 적 페이즈 뒤에 별도로 움직인다. */
export const PHASE_ORDER: readonly Side[] = ["player", "ally", "enemy", "allyAi"];

/**
 * 전투의 전체 상태. 이 객체는 순수 데이터이며, 렌더러를 알지 못한다.
 * 모든 변경은 commands.ts의 명령을 통해서만 일어난다.
 */
export class BattleState {
  readonly stage: StageDef;
  readonly map: BattleMap;
  readonly rng: Rng;
  readonly difficulty: Difficulty;
  /**
   * 적 레벨 보정. 스테이지 데이터는 일반 난이도 기준으로 한 번만 작성하고,
   * 극한은 이 값으로 파생시킨다 — 난이도별로 적 배치를 두 벌 관리하면
   * 한쪽만 고치는 실수가 반드시 난다.
   */
  readonly enemyLevelShift: number;
  /** 사용 가능한 책략 정의. Battle 생성 시 주입된다. */
  strategies: Map<string, StrategyDef> = new Map();
  /** 시전자 레벨로 진화한 책략 정의 */
  strategyFor(unit: { level: number; traitParams?: Record<string, number> }, id: string): StrategyDef | undefined {
    const d = this.strategies.get(id);
    if (!d) return undefined;
    // 연구: 책략 숙달(진화 레벨을 앞당김) · 책략 절약(소모 MP %)
    const p = unit.traitParams ?? {};
    const e = evolveStrategy(d, unit.level + (p.strategyMastery ?? 0));
    const thrift = Math.min(50, p.mpThrift ?? 0);
    return thrift > 0 ? { ...e, mpCost: Math.max(1, Math.round(e.mpCost * (1 - thrift / 100))) } : e;
  }

  units: Map<string, Unit> = new Map();
  turn = 1;
  scenarioPhase: string;
  phaseIndex = 0;
  outcome: BattleOutcome = "ongoing";
  log: LogEntry[] = [];

  /** 현재 유효한 승리 조건. M-15 OBJECTIVE_FLIP으로 교체될 수 있다. */
  victory: VictoryCondition[];
  defeat: VictoryCondition[];

  /** 이미 발동한 1회성 이벤트 ID */
  firedEvents: Set<string> = new Set();
  /** M-18 TELEGRAPHED_AOE: warned cells that strike when the turn reaches `at`. */
  telegraphs: Telegraph[] = [];
  /** 진영별 퇴각 누계 */
  losses: Record<Side, number> = { player: 0, ally: 0, allyAi: 0, enemy: 0 };
  /** 점령 상태: 영역명 → 점령 진영 */
  captured: Map<string, Side> = new Map();
  /** M-14 SURVIVE_N_TURNS 카운터: 라벨 → 시작 턴 */
  survivalClocks: Map<string, number> = new Map();
  /** 대화/선택지 진행 기록 */
  choices: Array<{ nodeId: string; optionId: string }> = [];
  /** 현재 표시 중인 대화 노드. null이면 대화 중이 아니다. */
  activeDialogue: string | null = null;
  /**
   * 영역별 연속 점유 기록 (M-08 CONSTRUCT).
   * 점유 진영이 바뀌거나 비면 초기화된다.
   */
  regionHolds: Map<string, { side: Side; since: number }> = new Map();

  constructor(stage: StageDef, map: BattleMap, seed: number, difficulty: Difficulty = "normal") {
    this.stage = stage;
    this.scenarioPhase = stage.initialPhase ?? '';
    this.map = map;
    this.rng = new Rng(seed);
    this.difficulty = difficulty;
    this.enemyLevelShift =
      stage.difficulty[difficulty].minEnemyLevel - stage.difficulty.normal.minEnemyLevel;
    this.victory = structuredClone(stage.victory) as VictoryCondition[];
    this.defeat = structuredClone(stage.defeat) as VictoryCondition[];
  }

  get currentSide(): Side {
    return PHASE_ORDER[this.phaseIndex]!;
  }

  add(unit: Unit): void {
    if (this.units.has(unit.id)) throw new Error(`중복 유닛 ID: ${unit.id}`);
    this.units.set(unit.id, unit);
  }

  get(id: string): Unit {
    const u = this.units.get(id);
    if (!u) throw new Error(`존재하지 않는 유닛: ${id}`);
    return u;
  }

  find(id: string): Unit | undefined {
    return this.units.get(id);
  }

  living(side?: Side): Unit[] {
    const out: Unit[] = [];
    for (const u of this.units.values()) {
      if (!u.alive) continue;
      if (side && u.side !== side) continue;
      out.push(u);
    }
    return out;
  }

  /** 현재 점유 맵. 이동 계산 직전에 새로 만든다. */
  occupancy(): Map<string, Unit> {
    const m = new Map<string, Unit>();
    for (const u of this.units.values()) if (u.alive) m.set(key(u.pos), u);
    return m;
  }

  unitAt(c: Coord): Unit | undefined {
    for (const u of this.units.values()) {
      if (u.alive && u.pos.x === c.x && u.pos.y === c.y) return u;
    }
    return undefined;
  }

  enemiesOf(side: Side): Unit[] {
    return this.living().filter((u) => isHostile(side, u.side));
  }

  push(entry: LogEntry): void {
    this.log.push(entry);
  }

  /** 유닛 퇴각 처리. 진영별 손실 누계를 갱신한다. */
  retreat(unit: Unit): void {
    if (!unit.alive) return;
    unit.alive = false;
    unit.hp = 0;
    this.losses[unit.side] += 1;
    this.push({ t: "retreat", unit: unit.id, side: unit.side });
  }

  applyStatus(unit: Unit, status: Status): void {
    const existing = unit.statuses.find((s) => s.kind === status.kind);
    if (existing) {
      existing.turns = Math.max(existing.turns, status.turns);
    } else {
      unit.statuses.push({ ...status });
    }
    this.push({ t: "status", unit: unit.id, kind: status.kind, turns: status.turns });
  }

  hasStatus(unit: Unit, kind: StatusKind): boolean {
    return unit.statuses.some((s) => s.kind === kind);
  }

  // ─────────────────────────────────── 스냅샷 (무르기 · 리플레이)

  /**
   * 전체 상태 스냅샷. 무르기(S-09)는 명령 실행 직전 스냅샷을 쌓아두고
   * 복원하는 방식으로 구현한다 — 역연산을 따로 작성하지 않으므로
   * 새 기믹이 추가되어도 무르기가 깨지지 않는다.
   */
  snapshot(): BattleSnapshot {
    return {
      units: structuredClone([...this.units.values()]),
      turn: this.turn,
      scenarioPhase: this.scenarioPhase,
      phaseIndex: this.phaseIndex,
      outcome: this.outcome,
      logLength: this.log.length,
      rng: this.rng.snapshot(),
      victory: structuredClone(this.victory),
      defeat: structuredClone(this.defeat),
      firedEvents: [...this.firedEvents],
      losses: { ...this.losses },
      captured: [...this.captured.entries()],
      survivalClocks: [...this.survivalClocks.entries()],
      choices: structuredClone(this.choices),
      activeDialogue: this.activeDialogue,
      regionHolds: [...this.regionHolds.entries()],
      telegraphs: structuredClone(this.telegraphs),
    };
  }

  restore(snap: BattleSnapshot): void {
    this.units = new Map(snap.units.map((u) => [u.id, structuredClone(u)]));
    this.turn = snap.turn;
    this.scenarioPhase = snap.scenarioPhase;
    this.phaseIndex = snap.phaseIndex;
    this.outcome = snap.outcome;
    this.log.length = snap.logLength;
    this.rng.restore(snap.rng);
    this.victory = structuredClone(snap.victory);
    this.defeat = structuredClone(snap.defeat);
    this.firedEvents = new Set(snap.firedEvents);
    this.losses = { ...snap.losses };
    this.captured = new Map(snap.captured);
    this.survivalClocks = new Map(snap.survivalClocks);
    this.choices = structuredClone(snap.choices);
    this.activeDialogue = snap.activeDialogue;
    this.regionHolds = new Map(snap.regionHolds.map(([k, v]) => [k, { ...v }]));
    this.telegraphs = structuredClone(snap.telegraphs ?? []);
  }

  /**
   * 각 영역의 연속 점유 상태를 갱신한다. 턴이 넘어갈 때 1회 호출.
   * 영역 위에 한 진영만 있고 적대 진영이 없으면 그 진영이 점유한 것으로 본다.
   */
  updateRegionHolds(): void {
    for (const [name, coords] of this.map.regions) {
      const sides = new Set<Side>();
      for (const c of coords) {
        const u = this.unitAt(c);
        if (u) sides.add(u.side);
      }
      const holder = resolveHolder(sides);
      const prev = this.regionHolds.get(name);
      if (holder === null) {
        this.regionHolds.delete(name);
      } else if (!prev || prev.side !== holder) {
        this.regionHolds.set(name, { side: holder, since: this.turn });
      }
    }
  }

  /** 특정 진영이 해당 영역을 몇 턴째 연속 점유 중인가. 미점유면 0. */
  heldTurns(region: string, side: Side): number {
    const hold = this.regionHolds.get(region);
    if (!hold || hold.side !== side) return 0;
    return this.turn - hold.since + 1;
  }
}

export interface BattleSnapshot {
  scenarioPhase: string;
  units: Unit[];
  turn: number;
  phaseIndex: number;
  outcome: BattleOutcome;
  logLength: number;
  rng: RngSnapshot;
  victory: VictoryCondition[];
  defeat: VictoryCondition[];
  firedEvents: string[];
  losses: Record<Side, number>;
  captured: Array<[string, Side]>;
  survivalClocks: Array<[string, number]>;
  choices: Array<{ nodeId: string; optionId: string }>;
  activeDialogue: string | null;
  regionHolds: Array<[string, { side: Side; since: number }]>;
  telegraphs?: Telegraph[];
}

export interface Telegraph {
  id: string;
  cells: Coord[];
  /** Turn on which the blow lands (at least one turn after the warning). */
  at: number;
  /** Damage as a percentage of max HP. Never retreats a unit (HP floor 1), like hazards. */
  ratio: number;
  effect?: StatusKind;
  label?: string;
}

/** 영역 위 유닛들의 진영 집합에서 점유 진영을 판정한다. */
function resolveHolder(sides: Set<Side>): Side | null {
  if (sides.size === 0) return null;
  const hasEnemy = sides.has("enemy");
  const friendly = [...sides].filter((s) => s !== "enemy");
  // 적과 아군이 뒤섞여 있으면 어느 쪽도 점유한 것이 아니다 (교전 중)
  if (hasEnemy && friendly.length > 0) return null;
  if (hasEnemy) return "enemy";
  // 아군 진영끼리는 player > ally > allyAi 순으로 대표를 정한다
  for (const s of ["player", "ally", "allyAi"] as const) {
    if (sides.has(s)) return s;
  }
  return null;
}
