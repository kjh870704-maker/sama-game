import { describe, it, expect } from "vitest";
import { Battle } from "../src/battle.ts";
import { BattleState } from "../src/state.ts";
import { makeUnit } from "../src/units.ts";
import { DialogueScript } from "../src/dialogue.ts";
import { BattleMap } from "../src/grid.ts";
import { decide, hasSpotted } from "../src/ai.ts";
import { minimalStage, flatMap } from "./fixtures.ts";
import type { Tile, Coord, TerrainKind } from "../src/types.ts";
import type { StageEvent, StageDef } from "../src/stage.ts";

/**
 * 전투를 열어두기 위한 더미 적.
 * 기본 승리 조건이 "적 전멸"이므로, 적이 하나도 없으면 전투가 즉시 끝난다.
 */
function sentinel(pos: Coord = { x: 0, y: 0 }) {
  return makeUnit({
    id: "sentinel", side: "enemy", unitClass: "infantry", level: 1,
    pos, behavior: "passive",
  });
}

/** 특정 좌표만 벽으로 만든 맵 */
function mapWithWalls(w: number, h: number, walls: Coord[], regions?: Map<string, Coord[]>): BattleMap {
  const tiles: Tile[] = Array.from({ length: w * h }, (_, i) => {
    const x = i % w;
    const y = Math.floor(i / w);
    const isWall = walls.some((c) => c.x === x && c.y === y);
    return {
      terrain: (isWall ? "wall" : "plain") as TerrainKind,
      height: 0,
      hazard: "none" as const,
      hazardTurns: 0,
    };
  });
  return new BattleMap(w, h, tiles, regions ?? new Map([["objective", [{ x: w - 1, y: h - 1 }]]]));
}

// ─────────────────────────────────────────── M-09 ENCIRCLE_LOCK

describe("M-09 unit_surrounded", () => {
  function encircleStage(): StageDef {
    const ev: StageEvent = {
      id: "lock",
      trigger: { type: "unit_surrounded", unit: "boss", by: "ally" },
      actions: [{ type: "apply_effect", targets: ["boss"], effect: "immobile", duration: 99 }],
    };
    return minimalStage({ events: [ev] });
  }

  function setup(walls: Coord[]) {
    const state = new BattleState(encircleStage(), mapWithWalls(7, 7, walls), 1);
    state.add(makeUnit({ id: "boss", side: "enemy", unitClass: "cavalry", level: 30, pos: { x: 3, y: 3 } }));
    return state;
  }

  it("4방을 아군으로 모두 막으면 부동이 걸린다", () => {
    const state = setup([]);
    const around: Coord[] = [{ x: 3, y: 2 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 3 }];
    around.forEach((pos, i) =>
      state.add(makeUnit({ id: `g${i}`, side: "ally", unitClass: "infantry", level: 30, pos })),
    );
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.hasStatus(state.get("boss"), "immobile")).toBe(true);
  });

  it("한 칸이라도 비면 걸리지 않는다", () => {
    const state = setup([]);
    const around: Coord[] = [{ x: 3, y: 2 }, { x: 4, y: 3 }, { x: 3, y: 4 }];
    around.forEach((pos, i) =>
      state.add(makeUnit({ id: `g${i}`, side: "ally", unitClass: "infantry", level: 30, pos })),
    );
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.hasStatus(state.get("boss"), "immobile")).toBe(false);
  });

  it("벽도 봉쇄의 일부로 인정된다 — 지형에 몰아붙이는 해법이 성립", () => {
    // 왼쪽과 위를 벽으로 막고 나머지 두 칸만 아군으로 채운다
    const state = setup([{ x: 2, y: 3 }, { x: 3, y: 2 }]);
    [{ x: 4, y: 3 }, { x: 3, y: 4 }].forEach((pos, i) =>
      state.add(makeUnit({ id: `g${i}`, side: "ally", unitClass: "infantry", level: 30, pos })),
    );
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.hasStatus(state.get("boss"), "immobile")).toBe(true);
  });

  it("적 유닛으로 둘러싸인 것은 아군 포위로 치지 않는다", () => {
    const state = setup([]);
    const around: Coord[] = [{ x: 3, y: 2 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 2, y: 3 }];
    around.forEach((pos, i) =>
      state.add(makeUnit({ id: `e${i}`, side: "enemy", unitClass: "infantry", level: 30, pos })),
    );
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.hasStatus(state.get("boss"), "immobile")).toBe(false);
  });
});

