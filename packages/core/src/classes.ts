/**
 * 병종 계통 — 확장 병종과 진화.
 *
 * 새 병종은 기존 병종 하나를 '계열(family)'로 물려받는다. 이동 비용·지형 상성·
 * 병종 상성·그림은 계열의 것을 쓰고, 능력치 계수·사거리·고유 특성만 따로 둔다.
 * 그래서 병종을 늘려도 지형표와 상성표를 병종 수만큼 다시 쓰지 않는다.
 *
 * 진화: 모든 계통은 기본 → 정예 → 최정예 → 전설의 네 단계로 고정한다.
 */
import type { UnitClass } from "./types.ts";
import { chartClasses } from "./chart-classes.ts";

/** 1 = 기본, 2 = 정예, 3 = 최정예, 4 = 전설. */
export type ClassTier = 1 | 2 | 3 | 4;

export interface ClassProfile {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  intellect: number;
  spirit: number;
  agility: number;
  movement: number;
  range: readonly [number, number];
  canUseStrategy: boolean;
}

export interface ClassVariant {
  /** 이동·상성·그림을 물려받는 기존 병종 */
  family: UnitClass;
  /** 1 = 기본, 2 = 정예, 3 = 최정예, 4 = 전설 */
  tier: ClassTier;
  profile: ClassProfile;
  /** 이 병종이 되면 붙는 고유 특성 (id → 매개변수) */
  traits?: Record<string, number>;
  /** 진화로 개화하는 스킬: 이름과 설명(특성은 traits가 실제로 건다). 3단계는 2단계 스킬을 이어받고 강화한다. */
  bloom?: { name: string; description: string };
}

const p = (
  hp: number, mp: number, attack: number, defense: number, intellect: number, spirit: number,
  agility: number, movement: number, range: readonly [number, number], canUseStrategy = false,
): ClassProfile => ({ hp, mp, attack, defense, intellect, spirit, agility, movement, range, canUseStrategy });

