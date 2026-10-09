/**
 * 연의 장수록 — 『삼국지연의』의 묘사를 바탕으로 이 게임이 직접 매긴 장수 능력.
 *
 * 다섯 능력(1~100): 무력(일기토·물리 공격), 지력(책략·설전), 통솔(방어·체력),
 * 정치(정신), 매력(사기). 50이 병종 기본치이고, 높을수록 같은 병종·레벨의 졸병보다 강하다.
 * 기준점: 무력 100은 여포 한 사람, 지력 100은 제갈량 한 사람. 다른 장수는 연의 속 위상에 따라
 * 그 아래에 놓는다(마초·허저·조운 96, 황충 93 / 사마의·주유 96, 육손 95, 조조 91).
 * 연의에 이름난 일화가 있는 장수는 그 일화에서 딴 고유능력(특성)을 하나 가진다.
 */
import type {Unit} from '../../core/src/index.ts';
import {tierOf} from '../../core/src/index.ts';
import type {Temper} from './duel.ts';

export interface RomanceSkill {name:string;description:string;trait:string;param?:number}
export interface RomanceOfficer {
  name:string;
  /** 연의 속 별호나 한 줄 인물평 */
  epithet:string;
  war:number;int:number;lead:number;pol:number;cha:number;
  skill?:RomanceSkill;
}
const o=(name:string,epithet:string,[war,int,lead,pol,cha]:[number,number,number,number,number],skill?:RomanceSkill):RomanceOfficer=>({name,epithet,war,int,lead,pol,cha,...(skill?{skill}:{})});

