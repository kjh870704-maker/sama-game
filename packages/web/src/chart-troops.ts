/**
 * 병종 차트로 늘린 병종의 이름·역할·책략(core chart-classes.ts의 계통과 짝).
 * 그림은 차트에서 잘라 낸 낱장을 4동작(대기·준비·공격·피격)으로 기울여 만든 시트를 쓴다(painted-troops.ts).
 */
import type {UnitClass} from '../../core/src/index.ts';

type Role={name:string;role:string;base:UnitClass;tint:number;spells:string[]};
const LEAD=['inspire','march','fortify','warCry'];
const CAST=['fire','embers','gust','windDragon','rumor','ambush'];
const CAST2=[...CAST,'fireWall','rockfall'];
const HEAL=['mend','purify','greatMend'];
const DANCE=['mend','purify','fortify','inspire','greatMend','focus'];
const r=(name:string,role:string,base:UnitClass,tint:number,spells:string[]=[]):Role=>({name,role,base,tint,spells});

export const CHART_ROLES:Partial<Record<UnitClass,Role>>={
  // 검사계
  swordsman:r('검객','날랜 칼 한 자루로 싸우는 검사 계통의 시작','infantry',0xe8dcc0),
  knightErrant:r('협객','검사 2단계 · 회심 일격이 잦아진다','infantry',0xc8a880),
  swordArtist:r('신극기병','극기병 전설 · 같은 극을 끝까지 단련한 기병','cavalry',0xc0c8d8),
  swordMaster:r('검사','검사 최정예 · 검기로 방어를 꿰뚫는다','infantry',0xd8a060),
  swordSaint:r('검성','검사 전설 · 궁지에서 더 날카로워지는 검의 끝','infantry',0xfff0b0),
  // 군주계
  lord:r('군주','말 위에서 군을 이끄는 군주 계통 · 사기를 북돋운다','cavalry',0x9ab8e8,LEAD),
  hegemon:r('패주','군주 2단계 · 궁지에서 받는 피해가 줄어든다','cavalry',0xc0a070,LEAD),
  sovereign:r('제왕','군주 3단계 · 공격력이 오른다','cavalry',0xe8c060,LEAD),
  sonOfHeaven:r('천자','군주 4단계 · 책략에도 버티는 천명의 군주','cavalry',0xf0e0ff,LEAD),
  // 도독계
  commander:r('도독','칼과 책략을 함께 쓰는 지휘관 계통','infantry',0xa8c0d8,CAST),
  grandCommander:r('대도독','도독 2단계 · 책략 피해가 오른다','infantry',0xd08070,CAST),
  marshal:r('사마','도독 3단계 · 반격이 강해진다','infantry',0xe0c070,CAST2),
  heavenCommander:r('천군도독','도독 4단계 · 천군을 호령하는 대장','infantry',0xe06050,CAST2),
  // 무희계
  dancer:r('무희','춤으로 아군을 북돋고 다치게 한 이를 돌보는 병종','maiden',0xffb0d0,DANCE),
  songstress:r('가희','무희 2단계 · 책략 피해를 덜 받는다','maiden',0xd8b0f0,DANCE),
  beauty:r('가인','무희 3단계 · 회복이 강해진다','maiden',0xf0a080,DANCE),
  heavenDancer:r('천무','무희 4단계 · 하늘의 춤, 물리·책략 모두 덜 받는다','maiden',0xfff0c0,DANCE),
  // 산악기병계
  mountainCav:r('산악기병','산과 숲을 평지처럼 달리는 기병','cavalry',0xc8a878),
  scoutCav:r('수색기병','산악기병 2단계 · 회심 일격','cavalry',0xd8c8a8),
  raidCav:r('맹습기병','산악기병 3단계 · 움직인 뒤 치면 더 아프다','cavalry',0xa0a0a0),
  pegasusCav:r('비마','산악기병 4단계 · 날개 달린 백마','cavalry',0xf0f0ff),
  // 효기병계
  valiantCav:r('효기병','날랜 돌격 기병 계통','cavalry',0xc89060),
  dragonCav:r('용기병','효기병 2단계 · 돌격 피해가 오른다','cavalry',0xe0b060),
  stormCav:r('돌격효기병','효기병 3단계 · 친 만큼 체력을 되찾는다','cavalry',0xff8040),
  heavenCav:r('천군효기병','효기병 4단계 · 붉은 갑주의 천군 기병','cavalry',0xe04040),
  // 전차계
  lightChariot:r('경전차','두 필 말이 끄는 가벼운 전차','heavyCav',0xc0a080),
  assaultChariot:r('돌격전차','전차 2단계 · 바퀴 날로 돌진한다','heavyCav',0xa0a8b0),
  heavyChariot:r('중전차','전차 3단계 · 철갑으로 물리 피해를 덜 받는다','heavyCav',0x9098a0),
  divineChariot:r('신전차','전차 4단계 · 용머리 금전차','heavyCav',0xffd060),
  // 정란계
  siegeTower:r('경정란','높은 망루에서 활을 쏘는 공성탑 · 사거리 1~3','catapult',0xc0a070),
  jinglan:r('정란','정란 2단계 · 공격력이 오른다','catapult',0xb08860),
  heavyJinglan:r('중정란','정란 3단계 · 두꺼운 판벽','catapult',0x907860),
  divineJinglan:r('신정란','정란 4단계 · 금장 망루, 방어를 꿰뚫는다','catapult',0xf0d080),
  // 천자계
  crownPrince:r('황태자','황실의 후계 · 회복과 정화','strategist',0xa0b8e0,HEAL),
  royalPrince:r('친왕공','천자 2단계 · 책략 피해를 덜 받는다','strategist',0xc0c8d0,HEAL),
  emperor:r('황제','천자 3단계 · 회복이 강해진다','strategist',0xffd040,HEAL),
  heavenEmperor:r('천자도록','천자 4단계 · 천자의 위광','strategist',0xfff0c0,HEAL),
  // 보급계
  transport:r('수송대','손수레로 군량을 나르며 다친 병사를 돌본다','engineer',0xc8b088,['mend']),
  baggageTrain:r('치중대','보급 2단계 · 수레 행렬, 회복이 오른다','engineer',0xd0b890,['mend','purify']),
  woodenOx:r('목우유마','보급 3단계 · 제갈량의 나무 소','engineer',0xb08858,HEAL),
  divineOx:r('신목우','보급 4단계 · 금빛 신목우','engineer',0xffd060,HEAL),
  // 모병 특수 병과 계통
  nanmanRider:r('남만기병','남만의 날랜 기마병','cavalry',0xc08860),
  nanmanBeast:r('남만맹수병','남만기병 2단계 · 맹수를 탄 기병','cavalry',0xa07050),
  gaemaWarrior:r('고구려 개마무사','사람과 말 모두 쇠미늘을 두른 기병','heavyCav',0x808890),
  gaemaCaptain:r('개마대장','개마 2단계 · 물리 피해를 덜 받는다','heavyCav',0x9098a8),
  whiteTigerCav:r('백호기병','개마 3단계 · 백호 갑주, 방어를 꿰뚫는다','heavyCav',0xf0f0f0),
  halberdCav:r('극기병','극을 든 기병 · 창병 상대로 버틴다','cavalry',0xb09070),
  heavyHalberdCav:r('중장극기병','극기병 2단계 · 반격이 강해진다','cavalry',0x9098a0),
  wheelSage:r('사륜거 책사','수레 위의 책사 · 느리지만 책략이 강하다','strategist',0xe0e0d0,CAST),
  fanSage:r('천궁기','기마궁병 전설 · 같은 활로 달리며 백발백중한다','horseArcher',0xc0f0d0),
  yellowTurban:r('천녀','무녀 전설 · 같은 방울로 하늘의 가호를 부른다','maiden',0xf0d040,DANCE),
  ytArcher:r('신궁','궁병 전설 · 같은 활로 가장 먼 적을 꿰뚫는다','archer',0xe8c840),
  ytSpear:r('철극기병','극기병 최정예 · 같은 극으로 돌진과 반격을 잇는다','cavalry',0xe8c840),
  ytBrawler:r('남만수왕기','남만기병 전설 · 같은 도를 든 맹수 기병','cavalry',0xe8c840),
  nanmanFoot:r('남만맹호기','남만기병 최정예 · 같은 도를 든 중갑 기병','cavalry',0xc08860),
  northFoot:r('금강등갑병','등갑병 전설 · 같은 칼과 방패를 든 불굴의 병사','infantry',0xb0a890),
  northRider:r('천호기병','경기병 전설 · 같은 창으로 돌파하는 기병','cavalry',0xb0a078),
  palanquin:r('천풍수사','풍수사 전설 · 같은 팔괘 지팡이로 진을 다스린다','fengshui',0xf0a0a0,HEAL),
  baguaChariot:r('백상왕','코끼리병 전설 · 같은 장창을 든 금갑 전투 코끼리','elephant',0x90e0b0),
  flyingBlade:r('귀영살수','자객 전설 · 같은 비도로 그림자처럼 벤다','assassin',0x909090),
  bashuRepeater:r('신노','노병 전설 · 같은 연노로 철갑을 꿰뚫는다','crossbow',0xa0b070),
  // 기존 계통의 4단계
  ironInfantry:r('무극보병','보병 4단계 · 철갑 보병','infantry',0xffd060),
  divineSpear:r('신창','창병 4단계 · 금창의 달인','spearman',0xffd060),
  divineStrategist:r('신산','책사 전설 · 백우선을 들고 사륜거에서 신묘한 계책을 펼친다','strategist',0xfff0c0,['fire','embers','gust','windDragon','ambush','fireWall','rockfall','whirlwind','feint','tempest','breakArmor','chainFire','skyFire','shatter']),
  heavenTaoist:r('천도사','도사 4단계 · 하늘의 도를 부린다','taoist',0xfff0a0,['fire','gust','windDragon','flood','waterSurge','thunder','whirlwind','tempest','thunderbolt','gale','mire','tidalLine','thunderCross','quake']),
  fistSaint:r('권성','무도가 4단계 · 주먹의 성인','monk',0xffd060,['mend','march','fortify']),
  chieftain:r('두령','산적 4단계 · 산채의 두령','bandit',0xe0a060),
  admiral:r('수군도독','수군 4단계 · 수군을 거느리는 도독','navy',0x80a0e0),
  wujiHeavyCav:r('무극중기병','중기병 4단계 · 금장 중기병','heavyCav',0xffd060),
  dragonRam:r('신충차','충차 4단계 · 용머리 충차','ram',0x80c080),
};

