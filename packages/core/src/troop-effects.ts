/**
 * 부대효과 — 병종 계통마다 하나. 승급할 때마다(1 기본 → 4 전설) 수치가 오른다.
 *   예) 임기응변: HP가 50% 이상이면 받는 책략 피해 10 / 20 / 30 / 40% 감소.
 * 이름 있는 장수는 같은 부대효과에 더해 '장수 특성'을 하나 더 갖는다(가장 높은 연의 능력에서 정한다).
 * 장수 특성도 병종 단계를 따라 수치가 오른다. 규칙판 7부터 전투에 건다(web Session).
 */
import { defineTrait, combine, type DamageContext } from "./traits.ts";
import { signatureOf } from "./signatures.ts";
import type { Unit, UnitClass } from "./types.ts";
import { FOUR_STAGE_LINES, familyOf, finalClassOf } from "./classes.ts";
import { profileOf } from "./units.ts";

type Cond = "always" | "physical" | "strategy" | "melee" | "ranged" | "healthy" | "wounded" | "moving" | "stationary" | "mounted" | "armored" | "caster";
type Kind =
  | "power" | "reduction" | "critical" | "accuracy" | "evade" | "pierce"
  | "regenHp" | "regenMp" | "lifesteal"
  /** 공격·반격 때 상대 정신력의 n%만큼 추가 피해(최대 SPIRIT_BONUS_CAP) */
  | "spiritBonus";

export interface TroopEffect {
  /** 부대효과 이름 */
  name: string;
  kind: Kind;
  when: Cond;
  /** 단계별 수치(1~4단계). 단일 병과는 하나만 둔다. */
  values: readonly number[];
}

/** 추가 피해 상한(정신력 비례 피해). */
export const SPIRIT_BONUS_CAP = 40;

/** 계통의 첫 병종 → 부대효과. */
export const TROOP_EFFECTS: Partial<Record<UnitClass, TroopEffect>> = {
  infantry: { name: "철벽 방진", kind: "reduction", when: "melee", values: [4, 8, 12, 16] },
  spearman: { name: "창벽", kind: "power", when: "mounted", values: [8, 12, 16, 20] },
  cavalry: { name: "돌격", kind: "power", when: "moving", values: [5, 8, 11, 14] },
  heavyCav: { name: "중장 갑주", kind: "reduction", when: "physical", values: [4, 7, 10, 13] },
  archer: { name: "정조준", kind: "accuracy", when: "ranged", values: [5, 8, 11, 14] },
  javelin: { name: "투창 관통", kind: "pierce", when: "ranged", values: [4, 8, 12, 16] },
  qiang: { name: "강족 기동", kind: "evade", when: "moving", values: [4, 6, 8, 10] },
  sniper: { name: "저격", kind: "critical", when: "ranged", values: [4, 7, 10, 13] },
  crossbow: { name: "강노 관통", kind: "pierce", when: "ranged", values: [5, 10, 15, 20] },
  strategist: { name: "임기응변", kind: "reduction", when: "healthy", values: [10, 20, 30, 40] },
  fengshui: { name: "풍수 양생", kind: "regenHp", when: "always", values: [2, 3, 4, 5] },
  horseArcher: { name: "기사", kind: "power", when: "ranged", values: [5, 8, 11, 14] },
  assassin: { name: "암습", kind: "critical", when: "physical", values: [4, 6, 8, 10] },
  rattan: { name: "등갑", kind: "reduction", when: "physical", values: [5, 8, 11, 14] },
  elephant: { name: "위압", kind: "evade", when: "melee", values: [4, 6, 8, 10] },
  shaman: { name: "저주", kind: "power", when: "strategy", values: [4, 7, 10, 13] },
  maiden: { name: "가호", kind: "reduction", when: "strategy", values: [5, 10, 15, 20] },
  taoist: { name: "뇌술 집중", kind: "accuracy", when: "strategy", values: [5, 8, 11, 14] },
  monk: { name: "문답무용", kind: "spiritBonus", when: "physical", values: [5, 10, 15, 20] },
  yellowTurban: { name: "황천의 기세", kind: "power", when: "healthy", values: [4, 6, 8, 10] },
  mountedStrategist: { name: "기동 책략", kind: "power", when: "strategy", values: [4, 6, 8, 10] },
  pirate: { name: "약탈", kind: "lifesteal", when: "physical", values: [3, 5, 7, 9] },
  bandit: { name: "기습", kind: "critical", when: "moving", values: [4, 6, 8, 10] },
  swordsman: { name: "일섬", kind: "critical", when: "melee", values: [4, 6, 8, 10] },
  lord: { name: "공격력 보조", kind: "power", when: "physical", values: [5, 7, 9, 11] },
  commander: { name: "통솔", kind: "reduction", when: "always", values: [3, 5, 7, 9] },
  dancer: { name: "춤사위", kind: "evade", when: "always", values: [4, 6, 8, 10] },
  mountainCav: { name: "산악 기동", kind: "evade", when: "moving", values: [4, 6, 8, 10] },
  valiantCav: { name: "배수의 용맹", kind: "power", when: "wounded", values: [6, 10, 14, 18] },
  lightChariot: { name: "전차 충격", kind: "pierce", when: "moving", values: [5, 10, 15, 20] },
  nanmanRider: { name: "맹수 돌진", kind: "power", when: "armored", values: [6, 9, 12, 15] },
  halberdCav: { name: "책사 사냥", kind: "power", when: "caster", values: [6, 9, 12, 15] },
  catapult: { name: "포격", kind: "power", when: "ranged", values: [5, 8, 11, 14] },
  // 단일 병과(승급 없음)
  xiliang: { name: "서량의 질풍", kind: "power", when: "moving", values: [10] },
  navy: { name: "수전 숙련", kind: "reduction", when: "ranged", values: [8] },
  gaemaWarrior: { name: "개마 철갑", kind: "reduction", when: "physical", values: [12] },
  crownPrince: { name: "황실의 위엄", kind: "reduction", when: "always", values: [5] },
  royalPrince: { name: "황실의 위엄", kind: "reduction", when: "always", values: [6] },
  emperor: { name: "황실의 위엄", kind: "reduction", when: "always", values: [8] },
  heavenEmperor: { name: "황실의 위엄", kind: "reduction", when: "always", values: [10] },
};

