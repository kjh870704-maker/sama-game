import type {Growth} from './progression.ts';
import type {StrategyDef,Unit} from '../../core/src/index.ts';
import {capArea} from '../../core/src/index.ts';
import {romanceInt,romanceWar} from './romance.ts';
export const officerFeatures:Record<string,{name:string;description:string;trait:string;strength:number}>={
  sima_yi:{name:'은인자중',description:'책략 피해 15% 감소 · 매 턴 MP 3 회복',trait:'simaPatience',strength:30},
  cao_zhen:{name:'선봉 지휘',description:'물리 공격 피해 12% 증가',trait:'caoVanguard',strength:78},
  sima_lang:{name:'가문의 방패',description:'물리 피해 15% 감소',trait:'familyShield',strength:62},
  sima_fang:{name:'엄정한 수비',description:'물리 피해 15% 감소',trait:'familyShield',strength:67},
  cao_cao:{name:'위기 관리',description:'받는 물리 피해 10% 감소',trait:'commandDefense',strength:72},
  xu_chu:{name:'호위의 맹세',description:'인접 아군의 피해를 대신 받음 · 관통 공격 제외',trait:'guardian',strength:96},
  ma_chao:{name:'서량의 맹장',description:'물리 공격 피해 10% 증가',trait:'westernValor',strength:95},
  yang_ang:{name:'전초 수비',description:'받는 물리 피해 10% 감소',trait:'commandDefense',strength:74},
  zhang_lu:{name:'성채 수비',description:'받는 물리 피해 10% 감소',trait:'commandDefense',strength:64},
  chen_gong:{name:'냉철한 간파',description:'받는 책략 피해 15% 감소',trait:'strategicGuard',strength:50},
  lu_bu:{name:'비장의 무위',description:'물리 공격 피해 18% 증가',trait:'flyingGeneral',strength:99},
  zhou_yu:{name:'주랑의 계책',description:'책략 공격 피해 12% 증가',trait:'zhouStrategy',strength:70},
};
export interface Talent {name:string;description:string;trait:string;level:number;requirement:string;ready:boolean}
export function talentTree(id:string,level:number,growth:Growth):Talent[]{const f=officerFeatures[id];if(!f)return [];return [
 {name:f.name,description:f.description,trait:f.trait,level:3,requirement:'Lv.3 · 본편 1승',ready:level>=3&&growth.storyWins>=1},
 {name:{sima_yi:'정중동',cao_zhen:'철벽 선봉',sima_lang:'후방의 버팀목',sima_fang:'노장의 침착'}[id]??'전장의 단련',description:'물리 피해 10% 감소',trait:'commandDefense',level:6,requirement:'첫 특성 해금 · Lv.6 · 수련 3승',ready:level>=6&&growth.storyWins>=1&&growth.trainingWins>=3},
 {name:{sima_yi:'심모원려',cao_zhen:'상승장군',sima_lang:'가문의 기둥',sima_fang:'병법의 전수'}[id]??'대가의 경지',description:id==='sima_yi'?'책략 공격 피해 12% 증가':'물리 공격 피해 10% 증가',trait:id==='sima_yi'?'zhouStrategy':'westernValor',level:10,requirement:'둘째 특성 해금 · Lv.10 · 보물 외전 3개 완료',ready:level>=10&&growth.storyWins>=1&&growth.trainingWins>=3&&growth.questWins>=3},
 ];}
