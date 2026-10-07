/**
 * 병종 차트(사용자 제공 그림 8장)로 늘린 계통.
 *
 * - 새 계통 14개: 검사·군주·도독·무희·산악기병·효기병·전차·정란·천자·보급·남만기병·개마·극기병·사륜거
 * - 기존 계통의 4단계: 금위군→무극보병, 극병→신창, 귀모→신산, 뇌신→천도사, 나한승→권성,
 *   녹림대왕→두령, 누선→수군도독, 철부도→무극중기병, 파성충차→신충차
 * - 모병 특수 병과(진화 없음): 황건병·황건궁병·황건창병·황건무인·남만보병·북방보병·북방기병·어가·팔괘전차·비도수·파촉연노병
 *
 * 능력치 계수는 계열 기본값에서 출발해 단계마다 12%씩 오른다(진화 단계마다 5% 이상 오르는 규칙을 지킨다).
 * 고유 특성은 단계마다 앞 단계 것을 이어받고 강해진다.
 * classes.ts가 이 표를 VARIANTS·EVOLUTION에 합친다.
 */
import type { UnitClass } from "./types.ts";
import type { ClassProfile, ClassTier, ClassVariant } from "./classes.ts";

const p = (
  hp: number, mp: number, attack: number, defense: number, intellect: number, spirit: number,
  agility: number, movement: number, range: readonly [number, number], canUseStrategy = false,
): ClassProfile => ({ hp, mp, attack, defense, intellect, spirit, agility, movement, range, canUseStrategy });

/** 새 계통의 1단계 계수(계열 기본 병종을 바탕으로 계통 성격을 더한 값). */
const BASE = {
  sword: p(1.0, 0.4, 1.15, 0.95, 0.7, 0.9, 1.2, 5, [1, 1]),
  lord: p(1.1, 0.8, 1.1, 1.0, 0.95, 1.0, 1.1, 6, [1, 1], true),
  commander: p(1.05, 0.9, 1.05, 1.0, 1.05, 1.0, 1.0, 5, [1, 1], true),
  dancer: p(0.85, 1.3, 0.75, 0.75, 1.0, 1.4, 1.2, 5, [1, 1], true),
  mountainCav: p(1.0, 0.4, 1.1, 0.9, 0.6, 0.8, 1.15, 7, [1, 1]),
  valiantCav: p(1.05, 0.4, 1.2, 0.9, 0.55, 0.8, 1.15, 7, [1, 1]),
  chariot: p(1.3, 0.3, 1.15, 1.2, 0.5, 0.8, 0.8, 6, [1, 1]),
  siegeTower: p(1.4, 0.3, 1.0, 1.3, 0.5, 0.8, 0.5, 3, [1, 3]),
  prince: p(0.85, 1.4, 0.7, 0.8, 1.2, 1.3, 1.0, 5, [1, 1], true),
  supply: p(1.0, 1.2, 0.45, 0.9, 0.8, 1.0, 0.8, 5, [1, 1], true),
  nanmanRider: p(1.05, 0.35, 1.2, 0.85, 0.5, 0.75, 1.1, 7, [1, 1]),
  gaema: p(1.3, 0.4, 1.2, 1.25, 0.6, 0.8, 0.9, 6, [1, 1]),
  halberdCav: p(1.05, 0.4, 1.2, 0.95, 0.6, 0.8, 1.1, 7, [1, 1]),
  wheelSage: p(0.8, 1.45, 0.6, 0.75, 1.35, 1.25, 0.9, 4, [1, 1], true),
} as const;

const up = (b: ClassProfile, step: number): ClassProfile => {
  const m = 1 + 0.12 * step;
  return p(b.hp * m, b.mp * m, b.attack * m, b.defense * m, b.intellect * m, b.spirit * m, b.agility * m, b.movement, b.range, b.canUseStrategy);
};

