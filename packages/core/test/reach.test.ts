import { describe, it, expect } from "vitest";
import { inReach, reachShape, reachOffsets, reachMul, engageDistance, reachLabel, reachSpec, tierOf } from "../src/index.ts";

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
  it("창병은 2단부터 직선 2칸 찌르기, 4단은 팔방까지", () => {
    expect(inReach({ unitClass: "pikeman", range: [1, 1] }, o, { x: 0, y: 2 })).toBe(true);
    expect(inReach({ unitClass: "pikeman", range: [1, 1] }, o, { x: 1, y: 1 })).toBe(false);
    expect(reachOffsets({ unitClass: "divineSpear", range: [1, 1] })).toHaveLength(12);
  });
  it("궁병은 진화하면 직선으로 더 멀리 쏜다", () => {
    expect(reachOffsets({ unitClass: "archer", range: [2, 2] })).toHaveLength(8);
    expect(inReach({ unitClass: "longbow", range: [2, 3] }, o, { x: 4, y: 0 })).toBe(true);
    expect(inReach({ unitClass: "longbow", range: [2, 3] }, o, { x: 3, y: 1 })).toBe(false);
    expect(reachSpec("ytArcher").sq).toBe(2);
    expect(reachLabel("archer")).toBe("십자");
    expect(reachLabel("longbow")).toBe("십자 · 직선 +1");
  });
  it("넓어진 칸으로 친 평타는 정면보다 약하고, 대각선 접촉은 붙은 것으로 친다", () => {
    expect(reachMul({ pos: o, range: [1, 1] }, { x: 1, y: 1 })).toBeLessThan(1);
    expect(reachMul({ pos: o, range: [1, 1] }, { x: 1, y: 0 })).toBe(1);
    expect(reachMul({ pos: o, range: [1, 1] }, { x: 2, y: 0 })).toBeLessThan(1);
    expect(engageDistance(o, { x: 1, y: 1 })).toBe(1);
    expect(engageDistance(o, { x: 2, y: 0 })).toBe(2);
  });
});