/** 확장 병종. 기존 20병종은 여기에 없다(자기 자신이 계열). */
export const VARIANTS: Partial<Record<UnitClass, ClassVariant>> = {
  // 보병 계통 — 버티는 전열
  shieldGuard: { family: "infantry", tier: 2, profile: p(1.25, 0.43, 1.06, 1.35, 0.64, 1.0, 0.95, 5, [1, 1]), traits: { guardian: 0 },
    bloom: { name: "방패 진형", description: "곁의 아군이 받을 피해를 대신 받는다" } },
  royalGuard: { family: "infantry", tier: 3, profile: p(1.4, 0.46, 1.15, 1.5, 0.68, 1.1, 1.01, 5, [1, 1]), traits: { guardian: 0, lastStand: 25, veteran: 15 },
    bloom: { name: "금위의 맹세", description: "호위에 더해, 체력이 낮을수록 공격력 상승(최대 25%) · 체력 절반 이하에서 받는 피해 15% 감소" } },
  // 창병 계통 — 기병 사냥
  pikeman: { family: "spearman", tier: 2, profile: p(1.15, 0.43, 1.2, 1.12, 0.64, 0.96, 0.96, 5, [1, 1]), traits: { counterBoost: 20 },
    bloom: { name: "장창 거치", description: "반격 위력 20% 증가" } },
  halberdier: { family: "spearman", tier: 3, profile: p(1.25, 0.46, 1.35, 1.2, 0.68, 1.02, 1.02, 5, [1, 1]), traits: { counterBoost: 25, unlimitedCounter: 0 },
    bloom: { name: "극진", description: "반격 위력 25% 증가 · 반격 횟수 제한 없음" } },
  // 경기병 계통 — 돌파
  lancer: { family: "cavalry", tier: 2, profile: p(1.1, 0.43, 1.3, 0.96, 0.64, 0.85, 1.28, 7, [1, 1]), traits: { penetrate: 15 },
    bloom: { name: "돌격 창", description: "적 방어 15% 무시" } },
  tigerRider: { family: "cavalry", tier: 3, profile: p(1.25, 0.46, 1.45, 1.1, 0.68, 0.9, 1.36, 7, [1, 1]), traits: { penetrate: 20, critical: 15 },
    bloom: { name: "호표 돌격", description: "적 방어 20% 무시 · 회심 15%" } },
  // 중기병 계통
  ironCav: { family: "heavyCav", tier: 2, profile: p(1.45, 0.43, 1.35, 1.35, 0.64, 0.85, 0.96, 6, [1, 1]), traits: { physicalDamageReduction: 10, counterBoost: 15 },
    bloom: { name: "철갑 돌진", description: "물리 피해 10% 감소 · 반격 위력 15% 증가" } },
  // 궁병 계통 — 사거리
  longbow: { family: "archer", tier: 2, profile: p(0.9, 0.53, 1.08, 0.85, 0.85, 0.96, 1.17, 5, [2, 3]), traits: { critical: 10 },
    bloom: { name: "정조준", description: "사거리 2~3 · 회심 10%" } },
  sharpshooter: { family: "archer", tier: 3, profile: p(0.96, 0.56, 1.22, 0.9, 0.9, 1.02, 1.25, 5, [2, 3]), traits: { critical: 15, penetrate: 20 },
    bloom: { name: "백보천양", description: "회심 15% · 적 방어 20% 무시" } },
  // 노병 계통 — 관통
  repeater: { family: "crossbow", tier: 2, profile: p(0.96, 0.53, 1.18, 0.9, 0.85, 0.96, 0.96, 4, [2, 3]), traits: { attackBoost: 4 },
    bloom: { name: "연발", description: "공격력 +4" } },
  greatBow: { family: "crossbow", tier: 3, profile: p(1.02, 0.56, 1.32, 0.96, 0.9, 1.02, 1.02, 4, [2, 3]), traits: { attackBoost: 6, penetrate: 22 },
    bloom: { name: "대황노", description: "공격 +6% · 적 방어 30% 무시" } },
  // 책사 계통 — 지력
  tactician: { family: "strategist", tier: 2, profile: p(0.8, 1.45, 0.64, 0.75, 1.38, 1.3, 1.06, 5, [1, 1], true), traits: { strategyPower: 8 },
    bloom: { name: "군략", description: "책략 피해 8% 증가" } },
  mastermind: { family: "strategist", tier: 3, profile: p(0.85, 1.6, 0.68, 0.8, 1.48, 1.4, 1.13, 5, [1, 1], true), traits: { strategyPower: 12, strategyEvasion: 15 },
    bloom: { name: "신산귀모", description: "책략 피해 12% 증가 · 적의 책략을 15% 확률로 흘려 보낸다" } },
  // 풍수사 계통 — 정신
  sage: { family: "fengshui", tier: 2, profile: p(0.9, 1.6, 0.64, 0.8, 1.3, 1.45, 1.06, 5, [1, 1], true), traits: { healPower: 20, strategyDamageReduction: 10 },
    bloom: { name: "선도", description: "회복량 20% 증가 · 책략 피해 10% 감소" } },
  immortal: { family: "fengshui", tier: 3, profile: p(1.0, 1.85, 0.68, 0.85, 1.4, 1.6, 1.13, 5, [1, 1], true), traits: { healPower: 35, strategyDamageReduction: 20 },
    bloom: { name: "선인 강림", description: "회복량 35% 증가 · 책략 피해 20% 감소" } },
  // 궁기병 계통 — 기동 사격
  nomad: { family: "horseArcher", tier: 2, profile: p(1.08, 0.43, 1.02, 0.96, 0.64, 0.85, 1.3, 7, [2, 3]), traits: { critical: 10 },
    bloom: { name: "기사", description: "이동 7 · 회심 10%" } },
  whiteHorse: { family: "horseArcher", tier: 3, profile: p(1.18, 0.46, 1.15, 1.02, 0.68, 0.9, 1.4, 7, [2, 3]), traits: { critical: 15, penetrate: 15 },
    bloom: { name: "백마의종", description: "회심 15% · 적 방어 15% 무시" } },
  // 새 기본 병종과 그 정예
  slinger: { family: "archer", tier: 1, profile: p(0.85, 0.4, 0.9, 0.8, 0.6, 0.85, 1.05, 5, [1, 2]) },
  hurler: { family: "archer", tier: 2, profile: p(0.95, 0.43, 1.08, 0.88, 0.64, 0.9, 1.12, 5, [1, 3]), traits: { penetrate: 15 },
    bloom: { name: "벽력", description: "사거리 1~3 · 적 방어 15% 무시" } },
  assassin: { family: "bandit", tier: 1, profile: p(0.8, 0.4, 1.25, 0.7, 0.7, 0.8, 1.45, 6, [1, 1]), traits: { critical: 15 } },
  phantom: { family: "bandit", tier: 2, profile: p(0.9, 0.43, 1.42, 0.78, 0.75, 0.85, 1.6, 6, [1, 1]), traits: { critical: 22, lifesteal: 10 },
    bloom: { name: "그림자 일격", description: "회심 30% · 입힌 피해의 15%만큼 체력 회복" } },
  rattan: { family: "infantry", tier: 1, profile: p(1.15, 0.4, 1.0, 1.1, 0.5, 0.8, 0.85, 5, [1, 1]), traits: { physicalDamageReduction: 20, fireWeakness: 60 } },
  rattanElite: { family: "infantry", tier: 2, profile: p(1.3, 0.43, 1.12, 1.25, 0.53, 0.85, 0.9, 5, [1, 1]), traits: { physicalDamageReduction: 26, fireWeakness: 60, counterBoost: 10 },
    bloom: { name: "정예 등갑", description: "물리 피해 35% 감소 · 반격 위력 10% 증가 (여전히 화공에 약함)" } },
  elephant: { family: "heavyCav", tier: 1, profile: p(1.7, 0.3, 1.25, 1.2, 0.4, 0.8, 0.6, 4, [1, 1]) },
  warElephant: { family: "heavyCav", tier: 2, profile: p(2.0, 0.32, 1.4, 1.35, 0.43, 0.85, 0.64, 4, [1, 1]), traits: { physicalDamageReduction: 10, counterBoost: 20 },
    bloom: { name: "코끼리 돌진", description: "물리 피해 10% 감소 · 반격 위력 20% 증가" } },
  // 특수 병종의 정예
  warlock: { family: "shaman", tier: 2, profile: p(0.85, 1.7, 0.65, 0.68, 1.45, 1.3, 1.06, 5, [1, 1], true), traits: { strategyEvasion: 10, strategyPower: 8 },
    bloom: { name: "요술", description: "책략 피해 8% 증가 · 적의 책략을 10% 확률로 흘린다" } },
  priestess: { family: "maiden", tier: 2, profile: p(0.9, 1.6, 0.65, 0.85, 1.12, 1.68, 1.06, 5, [1, 1], true), traits: { strategyDamageReduction: 15, healPower: 20 },
    bloom: { name: "신녀의 가호", description: "회복량 20% 증가 · 책략 피해 15% 감소" } },
  stormSage: { family: "taoist", tier: 2, profile: p(0.85, 1.4, 0.65, 0.78, 1.48, 1.3, 1.38, 5, [1, 1], true), traits: { strategyPower: 12 },
    bloom: { name: "뇌공", description: "책략 피해 12% 증가" } },
  warriorMonk: { family: "monk", tier: 2, profile: p(1.25, 0.45, 1.3, 1.22, 0.64, 1.0, 1.38, 5, [1, 1], true), traits: { critical: 10, veteran: 15 },
    bloom: { name: "금강불괴", description: "회심 10% · 체력 절반 이하에서 받는 피해 15% 감소" } },
  outlaw: { family: "bandit", tier: 2, profile: p(1.25, 0.43, 1.38, 0.9, 0.64, 0.96, 1.0, 5, [1, 1]), traits: { critical: 15, lastStand: 20 },
    bloom: { name: "녹림호걸", description: "회심 15% · 체력이 낮을수록 공격력 상승(최대 20%)" } },
  // 2단계에서 끝나던 계통의 3단계 — 2단계 스킬을 이어받아 강화한다
  ironPagoda: { family: "heavyCav", tier: 3, profile: p(1.6, 0.46, 1.48, 1.5, 0.68, 0.9, 1.02, 6, [1, 1]), traits: { physicalDamageReduction: 15, counterBoost: 20, penetrate: 15 },
    bloom: { name: "철부도", description: "물리 피해 15% 감소 · 반격 위력 20% 증가 · 적 방어 15% 무시" } },
  elephantKing: { family: "heavyCav", tier: 3, profile: p(2.2, 0.34, 1.52, 1.48, 0.46, 0.9, 0.68, 4, [1, 1]), traits: { physicalDamageReduction: 15, counterBoost: 25, physicalReflect: 10 },
    bloom: { name: "상왕의 진격", description: "물리 피해 15% 감소 · 반격 위력 25% 증가 · 받은 물리 피해의 10%를 되돌린다" } },
  boulderCorps: { family: "archer", tier: 3, profile: p(1.02, 0.46, 1.2, 0.94, 0.68, 0.96, 1.2, 5, [1, 3]), traits: { penetrate: 25, critical: 10 },
    bloom: { name: "천균 낙석", description: "사거리 1~3 · 적 방어 25% 무시 · 회심 10%" } },
  wraith: { family: "bandit", tier: 3, profile: p(0.96, 0.46, 1.55, 0.83, 0.8, 0.9, 1.72, 6, [1, 1]), traits: { critical: 25, lifesteal: 12, penetrate: 12 },
    bloom: { name: "귀영 살수", description: "회심 35% · 입힌 피해의 20%만큼 체력 회복 · 적 방어 15% 무시" } },
  wuguoRattan: { family: "infantry", tier: 3, profile: p(1.42, 0.46, 1.2, 1.36, 0.56, 0.9, 0.95, 5, [1, 1]), traits: { physicalDamageReduction: 30, fireWeakness: 50, counterBoost: 15 },
    bloom: { name: "오과국 등갑", description: "물리 피해 40% 감소 · 반격 위력 15% 증가 · 화공 취약이 50%로 줄어든다" } },
  greenwoodKing: { family: "bandit", tier: 3, profile: p(1.36, 0.46, 1.5, 0.96, 0.68, 1.02, 1.06, 5, [1, 1]), traits: { critical: 18, lastStand: 22, lifesteal: 8 },
    bloom: { name: "녹림대왕", description: "회심 20% · 체력이 낮을수록 공격력 상승(최대 25%) · 입힌 피해의 10%만큼 체력 회복" } },
  arhat: { family: "monk", tier: 3, profile: p(1.36, 0.48, 1.4, 1.32, 0.68, 1.08, 1.46, 5, [1, 1], true), traits: { critical: 15, veteran: 20, strategyDamageReduction: 10 },
    bloom: { name: "나한 금신", description: "회심 15% · 체력 절반 이하에서 받는 피해 20% 감소 · 책략 피해 10% 감소" } },
  demonKing: { family: "shaman", tier: 3, profile: p(0.9, 1.85, 0.69, 0.72, 1.55, 1.38, 1.12, 5, [1, 1], true), traits: { strategyEvasion: 15, strategyPower: 12, strategyReflect: 10 },
    bloom: { name: "요왕의 저주", description: "책략 피해 12% 증가 · 적의 책략을 15% 확률로 흘린다 · 받은 책략 피해의 10%를 되돌린다" } },
  celestial: { family: "maiden", tier: 3, profile: p(0.96, 1.75, 0.69, 0.9, 1.2, 1.82, 1.12, 5, [1, 1], true), traits: { strategyDamageReduction: 20, healPower: 30, strategyEvasion: 10 },
    bloom: { name: "선녀의 비호", description: "회복량 30% 증가 · 책략 피해 20% 감소 · 적의 책략을 10% 확률로 흘린다" } },
  thunderGod: { family: "taoist", tier: 3, profile: p(0.9, 1.52, 0.69, 0.83, 1.6, 1.38, 1.46, 5, [1, 1], true), traits: { strategyPower: 15, strategyEvasion: 10 },
    bloom: { name: "뇌신 강림", description: "책략 피해 18% 증가 · 적의 책략을 10% 확률로 흘린다" } },
  // ── 명부대(이름난 부대) 계통: 정사·연의에 이름이 남은 부대를 병종으로 ──
  // 서량기병 → 비웅군(동탁): 거친 서쪽 기병
  xiliang: { family: "cavalry", tier: 1, profile: p(1.05, 0.4, 1.15, 0.9, 0.55, 0.8, 1.2, 7, [1, 1]), traits: { attackBoost: 3 } },
  feixiong: { family: "cavalry", tier: 2, profile: p(1.2, 0.43, 1.35, 1.0, 0.58, 0.85, 1.26, 7, [1, 1]), traits: { attackBoost: 5, lifesteal: 10, lastStand: 15 },
    bloom: { name: "비웅군", description: "동탁의 서량 정예 · 공격력 +5 · 입힌 피해의 10% 회복 · 체력이 낮을수록 공격력 상승" } },
  // ── 2단계에서 끝나던 명부대 계통의 3단계(v41): 모든 계통은 3단 진화
  liangzhouIron: { family: "cavalry", tier: 3, profile: p(1.32, 0.46, 1.48, 1.1, 0.62, 0.9, 1.33, 7, [1, 1]), traits: { attackBoost: 7, lifesteal: 8, lastStand: 20, physicalDamageReduction: 8 },
    bloom: { name: "서량철기", description: "공격력 +7 · 입힌 피해의 12% 회복 · 체력이 낮을수록 공격력 상승 · 물리 피해 8% 감소" } },
  // ── 공성·수군 계통도 3단 진화(v41)
  ironRam: { family: "ram", tier: 2, profile: p(1.75, 0.22, 0.98, 1.6, 0.42, 0.86, 0.53, 3, [1, 1]), traits: { physicalDamageReduction: 15 },
    bloom: { name: "철충차", description: "쇠를 씌운 충차 · 물리 피해 15% 감소" } },
  cloudRam: { family: "ram", tier: 3, profile: p(2.0, 0.24, 1.12, 1.8, 0.45, 0.92, 0.56, 3, [1, 1]), traits: { physicalDamageReduction: 22, physicalReflect: 10 },
    bloom: { name: "파성충차", description: "성문을 부수는 큰 망치 수레 · 물리 피해 22% 감소 · 받은 물리 피해의 10%를 되돌린다" } },
  mengchong: { family: "navy", tier: 2, profile: p(1.12, 0.53, 1.15, 1.05, 0.84, 0.96, 1.08, 6, [1, 2]), traits: { chargePower: 12 },
    bloom: { name: "몽충", description: "가죽을 씌운 돌격선 · 움직인 뒤 물리 공격 +12%" } },
  louchuan: { family: "navy", tier: 3, profile: p(1.32, 0.56, 1.3, 1.2, 0.9, 1.02, 1.14, 6, [1, 3]), traits: { chargePower: 15, physicalDamageReduction: 12, penetrate: 10 },
    bloom: { name: "누선", description: "여러 층 망루를 올린 큰 배 · 사거리 1~3 · 물리 피해 12% 감소 · 적 방어 10% 무시" } },
};