/** 병종 → [계통 첫 병종, 단계(1~4)]. */
const LINE_OF = new Map<UnitClass, [UnitClass, number]>();
for (const line of FOUR_STAGE_LINES) line.forEach((c, i) => LINE_OF.set(c, [line[0], i + 1]));

/** 이 병종의 부대효과와 단계. 없으면 undefined. */
export function troopEffectOf(unitClass: UnitClass): { root: UnitClass; tier: number; effect: TroopEffect } | undefined {
  const [root, tier] = LINE_OF.get(unitClass) ?? LINE_OF.get(familyOf(unitClass)) ?? [unitClass, 1];
  const effect = TROOP_EFFECTS[root];
  return effect ? { root, tier: Math.min(tier, effect.values.length), effect } : undefined;
}

const COND_TEXT: Record<Cond, string> = {
  always: "", physical: "물리 공격·피격 시 ", strategy: "책략 공격·피격 시 ", melee: "인접 교전 시 ", ranged: "2칸 이상 떨어진 교전 시 ",
  healthy: "HP가 50% 이상일 때 ", wounded: "HP가 50% 이하일 때 ", moving: "이번 차례 이동한 뒤 ", stationary: "이번 차례 이동하기 전 ",
  mounted: "기병 계열 상대 시 ", armored: "보병·창병·중기병 상대 시 ", caster: "책략 병종 상대 시 ",
};
const KIND_TEXT: Record<Kind, [string, string]> = {
  power: ["공격 위력이 ", "% 증가한다"], reduction: ["받는 피해가 ", "% 감소한다"], critical: ["회심 확률이 ", "%p 증가한다"],
  accuracy: ["명중이 ", "%p 증가한다"], evade: ["상대 명중이 ", "%p 감소한다"], pierce: ["적 방어를 ", "% 무시한다"],
  regenHp: ["자기 차례 시작에 최대 HP의 ", "%를 회복한다"], regenMp: ["자기 차례 시작에 MP를 ", " 회복한다"],
  lifesteal: ["입힌 피해의 ", "%만큼 HP를 회복한다"], spiritBonus: ["적 정신력의 ", `% 만큼 추가 피해를 입힌다. 추가 피해는 ${SPIRIT_BONUS_CAP}을 넘을 수 없다`],
};
/** 효과 설명. tier를 주면 그 단계 수치만, 아니면 "10 / 20 / 30 / 40" 처럼 모든 단계를 적는다. */
export function troopEffectText(e: TroopEffect, tier?: number): string {
  const [pre, post] = KIND_TEXT[e.kind];
  const n = tier ? String(e.values[Math.min(tier, e.values.length) - 1]) : e.values.join(" / ");
  // 책략 피해 감소처럼 조건이 '피해 종류'인 것은 그 종류를 앞에 적는다.
  if (e.kind === "reduction" && e.when === "healthy") return `HP가 50% 이상일 경우 모든 책략에 대한 피해가 ${n}% 만큼 감소한다.`;
  // 조건은 공격하는 효과면 '…공격 시', 받는 효과면 '…을 받을 때'로 읽힌다.
  const defending = e.kind === "reduction" || e.kind === "evade";
  // 정신력 추가 피해는 내가 칠 때와 반격할 때 모두 붙는다.
  if (e.kind === "spiritBonus" && e.when === "physical") return "물리 공격하거나 반격할 때 " + pre + n + post + ".";
  const when = e.when === "physical" ? (defending ? "물리 공격을 받을 때 " : "물리 공격 시 ") : e.when === "strategy" ? (defending ? "책략을 받을 때 " : "책략 공격 시 ") : COND_TEXT[e.when];
  return when + pre + n + post + ".";
}