interface Stage { id: UnitClass; level: number; traits?: Record<string, number>; bloom?: [string, string] }
interface Line { family: UnitClass; base: ClassProfile; stages: Stage[] }

/** 새 계통. 1단계는 레벨 1, 이후 단계는 진화 레벨. */
const LINES: Line[] = [
  { family: "infantry", base: BASE.sword, stages: [
    { id: "swordsman", level: 1 },
    { id: "knightErrant", level: 10, traits: { critical: 10 }, bloom: ["협기", "회심 확률 +10%"] },
    { id: "swordArtist", level: 20, traits: { critical: 12, attackBoost: 4 }, bloom: ["검술", "회심 +12% · 공격력 +4"] },
    { id: "swordMaster", level: 30, traits: { critical: 15, attackBoost: 6, penetrate: 15 }, bloom: ["검기", "회심 +15% · 공격력 +6 · 방어 15% 관통"] },
    { id: "swordSaint", level: 40, traits: { critical: 20, attackBoost: 8, penetrate: 25, lastStand: 15 }, bloom: ["검성의 경지", "회심 +20% · 공격력 +8 · 방어 25% 관통 · 궁지에서 더 강해진다"] },
  ] },
  { family: "cavalry", base: BASE.lord, stages: [
    { id: "lord", level: 1 },
    { id: "hegemon", level: 10, traits: { veteran: 10 }, bloom: ["패업", "체력 절반 이하에서 받는 피해 10% 감소"] },
    { id: "sovereign", level: 20, traits: { veteran: 12, attackBoost: 4 }, bloom: ["왕도", "받는 피해 감소 12% · 공격력 +4"] },
    { id: "sonOfHeaven", level: 30, traits: { veteran: 15, attackBoost: 6, strategyDamageReduction: 15 }, bloom: ["천명", "받는 피해 감소 15% · 공격력 +6 · 책략 피해 15% 감소"] },
  ] },
  { family: "infantry", base: BASE.commander, stages: [
    { id: "commander", level: 1 },
    { id: "grandCommander", level: 10, traits: { strategyPower: 6 }, bloom: ["지휘", "책략 피해 +6%"] },
    { id: "marshal", level: 20, traits: { strategyPower: 8, counterBoost: 10 }, bloom: ["대군 통솔", "책략 피해 +8% · 반격 피해 +10%"] },
    { id: "heavenCommander", level: 30, traits: { strategyPower: 12, counterBoost: 15, veteran: 15 }, bloom: ["천군 호령", "책략 피해 +12% · 반격 +15% · 궁지에서 받는 피해 15% 감소"] },
  ] },
  { family: "maiden", base: BASE.dancer, stages: [
    { id: "dancer", level: 1 },
    { id: "songstress", level: 10, traits: { strategyDamageReduction: 10 }, bloom: ["가무", "책략 피해 10% 감소"] },
    { id: "beauty", level: 20, traits: { strategyDamageReduction: 12, healPower: 15 }, bloom: ["경국지색", "책략 피해 12% 감소 · 회복량 +15%"] },
    { id: "heavenDancer", level: 30, traits: { strategyDamageReduction: 15, healPower: 25, physicalDamageReduction: 10 }, bloom: ["천상의 춤", "책략 피해 15% · 물리 피해 10% 감소 · 회복량 +25%"] },
  ] },
  { family: "cavalry", base: BASE.mountainCav, stages: [
    { id: "mountainCav", level: 1, traits: { roughTerrainMove: 0 } },
    { id: "scoutCav", level: 10, traits: { roughTerrainMove: 0, critical: 10 }, bloom: ["산길 수색", "험지를 평지처럼 달린다 · 회심 +10%"] },
    { id: "raidCav", level: 20, traits: { roughTerrainMove: 0, critical: 12, chargePower: 10 }, bloom: ["기습", "회심 +12% · 움직인 뒤 공격하면 피해 +10%"] },
    { id: "pegasusCav", level: 30, traits: { roughTerrainMove: 0, critical: 15, chargePower: 15 }, bloom: ["비마", "회심 +15% · 움직인 뒤 공격하면 피해 +15%"] },
  ] },
  { family: "cavalry", base: BASE.valiantCav, stages: [
    { id: "valiantCav", level: 1 },
    { id: "dragonCav", level: 10, traits: { chargePower: 10 }, bloom: ["용기", "움직인 뒤 공격하면 피해 +10%"] },
    { id: "stormCav", level: 20, traits: { chargePower: 12, lifesteal: 8 }, bloom: ["돌파", "돌격 피해 +12% · 입힌 피해의 8% 회복"] },
    { id: "heavenCav", level: 30, traits: { chargePower: 15, lifesteal: 10, lastStand: 15 }, bloom: ["천군 돌격", "돌격 피해 +15% · 흡혈 10% · 궁지에서 더 강해진다"] },
  ] },
  { family: "heavyCav", base: BASE.chariot, stages: [
    { id: "lightChariot", level: 1 },
    { id: "assaultChariot", level: 10, traits: { chargePower: 12 }, bloom: ["전차 돌격", "움직인 뒤 공격하면 피해 +12%"] },
    { id: "heavyChariot", level: 20, traits: { chargePower: 15, physicalDamageReduction: 10 }, bloom: ["철갑 전차", "돌격 피해 +15% · 물리 피해 10% 감소"] },
    { id: "divineChariot", level: 30, traits: { chargePower: 18, physicalDamageReduction: 15, penetrate: 15 }, bloom: ["신전차", "돌격 피해 +18% · 물리 피해 15% 감소 · 방어 15% 관통"] },
  ] },
  { family: "catapult", base: BASE.siegeTower, stages: [
    { id: "siegeTower", level: 1 },
    { id: "jinglan", level: 10, traits: { attackBoost: 4 }, bloom: ["높은 사대", "공격력 +4"] },
    { id: "heavyJinglan", level: 20, traits: { attackBoost: 6, physicalDamageReduction: 10 }, bloom: ["두꺼운 판벽", "공격력 +6 · 물리 피해 10% 감소"] },
    { id: "divineJinglan", level: 30, traits: { attackBoost: 8, physicalDamageReduction: 15, penetrate: 15 }, bloom: ["신정란", "공격력 +8 · 물리 피해 15% 감소 · 방어 15% 관통"] },
  ] },
  { family: "strategist", base: BASE.prince, stages: [
    { id: "crownPrince", level: 1 },
    { id: "royalPrince", level: 10, traits: { strategyDamageReduction: 10 }, bloom: ["왕실의 위엄", "책략 피해 10% 감소"] },
    { id: "emperor", level: 20, traits: { strategyDamageReduction: 12, healPower: 15 }, bloom: ["황은", "책략 피해 12% 감소 · 회복량 +15%"] },
    { id: "heavenEmperor", level: 30, traits: { strategyDamageReduction: 15, healPower: 25, veteran: 15 }, bloom: ["천자의 위광", "책략 피해 15% 감소 · 회복량 +25% · 궁지에서 받는 피해 15% 감소"] },
  ] },
  { family: "engineer", base: BASE.supply, stages: [
    { id: "transport", level: 1 },
    { id: "baggageTrain", level: 10, traits: { healPower: 15 }, bloom: ["보급", "회복량 +15%"] },
    { id: "woodenOx", level: 20, traits: { healPower: 20, physicalDamageReduction: 10 }, bloom: ["목우유마", "회복량 +20% · 물리 피해 10% 감소"] },
    { id: "divineOx", level: 30, traits: { healPower: 30, physicalDamageReduction: 15, strategyDamageReduction: 10 }, bloom: ["신목우", "회복량 +30% · 물리 15%·책략 10% 피해 감소"] },
  ] },
  { family: "cavalry", base: BASE.nanmanRider, stages: [
    { id: "nanmanRider", level: 1 },
    { id: "nanmanBeast", level: 20, traits: { critical: 10, physicalDamageReduction: 10 }, bloom: ["맹수 기마", "회심 +10% · 물리 피해 10% 감소"] },
  ] },
  { family: "heavyCav", base: BASE.gaema, stages: [
    { id: "gaemaWarrior", level: 1 },
    { id: "gaemaCaptain", level: 12, traits: { physicalDamageReduction: 10 }, bloom: ["개마", "사람과 말 모두 철갑, 물리 피해 10% 감소"] },
    { id: "whiteTigerCav", level: 22, traits: { physicalDamageReduction: 15, penetrate: 15 }, bloom: ["백호", "물리 피해 15% 감소 · 방어 15% 관통"] },
  ] },
  { family: "cavalry", base: BASE.halberdCav, stages: [
    { id: "halberdCav", level: 1 },
    { id: "heavyHalberdCav", level: 15, traits: { counterBoost: 15, penetrate: 10 }, bloom: ["중장극", "반격 피해 +15% · 방어 10% 관통"] },
  ] },
  { family: "strategist", base: BASE.wheelSage, stages: [
    { id: "wheelSage", level: 1 },
    { id: "fanSage", level: 20, traits: { strategyPower: 10, strategyDamageReduction: 10 }, bloom: ["천궁", "기마궁술을 완성해 책략 피해 +10% · 받는 책략 피해 10% 감소"] },
  ] },
];

