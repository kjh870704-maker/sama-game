import { describe, it, expect } from "vitest";
import { computePhysical, matchupMultiplier, moraleMultiplier, elevationMultiplier, MIN_DAMAGE } from "../src/formulas.ts";
import { Rng } from "../src/rng.ts";
import { makeUnit } from "../src/units.ts";
import { flatMap } from "./fixtures.ts";

describe("병종 상성", () => {
  it("창병은 기병에게 강하고 기병은 창병에게 약하다", () => {
    expect(matchupMultiplier("spearman", "cavalry")).toBeGreaterThan(1);
    expect(matchupMultiplier("cavalry", "spearman")).toBeLessThan(1);
  });

  it("상성이 없으면 1.0", () => {
    expect(matchupMultiplier("engineer", "engineer")).toBe(1.0);
  });
});

describe("보정 계수", () => {
  it("사기 보정은 0.8~1.2 범위", () => {
    expect(moraleMultiplier(0)).toBeCloseTo(0.8);
    expect(moraleMultiplier(50)).toBeCloseTo(1.0);
    expect(moraleMultiplier(100)).toBeCloseTo(1.2);
  });

  it("사기는 범위 밖 값도 클램프한다", () => {
    expect(moraleMultiplier(-50)).toBeCloseTo(0.8);
    expect(moraleMultiplier(999)).toBeCloseTo(1.2);
  });

  it("고저차 보정은 ±30%로 제한된다", () => {
    expect(elevationMultiplier(10, 0)).toBeCloseTo(1.3);
    expect(elevationMultiplier(0, 10)).toBeCloseTo(0.7);
    expect(elevationMultiplier(1, 0)).toBeCloseTo(1.1);
  });
});

describe("물리 피해", () => {
  const map = flatMap(6, 6);

  it("방어력이 공격력을 압도해도 최소 피해는 들어간다", () => {
    const a = makeUnit({ id: "a", side: "player", unitClass: "civilian", level: 1, pos: { x: 0, y: 0 } });
    const d = makeUnit({ id: "d", side: "enemy", unitClass: "heavyCav", level: 99, pos: { x: 1, y: 0 } });
    const res = computePhysical(a, d, map, new Rng(1));
    if (res.hit) expect(res.damage).toBeGreaterThanOrEqual(MIN_DAMAGE);
  });

  it("물리 공격 면역은 피해를 완전히 막는다", () => {
    const a = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 50, pos: { x: 0, y: 0 } });
    const d = makeUnit({
      id: "d", side: "enemy", unitClass: "infantry", level: 10, pos: { x: 1, y: 0 },
      traits: ["physicalImmunity"],
    });
    const res = computePhysical(a, d, map, new Rng(1));
    expect(res.hit).toBe(false);
    expect(res.damage).toBe(0);
  });

  it("피해 감소 특성은 곱연산으로 합성되어 100%를 넘지 않는다", () => {
    const a = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 50, pos: { x: 0, y: 0 }, traits: ["alwaysHit"] });
    const plain = makeUnit({ id: "p", side: "enemy", unitClass: "infantry", level: 50, pos: { x: 1, y: 0 } });
    const tanky = makeUnit({
      id: "t", side: "enemy", unitClass: "infantry", level: 50, pos: { x: 1, y: 0 },
      traits: ["physicalDamageReduction", "defenseBoost"],
      traitParams: { physicalDamageReduction: 60, defenseBoost: 60 },
    });
    const dPlain = computePhysical(a, plain, map, new Rng(9)).damage;
    const dTanky = computePhysical(a, tanky, map, new Rng(9)).damage;
    expect(dTanky).toBeLessThan(dPlain);
    expect(dTanky).toBeGreaterThanOrEqual(MIN_DAMAGE); // 무적이 되지 않는다
  });

  it("같은 시드는 같은 피해를 낳는다", () => {
    const mk = () => makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 30, pos: { x: 0, y: 0 } });
    const mkd = () => makeUnit({ id: "d", side: "enemy", unitClass: "archer", level: 30, pos: { x: 1, y: 0 } });
    const r1 = computePhysical(mk(), mkd(), map, new Rng(31337));
    const r2 = computePhysical(mk(), mkd(), map, new Rng(31337));
    expect(r1).toEqual(r2);
  });
});

import { previewAttack, accuracy, createDamageContext } from "../src/formulas.ts";
describe("attack preview", () => {
  it("matches the real accuracy and stays inside the rolled damage band", () => {
    const map = flatMap(4, 1);
    const a = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 20, pos: { x: 0, y: 0 } });
    const d = makeUnit({ id: "d", side: "enemy", unitClass: "spearman", level: 20, pos: { x: 1, y: 0 } });
    const v = previewAttack(a, d, map, true);
    expect(v.hit).toBe(Math.round(accuracy(createDamageContext(a, d, "physical"), map)));
    expect(v.counter).toBeDefined();
    const rolls: number[] = [];
    for (let s = 1; s < 200; s++) { const r = computePhysical(a, d, map, new Rng(s)); if (r.hit && !r.critical) rolls.push(r.damage); }
    expect(v.damage).toBeGreaterThanOrEqual(Math.min(...rolls) - 1);
    expect(v.damage).toBeLessThanOrEqual(Math.max(...rolls) + 1);
    expect(previewAttack(a, d, map, false).counter).toBeUndefined();
  });
  it("drops the counter when the blow is lethal", () => {
    const map = flatMap(4, 1);
    const a = makeUnit({ id: "a", side: "player", unitClass: "infantry", level: 60, pos: { x: 0, y: 0 } });
    const d = makeUnit({ id: "d", side: "enemy", unitClass: "civilian", level: 1, pos: { x: 1, y: 0 } });
    const v = previewAttack(a, d, map, true);
    expect(v.lethal).toBe(true); expect(v.counter).toBeUndefined();
  });
});
