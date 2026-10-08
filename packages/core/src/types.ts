/** 전투 도메인 핵심 타입. */

// ─────────────────────────────────────────────────────────── 좌표 · 지형

export interface Coord {
  readonly x: number;
  readonly y: number;
}

/** 지형 종류. 이동 비용 · 회피 · 병종 상성에 관여한다. */
export type TerrainKind =
  | "plain"     // 평지
  | "forest"    // 숲
  | "mountain"  // 산지
  | "hill"      // 구릉
  | "water"     // 수상
  | "rapids"    // 완류 (낙뢰 발생 지대)
  | "road"      // 길
  | "fort"      // 성채
  | "gate"      // 성문
  | "wall"      // 벽 (통행 불가)
  | "bridge"    // 다리
  | "cliff"     // 절벽 · 바위 벼랑 (전 병종 통행 불가)
  | "marsh"     // 갈대늪 (보병 느림, 중장·공성 진입 불가, 은폐 회피 +15)
  | "plank"     // 잔도 · 벼랑길 나무 길 (보병만 원활, 중장·공성 불가, 노출 회피 −10)
  | "ford";     // 여울 · 얕은 물 (보병 느림, 기병 도하, 수군 통과, 공성 불가)

/** 타일 위에 얹히는 일시적 위험 지대 (M-19 HAZARD_FIELD). */
export type HazardKind = "fire" | "trap" | "lightning" | "none";

export interface Tile {
  /** Mutable only through the terrain_change action (bridges built, rivers flooding). */
  terrain: TerrainKind;
  /** 고도. 공격 시 고저차 보정에 사용. */
  readonly height: number;
  hazard: HazardKind;
  /** hazard 잔여 턴. 0이면 소멸. */
  hazardTurns: number;
}

// ─────────────────────────────────────────────────────────── 병종

export type UnitClass =
  | "warlock" | "priestess" | "stormSage" | "warriorMonk" | "outlaw"
  | "shaman"
  | "maiden"
  | "taoist"
  | "monk"
  | "horseArcher"
  | "bandit"
  | "infantry"    // 보병
  | "spearman"    // 창병
  | "cavalry"     // 경기병
  | "heavyCav"    // 중기병
  | "archer"      // 궁병
  | "crossbow"    // 노병
  | "strategist"  // 책사
  | "fengshui"    // 풍수사
  | "ram"         // 충차
  | "catapult"    // 포차
  | "engineer"    // 공병
  | "navy"        // 수군
  | "civilian"    // 민중 (M-01 전환 대상)
  // 확장 병종과 진화 단계 (classes.ts: 계열·능력치·진화 계통)
  | "shieldGuard" | "royalGuard" | "pikeman" | "halberdier" | "lancer" | "tigerRider" | "ironCav"
  | "longbow" | "sharpshooter" | "repeater" | "greatBow" | "tactician" | "mastermind" | "sage" | "immortal"
  | "nomad" | "whiteHorse" | "assassin" | "phantom" | "rattan" | "rattanElite"
  | "elephant" | "warElephant"
  | "ironPagoda" | "elephantKing" | "wraith" | "wuguoRattan" | "greenwoodKing" | "arhat"
  | "demonKing" | "celestial" | "thunderGod"
  // 포차 계통의 상위 단계
  | "thunderCart" | "greatTrebuchet" | "divineCatapult"
  // 명부대(이름난 부대) 계통
  | "xiliang"
  // 병종 차트로 늘린 계통·4단계·모병 특수 병과 (chart-classes.ts)
  | "assaultChariot" | "baguaChariot" | "bashuRepeater" | "beauty" | "chieftain" | "commander" | "crownPrince" | "dancer" | "divineChariot" | "divineSpear" | "divineStrategist" | "dragonCav" | "emperor" | "fanSage" | "fistSaint" | "flyingBlade" | "gaemaWarrior" | "grandCommander" | "halberdCav" | "heavenCav" | "heavenCommander" | "heavenDancer" | "heavenEmperor" | "heavenTaoist" | "heavyChariot" | "heavyHalberdCav" | "hegemon" | "ironInfantry" | "knightErrant" | "lightChariot" | "lord" | "marshal" | "mountainCav" | "nanmanBeast" | "nanmanFoot" | "nanmanRider" | "northFoot" | "northRider" | "palanquin" | "pegasusCav" | "raidCav" | "royalPrince" | "scoutCav" | "siegeTower" | "sonOfHeaven" | "songstress" | "sovereign" | "stormCav" | "swordArtist" | "swordMaster" | "swordSaint" | "swordsman" | "transport" | "valiantCav" | "wheelSage" | "wujiHeavyCav" | "yellowTurban" | "ytArcher" | "ytBrawler" | "ytSpear"
  // 구분이 뚜렷한 신규 4단계 계통
  | "heavenPriestess"
  | "yellowTurbanVeteran" | "yellowTurbanCaptain" | "yellowTurbanMarshal"
  | "mountedStrategist" | "mountedTactician" | "mountedMastermind" | "mountedSage"
  | "pirate" | "pirateRaider" | "pirateCaptain" | "pirateAdmiral";