/** 진화 계통: 병종 → [다음 병종, 진화 레벨] */
export const EVOLUTION: Partial<Record<UnitClass, readonly [UnitClass, number]>> = {
  infantry: ["shieldGuard", 8], shieldGuard: ["royalGuard", 16],
  spearman: ["pikeman", 8], pikeman: ["halberdier", 16],
  cavalry: ["lancer", 8], lancer: ["tigerRider", 16],
  heavyCav: ["ironCav", 12], ironCav: ["ironPagoda", 20],
  archer: ["longbow", 8], longbow: ["sharpshooter", 16],
  crossbow: ["repeater", 8], repeater: ["greatBow", 16],
  strategist: ["tactician", 8], tactician: ["mastermind", 16],
  fengshui: ["sage", 8], sage: ["immortal", 16],
  horseArcher: ["nomad", 10], nomad: ["whiteHorse", 18],
  slinger: ["hurler", 10], hurler: ["boulderCorps", 18],
  assassin: ["phantom", 12], phantom: ["wraith", 20],
  rattan: ["rattanElite", 12], rattanElite: ["wuguoRattan", 20],
  elephant: ["warElephant", 12], warElephant: ["elephantKing", 22],
  shaman: ["warlock", 12], warlock: ["demonKing", 20],
  maiden: ["priestess", 12], priestess: ["celestial", 20],
  taoist: ["stormSage", 12], stormSage: ["thunderGod", 20],
  monk: ["warriorMonk", 10], warriorMonk: ["arhat", 18],
  bandit: ["outlaw", 10], outlaw: ["greenwoodKing", 18],
  xiliang: ["feixiong", 12], feixiong: ["liangzhouIron", 20],
  ram: ["ironRam", 10], ironRam: ["cloudRam", 18], navy: ["mengchong", 10], mengchong: ["louchuan", 18],
};

