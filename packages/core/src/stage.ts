/**
 * 스테이지 정의 — docs/data/stage-schema.json 과 1:1 대응하는 타입.
 *
 * 스테이지는 코드가 아니라 데이터다. 새 스테이지를 추가할 때
 * packages/core 안의 파일은 단 한 줄도 바뀌지 않아야 한다. (PRD R7)
 */
import type { Side, UnitClass, StatusKind, HazardKind, TerrainKind, Coord } from "./types.ts";
import type { DialogueNode } from "./dialogue.ts";

export type Arc = "upper" | "middle" | "lower";
export type Difficulty = "normal" | "extreme";
export type PerfTier = "A" | "B" | "C";

export const PERF_BUDGET: Record<PerfTier, { maxUnits: number; targetFps: number }> = {
  A: { maxUnits: 20, targetFps: 60 },
  B: { maxUnits: 40, targetFps: 60 },
  C: { maxUnits: 80, targetFps: 30 },
};

export interface VictoryCondition {
  type:
    | "annihilate"
    | "reach"
    | "capture"
    | "retreat"
    | "survive_turns"
    | "enemy_retreat_count"
    | "ally_loss_limit"
    | "dialogue_complete"
    | "turn_limit"
    | "escort_survive";
  unit?: string;
  target?: string;
  by?: Side;
  n?: number;
  /** 순차 조건일 때의 단계. 같은 order끼리는 OR, 다른 order는 AND(순차). */
  order?: number;
  side?: Side;
}

export interface Trigger {
  type:
    | "battle_start"
    | "turn_start"
    | "turn_end"
    | "unit_reaches"
    | "unit_retreats"
    | "enemy_count_below"
    | "region_captured"
    | "dialogue_choice"
    | "units_adjacent"
    | "survive_turns"
    | "hp_below"
    | "unit_surrounded"
    | "region_held"
    | "unit_spotted"
    /** Never fires on its own: the host fires it by id (fireScripted) when its own rule is met. */
    | "scripted";
  turn?: number;
  every?: number;
  unit?: string;
  unitA?: string;
  unitB?: string;
  region?: string;
  n?: number;
  by?: Side;
  nodeId?: string;
  optionId?: string;
  /** dialogue_choice: n회 이상 선택했을 때 발동 (기본 1) */
  ratio?: number;
  side?: Side;
  /** unit_spotted: 발각한 순찰 유닛 (생략 시 아무 순찰 유닛이나) */
  watcher?: string;
}

export interface Action {
  type:
    | "spawn_units"
    | "set_phase"
    | "recover_units"
    | "dismiss_units"
    | "apply_effect"
    | "remove_effect"
    | "change_victory"
    | "change_defeat"
    | "move_unit"
    | "convert_unit"
    | "terrain_change"
    | "play_dialogue"
    | "start_duel"
    | "grant_control"
    | "revoke_control"
    | "telegraph_aoe";
  units?: UnitSpawnSpec[];
  phase?: string;
  at?: Coord;
  side?: Side;
  targets?: string[];
  effect?: StatusKind;
  magnitude?: number;
  duration?: number;
  region?: string;
  terrain?: TerrainKind;
  hazard?: HazardKind;
  conditions?: VictoryCondition[];
  dialogueId?: string;
  toClass?: UnitClass;
  /** apply_effect에서 최대 HP 비율만큼 즉시 피해를 준다 (M-03 오답 페널티) */
  hpRatioDamage?: number;
  /** telegraph_aoe: shown name of the coming blow (e.g. "낙뢰"). */
  label?: string;
  /** telegraph_aoe: cells in this region are sheltered and never marked (M-18 cover). */
  exceptRegion?: string;
}

export interface UnitSpawnSpec {
  id?: string;
  name?: string;
  template: string;
  level?: number;
  at?: { x: number; y: number };
  region?: string;
  count?: number;
  traits?: string[];
  traitParams?: Record<string, number>;
  behavior?: string;
  goalRegion?: string;
  patrolRoute?: Coord[];
  visionRange?: number;
}

