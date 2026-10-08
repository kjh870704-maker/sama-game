import type {UnitClass} from '../../core/src/index.ts';
import {classSpells} from './class-spells.ts';
import {VARIANTS,EVOLUTION,familyOf} from '../../core/src/index.ts';
import {allStrategies} from './officers.ts';
import {paintedTroopSheets,paintedTroopArt} from './painted-troops.ts';
import {CHART_ROLES} from './chart-troops.ts';
import {officerModelSheets} from './officer-models.ts';

export const troopRoles:Partial<Record<UnitClass,{name:string;role:string;base:UnitClass;tint:number;spells:string[]}>>={
 shaman:{name:'주술사',role:'독·봉인·혼란으로 적을 약화하는 책략 병종',base:'strategist',tint:0xd7afff,spells:['fire','embers','bind','poison','silence','confuse','feint','demoralize','weakenCurse','terror','plague','rumor','chaos']},
 maiden:{name:'무녀',role:'정화·방호·고무로 부대를 지키는 지원 병종',base:'fengshui',tint:0xffc4de,spells:['mend','purify','fortify','inspire','greatMend','focus','ironWall','sanctuary']},
 taoist:{name:'도사',role:'바람·수계·낙뢰를 다루는 원소 책략 병종',base:'strategist',tint:0xaee9ff,spells:['fire','gust','windDragon','flood','waterSurge','thunder','whirlwind','tempest','thunderbolt','gale','mire','tidalLine','thunderCross','quake']},
 monk:{name:'무도가',role:'험지 기동과 근접 공격, 자기 회복을 겸하는 병종',base:'infantry',tint:0xffd398,spells:['mend','march','fortify']},
 mountedStrategist:{name:'기마책사',role:'이동 7 · 부채로 책략을 펼치는 기동 책사',base:'strategist',tint:0xcbd7ff,spells:['fire','gust','ambush','feint']},
 pirate:{name:'해적',role:'이동 6 · 곡도로 파고드는 수상 근접 병종',base:'navy',tint:0x72c8c7,spells:[]},
 horseArcher:{name:'궁기병',role:'이동 6 · 사거리 2~3, 기동 사격에 특화',base:'cavalry',tint:0xc7e6ae,spells:[]},
 bandit:{name:'산적',role:'숲·산지에서 강하지만 평지 방어가 약한 병종',base:'infantry',tint:0xd8b58e,spells:[]},
 // 확장 병종과 진화 단계: 그림은 계열의 것을 쓰고 색조·등급 표식으로 구분한다.
 shieldGuard:{name:'방패병',role:'보병 2단계 · 곁의 아군이 받을 피해를 대신 받는 호위 전열',base:'infantry',tint:0xbfd2ff,spells:[]},
 royalGuard:{name:'금위군',role:'보병 3단계 · 호위와 배수진, 무너지지 않는 최정예 전열',base:'infantry',tint:0xffe08a,spells:[]},
 pikeman:{name:'장창병',role:'창병 2단계 · 더 긴 창으로 기병을 받아 낸다',base:'spearman',tint:0xc8e6ff,spells:[]},
 halberdier:{name:'극병',role:'창병 3단계 · 몇 번이고 반격하는 미늘창 부대',base:'spearman',tint:0xffd27a,spells:[]},
 lancer:{name:'돌격기병',role:'경기병 2단계 · 평지 돌파 위력이 오른다',base:'cavalry',tint:0xc6d8ff,spells:[]},
 tigerRider:{name:'호표기',role:'경기병 3단계 · 조조의 친위 기병, 회심 공격',base:'cavalry',tint:0xffd88a,spells:[]},
 ironCav:{name:'철기',role:'중기병 2단계 · 쇠미늘로 물리 피해를 덜 받는다',base:'heavyCav',tint:0xd0d6e0,spells:[]},
 longbow:{name:'강궁병',role:'궁병 2단계 · 사거리 2~3',base:'archer',tint:0xcfe8c0,spells:[]},
 sharpshooter:{name:'신궁',role:'궁병 3단계 · 방어를 꿰뚫는 화살',base:'archer',tint:0xffe39a,spells:[]},
 repeater:{name:'연노병',role:'노병 2단계 · 더 강한 연사',base:'crossbow',tint:0xc9dcff,spells:[]},
 greatBow:{name:'대황노',role:'노병 3단계 · 호위를 무시하는 관통 사격',base:'crossbow',tint:0xffd690,spells:[]},
 tactician:{name:'군사',role:'책사 2단계 · 지력과 책략 MP가 오른다',base:'strategist',tint:0xc9d4ff,spells:['fire','embers','gust','windDragon','ambush','fireWall','rockfall']},
 mastermind:{name:'귀모',role:'책사 3단계 · 적의 책략을 흘려 보내는 최고의 책사',base:'strategist',tint:0xffd98c,spells:['fire','embers','gust','windDragon','ambush','fireWall','rockfall','whirlwind','feint','tempest','breakArmor','chainFire','skyFire','shatter']},
 sage:{name:'현자',role:'풍수사 2단계 · 회복과 정화가 강해진다',base:'fengshui',tint:0xd2f0ff,spells:['mend','purify','fortify','inspire']},
 immortal:{name:'선인',role:'풍수사 3단계 · 책략 피해를 덜 받는 회복의 대가',base:'fengshui',tint:0xfff0a8,spells:['mend','purify','fortify','inspire','greatMend','focus','ironWall','sanctuary']},
 nomad:{name:'유목기병',role:'궁기병 2단계 · 이동 7의 기동 사격',base:'horseArcher',tint:0xdcefb8,spells:[]},
 whiteHorse:{name:'백마의종',role:'궁기병 3단계 · 공손찬의 백마 기사단, 회심 사격',base:'horseArcher',tint:0xffffff,spells:[]},
 assassin:{name:'자객',role:'이동 6 · 높은 회심률, 몸은 약하다',base:'bandit',tint:0x8e8aa8,spells:[]},
 phantom:{name:'무영객',role:'자객 2단계 · 그림자 같은 일격',base:'bandit',tint:0x6f6a96,spells:[]},
 rattan:{name:'등갑병',role:'물리 피해 25% 감소 · 화계에 크게 약하다',base:'infantry',tint:0xd8b36a,spells:[]},
 rattanElite:{name:'정예 등갑병',role:'등갑병 2단계 · 물리 피해 35% 감소, 여전히 불에 약하다',base:'infantry',tint:0xe9c56c,spells:[]},
 warlock:{name:'요술사',role:'주술사 2단계 · 저주가 깊어지고 적의 책략을 흘린다',base:'shaman',tint:0xb98cff,spells:['fire','embers','bind','poison','silence','confuse','feint','demoralize','weakenCurse','terror','plague','rumor','chaos']},
 priestess:{name:'신녀',role:'무녀 2단계 · 정신이 높고 책략 피해를 덜 받는다',base:'maiden',tint:0xffd6ea,spells:['mend','purify','fortify','inspire','greatMend','focus','ironWall','sanctuary']},
 stormSage:{name:'뇌공',role:'도사 2단계 · 바람과 벼락을 더 세게 부린다',base:'taoist',tint:0xd2f4ff,spells:['fire','gust','windDragon','flood','waterSurge','thunder','whirlwind','tempest','thunderbolt','gale','mire','tidalLine','thunderCross','quake']},
 warriorMonk:{name:'무승',role:'무도가 2단계 · 단단한 몸과 회심 일격',base:'monk',tint:0xffe0a8,spells:['mend','march','fortify']},
 outlaw:{name:'녹림호걸',role:'산적 2단계 · 숲과 산의 우두머리, 회심 일격',base:'bandit',tint:0xe8c49a,spells:[]},
 elephant:{name:'상병',role:'남만의 코끼리 부대 · 체력이 매우 높고 느리다',base:'heavyCav',tint:0xb9b2a4,spells:[]},
 warElephant:{name:'전투상',role:'상병 2단계 · 쇠 갑주를 두른 코끼리',base:'heavyCav',tint:0xd3cbbb,spells:[]},
 ironPagoda:{name:'철부도',role:'중기병 3단계 · 사람과 말 모두 쇠로 감싼 돌파 기병, 방어를 꿰뚫는다',base:'heavyCav',tint:0xa9b4c6,spells:[]},
 elephantKing:{name:'상왕군',role:'상병 3단계 · 남만 상왕의 코끼리 부대, 때린 적에게 피해를 되돌린다',base:'heavyCav',tint:0xf0e2b8,spells:[]},
 wraith:{name:'영귀',role:'자객 3단계 · 보이지 않는 살수, 회심과 흡혈',base:'bandit',tint:0x4e4878,spells:[]},
 wuguoRattan:{name:'오과 등갑군',role:'등갑병 3단계 · 오과국 정예, 물리 피해 40% 감소 · 불에는 여전히 약하다',base:'infantry',tint:0xf6d27a,spells:[]},
 greenwoodKing:{name:'녹림대왕',role:'산적 3단계 · 산채의 왕, 궁지에 몰릴수록 사나워진다',base:'bandit',tint:0xf4cf8e,spells:[]},
 arhat:{name:'나한승',role:'무도가 3단계 · 금강 같은 몸으로 책략에도 버틴다',base:'monk',tint:0xffd27a,spells:['mend','march','fortify']},
 demonKing:{name:'요왕',role:'주술사 3단계 · 저주를 되돌리는 요술의 왕',base:'shaman',tint:0x9a62ff,spells:['fire','embers','bind','poison','silence','confuse','feint','demoralize','weakenCurse','terror','plague','rumor','chaos']},
 celestial:{name:'선녀',role:'무녀 3단계 · 하늘의 가호로 부대를 지키는 최고의 지원 병종',base:'maiden',tint:0xffe6f2,spells:['mend','purify','fortify','inspire','greatMend','focus','ironWall','sanctuary']},
 heavenPriestess:{name:'천신녀',role:'무녀 4단계 · 부적술과 가호를 완성한 전설 지원 병종',base:'maiden',tint:0xffedf6,spells:['mend','purify','fortify','inspire','greatMend','focus','ironWall','sanctuary']},
 yellowTurban:{name:'황건병',role:'황건 계통 1단계 · 곡도로 싸우는 민병',base:'infantry',tint:0xe6c84f,spells:[]},
 yellowTurbanVeteran:{name:'황건노병',role:'황건 계통 2단계 · 전투 경험을 쌓은 곡도병',base:'infantry',tint:0xe8c23b,spells:[]},
 yellowTurbanCaptain:{name:'황건두목',role:'황건 계통 3단계 · 갑옷과 곡도를 갖춘 지휘병',base:'infantry',tint:0xd9ad26,spells:[]},
 yellowTurbanMarshal:{name:'천공장군',role:'황건 계통 4단계 · 곡도술을 완성한 전설 병종',base:'infantry',tint:0xf0cf45,spells:[]},
 mountedTactician:{name:'기마군사',role:'기마책사 2단계 · 부채 책략과 기동력이 강화된다',base:'strategist',tint:0xbacaff,spells:['fire','gust','ambush','feint','fireWall']},
 mountedMastermind:{name:'기마귀모',role:'기마책사 3단계 · 전장을 누비며 책략을 연계한다',base:'strategist',tint:0xaebfff,spells:['fire','gust','ambush','feint','fireWall','chainFire']},
 mountedSage:{name:'기마신산',role:'기마책사 4단계 · 부채 책략의 정점',base:'strategist',tint:0xe0e6ff,spells:['fire','gust','ambush','feint','fireWall','chainFire','skyFire']},
 pirateRaider:{name:'수적',role:'해적 2단계 · 빠른 곡도 습격병',base:'navy',tint:0x55b8b5,spells:[]},
 pirateCaptain:{name:'해적두령',role:'해적 3단계 · 갑옷과 곡도를 갖춘 우두머리',base:'navy',tint:0x3b9898,spells:[]},
 pirateAdmiral:{name:'해왕',role:'해적 4단계 · 곡도술을 완성한 전설의 해적',base:'navy',tint:0x2e7f86,spells:[]},
 thunderGod:{name:'뇌신',role:'도사 3단계 · 벼락을 부리는 원소 책략의 정점',base:'taoist',tint:0xe6f8ff,spells:['fire','gust','windDragon','flood','waterSurge','thunder','whirlwind','tempest','thunderbolt','gale','mire','tidalLine','thunderCross','quake']},
 // 명부대 — 정사·연의에 이름을 남긴 부대
 xiliang:{name:'서량기병',role:'이동 7 · 거친 서쪽 말의 돌격 기병',base:'cavalry',tint:0xe8c890,spells:[]},
 ...CHART_ROLES,
};
export const supportOptions:UnitClass[]=['infantry','fengshui','strategist','shaman','maiden','taoist','monk','horseArcher','bandit','spearman','crossbow','archer','cavalry','heavyCav','catapult','ram','engineer'];
/** 병종이 쓰는 책략·특수기(계통별, class-spells.ts). 쓸 것이 없는 병종(민중)은 undefined. */
export function troopStrategies(kind:UnitClass,level:number){const l=classSpells(kind,level);return l.length?l:undefined;}
export function visualClass(kind:UnitClass){return troopRoles[kind]?.base??kind;}
export const classNames:Record<string,string>={infantry:'보병',spearman:'창병',cavalry:'경기병',heavyCav:'중기병',archer:'궁병',crossbow:'노병',strategist:'책사',fengshui:'풍수사',ram:'충차',catapult:'포차',engineer:'공병',navy:'수군',civilian:'민중',...Object.fromEntries(Object.entries(troopRoles).map(([k,v])=>[k,v.name]))};
/** The class whose sprite a unit is drawn with: extended classes borrow their lineage's art. */
export function artClass(kind:UnitClass):UnitClass{return VARIANTS[kind]?(troopRoles[kind]?.base??familyOf(kind)):kind;}
/** Every class a player can field, by tier: for codex and recruiting. */
export const recruitPool:UnitClass[]=['infantry','spearman','cavalry','archer','crossbow','strategist','fengshui','horseArcher','heavyCav','assassin','rattan','elephant','monk','taoist','bandit','xiliang','yellowTurban','mountedStrategist','pirate',
 // 병종 차트로 늘린 계통과 모병 특수 병과
 'swordsman','lord','commander','dancer','mountainCav','valiantCav','lightChariot','crownPrince','transport','nanmanRider','gaemaWarrior','halberdCav','wheelSage',
 'ytArcher','ytSpear','ytBrawler','nanmanFoot','northFoot','northRider','palanquin','baguaChariot','flyingBlade','bashuRepeater'];