// 병종 차트로 늘린 계통·4단계·모병 특수 병과(chart-classes.ts)를 합친다.
{
  const chart = chartClasses(VARIANTS);
  Object.assign(VARIANTS, chart.variants);
  Object.assign(EVOLUTION, chart.evolution);
}

// 신규 계통은 같은 무기군과 같은 나이대의 정체성을 유지하고 장비만 발전한다.
Object.assign(VARIANTS, {
  // 폐기/단일화된 계통의 기존 저장 ID는 그림과 저장 호환을 위해 등록만 유지한다.
  meteorSlinger: { family: "archer", tier: 4, profile: p(1.08, 0.5, 1.3, 1.0, 0.72, 1.0, 1.26, 5, [1, 3]) },
  heavenXiliang: { family: "cavalry", tier: 4, profile: p(1.42, 0.5, 1.58, 1.18, 0.66, 0.96, 1.4, 7, [1, 1]) },
  divineGaema: { family: "heavyCav", tier: 4, profile: p(1.55, 0.5, 1.5, 1.55, 0.68, 0.96, 1.08, 6, [1, 1]) },
  sapper: { family: "engineer", tier: 2, profile: p(0.9, 0.34, 0.62, 0.9, 0.78, 0.98, 0.86, 5, [1, 1]) },
  masterBuilder: { family: "engineer", tier: 3, profile: p(1.0, 0.38, 0.72, 1.0, 0.88, 1.08, 0.92, 5, [1, 1]) },
  divineEngineer: { family: "engineer", tier: 4, profile: p(1.1, 0.42, 0.82, 1.1, 0.98, 1.18, 0.98, 5, [1, 1]) },
  heavenPriestess: { family: "maiden", tier: 4, profile: p(1.05, 1.95, 0.74, 0.98, 1.3, 2.0, 1.18, 5, [1, 1], true), traits: { healPower: 40, strategyDamageReduction: 20, strategyEvasion: 12 }, bloom: { name: "천부의 가호", description: "부적술로 회복과 책략 방호를 완성한다" } },
  yellowTurban: { family: "infantry", tier: 1, profile: p(1.0, 0.4, 1.0, 0.9, 0.55, 0.8, 1.0, 5, [1, 1]) },
  yellowTurbanVeteran: { family: "infantry", tier: 2, profile: p(1.1, 0.43, 1.12, 1.0, 0.58, 0.86, 1.06, 5, [1, 1]), traits: { lastStand: 10 }, bloom: { name: "황건의 결의", description: "궁지에서 더욱 끈질기게 싸운다" } },
  yellowTurbanCaptain: { family: "infantry", tier: 3, profile: p(1.22, 0.46, 1.26, 1.12, 0.62, 0.92, 1.12, 5, [1, 1]), traits: { lastStand: 18, critical: 10 }, bloom: { name: "황천의 곡도", description: "곡도 회심과 배수진을 익힌다" } },
  yellowTurbanMarshal: { family: "infantry", tier: 4, profile: p(1.36, 0.5, 1.42, 1.25, 0.68, 1.0, 1.18, 5, [1, 1]), traits: { lastStand: 25, critical: 15 }, bloom: { name: "천공의 기치", description: "황건의 곡도술과 결의를 완성한다" } },
  mountedStrategist: { family: "strategist", tier: 1, profile: p(0.82, 1.25, 0.65, 0.74, 1.22, 1.12, 1.15, 7, [1, 1], true) },
  mountedTactician: { family: "strategist", tier: 2, profile: p(0.88, 1.42, 0.7, 0.8, 1.36, 1.24, 1.22, 7, [1, 1], true), traits: { strategyPower: 8 }, bloom: { name: "기동 군략", description: "말 위에서 책략 위력을 높인다" } },
  mountedMastermind: { family: "strategist", tier: 3, profile: p(0.95, 1.6, 0.76, 0.87, 1.5, 1.36, 1.3, 7, [1, 1], true), traits: { strategyPower: 12, strategyEvasion: 10 }, bloom: { name: "주마간산", description: "이동 중에도 빈틈없이 책략을 잇는다" } },
  mountedSage: { family: "strategist", tier: 4, profile: p(1.02, 1.8, 0.82, 0.95, 1.66, 1.5, 1.38, 7, [1, 1], true), traits: { strategyPower: 18, strategyEvasion: 15 }, bloom: { name: "신산기략", description: "기마 책략과 부채술을 완성한다" } },
  pirate: { family: "navy", tier: 1, profile: p(1.0, 0.4, 1.08, 0.86, 0.58, 0.8, 1.18, 6, [1, 1]) },
  pirateRaider: { family: "navy", tier: 2, profile: p(1.1, 0.43, 1.22, 0.95, 0.62, 0.86, 1.26, 6, [1, 1]), traits: { critical: 10 }, bloom: { name: "선상 습격", description: "곡도 회심 공격을 익힌다" } },
  pirateCaptain: { family: "navy", tier: 3, profile: p(1.22, 0.46, 1.36, 1.05, 0.68, 0.92, 1.34, 6, [1, 1]), traits: { critical: 15, lifesteal: 8 }, bloom: { name: "약탈의 곡도", description: "회심과 흡혈로 난전을 지배한다" } },
  pirateAdmiral: { family: "navy", tier: 4, profile: p(1.36, 0.5, 1.52, 1.17, 0.74, 1.0, 1.42, 6, [1, 1]), traits: { critical: 20, lifesteal: 12 }, bloom: { name: "해왕의 칼날", description: "해적의 곡도술을 완성한다" } },
} satisfies Partial<Record<UnitClass, ClassVariant>>);

