/**
 * 병종 전법 — 계열마다 하나씩, 조건이 맞을 때만 피해를 조금 더(또는 덜) 받게 하는 병종 고유 특성.
 *
 * 기본 공격은 늘 보통 위력이다. 경기병이 멀리서 달려와 들이받거나, 궁병이 온전한 적에게 첫 화살을
 * 날릴 때처럼 그 병종다운 싸움을 했을 때만 배율이 붙는다(+10~20%). 상성표(formulas.ts)와 별개로,
 * 같은 병종이라도 어떻게 쓰느냐에 따라 위력이 달라지게 하는 장치다.
 * 진화한 병종은 계열의 전법을 그대로 물려받는다.
 */
import type { Unit } from "./types.ts";
import type { BattleMap } from "./grid.ts";
import { familyOf } from "./classes.ts";
import { engageDistance } from "./reach.ts";

export interface ClassTactic {
  /** 전법 이름 (발동하면 전장에 외친다) */
  readonly name: string;
  readonly description: string;
}

/** 공격 쪽 전법: 조건이 맞으면 피해 배율을 돌려준다. */
interface OffenseRule extends ClassTactic { readonly mul: number; when(a: Unit, d: Unit, map: BattleMap, counter: boolean): boolean }
/** 방어 쪽 전법: 조건이 맞으면 받는 피해 배율을 돌려준다. */
interface DefenseRule extends ClassTactic { readonly mul: number; when(d: Unit, a: Unit, map: BattleMap): boolean }

const moved = (u: Unit) => u.movedSteps ?? 0;
const ROUGH = new Set(["forest", "mountain", "hill"]);

const OFFENSE: Partial<Record<string, OffenseRule>> = {
  cavalry: { name: "돌격", description: "이번 차례에 3칸 이상 달려와 근접 공격하면 피해 20% 증가", mul: 1.2,
    when: (a, d, _m, counter) => !counter && moved(a) >= 3 && engageDistance(a.pos, d.pos) === 1 },
  heavyCav: { name: "돌진", description: "이번 차례에 2칸 이상 밀고 들어와 근접 공격하면 피해 15% 증가", mul: 1.15,
    when: (a, d, _m, counter) => !counter && moved(a) >= 2 && engageDistance(a.pos, d.pos) === 1 },
  horseArcher: { name: "기사", description: "말을 달린 뒤 쏘면 피해 10% 증가", mul: 1.1,
    when: (a, _d, _m, counter) => !counter && moved(a) >= 1 },
  spearman: { name: "창벽", description: "반격할 때 피해 15% 증가", mul: 1.15,
    when: (_a, _d, _m, counter) => counter },
  archer: { name: "선제 사격", description: "체력이 온전한 적을 쏘면 피해 15% 증가", mul: 1.15,
    when: (_a, d, _m, counter) => !counter && d.hp >= d.stats.maxHp },
  crossbow: { name: "정조준", description: "움직이지 않고 쏘면 피해 10% 증가", mul: 1.1,
    when: (a, _d, _m, counter) => !counter && !a.movedThisTurn },
  bandit: { name: "매복", description: "숲·구릉·산지에서 공격하면 피해 15% 증가", mul: 1.15,
    when: (a, _d, map) => ROUGH.has(map.tileAt(a.pos).terrain) },
  monk: { name: "권법", description: "근접 반격할 때 피해 15% 증가", mul: 1.15,
    when: (a, d, _m, counter) => counter && engageDistance(a.pos, d.pos) === 1 },
};
const DEFENSE: Partial<Record<string, DefenseRule>> = {
  infantry: { name: "방진", description: "직전 차례에 자리를 지켰으면 받는 물리 피해 10% 감소", mul: 0.9,
    when: (d) => !d.movedThisTurn },
};

/** 이 병종의 전법 설명(도감·장수 정보용). 전법이 없는 병종(책사·공성 등)은 빈 배열. */
export function classTactics(unitClass: Unit["unitClass"]): ClassTactic[] {
  const f = familyOf(unitClass), out: ClassTactic[] = [];
  const o = OFFENSE[f], d = DEFENSE[f];
  if (o) out.push({ name: o.name, description: o.description });
  if (d) out.push({ name: d.name, description: d.description });
  return out;
}

/**
 * 물리 공격 한 번에 걸리는 전법 배율. 공격자의 공격 전법과 방어자의 방어 전법을 함께 본다.
 * name은 공격 쪽 전법이 발동했을 때만 채운다(전장에 외칠 이름).
 */
export function tacticMultiplier(attacker: Unit, defender: Unit, map: BattleMap, counter: boolean): { mul: number; name?: string } {
  let mul = 1, name: string | undefined;
  const o = attacker.classTactics ? OFFENSE[familyOf(attacker.unitClass)] : undefined;
  if (o && o.when(attacker, defender, map, counter)) { mul *= o.mul; name = o.name; }
  const d = defender.classTactics ? DEFENSE[familyOf(defender.unitClass)] : undefined;
  if (d && d.when(defender, attacker, map)) mul *= d.mul;
  return name ? { mul, name } : { mul };
}