// ─────────────────────────────────────────────────────────── 진영

/**
 * 진영. `ally`(편입 아군)는 조작 가능하지만 도구를 쓸 수 없고,
 * 아군 생존 카운트에 포함된다. PRD §3.3 / R-5.5.
 */
export type Side = "player" | "ally" | "allyAi" | "enemy";

export const CONTROLLABLE: ReadonlySet<Side> = new Set<Side>(["player", "ally"]);
export const COUNTS_AS_ALLY_LOSS: ReadonlySet<Side> = new Set<Side>(["player", "ally"]);

// ─────────────────────────────────────────────────────────── 책략

export type StrategyElement = "wind" | "fire" | "water" | "thunder" | "earth" | "support" | "physical";
export type StrategyShape = "single" | "cross" | "spread" | "line" | "global";

export interface StrategyDef {
  readonly id: string;
  readonly name: string;
  readonly element: StrategyElement;
  readonly shape: StrategyShape;
  /** 시전 사거리 */
  readonly range: number;
  /** 효과 반경 (shape에 따라 해석) */
  readonly radius: number;
  readonly mpCost: number;
  /** 위력 계수 (100 = 기준) */
  readonly power: number;
  /** 명중 시 부여하는 상태이상 */
  readonly inflicts?: readonly StatusKind[];
  /** 지형 변화 (예: 화계 → fire) */
  readonly leavesHazard?: HazardKind;
  readonly targetSides: readonly Side[];
  /** 배우는 레벨. 있으면 시전자 레벨에 따라 3단 진화한다(strategy-tiers.ts). */
  readonly learnLevel?: number;
  /** 진화 단계(진화된 정의에만 붙는다) */
  readonly tier?: 1 | 2 | 3;
  /** 병종 특수 스킬: 지력 대신 공격력으로 피해를 낸다(명중은 순발력, 받는 쪽은 물리 방어). */
  readonly physical?: boolean;
  /** 아군 지원 책략(회복·고무 등). 적 AI는 이런 책략을 공격에 쓰지 않는다. */
  readonly support?: string;
}

// ─────────────────────────────────────────────────────────── 상태이상

export type StatusKind =
  | "confusion"   // 혼란
  | "immobile"    // 부동
  | "bound"       // 포박
  | "bleed"       // 출혈
  | "burn"        // 화상
  | "shock"       // 감전
  | "seal"        // 책략 봉인
  | "guard"       // 견고 (방어 상승)
  | "haste"       // 강행 (이동력 상승)
  | "rally"       // 사기 상승
  | "weaken"      // 쇠약 (공격 피해 15% 감소)
  | "breach"      // 파갑 (받는 피해 15% 증가)
  | "slow";       // 둔화 (이동력 감소)

export interface Status {
  readonly kind: StatusKind;
  turns: number;
  readonly magnitude: number;
}

// ─────────────────────────────────────────────────────────── 유닛

/** 장수 다섯 능력(조조전 열전 능력치). */
export interface Ability { war: number; int: number; lead: number; agi: number; luck: number }

