import { describe, it, expect } from "vitest";
import { Battle } from "../src/battle.ts";
import { BattleState, PHASE_ORDER } from "../src/state.ts";
import { makeUnit } from "../src/units.ts";
import { duelState, flatMap, minimalStage } from "./fixtures.ts";
import type { StrategyDef } from "../src/types.ts";

const windDragon: StrategyDef = {
  id: "windDragon", name: "풍룡", element: "wind", shape: "spread",
  range: 4, radius: 1, mpCost: 10, power: 130, targetSides: ["enemy"],
};

const strategies = new Map([["windDragon", windDragon]]);

describe("전투 루프", () => {
  it("적을 전멸시키면 승리한다", () => {
    const state = duelState(1, 60, 5);
    const battle = new Battle(state, { seed: 1, strategies });
    battle.start();

    let guard = 0;
    while (state.outcome === "ongoing" && guard++ < 200) {
      const hero = state.get("hero");
      if (state.currentSide === "player" && !hero.hasActed && hero.alive) {
        battle.execute({ kind: "strategy", unit: "hero", strategy: "windDragon", at: state.get("foe").pos });
        battle.execute({ kind: "endPhase" });
      } else if (state.currentSide === "player" || state.currentSide === "ally") {
        battle.execute({ kind: "endPhase" });
      } else {
        battle.runAiPhase();
      }
    }
    expect(state.outcome).toBe("victory");
  });

  it("사거리 밖 공격은 거부된다", () => {
    const state = new BattleState(minimalStage(), flatMap(10, 10), 1);
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "infantry", level: 20, pos: { x: 0, y: 0 } }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 20, pos: { x: 5, y: 5 } }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();

    const res = battle.execute({ kind: "attack", unit: "hero", target: "foe" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("사거리");
  });

  it("MP가 부족하면 책략을 쓸 수 없다", () => {
    const state = duelState(1);
    state.get("hero").mp = 0;
    const battle = new Battle(state, { seed: 1, strategies });
    battle.start();
    const res = battle.execute({ kind: "strategy", unit: "hero", strategy: "windDragon", at: { x: 2, y: 1 } });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("MP 부족");
  });

  it("무반격 공격 특성을 가진 공격자는 반격당하지 않는다", () => {
    const state = new BattleState(minimalStage(), flatMap(6, 6), 3);
    state.add(makeUnit({
      id: "hero", side: "player", unitClass: "catapult", level: 40,
      pos: { x: 1, y: 1 }, traits: ["noCounterAttack"],
    }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 40, pos: { x: 2, y: 1 } }));
    const battle = new Battle(state, { seed: 3 });
    battle.start();
    battle.execute({ kind: "attack", unit: "hero", target: "foe" });
    expect(state.log.some((e) => e.t === "counter")).toBe(false);
  });

  it("반격은 기본적으로 턴당 1회로 제한된다", () => {
    const state = new BattleState(minimalStage(), flatMap(6, 6), 4);
    state.add(makeUnit({ id: "a1", side: "player", unitClass: "infantry", level: 20, pos: { x: 1, y: 1 } }));
    state.add(makeUnit({ id: "a2", side: "player", unitClass: "infantry", level: 20, pos: { x: 3, y: 1 } }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 80, pos: { x: 2, y: 1 } }));
    const battle = new Battle(state, { seed: 4 });
    battle.start();
    battle.execute({ kind: "attack", unit: "a1", target: "foe" });
    battle.execute({ kind: "attack", unit: "a2", target: "foe" });
    expect(state.log.filter((e) => e.t === "counter")).toHaveLength(1);
  });

  it("무제한 반격 특성은 제한을 해제한다", () => {
    const state = new BattleState(minimalStage(), flatMap(6, 6), 4);
    state.add(makeUnit({ id: "a1", side: "player", unitClass: "infantry", level: 20, pos: { x: 1, y: 1 } }));
    state.add(makeUnit({ id: "a2", side: "player", unitClass: "infantry", level: 20, pos: { x: 3, y: 1 } }));
    state.add(makeUnit({
      id: "foe", side: "enemy", unitClass: "infantry", level: 80,
      pos: { x: 2, y: 1 }, traits: ["unlimitedCounter"],
    }));
    const battle = new Battle(state, { seed: 4 });
    battle.start();
    battle.execute({ kind: "attack", unit: "a1", target: "foe" });
    battle.execute({ kind: "attack", unit: "a2", target: "foe" });
    expect(state.log.filter((e) => e.t === "counter")).toHaveLength(2);
  });

  it("패배 조건이 승리 조건보다 우선한다", () => {
    const stage = minimalStage({
      victory: [{ type: "annihilate", side: "enemy" }],
      defeat: [{ type: "retreat", unit: "hero" }],
    });
    const state = new BattleState(stage, flatMap(6, 6), 7);
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "infantry", level: 10, pos: { x: 1, y: 1 } }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 10, pos: { x: 3, y: 3 } }));
    const battle = new Battle(state, { seed: 7 });
    battle.start();
    // 아군과 적군을 동시에 퇴각시킨다
    state.retreat(state.get("hero"));
    state.retreat(state.get("foe"));
    battle.execute({ kind: "endPhase" });
    expect(state.outcome).toBe("defeat");
  });
});