/** 기존 3단계 계통 위에 얹는 4단계(레벨 30). 계수는 앞 단계 ×1.1, 특성은 앞 단계를 잇고 강해진다. */
const FOURTH: Array<{ from: UnitClass; id: UnitClass; boost: Record<string, number>; bloom: [string, string] }> = [
  { from: "royalGuard", id: "ironInfantry", boost: { physicalDamageReduction: 10 }, bloom: ["무극", "호위·궁지 강화에 더해 물리 피해 10% 감소"] },
  { from: "halberdier", id: "divineSpear", boost: { penetrate: 15 }, bloom: ["신창", "반격 강화에 더해 방어 15% 관통"] },
  { from: "mastermind", id: "divineStrategist", boost: { strategyPower: 10 }, bloom: ["신산", "책략 회피에 더해 책략 피해 +10%"] },
  { from: "thunderGod", id: "heavenTaoist", boost: { strategyDamageReduction: 10 }, bloom: ["천도", "벼락 책략에 더해 받는 책략 피해 10% 감소"] },
  { from: "arhat", id: "fistSaint", boost: { critical: 10 }, bloom: ["권성", "금강의 몸에 더해 회심 +10%"] },
  { from: "greenwoodKing", id: "chieftain", boost: { lifesteal: 8 }, bloom: ["두령", "산채의 왕에 더해 입힌 피해의 8% 회복"] },
  { from: "louchuan", id: "admiral", boost: { counterBoost: 10 }, bloom: ["수군도독", "누선의 위세에 더해 반격 피해 +10%"] },
  { from: "ironPagoda", id: "wujiHeavyCav", boost: { attackBoost: 5 }, bloom: ["무극중기", "철부도의 돌파에 더해 공격력 +5"] },
  { from: "cloudRam", id: "dragonRam", boost: { physicalDamageReduction: 5 }, bloom: ["신충차", "용머리 충각, 물리 피해를 더 덜 받는다"] },
];