// ─────────────────────────────────────────── M-08 CONSTRUCT

describe("M-08 region_held", () => {
  it("N턴 연속 점유해야 발동한다", () => {
    const regions = new Map<string, Coord[]>([["site", [{ x: 2, y: 2 }]], ["objective", [{ x: 6, y: 6 }]]]);
    const stage = minimalStage({
      events: [{
        id: "bridge",
        trigger: { type: "region_held", region: "site", by: "player", n: 3 },
        actions: [{ type: "terrain_change", region: "site", hazard: "none" }],
      }],
    });
    const state = new BattleState(stage, mapWithWalls(8, 8, [], regions), 1);
    state.add(makeUnit({ id: "eng", side: "player", unitClass: "engineer", level: 20, pos: { x: 2, y: 2 } }));
    state.add(sentinel({ x: 7, y: 0 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();

    expect(state.heldTurns("site", "player")).toBe(1);
    expect(state.firedEvents.has("bridge")).toBe(false);

    // 턴을 2번 넘긴다 (페이즈 4개 × 2)
    for (let i = 0; i < 8; i++) battle.endPhase();
    expect(state.heldTurns("site", "player")).toBe(3);
    expect(state.firedEvents.has("bridge")).toBe(true);
  });

  it("점유가 끊기면 시계가 초기화된다", () => {
    const regions = new Map<string, Coord[]>([["site", [{ x: 2, y: 2 }]]]);
    const state = new BattleState(minimalStage(), mapWithWalls(8, 8, [], regions), 1);
    const eng = makeUnit({ id: "eng", side: "player", unitClass: "engineer", level: 20, pos: { x: 2, y: 2 } });
    state.add(eng);
    state.add(sentinel({ x: 7, y: 0 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    for (let i = 0; i < 4; i++) battle.endPhase();
    expect(state.heldTurns("site", "player")).toBe(2);

    eng.pos = { x: 5, y: 5 }; // 영역에서 이탈
    for (let i = 0; i < 4; i++) battle.endPhase();
    expect(state.heldTurns("site", "player")).toBe(0);
  });

  it("적과 아군이 섞여 있으면 어느 쪽도 점유가 아니다", () => {
    const regions = new Map<string, Coord[]>([["site", [{ x: 2, y: 2 }, { x: 3, y: 2 }]]]);
    const state = new BattleState(minimalStage(), mapWithWalls(8, 8, [], regions), 1);
    state.add(makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 20, pos: { x: 2, y: 2 } }));
    state.add(makeUnit({ id: "b", side: "enemy", unitClass: "infantry", level: 20, pos: { x: 3, y: 2 } }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.heldTurns("site", "player")).toBe(0);
    expect(state.heldTurns("site", "enemy")).toBe(0);
  });
});

// ─────────────────────────────────────────── M-05 ESCORT

describe("M-05 escortee 행동", () => {
  it("적이 사거리에 있어도 교전하지 않고 목적지로 전진한다", () => {
    const regions = new Map<string, Coord[]>([["escort_goal", [{ x: 9, y: 1 }]]]);
    const state = new BattleState(minimalStage(), mapWithWalls(10, 4, [], regions), 1);
    const convoy = makeUnit({
      id: "convoy", side: "allyAi", unitClass: "infantry", level: 20,
      pos: { x: 1, y: 1 }, behavior: "escortee", goalRegion: "escort_goal",
    });
    state.add(convoy);
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 20, pos: { x: 2, y: 1 } }));

    const cmds = decide(state, convoy);
    expect(cmds.some((c) => c.kind === "attack")).toBe(false);
    const move = cmds.find((c) => c.kind === "move");
    expect(move).toBeDefined();
    // 목적지(x=9) 쪽으로 x가 증가해야 한다
    if (move?.kind === "move") expect(move.to.x).toBeGreaterThan(convoy.pos.x);
  });

  it("목표 영역이 없으면 제자리에서 대기한다", () => {
    const state = new BattleState(minimalStage(), flatMap(8, 8), 1);
    const convoy = makeUnit({
      id: "convoy", side: "allyAi", unitClass: "infantry", level: 20,
      pos: { x: 1, y: 1 }, behavior: "escortee", goalRegion: "nonexistent",
    });
    state.add(convoy);
    expect(decide(state, convoy)).toEqual([{ kind: "wait", unit: "convoy" }]);
  });
});

// ─────────────────────────────────────────── 목표 좌표 선택

describe("좁은 목표 영역에서의 이동", () => {
  it("동료가 점유한 칸 대신 빈 칸을 목표로 잡는다", () => {
    // 목표가 2칸뿐이고 한 칸을 동료가 이미 차지한 상황.
    // 점유 여부를 무시하면 제자리걸음에 빠진다.
    const regions = new Map<string, Coord[]>([["gate", [{ x: 5, y: 5 }, { x: 6, y: 5 }]]]);
    const stage = minimalStage({
      victory: [{ type: "reach", unit: "a", target: "gate" }],
      defeat: [{ type: "retreat", unit: "a" }],
    });
    const state = new BattleState(stage, mapWithWalls(8, 8, [], regions), 1);
    const a = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 20, pos: { x: 6, y: 4 } });
    state.add(a);
    state.add(makeUnit({ id: "b", side: "player", unitClass: "infantry", level: 20, pos: { x: 6, y: 5 } }));

    const cmds = decide(state, a);
    const move = cmds.find((c) => c.kind === "move");
    expect(move).toBeDefined();
    if (move?.kind === "move") {
      expect(move.to).not.toEqual(a.pos);            // 제자리걸음이 아니어야 한다
      expect(move.to).toEqual({ x: 5, y: 5 });        // 비어 있는 목표 칸
    }
  });

  it("모든 목표 칸이 찼으면 그래도 목표 쪽으로 접근한다", () => {
    const regions = new Map<string, Coord[]>([["gate", [{ x: 5, y: 5 }]]]);
    const stage = minimalStage({
      victory: [{ type: "reach", unit: "a", target: "gate" }],
      defeat: [{ type: "retreat", unit: "a" }],
    });
    const state = new BattleState(stage, mapWithWalls(8, 8, [], regions), 1);
    const a = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 20, pos: { x: 1, y: 1 } });
    state.add(a);
    state.add(makeUnit({ id: "b", side: "player", unitClass: "infantry", level: 20, pos: { x: 5, y: 5 } }));
    const cmds = decide(state, a);
    expect(cmds.some((c) => c.kind === "move")).toBe(true);
  });
});