// 기존 저장 id는 유지하되, 빈 4단계와 공성 계통을 별도 병종으로 채운다.
Object.assign(CHART_ROLES, {
  meteorSlinger:r('천석투병','투석병 전설 · 같은 투석구로 내리꽂는다','archer',0xd8b870),
  heavenXiliang:r('천량철기','서량기병 전설 · 같은 장창으로 설원을 돌파한다','cavalry',0xd8c090),
  divineGaema:r('신개마무사','개마무사 전설 · 같은 장창으로 중장 돌격한다','heavyCav',0xd8c8a0),
  sapper:r('축성병','공병 정예 · 같은 사각 망치로 방책과 기계를 다룬다','engineer',0x80a890),
  masterBuilder:r('공성장인','공병 최정예 · 같은 사각 망치로 견고하게 보수한다','engineer',0x7098a8),
  divineEngineer:r('신기장','공병 전설 · 같은 사각 망치로 전장을 요새화한다','engineer',0xd0b870),
  thunderCart:r('벽력거','포차 정예 · 같은 투석 기구로 거석을 날린다','catapult',0xb09068),
  greatTrebuchet:r('천균거','포차 최정예 · 같은 투석 기구를 대형화한다','catapult',0x9b8060),
  divineCatapult:r('신포차','포차 전설 · 같은 투석 기구로 성곽을 붕괴시킨다','catapult',0xd0a050),
});
CHART_ROLES.ytArcher={...CHART_ROLES.ytArcher!,name:'천궁수'};
CHART_ROLES.wheelSage={...CHART_ROLES.wheelSage!,name:'천요술사',role:'주술사 전설 · 같은 나무 지팡이와 부적으로 요술을 완성한다',base:'shaman',spells:CAST2};
