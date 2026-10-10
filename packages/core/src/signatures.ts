/**
 * 이름있는 장수의 고유특성 — 장수마다 이름도 효과도 다른 특성 하나.
 *
 * 『삼국지연의』에서 크게 활약했거나 역사에 이름을 남긴 장수만 갖는다(목록: 장수/이름있는_장수_목록.xlsx).
 * 목록 밖의 인물은 이름을 달고 나와도 병종 능력만 쓴다.
 * 특성 id는 `sig:장수이름`, param은 병종 단계(1~4)이고 단계가 오를수록 수치가 커진다(×1 · ×1.15 · ×1.3 · ×1.5).
 * 피해 훅은 예측에도 쓰이므로 읽기만 한다. 상태를 거는 일(회복·봉인·사기 등)은 자기 차례 시작(onTurnStart)에만 한다.
 */
import type { Unit, UnitClass, StatusKind } from "./types.ts";
import { defineTrait, fieldOf, combine, type DamageContext, type TraitHooks } from "./traits.ts";
import { familyOf } from "./classes.ts";
import { engageDistance } from "./reach.ts";

const TIER_MUL = [1, 1.15, 1.3, 1.5] as const;
/** 병종 단계 → 수치 배율 */
export const sigMul = (tier: number) => TIER_MUL[Math.max(1, Math.min(4, Math.round(tier || 1))) - 1]!;
const pct = (x: number, k: number) => Math.round(x * k);

const MOUNTED = new Set<string>(["cavalry", "heavyCav", "horseArcher"]);
const RANGED = new Set<string>(["archer", "crossbow", "horseArcher", "catapult", "navy"]);
const FOOT = new Set<string>(["infantry", "spearman"]);
const fam = (c: UnitClass) => familyOf(c) as string;
const mounted = (u: Unit) => MOUNTED.has(fam(u.unitClass));
const ranged = (u: Unit) => RANGED.has(fam(u.unitClass));
const foot = (u: Unit) => FOOT.has(fam(u.unitClass));
const caster = (u: Unit) => u.stats.maxMp > 0 && u.strategies.length > 0;
const friends = (a: Unit, b: Unit) => (a.side === "enemy") === (b.side === "enemy");
/** 이름있는 장수(고유특성이나 이름난 장수 표식이 있는 부대) */
export const isNamedOfficer = (u: Unit) => u.famedReach === true || u.traits.some((t) => t.startsWith("sig:"));

function around(self: Unit, r: number, pick: "friend" | "foe"): Unit[] {
  const f = fieldOf(self);
  if (!f) return [];
  const out: Unit[] = [];
  for (const u of f.units.values()) {
    if (!u.alive || u === self) continue;
    if ((pick === "friend") !== friends(self, u)) continue;
    if (engageDistance(self.pos, u.pos) <= r) out.push(u);
  }
  return out;
}
function terrainOf(u: Unit): string | undefined {
  const f = fieldOf(u);
  return f && f.map.inBounds(u.pos) ? f.map.tileAt(u.pos).terrain : undefined;
}
const WET = new Set(["water", "ford", "rapids"]);
/** 물 칸 위나 물 칸 바로 옆 */
function byWater(u: Unit): boolean {
  const f = fieldOf(u);
  if (!f) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const c = { x: u.pos.x + dx, y: u.pos.y + dy };
    if (f.map.inBounds(c) && WET.has(f.map.tileAt(c).terrain)) return true;
  }
  return false;
}
const turnOf = (u: Unit) => fieldOf(u)?.turn ?? 1;
const hpRate = (u: Unit) => u.hp / Math.max(1, u.stats.maxHp);
const phys = (ctx: DamageContext) => ctx.kind === "physical";
const strat = (ctx: DamageContext) => ctx.kind === "strategy";
function give(self: Unit, target: Unit, kind: StatusKind, turns: number, magnitude = 1) {
  fieldOf(self)?.applyStatus(target, { kind, turns, magnitude });
}
function heal(u: Unit, rate: number) {
  if (u.hp >= u.stats.maxHp) return;
  u.hp = Math.min(u.stats.maxHp, u.hp + Math.max(1, Math.round(u.stats.maxHp * rate)));
}
const NEGATIVE: StatusKind[] = ["confusion", "immobile", "bound", "bleed", "burn", "shock", "seal", "weaken", "breach", "slow"];
function cleanse(u: Unit, kinds: readonly StatusKind[] = NEGATIVE) {
  u.statuses = u.statuses.filter((s) => !kinds.includes(s.kind));
}
/** 전투당 한 번: 장수의 traitParams에 표시해 둔다. */
function once(u: Unit, key: string): boolean {
  const k = `once:${key}`;
  if (u.traitParams[k]) return false;
  u.traitParams[k] = 1;
  return true;
}