export interface UnitStats {
  maxHp: number;
  maxMp: number;
  /** 공격력 */
  attack: number;
  /** 방어력 */
  defense: number;
  /** 지력 — 책략 위력 및 책략 저항 */
  intellect: number;
  /** 정신력 — 책략 피해 감소 */
  spirit: number;
  /** 순발력 — 명중/회피/행동 순서 */
  agility: number;
  /** 이동력 */
  movement: number;
  /** 사기 (0~100) */
  morale: number;
}

export interface Unit {
  readonly id: string;
  readonly name: string;
  side: Side;
  unitClass: UnitClass;
  level: number;
  pos: Coord;
  hp: number;
  mp: number;
  stats: UnitStats;
  /** 특성 ID 목록. traits.ts의 레지스트리와 대응. */
  traits: string[];
  /** 특성별 수치 파라미터 (예: "critical" → 15 = 15%) */
  traitParams: Record<string, number>;
  statuses: Status[];
  strategies: string[];
  /** 공격 사거리 [최소, 최대] */
  range: readonly [number, number];
  hasMoved: boolean;
  movedThisTurn?: boolean;
  /** 이번 차례에 움직인 거리(칸). 기병 돌격 같은 병종 전법이 읽는다. */
  movedSteps?: number;
  /** 현행 규칙 전투인가: 병종 전법(tactics.ts)과 지력 비례 책략 피해를 쓴다. 옛 규칙 저장 재생이 달라지지 않게 현행 전투만 켠다. */
  classTactics?: boolean;
  /** 조조전 규칙 전투인가(규칙판 5): 능력 등급·지형 효율·비율 확률·2회 공격을 쓴다. cc-rules.ts 참조. */
  ccRules?: boolean;
  /** 장수 다섯 능력(무력·지력·통솔·민첩·운). 조조전 규칙에서 능력치 성장과 상태 회복에 쓴다. */
  ability?: Ability;
  /** 이름난 장수의 회심 보너스(%p). 무력·운이 높을수록 크다. 일반 병사는 없음. */
  officerCrit?: number;
  hasActed: boolean;
  alive: boolean;
  /** 도구 사용 가능 여부. 편입 아군은 false. PRD §3.3 */
  canUseItems: boolean;
  /** AI 행동 방침. player/ally는 무시된다. */
  behavior?: AiBehavior;
  /** 이동 목표 영역 이름. race/flee/escortee가 사용한다. */
  goalRegion?: string;
  /** 순찰 경로 (M-02). behavior "patrol" 전용. */
  patrolRoute?: Coord[];
  /** 순찰 경로상의 현재 목표 인덱스. */
  patrolIndex?: number;
  /** 시야 범위 (M-02). 이 거리 안의 적대 유닛을 발각한다. */
  visionRange?: number;
}

export type AiBehavior =
  | "advance"   // 최단 경로로 전진하며 교전
  | "hold"      // 제자리 방어, 사거리 내만 공격
  | "escort"    // 호위 대상 추종
  | "escortee"  // 보호 대상 — 목적지로 자동 전진, 교전하지 않음 (M-05)
  | "race"      // 목표 지점으로 직행 (M-07)
  | "flee"      // 출구로 도주 (M-21)
  | "patrol"    // 정해진 경로를 순찰 (M-02)
  | "passive";  // 공격하지 않음

// ─────────────────────────────────────────────────────────── 전투 결과

export type BattleOutcome = "ongoing" | "victory" | "defeat";

export interface DamageResult {
  readonly attacker: string;
  readonly defender: string;
  readonly hit: boolean;
  readonly damage: number;
  readonly critical: boolean;
  readonly lethal: boolean;
  readonly breakdown: DamageBreakdown;
  /** 발동한 병종 전법 이름 (tactics.ts) */
  readonly tactic?: string;
}

export interface DamageBreakdown {
  readonly base: number;
  readonly matchup: number;
  readonly terrain: number;
  readonly elevation: number;
  readonly morale: number;
  readonly variance: number;
  readonly reduction: number;
}
