/**
 * 헤드리스 시뮬레이션 — 32스테이지 × 2난이도 = 64회 밸런스 QA (PRD R6) 대응.
 *
 * 렌더러 없이 전투를 N회 반복 실행하고 클리어율·평균 턴·인장 획득률을 집계한다.
 * CI에서 돌려 목표 클리어율(§11)에서 벗어난 스테이지를 자동 검출한다.
 */
import { Battle, type BattleOptions } from "./battle.ts";
import { BattleState } from "./state.ts";
import { decide } from "./ai.ts";
import { awardedSeals } from "./conditions.ts";
import { CONTROLLABLE } from "./types.ts";
import type { Difficulty } from "./stage.ts";

export interface SimResult {
  runs: number;
  victories: number;
  clearRate: number;
  avgTurns: number;
  medianTurns: number;
  sealRates: Record<number, number>;
  timeouts: number;
}

export interface SimOptions {
  runs: number;
  difficulty: Difficulty;
  /** 전투를 1회 구성하는 팩토리. 시드마다 새 상태를 만들어야 한다. */
  setup: (seed: number) => { state: BattleState; options: BattleOptions };
  maxTurns?: number;
}

/**
 * 플레이어를 기본 AI로 대체해 자동 플레이시킨다.
 * "AI가 이길 수 있는가"는 사람의 실력 하한선 근사치로 쓴다 —
 * AI 클리어율이 0%인 스테이지는 사람에게도 거의 확실히 과하다.
 */
export function simulate(opts: SimOptions): SimResult {
  const turns: number[] = [];
  const sealCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let victories = 0;
  let timeouts = 0;

  for (let i = 0; i < opts.runs; i++) {
    const { state, options } = opts.setup(i);
    const battle = new Battle(state, { ...options, undoDepth: 0 });
    battle.start();

    let guard = 0;
    while (state.outcome === "ongoing") {
      // 대화가 열려 있으면 먼저 응답한다. 방치하면 대화로 분기하는 스테이지의
      // 난이도를 전혀 측정하지 못한다. 최적 플레이 근사치로 정답을 고른다.
      if (state.activeDialogue) {
        const node = battle.dialogue.node(state.activeDialogue);
        const pick = node.options.find((o) => o.correct === true) ?? node.options[0]!;
        battle.execute({ kind: "choose", nodeId: node.id, optionId: pick.id });
        continue;
      }
      if (CONTROLLABLE.has(state.currentSide)) {
        const next = state.living(state.currentSide).find((u) => !u.hasActed);
        if (!next) {
          battle.endPhase();
        } else {
          for (const cmd of decide(state, next)) battle.execute(cmd);
          next.hasActed = true;
        }
      } else {
        battle.runAiPhase();
      }
      if (++guard > (opts.maxTurns ?? 2000)) {
        timeouts++;
        break;
      }
    }

    if (state.outcome === "victory") {
      victories++;
      turns.push(state.turn);
      for (const slot of awardedSeals(state, opts.difficulty)) sealCounts[slot]!++;
    }
  }

  turns.sort((a, b) => a - b);
  const sealRates: Record<number, number> = {};
  for (const slot of [1, 2, 3]) {
    sealRates[slot] = opts.runs === 0 ? 0 : sealCounts[slot]! / opts.runs;
  }

  return {
    runs: opts.runs,
    victories,
    clearRate: opts.runs === 0 ? 0 : victories / opts.runs,
    avgTurns: turns.length === 0 ? 0 : turns.reduce((a, b) => a + b, 0) / turns.length,
    medianTurns: turns.length === 0 ? 0 : turns[Math.floor(turns.length / 2)]!,
    sealRates,
    timeouts,
  };
}