// ─────────────────────────────────────────── M-02 PATROL_STEALTH

describe("M-02 순찰과 발각", () => {
  function patrolState() {
    const state = new BattleState(minimalStage(), flatMap(10, 10), 1);
    state.add(makeUnit({
      id: "guard", side: "enemy", unitClass: "infantry", level: 20,
      pos: { x: 1, y: 1 }, behavior: "patrol", visionRange: 2,
      patrolRoute: [{ x: 1, y: 1 }, { x: 5, y: 1 }],
    }));
    return state;
  }

  it("시야 밖이면 발각되지 않는다", () => {
    const state = patrolState();
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 20, pos: { x: 8, y: 8 } }));
    expect(hasSpotted(state, state.get("guard"))).toBe(false);
  });

  it("시야 안이면 발각된다", () => {
    const state = patrolState();
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 20, pos: { x: 2, y: 2 } }));
    expect(hasSpotted(state, state.get("guard"))).toBe(true);
  });

  it("발각 전에는 순찰 경로를 따라 이동한다", () => {
    const state = patrolState();
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 20, pos: { x: 9, y: 9 } }));
    const guard = state.get("guard");
    const cmds = decide(state, guard);
    const move = cmds.find((c) => c.kind === "move");
    expect(move).toBeDefined();
    if (move?.kind === "move") expect(move.to.x).toBeGreaterThan(1); // 다음 경유지(5,1) 방향
  });

  it("발각되면 순찰을 멈추고 교전 판단으로 넘어간다", () => {
    const state = patrolState();
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 20, pos: { x: 2, y: 1 } }));
    const cmds = decide(state, state.get("guard"));
    expect(cmds.some((c) => c.kind === "attack")).toBe(true);
  });

  it("unit_spotted 트리거가 이벤트를 발동시킨다", () => {
    const stage = minimalStage({
      events: [{
        id: "alarm",
        trigger: { type: "unit_spotted", watcher: "guard" },
        actions: [{ type: "apply_effect", targets: ["hero"], effect: "bleed", duration: 2 }],
      }],
    });
    const state = new BattleState(stage, flatMap(10, 10), 1);
    state.add(makeUnit({
      id: "guard", side: "enemy", unitClass: "infantry", level: 20,
      pos: { x: 1, y: 1 }, behavior: "patrol", visionRange: 2,
    }));
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 20, pos: { x: 2, y: 2 } }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.hasStatus(state.get("hero"), "bleed")).toBe(true);
  });
});