/**
 * 도감과 실제 진화에 쓰는 최종 계통표. 저장 호환성을 위해 기존 병종 id는 지우지 않고
 * 짧게 끝나던 계통의 상위 단계로 재배치한다. 검객계는 검술가 단계를 빼 네 단계로 줄였다.
 */
export const FOUR_STAGE_LINES: readonly (readonly [UnitClass, UnitClass, UnitClass, UnitClass])[] = [
  ["infantry", "shieldGuard", "royalGuard", "ironInfantry"],
  ["spearman", "pikeman", "halberdier", "divineSpear"],
  ["cavalry", "lancer", "tigerRider", "northRider"],
  ["heavyCav", "ironCav", "ironPagoda", "wujiHeavyCav"],
  ["archer", "longbow", "sharpshooter", "ytArcher"],
  ["crossbow", "repeater", "greatBow", "bashuRepeater"],
  ["strategist", "tactician", "mastermind", "divineStrategist"],
  ["fengshui", "sage", "immortal", "palanquin"],
  ["horseArcher", "nomad", "whiteHorse", "fanSage"],
  ["assassin", "phantom", "wraith", "flyingBlade"],
  ["rattan", "rattanElite", "wuguoRattan", "northFoot"],
  ["elephant", "warElephant", "elephantKing", "baguaChariot"],
  ["shaman", "warlock", "demonKing", "wheelSage"],
  ["maiden", "priestess", "celestial", "heavenPriestess"],
  ["taoist", "stormSage", "thunderGod", "heavenTaoist"],
  ["monk", "warriorMonk", "arhat", "fistSaint"],
  ["yellowTurban", "yellowTurbanVeteran", "yellowTurbanCaptain", "yellowTurbanMarshal"],
  ["mountedStrategist", "mountedTactician", "mountedMastermind", "mountedSage"],
  ["pirate", "pirateRaider", "pirateCaptain", "pirateAdmiral"],
  ["bandit", "outlaw", "greenwoodKing", "chieftain"],
  ["swordsman", "knightErrant", "swordMaster", "swordSaint"],
  ["lord", "hegemon", "sovereign", "sonOfHeaven"],
  ["commander", "grandCommander", "marshal", "heavenCommander"],
  ["dancer", "songstress", "beauty", "heavenDancer"],
  ["mountainCav", "scoutCav", "raidCav", "pegasusCav"],
  ["valiantCav", "dragonCav", "stormCav", "heavenCav"],
  ["lightChariot", "assaultChariot", "heavyChariot", "divineChariot"],
  ["nanmanRider", "nanmanBeast", "nanmanFoot", "ytBrawler"],
  ["halberdCav", "heavyHalberdCav", "ytSpear", "swordArtist"],
  ["catapult", "thunderCart", "greatTrebuchet", "divineCatapult"],
];