/** 모병 특수 병과: 진화 없이 그 자체로 쓰는 부대. */
const SPECIALS: Array<[UnitClass, UnitClass, ClassProfile, Record<string, number>?]> = [
  ["yellowTurban", "infantry", p(1.05, 0.4, 1.05, 0.95, 0.6, 0.8, 0.95, 5, [1, 1]), { lastStand: 10 }],
  ["ytArcher", "archer", p(0.85, 0.5, 1.0, 0.8, 0.7, 0.8, 1.05, 5, [2, 2])],
  ["ytSpear", "spearman", p(1.05, 0.4, 1.1, 1.0, 0.6, 0.8, 0.95, 5, [1, 1]), { counterBoost: 10 }],
  ["ytBrawler", "monk", p(1.1, 0.4, 1.15, 0.95, 0.6, 0.85, 1.2, 5, [1, 1]), { critical: 10 }],
  ["nanmanFoot", "infantry", p(1.15, 0.3, 1.1, 0.95, 0.5, 0.75, 1.0, 5, [1, 1]), { roughTerrainMove: 0 }],
  ["northFoot", "infantry", p(1.1, 0.35, 1.1, 1.0, 0.55, 0.8, 0.95, 5, [1, 1])],
  ["northRider", "horseArcher", p(1.0, 0.4, 0.95, 0.9, 0.6, 0.8, 1.2, 7, [2, 3])],
  ["palanquin", "strategist", p(0.9, 1.4, 0.55, 0.85, 1.2, 1.35, 0.8, 4, [1, 1], true), { strategyDamageReduction: 15 }],
  ["baguaChariot", "heavyCav", p(1.3, 1.0, 1.0, 1.2, 1.15, 1.2, 0.8, 5, [1, 1], true), { strategyPower: 10 }],
  ["flyingBlade", "bandit", p(0.85, 0.4, 1.15, 0.75, 0.7, 0.8, 1.35, 6, [1, 2]), { critical: 15 }],
  ["bashuRepeater", "crossbow", p(0.95, 0.5, 1.15, 0.9, 0.85, 0.95, 0.95, 4, [2, 3]), { attackBoost: 4 }],
];