export interface StageEvent {
  id?: string;
  /** Only active in this scenario segment; independent from side turns. */
  phase?: string;
  trigger: Trigger;
  actions: Action[];
  once?: boolean;
}

export interface SealDef {
  slot: 1 | 2 | 3;
  normal: string;
  extreme: string;
  note?: string;
}

export interface DifficultyTier {
  minEnemyLevel: number;
  recommendedLevel: number;
  enemyTraitSet?: string;
  targetClearRate?: number;
}

export interface StageDef {
  id: string;
  initialPhase?: string;
  arc: Arc;
  order: number;
  title: string;
  subtitle?: string;
  synopsis?: string;
  mapId?: string;
  deployment: {
    forced: string[];
    selectable?: string[];
    slots: number;
    grantedUnits?: Array<{
      type: UnitClass;
      count: number;
      level?: number;
      traits?: string[];
      countsTowardAllyLoss?: boolean;
    }>;
    allyAi?: Array<{
      type: UnitClass;
      count: number;
      level?: number;
      traits?: string[];
      behavior?: string;
      goalRegion?: string;
    }>;
  };
  victory: VictoryCondition[];
  defeat: VictoryCondition[];
  seals: SealDef[];
  difficulty: Record<Difficulty, DifficultyTier>;
  gimmicks?: string[];
  events?: StageEvent[];
  dialogues?: DialogueNode[];
  perf: { maxSimultaneousUnits: number; tier: PerfTier };
}

/** 스키마 이후의 의미론적 검증. CI에서 전 스테이지에 대해 실행한다. */
export function validateStage(stage: StageDef): string[] {
  const errors: string[] = [];
  const budget = PERF_BUDGET[stage.perf.tier];

  if (stage.perf.maxSimultaneousUnits > budget.maxUnits) {
    errors.push(
      `[${stage.id}] 성능 예산 초과: Tier ${stage.perf.tier}의 상한은 ${budget.maxUnits}인데 ${stage.perf.maxSimultaneousUnits} 선언됨 (PRD §9.1)`,
    );
  }
  if (stage.seals.length !== 3) {
    errors.push(`[${stage.id}] 인장은 정확히 3개여야 함 (현재 ${stage.seals.length}) (PRD §5.2)`);
  }
  if (stage.seals[0] && stage.seals[0].normal !== "clear") {
    errors.push(`[${stage.id}] 인장 1번 슬롯은 항상 "clear" 여야 함 (PRD §5.2)`);
  }
  // R-5.5: 편입 아군이 있는데 아군 손실 인장에 note가 없으면 경고
  const hasGranted = (stage.deployment.grantedUnits?.length ?? 0) > 0;
  const lossSeal = stage.seals.find((s) => s.normal.startsWith("player_losses_lt"));
  if (hasGranted && lossSeal && !lossSeal.note) {
    errors.push(
      `[${stage.id}] 편입 아군이 존재하고 아군 손실 인장이 있으나 note 미기재 (PRD R-5.5)`,
    );
  }
  if (stage.difficulty.extreme.minEnemyLevel <= stage.difficulty.normal.minEnemyLevel) {
    errors.push(`[${stage.id}] 극한 난이도의 적 레벨이 일반 이하임`);
  }
  if (stage.victory.length === 0) errors.push(`[${stage.id}] 승리 조건 없음`);
  if (stage.defeat.length === 0) errors.push(`[${stage.id}] 패배 조건 없음`);

  // turn_limit은 "N턴 이내"라는 뜻이라 1턴차에 이미 참이다.
  // 승리/패배 조건에 쓰면 전투가 시작하자마자 끝난다 — 인장 전용 술어다.
  for (const [group, conds] of [["승리", stage.victory], ["패배", stage.defeat]] as const) {
    if (conds.some((c) => c.type === "turn_limit")) {
      errors.push(
        `[${stage.id}] ${group} 조건에 turn_limit 사용 — 1턴차에 즉시 충족되어 전투가 바로 끝납니다. 인장에만 사용하세요`,
      );
    }
  }

  return errors;
}
