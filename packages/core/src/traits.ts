/**
 * 특성(트레이트) 레지스트리.
 *
 * 설계 원칙: 특성은 피해 파이프라인의 정해진 훅에만 개입한다.
 * 전투 로직 안에 `if (hasTrait("..."))` 분기를 넣지 않는다 —
 * 특성이 100개를 넘어가면 그 방식은 유지 불가능해진다. (PRD R7)
 */
import type { Unit, DamageBreakdown } from "./types.ts";

export type AttackKind = "physical" | "strategy" | "special";

/** 피해 계산 중 특성이 읽고 쓰는 컨텍스트. */
export interface DamageContext {
  readonly attacker: Unit;
  readonly defender: Unit;
  readonly kind: AttackKind;
  /** 공격자와 방어자의 거리 */
  readonly distance: number;
  /** 누적 공격 배율 (기본 1.0) */
  attackMul: number;
  /** 누적 피해 감소율 0~1 (최종적으로 1-reduction 이 곱해짐) */
  reduction: number;
  /** 명중률 가산 (백분율 포인트) */
  accuracyMod: number;
  /** 방어력 무시 비율 0~1 */
  defenseIgnore: number;
  /** 회심(치명타) 확률 */
  criticalChance: number;
  /** true면 이 공격은 무효 (면역) */
  immune: boolean;
  /** 방어자가 반격할 수 없음 */
  suppressCounter: boolean;
  /** 명중 판정을 건너뛰고 무조건 명중 */
  alwaysHit: boolean;
  /** 방어자가 공격자에게 되돌릴 피해 비율 (반사) */
  reflect: number;
  /** 공격자가 피해량의 이 비율만큼 HP 회복 */
  lifesteal: number;
  /** 즉사 판정 확률 */
  instantKillChance: number;
}

export interface TraitHooks {
  /** 이 특성 보유자가 공격할 때 */
  onAttack?(ctx: DamageContext, self: Unit, param: number): void;
  /** 이 특성 보유자가 피격당할 때 */
  onDefend?(ctx: DamageContext, self: Unit, param: number): void;
  /** 매 턴 시작 시 */
  onTurnStart?(self: Unit, param: number): void;
  /** 반격 횟수 상한을 덮어씀 (기본 1) */
  counterLimit?(param: number): number;
  /** 이동 시 지형 비용을 무시 */
  ignoresRoughTerrain?: boolean;
  /** 인접 아군이 받는 피해를 대신 받는다 (M-20 GUARD_LINK) */
  redirectsAdjacentDamage?: boolean;
}

export interface TraitDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hooks: TraitHooks;
}

const REGISTRY = new Map<string, TraitDef>();

export function defineTrait(def: TraitDef): TraitDef {
  if (REGISTRY.has(def.id)) throw new Error(`중복 특성 ID: ${def.id}`);
  REGISTRY.set(def.id, def);
  return def;
}

export function getTrait(id: string): TraitDef {
  const t = REGISTRY.get(id);
  if (!t) throw new Error(`정의되지 않은 특성: ${id}`);
  return t;
}

export function hasTrait(unit: Unit, id: string): boolean {
  return unit.traits.includes(id);
}

export function traitParam(unit: Unit, id: string, fallback = 0): number {
  return unit.traitParams[id] ?? fallback;
}

export function allTraitIds(): string[] {
  return [...REGISTRY.keys()];
}

/** 공격자 → 방어자 순으로 모든 훅을 적용한다. */
export function applyTraitHooks(ctx: DamageContext): void {
  for (const id of ctx.attacker.traits) {
    getTrait(id).hooks.onAttack?.(ctx, ctx.attacker, traitParam(ctx.attacker, id));
  }
  for (const id of ctx.defender.traits) {
    getTrait(id).hooks.onDefend?.(ctx, ctx.defender, traitParam(ctx.defender, id));
  }
}

export function counterLimitOf(unit: Unit): number {
  let limit = 1;
  for (const id of unit.traits) {
    const fn = getTrait(id).hooks.counterLimit;
    if (fn) limit = Math.max(limit, fn(traitParam(unit, id)));
  }
  return limit;
}

export function ignoresRough(unit: Unit): boolean {
  return unit.traits.some((id) => getTrait(id).hooks.ignoresRoughTerrain === true);
}

export function guardsAdjacent(unit: Unit): boolean {
  return unit.traits.some((id) => getTrait(id).hooks.redirectsAdjacentDamage === true);
}

// ─────────────────────────────────────────────────────────── 기본 특성 정의