// ─────────────────────────────────────────── M-20 GUARD_LINK

describe("M-20 호위", () => {
  function guardState(attackerTraits: string[] = []) {
    const state = new BattleState(minimalStage(), flatMap(8, 8), 5);
    state.add(makeUnit({
      id: "atk", side: "enemy", unitClass: "spearman", level: 40,
      pos: { x: 3, y: 1 }, traits: ["alwaysHit", ...attackerTraits],
      traitParams: { penetrate: 50 },
    }));
    state.add(makeUnit({ id: "frail", side: "player", unitClass: "strategist", level: 40, pos: { x: 2, y: 1 } }));
    state.add(makeUnit({
      id: "shield", side: "player", unitClass: "infantry", level: 40,
      pos: { x: 1, y: 1 }, traits: ["guardian"],
    }));
    return state;
  }

  it("인접한 호위 아군이 피해를 대신 받는다", () => {
    const state = guardState();
    const battle = new Battle(state, { seed: 5 });
    battle.start();
    battle.execute({ kind: "endPhase" }); // player
    battle.execute({ kind: "endPhase" }); // ally
    battle.execute({ kind: "attack", unit: "atk", target: "frail" });

    expect(state.get("frail").hp).toBe(state.get("frail").stats.maxHp);
    expect(state.get("shield").hp).toBeLessThan(state.get("shield").stats.maxHp);
    expect(state.log.some((e) => e.t === "guard")).toBe(true);
  });

  it("관통 공격은 호위를 무시한다 — 반드시 대응 수단이 있어야 한다", () => {
    const state = guardState(["penetrate"]);
    const battle = new Battle(state, { seed: 5 });
    battle.start();
    battle.execute({ kind: "endPhase" });
    battle.execute({ kind: "endPhase" });
    battle.execute({ kind: "attack", unit: "atk", target: "frail" });

    expect(state.get("frail").hp).toBeLessThan(state.get("frail").stats.maxHp);
    expect(state.get("shield").hp).toBe(state.get("shield").stats.maxHp);
  });

  it("호위끼리는 전환되지 않는다 (1단계 제한)", () => {
    const state = new BattleState(minimalStage(), flatMap(8, 8), 5);
    state.add(makeUnit({ id: "atk", side: "enemy", unitClass: "cavalry", level: 40, pos: { x: 3, y: 1 }, traits: ["alwaysHit"] }));
    state.add(makeUnit({ id: "g1", side: "player", unitClass: "infantry", level: 40, pos: { x: 2, y: 1 }, traits: ["guardian"] }));
    state.add(makeUnit({ id: "g2", side: "player", unitClass: "infantry", level: 40, pos: { x: 1, y: 1 }, traits: ["guardian"] }));
    const battle = new Battle(state, { seed: 5 });
    battle.start();
    battle.execute({ kind: "endPhase" });
    battle.execute({ kind: "endPhase" });
    battle.execute({ kind: "attack", unit: "atk", target: "g1" });

    expect(state.get("g1").hp).toBeLessThan(state.get("g1").stats.maxHp);
    expect(state.get("g2").hp).toBe(state.get("g2").stats.maxHp);
  });

  it("적 유닛은 아군의 호위를 받지 않는다", () => {
    const state = new BattleState(minimalStage(), flatMap(8, 8), 5);
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "infantry", level: 40, pos: { x: 1, y: 1 }, traits: ["alwaysHit"] }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "archer", level: 40, pos: { x: 2, y: 1 } }));
    state.add(makeUnit({ id: "ourGuard", side: "player", unitClass: "infantry", level: 40, pos: { x: 3, y: 1 }, traits: ["guardian"] }));
    const battle = new Battle(state, { seed: 5 });
    battle.start();
    battle.execute({ kind: "attack", unit: "hero", target: "foe" });
    expect(state.get("foe").hp).toBeLessThan(state.get("foe").stats.maxHp);
    expect(state.get("ourGuard").hp).toBe(state.get("ourGuard").stats.maxHp);
  });
});