const reassigned = new Set<UnitClass>([
  "northRider", "ytArcher", "bashuRepeater", "palanquin", "fanSage",
  "flyingBlade", "northFoot", "baguaChariot", "wheelSage", "yellowTurban",
  "nanmanFoot", "ytBrawler", "ytSpear", "swordArtist",
]);
const rootProfiles: Partial<Record<UnitClass, ClassProfile>> = {
  engineer: p(0.80, 0.3, 0.50, 0.80, 0.7, 0.9, 0.8, 5, [1, 1]),
  catapult: p(0.95, 0.3, 1.10, 0.75, 0.6, 0.8, 0.6, 3, [2, 4]),
};
const improve = (b: ClassProfile, m = 1.1): ClassProfile => p(
  b.hp * m, b.mp * m, b.attack * m, b.defense * m, b.intellect * m,
  b.spirit * m, b.agility * m, b.movement, b.range, b.canUseStrategy,
);

// chart-classes의 임시 계통을 버리고, 위 최종 계통표만 실제 진화표로 노출한다.
const originalEvolution = { ...EVOLUTION };
for (const key of Object.keys(EVOLUTION) as UnitClass[]) delete EVOLUTION[key];
/** 이 병종들은 완성형 단일 병종이며 레벨업으로 외형/병종이 바뀌지 않는다. */
export const SINGLE_STAGE_CLASSES: ReadonlySet<UnitClass> = new Set([
  "crownPrince", "royalPrince", "emperor", "heavenEmperor", "civilian",
  "xiliang", "ram", "navy", "siegeTower", "transport", "gaemaWarrior", "engineer",
]);
for (const line of FOUR_STAGE_LINES) {
  const root = line[0];
  // 투석병은 플레이 계통에서 폐기하고, 지정된 완성형 병종은 진화 연결을 만들지 않는다.
  if (SINGLE_STAGE_CLASSES.has(root)) continue;
  const family = VARIANTS[root]?.family ?? root;
  const fallbackLevels = [8, 16, 30] as const;
  const candidateLevels = line.slice(0, 3).map((id, i) => originalEvolution[id]?.[1] ?? fallbackLevels[i]!);
  const evolutionLevels = candidateLevels.every((level, i) => i === 0 || level > candidateLevels[i - 1]!)
    ? candidateLevels : [...fallbackLevels];
  line.forEach((id, index) => {
    if (index > 0) {
      const previous = line[index - 1]!;
      const previousVariant = VARIANTS[previous];
      const current = VARIANTS[id];
      if (!current || reassigned.has(id)) {
        const previousProfile = previousVariant?.profile ?? rootProfiles[previous];
        if (!previousProfile) throw new Error(`4단계 병종의 앞 단계 정보가 없다: ${previous}`);
        VARIANTS[id] = {
          family,
          tier: (index + 1) as ClassTier,
          profile: improve(previousProfile),
          traits: { ...(previousVariant?.traits ?? {}), attackBoost: index + 3 },
          bloom: { name: "전설의 경지", description: "앞 단계의 무기와 전법을 완성한 전설 병종" },
        };
      } else {
        current.family = family;
        current.tier = (index + 1) as ClassTier;
      }
      EVOLUTION[previous] = [id, evolutionLevels[index - 1]!];
    } else if (VARIANTS[id]) {
      VARIANTS[id]!.tier = 1;
    }
  });
}
// fanSage는 저장 호환용 내부 이름일 뿐, 최종 계통은 백우선 책사가 아니라 기마궁병의 전설 단계다.
// 재배치 과정에서 붙는 일반 개화명을 활 계통의 고유 개화로 확정한다.
if (VARIANTS.fanSage) VARIANTS.fanSage.bloom = {
  name: "천궁",
  description: "말 위에서 같은 활을 끝까지 다듬어 백발백중의 경지에 오른다",
};