describe("무르기", () => {
  it("명령을 되돌리면 HP와 RNG 상태가 함께 복원된다", () => {
    const state = new BattleState(minimalStage(), flatMap(6, 6), 99);
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "infantry", level: 50, pos: { x: 1, y: 1 } }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 50, pos: { x: 2, y: 1 } }));
    const battle = new Battle(state, { seed: 99, undoDepth: 10 });
    battle.start();

    const hpBefore = state.get("foe").hp;
    battle.execute({ kind: "attack", unit: "hero", target: "foe" });
    const firstResult = state.log.filter((e) => e.t === "attack").at(-1);

    expect(battle.canUndo()).toBe(true);
    expect(battle.undo()).toBe(true);
    expect(state.get("foe").hp).toBe(hpBefore);
    expect(state.get("hero").hasActed).toBe(false);

    // 되돌린 뒤 같은 명령을 다시 실행하면 결과가 재현된다
    battle.execute({ kind: "attack", unit: "hero", target: "foe" });
    const secondResult = state.log.filter((e) => e.t === "attack").at(-1);
    expect(secondResult).toEqual(firstResult);
  });

  it("undoDepth를 넘으면 가장 오래된 스냅샷이 버려진다", () => {
    const state = duelState(5);
    const battle = new Battle(state, { seed: 5, undoDepth: 2 });
    battle.start();
    for (let i = 0; i < 5; i++) {
      expect(battle.execute({ kind: "wait", unit: "hero" }).ok).toBe(true);
      for (let phase = 0; phase < 4; phase++) battle.execute({ kind: 'endPhase' });
    }
    expect(battle.undo()).toBe(true);
    expect(battle.undo()).toBe(true);
    expect(battle.undo()).toBe(false);
  });
});

describe("결정론", () => {
  it("동일 시드 + 동일 명령 시퀀스는 동일한 로그를 만든다", () => {
    const run = () => {
      const state = duelState(2024, 40, 40);
      const battle = new Battle(state, { seed: 2024, strategies });
      battle.start();
      battle.execute({ kind: "attack", unit: "hero", target: "foe" });
      battle.execute({ kind: "endPhase" });
      battle.runAiPhase();
      return state.log;
    };
    expect(JSON.stringify(run())).toEqual(JSON.stringify(run()));
  });
});

describe("편입 아군과 점령 목표", () => {
  it("본대만 점령할 수 있는 칸에서 편입 아군은 비켜서고 본대가 담당한다", async () => {
    const { decide } = await import("../src/ai.ts");
    const state = new BattleState(minimalStage({ victory: [{ type: "capture", target: "objective", by: "player" }] }), flatMap(6, 6), 5);
    const ally = makeUnit({ id: "ally_a", name: "편입", side: "ally", unitClass: "infantry", level: 5, pos: { x: 5, y: 5 } });
    const hero = makeUnit({ id: "hero", name: "본대", side: "player", unitClass: "infantry", level: 5, pos: { x: 2, y: 2 } });
    state.add(ally); state.add(hero);
    const moveOff = decide(state, ally);
    expect(moveOff[0]?.kind).toBe("move");
    expect(moveOff.some((c) => c.kind === "capture")).toBe(false);
    const heroPlan = decide(state, hero);
    expect(heroPlan[0]?.kind).toBe("move");
  });
});

describe("한 방 보호(균형 규칙 6)", () => {
  it("누구도 한 번의 공격으로 최대 체력의 절반보다 많이 잃지 않는다", () => {
    const state = duelState(1, 1, 40);
    const hero = state.get("hero"), foe = state.get("foe");
    hero.ratioRules = foe.ratioRules = true;
    foe.stats.attack = 9999;
    const battle = new Battle(state, { seed: 1, strategies });
    battle.start();
    state.phaseIndex = PHASE_ORDER.indexOf("enemy");
    expect(battle.execute({ kind: "attack", unit: "foe", target: "hero" }).ok).toBe(true);
    expect(hero.alive).toBe(true);
    expect(hero.hp).toBeGreaterThanOrEqual(Math.floor(hero.stats.maxHp / 2));
  });

  it("적도 한 번에는 절반까지만 — 두 번 맞으면 쓰러진다", () => {
    const state = duelState(1, 40, 1);
    const foe = state.get("foe");
    foe.ratioRules = state.get("hero").ratioRules = true;
    state.get("hero").stats.attack = 9999;
    const battle = new Battle(state, { seed: 1, strategies });
    battle.start();
    expect(battle.execute({ kind: "attack", unit: "hero", target: "foe" }).ok).toBe(true);
    expect(foe.alive).toBe(true);
    expect(foe.hp).toBeLessThanOrEqual(Math.ceil(foe.stats.maxHp / 2));
  });
});
