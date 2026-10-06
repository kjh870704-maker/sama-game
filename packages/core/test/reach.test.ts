import { describe, it, expect } from "vitest";
import { inReach, reachShape, reachOffsets, reachMul, engageDistance, reachLabel, reachSpec, tierOf, profileOf } from "../src/index.ts";

const o = { x: 0, y: 0 };
describe("병종별 공격 범위 — 진화할수록 넓어진다", () => {
  it("진화 전(1단)은 모든 근접 병종이 십자 네 칸", () => {
    for (const c of ["infantry", "spearman", "cavalry", "heavyCav", "monk", "bandit", "strategist"] as const) {
      expect(tierOf(c)).toBe(1);
      expect(reachShape(c)).toBe("cross");
      expect(reachOffsets({ unitClass: c, range: [1, 1] })).toHaveLength(4);
    }
  });
  it("기병·산적·무도가는 2단부터 팔방, 보병은 3단부터 팔방", () => {
    for (const c of ["lancer", "outlaw", "warriorMonk", "royalGuard"] as const) {
      expect(reachShape(c)).toBe("square");
      expect(inReach({ unitClass: c, range: [1, 1] }, o, { x: 1, y: 1 })).toBe(true);
      expect(reachOffsets({ unitClass: c, range: [1, 1] })).toHaveLength(8);
    }
    expect(reachShape("shieldGuard")).toBe("cross");
  });
  it("창병은 사방 그대로, 2단부터 일직선 두 칸까지 찌르고 그 뒤로는 넓어지지 않는다", () => {
    expect(reachOffsets({ unitClass: "spearman", range: [1, 1] })).toHaveLength(4);
    for (const c of ["pikeman", "halberdier", "divineSpear"] as const) {
      expect(reachShape(c)).toBe("cross");
      expect(inReach({ unitClass: c, range: [1, 1] }, o, { x: 0, y: 2 })).toBe(true);
      expect(inReach({ unitClass: c, range: [1, 1] }, o, { x: 1, y: 1 })).toBe(false);
      expect(inReach({ unitClass: c, range: [1, 1] }, o, { x: 0, y: 3 })).toBe(false);
      expect(reachOffsets({ unitClass: c, range: [1, 1] })).toHaveLength(8);
      expect(reachLabel(c)).toBe("십자 · 일직선 2칸");
    }
  });
  it("근접은 팔방까지만: 4단도 두 칸 밖은 닿지 않는다", () => {
    for (const c of ["northRider", "ironInfantry", "wujiHeavyCav"] as const) {
      expect(reachOffsets({ unitClass: c, range: [1, 1] })).toHaveLength(8);
      expect(inReach({ unitClass: c, range: [1, 1] }, o, { x: 0, y: 2 })).toBe(false);
      expect(reachSpec(c).line).toBe(0);
    }
  });
  it("궁·노는 진화해도 모양을 넓히지 않고 사거리는 최대 3칸", () => {
    expect(reachOffsets({ unitClass: "archer", range: [2, 2] })).toHaveLength(8);
    for (const c of ["longbow", "sharpshooter", "ytArcher", "greatBow", "bashuRepeater"] as const) {
      expect(reachShape(c)).toBe("cross");
      expect(profileOf(c).range[1]).toBeLessThanOrEqual(3);
      expect(inReach({ unitClass: c, range: profileOf(c).range }, o, { x: 4, y: 0 })).toBe(false);
    }
    expect(reachLabel("longbow")).toBe("십자");
  });
  it("넓어진 칸으로 친 평타는 정면보다 약하고, 대각선 접촉은 붙은 것으로 친다", () => {
    expect(reachMul({ pos: o, range: [1, 1] }, { x: 1, y: 1 })).toBeLessThan(1);
    expect(reachMul({ pos: o, range: [1, 1] }, { x: 1, y: 0 })).toBe(1);
    expect(reachMul({ pos: o, range: [1, 1] }, { x: 2, y: 0 })).toBeLessThan(1);
    expect(engageDistance(o, { x: 1, y: 1 })).toBe(1);
    expect(engageDistance(o, { x: 2, y: 0 })).toBe(2);
  });
});