export function applyOfficerFeatures(units:Unit[],growth?:Growth){for(const u of units){const feature=officerFeatures[u.id];if(!feature)continue;const ids=growth&&['sima_yi','cao_zhen','sima_lang','sima_fang'].includes(u.id)?talentTree(u.id,u.level,growth).filter(t=>t.ready).map(t=>t.trait):growth&&u.level<4?[]:[feature.trait];for(const trait of ids)if(!u.traits.includes(trait))u.traits.push(trait);}}
/** 일기토 무력: 연의 장수록의 무력, 없으면 고유 특성의 무력, 그것도 없으면 공격력으로 어림. */
export function martialPower(u:Unit){return (romanceWar(u)??officerFeatures[u.id]?.strength??Math.min(95,40+u.stats.attack))+u.level;}
/** 설전 지력: 연의 지력에 레벨을 더한다(연의에 없는 장수는 전투 지력으로 어림). */
export function debatePower(u:Unit){return (romanceInt(u)??Math.min(95,40+u.stats.intellect))+u.level;}
export type SupportEffect='heal'|'cleanse'|'guard'|'haste'|'rally'|'mana'|'valor'|'again';
export type LearnedStrategy=StrategyDef&{level:number;support?:SupportEffect};
export const learnedStrategies:LearnedStrategy[]=[
  {id:'fire',name:'화계',level:1,element:'fire',shape:'single',range:3,radius:0,mpCost:6,power:100,inflicts:['burn'],targetSides:['enemy']},
  {id:'windDragon',name:'풍룡',level:3,element:'wind',shape:'spread',range:4,radius:1,mpCost:10,power:105,targetSides:['enemy']},
  {id:'bind',name:'속박',level:5,element:'earth',shape:'single',range:4,radius:0,mpCost:8,power:65,inflicts:['immobile'],targetSides:['enemy']},
  {id:'confuse',name:'교란',level:7,element:'support',shape:'single',range:3,radius:0,mpCost:12,power:45,inflicts:['confusion'],targetSides:['enemy']},
  {id:'flood',name:'수계',level:10,element:'water',shape:'cross',range:4,radius:1,mpCost:15,power:135,targetSides:['enemy']},
  {id:'thunder',name:'낙뢰',level:14,element:'thunder',shape:'single',range:5,radius:0,mpCost:18,power:175,inflicts:['shock'],targetSides:['enemy']},
  {id:'inferno',name:'업화',level:20,element:'fire',shape:'spread',range:4,radius:2,mpCost:26,power:155,inflicts:['burn'],targetSides:['enemy']},
];
const more:LearnedStrategy[]=[
 ...([['embers','불씨',2,'fire',3,0,5,75,'burn'],['gust','돌풍',4,'wind',4,0,6,90,undefined],['ambush','매복',6,'earth',3,0,7,95,'bound'],['poison','독계',8,'earth',3,0,8,60,'bleed'],['silence','금언',9,'support',4,0,9,35,'seal'],['fireWall','화진',11,'fire',3,1,13,100,'burn'],['rockfall','낙석',12,'earth',4,0,12,140,undefined],['waterSurge','격류',13,'water',4,1,14,115,'immobile'],['feint','허보',15,'support',4,0,12,40,'confusion'],['whirlwind','회오리',16,'wind',5,1,16,130,undefined],['lightningNet','뇌진',17,'thunder',4,1,17,120,'shock'],['encircle','포위계',18,'earth',3,1,15,70,'bound'],['demoralize','이간',19,'support',4,1,18,45,'confusion'],['deluge','수룡',22,'water',5,2,23,140,undefined],['tempest','폭풍',24,'wind',5,2,25,150,undefined],['thunderbolt','천뢰',27,'thunder',5,0,24,185,'shock'],['grandFeint','공성계',30,'support',5,2,28,55,'confusion']] as const).map(([id,name,level,element,range,radius,mpCost,power,status])=>({id,name,level,element,range,radius,mpCost,power,shape:radius?'spread' as const:'single' as const,targetSides:['enemy' as const],...(status?{inflicts:[status]}:{})})),
 ...([['mend','소회복',2,6,0,'heal',25],['purify','정화',4,7,0,'cleanse',0],['fortify','견고',6,8,1,'guard',0],['march','강행',8,8,0,'haste',0],['inspire','고무',10,10,1,'rally',0],['greatMend','대회복',15,18,1,'heal',40]] as const).map(([id,name,level,mpCost,radius,support,power])=>({id,name,level,mpCost,radius,support,power,element:'support' as const,range:3,shape:radius?'spread' as const:'single' as const,targetSides:['player','ally','allyAi'] as Array<'player'|'ally'|'allyAi'>})),
];
/** 더 늘린 책략: 십자·직선 범위, 쇠약·파갑·둔화, 사기·MP 지원. [id,이름,습득Lv,속성,모양,사거리,반경,MP,위력,상태] */
const wider:LearnedStrategy[]=[
 ...([['weakenCurse','쇠약계',5,'support','single',4,0,8,50,'weaken'],['breakArmor','파갑계',7,'earth','single',3,0,9,70,'breach'],['rumor','유언',9,'support','spread',4,1,14,30,'confusion'],
  ['mire','진흙늪',11,'water','spread',4,1,13,80,'slow'],['terror','위압',12,'support','spread',3,1,12,30,'weaken'],['gale','질풍참',13,'wind','line',3,3,14,115,undefined],
  ['plague','역병',14,'earth','spread',3,1,14,55,'bleed'],['tidalLine','수공',18,'water','line',3,4,18,125,'immobile'],['chainFire','연환화계',21,'fire','line',3,4,22,135,'burn'],
  ['thunderCross','뇌격진',23,'thunder','cross',4,2,22,145,'shock'],['skyFire','천화',25,'fire','cross',4,2,25,150,'burn'],['quake','지진',26,'earth','spread',4,2,26,125,'slow'],
  ['shatter','괴멸계',29,'earth','spread',4,1,24,110,'breach'],['chaos','대혼란계',33,'support','spread',5,2,32,50,'confusion']] as const).map(([id,name,level,element,shape,range,radius,mpCost,power,status])=>({id,name,level,element,shape,range,radius,mpCost,power,targetSides:['enemy' as const],...(status?{inflicts:[status]}:{})} as LearnedStrategy)),
 ...([['warCry','함성',4,8,1,'rally',0],['focus','명상',9,2,0,'mana',18],['swiftWind','신속',12,12,1,'haste',0],['grandDrum','대고무',14,16,2,'rally',0],['ironWall','철벽',16,16,2,'guard',0],['valor','결사',18,12,0,'valor',0],['sanctuary','성역',24,26,2,'heal',35]] as const).map(([id,name,level,mpCost,radius,support,power])=>({id,name,level,mpCost,radius,support,power,element:'support' as const,range:3,shape:radius?'spread' as const:'single' as const,targetSides:['player','ally','allyAi'] as Array<'player'|'ally'|'allyAi'>})),
];
/** 초한 고사의 책략: 사백 년 전 영웅들의 이름난 계책. */
const legends:LearnedStrategy[]=[
 {id:'hongmen',name:'홍문연',level:16,element:'support',shape:'single',range:4,radius:0,mpCost:16,power:60,inflicts:['seal','confusion'],targetSides:['enemy']},
 {id:'secretPath',name:'암도진창',level:20,element:'support',shape:'spread',range:3,radius:2,mpCost:18,power:0,support:'haste',targetSides:['player','ally','allyAi']},
 {id:'burnBoats',name:'파부침주',level:22,element:'support',shape:'spread',range:3,radius:1,mpCost:20,power:0,support:'valor',targetSides:['player','ally','allyAi']},
 {id:'backWater',name:'배수진',level:26,element:'support',shape:'spread',range:3,radius:2,mpCost:26,power:0,support:'valor',targetSides:['player','ally','allyAi']},
 {id:'fourSongs',name:'사면초가',level:28,element:'support',shape:'spread',range:5,radius:2,mpCost:30,power:40,inflicts:['confusion','weaken'],targetSides:['enemy']},
 {id:'weiRiver',name:'유수 수공',level:30,element:'water',shape:'line',range:3,radius:5,mpCost:26,power:140,inflicts:['immobile'],targetSides:['enemy']},
 {id:'tenAmbush',name:'십면매복',level:32,element:'earth',shape:'spread',range:4,radius:2,mpCost:30,power:120,inflicts:['bound'],targetSides:['enemy']},
];
/** 삼국 고사의 계책: 정사·연의에 이름난 싸움에서 딴 책략. [id,이름,습득Lv,속성,모양,사거리,반경,MP,위력,상태] */
const stratagems:LearnedStrategy[]=[
 ...([['bowangFire','박망파 화공',13,'fire','spread',3,1,14,110,'burn'],['riverDam','백하 수공',15,'water','line',3,3,15,115,'slow'],
  ['fireShips','화공선',15,'fire','line',3,3,16,120,'burn'],['counterSpy','반간계',13,'support','single',5,0,14,40,'seal'],
  ['beautyTrap','미인계',17,'support','single',3,0,15,45,'confusion'],['lureTiger','조호이산',19,'support','single',5,0,16,35,'slow'],
  ['burnCamp','연영 화공',19,'fire','spread',4,1,18,130,'burn'],['rockAmbush','낙석 매복',20,'earth','line',3,3,19,130,'bound'],
  ['selfInjury','고육계',21,'support','single',4,0,18,55,'breach'],['thunderStorm','뇌우',21,'thunder','spread',4,1,21,135,'shock'],
  ['borrowKnife','차도살인',23,'support','spread',4,1,20,40,'weaken'],['eastWind','동남풍',25,'wind','spread',5,2,27,145,undefined],
  ['sevenArmies','칠군 수몰',27,'water','spread',4,2,28,150,'immobile'],['lockedGates','팔문금쇄진',31,'earth','spread',4,2,30,110,'immobile'],
  ['stoneMaze','석병팔진',34,'support','spread',5,2,34,60,'confusion']] as const).map(([id,name,level,element,shape,range,radius,mpCost,power,status])=>({id,name,level,element,shape,range,radius,mpCost,power,targetSides:['enemy' as const],...(status?{inflicts:[status]}:{})} as LearnedStrategy)),
 ...([['relief','구휼',12,14,1,'heal',30],['strawBoats','초선차전',17,14,1,'rally',0],['supplyLine','군량 수송',20,16,2,'mana',12],['woodenOx','목우유마',28,22,2,'haste',0],['peachOath','도원결의',32,30,2,'valor',0]] as const)
  .map(([id,name,level,mpCost,radius,support,power])=>({id,name,level,mpCost,radius,support,power,element:'support' as const,range:3,shape:radius?'spread' as const:'single' as const,targetSides:['player' as const,'ally' as const,'allyAi' as const]} as LearnedStrategy)),
];
/** 계통 고유 책략(새로 더함): 계통마다 겹치지 않게 나눠 준다(class-spells.ts). [id,이름,습득Lv,속성,모양,사거리,반경,MP,위력,상태] */
const signature:LearnedStrategy[]=[
 ...([['spark','전광',1,'thunder','single',3,0,6,85,'shock'],['earthPulse','지맥',1,'earth','single',3,0,6,85,'slow'],['hex','저주',1,'support','single',3,0,6,55,'breach'],
  ['feintAttack','양동',1,'earth','single',3,0,6,85,'slow'],['edict','칙명',1,'support','single',3,0,7,35,'seal'],['nightmare','악몽',19,'support','spread',4,1,18,45,'weaken'],
  ['imperialAura','천자의 위광',14,'support','spread',3,1,16,35,'weaken'],['charmDance','매혹의 춤',22,'support','spread',3,1,20,40,'confusion'],
  ['sandstorm','모래폭풍',22,'earth','global',99,0,30,35,undefined]] as const).map(([id,name,level,element,shape,range,radius,mpCost,power,status])=>({id,name,level,element,shape,range,radius,mpCost,power,targetSides:['enemy' as const],...(status?{inflicts:[status]}:{})} as LearnedStrategy)),
 ...([['spiritBell','영령의 방울',8,10,1,'cleanse',0],['blessing','축복',20,18,0,'heal',70],['swordDance','검무',1,6,0,'rally',0],['celestialDance','천녀무',28,26,1,'valor',0],
  ['banner','군기',1,6,0,'guard',0],['decree','호령',10,12,1,'haste',0],['royalGrace','황은',8,12,1,'heal',30],['amnesty','대사면',24,20,1,'cleanse',0],
  ['rations','군량 배급',1,6,0,'heal',20],['spareArms','병기 보급',10,10,0,'rally',0],['qigong','기공',1,6,0,'heal',30],['ironBody','금강불괴',12,10,0,'guard',0],
  ['rewind','회귀',20,30,0,'again',0]] as const)
  .map(([id,name,level,mpCost,radius,support,power])=>({id,name,level,mpCost,radius,support,power,element:'support' as const,range:id==='qigong'||id==='ironBody'?1:3,shape:radius?'spread' as const:'single' as const,targetSides:['player' as const,'ally' as const,'allyAi' as const]} as LearnedStrategy)),
];
/**
 * 병종 특수기: 물리로 싸우는 계통마다 하나씩. 공격력으로 피해를 내고(physical), MP를 조금 쓴다.
 * [id,이름,모양,사거리,반경,MP,위력,상태]
 */