// 지켜야 할 대상(피난민·호송 수레·필수 생존 장수 등): 한 번의 공격으로 최대 체력의 param%보다 많이 잃지 않는다.
// 피해 상한은 battle.ts가 타격을 확정할 때 적용한다(capHit). 특성은 표시와 판정용 표식이다.
defineTrait({
  id: "steadfast",
  name: "버팀",
  description: "한 번의 공격으로 최대 체력의 param%보다 많이 잃지 않는다(한 방에 쓰러지지 않는다).",
  hooks: {},
});
/** 버팀 특성의 피해 상한을 적용한 피해. */
/** 누구든 한 번의 공격·책략으로 최대 체력의 이만큼(%)보다 많이 잃지 않는다(회심·전법 포함). */
export const MAX_HIT_SHARE = 50;
export function capHit(defender: Unit, damage: number): number {
  const steady = defender.traits.includes("steadfast") ? defender.traitParams["steadfast"] ?? 0 : 0;
  // 성문·망루는 충차가 몇 번에 부술 수 있어야 하므로 상한을 두지 않는다(버팀만 적용).
  if (/^(gate|tower)_/.test(defender.id)) return steady > 0 ? Math.min(damage, Math.ceil(defender.stats.maxHp * steady / 100)) : damage;
  const cap = defender.ratioRules ? (steady > 0 ? Math.min(steady, MAX_HIT_SHARE) : MAX_HIT_SHARE) : steady;
  if (cap <= 0) return damage;
  return Math.min(damage, Math.max(1, Math.ceil(defender.stats.maxHp * cap / 100)));
}

// 피해 감소 계열
defineTrait({
  id: "physicalDamageReduction",
  name: "물리 피해 감소",
  description: "물리 피해를 param% 감소시킨다.",
  hooks: {
    onDefend(ctx, _self, param) {
      if (ctx.kind === "physical") ctx.reduction = combine(ctx.reduction, param / 100);
    },
  },
});

defineTrait({
  id: "fireWeakness",
  name: "화계 취약",
  description: "화계 책략 피해가 param% 늘어난다. (등갑병)",
  hooks: {},
});

defineTrait({
  id: "strategyDamageReduction",
  name: "책략 피해 감소",
  description: "책략 피해를 param% 감소시킨다.",
  hooks: {
    onDefend(ctx, _self, param) {
      if (ctx.kind === "strategy") ctx.reduction = combine(ctx.reduction, param / 100);
    },
  },
});

// 면역 계열
defineTrait({
  id: "physicalImmunity",
  name: "물리 공격 면역",
  description: "물리 공격을 무효화한다.",
  hooks: {
    onDefend(ctx) {
      if (ctx.kind === "physical") ctx.immune = true;
    },
  },
});

defineTrait({
  id: "strategyImmunity",
  name: "완전 책략 면역",
  description: "책략을 무효화한다. 단, 인접 시 해제되는 변형이 존재한다.",
  hooks: {
    onDefend(ctx) {
      if (ctx.kind === "strategy") ctx.immune = true;
    },
  },
});

defineTrait({
  id: "strategyImmunityRanged",
  name: "완전 책략 면역 (원거리 한정)",
  description: "인접하지 않은 책략만 무효화한다. (PRD 1-11 엄준 패턴)",
  hooks: {
    onDefend(ctx) {
      if (ctx.kind === "strategy" && ctx.distance > 1) ctx.immune = true;
    },
  },
});

defineTrait({
  id: "specialImmunity",
  name: "특수 공격 면역",
  description: "특수 효과(상태이상 부여 등)를 무효화한다.",
  hooks: {
    onDefend(ctx) {
      if (ctx.kind === "special") ctx.immune = true;
    },
  },
});

// 공격 계열
defineTrait({
  id: "critical",
  name: "회심 공격",
  description: "param% 확률로 회심(1.5배) 공격.",
  hooks: {
    onAttack(ctx, _self, param) {
      ctx.criticalChance += param;
    },
  },
});

defineTrait({
  id: "noCounterAttack",
  name: "무반격 공격",
  description: "이 유닛의 공격에는 반격당하지 않는다.",
  hooks: {
    onAttack(ctx) {
      ctx.suppressCounter = true;
    },
  },
});

defineTrait({
  id: "alwaysHit",
  name: "공격 필중",
  description: "명중 판정을 생략한다.",
  hooks: {
    onAttack(ctx) {
      ctx.alwaysHit = true;
    },
  },
});

defineTrait({
  id: "penetrate",
  name: "관통 공격",
  description: "방어력을 param% 무시한다.",
  hooks: {
    onAttack(ctx, _self, param) {
      ctx.defenseIgnore = Math.max(ctx.defenseIgnore, param / 100);
    },
  },
});

defineTrait({
  id: "lifesteal",
  name: "흡혈 공격",
  description: "입힌 피해의 param%만큼 HP를 회복한다.",
  hooks: {
    onAttack(ctx, _self, param) {
      ctx.lifesteal += param / 100;
    },
  },
});