// 반응(피격) 전용 옛 시트 4장은 지웠다: 모든 병종이 4단계 시트의 피격 칸을 쓴다. 남은 술사·특기 시트는 이야기 무대 인물용이다.
export const troopSheets=[...paintedTroopSheets,...officerModelSheets,{id:'casters',url:'troops-casters-v1.webp',rows:3},{id:'specialists',url:'troops-specialists-v1.webp',rows:4},{id:'casters-walk',url:'troops-casters-walk-v1.webp',rows:3},{id:'specialists-walk',url:'troops-specialists-walk-v1.webp',rows:4}] as const;
export const troopArt:Partial<Record<UnitClass,{sheet:'casters'|'specialists';row:number;rows:number}>>={shaman:{sheet:'casters',row:0,rows:3},maiden:{sheet:'casters',row:1,rows:3},taoist:{sheet:'casters',row:2,rows:3},monk:{sheet:'specialists',row:1,rows:4},horseArcher:{sheet:'specialists',row:2,rows:4},bandit:{sheet:'specialists',row:3,rows:4}};

export const basicReactionArt:Partial<Record<UnitClass,{sheet:string;row:number;rows:number}>>={
 infantry:{sheet:'base-reaction',row:0,rows:6},spearman:{sheet:'base-reaction',row:1,rows:6},archer:{sheet:'base-reaction',row:2,rows:6},cavalry:{sheet:'base-reaction',row:3,rows:6},strategist:{sheet:'base-reaction',row:4,rows:6},catapult:{sheet:'base-reaction',row:5,rows:6},crossbow:{sheet:'extra-reaction',row:0,rows:4},heavyCav:{sheet:'extra-reaction',row:1,rows:4},engineer:{sheet:'extra-reaction',row:2,rows:4},fengshui:{sheet:'extra-reaction',row:3,rows:4}
};

