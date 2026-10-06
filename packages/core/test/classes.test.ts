import { describe, it, expect } from "vitest";
import { makeUnit, evolveUnit, statsFor, profileOf } from "../src/units.ts";
import { getTrait } from "../src/traits.ts";
import "../src/index.ts";
import { evolvedClass, familyOf, tierOf, nextEvolution, VARIANTS, EVOLUTION } from "../src/classes.ts";
import { matchupMultiplier } from "../src/formulas.ts";
import { flatMap } from "./fixtures.ts";
import type { UnitClass } from "../src/types.ts";

describe("병종 계통과 진화", () => {
  it("evolves at the lineage thresholds, skipping tiers when the level is already past them", () => {
    expect(evolvedClass("infantry", 7)).toBe("infantry");
    expect(evolvedClass("infantry", 8)).toBe("shieldGuard");
    expect(evolvedClass("infantry", 20)).toBe("royalGuard");
    expect(evolvedClass("navy", 29)).toBe("louchuan");
    expect(evolvedClass("navy", 30)).toBe("admiral");
    expect(evolvedClass("swordsman", 40)).toBe("swordSaint");
    expect(tierOf("swordSaint")).toBe(4);
    expect(evolvedClass("navy", 12)).toBe("mengchong");
    expect(nextEvolution("archer")).toEqual({ to: "longbow", level: 8 });
    expect(nextEvolution("royalGuard")).toEqual({ to: "ironInfantry", level: 30 });
    expect(nextEvolution("ironInfantry")).toBeUndefined();
  });
  it("every evolution target is a defined variant one tier up in the same family", () => {
    for (const [from, [to]] of Object.entries(EVOLUTION) as Array<[UnitClass, readonly [UnitClass, number]]>) {
      expect(VARIANTS[to]).toBeDefined();
      expect(familyOf(to)).toBe(familyOf(from));
      expect(tierOf(to)).toBeGreaterThan(tierOf(from));
    }
  });
  it("keeps the HP ratio and swaps in the new class's range and traits on evolution", () => {
    const u = makeUnit({ id: "a", side: "player", unitClass: "archer", level: 16, pos: { x: 0, y: 0 } });
    u.hp = Math.round(u.stats.maxHp / 2);
    expect(evolveUnit(u, "sharpshooter")).toBe("archer");
    expect(u.range).toEqual([2, 3]);
    expect(u.traits).toContain("penetrate");
    expect(u.stats.attack).toBe(statsFor("sharpshooter", 16).attack);
    expect(Math.abs(u.hp / u.stats.maxHp - 0.5)).toBeLessThan(0.02);
    const g = makeUnit({ id: "g", side: "player", unitClass: "shieldGuard", level: 16, pos: { x: 0, y: 0 } });
    evolveUnit(g, "royalGuard");
    expect(g.traits.filter((t) => t === "guardian")).toHaveLength(1);
  });
  it("lets extended classes move and match up like their family", () => {
    const map = flatMap(4, 4, "forest");
    expect(map.moveCost("phantom", { x: 1, y: 1 })).toBe(map.moveCost("bandit", { x: 1, y: 1 }));
    expect(map.moveCost("warElephant", { x: 1, y: 1 })).toBe(map.moveCost("heavyCav", { x: 1, y: 1 }));
    expect(matchupMultiplier("halberdier", "tigerRider")).toBe(matchupMultiplier("spearman", "cavalry"));
  });
  it("gives rattan armour its physical resistance at the cost of a fire weakness", () => {
    const r = makeUnit({ id: "r", side: "enemy", unitClass: "rattan", level: 5, pos: { x: 0, y: 0 } });
    expect(r.traitParams.physicalDamageReduction).toBe(25);
    expect(r.traits).toContain("fireWeakness");
  });
});

describe('진화 개화와 능력치 성장', () => {
  const STATS = ['hp', 'mp', 'attack', 'defense', 'intellect', 'spirit', 'agility'] as const;
  it('raises every stat by at least 5% at each evolution step', () => {
    const bad: string[] = [];
    for (const [from, next] of Object.entries(EVOLUTION) as Array<[UnitClass, readonly [UnitClass, number]]>) {
      const a = profileOf(from), b = profileOf(next[0]);
      for (const k of STATS) if (b[k] < a[k] * 1.05 - 1e-9) bad.push(`${from}→${next[0]} ${k} ${a[k]}→${b[k]}`);
      if (b.movement < a.movement) bad.push(`${from}→${next[0]} movement`);
      if (b.range[1] < a.range[1] || b.range[0] > a.range[0]) bad.push(`${from}→${next[0]} range`);
    }
    expect(bad).toEqual([]);
  });
  it('blooms a named skill at every evolved tier, and the third tier keeps the second tier skills', () => {
    for (const [id, v] of Object.entries(VARIANTS)) {
      if (v!.tier < 2) continue;
      expect(v!.bloom?.name, id).toBeTruthy();
      expect(Object.keys(v!.traits ?? {}).length, id).toBeGreaterThan(0);
      for (const t of Object.keys(v!.traits ?? {})) expect(() => getTrait(t), `${id}:${t}`).not.toThrow();
    }
    for (const [from, next] of Object.entries(EVOLUTION) as Array<[UnitClass, readonly [UnitClass, number]]>) {
      if (tierOf(from) < 2) continue;
      for (const t of Object.keys(VARIANTS[from]!.traits ?? {})) expect(Object.keys(VARIANTS[next[0]]!.traits ?? {}), `${next[0]} keeps ${t}`).toContain(t);
    }
  });
});