defineTrait({
  id: "instantKill",
  name: "금격 공격",
  description: "param% 확률로 즉사시킨다.",
  hooks: {
    onAttack(ctx, _self, param) {
      ctx.instantKillChance += param;
    },
  },
});

// 반격 계열
defineTrait({
  id: "unlimitedCounter",
  name: "무제한 반격",
  description: "턴당 반격 횟수 제한이 없다.",
  hooks: { counterLimit: () => 99 },
});

defineTrait({
  id: "reCounter",
  name: "재반격",
  description: "반격에 대해 다시 반격한다.",
  hooks: {},
});

defineTrait({
  id: "counterBoost",
  name: "반격 강화",
  description: "반격 시 위력이 param% 증가한다.",
  hooks: {},
});

// 반사 계열
defineTrait({
  id: "physicalReflect",
  name: "물리 피해 반사",
  description: "받은 물리 피해의 param%를 공격자에게 되돌린다.",
  hooks: {
    onDefend(ctx, _self, param) {
      if (ctx.kind === "physical") ctx.reflect += param / 100;
    },
  },
});

defineTrait({
  id: "strategyReflect",
  name: "책략 피해 반사",
  description: "받은 책략 피해의 param%를 시전자에게 되돌린다.",
  hooks: {
    onDefend(ctx, _self, param) {
      if (ctx.kind === "strategy") ctx.reflect += param / 100;
    },
  },
});

// 조건부 강화
defineTrait({
  id: "lastStand",
  name: "국사무쌍",
  description: "HP가 낮을수록 공격력이 상승한다 (최대 param% 가산).",
  hooks: {
    onAttack(ctx, self, param) {
      const missing = 1 - self.hp / self.stats.maxHp;
      ctx.attackMul *= 1 + (param / 100) * missing;
    },
  },
});

defineTrait({
  id: "veteran",
  name: "역전용사",
  description: "HP가 50% 이하일 때 피해를 param% 감소시킨다.",
  hooks: {
    onDefend(ctx, self, param) {
      if (self.hp <= self.stats.maxHp / 2) ctx.reduction = combine(ctx.reduction, param / 100);
    },
  },
});

defineTrait({
  id: "turnaround",
  name: "전화위복",
  description: "HP가 50% 이하일 때 공격력이 param% 상승한다.",
  hooks: {
    onAttack(ctx, self, param) {
      if (self.hp <= self.stats.maxHp / 2) ctx.attackMul *= 1 + param / 100;
    },
  },
});

defineTrait({
  id: "strategyEvasion",
  name: "책략 방어술",
  description: "param% 확률로 책략을 회피한다 (명중률 차감으로 구현).",
  hooks: {
    onDefend(ctx, _self, param) {
      if (ctx.kind === "strategy") ctx.accuracyMod -= param;
    },
  },
});

// 이동 계열
defineTrait({
  id: "roughTerrainMove",
  name: "험로 이동",
  description: "모든 통행 가능 지형의 이동 비용이 1이 된다.",
  hooks: { ignoresRoughTerrain: true },
});

// 보조 계열
defineTrait({
  id: "attackBoost",
  name: "공격력 보조",
  description: "공격력이 param 만큼 증가한다.",
  hooks: {
    onAttack(ctx, _self, param) {
      ctx.attackMul *= 1 + param / 100;
    },
  },
});

defineTrait({
  id: "defenseBoost",
  name: "방어력 보조",
  description: "받는 피해가 param% 감소한다.",
  hooks: {
    onDefend(ctx, _self, param) {
      ctx.reduction = combine(ctx.reduction, param / 100);
    },
  },
});

defineTrait({
  id: "guardian",
  name: "호위",
  description:
    "인접 아군이 받는 피해를 대신 받는다. 관통 공격에는 무력하다. (M-20 GUARD_LINK)",
  hooks: { redirectsAdjacentDamage: true },
});

defineTrait({
  id: "damageShare",
  name: "피해 분배",
  description: "받는 피해의 param%를 인접 아군에게 분산한다.",
  hooks: {
    onDefend(ctx, _self, param) {
      ctx.reduction = combine(ctx.reduction, param / 100);
    },
  },
});

/**
 * 감소율 합성. 단순 덧셈은 100%를 넘겨 무적이 되므로 곱연산으로 합친다.
 * 두 개의 50% 감소는 75% 감소가 된다.
 */
export function combine(a: number, b: number): number {
  return 1 - (1 - a) * (1 - b);
}