function matches(c: Cond, ctx: DamageContext, self: Unit, attacking: boolean): boolean {
  const foe = attacking ? ctx.defender : ctx.attacker;
  switch (c) {
    case "physical": return ctx.kind === "physical";
    case "strategy": return ctx.kind === "strategy";
    case "melee": return ctx.distance === 1;
    case "ranged": return ctx.distance >= 2;
    case "healthy": return self.hp >= self.stats.maxHp * 0.5;
    case "wounded": return self.hp <= self.stats.maxHp * 0.5;
    case "moving": return !!self.movedThisTurn;
    case "stationary": return !self.movedThisTurn;
    case "mounted": return ["cavalry", "heavyCav", "horseArcher"].includes(familyOf(foe.unitClass));
    case "armored": return ["infantry", "spearman", "heavyCav"].includes(familyOf(foe.unitClass));
    case "caster": return ["strategist", "fengshui", "shaman", "taoist", "maiden"].includes(familyOf(foe.unitClass));
    default: return true;
  }
}

/** 임기응변(HP 50% 이상 책략 피해 감소)처럼 '받는 쪽 조건 + 책략만'인 감소를 가린다. */
function defendOnlyStrategy(e: TroopEffect) { return e.kind === "reduction" && e.when === "healthy"; }

function hooksFor(e: TroopEffect) {
  return {
    onAttack(ctx: DamageContext, self: Unit, tier: number) {
      const n = e.values[Math.max(1, Math.min(tier, e.values.length)) - 1] ?? 0;
      if (!matches(e.when, ctx, self, true)) return;
      if (e.kind === "power") ctx.attackMul *= 1 + n / 100;
      if (e.kind === "critical" && ctx.kind === "physical") ctx.criticalChance += n;
      if (e.kind === "accuracy") ctx.accuracyMod += n;
      if (e.kind === "pierce" && ctx.kind === "physical") ctx.defenseIgnore = Math.max(ctx.defenseIgnore, n / 100);
      if (e.kind === "spiritBonus" && ctx.kind === "physical") ctx.bonusDamage = (ctx.bonusDamage ?? 0) + Math.min(SPIRIT_BONUS_CAP, ctx.defender.stats.spirit * n / 100);
    },
    onDefend(ctx: DamageContext, self: Unit, tier: number) {
      const n = e.values[Math.max(1, Math.min(tier, e.values.length)) - 1] ?? 0;
      if (defendOnlyStrategy(e)) { if (ctx.kind === "strategy" && matches("healthy", ctx, self, false)) ctx.reduction = combine(ctx.reduction, n / 100); return; }
      if (!matches(e.when, ctx, self, false)) return;
      if (e.kind === "reduction") ctx.reduction = combine(ctx.reduction, n / 100);
      if (e.kind === "evade") ctx.accuracyMod -= n;
    },
    onTurnStart(self: Unit, tier: number) {
      const n = e.values[Math.max(1, Math.min(tier, e.values.length)) - 1] ?? 0;
      if (e.kind === "regenHp") self.hp = Math.min(self.stats.maxHp, self.hp + Math.round(self.stats.maxHp * n / 100));
      if (e.kind === "regenMp") self.mp = Math.min(self.stats.maxMp, self.mp + n);
    },
  };
}

