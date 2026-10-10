import { describe, it, expect } from "vitest";
import { makeUnit } from "../src/units.ts";
import { createDamageContext } from "../src/formulas.ts";
import { applyTraitHooks, bindField, getTrait, type TraitField } from "../src/traits.ts";
import { SIGNATURE_NAMES, signatureOf, applySignature, signatureTraitId } from "../src/signatures.ts";
import type { Unit, Status } from "../src/types.ts";

type Cls = Parameters<typeof makeUnit>[0]["unitClass"];
function field(units: Unit[], terrain = "plain", turn = 1): TraitField {
  const f: TraitField = {
    units: new Map(units.map((u) => [u.id, u])),
    map: { inBounds: (c) => c.x >= 0 && c.y >= 0 && c.x < 12 && c.y < 12, tileAt: () => ({ terrain }) },
    turn,
    applyStatus(u: Unit, s: Status) { const e = u.statuses.find((x) => x.kind === s.kind); if (e) e.turns = Math.max(e.turns, s.turns); else u.statuses.push({ ...s }); },
  };
  for (const u of units) bindField(u, f);
  return f;
}
let n = 0;
const unit = (name: string, side: "player" | "enemy", x: number, y: number, unitClass: Cls = "infantry") =>
  makeUnit({ id: `u${n++}`, name, side, unitClass, level: 20, pos: { x, y } });
const hit = (a: Unit, d: Unit) => { const ctx = createDamageContext(a, d, "physical"); applyTraitHooks(ctx); return ctx; };

describe("이름있는 장수 고유특성", () => {
  it("게임에 나오는 이름있는 장수 70명이 저마다 다른 이름·다른 효과를 갖는다", () => {
    expect(SIGNATURE_NAMES).toHaveLength(70);
    const names = SIGNATURE_NAMES.map((k) => signatureOf(k)!.name);
    expect(new Set(names).size).toBe(70);
    const texts = SIGNATURE_NAMES.map((k) => signatureOf(k)!.text(1));
    expect(new Set(texts).size).toBe(70);
    for (const k of SIGNATURE_NAMES) expect(getTrait(signatureTraitId(k)).name).toBe(signatureOf(k)!.name);
  });

  it("목록 밖 인물에게는 붙지 않고, 병종 단계가 오르면 수치가 커진다", () => {
    const u = unit("사마랑", "player", 1, 1);
    expect(applySignature(u, "사마랑", 1)).toBe(false);
    expect(u.traits.some((t) => t.startsWith("sig:"))).toBe(false);
    expect(signatureOf("항우")!.text(1)).toContain("20%");
    expect(signatureOf("항우")!.text(4)).toContain("30%");
  });

  it("항우: 물리 피해가 늘고 체력 30% 이하(사면초가)에서 더 는다", () => {
    const x = unit("항우", "player", 1, 1), foe = unit("병사", "enemy", 2, 1);
    field([x, foe]);
    const base = hit(x, foe).attackMul;
    applySignature(x, "항우", 1);
    expect(hit(x, foe).attackMul).toBeCloseTo(base * 1.2);
    x.hp = Math.floor(x.stats.maxHp * .25);
    expect(hit(x, foe).attackMul).toBeCloseTo(base * 1.2 * 1.3);
  });

  it("관우는 이름있는 장수에게만 더 세다", () => {
    const g = unit("관우", "player", 1, 1), plain = unit("병사", "enemy", 2, 1), named = unit("장료", "enemy", 1, 2);
    field([g, plain, named]);
    applySignature(g, "관우", 1); applySignature(named, "장료", 1);
    expect(hit(g, named).attackMul).toBeGreaterThan(hit(g, plain).attackMul);
  });

  it("장비는 차례 시작에 2칸 안 적을 쇠약하게, 유비는 곁의 아군을 회복시킨다", () => {
    const zf = unit("장비", "player", 5, 5), lb = unit("유비", "player", 3, 3), ally = unit("병사", "player", 3, 4);
    const near = unit("병사", "enemy", 6, 6), far = unit("병사", "enemy", 10, 10);
    field([zf, lb, ally, near, far]);
    applySignature(zf, "장비", 1); applySignature(lb, "유비", 1);
    getTrait("sig:장비").hooks.onTurnStart!(zf, 1);
    expect(near.statuses.some((s) => s.kind === "weaken")).toBe(true);
    expect(far.statuses.length).toBe(0);
    ally.hp = Math.floor(ally.stats.maxHp / 2);
    const before = ally.hp;
    getTrait("sig:유비").hooks.onTurnStart!(lb, 1);
    expect(ally.hp).toBeGreaterThan(before);
  });

  it("조진의 기운: 2칸 안 아군 기병의 물리 피해가 는다(조진 자신이 싸우지 않아도)", () => {
    const cz = unit("조진", "player", 1, 1), cav = unit("기병", "player", 2, 2, "cavalry"), foe = unit("병사", "enemy", 3, 2);
    field([cz, cav, foe]);
    const base = hit(cav, foe).attackMul;
    applySignature(cz, "조진", 1);
    expect(hit(cav, foe).attackMul).toBeCloseTo(base * 1.12);
    cz.pos = { x: 9, y: 9 };
    expect(hit(cav, foe).attackMul).toBeCloseTo(base);
  });

  it("주유의 화공은 물가의 적에게 더 세다", () => {
    const zy = unit("주유", "player", 1, 1, "strategist"), foe = unit("병사", "enemy", 3, 1);
    applySignature(zy, "주유", 1);
    const at = (terrain: string) => { field([zy, foe], terrain); const ctx = { ...createDamageContext(zy, foe, "strategy"), element: "fire" }; applyTraitHooks(ctx); return ctx.attackMul; };
    expect(at("water")).toBeCloseTo(at("plain") * 1.3);
  });
});