/** 이동·상성·그림의 기준이 되는 병종. 기존 병종은 자기 자신. */
export function familyOf(unitClass: UnitClass): UnitClass {
  return VARIANTS[unitClass]?.family ?? unitClass;
}

/** 1 = 기본 병종, 2·3 = 진화 단계. */
export function tierOf(unitClass: UnitClass): ClassTier {
  if (SINGLE_STAGE_CLASSES.has(unitClass)) return 1;
  return VARIANTS[unitClass]?.tier ?? 1;
}

/** 이 레벨에서 도달하는 최종 병종(여러 단계를 한 번에 건너뛸 수 있다). */
export function evolvedClass(unitClass: UnitClass, level: number): UnitClass {
  let current = unitClass;
  for (let guard = 0; guard < 6; guard++) {
    const next = EVOLUTION[current];
    if (!next || level < next[1]) break;
    current = next[0];
  }
  return current;
}

/** 다음 진화 병종과 필요 레벨. 마지막 단계면 undefined. */
export function nextEvolution(unitClass: UnitClass): { to: UnitClass; level: number } | undefined {
  const next = EVOLUTION[unitClass];
  return next ? { to: next[0], level: next[1] } : undefined;
}

/**
 * 지운 병종 → 이어받는 병종. 예전 저장(원정 부대·신장수·시나리오 장수)에 남은 병종을 읽을 때 바꾼다.
 * 의술사·투창병·도부수·산악병·청주병·극사·방패노병·고취수·기마책사·강동자제·낭중기 계통과
 * 공병·포차의 2·3단계(축성병·공성 장인·벽력거·천균거)는 병종 차트 계통과 겹쳐 지웠다.
 */
