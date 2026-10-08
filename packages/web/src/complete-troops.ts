import type {UnitClass} from '../../core/src/index.ts';

/**
 * 실제 진화표와 같은 계보. 각 시트는 4행(기본·숙련·정예·전설) x
 * 4열(대기·준비·공격/책략·피격/방어)이며 모두 같은 픽셀 화풍과 투명 배경을 쓴다.
 */
export const fourStageCorrectionRows = {
  'four-stage-infantry':['infantry','shieldGuard','royalGuard','ironInfantry'],
  'four-stage-spearman':['spearman','pikeman','halberdier','divineSpear'],
  'four-stage-cavalry':['cavalry','lancer','tigerRider','northRider'],
  'four-stage-heavy-cavalry':['heavyCav','ironCav','ironPagoda','wujiHeavyCav'],
  'four-stage-archer':['archer','longbow','sharpshooter','ytArcher'],
  'four-stage-crossbow':['crossbow','repeater','greatBow','bashuRepeater'],
  'four-stage-strategist':['strategist','tactician','mastermind','divineStrategist'],
  'four-stage-fengshui':['fengshui','sage','immortal','palanquin'],
  'four-stage-horse-archer':['horseArcher','nomad','whiteHorse','fanSage'],
  'four-stage-assassin':['assassin','phantom','wraith','flyingBlade'],
  'four-stage-rattan':['rattan','rattanElite','wuguoRattan','northFoot'],
  'four-stage-elephant':['elephant','warElephant','elephantKing','baguaChariot'],
  'four-stage-shaman':['shaman','warlock','demonKing','wheelSage'],
  'four-stage-maiden':['maiden','priestess','celestial','heavenPriestess'],
  'four-stage-yellow-turban':['yellowTurban','yellowTurbanVeteran','yellowTurbanCaptain','yellowTurbanMarshal'],
  'four-stage-mounted-strategist':['mountedStrategist','mountedTactician','mountedMastermind','mountedSage'],
  'four-stage-pirate':['pirate','pirateRaider','pirateCaptain','pirateAdmiral'],
  'four-stage-taoist':['taoist','stormSage','thunderGod','heavenTaoist'],
  'four-stage-monk':['monk','warriorMonk','arhat','fistSaint'],
  'four-stage-bandit':['bandit','outlaw','greenwoodKing','chieftain'],
  'four-stage-swordsman':['swordsman','knightErrant','swordMaster','swordSaint'],
  'four-stage-lord':['lord','hegemon','sovereign','sonOfHeaven'],
  'four-stage-commander':['commander','grandCommander','marshal','heavenCommander'],
  'four-stage-dancer':['dancer','songstress','beauty','heavenDancer'],
  'four-stage-mountain-cavalry':['mountainCav','scoutCav','raidCav','pegasusCav'],
  'four-stage-valiant-cavalry':['valiantCav','dragonCav','stormCav','heavenCav'],
  'four-stage-chariot':['lightChariot','assaultChariot','heavyChariot','divineChariot'],
  'four-stage-nanman':['nanmanRider','nanmanBeast','nanmanFoot','ytBrawler'],
  'four-stage-halberd-cavalry':['halberdCav','heavyHalberdCav','ytSpear','swordArtist'],
  'four-stage-catapult':['catapult','thunderCart','greatTrebuchet','divineCatapult'],
} as const satisfies Readonly<Record<string,readonly [UnitClass,UnitClass,UnitClass,UnitClass]>>;

/** 진화하지 않는 독립 병종. 옛 저장 ID는 core의 currentClass에서 이 ID로 먼저 정규화한다. */
export const singleStageCorrectionRows = {
  'single-stage-crown-prince':['crownPrince'],
  'single-stage-royal-prince':['royalPrince'],
  'single-stage-emperor':['emperor'],
  'single-stage-heaven-emperor':['heavenEmperor'],
  'single-stage-civilian':['civilian'],
  'single-stage-xiliang':['xiliang'],
  'single-stage-ram':['ram'],
  'single-stage-navy':['navy'],
  'single-stage-siege-tower':['siegeTower'],
  'single-stage-transport':['transport'],
  'single-stage-gaema-warrior':['gaemaWarrior'],
  'single-stage-engineer':['engineer'],
} as const satisfies Readonly<Record<string,readonly UnitClass[]>>;

