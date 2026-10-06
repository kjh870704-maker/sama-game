import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateStage, PERF_BUDGET, type StageDef } from "../src/stage.ts";
import { loadMap, type MapFile } from "../src/mapio.ts";
import { parseSeal, evaluate, evaluateGroup } from "../src/conditions.ts";
import { minimalStage, flatMap } from "./fixtures.ts";
import { BattleState } from "../src/state.ts";
import { makeUnit } from "../src/units.ts";

const DATA = join(import.meta.dirname, "../../data");

describe("스테이지 검증", () => {
  it("성능 예산을 넘긴 스테이지를 잡아낸다", () => {
    const bad = minimalStage({ perf: { maxSimultaneousUnits: 25, tier: "A" } });
    const errs = validateStage(bad);
    expect(errs.some((e) => e.includes("성능 예산 초과"))).toBe(true);
  });

  it("Tier C 상한(80)까지는 통과시킨다", () => {
    const okStage = minimalStage({ perf: { maxSimultaneousUnits: 80, tier: "C" } });
    expect(validateStage(okStage)).toHaveLength(0);
    expect(PERF_BUDGET.C.maxUnits).toBe(80);
  });

  it("인장이 3개가 아니면 거부한다", () => {
    const bad = minimalStage({ seals: [{ slot: 1, normal: "clear", extreme: "clear" }] });
    expect(validateStage(bad).some((e) => e.includes("정확히 3개"))).toBe(true);
  });

  it("편입 아군이 있는데 손실 인장에 note가 없으면 잡아낸다 (R-5.5)", () => {
    const bad = minimalStage({
      deployment: { forced: ["hero"], slots: 1, grantedUnits: [{ type: "infantry", count: 4 }] },
      seals: [
        { slot: 1, normal: "clear", extreme: "clear" },
        { slot: 2, normal: "turn_limit:10", extreme: "turn_limit:8" },
        { slot: 3, normal: "player_losses_lt:3", extreme: "player_losses_lt:3" },
      ],
    });
    expect(validateStage(bad).some((e) => e.includes("R-5.5"))).toBe(true);
  });

  it("극한 난이도가 일반보다 약하면 잡아낸다", () => {
    const bad = minimalStage({
      difficulty: {
        normal: { minEnemyLevel: 50, recommendedLevel: 60 },
        extreme: { minEnemyLevel: 40, recommendedLevel: 80 },
      },
    });
    expect(validateStage(bad).some((e) => e.includes("적 레벨이 일반 이하"))).toBe(true);
  });

  it("승리 조건의 turn_limit을 거부한다 — 1턴차에 즉시 충족되어 전투가 바로 끝난다", () => {
    const bad = minimalStage({ victory: [{ type: "turn_limit", n: 20 }] });
    expect(validateStage(bad).some((e) => e.includes("turn_limit"))).toBe(true);
  });

  it("패배 조건의 turn_limit도 거부한다", () => {
    const bad = minimalStage({ defeat: [{ type: "turn_limit", n: 20 }] });
    expect(validateStage(bad).some((e) => e.includes("turn_limit"))).toBe(true);
  });

  it("인장에서의 turn_limit은 정상이다", () => {
    const okStage = minimalStage();
    expect(okStage.seals[1]?.normal).toBe("turn_limit:10");
    expect(validateStage(okStage)).toEqual([]);
  });

  it("실제 S1-08 데이터는 검증을 통과한다", () => {
    const stage = JSON.parse(readFileSync(join(DATA, "stages/S1-08.json"), "utf8")) as StageDef;
    expect(validateStage(stage)).toEqual([]);
  });
});