export const RETIRED_CLASSES: Readonly<Record<string, UnitClass>> = {
  slinger: "archer", hurler: "longbow", boulderCorps: "sharpshooter", meteorSlinger: "ytArcher",
  physician: "fengshui", divineDoctor: "sage", medicineSaint: "immortal",
  javelin: "spearman", eliteJavelin: "pikeman", flyingSpear: "halberdier",
  axeman: "swordsman", greatBlade: "knightErrant", xianzhen: "swordArtist",
  mountaineer: "bandit", wudang: "outlaw", cliffWalker: "greenwoodKing",
  qingzhou: "infantry", danyang: "shieldGuard", baier: "royalGuard",
  jishi: "spearman", daji: "pikeman", tianji: "halberdier",
  shieldBow: "crossbow", xiandeng: "repeater", baizhan: "greatBow",
  drummer: "fengshui", warDrummer: "sage", grandBand: "immortal",
  riderSage: "wheelSage", swiftSage: "fanSage", divineSage: "fanSage",
  feixiong: "xiliang", liangzhouIron: "xiliang", heavenXiliang: "xiliang",
  ironRam: "ram", cloudRam: "ram", dragonRam: "ram",
  mengchong: "navy", louchuan: "navy", admiral: "navy",
  jinglan: "siegeTower", heavyJinglan: "siegeTower", divineJinglan: "siegeTower",
  baggageTrain: "transport", woodenOx: "transport", divineOx: "transport",
  gaemaCaptain: "gaemaWarrior", whiteTigerCav: "gaemaWarrior", divineGaema: "gaemaWarrior",
  sapper: "engineer", masterBuilder: "engineer", divineEngineer: "engineer",
  jiangdong: "infantry", bawang: "shieldGuard", overlordGuard: "royalGuard",
  langzhong: "valiantCav", yulin: "dragonCav", huben: "stormCav",
};
/** 저장에서 읽은 병종 이름을 지금 병종으로(지운 병종이면 이어받는 병종). */
export function currentClass(c: string): UnitClass { return RETIRED_CLASSES[c] ?? (c as UnitClass); }