// ─────────────────────────────────────────── M-03 DIALOGUE_GATE

describe("M-03 대화 시스템", () => {
  const dialogues = [
    {
      id: "q1",
      text: "무엇을 하러 왔는가?",
      options: [
        { id: "right", text: "천자의 교지를 전달하러 왔다.", correct: true, next: "q2" },
        { id: "wrong", text: "정벌하러 왔다.", correct: false, next: "q2" },
      ],
    },
    { id: "q2", text: "위왕은 무엇인가?", options: [{ id: "ok", text: "한의 수호자다.", correct: true }] },
  ];

  function dialogueStage() {
    return minimalStage({
      dialogues,
      events: [
        { id: "open", trigger: { type: "battle_start" }, actions: [{ type: "play_dialogue", dialogueId: "q1" }] },
        {
          id: "penalty",
          trigger: { type: "dialogue_choice", nodeId: "q1", optionId: "wrong" },
          actions: [{ type: "apply_effect", targets: ["hero"], effect: "bleed", duration: 2, hpRatioDamage: 0.25 }],
        },
      ],
    });
  }

  function setup() {
    const state = new BattleState(dialogueStage(), flatMap(6, 6), 1);
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 40, pos: { x: 1, y: 1 } }));
    state.add(sentinel({ x: 5, y: 5 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    return { state, battle };
  }

  it("battle_start가 첫 대화를 연다", () => {
    const { state } = setup();
    expect(state.activeDialogue).toBe("q1");
  });

  it("정답을 고르면 다음 노드로 넘어가고 페널티가 없다", () => {
    const { state, battle } = setup();
    const full = state.get("hero").stats.maxHp;
    expect(battle.execute({ kind: "choose", nodeId: "q1", optionId: "right" }).ok).toBe(true);
    expect(state.activeDialogue).toBe("q2");
    expect(state.get("hero").hp).toBe(full);
  });

  it("오답은 즉시 패배가 아니라 HP 감소로 처리된다", () => {
    const { state, battle } = setup();
    const full = state.get("hero").stats.maxHp;
    battle.execute({ kind: "choose", nodeId: "q1", optionId: "wrong" });
    expect(state.get("hero").hp).toBe(full - Math.round(full * 0.25));
    expect(state.get("hero").alive).toBe(true);
    expect(state.outcome).toBe("ongoing");
  });

  it("활성 대화가 아닌 노드는 거부한다", () => {
    const { battle } = setup();
    const res = battle.execute({ kind: "choose", nodeId: "q2", optionId: "ok" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("활성 대화가 아님");
  });

  it("존재하지 않는 선택지는 거부한다 — 오타가 조용히 통과하지 않는다", () => {
    const { battle } = setup();
    const res = battle.execute({ kind: "choose", nodeId: "q1", optionId: "typo" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("선택지");
  });

  it("마지막 노드를 고르면 대화가 종료된다", () => {
    const { state, battle } = setup();
    battle.execute({ kind: "choose", nodeId: "q1", optionId: "right" });
    battle.execute({ kind: "choose", nodeId: "q2", optionId: "ok" });
    expect(state.activeDialogue).toBeNull();
  });

  it("dialogue_choice의 n은 누적 선택 횟수를 센다 — 한정 자원 소진 표현", () => {
    const nodes = [
      { id: "gate", text: "", options: [{ id: "pay", text: "", correct: true }] },
    ];
    const stage = minimalStage({
      dialogues: nodes,
      events: [
        { id: "open", trigger: { type: "battle_start" }, actions: [{ type: "play_dialogue", dialogueId: "gate" }] },
        {
          id: "broke",
          trigger: { type: "dialogue_choice", nodeId: "gate", optionId: "pay", n: 2 },
          actions: [{ type: "apply_effect", targets: ["hero"], effect: "bleed", duration: 2 }],
        },
      ],
    });
    const state = new BattleState(stage, flatMap(6, 6), 1);
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 40, pos: { x: 1, y: 1 } }));
    state.add(sentinel({ x: 5, y: 5 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();

    battle.execute({ kind: "choose", nodeId: "gate", optionId: "pay" });
    expect(state.firedEvents.has("broke")).toBe(false); // 1회로는 발동하지 않는다

    state.activeDialogue = "gate"; // 두 번째 조우
    battle.execute({ kind: "choose", nodeId: "gate", optionId: "pay" });
    expect(state.firedEvents.has("broke")).toBe(true);
  });

  it("끊긴 링크는 로드 시점에 거부된다", () => {
    expect(() =>
      new DialogueScript([{ id: "a", text: "", options: [{ id: "x", text: "", next: "없는노드" }] }]),
    ).toThrow(/없는 노드/);
  });

  it("선택지 없는 노드는 거부된다", () => {
    expect(() => new DialogueScript([{ id: "a", text: "", options: [] }])).toThrow(/선택지가 없음/);
  });
});

// ─────────────────────────────────────────── 무르기 회귀

describe("신규 상태의 무르기 복원", () => {
  it("대화 진행 상태도 되돌려진다", () => {
    const state = new BattleState(
      minimalStage({
        dialogues: [{ id: "n1", text: "", options: [{ id: "a", text: "", next: "n2" }] }, { id: "n2", text: "", options: [{ id: "b", text: "" }] }],
        events: [{ id: "o", trigger: { type: "battle_start" }, actions: [{ type: "play_dialogue", dialogueId: "n1" }] }],
      }),
      flatMap(6, 6),
      1,
    );
    state.add(makeUnit({ id: "hero", side: "player", unitClass: "strategist", level: 20, pos: { x: 1, y: 1 } }));
    state.add(sentinel({ x: 5, y: 5 }));
    const battle = new Battle(state, { seed: 1, undoDepth: 5 });
    battle.start();

    expect(state.activeDialogue).toBe("n1");
    battle.execute({ kind: "choose", nodeId: "n1", optionId: "a" });
    expect(state.activeDialogue).toBe("n2");
    expect(state.choices).toHaveLength(1);

    battle.undo();
    expect(state.activeDialogue).toBe("n1");
    expect(state.choices).toHaveLength(0);
  });
});

describe("지형 기믹", () => {
  it("절벽은 모두 막고, 산지는 기병을 묶으며, 급류·갈대·잔도·여울은 병종마다 다르다", async () => {
    const { flatMap } = await import("./fixtures.ts");
    const at = { x: 1, y: 1 };
    const cost = (t: Parameters<typeof flatMap>[2], cls: Parameters<ReturnType<typeof flatMap>["moveCost"]>[0]) => flatMap(3, 3, t).moveCost(cls, at);
    for (const cls of ["infantry", "cavalry", "navy", "monk", "bandit"] as const) expect(cost("cliff", cls)).toBe(Infinity);
    expect(cost("mountain", "heavyCav")).toBe(Infinity);
    expect(cost("mountain", "cavalry")).toBe(6);
    expect(cost("rapids", "navy")).toBe(3);
    expect(cost("marsh", "heavyCav")).toBe(Infinity);
    expect(cost("marsh", "navy")).toBe(2);
    expect(cost("plank", "infantry")).toBe(2);
    expect(cost("plank", "catapult")).toBe(Infinity);
    expect(cost("ford", "cavalry")).toBe(2);
    expect(cost("ford", "ram")).toBe(Infinity);
    expect(flatMap(3, 3, "marsh").evasionBonus(at)).toBe(15);
    expect(flatMap(3, 3, "plank").evasionBonus(at)).toBe(-10);
  });
});

describe("terrain_change", () => {
  it("builds a bridge over water once the bank is held, and logs it", () => {
    const regions = new Map<string, Coord[]>([["bank", [{ x: 2, y: 2 }]], ["span", [{ x: 3, y: 2 }]], ["objective", [{ x: 6, y: 6 }]]]);
    const stage = minimalStage({
      events: [{ id: "bridge", trigger: { type: "region_held", region: "bank", by: "player", n: 2 }, actions: [{ type: "terrain_change", region: "span", terrain: "bridge" }] }],
    });
    const map = mapWithWalls(8, 8, [], regions);
    (map.tileAt({ x: 3, y: 2 }) as { terrain: string }).terrain = "water";
    const state = new BattleState(stage, map, 1);
    state.add(makeUnit({ id: "eng", side: "player", unitClass: "engineer", level: 20, pos: { x: 2, y: 2 } }));
    state.add(sentinel({ x: 7, y: 0 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(Number.isFinite(map.moveCost("infantry", { x: 3, y: 2 }))).toBe(false);
    for (let i = 0; i < 4; i++) battle.endPhase();
    expect(map.tileAt({ x: 3, y: 2 }).terrain).toBe("bridge");
    expect(Number.isFinite(map.moveCost("infantry", { x: 3, y: 2 }))).toBe(true);
    expect(state.log.some((e) => e.t === "terrain" && e.region === "span")).toBe(true);
  });
});

describe("M-18 telegraph_aoe", () => {
  const setup = () => {
    const regions = new Map<string, Coord[]>([["strike", [{ x: 2, y: 2 }, { x: 3, y: 2 }]], ["objective", [{ x: 6, y: 6 }]]]);
    const stage = minimalStage({
      events: [{ id: "bolt", trigger: { type: "battle_start" }, actions: [{ type: "telegraph_aoe", region: "strike", duration: 1, magnitude: 40, effect: "shock", label: "낙뢰" }] }],
    });
    const state = new BattleState(stage, mapWithWalls(8, 8, [], regions), 1);
    state.add(makeUnit({ id: "stay", side: "player", unitClass: "infantry", level: 20, pos: { x: 2, y: 2 } }));
    state.add(makeUnit({ id: "dodge", side: "player", unitClass: "infantry", level: 20, pos: { x: 3, y: 2 } }));
    state.add(sentinel({ x: 7, y: 0 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    return { state, battle };
  };
  it("warns first, then strikes only who stayed, without retreating them", () => {
    const { state, battle } = setup();
    expect(state.log.some((e) => e.t === "telegraph" && e.cells.length === 2)).toBe(true);
    const stay = state.get("stay"), dodge = state.get("dodge"), before = stay.hp;
    expect(battle.execute({ kind: "move", unit: "dodge", to: { x: 3, y: 4 } }).ok).toBe(true);
    for (let i = 0; i < 4; i++) battle.endPhase();
    expect(stay.hp).toBe(before - Math.round(stay.stats.maxHp * 0.4));
    expect(stay.statuses.some((s) => s.kind === "shock")).toBe(true);
    expect(dodge.hp).toBe(dodge.stats.maxHp);
    expect(state.telegraphs).toHaveLength(0);
    const strike = state.log.find((e) => e.t === "strike");
    expect(strike && strike.t === "strike" && strike.hits.map((h) => h.unit)).toEqual(["stay"]);
  });
  it("treats a zero-damage telegraph as a warning marker that never strikes", () => {
    const regions = new Map<string, Coord[]>([["ford", [{ x: 2, y: 2 }]], ["objective", [{ x: 6, y: 6 }]]]);
    const stage = minimalStage({ events: [{ id: "warn", trigger: { type: "battle_start" }, actions: [{ type: "telegraph_aoe", region: "ford", duration: 2, magnitude: 0, label: "증원" }] }] });
    const state = new BattleState(stage, mapWithWalls(8, 8, [], regions), 1);
    state.add(makeUnit({ id: "stay", side: "player", unitClass: "infantry", level: 20, pos: { x: 2, y: 2 } }));
    state.add(sentinel({ x: 7, y: 0 }));
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(state.log.some((e) => e.t === "telegraph" && e.warning === true)).toBe(true);
    for (let i = 0; i < 8; i++) battle.endPhase();
    expect(state.telegraphs).toHaveLength(0);
    expect(state.log.some((e) => e.t === "strike")).toBe(false);
    expect(state.get("stay").hp).toBe(state.get("stay").stats.maxHp);
  });
  it("never retreats a unit", () => {
    const { state, battle } = setup();
    state.get("stay").hp = 3;
    for (let i = 0; i < 4; i++) battle.endPhase();
    expect(state.get("stay").hp).toBe(1);
    expect(state.get("stay").alive).toBe(true);
  });
});

describe("fire hazard movement", () => {
  it("charges two extra movement for crossing a burning tile", () => {
    const map = flatMap(8, 3);
    const u = makeUnit({ id: "c", side: "player", unitClass: "infantry", level: 5, pos: { x: 0, y: 1 } });
    const before = map.reachable(u, new Map()).get("3,1");
    (map.tileAt({ x: 1, y: 1 }) as Tile).hazard = "fire";
    (map.tileAt({ x: 1, y: 0 }) as Tile).hazard = "fire";
    (map.tileAt({ x: 1, y: 2 }) as Tile).hazard = "fire";
    expect(map.reachable(u, new Map()).get("3,1")).toBe((before ?? 0) + 2);
  });
});

describe("M-18 telegraph awareness", () => {
  it("never lets a player-side unit end its move on a cell a blow is due to land on", () => {
    const regions = new Map<string, Coord[]>([["objective", [{ x: 7, y: 2 }]]]);
    const state = new BattleState(minimalStage({}), mapWithWalls(8, 5, [], regions), 1);
    state.add(makeUnit({ id: "p", side: "player", unitClass: "infantry", level: 10, pos: { x: 0, y: 2 } }));
    state.add(makeUnit({ id: "foe", side: "enemy", unitClass: "infantry", level: 1, pos: { x: 6, y: 2 }, behavior: "hold" }));
    const marked = [1, 2, 3, 4].flatMap((x) => [0, 1, 2, 3, 4].map((y) => ({ x, y })));
    state.telegraphs.push({ id: "t", cells: marked, at: 2, ratio: 30 });
    for (const cmd of decide(state, state.get("p"))) {
      if (cmd.kind === "move") expect(marked.some((c) => c.x === cmd.to.x && c.y === cmd.to.y)).toBe(false);
    }
    state.telegraphs[0]!.ratio = 0; // a warning marker only: no reason to avoid it
    expect(decide(state, state.get("p")).some((c) => c.kind === "move")).toBe(true);
  });
});
