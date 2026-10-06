import { describe, it, expect } from "vitest";
import { inReach, reachShape, reachOffsets, reachMul, engageDistance } from "../src/index.ts";

describe("병종별 공격 범위", () => {
  it("기병·중기병·무도가·산적은 대각선으로 붙은 적도 친다", () => {
    for (const c of ["cavalry", "heavyCav", "monk", "bandit", "tigerRider"] as const) {
      expect(reachShape(c)).toBe("square");
      expect(inReach({ unitClass: c, range: [1, 1] }, { x: 5, y: 5 }, { x: 6, y: 6 })).toBe(true);
      expect(reachOffsets({ unitClass: c, range: [1, 1] })).toHaveLength(8);
    }
  });
  it("보병·창병·책사는 예전처럼 십자 네 칸", () => {
    for (const c of ["infantry", "spearman", "strategist"] as const) {
      expect(inReach({ unitClass: c, range: [1, 1] }, { x: 5, y: 5 }, { x: 6, y: 6 })).toBe(false);
      expect(reachOffsets({ unitClass: c, range: [1, 1] })).toHaveLength(4);
    }
  });
  it("궁병의 사거리 2는 그대로(대각선 한 칸 건너 포함)", () => {
    expect(reachOffsets({ unitClass: "archer", range: [2, 2] })).toHaveLength(8);
  });
  it("대각선 평타는 정면보다 약하고, 대각선 접촉은 붙은 것으로 친다", () => {
    expect(reachMul({ pos: { x: 0, y: 0 }, range: [1, 1] }, { x: 1, y: 1 })).toBeLessThan(1);
    expect(reachMul({ pos: { x: 0, y: 0 }, range: [1, 1] }, { x: 1, y: 0 })).toBe(1);
    expect(engageDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1);
    expect(engageDistance({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(2);
  });
});