/** 흡혈형 부대효과(약탈)의 비율(%). 피해를 준 뒤 battle이 회복에 쓴다. */
export function troopLifesteal(unit: Unit): number {
  let pct = 0;
  for (const t of unit.traits) {
    if (!t.startsWith("troop:")) continue;
    const e = TROOP_EFFECTS[t.slice(6) as UnitClass];
    if (e?.kind === "lifesteal") pct += e.values[Math.max(1, Math.min(unit.traitParams[t] ?? 1, e.values.length)) - 1] ?? 0;
  }
  return pct;
}

/** 부대효과 특성 id: troop:<계통 첫 병종>. 매개변수는 단계. */
export const troopTraitId = (root: UnitClass) => "troop:" + root;
for (const [root, e] of Object.entries(TROOP_EFFECTS) as Array<[UnitClass, TroopEffect]>) {
  const h = hooksFor(e);
  defineTrait({ id: troopTraitId(root), name: e.name, description: troopEffectText(e), hooks: { onAttack: (c, s, t) => h.onAttack(c, s, t), onDefend: (c, s, t) => h.onDefend(c, s, t), onTurnStart: (s, t) => h.onTurnStart(s, t) } });
}

/** 유닛의 부대효과를 지금 병종·단계에 맞춘다(승급하면 다시 부른다). */
export function syncTroopEffect(unit: Unit): void {
  unit.traits = unit.traits.filter((t) => !t.startsWith("troop:"));
  for (const k of Object.keys(unit.traitParams)) if (k.startsWith("troop:")) delete unit.traitParams[k];
  const fx = troopEffectOf(unit.unitClass);
  if (!fx) return;
  const id = troopTraitId(fx.root);
  unit.traits.push(id);
  unit.traitParams[id] = fx.tier;
}

// ─────────────────────────────────────────── 장수 특성(이름 있는 장수의 추가 특성)

export type OfficerAbility = "war" | "int" | "lead" | "pol" | "cha";
/** 가장 높은 연의 능력 → 장수 특성. 수치는 병종 단계(1~4)를 따른다. */
export const OFFICER_EFFECTS: Record<OfficerAbility, TroopEffect> = {
  war: { name: "일기당천", kind: "spiritBonus", when: "physical", values: [5, 10, 15, 20] },
  int: { name: "신산귀모", kind: "power", when: "strategy", values: [5, 8, 11, 14] },
  lead: { name: "철벽 통솔", kind: "reduction", when: "physical", values: [4, 7, 10, 13] },
  pol: { name: "치세의 재능", kind: "regenMp", when: "always", values: [2, 3, 4, 5] },
  cha: { name: "인덕", kind: "regenHp", when: "always", values: [2, 3, 4, 5] },
};
export const officerTraitId = (a: OfficerAbility) => "officer:" + a;
/** 장수 특성이 부대효과와 같은 종류·조건이면 겹치지 않는다(예: 중기병 「중장 갑주」 + 「철벽 통솔」, 풍수사 「풍수 양생」 + 「인덕」). 더 큰 쪽(부대효과 단계와 같으므로 부대효과)만 남는다. */
function duplicatesTroop(self: Unit, e: TroopEffect): boolean {
  for (const t of self.traits) {
    if (!t.startsWith("troop:")) continue;
    const fx = TROOP_EFFECTS[t.slice(6) as UnitClass];
    if (fx && fx.kind === e.kind && fx.when === e.when) return true;
  }
  return false;
}
for (const [a, e] of Object.entries(OFFICER_EFFECTS) as Array<[OfficerAbility, TroopEffect]>) {
  const h = hooksFor(e);
  defineTrait({ id: officerTraitId(a), name: e.name, description: troopEffectText(e), hooks: {
    onAttack: (c, s, t) => { if (!duplicatesTroop(s, e)) h.onAttack(c, s, t); },
    onDefend: (c, s, t) => { if (!duplicatesTroop(s, e)) h.onDefend(c, s, t); },
    onTurnStart: (s, t) => { if (!duplicatesTroop(s, e)) h.onTurnStart(s, t); },
  } });
}
/**
 * 다섯 능력 가운데 가장 높은 것(같으면 무력·지력·통솔·정치·매력 순).
 * 병종의 본업 능력(책략 병종은 지력, 그 밖은 무력)에 5를 더해 견준다: 통솔 98·지력 96인 사마의는 지력.
 */