export interface Signature {
  /** 고유특성 이름 */
  readonly name: string;
  /** 지금 단계의 설명 */
  text(tier?: number): string;
  readonly hooks: TraitHooks;
}

const S: Record<string, Signature> = {
  // ── 위·진
  사마의: { name: "응시낭고", text: (t = 1) => `받는 책략 피해 ${pct(25, sigMul(t))}% 감소. 자기 차례마다 3칸 안 적 책사 하나의 책략을 봉인한다.`,
    hooks: { onDefend(ctx, _s, p) { if (strat(ctx)) ctx.reduction = combine(ctx.reduction, pct(25, sigMul(p)) / 100); },
      onTurnStart(u) { const t = around(u, 3, "foe").filter(caster).sort((a, b) => b.stats.intellect - a.stats.intellect)[0]; if (t) give(u, t, "seal", 2); } } },
  조조: { name: "난세의 간웅", text: (t = 1) => `이름있는 적 장수에게 주는 피해 ${pct(20, sigMul(t))}% 증가. 자기 차례마다 2칸 안 아군의 사기를 북돋운다(공격 +12%).`,
    hooks: { onAttack(ctx, _s, p) { if (isNamedOfficer(ctx.defender)) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; },
      onTurnStart(u) { for (const a of around(u, 2, "friend")) give(u, a, "rally", 1); } } },
  허저: { name: "나의 결투", text: (t = 1) => `체력 절반 이하에서 물리 피해 ${pct(30, sigMul(t))}% 증가. 대신 받는 물리 피해 10% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (phys(ctx) && hpRate(s) <= .5) ctx.attackMul *= 1 + pct(30, sigMul(p)) / 100; },
      onDefend(ctx) { if (phys(ctx)) ctx.reduction = 1 - (1 - ctx.reduction) * 1.1; } } },
  하후돈: { name: "발시담정", text: (t = 1) => `체력이 30% 이하로 떨어지면 자기 차례에 최대 체력의 ${pct(25, sigMul(t))}%를 회복한다(전투당 한 번).`,
    hooks: { onTurnStart(u, p) { if (hpRate(u) <= .3 && once(u, "하후돈")) heal(u, pct(25, sigMul(p)) / 100); } } },
  하후연: { name: "전이병귀신속", text: (t = 1) => `이번 차례 움직인 칸마다 물리 피해 ${pct(4, sigMul(t))}% 증가(최대 6칸).`,
    hooks: { onAttack(ctx, s, p) { if (phys(ctx)) ctx.attackMul *= 1 + Math.min(6, s.movedSteps ?? 0) * pct(4, sigMul(p)) / 100; } } },
  장료: { name: "요래요래", text: (t = 1) => `체력이 가득한 적을 치면 피해 ${pct(15, sigMul(t))}% 증가, 반격을 받지 않는다.`,
    hooks: { onAttack(ctx, _s, p) { if (ctx.defender.hp >= ctx.defender.stats.maxHp) { ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; if (phys(ctx)) ctx.suppressCounter = true; } } } },
  서황: { name: "장구한 포위", text: (t = 1) => `대상 곁에 다른 아군이 둘 이상 붙어 있으면 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (around(ctx.defender, 1, "foe").filter((a) => a !== s).length >= 2) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  장합: { name: "교변", text: (t = 1) => `험한 지형도 평지처럼 움직인다. 두 칸 이상 떨어진 적에게 받는 피해 ${pct(20, sigMul(t))}% 감소.`,
    hooks: { ignoresRoughTerrain: true, onDefend(ctx, _s, p) { if (ctx.distance >= 2) ctx.reduction = combine(ctx.reduction, pct(20, sigMul(p)) / 100); } } },
  조인: { name: "철벽 수성", text: (t = 1) => `성채·성문 칸에서 받는 피해 ${pct(30, sigMul(t))}% 감소, 그 밖에서는 ${pct(8, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, s, p) { const on = ["fort", "gate"].includes(terrainOf(s) ?? ""); ctx.reduction = combine(ctx.reduction, pct(on ? 30 : 8, sigMul(p)) / 100); } } },
  순욱: { name: "왕좌지재", text: (t = 1) => `자기 차례마다 전장의 아군 책사 모두의 책략 기력(MP)을 ${pct(4, sigMul(t))} 채운다.`,
    hooks: { onTurnStart(u, p) { const n = pct(4, sigMul(p)); for (const a of [u, ...around(u, 99, "friend")]) if (caster(a)) a.mp = Math.min(a.stats.maxMp, a.mp + n); } } },
  조비: { name: "칠보시", text: (t = 1) => `책략을 쓰는 적에게 주는 피해 ${pct(20, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (caster(ctx.defender)) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; } } },
  가후: { name: "난무", text: (t = 1) => `혼란·봉인·쇠약·둔화에 걸린 적에게 주는 피해 ${pct(30, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (ctx.defender.statuses.some((x) => ["confusion", "seal", "weaken", "slow"].includes(x.kind))) ctx.attackMul *= 1 + pct(30, sigMul(p)) / 100; } } },
  우금: { name: "엄정한 군율", text: (t = 1) => `자기 차례마다 자신과 2칸 안 아군의 혼란·쇠약·둔화를 풀어 준다. 받는 피해 ${pct(5, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, _s, p) { ctx.reduction = combine(ctx.reduction, pct(5, sigMul(p)) / 100); },
      onTurnStart(u) { for (const a of [u, ...around(u, 2, "friend")]) cleanse(a, ["confusion", "weaken", "slow"]); } } },
  악진: { name: "선봉", text: (t = 1) => `첫 턴에 이동력 +2. 자신의 체력이 가득할 때 물리 피해 ${pct(20, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (phys(ctx) && s.hp >= s.stats.maxHp) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; },
      onTurnStart(u) { if (turnOf(u) === 1) give(u, u, "haste", 1, 2); } } },
  등애: { name: "음평 기습", text: (t = 1) => `산지·구릉에 서서 공격하면 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (["mountain", "hill"].includes(terrainOf(s) ?? "")) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  종회: { name: "사본론", text: (t = 1) => `상대보다 지력이 높으면 그 차이만큼 책략 피해 증가(최대 ${pct(25, sigMul(t))}%).`,
    hooks: { onAttack(ctx, s, p) { if (strat(ctx)) ctx.attackMul *= 1 + Math.min(pct(25, sigMul(p)), Math.max(0, s.stats.intellect - ctx.defender.stats.intellect)) / 100; } } },
  곽회: { name: "옹주 수비", text: (t = 1) => `기병에게 받는 피해 ${pct(30, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, _s, p) { if (mounted(ctx.attacker)) ctx.reduction = combine(ctx.reduction, pct(30, sigMul(p)) / 100); } } },
  학소: { name: "진창 수성", text: (t = 1) => `성채·성문 칸에서 받은 물리 피해의 ${pct(25, sigMul(t))}%를 공격자에게 되돌린다.`,
    hooks: { onDefend(ctx, s, p) { if (phys(ctx) && ["fort", "gate"].includes(terrainOf(s) ?? "")) ctx.reflect += pct(25, sigMul(p)) / 100; } } },
  사마사: { name: "침착한 장자", text: (t = 1) => `사마의가 2칸 안에 있으면 주는 피해 ${pct(15, sigMul(t))}% 증가, 받는 피해 ${pct(15, sigMul(t))}% 감소.`,
    hooks: { onAttack(ctx, s, p) { if (around(s, 2, "friend").some((a) => a.name === "사마의")) ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; },
      onDefend(ctx, s, p) { if (around(s, 2, "friend").some((a) => a.name === "사마의")) ctx.reduction = combine(ctx.reduction, pct(15, sigMul(p)) / 100); } } },
  사마소: { name: "사마소의 마음", text: (t = 1) => `체력이 절반 이하인 적에게 주는 피해 ${pct(20, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (hpRate(ctx.defender) <= .5) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; } } },
  조진: { name: "종실의 대들보", text: (t = 1) => `2칸 안 아군 기병의 물리 피해 ${pct(12, sigMul(t))}% 증가.`,
    hooks: { onAllyAttack(ctx, h, p) { if (phys(ctx) && mounted(ctx.attacker) && engageDistance(h.pos, ctx.attacker.pos) <= 2) ctx.attackMul *= 1 + pct(12, sigMul(p)) / 100; } } },
  조홍: { name: "헌마", text: (t = 1) => `곁에 붙은 아군이 받는 피해 ${pct(10, sigMul(t))}% 감소.`,
    hooks: { onAllyDefend(ctx, h, p) { if (engageDistance(h.pos, ctx.defender.pos) <= 1) ctx.reduction = combine(ctx.reduction, pct(10, sigMul(p)) / 100); } } },
  조창: { name: "황수아", text: (t = 1) => `회심 확률 +${pct(10, sigMul(t))}%p. 기병을 치면 피해 15% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (phys(ctx)) ctx.criticalChance += pct(10, sigMul(p)); if (mounted(ctx.defender)) ctx.attackMul *= 1.15; } } },
  문빙: { name: "강하 수비", text: (t = 1) => `물가(물 칸 위나 옆)에서 받는 피해 ${pct(20, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, s, p) { if (byWater(s)) ctx.reduction = combine(ctx.reduction, pct(20, sigMul(p)) / 100); } } },
  // ── 촉
  마초: { name: "금마초", text: (t = 1) => `움직인 뒤 공격하면 피해 ${pct(15, sigMul(t))}% 증가. 조씨 장수에게는 15% 더.`,
    hooks: { onAttack(ctx, s, p) { if (s.movedThisTurn) ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; if (ctx.defender.name.startsWith("조")) ctx.attackMul *= 1.15; } } },
  유비: { name: "인덕", text: (t = 1) => `자기 차례마다 곁에 붙은 아군의 체력을 ${pct(8, sigMul(t))}% 회복한다.`,
    hooks: { onTurnStart(u, p) { for (const a of around(u, 1, "friend")) heal(a, pct(8, sigMul(p)) / 100); } } },
  관우: { name: "무성", text: (t = 1) => `이름있는 적 장수를 물리 공격하면 피해 ${pct(20, sigMul(t))}% 증가, 회심 확률 +10%p.`,
    hooks: { onAttack(ctx, _s, p) { if (phys(ctx) && isNamedOfficer(ctx.defender)) { ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; ctx.criticalChance += 10; } } } },
  장비: { name: "장판교의 일갈", text: () => `자기 차례마다 2칸 안 적 모두를 쇠약하게 한다(공격 15% 감소).`,
    hooks: { onTurnStart(u) { for (const e of around(u, 2, "foe")) give(u, e, "weaken", 2); } } },
  제갈량: { name: "와룡", text: (t = 1) => `불·바람 책략 피해 ${pct(25, sigMul(t))}% 증가. 받는 책략 피해 15% 감소.`,
    hooks: { onAttack(ctx, _s, p) { if (strat(ctx) && (ctx.element === "fire" || ctx.element === "wind")) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; },
      onDefend(ctx) { if (strat(ctx)) ctx.reduction = combine(ctx.reduction, .15); } } },
  조운: { name: "단기필마", text: (t = 1) => `곁에 붙은 적이 둘 이상이면 받는 피해 ${pct(25, sigMul(t))}% 감소, 주는 피해 10% 증가.`,
    hooks: { onAttack(ctx, s) { if (around(s, 1, "foe").length >= 2) ctx.attackMul *= 1.1; },
      onDefend(ctx, s, p) { if (around(s, 1, "foe").length >= 2) ctx.reduction = combine(ctx.reduction, pct(25, sigMul(p)) / 100); } } },
  황충: { name: "노익장", text: (t = 1) => `두 칸 이상 떨어진 적에게 물리 피해 ${pct(15, sigMul(t))}% 증가. 체력이 가득하면 회심 확률 +15%p.`,
    hooks: { onAttack(ctx, s, p) { if (phys(ctx) && ctx.distance >= 2) ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; if (s.hp >= s.stats.maxHp) ctx.criticalChance += 15; } } },
  강유: { name: "기린아", text: (t = 1) => `물리 공격에 지력의 ${pct(15, sigMul(t))}%만큼 피해를 더한다. 책략 명중 +10%p.`,
    hooks: { onAttack(ctx, s, p) { if (phys(ctx)) ctx.bonusDamage = (ctx.bonusDamage ?? 0) + Math.round(s.stats.intellect * pct(15, sigMul(p)) / 100); else if (strat(ctx)) ctx.accuracyMod += 10; } } },
  방통: { name: "연환계", text: (t = 1) => `책략 대상 곁에 붙은 다른 적 하나마다 책략 피해 ${pct(8, sigMul(t))}% 증가(최대 4).`,
    hooks: { onAttack(ctx, _s, p) { if (strat(ctx)) ctx.attackMul *= 1 + Math.min(4, around(ctx.defender, 1, "friend").length) * pct(8, sigMul(p)) / 100; } } },
  위연: { name: "반골", text: (t = 1) => `곁에 붙은 아군이 없으면 주는 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (!around(s, 1, "friend").length) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  마속: { name: "가정의 고지", text: (t = 1) => `산지·구릉에서 책략 피해 ${pct(20, sigMul(t))}% 증가. 평지에서 받는 피해 10% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (strat(ctx) && ["mountain", "hill"].includes(terrainOf(s) ?? "")) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; },
      onDefend(ctx, s) { if (terrainOf(s) === "plain") ctx.reduction = 1 - (1 - ctx.reduction) * 1.1; } } },
  왕평: { name: "흥세 수비", text: (t = 1) => `길·다리·잔도 위에서 받는 피해 ${pct(25, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, s, p) { if (["road", "bridge", "plank"].includes(terrainOf(s) ?? "")) ctx.reduction = combine(ctx.reduction, pct(25, sigMul(p)) / 100); } } },
  관평: { name: "부자 동행", text: (t = 1) => `관우가 2칸 안에 있으면 주는 피해 ${pct(15, sigMul(t))}% 증가, 받는 피해 ${pct(15, sigMul(t))}% 감소.`,
    hooks: { onAttack(ctx, s, p) { if (around(s, 2, "friend").some((a) => a.name === "관우")) ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; },
      onDefend(ctx, s, p) { if (around(s, 2, "friend").some((a) => a.name === "관우")) ctx.reduction = combine(ctx.reduction, pct(15, sigMul(p)) / 100); } } },
  마대: { name: "위연 참살", text: (t = 1) => `자기보다 레벨이 높은 적에게 주는 피해 ${pct(20, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (ctx.defender.level > s.level) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; } } },
  맹획: { name: "칠종칠금", text: (t = 1) => `자기 차례마다 최대 체력의 ${pct(8, sigMul(t))}%를 회복한다.`,
    hooks: { onTurnStart(u, p) { heal(u, pct(8, sigMul(p)) / 100); } } },
  축융: { name: "비도", text: (t = 1) => `꼭 두 칸 떨어진 적에게 물리 피해 ${pct(20, sigMul(t))}% 증가, 명중 +15%p.`,
    hooks: { onAttack(ctx, _s, p) { if (phys(ctx) && ctx.distance === 2) { ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; ctx.accuracyMod += 15; } } } },
  // ── 오
  주유: { name: "적벽의 화공", text: (t = 1) => `불 책략 피해 ${pct(20, sigMul(t))}% 증가. 물 위나 물가의 적에게는 30% 더.`,
    hooks: { onAttack(ctx, _s, p) { if (strat(ctx) && ctx.element === "fire") { ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; if (byWater(ctx.defender)) ctx.attackMul *= 1.3; } } } },
  손권: { name: "벽안자염", text: (t = 1) => `3칸 안 아군 하나마다 받는 피해 ${pct(5, sigMul(t))}% 감소(최대 4). 자기 차례마다 MP 3 회복.`,
    hooks: { onDefend(ctx, s, p) { ctx.reduction = combine(ctx.reduction, Math.min(4, around(s, 3, "friend").length) * pct(5, sigMul(p)) / 100); },
      onTurnStart(u) { u.mp = Math.min(u.stats.maxMp, u.mp + 3); } } },
  육손: { name: "이릉의 화공", text: (t = 1) => `숲·갈대늪 위의 적에게 불 책략 피해 ${pct(40, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (strat(ctx) && ctx.element === "fire" && ["forest", "marsh"].includes(terrainOf(ctx.defender) ?? "")) ctx.attackMul *= 1 + pct(40, sigMul(p)) / 100; } } },
  여몽: { name: "백의도강", text: (t = 1) => `전투 첫 두 턴 동안 주는 피해 ${pct(25, sigMul(t))}% 증가, 방어 15% 무시.`,
    hooks: { onAttack(ctx, s, p) { if (turnOf(s) <= 2) { ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; ctx.defenseIgnore = Math.max(ctx.defenseIgnore, .15); } } } },
  감녕: { name: "백기겁영", text: (t = 1) => `곁에 붙은 적 하나마다 회피 +${pct(8, sigMul(t))}%p, 주는 피해 6% 증가(최대 3).`,
    hooks: { onAttack(ctx, s) { ctx.attackMul *= 1 + Math.min(3, around(s, 1, "foe").length) * .06; },
      onDefend(ctx, s, p) { ctx.accuracyMod -= Math.min(3, around(s, 1, "foe").length) * pct(8, sigMul(p)); } } },
  노숙: { name: "손유 동맹", text: (t = 1) => `전장의 우군(동맹 부대)이 주는 피해 ${pct(15, sigMul(t))}% 증가.`,
    hooks: { onAllyAttack(ctx, h, p) { if (ctx.attacker.side === "allyAi" && h.side !== "allyAi") ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; } } },
  황개: { name: "고육계", text: (t = 1) => `자기 차례마다 체력 5%를 잃고, 그 차례 동안 사기가 오른다. 체력이 낮을수록 피해 증가(최대 ${pct(30, sigMul(t))}%).`,
    hooks: { onAttack(ctx, s, p) { ctx.attackMul *= 1 + (1 - hpRate(s)) * pct(30, sigMul(p)) / 100; },
      onTurnStart(u) { if (hpRate(u) > .2) u.hp = Math.max(1, u.hp - Math.round(u.stats.maxHp * .05)); give(u, u, "rally", 1); } } },
  서성: { name: "의성", text: (t = 1) => `전투 첫 세 턴 동안 받는 피해 ${pct(25, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, s, p) { if (turnOf(s) <= 3) ctx.reduction = combine(ctx.reduction, pct(25, sigMul(p)) / 100); } } },
  정봉: { name: "설중분전", text: (t = 1) => `턴이 지날수록 주는 피해가 턴마다 3%씩 증가(최대 ${pct(24, sigMul(t))}%).`,
    hooks: { onAttack(ctx, s, p) { ctx.attackMul *= 1 + Math.min(pct(24, sigMul(p)), (turnOf(s) - 1) * 3) / 100; } } },
  제갈근: { name: "형제의 외교", text: (t = 1) => `자신과 곁에 붙은 아군이 받는 책략 피해 ${pct(12, sigMul(t))}% 감소.`,
    hooks: { onDefend(ctx, _s, p) { if (strat(ctx)) ctx.reduction = combine(ctx.reduction, pct(12, sigMul(p)) / 100); },
      onAllyDefend(ctx, h, p) { if (strat(ctx) && engageDistance(h.pos, ctx.defender.pos) <= 1) ctx.reduction = combine(ctx.reduction, pct(12, sigMul(p)) / 100); } } },
  장소: { name: "강동 내정", text: (t = 1) => `2칸 안 아군의 책략 피해 ${pct(10, sigMul(t))}% 증가.`,
    hooks: { onAllyAttack(ctx, h, p) { if (strat(ctx) && engageDistance(h.pos, ctx.attacker.pos) <= 2) ctx.attackMul *= 1 + pct(10, sigMul(p)) / 100; } } },
  // ── 군웅
  여포: { name: "인중여포", text: (t = 1) => `물리 피해 ${pct(15, sigMul(t))}% 증가, 회심 확률 +15%p. 대신 받는 책략 피해 10% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (phys(ctx)) { ctx.attackMul *= 1 + pct(15, sigMul(p)) / 100; ctx.criticalChance += 15; } },
      onDefend(ctx) { if (strat(ctx)) ctx.reduction = 1 - (1 - ctx.reduction) * 1.1; } } },
  진궁: { name: "냉철한 간파", text: (t = 1) => `책략 회피 +${pct(20, sigMul(t))}%p. 자기 차례마다 자신의 혼란·봉인을 푼다.`,
    hooks: { onDefend(ctx, _s, p) { if (strat(ctx)) ctx.accuracyMod -= pct(20, sigMul(p)); },
      onTurnStart(u) { cleanse(u, ["confusion", "seal"]); } } },
  안량: { name: "하북의 창", text: (t = 1) => `보병·창병을 치면 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (foot(ctx.defender)) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  문추: { name: "하북의 칼", text: (t = 1) => `궁병·노병 같은 원거리 부대를 치면 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (ranged(ctx.defender)) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  저수: { name: "감군", text: (t = 1) => `2칸 안 아군의 명중 +${pct(10, sigMul(t))}%p.`,
    hooks: { onAllyAttack(ctx, h, p) { if (engageDistance(h.pos, ctx.attacker.pos) <= 2) ctx.accuracyMod += pct(10, sigMul(p)); } } },
  전풍: { name: "직간", text: (t = 1) => `받은 책략 피해의 ${pct(20, sigMul(t))}%를 시전자에게 되돌린다.`,
    hooks: { onDefend(ctx, _s, p) { if (strat(ctx)) ctx.reflect += pct(20, sigMul(p)) / 100; } } },
  심배: { name: "업성 사수", text: (t = 1) => `체력이 많을수록 받는 피해 감소(가득하면 ${pct(20, sigMul(t))}%).`,
    hooks: { onDefend(ctx, s, p) { ctx.reduction = combine(ctx.reduction, hpRate(s) * pct(20, sigMul(p)) / 100); } } },
  // ── 초한
  항우: { name: "역발산기개세", text: (t = 1) => `물리 피해 ${pct(20, sigMul(t))}% 증가. 체력 30% 이하(사면초가)에서는 30% 더.`,
    hooks: { onAttack(ctx, s, p) { if (phys(ctx)) { ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; if (hpRate(s) <= .3) ctx.attackMul *= 1.3; } } } },
  유방: { name: "관인대도", text: (t = 1) => `자기 차례마다 전장의 아군 모두의 체력을 ${pct(3, sigMul(t))}% 회복한다.`,
    hooks: { onTurnStart(u, p) { for (const a of [u, ...around(u, 99, "friend")]) heal(a, pct(3, sigMul(p)) / 100); } } },
  한신: { name: "배수진", text: (t = 1) => `물을 등지고(물 칸 위나 옆) 싸우면 주는 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, s, p) { if (byWater(s)) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  장량: { name: "운주유악", text: (t = 1) => `2칸 안 아군의 회심 확률 +${pct(8, sigMul(t))}%p.`,
    hooks: { onAllyAttack(ctx, h, p) { if (engageDistance(h.pos, ctx.attacker.pos) <= 2) ctx.criticalChance += pct(8, sigMul(p)); } } },
  소하: { name: "관중 경영", text: (t = 1) => `자기 차례마다 3칸 안에서 체력이 가장 낮은 아군 하나를 최대 체력의 ${pct(12, sigMul(t))}% 회복한다.`,
    hooks: { onTurnStart(u, p) { const a = [u, ...around(u, 3, "friend")].filter((x) => x.hp < x.stats.maxHp).sort((x, y) => hpRate(x) - hpRate(y))[0]; if (a) heal(a, pct(12, sigMul(p)) / 100); } } },
  범증: { name: "옥결", text: (t = 1) => `이름있는 적 장수에게 주는 책략 피해 ${pct(25, sigMul(t))}% 증가.`,
    hooks: { onAttack(ctx, _s, p) { if (strat(ctx) && isNamedOfficer(ctx.defender)) ctx.attackMul *= 1 + pct(25, sigMul(p)) / 100; } } },
  영포: { name: "경형의 맹장", text: (t = 1) => `물리 공격으로 입힌 피해의 ${pct(15, sigMul(t))}%만큼 체력을 회복한다.`,
    hooks: { onAttack(ctx, _s, p) { if (phys(ctx)) ctx.lifesteal += pct(15, sigMul(p)) / 100; } } },
  팽월: { name: "유격", text: (t = 1) => `숲·갈대늪 칸에서 회피 +${pct(20, sigMul(t))}%p.`,
    hooks: { onDefend(ctx, s, p) { if (["forest", "marsh"].includes(terrainOf(s) ?? "")) ctx.accuracyMod -= pct(20, sigMul(p)); } } },
  번쾌: { name: "홍문의 방패", text: (t = 1) => `곁에 붙은 아군의 피해를 대신 받는다(관통 공격 제외). 받는 물리 피해 ${pct(10, sigMul(t))}% 감소.`,
    hooks: { redirectsAdjacentDamage: true, onDefend(ctx, _s, p) { if (phys(ctx)) ctx.reduction = combine(ctx.reduction, pct(10, sigMul(p)) / 100); } } },
  진평: { name: "반간계", text: () => `세 턴마다 자기 차례에 3칸 안에서 지력이 가장 높은 적 하나를 혼란에 빠뜨린다.`,
    hooks: { onTurnStart(u) { if ((turnOf(u) - 1) % 3 !== 0) return; const t = around(u, 3, "foe").sort((a, b) => b.stats.intellect - a.stats.intellect)[0]; if (t) give(u, t, "confusion", 2); } } },
  종리매: { name: "고군분투", text: (t = 1) => `전장에 남은 아군이 셋 이하이면 주는 피해 ${pct(20, sigMul(t))}% 증가, 받는 피해 ${pct(20, sigMul(t))}% 감소.`,
    hooks: { onAttack(ctx, s, p) { if (around(s, 99, "friend").length <= 2) ctx.attackMul *= 1 + pct(20, sigMul(p)) / 100; },
      onDefend(ctx, s, p) { if (around(s, 99, "friend").length <= 2) ctx.reduction = combine(ctx.reduction, pct(20, sigMul(p)) / 100); } } },
  계포: { name: "계포일낙", text: () => `자기 차례마다 2칸 안에서 체력이 절반 이하인 아군을 견고하게 한다(받는 피해 감소).`,
    hooks: { onTurnStart(u) { for (const a of around(u, 2, "friend")) if (hpRate(a) <= .5) give(u, a, "guard", 1); } } },
};

/** 고유특성이 있는 이름있는 장수 이름(게임에 나오는 장수만). */
export const SIGNATURE_NAMES: readonly string[] = Object.keys(S);
export const signatureOf = (name: string): Signature | undefined => S[name];
export const signatureTraitId = (name: string) => `sig:${name}`;

for (const [who, sig] of Object.entries(S)) defineTrait({ id: signatureTraitId(who), name: sig.name, description: sig.text(1), hooks: sig.hooks });

/** 이름있는 장수에게 고유특성을 붙인다(한 번만). 병종 단계가 오를수록 강해진다. 목록 밖 인물이면 false. */
export function applySignature(unit: Unit, name: string, tier: number): boolean {
  const sig = S[name];
  if (!sig) return false;
  const id = signatureTraitId(name);
  if (!unit.traits.includes(id)) unit.traits.push(id);
  unit.traitParams[id] = Math.max(1, Math.min(4, tier));
  return true;
}