describe("맵 로더", () => {
  it("실제 맵 파일을 읽는다", () => {
    const file = JSON.parse(
      readFileSync(join(DATA, "maps/hanzhong-central-fort.json"), "utf8"),
    ) as MapFile;
    const map = loadMap(file);
    expect(map.width).toBe(48);
    expect(map.height).toBe(36);
    expect(map.regionCoords("central_fort")).toHaveLength(9);
    expect(map.tileAt({ x: 37, y: 9 }).terrain).toBe("fort");
    expect(map.tileAt({ x: 0, y: 0 }).terrain).toBe("cliff");
  });

  it("범례에 없는 문자를 거부한다", () => {
    expect(() => loadMap({ id: "t", legend: { ".": "plain" }, rows: [".X"] })).toThrow(/범례에 없음/);
  });

  it("행 길이가 다르면 거부한다", () => {
    expect(() => loadMap({ id: "t", legend: { ".": "plain" }, rows: ["..", "..."] })).toThrow(/길이가/);
  });

  it("맵 밖 영역 좌표를 거부한다", () => {
    expect(() =>
      loadMap({ id: "t", legend: { ".": "plain" }, rows: [".."], regions: { r: [{ x: 5, y: 0 }] } }),
    ).toThrow(/범위를 벗어남/);
  });
});

describe("인장 표현식", () => {
  it("숫자 인자를 파싱한다", () => {
    expect(parseSeal("turn_limit:20")).toEqual({ type: "turn_limit", n: 20 });
  });

  it("clear는 무조건 달성되는 조건(null)", () => {
    expect(parseSeal("clear")).toBeNull();
  });

  it("인자가 빠지면 조용히 통과하지 않고 throw 한다", () => {
    expect(() => parseSeal("turn_limit")).toThrow(/숫자 인자가 필요/);
    expect(() => parseSeal("unit_retreat")).toThrow(/대상 인자가 필요/);
  });

  it("알 수 없는 표현식은 throw 한다", () => {
    expect(() => parseSeal("nonsense:1")).toThrow(/알 수 없는 인장/);
  });
});

describe("조건 평가", () => {
  function stateWith(): BattleState {
    const s = new BattleState(minimalStage(), flatMap(8, 8), 1);
    s.add(makeUnit({ id: "hero", side: "player", unitClass: "infantry", level: 20, pos: { x: 0, y: 0 } }));
    s.add(makeUnit({ id: "buddy", side: "ally", unitClass: "infantry", level: 20, pos: { x: 1, y: 0 } }));
    s.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 20, pos: { x: 7, y: 7 } }));
    return s;
  }

  it("ally_loss_limit은 편입 아군의 손실도 센다 (R-5.5)", () => {
    const s = stateWith();
    const cond = { type: "ally_loss_limit" as const, n: 1 };
    expect(evaluate(s, cond)).toBe(true);
    s.retreat(s.get("buddy")); // 편입 아군 1기 퇴각
    expect(evaluate(s, cond)).toBe(false);
  });

  it("reach는 지정 영역 위에 있을 때만 참", () => {
    const s = stateWith();
    const cond = { type: "reach" as const, unit: "hero", target: "objective" };
    expect(evaluate(s, cond)).toBe(false);
    s.get("hero").pos = { x: 7, y: 7 };
    expect(evaluate(s, cond)).toBe(true);
  });

  it("순차 조건은 모든 단계를 충족해야 참", () => {
    const s = stateWith();
    const seq = [
      { type: "reach" as const, unit: "hero", target: "objective", order: 1 },
      { type: "retreat" as const, unit: "foe", order: 2 },
    ];
    expect(evaluateGroup(s, seq)).toBe(false);
    s.get("hero").pos = { x: 7, y: 7 };
    expect(evaluateGroup(s, seq)).toBe(false); // 2단계 미충족
    s.retreat(s.get("foe"));
    expect(evaluateGroup(s, seq)).toBe(true);
  });

  it("order 없는 조건들은 OR로 평가된다", () => {
    const s = stateWith();
    const anyOf = [
      { type: "reach" as const, unit: "hero", target: "objective" },
      { type: "retreat" as const, unit: "foe" },
    ];
    expect(evaluateGroup(s, anyOf)).toBe(false);
    s.retreat(s.get("foe"));
    expect(evaluateGroup(s, anyOf)).toBe(true);
  });
});