/** 장수 id → 연의 능력. 이름으로 찾는 원정 우두머리는 아래 byName이 맡는다. */
export const romance:Record<string,RomanceOfficer>={
  // 사마씨 일가와 조진 (아군)
  sima_yi:o('사마의','총에 숨은 이리 · 때를 기다린 자',[63,96,98,93,80]),
  sima_lang:o('사마랑','백달 · 사마팔달의 맏이',[38,76,56,82,78]),
  sima_fang:o('사마방','엄정한 가장 · 경조윤',[42,72,60,80,72]),
  cao_zhen:o('조진','조씨 종실의 대들보',[82,60,84,52,70]),
  sima_shi:o('사마사','자원 · 침착한 맏아들',[72,85,84,80,72]),
  sima_zhao:o('사마소','자상 · 그 마음은 길 가는 사람도 안다',[64,83,80,88,76]),
  // 위
  cao_cao:o('조조','치세의 능신, 난세의 간웅',[72,91,99,94,96]),
  xu_chu:o('허저','호치 · 웃통 벗고 마초와 싸운 장사',[96,36,64,20,62],{name:'호치의 호위',description:'인접 아군의 피해를 대신 받는다',trait:'guardian'}),
  cao_pi:o('조비','위 문제 · 칠보시의 형',[70,76,72,82,74]),
  zhang_he:o('장합','교변의 명장 · 가정에서 마속을 꺾다',[89,70,88,57,70],{name:'교변',description:'반격 위력 20% 증가',trait:'counterBoost',param:20}),
  guo_huai:o('곽회','옹주를 지킨 노장',[74,78,84,72,70]),
  cao_xiu:o('조휴','천리구 · 석정에서 꾀에 빠지다',[76,58,74,52,66]),
  cao_shuang:o('조상','고평릉에서 모든 것을 잃은 대장군',[48,38,46,42,52]),
  wang_ling:o('왕릉','수춘에서 일어난 노신',[72,74,80,76,76]),
  meng_da:o('맹달','세 번 주인을 바꾼 신성 태수',[76,66,72,58,46]),
  yang_ang:o('양앙','장로의 양평관 수비장',[70,38,60,28,40]),
  // 여포와 그 무리 (꿈속의 환영)
  lu_bu:o('여포','인중여포 마중적토 · 비장',[100,26,90,13,40],{name:'비장의 무위',description:'물리 공격 피해 18% 증가',trait:'flyingGeneral'}),
  chen_gong:o('진궁','조조를 버린 지모의 선비',[45,88,74,78,68],{name:'냉철한 간파',description:'받는 책략 피해 15% 감소',trait:'strategicGuard'}),
  zhou_yu:o('주유','미주랑 · 적벽의 화공',[74,96,97,86,93],{name:'적벽의 화공',description:'책략 공격 피해 12% 증가',trait:'zhouStrategy'}),
  // 서량·촉
  ma_chao:o('마초','금마초 · 서량의 비단 갑옷',[96,42,88,26,82],{name:'서량의 맹장',description:'물리 공격 피해 10% 증가',trait:'westernValor'}),
  huang_zhong:o('황충','정군산의 노장 · 노익장',[93,60,84,52,74],{name:'노익장',description:'적 방어 20% 무시',trait:'penetrate',param:20}),
  zhao_yun:o('조운','상산 조자룡 · 장판의 단기필마',[96,76,91,65,90],{name:'단기필마',description:'체력 절반 이하에서 받는 피해 25% 감소',trait:'veteran',param:25}),
  ma_su:o('마속','재주가 말보다 앞선 자',[62,82,62,72,66]),
  wang_ping:o('왕평','가정에서 마속을 말린 부장',[77,70,82,52,62]),
  wei_yan:o('위연','반골의 맹장 · 자오곡 기계',[92,62,84,40,50],{name:'반골의 용맹',description:'물리 공격 피해 12% 증가',trait:'physicalPower',param:12}),
  gao_xiang:o('고상','촉의 군량 수송장',[64,48,62,40,50]),
  meng_yan:o('맹염','오장원의 촉 장수',[68,46,62,36,46]),
  jiang_wei:o('강유','천수의 기린아 · 제갈량의 후계',[89,90,92,68,82],{name:'기린아',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  wooden_zhuge:o('제갈량','와룡 · 죽은 제갈이 산 중달을 쫓다',[38,100,98,98,98],{name:'팔진도',description:'받는 책략 피해 25% 감소',trait:'strategyDamageReduction',param:25}),
  // 오
  sun_quan:o('손권','벽안자염 · 강동의 주인',[66,80,82,86,95],{name:'강동 수성',description:'받는 물리 피해 10% 감소',trait:'commandDefense'}),
  zhang_zhao:o('장소','오의 원로 · 내사는 장소에게',[18,82,40,92,74]),
  zhuge_jin:o('제갈근','제갈량의 형 · 온후한 사신',[36,80,60,84,84]),
  lu_meng:o('여몽','괄목상대 · 백의도강',[81,89,91,76,82],{name:'백의도강',description:'적 방어 20% 무시',trait:'penetrate',param:20}),
  lu_fan:o('여범','손책 이래의 수군 원로',[56,72,70,78,66]),
  sun_shao:o('손소','강노를 이끈 오의 장수',[78,60,76,48,64]),
  zhang_ba:o('장패','태산의 호족 출신 장수',[82,52,76,40,60]),
  lu_xun:o('육손','이릉의 화공 · 서생 대도독',[66,95,96,88,88],{name:'이릉의 화공',description:'책략 공격 피해 15% 증가',trait:'strategyPower',param:15}),
  zhu_ran:o('주연','강릉을 지킨 오의 맹장',[76,62,80,52,64]),
  zhuge_ke:o('제갈각','재주가 넘친 제갈근의 아들',[50,88,74,72,58]),
  dai_ling:o('대릉','오장원의 위 장수',[70,50,66,38,50]),
  gao_shou:o('고수','결사대를 이끈 장수',[72,40,60,30,44]),
  // 요동 공손씨
  gongsun_yuan:o('공손연','연왕을 칭한 요동의 주인',[62,58,66,60,48]),
  bi_yan:o('비연','공손연의 대장',[72,50,70,40,50]),
};

/** 원정 우두머리·가상 전장의 적장처럼 id가 정해지지 않은 장수는 이름으로 찾는다. */
const byName:Record<string,RomanceOfficer>={
  ...Object.fromEntries(Object.values(romance).map(r=>[r.name,r])),
  안량:o('안량','원소의 하북 명장 · 백마에서 관우에게 베이다',[93,32,80,22,52],{name:'하북 명장',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  // 초한 — 사백 년 전, 진이 무너진 뒤 천하를 다툰 선대 영웅들(인물열전·계승)
  항우:o('항우','서초패왕 · 역발산 기개세',[100,58,96,36,84],{name:'역발산',description:'물리 공격 피해 20% 증가',trait:'physicalPower',param:20}),
  유방:o('유방','한 고조 · 패현의 정장',[66,70,80,86,100],{name:'관인대도',description:'받는 물리 피해 10% 감소',trait:'commandDefense'}),
  장량:o('장량','자방 · 장막 안에서 천 리 밖을 이긴 책사',[32,99,82,88,86],{name:'운주유악',description:'책략 공격 피해 15% 증가',trait:'strategyPower',param:15}),
  한신:o('한신','국사무쌍 · 배수진의 병선',[80,94,100,62,64],{name:'배수진',description:'체력이 낮을수록 공격력 상승(최대 25%)',trait:'lastStand',param:25}),
  소하:o('소하','한의 상국 · 관중을 지킨 재상',[24,90,72,99,88],{name:'관중 경영',description:'받는 책략 피해 15% 감소',trait:'strategyDamageReduction',param:15}),
  범증:o('범증','아부 · 항우의 늙은 책사',[30,95,74,80,58],{name:'옥결',description:'책략 공격 피해 12% 증가',trait:'strategyPower',param:12}),
  우희:o('우희','우미인 · 패왕과 이별한 여인',[30,64,42,62,96],{name:'검무',description:'적 명중 15%p 감소',trait:'evasionBoost',param:15}),
  영포:o('영포','경포 · 얼굴에 먹 글씨가 새겨진 맹장',[92,48,82,30,60],{name:'경형의 맹장',description:'물리 공격 피해 12% 증가',trait:'physicalPower',param:12}),
  팽월:o('팽월','양 땅을 휘저은 유격의 명수',[84,72,80,50,66],{name:'유격',description:'움직인 뒤 물리 공격 피해 15% 증가',trait:'chargePower',param:15}),
  번쾌:o('번쾌','홍문연에 뛰어든 개백정 용사',[93,40,74,36,74],{name:'홍문의 방패',description:'인접 아군의 피해를 대신 받는다',trait:'guardian'}),
  진평:o('진평','여섯 번의 기계',[40,94,64,86,70],{name:'반간계',description:'적 책략 명중 15%p 감소',trait:'strategyEvasion',param:15}),
  종리매:o('종리매','항우의 골육 같은 명장',[88,62,82,44,62]),
  계포:o('계포','계포일낙 · 한 번 한 약속은 천금',[82,56,80,58,82],{name:'일낙천금',description:'체력 절반 이하에서 받는 피해 20% 감소',trait:'veteran',param:20}),
  용저:o('용저','초의 맹장 · 유수에서 한신에게 지다',[90,40,80,30,52]),
  조참:o('조참','소규조수 · 소하를 이은 상국',[80,72,84,88,74]),
  관영:o('관영','낭중기를 이끈 기병장',[86,58,84,52,66],{name:'낭중 돌격',description:'움직인 뒤 물리 공격 피해 12% 증가',trait:'chargePower',param:12}),
  // 가상 시나리오(운명의 갈림길)에만 나오는 장수
  방통:o('방통','봉추 · 연환계의 주인',[34,97,80,85,70],{name:'연환계',description:'책략 공격 피해 10% 증가',trait:'strategyPower',param:10}),
  황개:o('황개','고육계의 노장',[83,68,80,58,74]),
  감녕:o('감녕','금범적 · 백 기로 위 진영을 친 장수',[94,70,86,40,64],{name:'백기 야습',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  유비:o('유비','인덕의 군주 · 한중왕',[76,76,82,78,99],{name:'인덕',description:'받는 물리 피해 10% 감소',trait:'commandDefense'}),
  하후돈:o('하후돈','외눈의 맹장 · 조조의 맏형 같은 장수',[90,58,86,60,80],{name:'발시담정',description:'체력 절반 이하에서 받는 피해 20% 감소',trait:'veteran',param:20}),
  하후연:o('하후연','질풍의 장수 · 사흘에 오백 리',[91,56,84,44,70]),
  원담:o('원담','원소의 맏아들',[68,48,62,40,52]),
  고람:o('고람','원씨의 하북 명장',[80,50,74,40,52]),
  조식:o('조식','칠보시의 공자 · 시를 사랑한 왕',[24,90,40,72,86]),
  조예:o('조예','위 명제 · 영민한 황제',[42,84,74,82,78]),
  학소:o('학소','진창을 지킨 장수',[78,74,90,56,68],{name:'진창 수성',description:'받는 물리 피해 10% 감소',trait:'commandDefense'}),
  맹획:o('맹획','남만왕 · 일곱 번 사로잡힌 자',[87,42,76,44,80],{name:'남만왕',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  축융:o('축융','남만왕의 아내 · 비도의 명수',[82,48,70,30,72]),
  올돌골:o('올돌골','오과국 왕 · 등갑군의 주인',[88,22,70,10,40],{name:'등갑',description:'물리 피해 20% 감소',trait:'physicalDamageReduction',param:20}),
  노숙:o('노숙','동오의 대국을 본 자',[56,92,84,90,88]),
  봉기:o('봉기','원씨의 직언가',[40,80,60,72,58]),
  순욱:o('순욱','왕좌지재 · 조조의 장자방',[24,96,64,98,90],{name:'왕좌지재',description:'받는 책략 피해 15% 감소',trait:'strategicGuard'}),
  장비:o('장비','연인 장익덕 · 장판교의 일갈',[97,40,82,30,48],{name:'장판교의 일갈',description:'물리 공격 피해 15% 증가',trait:'physicalPower',param:15}),
  관우:o('관우','미염공 · 청룡언월도의 무성',[97,75,95,62,93],{name:'청룡언월도',description:'물리 공격 피해 15% 증가',trait:'physicalPower',param:15}),
  장료:o('장료','합비의 귀신 · 요래요래',[92,78,91,58,78],{name:'요래요래',description:'적 방어 15% 무시',trait:'penetrate',param:15}),
  원상:o('원상','원소의 셋째 아들 · 하북의 후계',[72,58,70,52,74]),
  심배:o('심배','원씨의 충신 · 업성의 마지막 수비장',[48,84,78,72,70],{name:'업성 사수',description:'받는 물리 피해 10% 감소',trait:'commandDefense'}),
  고간:o('고간','원소의 조카 · 병주 자사',[70,52,68,48,54]),
  답돈:o('답돈','오환의 선우 · 백랑산의 기병',[84,40,78,30,62],{name:'오환 돌기',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  조인:o('조인','조조의 종제 · 번성을 끝까지 지킨 장수',[86,58,88,50,72],{name:'철벽 수성',description:'받는 물리 피해 10% 감소',trait:'commandDefense'}),
  서황:o('서황','주아부의 풍모 · 관우를 물리친 위의 명장',[90,64,84,50,66],{name:'장구한 포위',description:'적 방어 15% 무시',trait:'penetrate',param:15}),
  우금:o('우금','엄정한 위의 오자양장 · 번성에서 칠군을 잃다',[74,62,82,48,56]),
  환범:o('환범','지낭 · 조상의 꾀주머니',[30,84,40,80,60]),
  하안:o('하안','부분 바른 미남 · 조상의 심복',[20,76,30,70,68]),
  조희:o('조희','조상의 아우 · 중령군',[60,40,55,40,48]),
  // 원정에서 영입하는 위의 인재들
  등애:o('등애','음평의 기습 · 촉을 멸한 장수',[87,89,90,70,66],{name:'음평 기습',description:'적 방어 15% 무시',trait:'penetrate',param:15}),
  진태:o('진태','진군의 아들 · 옹주를 지킨 장수',[78,78,84,72,72]),
  종회:o('종회','촉 정벌의 지휘관 · 야심가',[60,92,80,82,64],{name:'사본론',description:'책략 공격 피해 10% 증가',trait:'strategyPower',param:10}),
  손례:o('손례','맨손으로 범을 막은 장수',[80,58,78,62,64]),
  왕기:o('왕기','관구검의 난을 막은 장수',[72,74,80,70,64]),
  문흠:o('문흠','수춘에서 난을 일으킨 맹장',[84,40,70,30,46],{name:'수춘 돌파',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  가규:o('가규','예주를 다스린 충신',[64,78,76,84,72]),
  호준:o('호준','사마의의 오랜 부장',[74,56,76,52,62]),
  // 시나리오(가상)에서 만나는 인물들
  문추:o('문추','하북의 맹장 · 안량의 짝',[92,30,78,22,52],{name:'하북 명장',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  견초:o('견초','조조 휘하의 기병장',[72,48,66,40,52]),
  전주:o('전주','무종의 은사 · 백랑산의 길잡이',[70,76,72,70,74]),
  저수:o('저수','원소의 감군 · 바른 말의 책사',[38,92,82,86,72],{name:'감군',description:'책략 공격 피해 10% 증가',trait:'strategyPower',param:10}),
  채모:o('채모','형주 수군의 대도독',[72,66,78,62,54]),
  전풍:o('전풍','강직한 원소의 모사',[30,93,70,88,64],{name:'직간',description:'받는 책략 피해 15% 감소',trait:'strategicGuard'}),
  가후:o('가후','독사 · 계책은 버리지 않는다',[42,97,80,90,62],{name:'난무',description:'책략 공격 피해 12% 증가',trait:'strategyPower',param:12}),
  서서:o('서서','단복 · 유비를 떠난 효자',[66,92,80,80,82],{name:'팔문금쇄 간파',description:'받는 책략 피해 15% 감소',trait:'strategicGuard'}),
  사마부:o('사마부','숙달 · 사마의의 아우',[48,80,72,90,82]),
  양준:o('양준','하내의 명사',[36,78,60,84,78]),
  양수:o('양수','계륵 · 재주가 넘친 주부',[30,92,52,74,70]),
  조창:o('조창','황수아 · 조조의 날랜 아들',[90,40,80,34,70],{name:'황수아',description:'물리 공격 피해 10% 증가',trait:'physicalPower',param:10}),
  만총:o('만총','합비 신성의 수장',[66,82,86,84,70]),
  문빙:o('문빙','강하를 지킨 형주의 장수',[80,62,84,56,70]),
  가충:o('가충','사마씨의 심복',[50,82,64,78,52]),
  석포:o('석포','정위의 장수',[78,68,80,60,64]),
  관평:o('관평','관우의 양자',[82,60,76,48,72]),
  유봉:o('유봉','유비의 양자',[80,46,68,40,54]),
  마대:o('마대','마초의 사촌 · 위연을 벤 자',[82,52,74,42,62]),
  관색:o('관색','관우의 셋째 아들',[84,52,70,40,72]),
  장제:o('장제','태위 · 사마의의 벗',[40,86,70,86,74]),
  왕관:o('왕관','엄정한 관리',[56,72,68,84,60]),
  왕찬:o('왕찬','건안칠자의 으뜸 · 등루부의 문사',[20,86,30,80,72]),
  왕창:o('왕창','형주를 지킨 위의 장수',[70,74,82,76,70]),
  황권:o('황권','촉에서 위로 온 충신',[66,82,78,80,78]),
  조홍:o('조홍','조조의 사촌 · 재물을 아낀 장수',[82,46,76,40,58]),
  악진:o('악진','선봉의 작은 거인',[84,48,76,40,62]),
  정봉:o('정봉','눈 속의 단병 돌격',[84,56,76,40,64]),
  하후패:o('하후패','하후연의 아들',[86,52,78,40,62]),
  하후무:o('하후무','청강의 부마',[46,40,40,38,50]),
  타사대왕:o('타사대왕','독천의 주인',[74,52,70,30,46]),
  목록대왕:o('목록대왕','팔납동의 주인 · 맹수를 부리는 남만왕',[76,58,70,28,44]),
  전종:o('전종','오의 수군 대장',[74,68,78,62,66]),
  서성:o('서성','거짓 성벽의 주인',[82,72,82,58,66]),
  조우:o('조우','연왕 · 조예의 숙부',[46,64,56,70,70]),
  원희:o('원희','원소의 둘째 아들',[64,52,62,48,58]),
};
/** 가짜(미끼)는 진짜의 이름을 달고 있어도 능력이 없다. */
const DECOYS=new Set(['decoy']);
export function romanceOf(u:{id:string;name:string}):RomanceOfficer|undefined{
  if(DECOYS.has(u.id))return undefined;
  // 우두머리·가상 전장 적장, 원정 부대의 장수(id 'of…')는 이름으로 찾는다.
  return romance[u.id]??(u.id==='boss'||u.id==='target'||/^of\d+$/.test(u.id)?byName[u.name]:undefined);
}
/** 영입 화면에 보이는 한 줄 능력: 무력·지력·통솔. */
export function romanceStats(name:string){const r=byName[name];return r?`무력 ${r.war} · 지력 ${r.int} · 통솔 ${r.lead}`:'';}
/** 이름으로 찾는 연의 능력(장수 카드용). */
export const romanceByName=(name:string)=>byName[name];
/** 연의 장수록에 오른 모든 이름(신장수 포함). */
export const allRomanceNames=()=>Object.keys(byName);

const scale=(r:number,span:number)=>1+(r-50)/50*span;
/** 고유능력 수치의 진화 단계 배율. */
export const SKILL_TIER=[1,1.25,1.5,1.75] as const;
export const skillParam=(param:number,tier:number)=>Math.round(param*SKILL_TIER[Math.max(1,Math.min(4,tier))-1]!);
/**
 * 연의 능력을 유닛에 입힌다(한 번만). 무력→공격, 지력→지력, 통솔→방어·체력,
 * (지력+정치)/2→정신, 매력→사기. 체력·책략 비율은 유지한다.
 */
export function applyRomance(u:Unit,stats=true):boolean{
  const r=romanceOf(u);if(!r)return false;
  if(!stats){if(r.skill&&!u.traits.includes(r.skill.trait)){u.traits.push(r.skill.trait);if(r.skill.param!==undefined)u.traitParams[r.skill.trait]=skillParam(r.skill.param,tierOf(u.unitClass));}return true;}
  const hp=u.hp/Math.max(1,u.stats.maxHp),s=u.stats;
  s.attack=Math.max(1,Math.round(s.attack*scale(r.war,.15)));
  s.intellect=Math.max(1,Math.round(s.intellect*scale(r.int,.15)));
  s.defense=Math.max(1,Math.round(s.defense*scale(r.lead,.1)));
  s.spirit=Math.max(1,Math.round(s.spirit*scale((r.int+r.pol)/2,.1)));
  s.maxHp=Math.max(1,Math.round(s.maxHp*scale(r.lead,.06)));
  s.morale=Math.round(40+r.cha*.2);
  u.hp=Math.max(1,Math.round(s.maxHp*hp));
  // 고유능력은 병종이 진화할수록 강해진다(수치가 있는 능력만: 1단계 ×1 · 2단계 ×1.25 · 3단계 ×1.5).
  if(r.skill&&!u.traits.includes(r.skill.trait)){u.traits.push(r.skill.trait);if(r.skill.param!==undefined)u.traitParams[r.skill.trait]=skillParam(r.skill.param,tierOf(u.unitClass));}
  return true;
}

/** 일기토 무력: 연의 무력에 레벨을 더한다(연의에 없는 장수는 공격력으로 어림). */
export function romanceWar(u:Unit):number|undefined{const r=romanceOf(u);return r?r.war:undefined;}
/** 설전 지력: 연의 지력(연의에 없는 장수는 undefined). */
export function romanceInt(u:Unit):number|undefined{const r=romanceOf(u);return r?r.int:undefined;}

/** 연의 속 성격(일기토·설전에 응하는 방식). 적어 두지 않은 장수는 능력으로 어림한다. */
const TEMPERS:Record<string,Temper>={
  여포:'reckless',허저:'reckless',맹획:'reckless',올돌골:'reckless',답돈:'reckless',문흠:'reckless',
  마초:'brave',조운:'brave',장료:'brave',감녕:'brave',하후돈:'brave',하후연:'brave',강유:'brave',황충:'brave',안량:'brave',조진:'brave',손례:'brave',축융:'brave',고람:'brave',
  관우:'proud',위연:'proud',진궁:'proud',주유:'proud',조조:'proud',방통:'proud',마속:'proud',종회:'proud',조식:'proud',원상:'proud',
  문추:'brave',조창:'reckless',하후패:'brave',악진:'brave',정봉:'brave',
  가후:'wise',전풍:'wise',저수:'wise',서서:'wise',
  장합:'calm',서황:'calm',유비:'calm',노숙:'calm',여몽:'calm',등애:'calm',곽회:'calm',학소:'calm',진태:'calm',
  조인:'cautious',우금:'cautious',손권:'cautious',조비:'cautious',조예:'cautious',심배:'cautious',왕릉:'cautious',
  사마의:'wise',제갈량:'wise',순욱:'wise',육손:'wise',환범:'wise',가규:'wise',
  조상:'timid',하안:'timid',조희:'timid',원담:'timid',
  항우:'proud',유방:'calm',장량:'wise',한신:'proud',소하:'cautious',범증:'wise',우희:'calm',영포:'reckless',팽월:'brave',번쾌:'reckless',진평:'wise',종리매:'brave',계포:'calm',용저:'reckless',조참:'calm',관영:'brave',
};
/** 신장수: 플레이어가 만든 장수를 장수록에 올린다(능력·성격이 전투·설득·무대에 그대로 쓰인다). */
export function registerOfficer(r:RomanceOfficer,temper?:Temper){byName[r.name]=r;if(temper)TEMPERS[r.name]=temper;else delete TEMPERS[r.name];}
export function unregisterOfficer(name:string){delete byName[name];delete TEMPERS[name];}
export function temperOf(name:string):Temper|undefined{
  if(TEMPERS[name])return TEMPERS[name];const r=byName[name];if(!r)return undefined;
  return r.int>=85&&r.war<75?'wise':r.war>=85?'brave':r.lead<55&&r.war<60?'timid':r.war>=78?'proud':'calm';
}
