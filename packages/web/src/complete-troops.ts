import type {UnitClass} from '../../core/src/index.ts';

/**
 * 실제 진화표와 같은 36개 계보. 각 시트는 4행(기본·숙련·정예·전설) x
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
  'four-stage-slinger':['slinger','hurler','boulderCorps','meteorSlinger'],
  'four-stage-assassin':['assassin','phantom','wraith','flyingBlade'],
  'four-stage-rattan':['rattan','rattanElite','wuguoRattan','northFoot'],
  'four-stage-elephant':['elephant','warElephant','elephantKing','baguaChariot'],
  'four-stage-shaman':['shaman','warlock','demonKing','wheelSage'],
  'four-stage-maiden':['maiden','priestess','celestial','yellowTurban'],
  'four-stage-taoist':['taoist','stormSage','thunderGod','heavenTaoist'],
  'four-stage-monk':['monk','warriorMonk','arhat','fistSaint'],
  'four-stage-bandit':['bandit','outlaw','greenwoodKing','chieftain'],
  'four-stage-xiliang':['xiliang','feixiong','liangzhouIron','heavenXiliang'],
  'four-stage-ram':['ram','ironRam','cloudRam','dragonRam'],
  'four-stage-navy':['navy','mengchong','louchuan','admiral'],
  'four-stage-swordsman':['swordsman','knightErrant','swordMaster','swordSaint'],
  'four-stage-lord':['lord','hegemon','sovereign','sonOfHeaven'],
  'four-stage-commander':['commander','grandCommander','marshal','heavenCommander'],
  'four-stage-dancer':['dancer','songstress','beauty','heavenDancer'],
  'four-stage-mountain-cavalry':['mountainCav','scoutCav','raidCav','pegasusCav'],
  'four-stage-valiant-cavalry':['valiantCav','dragonCav','stormCav','heavenCav'],
  'four-stage-chariot':['lightChariot','assaultChariot','heavyChariot','divineChariot'],
  'four-stage-siege-tower':['siegeTower','jinglan','heavyJinglan','divineJinglan'],
  'four-stage-crown-prince':['crownPrince','royalPrince','emperor','heavenEmperor'],
  'four-stage-transport':['transport','baggageTrain','woodenOx','divineOx'],
  'four-stage-nanman':['nanmanRider','nanmanBeast','nanmanFoot','ytBrawler'],
  'four-stage-gaema':['gaemaWarrior','gaemaCaptain','whiteTigerCav','divineGaema'],
  'four-stage-halberd-cavalry':['halberdCav','heavyHalberdCav','ytSpear','swordArtist'],
  'four-stage-engineer':['engineer','sapper','masterBuilder','divineEngineer'],
  'four-stage-catapult':['catapult','thunderCart','greatTrebuchet','divineCatapult'],
} as const satisfies Readonly<Record<string,readonly [UnitClass,UnitClass,UnitClass,UnitClass]>>;

const sheet = (id:string)=>({
  id,
  // 풍수사는 책사의 관복·깃털부채와 겹치지 않는 나침반·팔괘 지팡이 전용 시트다.
  url:id==='four-stage-fengshui'?'troops-four-stage-fengshui-v2.png':`troops-${id}-v1.webp`,
  rows:4,
  // 투명 배경의 미세한 가장자리는 살리되 이웃 칸의 실루엣은 합치지 않는다.
  alphaCutoff:240,
  strictGrid:true,
});

/** 36개 진화 계보와 진화하지 않는 민간인 전용 시트. */
export const completeTroopSheets = [
  ...Object.keys(fourStageCorrectionRows).map(sheet),
  sheet('four-stage-civilian'),
];

export type CompleteTroopCell={sheet:string;row:number;rows:number};
const evolvedTroopArt=Object.fromEntries(
  Object.entries(fourStageCorrectionRows).flatMap(([sheetId,classes])=>classes.map((troop,row)=>[
    troop,{sheet:sheetId,row,rows:4},
  ])),
) as Partial<Record<UnitClass,CompleteTroopCell>>;

/** 게임의 145개 병종 모두 새 4행 규격만 사용한다. */
export const completeTroopArt={
  ...evolvedTroopArt,
  civilian:{sheet:'four-stage-civilian',row:0,rows:4},
} as Record<UnitClass,CompleteTroopCell>;
