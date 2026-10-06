import { describe, it, expect } from "vitest";
import {
  ccHitChance, ccRatioChance, gainOf, specialization, ccStatsFor, genericAbility, gradeProfileOf,
  terrainEfficiency, efficiencyMark, ccRecoverChance,
} from "../src/cc-rules.ts";
import { accuracy, createDamageContext, doubleAttackChance } from "../src/formulas.ts";
import { evolveUnit, makeUnit } from "../src/units.ts";
import { Battle } from "../src/battle.ts";
import { BattleState } from "../src/state.ts";
import { flatMap, minimalStage } from "./fixtures.ts";
import type { Unit } from "../src/types.ts";

const cc = (u: Unit, ability = genericAbility(u.unitClass)): Unit => {
  u.ccRules = true;
  u.ability = ability;
  u.stats = ccStatsFor(u.unitClass, u.level, ability, u.side, u.stats.movement);
  u.hp = u.stats.maxHp;
  u.mp = u.stats.maxMp;
  return u;
};

describe("조조전 확률표", () => {
  it("명중: 2배 초과면 100, 같으면 90, 3배 이상 낮으면 30", () => {
    expect(ccHitChance(201, 100)).toBe(100);
    expect(ccHitChance(100, 100)).toBe(90);
    expect(ccHitChance(150, 100)).toBe(95);
    expect(ccHitChance(80, 100)).toBeCloseTo(78);
    expect(ccHitChance(45, 100)).toBeCloseTo(40.5);
    expect(ccHitChance(30, 100)).toBe(30);
  });
  it("2회 공격·회심: 낮으면 1, 조금 높으면 2~20, 2배 초과부터 크게, 3배 초과 100", () => {
    expect(ccRatioChance(90, 100)).toBe(1);
    expect(ccRatioChance(150, 100)).toBeCloseTo(11);
    expect(ccRatioChance(250, 100)).toBeCloseTo(60);
    expect(ccRatioChance(301, 100)).toBe(100);
  });
  it("상태 이상 회복 확률은 운의 절반", () => {
    const u = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 1, pos: { x: 0, y: 0 } });
    u.ability = { war: 50, int: 50, lead: 50, agi: 50, luck: 84 };
    expect(ccRecoverChance(u)).toBe(42);
  });
});

describe("조조전 성장", () => {
  it("상승치는 등급과 장수 능력 구간으로 정한다", () => {
    expect(gainOf("S", 95)).toBe(4);
    expect(gainOf("S", 80)).toBe(3);
    expect(gainOf("B", 90)).toBe(3);
    expect(gainOf("C", 40)).toBe(1);
  });
  it("문서 예시: 레벨 10, 순발 B, 민첩 90 → 순발력 45 + 3×10 = 75", () => {
    const s = ccStatsFor("infantry", 10, { war: 60, int: 60, lead: 60, agi: 90, luck: 60 }, "player", 5);
    expect(gradeProfileOf("infantry").grades[3]).toBe("B");
    expect(s.agility).toBe(75);
  });
  it("특화·열화: 일반 병사보다 상승치가 높으면 특화, 낮으면 열화", () => {
    expect(specialization("B", 90)).toBe(1);
    expect(specialization("B", 60)).toBe(0);
    expect(specialization("S", 40)).toBe(-1);
  });
  it("우군·적군은 한 레벨 낮은 능력치를 갖는다", () => {
    const ab = genericAbility("cavalry");
    const mine = ccStatsFor("cavalry", 10, ab, "player", 7), theirs = ccStatsFor("cavalry", 10, ab, "enemy", 7);
    const lower = ccStatsFor("cavalry", 9, ab, "player", 7);
    expect(theirs.attack).toBe(lower.attack);
    expect(theirs.attack).toBeLessThan(mine.attack);
  });
  it("진화하면 새 병과의 등급으로 다시 계산하고 HP 상승치를 두 배 더 받는다", () => {
    const u = cc(makeUnit({ id: "a", side: "player", unitClass: "cavalry", level: 12, pos: { x: 0, y: 0 } }));
    const before = u.stats.maxHp;
    evolveUnit(u, "lancer");
    expect(u.stats.maxHp).toBe(before + gradeProfileOf("lancer").hp[1] * 2);
  });
});

describe("조조전 지형 효율", () => {
  it("기병은 평지 ◎, 산지 X, 성채는 모두 ★", () => {
    expect(efficiencyMark(terrainEfficiency("cavalry", "plain"))).toBe("◎");
    expect(efficiencyMark(terrainEfficiency("cavalry", "mountain"))).toBe("X");
    expect(efficiencyMark(terrainEfficiency("archer", "fort"))).toBe("★");
  });
});

describe("조조전 전투", () => {
  it("명중은 순발력 비율로, 지형 회피는 쓰지 않는다", () => {
    const map = flatMap(6, 6);
    const a = cc(makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 5, pos: { x: 0, y: 0 } }));
    const d = cc(makeUnit({ id: "d", side: "enemy", unitClass: "infantry", level: 5, pos: { x: 1, y: 0 } }));
    a.stats.agility = 100; d.stats.agility = 100;
    expect(accuracy(createDamageContext(a, d, "physical"), map)).toBe(90);
    d.stats.agility = 300;
    expect(accuracy(createDamageContext(a, d, "physical"), map)).toBe(30);
  });
  it("순발력이 3배 넘게 높으면 반드시 두 번 친다", () => {
    const a = cc(makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 10, pos: { x: 0, y: 0 } }));
    const d = cc(makeUnit({ id: "d", side: "enemy", unitClass: "infantry", level: 10, pos: { x: 1, y: 0 } }));
    a.stats.agility = 400; d.stats.agility = 100;
    expect(doubleAttackChance(a, d)).toBe(100);
    a.ccRules = false;
    expect(doubleAttackChance(a, d)).toBe(0);
  });
  it("2회 공격은 로그에 연속 공격으로 남는다", () => {
    const map = flatMap(6, 6);
    const a = cc(makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 10, pos: { x: 0, y: 0 } }));
    const d = cc(makeUnit({ id: "d", side: "enemy", unitClass: "infantry", level: 10, pos: { x: 1, y: 0 } }));
    a.stats.agility = 400; d.stats.agility = 100; d.stats.maxHp = d.hp = 999;
    const state = new BattleState(minimalStage(), map, 1);
    state.add(a); state.add(d);
    const battle = new Battle(state, { seed: 1 });
    battle.start();
    expect(battle.execute({ kind: "attack", unit: "a", target: "d" }).ok).toBe(true);
    const hits = state.log.filter((e) => e.t === "attack");
    expect(hits).toHaveLength(2);
    expect(hits[1]).toMatchObject({ double: true });
  });
});