export function topAbility(a: Record<OfficerAbility, number>, favored?: OfficerAbility): OfficerAbility {
  const v = (k: OfficerAbility) => a[k] + (k === favored ? 5 : 0);
  return (["war", "int", "lead", "pol", "cha"] as const).reduce((best, k) => (v(k) > v(best) ? k : best), "war" as OfficerAbility);
}
/** 장수 특성을 건다(이미 있으면 단계만 맞춘다). */
export function applyOfficerEffect(unit: Unit, ability: OfficerAbility, tier: number): void {
  for (const k of Object.keys(OFFICER_EFFECTS)) { const id = officerTraitId(k as OfficerAbility); unit.traits = unit.traits.filter((t) => t !== id); delete unit.traitParams[id]; }
  const id = officerTraitId(ability);
  unit.traits.push(id);
  unit.traitParams[id] = Math.max(1, Math.min(4, tier));
}

// ─────────────────────────────────────────── 이름난 장수: 공격 범위 확대(마지막 진화까지만)

/**
 * 연의에서 이름난 장수(인기 장수). 주인공 사마의는 넣지 않는다: 책략이 주력이라 평타 범위의 득이 작고,
 * 홀로 환영 셋을 넘는 흉몽(S1-04)에서 평타로 궁수를 쫓다 쓰러지는 길이 열린다.
 */
export const FAMED_OFFICERS: readonly string[] = [
  "여포", "관우", "장비", "조운", "마초", "황충", "허저", "하후돈", "하후연", "장료", "서황", "장합", "감녕",
  "제갈량", "조조", "유비", "손권", "주유", "육손", "여몽", "강유", "방통", "위연", "항우",
];
defineTrait({ id: "famed", name: "이름난 장수", description: "공격 범위가 이 병종 계통의 마지막 진화와 같아진다(근접은 팔방, 창병은 일직선). 마지막 진화보다 넓어지지는 않는다.", hooks: {} });
/** 이름난 장수면 공격 모양·사거리를 그 계통 마지막 진화 병종만큼 넓힌다(한 번만). 그보다 넓히지 않는다. */
export function applyFamedReach(unit: Unit, name: string): boolean {
  if (!FAMED_OFFICERS.includes(name) || unit.traits.includes("famed") || unit.range[1] <= 0) return false;
  unit.traits.push("famed");
  unit.famedReach = true;
  const top = profileOf(finalClassOf(unit.unitClass)).range;
  unit.range = [unit.range[0], Math.max(unit.range[1], top[1])];
  return true;
}

/** 화면에 보일 규칙판 7 효과(부대효과·장수 특성·이름난 장수): 이름과 지금 단계의 설명. */
export function unitEffectNotes(unit: Unit): Array<{ kind: "troop" | "officer" | "famed" | "signature"; name: string; text: string; tier: number }> {
  const out: Array<{ kind: "troop" | "officer" | "famed" | "signature"; name: string; text: string; tier: number }> = [];
  for (const t of unit.traits) {
    const tier = unit.traitParams[t] ?? 1;
    if (t.startsWith("troop:")) { const e = TROOP_EFFECTS[t.slice(6) as UnitClass]; if (e) out.push({ kind: "troop", name: e.name, text: troopEffectText(e, tier), tier }); }
    else if (t.startsWith("officer:")) { const e = OFFICER_EFFECTS[t.slice(8) as OfficerAbility]; if (e) out.push({ kind: "officer", name: e.name, text: troopEffectText(e, tier) + (duplicatesTroop(unit, e) ? " (부대효과와 같은 효과라 겹치지 않는다)" : ""), tier }); }
    else if (t.startsWith("sig:")) { const g = signatureOf(t.slice(4)); if (g) out.push({ kind: "signature", name: g.name, text: g.text(tier), tier }); }
    else if (t === "famed") out.push({ kind: "famed", name: "이름난 장수", text: "공격 범위가 이 병종 계통의 마지막 진화와 같다(근접은 팔방). 그보다 넓어지지 않는다.", tier: 1 });
  }
  return out;
}
