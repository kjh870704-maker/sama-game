import { describe, it, expect } from "vitest";
import { makeUnit, evolveUnit } from "../src/units.ts";
import { FOUR_STAGE_LINES, finalClassOf } from "../src/classes.ts";
import { reachSpec, unitReachSpec, inReach } from "../src/reach.ts";
import { createDamageContext } from "../src/formulas.ts";
import { applyTraitHooks } from "../src/traits.ts";
import {
  TROOP_EFFECTS, troopEffectOf, troopEffectText, syncTroopEffect, applyOfficerEffect, topAbility, applyFamedReach, unitEffectNotes,
} from "../src/troop-effects.ts";

const unit = (unitClass: Parameters<typeof makeUnit>[0]["unitClass"], side: "player" | "enemy" = "player", pos = { x: 1, y: 1 }) =>
  makeUnit({ id: unitClass + side, side, unitClass, level: 20, pos });

describe("부대효과: 승급할 때마다 수치가 오른다", () => {
  it("모든 4단계 계통에 부대효과가 있고 수치는 단계마다 늘어난다", () => {
    for (const line of FOUR_STAGE_LINES) {
      const e = TROOP_EFFECTS[line[0]];
      expect(e, line[0]).toBeDefined();
      expect(e!.values).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(e!.values[i]!, line[0]).toBeGreaterThan(e!.values[i - 1]!);
      line.forEach((c, i) => expect(troopEffectOf(c)?.tier, c).toBe(i + 1));
    }
  });

  it("설명은 예시처럼 단계별 수치를 모두 적고, 단계를 주면 그 수치만 적는다", () => {
    const e = TROOP_EFFECTS.strategist!;
    expect(troopEffectText(e)).toBe("HP가 50% 이상일 경우 모든 책략에 대한 피해가 10 / 20 / 30 / 40% 만큼 감소한다.");
    expect(troopEffectText(e, 3)).toContain("30%");
  });

  it("진화하면 같은 부대효과의 다음 단계로 바뀐다", () => {
    const u = unit("infantry");
    syncTroopEffect(u);
    expect(u.traitParams["troop:infantry"]).toBe(1);
    evolveUnit(u, "royalGuard");
    syncTroopEffect(u);
    expect(u.traits.filter((t) => t.startsWith("troop:"))).toEqual(["troop:infantry"]);
    expect(u.traitParams["troop:infantry"]).toBe(3);
  });

  it("임기응변: HP 50% 이상이면 받는 책략 피해가 단계만큼 줄고, 그 아래면 줄지 않는다", () => {
    const caster = unit("taoist", "enemy", { x: 2, y: 1 });
    const sage = unit("mastermind");
    syncTroopEffect(sage);
    const ctx = createDamageContext(caster, sage, "strategy");
    applyTraitHooks(ctx);
    const healthy = ctx.reduction;
    sage.hp = Math.floor(sage.stats.maxHp * 0.4);
    const ctx2 = createDamageContext(caster, sage, "strategy");
    applyTraitHooks(ctx2);
    expect(healthy - ctx2.reduction).toBeCloseTo(0.3, 5);
  });
});

describe("장수 특성: 부대효과에 하나 더, 병종 단계를 따른다", () => {
  it("가장 높은 능력을 고르되 병종의 본업 능력에 무게를 둔다", () => {
    const yi = { war: 63, int: 96, lead: 98, pol: 93, cha: 80 };
    expect(topAbility(yi)).toBe("lead");
    expect(topAbility(yi, "int")).toBe("int");
  });
  it("병종 단계가 수치 단계가 된다", () => {
    const u = unit("tigerRider");
    applyOfficerEffect(u, "war", 3);
    syncTroopEffect(u);
    const notes = unitEffectNotes(u);
    expect(notes.map((n) => n.kind)).toEqual(["officer", "troop"]);
    expect(notes[0]!.text).toContain("15%");
  });
});

describe("이름난 장수: 공격 범위는 그 계통 마지막 진화를 넘지 않는다", () => {
  it("모든 병종에서 넓어진 모양이 마지막 진화 병종의 모양 이하다", () => {
    for (const line of FOUR_STAGE_LINES) for (const c of line) {
      const u = unit(c);
      applyFamedReach(u, "관우");
      const mine = unitReachSpec(u), top = reachSpec(finalClassOf(c));
      expect(mine.sq, c).toBeLessThanOrEqual(top.sq);
      expect(mine.line, c).toBeLessThanOrEqual(top.line);
      expect(u.range[1], c).toBeLessThanOrEqual(Math.max(makeUnit({ id: "x", side: "player", unitClass: c, level: 20, pos: { x: 0, y: 0 } }).range[1], unit(finalClassOf(c)).range[1]));
    }
  });
  it("1단계 기병도 팔방으로 친다, 이름 없는 장수는 그대로다", () => {
    const famed = unit("cavalry"), plain = unit("cavalry", "player", { x: 1, y: 1 });
    expect(applyFamedReach(famed, "조운")).toBe(true);
    expect(applyFamedReach(plain, "무명")).toBe(false);
    expect(inReach(famed, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(true);
    expect(inReach(plain, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
  });
});