const skills:LearnedStrategy[]=([
 ['shieldBash','방패 강타','single',1,0,4,115,'slow'],['pierce','관통 찌르기','line',1,1,4,105,undefined],['breakthrough','돌파','line',1,1,5,105,undefined],
 ['trample','짓밟기','single',1,0,4,140,'immobile'],['aimedShot','조준 사격','single',3,0,4,135,undefined],['volley','연발 사격','cross',3,1,6,60,undefined],
 ['skirmish','기사 난사','single',3,0,4,115,'slow'],['stoneRain','돌팔매 비','cross',3,1,6,60,undefined],['assassinate','암살','single',1,0,5,150,'bleed'],
 ['rattanRush','등패 돌진','single',1,0,4,110,'weaken'],['tuskCharge','상아 돌격','cross',1,1,6,75,undefined],['plunder','약탈','single',1,0,4,115,'weaken'],
 ['westernCharge','서량 돌격','line',1,2,5,95,undefined],['gateCrash','성문 파쇄','single',1,0,4,165,'breach'],['deckVolley','갑판 화살비','cross',3,1,6,60,undefined],
 ['flashCut','일섬','single',1,0,4,150,undefined],['mountainRaid','산악 기습','single',2,0,4,120,undefined],['lanceRush','질주 창격','line',1,1,5,100,undefined],
 ['scytheWheels','바퀴날','cross',1,1,6,70,'bleed'],['towerShot','망루 사격','single',4,0,4,115,undefined],['beastRoar','맹수 포효','spread',1,1,7,45,'weaken'],
 ['ironCharge','철갑 돌격','single',1,0,4,140,'breach'],['halberdSweep','회전 극','cross',1,1,6,75,undefined],['snare','올무 함정','single',2,0,4,75,'immobile'],
 ['thunderShot','벽력탄','spread',4,1,8,65,'burn'],['chainFist','연환권','single',1,0,4,130,undefined],['royalStrike','왕의 일격','single',1,0,5,135,undefined],
 ['commandStrike','지휘 일섬','single',1,0,5,125,'breach'],
 ['yellowSlash','황천 곡도','single',1,0,4,125,'weaken'],['boardingSlash','도선 참격','single',1,0,4,130,'bleed'],
] as const).map(([id,name,shape,range,radius,mpCost,power,status])=>({id,name,level:1,element:'physical' as const,physical:true,shape,range,radius,mpCost,power,targetSides:['enemy' as const],...(status?{inflicts:[status]}:{})} as LearnedStrategy));
export const SKILL_IDS=new Set(skills.map(s=>s.id));
export const allStrategies:LearnedStrategy[]=[...learnedStrategies,...more,...wider,...legends,...stratagems,...signature,...skills].map(capArea).sort((a,b)=>a.level-b.level);
for(const s of allStrategies)(s as {learnLevel?:number}).learnLevel=s.level;
export function strategyHint(id:string){const s=allStrategies.find(x=>x.id===id);if(!s)return '';const effect=s.physical?`공격력 위력 ${s.power}${s.inflicts?.length?' · '+s.inflicts.map(x=>STATUS_NAMES[x]??x).join(' · '):''}`:s.support?({again:'행동을 마친 아군 하나가 한 번 더 움직인다',heal:'아군 체력 회복',cleanse:'해로운 상태이상 제거',guard:'받는 피해 15% 감소',haste:'이동력 +1',rally:'공격 피해 12% 증가',mana:`MP ${s.power} 회복`,valor:'공격 피해 12% 증가 · 받는 피해 15% 감소'}[s.support]):`위력 ${s.power}${s.inflicts?.length?' · '+s.inflicts.map(x=>STATUS_NAMES[x]??x).join(' · '):''}`;return `${effect} · 사거리 ${s.shape==='global'?'제한 없음':s.range} · ${SHAPE_TEXT(s)}`;}
/** 상태이상 이름. */
export const STATUS_NAMES:Record<string,string>={burn:'화상',bleed:'출혈',seal:'책략 봉인',confusion:'혼란',immobile:'이동 불가',bound:'포박',shock:'감전',guard:'견고',haste:'강행',rally:'사기',weaken:'쇠약',breach:'파갑',slow:'둔화'};
/** 범위 모양을 말로. */
export const SHAPE_TEXT=(s:Pick<LearnedStrategy,'shape'|'radius'>)=>s.shape==='global'?'전 맵의 적':s.shape==='line'?`직선 ${s.radius+1}칸`:s.shape==='cross'?`십자 ${Math.max(1,s.radius)}칸`:s.radius?`주변 ${s.radius}칸`:'한 부대';
/** 책략 갈래: 공격(오행) · 술법(적 약화) · 회복 · 고무(아군 강화) */
export type StrategySchool='attack'|'mind'|'heal'|'buff'|'skill';
export const SCHOOL_NAMES:Record<StrategySchool,string>={attack:'공격 책략',mind:'술법',heal:'회복',buff:'고무·지원',skill:'병종 특수기'};
export function schoolOf(s:LearnedStrategy):StrategySchool{return s.physical?'skill':s.support?(s.support==='heal'||s.support==='cleanse'||s.support==='mana'?'heal':'buff'):s.element==='support'?'mind':'attack';}
const LEGEND_IDS=new Set(legends.map(s=>s.id));
/**
 * 계통이 쓰는 책략. 책사 계열(책사·군사·신산)은 공격 책략과 술법, 풍수사 계열(풍수사·선도·선인)은
 * 회복·고무에 땅과 물의 책략. 초한 고사 책략과 명상(MP 회복)은 둘 다 쓴다. 그 밖의 계통은 제한 없음(병종 목록은 troops.ts).
 */
export function familyAllows(family:string|undefined,s:LearnedStrategy){
  if(LEGEND_IDS.has(s.id)||s.support==='mana')return true;const k=schoolOf(s);
  if(family==='strategist')return k==='attack'||k==='mind';
  if(family==='fengshui')return k==='heal'||k==='buff'||s.element==='earth'||s.element==='water';
  return true;}
export function availableStrategies(level:number,expanded=false,family?:string){return (expanded?allStrategies:learnedStrategies).filter(s=>s.level<=level&&!s.physical&&familyAllows(family,s)).map(s=>s.id);}