/** 그림 제작/검수 기준: 한 계통의 네 단계는 이 무기군을 끝까지 유지한다. */
export const lineageWeapons = {
  'four-stage-heavy-cavalry':'spear',
  'four-stage-lord':'sword',
  'four-stage-rattan':'trident',
  'four-stage-valiant-cavalry':'curved-saber',
  'four-stage-maiden':'talisman',
  'four-stage-monk':'unarmed',
  'four-stage-yellow-turban':'curved-saber',
  'four-stage-mounted-strategist':'feather-fan',
  'four-stage-pirate':'cutlass',
  'four-stage-commander':'sword',
  'four-stage-mountain-cavalry':'short-spear-and-buckler',
  'four-stage-horse-archer':'bow',
  'four-stage-dancer':'silk-ribbon',
  'four-stage-halberd-cavalry':'crescent-halberd',
  'four-stage-archer':'bow',
  'four-stage-crossbow':'crossbow',
  'four-stage-bandit':'curved-cleaver',
  'four-stage-swordsman':'straight-jian',
  'four-stage-assassin':'twin-daggers',
} as const;

export const singleStageWeapons = {
  'single-stage-crown-prince':'court-tablet','single-stage-royal-prince':'court-tablet',
  'single-stage-emperor':'court-tablet','single-stage-heaven-emperor':'court-tablet',
  'single-stage-xiliang':'curved-saber','single-stage-gaema-warrior':'spear',
  'single-stage-engineer':'construction-hammer',
} as const;

// 서로 닮았던 계통은 무기·투구·갑옷 윤곽을 갈라 다시 그린 v2 시트를 쓴다.
const V2_SHEETS=new Set([
  'four-stage-fengshui','four-stage-heavy-cavalry','four-stage-lord',
  'four-stage-valiant-cavalry','four-stage-rattan','four-stage-yellow-turban',
  'four-stage-commander','four-stage-mountain-cavalry',
  'four-stage-dancer','four-stage-halberd-cavalry',
  'four-stage-archer','four-stage-crossbow','four-stage-bandit',
  'four-stage-swordsman',
  'four-stage-assassin',
]);
// 화풍 재통일: 보병·등갑병의 픽셀 비율과 명암으로 교정한 v3를 쓴다.
const SHEET_FILES:Readonly<Record<string,string>>={
  'four-stage-monk':'troops-four-stage-monk-v3.webp',
  'four-stage-maiden':'troops-four-stage-maiden-v3.webp',
  'four-stage-mounted-strategist':'troops-four-stage-mounted-strategist-v3.webp',
  'four-stage-pirate':'troops-four-stage-pirate-v3.webp',
};
const sheet = (id:string,rows=4)=>({
  id,
  url:id.startsWith('single-stage-')?`troops-${id}-v1.webp`:SHEET_FILES[id]??`troops-${id}-${V2_SHEETS.has(id)?'v2.webp':'v1.webp'}`,
  rows,
  // 투명 배경의 미세한 가장자리는 살리되 이웃 칸의 실루엣은 합치지 않는다.
  alphaCutoff:240,
  strictGrid:true,
});

/** 진화 계보와 진화하지 않는 민간인 전용 시트. */
export const completeTroopSheets = [
  ...Object.keys(fourStageCorrectionRows).map(id=>sheet(id,4)),
  ...Object.keys(singleStageCorrectionRows).map(id=>sheet(id,1)),
];

export type CompleteTroopCell={sheet:string;row:number;rows:number};
const evolvedTroopArt=Object.fromEntries(
  Object.entries(fourStageCorrectionRows).flatMap(([sheetId,classes])=>classes.map((troop,row)=>[
    troop,{sheet:sheetId,row,rows:4},
  ])),
) as Partial<Record<UnitClass,CompleteTroopCell>>;
const singleTroopArt=Object.fromEntries(
  Object.entries(singleStageCorrectionRows).flatMap(([sheetId,classes])=>classes.map(troop=>[
    troop,{sheet:sheetId,row:0,rows:1},
  ])),
) as Partial<Record<UnitClass,CompleteTroopCell>>;

/** 게임의 모든 병종은 새 4행 규격만 사용한다. */
export const completeTroopArt={
  ...evolvedTroopArt,
  ...singleTroopArt,
} as Record<UnitClass,CompleteTroopCell>;
