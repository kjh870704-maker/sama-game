import type { BattleState } from "./state.ts";
import type { VictoryCondition } from "./stage.ts";
import { sameCoord } from "./grid.ts";
import type { Side } from "./types.ts";
import { familyOf } from "./classes.ts";

/**
 * 조건 평가. 승리 · 패배 · 인장이 모두 같은 술어 집합을 공유한다.
 * 인장을 별도 로직으로 만들면 "승리 조건과 인장이 어긋나는" 버그가 생긴다.
 */
export function evaluate(state: BattleState, cond: VictoryCondition): boolean {
  switch (cond.type) {
    case "annihilate": {
      const side: Side = cond.side ?? "enemy";
      return state.living(side).length === 0;
    }

    case "reach": {
      if (!cond.unit || !cond.target) return false;
      // 병종 이름으로 적힌 도달 조건(예: navy)은 그 병종의 아군 아무 부대나 닿으면 된다.
      const u = state.find(cond.unit);
      const who = u ? [u] : [...state.units.values()].filter((x) => (x.side === "player" || x.side === "ally") && (x.unitClass === cond.unit || familyOf(x.unitClass) === cond.unit));
      const region = state.map.regionCoords(cond.target);
      return who.some((x) => x.alive && region.some((c) => sameCoord(c, x.pos)));
    }

    case "capture": {
      if (!cond.target) return false;
      return state.captured.get(cond.target) === (cond.by ?? "player");
    }

    case "retreat": {
      if (!cond.unit) return false;
      const u = state.find(cond.unit);
      return u !== undefined && !u.alive;
    }

    case "enemy_retreat_count":
      return state.losses.enemy >= (cond.n ?? 0);

    case "ally_loss_limit": {
      // "아군 N부대 미만 퇴각" — 편입 아군(ally)을 포함한다. PRD R-5.5
      const lost = state.losses.player + state.losses.ally;
      return lost < (cond.n ?? Infinity);
    }

    case "turn_limit":
      return state.turn <= (cond.n ?? Infinity);

    case "survive_turns": {
      const label = cond.target ?? "default";
      const start = state.survivalClocks.get(label);
      if (start === undefined) return false;
      return state.turn - start >= (cond.n ?? 0);
    }

    case "escort_survive": {
      const side: Side = cond.side ?? "allyAi";
      return state.living(side).length > 0;
    }

    case "dialogue_complete":
      return state.choices.some((c) => c.nodeId === cond.target);
  }
}

/**
 * 순차 조건 평가.
 * order가 없으면 OR, order가 있으면 낮은 단계부터 순차로 모두 충족해야 한다.
 * (예: "상용 도달 → 맹달 처치")
 */
/**
 * 승리 판정(차례 목표를 붙잡아 두는 규칙). order가 있는 목표는 한 번 이룬 단계가 그대로 남는다:
 * "사마의가 남문에 도달 → 사마랑이 남문에 도달"이면 사마의가 먼저 닿은 뒤 자리를 떠도 된다.
 * 단계는 앞 단계를 이룬 뒤에야 이룰 수 있다(차례로).
 */
export function advanceVictory(state: BattleState): boolean {
  const conds = state.victory;
  if (conds.length === 0) return false;
  const ordered = conds.filter((c) => c.order !== undefined);
  if (conds.some((c) => c.order === undefined && evaluate(state, c))) return true;
  if (ordered.length === 0) return false;
  const steps = [...new Set(ordered.map((c) => c.order!))].sort((a, b) => a - b);
  while (state.goalProgress < steps.length && ordered.filter((c) => c.order === steps[state.goalProgress]).some((c) => evaluate(state, c))) state.goalProgress++;
  return state.goalProgress >= steps.length;
}

/**
 * 지금 해야 하는 차례 목표 단계(order 값). 차례 목표가 없거나 모두 이뤘으면 undefined.
 * 붙잡아 두는 규칙(stickyGoals)이면 이룬 단계 수로, 아니면 아직 아무 조건도 채우지 못한 첫 단계로 본다.
 */
export function currentGoalStep(state: BattleState): number | undefined {
  const ordered = state.victory.filter((c) => c.order !== undefined);
  const steps = [...new Set(ordered.map((c) => c.order!))].sort((a, b) => a - b);
  if (state.stickyGoals) return steps[state.goalProgress];
  return steps.find((o) => !ordered.some((c) => c.order === o && evaluate(state, c)));
}

export function evaluateGroup(state: BattleState, conds: VictoryCondition[]): boolean {
  if (conds.length === 0) return false;
  const ordered = conds.filter((c) => c.order !== undefined);
  const unordered = conds.filter((c) => c.order === undefined);

  if (unordered.some((c) => evaluate(state, c))) return true;
  if (ordered.length === 0) return false;

  const steps = [...new Set(ordered.map((c) => c.order!))].sort((a, b) => a - b);
  return steps.every((step) =>
    ordered.filter((c) => c.order === step).some((c) => evaluate(state, c)),
  );
}

/**
 * 인장 문자열을 조건으로 파싱한다. 예: "turn_limit:20" → { type, n: 20 }
 * 인자가 빠지거나 숫자가 아니면 즉시 throw 한다 — 오타난 인장이 조용히
 * "항상 달성"으로 동작하면 QA에서 잡히지 않는다.
 */
export function parseSeal(expr: string): VictoryCondition | null {
  if (expr === "clear") return null;
  const [head, arg] = expr.split(":");

  const num = (): number => {
    const n = Number(arg);
    if (arg === undefined || !Number.isFinite(n)) {
      throw new Error(`인장 표현식에 숫자 인자가 필요함: "${expr}"`);
    }
    return n;
  };
  const str = (): string => {
    if (arg === undefined || arg === "") {
      throw new Error(`인장 표현식에 대상 인자가 필요함: "${expr}"`);
    }
    return arg;
  };

  switch (head) {
    case "turn_limit":
      return { type: "turn_limit", n: num() };
    case "player_losses_lt":
      return { type: "ally_loss_limit", n: num() };
    case "no_player_losses":
      return { type: "ally_loss_limit", n: 1 };
    case "enemy_retreat_count":
      return { type: "enemy_retreat_count", n: num() };
    case "unit_retreat":
      return { type: "retreat", unit: str() };
    case "unit_survives":
      return { type: "escort_survive", side: "allyAi" };
    case "dialogue":
      return { type: "dialogue_complete", target: str() };
    default:
      throw new Error(`알 수 없는 인장 표현식: ${expr}`);
  }
}

/** 전투 종료 후 획득 인장 슬롯을 판정한다. */
export function awardedSeals(
  state: BattleState,
  difficulty: "normal" | "extreme",
): number[] {
  if (state.outcome !== "victory") return [];
  const awarded: number[] = [];
  for (const seal of state.stage.seals) {
    const expr = difficulty === "normal" ? seal.normal : seal.extreme;
    const cond = parseSeal(expr);
    if (cond === null || evaluate(state, cond)) awarded.push(seal.slot);
  }
  return awarded;
}