defineTrait({id:'siegeRam',name:'공성 충격',description:'성문·감시탑에 물리 피해 3배, 방어 50% 무시.',hooks:{onAttack(ctx){if(ctx.kind==='physical'&&/^(gate|tower)_\d+_\d+$/.test(ctx.defender.id)){ctx.attackMul*=3;ctx.defenseIgnore=Math.max(ctx.defenseIgnore,.5);}}}});
defineTrait({id:'simaPatience',name:'은인자중',description:'책략 피해 15% 감소, 턴 시작 MP 3 회복.',hooks:{onDefend(ctx){if(ctx.kind==='strategy')ctx.reduction=combine(ctx.reduction,.15);},onTurnStart(u){u.mp=Math.min(u.stats.maxMp,u.mp+3);}}});
defineTrait({id:'caoVanguard',name:'선봉 지휘',description:'물리 공격 피해 12% 증가.',hooks:{onAttack(ctx){if(ctx.kind==='physical')ctx.attackMul*=1.12;}}});
defineTrait({id:'familyShield',name:'가문의 방패',description:'물리 피해 15% 감소.',hooks:{onDefend(ctx){if(ctx.kind==='physical')ctx.reduction=combine(ctx.reduction,.15);}}});
defineTrait({id:'commandDefense',name:'지휘관의 수비',description:'물리 피해 10% 감소.',hooks:{onDefend(ctx){if(ctx.kind==='physical')ctx.reduction=combine(ctx.reduction,.1);}}});
defineTrait({id:'westernValor',name:'서량의 맹장',description:'물리 공격 피해 10% 증가.',hooks:{onAttack(ctx){if(ctx.kind==='physical')ctx.attackMul*=1.1;}}});
defineTrait({id:'flyingGeneral',name:'비장의 무위',description:'물리 공격 피해 18% 증가.',hooks:{onAttack(ctx){if(ctx.kind==='physical')ctx.attackMul*=1.18;}}});
defineTrait({id:'strategicGuard',name:'냉철한 간파',description:'책략 피해 15% 감소.',hooks:{onDefend(ctx){if(ctx.kind==='strategy')ctx.reduction=combine(ctx.reduction,.15);}}});
defineTrait({id:'zhouStrategy',name:'주랑의 계책',description:'책략 공격 피해 12% 증가.',hooks:{onAttack(ctx){if(ctx.kind==='strategy')ctx.attackMul*=1.12;}}});
// 진화 개화 스킬용
defineTrait({id:'strategyPower',name:'책략 위력',description:'책략 공격 피해가 param% 늘어난다.',hooks:{onAttack(ctx,_s,param){if(ctx.kind==='strategy')ctx.attackMul*=1+param/100;}}});
defineTrait({id:'physicalPower',name:'무위',description:'물리 공격 피해가 param% 늘어난다.',hooks:{onAttack(ctx,_s,param){if(ctx.kind==='physical')ctx.attackMul*=1+param/100;}}});
defineTrait({id:'healPower',name:'회복 위력',description:'회복 책략·치유의 회복량이 param% 늘어난다.',hooks:{}});
// 연구·장수 효과용(param = 백분율 또는 수치). 같은 특성을 여러 곳에서 받으면 param이 더해진다.
defineTrait({id:'accuracyBoost',name:'정조',description:'명중이 param%p 오른다.',hooks:{onAttack(ctx,_s,param){ctx.accuracyMod+=param;}}});
defineTrait({id:'evasionBoost',name:'회피',description:'상대의 명중이 param%p 내려간다.',hooks:{onDefend(ctx,_s,param){ctx.accuracyMod-=param;}}});
defineTrait({id:'regen',name:'재정비',description:'자기 차례 시작에 최대 체력의 param%를 회복한다.',hooks:{onTurnStart(u,param){u.hp=Math.min(u.stats.maxHp,u.hp+Math.max(1,Math.round(u.stats.maxHp*param/100)));}}});
defineTrait({id:'manaRegen',name:'정심',description:'자기 차례 시작에 MP를 param 회복한다.',hooks:{onTurnStart(u,param){u.mp=Math.min(u.stats.maxMp,u.mp+param);}}});
defineTrait({id:'chargePower',name:'돌격 숙련',description:'이번 차례에 움직인 뒤 물리 공격하면 피해가 param% 늘어난다.',hooks:{onAttack(ctx,self,param){if(ctx.kind==='physical'&&self.movedThisTurn)ctx.attackMul*=1+param/100;}}});
defineTrait({id:'rangedPower',name:'원거리 숙련',description:'두 칸 이상 떨어진 적을 물리 공격하면 피해가 param% 늘어난다.',hooks:{onAttack(ctx,_s,param){if(ctx.kind==='physical'&&ctx.distance>=2)ctx.attackMul*=1+param/100;}}});
defineTrait({id:'meleePower',name:'근접 숙련',description:'붙어 있는 적을 물리 공격하면 피해가 param% 늘어난다.',hooks:{onAttack(ctx,_s,param){if(ctx.kind==='physical'&&ctx.distance===1)ctx.attackMul*=1+param/100;}}});