export function chartClasses(existing: Partial<Record<UnitClass, ClassVariant>>): {
  variants: Partial<Record<UnitClass, ClassVariant>>;
  evolution: Partial<Record<UnitClass, readonly [UnitClass, number]>>;
} {
  const variants: Partial<Record<UnitClass, ClassVariant>> = {};
  const evolution: Partial<Record<UnitClass, readonly [UnitClass, number]>> = {};
  for (const line of LINES) {
    line.stages.forEach((s, i) => {
      const v: ClassVariant = { family: line.family, tier: (i + 1) as ClassTier, profile: up(line.base, i) };
      if (s.traits) v.traits = s.traits;
      if (s.bloom) v.bloom = { name: s.bloom[0], description: s.bloom[1] };
      variants[s.id] = v;
      const next = line.stages[i + 1];
      if (next) evolution[s.id] = [next.id, next.level];
    });
  }
  for (const f of FOURTH) {
    const prev = existing[f.from];
    if (!prev) throw new Error(`4단계의 앞 병종이 없다: ${f.from}`);
    const traits: Record<string, number> = { ...(prev.traits ?? {}) };
    for (const [k, v] of Object.entries(f.boost)) traits[k] = (traits[k] ?? 0) + v;
    const b = prev.profile, m = 1.1;
    variants[f.id] = {
      family: prev.family, tier: Math.min(4, prev.tier + 1) as ClassTier,
      profile: p(b.hp * m, b.mp * m, b.attack * m, b.defense * m, b.intellect * m, b.spirit * m, b.agility * m, b.movement, b.range, b.canUseStrategy),
      traits, bloom: { name: f.bloom[0], description: f.bloom[1] },
    };
    evolution[f.from] = [f.id, 30];
  }
  for (const [id, family, profile, traits] of SPECIALS) variants[id] = traits ? { family, tier: 1, profile, traits } : { family, tier: 1, profile };
  return { variants, evolution };
}

/** 차트로 늘린 병종 id 전부(도감·모병 목록용). */
export const CHART_LINE_ROOTS: UnitClass[] = LINES.map((l) => l.stages[0]!.id);
export const CHART_SPECIALS: UnitClass[] = SPECIALS.map(([id]) => id);
export const CHART_FOURTH: UnitClass[] = FOURTH.map((f) => f.id);