/** 진화 계통 줄: [병종, 진화 레벨(첫 병종은 0)] 목록. 도감과 원정 안내가 쓴다. */
export function evolutionLines():Array<Array<[UnitClass,number]>>{
  const targets=new Set(Object.values(EVOLUTION).map(e=>e![0]));
  return (Object.keys(EVOLUTION) as UnitClass[]).filter(c=>!targets.has(c)).map(root=>{
    const line:Array<[UnitClass,number]>=[[root,0]];let cur=root;
    for(let next=EVOLUTION[cur];next;next=EVOLUTION[cur]){line.push([next[0],next[1]]);cur=next[0];}
    return line;
  });
}

/**
 * 병종 전용 채색 시트 — public/troops/manifest.json에 {"병종 id":"파일"}로 적힌 그림.
 * 한 장은 4칸×3줄(기존 시트와 같은 화풍·크기): 0줄 행동(대기·걸음·공격·특기), 1줄 걷기(앞A·앞B·뒤A·뒤B), 2줄 반응(막기A·막기B·맞음A·맞음B).
 * 옷의 주색은 기본 병사 시트처럼 파랑으로 그린다(진영 색으로 물들인다). 시트가 없는 병종은 지금처럼 계열 그림을 쓴다.
 */
export const classSheets=new Map<UnitClass,string>();
let classSheetsReady:Promise<void>|null=null;
export function loadClassSheets(base=''){
  classSheetsReady??=(async()=>{try{const r=await fetch(base+'troops/manifest.json',{cache:'no-cache'});if(!r.ok)return;const m=await r.json() as Record<string,unknown>;
    for(const [k,v] of Object.entries(m))if(typeof v==='string'&&/^[\w.-]+\.(png|webp)$/i.test(v)&&k in classNames)classSheets.set(k as UnitClass,base+'troops/'+v);}catch{/* 목록이 없어도 된다 */}})();
  return classSheetsReady;
}
/** 행동·걷기·반응 그림이 따로 있는 병종(전용 시트 또는 술사·특수병 시트) */
export const hasPaintedMotion=(c:UnitClass)=>classSheets.has(c)||!!paintedTroopArt[c]||!!troopArt[artClass(c)];
