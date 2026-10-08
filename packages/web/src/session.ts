import {repairError,repairAmount,fortifyError,parseCell,buildBarricade,placeBarricade,breachRally,BARRICADES_PER_ENGINEER} from './siege.ts';
import {troopStrategies,supportOptions} from './troops.ts';
import {refBattle,prepareRunBattle,applyBattleMods,applyRelics,addRecruits,taleById,xpFromLog,levelUpInBattle,RUN_FLOORS,PARTY_LIMIT,XP_PER_LEVEL,type XpGain} from './roguelike.ts';
import {validRoute} from './fate.ts';
import {applyPerkGrants,validGrants} from './perks.ts';
import {stretchMap,stretchStage,canStretch,wideCoord} from './stretch.ts';
import {applyTreasureSpecial} from './treasure-specials.ts';
import './scenario.ts';
import {battleConditions,type BattleConditions} from './battle-conditions.ts';
import {trialGoalText} from './expedition-objectives.ts';
import {pickExtras,fitForcedToCap,storyCostCap,storyClassAt,STORY_BASE_CLASS} from './sortie.ts';
import {applyRomance,temperOf} from './romance.ts';
import {applyCC} from './cc-apply.ts';
import {expeditionBattle,expeditions,missionEnemyScale} from './expeditions.ts';
import {newDuel,duelRound,duelResponse,historicPair,DUEL_LOSS_DEBUFF,type DuelState,type DuelAction} from './duel.ts';
import {availableStrategies,allStrategies,applyOfficerFeatures,martialPower,debatePower} from './officers.ts';
import approachStage from '../../data/stages/S1-07.json';
import approachMap from '../../data/maps/hanzhong-approach.json';
import tongguanStage from '../../data/stages/S1-06.json';
import tongguanMap from '../../data/maps/tongguan-pass.json';
import retreatStage from '../../data/stages/S1-05.json';
import retreatMap from '../../data/maps/yangtze-retreat.json';
import {stageRules,foeEdges} from './stage-rules.ts';
import {campaignStage,addFortifications,addSiegeCompany,structureKind,encircled,encounterLevels} from './campaign-rules.ts';
import {applyTreasure,equippedItems,treasureInfo,type Deployment,OFFICERS,treasures} from './progression.ts';
import { assemble, Battle, CONTROLLABLE, isHostile, key, manhattan, statsFor, familyOf, evolvedClass, evolveUnit, healAmount, strategyArea, evolveStrategy } from '../../core/src/index.ts';
import type { BattleState, Command, Difficulty, MapFile, StageDef, StrategyDef, LogEntry, Unit } from '../../core/src/index.ts';
import escapeStage from '../../data/stages/S1-02.json';
import fortStage from '../../data/stages/S1-08.json';
import escapeMap from '../../data/maps/luoyang-escape.json';
import fortMap from '../../data/maps/hanzhong-central-fort.json';
import introStage from '../../data/stages/S1-01.json';
import introMap from '../../data/maps/sima-estate.json';
import flightStage from '../../data/stages/S1-03.json';
import flightMap from '../../data/maps/luhun-flight.json';
import dreamStage from '../../data/stages/S1-04.json';
import dreamMap from '../../data/maps/nightmare-court.json';
import bridgeStage from '../../data/stages/S1-09.json';
import bridgeMap from '../../data/maps/hanzhong-hanshui-bridge.json';
import floodStage from '../../data/stages/S1-10.json';
import floodMap from '../../data/maps/hanzhong-hanshui-flood.json';
import courtStage from '../../data/stages/S1-11.json';
import courtMap from '../../data/maps/jianye-court.json';
import wuweiStage from '../../data/stages/S2-01.json';
import wuweiMap from '../../data/maps/wuwei-citadel.json';
import dongkouStage from '../../data/stages/S2-02.json';
import dongkouMap from '../../data/maps/dongkou-river.json';
import guanglingStage from '../../data/stages/S2-03.json';
import guanglingMap from '../../data/maps/guangling-camp.json';
import xiangyangStage from '../../data/stages/S2-04.json';
import xiangyangMap from '../../data/maps/xiangyang-walls.json';
import xinchengStage from '../../data/stages/S2-05.json';
import xinchengMap from '../../data/maps/xincheng-fort.json';
import jietingStage from '../../data/stages/S2-06.json';
import jietingMap from '../../data/maps/jieting-hill.json';
import yangpingStage from '../../data/stages/S2-07.json';
import yangpingMap from '../../data/maps/yangping-pass.json';
import shitingStage from '../../data/stages/S2-08.json';
import shitingMap from '../../data/maps/shiting-gorge.json';
import chengguStage from '../../data/stages/S2-09.json';
import chengguMap from '../../data/maps/chenggu-river.json';
import shangguiStage from '../../data/stages/S2-10.json';
import shangguiMap from '../../data/maps/shanggui-fields.json';
import mumenStage from '../../data/stages/S2-11.json';
import mumenMap from '../../data/maps/mumen-gorge.json';
import weishuiStage from '../../data/stages/S2-12.json';
import weishuiMap from '../../data/maps/weishui-banks.json';
import huluStage from '../../data/stages/S2-13.json';
import huluMap from '../../data/maps/hulu-valley.json';
import wuzhangStage from '../../data/stages/S2-14.json';
import wuzhangMap from '../../data/maps/wuzhang-plain.json';
import liaoshuiStage from '../../data/stages/S3-01.json';
import liaoshuiMap from '../../data/maps/liaoshui-fords.json';
import xiangpingStage from '../../data/stages/S3-02.json';
import xiangpingMap from '../../data/maps/xiangping-walls.json';
import fanchengStage from '../../data/stages/S3-03.json';
import fanchengMap from '../../data/maps/fancheng-relief.json';
import huanchengStage from '../../data/stages/S3-04.json';
import huanchengMap from '../../data/maps/huancheng-river.json';
import luoguStage from '../../data/stages/S3-05.json';
import luoguMap from '../../data/maps/luogu-valley.json';
import luoyangcoupStage from '../../data/stages/S3-06.json';
import luoyangcoupMap from '../../data/maps/luoyang-coup.json';
import shouchunStage from '../../data/stages/S3-07.json';
import shouchunMap from '../../data/maps/shouchun-waterway.json';
import legacyFortMap from './legacy/hanzhong-map-v2.json';
import legacyFortStage from './legacy/hanzhong-stage-v2.json';
import { makeUnit, awardedSeals } from '../../core/src/index.ts';

export const chapters = [
  {stage: escapeStage as StageDef, map: escapeMap as MapFile, year:'초평 원년 · 190년', label:'잠입과 선택', quote:'칼을 숨겨라. 살아남는 자만이 다음 수를 둘 수 있다.'},
  {stage: fortStage as StageDef, map: fortMap as MapFile, year:'건안 이십년 · 215년', label:'진격과 점령', quote:'승패는 칼끝에서 정해지지 않는다. 누가 먼저 판을 읽는가.'},
  {stage: introStage as StageDef, map: introMap as MapFile, year:'중평 원년 · 184년', label:'보호와 무장', quote:'칼을 들 수 없다면, 칼을 들어 줄 사람을 지켜라.'},
  {stage: flightStage as StageDef, map: flightMap as MapFile, year:'초평 원년 · 190년', label:'설득과 추격', quote:'길을 아는 이에게 묻는 것도, 살아남는 자의 지혜다.'},
  {stage: dreamStage as StageDef, map: dreamMap as MapFile, year:'건안 연간 · 출사 전야', label:'세 대결과 흉몽', quote:'꿈에서조차, 나는 누구의 신하인가.'},
  {stage:retreatStage as StageDef,map:retreatMap as MapFile,year:'건안 십삼년 · 208년',label:'수송대 호위',quote:'한 번의 승리보다, 다음 싸움에 돌아올 사람이 먼저다.'},
  {stage:tongguanStage as StageDef,map:tongguanMap as MapFile,year:'건안 십육년 · 211년',label:'관문 돌파와 후방 호위',quote:'눈앞의 적만 본다면, 등 뒤의 주군을 잃는다.'},
  {stage:approachStage as StageDef,map:approachMap as MapFile,year:'건안 이십년 · 215년',label:'산길 돌파와 병종 연계',quote:'공을 앞세우기 전에, 함께 돌아올 길부터 열겠습니다.'},
  {stage:bridgeStage as StageDef,map:bridgeMap as MapFile,year:'건안 이십사년 · 219년',label:'부교 재건과 호위',quote:'물러날 길을 놓는 것도, 싸움의 절반이다.'},
  {stage:floodStage as StageDef,map:floodMap as MapFile,year:'건안 이십사년 · 219년',label:'봉쇄와 탈출',quote:'막을 수 없는 창이라면, 움직일 수 없게 하라.'},
  {stage:courtStage as StageDef,map:courtMap as MapFile,year:'건안 이십사년 · 219년',label:'논거와 설득',quote:'칼 한 자루보다, 맞는 말 한마디가 강을 건넌다.'},
  {stage:wuweiStage as StageDef,map:wuweiMap as MapFile,year:'황초 원년 · 220년',label:'성채 사수와 반사 책략',quote:'세게 친다고 이기는 것이 아니다. 무엇이 되돌아오는지 먼저 보라.'},
  {stage:dongkouStage as StageDef,map:dongkouMap as MapFile,year:'황초 삼년 · 222년',label:'폭풍 속 철수',quote:'하늘의 칼은 피할 수 있다. 미리 보았다면.'},
  {stage:guanglingStage as StageDef,map:guanglingMap as MapFile,year:'황초 육년 · 225년',label:'야습과 황제 탈출',quote:'곁에 없다 해도, 길러 둔 손발이 대신 싸운다.'},
  {stage:xiangyangStage as StageDef,map:xiangyangMap as MapFile,year:'황초 칠년 · 226년',label:'세 길목 방어',quote:'모든 문을 같은 칼로 지킬 수는 없다.'},
  {stage:xinchengStage as StageDef,map:xinchengMap as MapFile,year:'태화 이년 · 228년',label:'강행군과 공성',quote:'여드레에 천이백 리. 적이 준비를 마치기 전에 성 아래에 선다.'},
  {stage:jietingStage as StageDef,map:jietingMap as MapFile,year:'태화 이년 · 228년',label:'수원 차단과 도주 저지',quote:'산 위의 진은 물이 없으면 사흘을 못 간다.'},
  {stage:yangpingStage as StageDef,map:yangpingMap as MapFile,year:'태화 사년 · 230년',label:'추격과 구원',quote:'쫓는 자도 길을 고르고, 쫓기는 자도 길을 고른다.'},
  {stage:shitingStage as StageDef,map:shitingMap as MapFile,year:'태화 이년 · 228년',label:'협석 돌파',quote:'아버지는 능선에 서고, 아들들은 골짜기를 달린다.'},
  {stage:chengguStage as StageDef,map:chengguMap as MapFile,year:'태화 오년 · 231년',label:'고착 전선과 성채',quote:'막힌 곳을 두드리지 말고, 열린 길로 돌아 들어가라.'},
  {stage:shangguiStage as StageDef,map:shangguiMap as MapFile,year:'태화 오년 · 231년',label:'불길과 함정의 추격',quote:'불이 길을 막으면, 불이 꺼질 때까지 기다릴 수 없는 쪽이 진다.'},
  {stage:mumenStage as StageDef,map:mumenMap as MapFile,year:'태화 오년 · 231년',label:'선봉과 본대',quote:'쫓으라 한 것도 나였고, 멈추라 하지 못한 것도 나였다.'},
  {stage:weishuiStage as StageDef,map:weishuiMap as MapFile,year:'청룡 이년 · 234년',label:'세 여울의 방어',quote:'적이 어디로 오는지 알면, 예비대는 한 번만 움직이면 된다.'},
  {stage:huluStage as StageDef,map:huluMap as MapFile,year:'청룡 이년 · 234년',label:'합류와 버티기',quote:'불은 사람이 놓았고, 비는 하늘이 내렸다.'},
  {stage:wuzhangStage as StageDef,map:wuzhangMap as MapFile,year:'청룡 이년 · 234년',label:'추격과 동요',quote:'죽은 제갈이 산 중달을 달아나게 했다.'},
  {stage:liaoshuiStage as StageDef,map:liaoshuiMap as MapFile,year:'경초 이년 · 238년',label:'양동과 진짜 공격',quote:'이번에는 우리가 깃발을 세워 적을 움직인다.'},
  {stage:xiangpingStage as StageDef,map:xiangpingMap as MapFile,year:'경초 이년 · 238년',label:'보급 차단과 포획',quote:'같은 깃발 셋 가운데 하나만 사람이다.'},
  {stage:fanchengStage as StageDef,map:fanchengMap as MapFile,year:'정시 이년 · 241년',label:'짧은 길과 안전한 길',quote:'늙은 장수는 빨리 걷지 않는다. 다만 헛걸음을 하지 않는다.'},
  {stage:huanchengStage as StageDef,map:huanchengMap as MapFile,year:'정시 사년 · 243년',label:'공병 호위와 가교',quote:'다리는 하루에 놓이지 않는다. 그 하루를 지켜 주는 자가 있어야 한다.'},
  {stage:luoguStage as StageDef,map:luoguMap as MapFile,year:'정시 오년 · 244년',label:'진격과 회수',quote:'어디까지 갈지 아는 것이, 어디로 갈지 아는 것보다 어렵다.'},
  {stage:luoyangcoupStage as StageDef,map:luoyangcoupMap as MapFile,year:'정시 십년 · 249년',label:'무기고와 영녕궁',quote:'칼을 뽑는 데 쉰 해가 걸렸다.'},
  {stage:shouchunStage as StageDef,map:shouchunMap as MapFile,year:'가평 삼년 · 251년',label:'수로와 수문',quote:'마지막 출정이다. 나는 이 길로 돌아오지 않을 것이다.'},
];
// Stable indices preserve the existing v2 command saves.
export const campaignOrder=[2,0,3,4,5,6,7,1,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
export type Preparation='survival'|'strategy'|'command';
export const strategies: StrategyDef[] = [
  {id:'windDragon',name:'풍룡',element:'wind',shape:'spread',range:4,radius:1,mpCost:18,power:130,targetSides:['enemy']},
  {id:'fire',name:'화계',element:'fire',shape:'single',range:3,radius:0,mpCost:12,power:110,inflicts:['burn'],targetSides:['enemy']},
];
type Intent = Command | {kind:'aiTick'};
export interface Save {version:2; revision?:2|3|4|5; deployment?:Deployment; chapter:number; difficulty:Difficulty; seed:number; preparation:Preparation; journal:Intent[]; checkpoints:number[]}

/** Persist commands, not mutable engine internals. Replay also restores terrain,
 * counter budgets, patrol progress and RNG when undoing across a phase boundary. */
/** 천명의 시련 배율 */
export const TRIAL={hp:1.2,attack:1.12,defense:1.1};
/** 지켜야 할 대상의 한 번 피해 상한(최대 체력 대비 %). */
export const STEADFAST_CAP=40;
/** 규칙표의 실패 조건(protectedFailure)이 지키라고 하는 장수. */
const MUST_SURVIVE=new Set(['cao_shuang','sima_zhao','sima_shi','dai_ling','cao_xiu','cao_pi']);
export class Session {
  battle: Battle;
  journal: Intent[] = [];
  checkpoints: number[] = [];
  private fortified=new Map<string,number>();
  private breached=new Set<string>();
  barricadesLeft(id:string){return BARRICADES_PER_ENGINEER-(this.fortified.get(id)??0);}
  activeDuel:DuelState|null=null;
  /** 넓은 전장(지도 1.5배 · 이동 +2)으로 만든 전투인가 */
  wide=false;
  /** 방금 도전을 거절당했다면 그 사연(화면이 한 번 보여 준다) */
  lastRefusal:{kind:'duel'|'debate';challenger:string;target:string;line:string;reason:string}|null=null;
  /** 방금 응한 대결의 첫 대답 */
  lastAccept:{kind:'duel'|'debate';line:string;historic:boolean}|null=null;
  lastDuel:DuelState|null=null;
  private challenged=new Set<string>();
  private balancedEnemies=new Set<string>();
  /** 연의 능력을 이미 입힌 장수(나중에 등장하는 장수도 한 번씩만) */
  private romanced=new Set<string>();
  /** 원정 전투에서 부대마다 이번 전투로 번 경험치(전투가 끝나면 원정에 더한다) */
  xpEarned:Record<string,number>={};
  /** 기록 항목 → 그 행동으로 번 경험치(전장 연출이 '경험치 +n'을 띄운다) */
  xpGains=new WeakMap<LogEntry,XpGain&{level?:number;learned?:string[]}>();
  private xpCursor=0;
  funds=3000;
  bribes=0;
  medicine=2;
  scouted=false;
  phase='';
  failure='';
  phaseCheckpoint:number|null=null;
  constructor(public chapter=2, public difficulty:Difficulty='normal', public seed=215, public preparation:Preparation='survival', public revision:2|3|4|5=3, public deployment?:Deployment) {this.battle=this.create();this.resetScenario();}
  get state(){return this.battle.state;}
  private create(){
    this.balancedEnemies.clear();this.romanced.clear();this.xpEarned={};this.xpGains=new WeakMap();this.xpCursor=0;
    let entry=this.chapter===1&&this.revision===2?{stage:legacyFortStage as StageDef,map:legacyFortMap as MapFile}:chapters[this.chapter];
    if(!entry) throw new Error('알 수 없는 전장');
    if(this.deployment?.run)entry={...entry,...refBattle(this.deployment.run)};
    else if(this.deployment?.mission)entry={...entry,...expeditionBattle(this.deployment.mission.id,this.seed,this.deployment.mission.version??1,this.deployment.mission.supportClasses)};
    else if(this.deployment)entry={...entry,stage:campaignStage(entry.stage)};
    // 연의 장: 필수 장수에 더해 고른 장수를 데려간다(시기·출진 칸·난이도 인원 안에서).
    // 극한 출진 코스트: 연의 장의 필수 장수가 상한을 넘으면 한 단계 낮은 병종으로 나선다(sortie.ts).
    const costCapped=this.difficulty==='extreme'&&this.revision>=4&&!!this.deployment&&!this.deployment.run&&!this.deployment.mission
      ?fitForcedToCap(entry.stage.deployment.forced.filter(id=>STORY_BASE_CLASS[id]).map(id=>({id,unitClass:storyClassAt(id,this.deployment!.levels[id]??1)})),storyCostCap(entry.stage.id)):undefined;
    if(this.deployment?.extraOfficers?.length&&!this.deployment.run&&!this.deployment.mission){
      const extra=pickExtras(entry.stage,entry.map,this.deployment.extraOfficers,this.difficulty,this.deployment.levels);
      if(extra.length)entry={...entry,stage:{...entry.stage,deployment:{...entry.stage.deployment,forced:[...entry.stage.deployment.forced,...extra]}}};
    }
    // 넓은 전장: 연의 지도를 1.5배로(지형·영역·등장 위치), 이동력은 +2로 걸음을 맞춘다.
    const wide=!!this.deployment?.wide&&!this.deployment.run&&!this.deployment.mission&&canStretch(entry.map);
    if(wide)entry={...entry,map:stretchMap(entry.map),stage:stretchStage(entry.stage)};
    this.wide=wide;
    const level=entry.stage.difficulty[this.difficulty].recommendedLevel;
    const state=assemble({stage:entry.stage,map:entry.map,difficulty:this.difficulty,seed:this.seed,roster:[
      {id:'sima_yi',name:'사마의',unitClass:'strategist',level,strategies:['windDragon','fire'],traits:['alwaysHit']},
      {id:'sima_lang',name:'사마랑',unitClass:'infantry',level},
      {id:'cao_zhen',name:'조진',unitClass:'heavyCav',level},
      {id:'sima_fang',name:'사마방',unitClass:'spearman',level},
    ]});
    if(this.deployment)for(const u of state.living('player')){const l=this.deployment.levels[u.id];if(l){const adjusted=makeUnit({id:u.id,unitClass:u.unitClass,level:l,side:u.side,pos:u.pos});u.level=l;u.stats=adjusted.stats;u.hp=u.stats.maxHp;u.mp=u.stats.maxMp;
      // 장수도 레벨이 기준에 닿으면 병종이 진화한다(사마의: 책사→군사 Lv8→귀모 Lv16). 원정 부대는 원정 규칙이 따로 정한다.
      const evolved=this.revision>=4&&!this.deployment.run?(costCapped?.get(u.id)??evolvedClass(u.unitClass,l)):u.unitClass;if(evolved!==u.unitClass){evolveUnit(u,evolved);u.hp=u.stats.maxHp;u.mp=u.stats.maxMp;}}
      // 연의 능력은 보물보다 먼저 입혀, 보물의 고정 보너스가 배율에 섞이지 않게 한다.
      if(this.revision>=4&&!this.deployment.run&&!this.romanced.has(u.id)){this.romanced.add(u.id);if(this.revision===5){applyRomance(u,false);applyCC(u);}else applyRomance(u);}if(this.revision>=4){for(const item of equippedItems(this.deployment,u.id))applyTreasure(u,item,this.deployment.treasureRules===1);}else applyTreasure(u,this.deployment.equipped[u.id],this.deployment.treasureRules===1);}
    if(this.deployment?.mission?.balance===1)for(const u of state.living('ally')){
      u.level=Math.min(u.level,(this.deployment.levels.sima_yi??1)+1);
      u.stats=makeUnit({id:u.id,unitClass:u.unitClass,level:u.level,side:u.side,pos:u.pos}).stats;u.hp=u.stats.maxHp;u.mp=u.stats.maxMp;
    }
    // 2장(사마가 수비전)도 사마의는 처음부터 책사: 기본 공격(사거리 1)과 레벨에 맞는 책략(Lv1 화계)을 쓴다.
    for(const u of state.living('player')){
      if(this.preparation==='survival'){u.stats.maxHp+=25;u.hp+=25;}
      if(this.preparation==='strategy'){u.stats.maxMp+=18;u.mp+=18;}
      if(this.preparation==='command')u.stats.movement+=1;
    }
    for(const unit of state.living('ally')) if(['strategist','fengshui'].includes(unit.unitClass)) unit.strategies=['windDragon'];
    const battle=new Battle(state,{seed:this.seed,strategies:new Map((this.revision>=4?allStrategies:strategies).map(s=>[s.id,this.revision>=4?s:this.deployment?{...s,mpCost:s.id==='fire'?6:9}:s])),undoDepth:0,maxTurns:60});
    if((this.deployment?.mission?.version??1)>=3)state.survivalClocks.set('trial_defense',1);
    battle.start();
    const rules=stageRules[entry.stage.id];
    for(const p of rules?.protect??[]){const u=state.find(p.unit);if(!u)continue;u.stats.maxHp=p.hp;u.hp=p.hp;u.range=[0,0];u.canUseItems=false;if(p.movement)u.stats.movement=p.movement;}
    for(const t of rules?.tough??[]){const u=state.find(t.unit);if(!u)continue;u.stats.maxHp=Math.round(u.stats.maxHp*t.hpScale);u.hp=u.stats.maxHp;if(t.defense)u.stats.defense+=t.defense;}
    for(const id of rules?.anchored??[]){const u=state.find(id);if(u)u.stats.movement=0;}
    for(const at0 of rules?.barricades??[]){const at=this.wide?wideCoord(at0):at0;if(!state.unitAt(at))placeBarricade(state,at,'enemy',(encounterLevels[state.stage.id]??5)+(state.difficulty==='extreme'?2:0));}
    if(this.wide)state.map.moveBonus=2;
    if((this.deployment?.mission?.version??1)>=3){
      for(const id of ['convoy_trial','rescue_target']){const u=state.find(id);if(u){u.stats.maxHp=100+u.level*4;u.hp=u.stats.maxHp;u.stats.movement=3;u.range=[0,0];}}
      for(const u of state.living('enemy'))if(u.goalRegion==='trial_defense')u.stats.movement=3;
    }
    if(this.deployment?.mission){
      const scale=missionEnemyScale(this.deployment.mission.id);
      for(const enemy of state.living('enemy')){enemy.stats.attack=Math.round(enemy.stats.attack*scale.attack);if(scale.hp!==1){enemy.stats.maxHp=Math.round(enemy.stats.maxHp*scale.hp);enemy.hp=enemy.stats.maxHp;}this.balancedEnemies.add(enemy.id);}
    }
    if(this.chapter===6){const commander=state.get('cao_cao');commander.stats.maxHp=180;commander.hp=180;commander.stats.movement=0;for(const id of ['ma_chao','pass_bow'])state.get(id).stats.movement=0;}
    // S1-09: Cao Cao rides with the baggage; he cannot fight and keeps to the road.
    // S1-10: Zhao Yun cannot be worn down in time; he has to be boxed in.
    if(this.chapter===9){const zy=state.get('zhao_yun');zy.stats.maxHp=Math.round(zy.stats.maxHp*1.5);zy.hp=zy.stats.maxHp;}
    if(this.chapter===8||this.chapter===9){const lord=state.get('cao_cao');lord.stats.maxHp=160;lord.hp=160;lord.stats.movement=3;lord.range=[0,0];lord.canUseItems=false;}
    if(this.chapter===5)for(const id of ['convoy_a','convoy_b']){const u=state.get(id);u.stats.movement=3;u.stats.maxHp=110;u.hp=110;u.range=[0,0];u.canUseItems=false;}
    if(this.deployment){
      // Opening raiders are lightly armed; the tutorial teaches rescue, not attrition.
      if(this.chapter===2)for(const enemy of state.living('enemy')){enemy.stats.maxHp=Math.round(enemy.stats.maxHp*.65);enemy.hp=enemy.stats.maxHp;enemy.stats.defense=Math.max(1,enemy.stats.defense-5);enemy.stats.attack=Math.round(enemy.stats.attack*.8);}
      addFortifications(state);
    }
    if(this.revision>=4){
      if(!this.deployment)addFortifications(state);
      applyOfficerFeatures(state.living(),this.deployment?.growth);
      for(const u of state.living()){
        if(familyOf(u.unitClass)==='ram'){for(const trait of ['siegeRam','noCounterAttack'])if(!u.traits.includes(trait))u.traits.push(trait);}
        const officer=(OFFICERS as readonly string[]).includes(u.id)&&u.side==='player',specialty=troopStrategies(u.unitClass,u.level);
        // 주인공 장수(책사 계열)는 모든 책략을 익힐 수 있다. 그 밖의 부대는 계통의 책략·특수기만 쓴다.
        if(officer&&['strategist','fengshui'].includes(familyOf(u.unitClass)))u.strategies=availableStrategies(u.level,!!this.deployment?.growth,undefined);else if(specialty)u.strategies=specialty;
      }
      addSiegeCompany(state);
      // 보물 특기: 병서·도술서는 책략을 부여하고, 명검·명마·갑주는 전투 특성을 더한다.
      if(this.deployment&&!this.deployment.run)for(const u of state.living('player'))for(const item of equippedItems(this.deployment,u.id))applyTreasureSpecial(state,u,item);
    }
    // 원정 부대의 병종·체력·책략·보물은 기본 정비가 끝난 뒤 덮어쓴다.
    if(this.deployment?.run)prepareRunBattle(state,this.deployment.run);
    // 시나리오 모드의 연의 장: 대사 선택의 효과(사기·방어 태세·책략 MP).
    if(this.deployment?.scenario?.mods&&!this.deployment.run)applyBattleMods(state,this.deployment.scenario.mods);
    // 로그라이크 회차의 연의 장: 회차 보물이 본대에 실리고, 사마의는 남은 체력으로 나선다.
    if(this.deployment?.scenario&&!this.deployment.run){const sc=this.deployment.scenario;if(sc.recruits?.length)addRecruits(state,sc.recruits);if(sc.relics?.length)applyRelics(state,sc.relics);const h=state.find('sima_yi');if(h&&sc.heroHp!==undefined)h.hp=Math.max(1,Math.round(h.stats.maxHp*sc.heroHp));}
    // 원정의 연의 전장: 사마의는 원정에서 남은 체력으로 나서고, 원정 보물이 본대에 실린다.
    if(this.deployment?.runStory){const r=this.deployment.runStory,h=state.find('sima_yi');if(h)h.hp=Math.max(1,Math.round(h.stats.maxHp*r.heroHp));applyRelics(state,r.relics);}
    // 연구·장수 효과: 출진할 때 적어 둔 값 그대로(저장 재생도 같게).
    // 천명의 시련: 로그라이크(천명의 길·원정) 전투의 적은 처음부터 단단하다. 연구가 쌓일수록 상대적으로 쉬워진다.
    if(this.deployment?.trial)for(const e of state.living('enemy')){if(/^(gate|tower)_/.test(e.id)||e.stats.movement===0)continue;
      e.stats.maxHp=Math.round(e.stats.maxHp*TRIAL.hp);e.hp=e.stats.maxHp;e.stats.attack=Math.round(e.stats.attack*TRIAL.attack);e.stats.defense=Math.round(e.stats.defense*TRIAL.defense);}
    if(this.deployment?.perks)applyPerkGrants(state,this.deployment.perks);
    this.applyRomanceToNew(state);
    return battle;
  }
  act(cmd:Command){
    const s=this.state;
    if(this.activeDuel){
      if(!(cmd.kind==='item'&&cmd.item.startsWith('duel-round:')))return {ok:false,error:'먼저 5합 대결을 마쳐 주세요.'};
      const result=this.execute(cmd);if(result.ok){this.checkpoints.push(this.journal.length);this.journal.push(structuredClone(cmd));}return result;
    }
    if(s.activeDialogue && cmd.kind!=='choose') return {ok:false,error:'먼저 대화의 선택지를 골라 주세요.'};
    if(cmd.kind!=='choose' && !CONTROLLABLE.has(s.currentSide)) return {ok:false,error:'상대의 행동을 기다려 주세요.'};
    if('unit' in cmd){
      const u=s.find(cmd.unit);
      if(!u?.alive || u.side!==s.currentSide || u.hasActed) return {ok:false,error:'지금 행동할 수 없는 부대입니다.'};
      if(s.hasStatus(u,'confusion') && cmd.kind!=='wait') return {ok:false,error:'혼란 상태에서는 대기만 가능합니다.'};
      if(cmd.kind==='attack'){
        const target=s.find(cmd.target);
        if(!target || !isHostile(u.side,target.side)) return {ok:false,error:'적 부대를 선택해 주세요.'};
      }
      if(cmd.kind==='move' && key(cmd.to)===key(u.pos)) return {ok:false,error:'다른 칸을 선택해 주세요.'};
      if(cmd.kind==='strategy'){
        const cu=s.find(cmd.unit),def=cu?s.strategyFor(cu,cmd.strategy):s.strategies.get(cmd.strategy);
        if(!s.map.inBounds(cmd.at) || !def || !(()=>{if(def.shape==='global')return s.living().some(e=>def.targetSides.includes(e.side));const area=strategyArea(def,cmd.at,s.find(cmd.unit)?.pos);return s.living().some(e=>def.targetSides.includes(e.side)&&area.some(c=>c.x===e.pos.x&&c.y===e.pos.y));})()) return {ok:false,error:'책략 범위 안에 적이 있어야 합니다.'};
      }
    }
    if(this.chapter===6&&cmd.kind==='capture'&&s.find('ma_chao')?.alive)return {ok:false,error:'마초를 먼저 격퇴해야 돌파 구역을 확보할 수 있습니다.'};
    const result=this.execute(cmd);
    if(result.ok){this.checkpoints.push(this.journal.length);this.journal.push(structuredClone(cmd));}
    return result;
  }
  private resetScenario(){this.fortified.clear();this.breached.clear();this.activeDuel=null;this.lastDuel=null;this.lastRefusal=null;this.lastAccept=null;this.challenged.clear();this.funds=3000;this.bribes=0;this.medicine=2;this.scouted=false;this.failure='';this.phaseCheckpoint=null;const startRules=stageRules[this.state.stage.id];this.medicine=startRules?.medicine??2;this.phase=startRules?.phase?.({state:this.state,difficulty:this.difficulty,journalLength:0})??(this.state.scenarioPhase||'');if(startRules)return;this.phase=this.chapter===10?`설득 · 장소 · 신뢰 ${this.trustLimit}/${this.trustLimit}`:this.chapter===8&&this.state.scenarioPhase==='부교 재건'?'부교 재건 0/2 · 강변을 지키세요':this.chapter===9&&this.state.scenarioPhase==='조운 봉쇄'?`조운 봉쇄 ${encircled(this.state,'zhao_yun')}/4 · 사방을 막으세요`:this.state.scenarioPhase|| (this.chapter===2?'창고 확보':this.chapter===0?'잠입':this.chapter===3?'탈출로 선택':this.chapter===5?'수송로 선택':this.chapter===6?'호위 병력 배치':'외곽 돌파');}
  get pressure(){return this.state.turn-1+(this.state.choices.some(c=>c.nodeId==='bluff_warning'&&c.optionId==='commit')?2:0);}
  /** S1-11: the court's trust. Every wrong argument costs one; at zero the embassy fails. */
  get trustLimit(){return this.difficulty==='extreme'?2:3;}
  get wrongAnswers(){return this.state.choices.filter(c=>this.battle.dialogue.has(c.nodeId)&&this.battle.dialogue.node(c.nodeId).options.find(o=>o.id===c.optionId)?.correct===false).length;}
  get trust(){return Math.max(0,this.trustLimit-this.wrongAnswers);}
  get pressureLimit(){return this.difficulty==='extreme'?9:12;}
  private execute(cmd:Command){
    const s=this.state;
    if(this.state.outcome!=='ongoing')return {ok:false,error:'이미 종료된 전투입니다.'};
    if(cmd.kind==='strategy'&&this.revision>=4){
      const base=allStrategies.find(x=>x.id===cmd.strategy),u=s.find(cmd.unit),def=base&&u?evolveStrategy(base,u.level):base;
      if(def?.support){
        if(!u?.alive||!u.strategies.includes(def.id)||u.mp<def.mpCost||s.hasStatus(u,'seal')||manhattan(u.pos,cmd.at)>def.range)return {ok:false,error:'지원 책략의 습득·MP·사거리를 확인하세요.'};
        const area=strategyArea(def,cmd.at,u.pos),targets=s.living().filter(t=>t.side!=='enemy'&&area.some(c=>c.x===t.pos.x&&c.y===t.pos.y));
        if(def.support==='again'){const keep=targets.filter(t=>t.id!==u.id&&t.hasActed);targets.length=0;targets.push(...keep);if(!targets.length)return {ok:false,error:'회귀는 이미 행동을 마친 다른 아군에게만 쓸 수 있습니다.'};}
        if(!targets.length)return {ok:false,error:'지원할 아군을 선택하세요.'};
        const damage:number[]=[];for(const t of targets){let healed=0;if(def.support==='heal'){healed=Math.min(t.stats.maxHp-t.hp,healAmount(def.power,u.stats.intellect,u.traitParams.healPower??0));t.hp+=healed;}else if(def.support==='cleanse')t.statuses=t.statuses.filter(x=>['guard','haste','rally'].includes(x.kind));else if(def.support==='mana'){const before=t.mp;t.mp=Math.min(t.stats.maxMp,t.mp+def.power);healed=0;void before;}else if(def.support==='valor'){s.applyStatus(t,{kind:'rally',turns:3,magnitude:1});s.applyStatus(t,{kind:'guard',turns:3,magnitude:1});}else if(def.support==='again'){t.hasActed=false;t.hasMoved=false;}else if(['guard','haste','rally'].includes(def.support))s.applyStatus(t,{kind:def.support as 'guard'|'haste'|'rally',turns:3,magnitude:1});damage.push(-healed);}
        u.mp-=def.mpCost;s.push({t:'strategy',caster:u.id,strategy:def.id,targets:targets.map(t=>t.id),damage});const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
    }
    if(cmd.kind==='item'){
      if(this.revision>=4&&cmd.item.startsWith('duel-round:')){
        // 5합 대결: 자동 조우(적 차례·이미 행동한 장수)일 수도 있어 행동 여부와 상관없이 받는다.
        const u=s.find(cmd.unit),duel=this.activeDuel;if(!u?.alive||!duel||duel.player.id!==u.id||!duelRound(duel,cmd.item.slice(11) as DuelAction))return {ok:false,error:this.activeDuel?.kind==='debate'?'논거 2 이상이어야 논파를 사용할 수 있습니다.':'기합 2 이상이어야 필살기를 쓸 수 있습니다.'};
        if(duel.result){
          const enemy=s.get(duel.enemy.id),playerLoss=duel.result==='lose'?.45:duel.result==='draw'?.25:.15,enemyLoss=duel.result==='win'?.45:duel.result==='draw'?.25:.15;
          u.hp=Math.max(1,u.hp-Math.ceil(u.stats.maxHp*playerLoss));enemy.hp=Math.max(1,enemy.hp-Math.ceil(enemy.stats.maxHp*enemyLoss));
          // 진 쪽에 술법 디버프: 일기토는 쇠약·둔화(기가 꺾이고 발이 무거워진다), 설전은 혼란·책략 봉인(말문이 막힌다).
          if(duel.result!=='draw'){const loser=duel.result==='win'?enemy:u;for(const kind of DUEL_LOSS_DEBUFF[duel.kind])s.applyStatus(loser,{kind,turns:2,magnitude:1});}
          this.challenged.add(duel.kind+':'+u.id+':'+enemy.id);this.lastDuel=structuredClone(duel);this.activeDuel=null;
          // 직접 청한 대결은 한 번의 행동이다. 자동 조우는 행동을 쓰지 않는다.
          if(!duel.auto)this.battle.execute({kind:'wait',unit:u.id});
          this.advanceScenario();
        }
        return {ok:true};
      }
      const u=this.state.find(cmd.unit);
      if(!u?.alive||u.side!==this.state.currentSide||u.hasActed||this.state.activeDialogue||this.state.hasStatus(u,'confusion'))return {ok:false,error:'지금 사용할 수 없습니다.'};
      if(this.revision>=4&&(cmd.item==='duel'||cmd.item==='debate')){
        const enemy=s.find(cmd.target??''),kind=cmd.item,range=kind==='duel'?1:3;
        if(!enemy?.alive||enemy.side!=='enemy'||/^(gate|tower)_/.test(enemy.id)||['ram','catapult','civilian'].includes(u.unitClass)||['ram','catapult','civilian'].includes(enemy.unitClass)||manhattan(u.pos,enemy.pos)>range||this.challenged.has(kind+':'+u.id+':'+enemy.id))return {ok:false,error:'대결 가능한 사거리 안의 적 장수를 선택하세요. 같은 상대와 같은 대결은 한 번만 가능합니다.'};
        const stat=(x:typeof u)=>kind==='duel'?martialPower(x):debatePower(x);
        const answer=this.challengeAnswer(u,enemy,kind);
        if(!answer.accept&&answer.reason==='nameless')return {ok:false,error:'이름 없는 병사는 장수의 도전에 응하지 않습니다. 이름 있는 적 장수를 고르세요.'};
        if(!answer.accept){
          // 거절: 도전한 쪽은 기세가 오르고(2턴 사기 상승), 피한 쪽은 사기가 꺾인다. 도전도 한 번의 행동이다.
          this.challenged.add(kind+':'+u.id+':'+enemy.id);this.lastRefusal={kind,challenger:u.id,target:enemy.id,line:answer.line,reason:answer.reason};
          s.applyStatus(u,{kind:'rally',turns:2,magnitude:1});enemy.stats.morale=Math.max(0,enemy.stats.morale-10);
          s.push({t:'event',id:`refuse:${kind}:${u.id}:${enemy.id}`});
          const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
        }
        this.lastRefusal=null;this.lastAccept={kind,line:answer.line,historic:answer.reason==='historic'};
        this.activeDuel=newDuel(kind,{id:u.id,name:u.name,stat:stat(u)},{id:enemy.id,name:enemy.name,stat:stat(enemy)});this.lastDuel=null;return {ok:true};
      }
      if(cmd.item==='heal'&&this.deployment&&familyOf(u.unitClass)==='fengshui'){
        const target=s.find(cmd.target??'');
        if(s.hasStatus(u,'seal')||!target?.alive||target.side==='enemy'||target.hp>=target.stats.maxHp||manhattan(u.pos,target.pos)>3||u.mp<8)return {ok:false,error:'MP 8과 3칸 이내의 부상당한 아군이 필요합니다.'};
        const amount=Math.min(healAmount(30,u.stats.intellect,u.traitParams.healPower??0),target.stats.maxHp-target.hp);target.hp+=amount;u.mp-=8;
        s.push({t:'strategy',caster:u.id,strategy:'heal',targets:[target.id],damage:[-amount]});
        const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
      // 진정: a first-aid kit spent to bring a confused ally (within two tiles) back to their senses.
      if(cmd.item==='calm'&&stageRules[s.stage.id]?.calm){
        const target=s.find(cmd.target??'');
        if(this.medicine<=0||!target?.alive||(target.side!=='player'&&target.side!=='ally')||!s.hasStatus(target,'confusion')||manhattan(u.pos,target.pos)>2)return {ok:false,error:'2칸 이내에서 혼란에 빠진 아군과 남은 구급약이 필요합니다.'};
        target.statuses=target.statuses.filter(x=>x.kind!=='confusion');this.medicine--;
        s.push({t:'strategy',caster:u.id,strategy:'calm',targets:[target.id],damage:[0]});
        const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
      if(cmd.item==='repair'){
        const target=s.find(cmd.target??''),error=repairError(s,u,target);if(error)return {ok:false,error};
        const amount=repairAmount(u,target!);target!.hp+=amount;s.push({t:'strategy',caster:u.id,strategy:'repair',targets:[target!.id],damage:[-amount]});
        const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
      if(cmd.item==='fortify'){
        const at=parseCell(cmd.target),built=this.fortified.get(u.id)??0,error=fortifyError(s,u,at,built);if(error)return {ok:false,error};
        const work=buildBarricade(s,u,at!);this.fortified.set(u.id,built+1);s.push({t:'spawn',units:[work.id],side:work.side});
        const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
      if(cmd.item==='scout'&&!this.scouted){
        this.scouted=true;const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
      if(cmd.item==='medicine'&&u.canUseItems&&u.unitClass!=='civilian'&&this.medicine>0&&u.hp<u.stats.maxHp){
        this.medicine--;u.hp=Math.min(u.stats.maxHp,u.hp+Math.ceil(u.stats.maxHp*.4));
        const result=this.battle.execute({kind:'wait',unit:u.id});this.advanceScenario();return result;
      }
      return {ok:false,error:'구급약은 부상당한 본대 장수만 사용할 수 있습니다.'};
    }
    const paying=cmd.kind==='choose'&&((cmd.nodeId==='bribe'&&cmd.optionId==='pay')||(cmd.nodeId==='lie_failed'&&cmd.optionId==='pay_late'));
    const gate=cmd.kind==='choose'&&cmd.nodeId==='gate_payment'&&cmd.optionId==='pay_gate';
    const cost=gate?1000:paying?(this.bribes===0?1000:1500):0;
    if(cost>this.funds)return {ok:false,error:'지참금이 부족합니다. 무르기로 직전 선택을 바꿀 수 있습니다.'};
    const result=this.battle.execute(cmd);
    if(result.ok){
      this.funds-=cost;
      if(paying){this.bribes++;for(const e of this.state.living('enemy'))this.state.applyStatus(e,{kind:'confusion',turns:3,magnitude:1});}
      // A destructible gate occupies the exit tile in revision 4. Paying at
      // the adjacent checkpoint admits both brothers without attacking it.
      if(gate&&this.revision>=4&&s.outcome==='ongoing'){
        s.outcome='victory';s.push({t:'outcome',outcome:'victory'});
      }
      this.advanceScenario();
    }
    return result;
  }
  /** 『삼국지연의』 장수록의 능력·고유능력을 처음 보는 장수에게 입힌다(현행 규칙 전투만). */
  /** 지켜야 할 대상: 쓰러지면 지거나 목표를 잃는 아군·NPC(필수 생존 장수, 호송·구출 대상, 피난민 등 민간인). */
  private mustSurvive(state:BattleState,u:Unit){
    if(u.side==='enemy')return false;
    if(u.unitClass==='civilian'||['convoy_trial','rescue_target'].includes(u.id))return true;
    if(state.stage.defeat.some(d=>d.type==='retreat'&&d.unit===u.id))return true;
    const rules=stageRules[state.stage.id];
    if(rules?.protect?.some(p=>p.unit===u.id)||(this.chapter===8||this.chapter===9)&&u.id==='cao_cao')return true;
    return MUST_SURVIVE.has(u.id);
  }
  /** 화면에 보일 승리·패배 조건: 스테이지 판정 조건 + 지켜야 할 장수 + 기한. */
  get conditions():BattleConditions{
    const st=this.state,rules=stageRules[st.stage.id];
    const ids=new Set([...(rules?.protect??[]).map(p=>p.unit),...MUST_SURVIVE,...(this.chapter===8||this.chapter===9?['cao_cao']:[])]);
    const guarded=[...ids].map(id=>st.find(id)).filter(u=>u&&u.side!=='enemy').map(u=>u!.name);
    const c=battleConditions(st,{guarded,deadline:this.deadline??60});
    const m=this.deployment?.mission;if(m&&(m.version??1)>=3)c.win=[trialGoalText(m.id)];
    return c;
  }
  private applyRomanceToNew(state:BattleState){
    // 지켜야 할 대상은 한 번의 공격으로 최대 체력의 40%보다 많이 잃지 않는다(한 방에 쓰러지지 않게).
    for(const u of state.living())if(!u.traits.includes('steadfast')&&this.mustSurvive(state,u)){u.traits.push('steadfast');u.traitParams.steadfast=STEADFAST_CAP;}
    if(this.revision<4)return;
    // 꿈속의 환영과 호위 대상(일부러 맞춘 체력·이동)은 연의 능력을 입히지 않는다.
    const escorts=new Set([...(stageRules[state.stage.id]?.protect??[]).map(p=>p.unit),...(this.chapter===8||this.chapter===9?['cao_cao']:[])]);
    const edge=(stageRules[state.stage.id]?.foeEdge??foeEdges[state.stage.id])?.[this.difficulty]??0;
    for(const u of state.living())if(!this.romanced.has(u.id)){this.romanced.add(u.id);u.classTactics=true;if(this.revision===5){const fixed=escorts.has(u.id)||!!structureKind(u.id);if(!u.name.endsWith('환영')&&!escorts.has(u.id))applyRomance(u,false);applyCC(u,fixed);}else if(!u.name.endsWith('환영')&&!escorts.has(u.id))applyRomance(u);
      if(edge&&u.side==='enemy'&&!/^(gate|tower)_/.test(u.id)){const hp=u.hp/u.stats.maxHp;u.stats.attack=Math.round(u.stats.attack*(1+edge/100));u.stats.maxHp=Math.round(u.stats.maxHp*(1+edge/100));u.hp=Math.max(1,Math.round(u.stats.maxHp*hp));}}
  }
  /**
   * 일기토·설전 도전에 상대가 응하는가: 연의의 실제 대결은 반드시, 그 밖에는 성격·능력 차·부상에 따라.
   * 꿈속의 환영은 피하지 않는다(무모처럼 무엇이든 받는다). 화면 안내와 봇도 같은 판단을 쓴다.
   */
  challengeAnswer(u:Unit,enemy:Unit,kind:'duel'|'debate'){
    const stat=(x:Unit)=>kind==='duel'?martialPower(x):x.stats.intellect,plain=(x:Unit)=>x.name.replace(/의?\s*환영$/,'');
    const temper=/환영$/.test(enemy.name)?'reckless' as const:temperOf(plain(enemy));
    return duelResponse(kind,{name:plain(u),stat:stat(u)},{name:plain(enemy),stat:stat(enemy),...(temper?{temper}:{}),hp:enemy.hp/Math.max(1,enemy.stats.maxHp)});
  }
  /** 원정 부대의 경험치 시작점: 원정 전투는 부대 전원, 원정 속 연의 전장은 사마의. */
  xpBase():Record<string,{level:number;xp:number}>|undefined{
    const d=this.deployment;if(d?.run)return Object.fromEntries(d.run.party.map(u=>[u.id,{level:u.level,xp:u.xp}]));
    if(d?.runStory)return {sima_yi:{level:d.runStory.heroLevel,xp:d.runStory.heroXp??0}};
    return undefined;
  }
  /** 새 기록을 읽어 경험치를 쌓고, 원정 레벨이 오르면 전투 중에도 곧바로 레벨업한다. */
  private applyBattleXp(){
    const base=this.xpBase(),s=this.state;if(!base){this.xpCursor=s.log.length;return;}
    const batch=s.log.slice(this.xpCursor);this.xpCursor=s.log.length;
    for(const {entry,gain} of xpFromLog(batch,id=>id in base,id=>s.find(id)?.level??1)){
      const b=base[gain.unit]!,before=this.xpEarned[gain.unit]??0,after=before+gain.amount;this.xpEarned[gain.unit]=after;
      const from=b.level+Math.floor((b.xp+before)/XP_PER_LEVEL),to=b.level+Math.floor((b.xp+after)/XP_PER_LEVEL),u=s.find(gain.unit);
      // 연의 전장에서 사마의의 전장 레벨이 원정 레벨과 다르면(연의 진행 레벨) 표시만 하고 능력치는 건드리지 않는다.
      const up=to>from&&!!u?.alive&&u.level===from;let learned:string[]=[];
      if(up){levelUpInBattle(u!,to);
        // 레벨이 오를 때마다 그 레벨에 열린 계통 책략을 새로 익힌다(이미 아는 것은 그대로).
        {const hero=(OFFICERS as readonly string[]).includes(u!.id)&&u!.side==='player'&&['strategist','fengshui'].includes(familyOf(u!.unitClass)),now=hero?availableStrategies(to,!!this.deployment?.growth,undefined):troopStrategies(u!.unitClass,to)??[],fresh=now.filter(id=>!u!.strategies.includes(id));
          u!.strategies=[...u!.strategies,...fresh];learned=fresh.map(id=>allStrategies.find(x=>x.id===id)?.name??id);}}
      this.xpGains.set(entry,{...gain,...(up?{level:to}:{}),...(learned.length?{learned}:{})});
    }
  }
  /**
   * 연의의 맞수가 8방으로 붙으면 저절로 일기토·설전이 벌어진다(한 짝에 한 번). 내 차례든 적 차례든 일어나며 행동을 쓰지 않는다.
   * 결정적이라 저장 기록을 다시 재생해도 같은 때에 같은 대결이 열린다.
   */
  private autoEncounter(){
    const s=this.state;if(this.revision<4||this.activeDuel||s.outcome!=='ongoing'||s.activeDialogue)return;
    const plain=(x:Unit)=>x.name.replace(/의?\s*환영$/,''),fighter=(x:Unit)=>!['civilian','ram','catapult'].includes(x.unitClass)&&!/^(gate|tower)_/.test(x.id);
    for(const u of s.living()){if(!CONTROLLABLE.has(u.side)||!fighter(u))continue;
      for(const e of s.living('enemy')){if(!fighter(e)||Math.max(Math.abs(u.pos.x-e.pos.x),Math.abs(u.pos.y-e.pos.y))>1)continue;
        const h=historicPair(plain(u),plain(e));if(!h||this.challenged.has(h.kind+':'+u.id+':'+e.id))continue;
        this.challenged.add(h.kind+':'+u.id+':'+e.id);
        const stat=(x:Unit)=>h.kind==='duel'?martialPower(x):debatePower(x);
        this.lastRefusal=null;this.lastAccept={kind:h.kind,line:h.kind==='duel'?`${plain(e)}! ${h.note} — 오늘 결판을 내자!`:`${plain(e)}, ${h.note} — 그대의 말을 들어 보리다.`,historic:true};
        this.activeDuel={...newDuel(h.kind,{id:u.id,name:u.name,stat:stat(u)},{id:e.id,name:e.name,stat:stat(e)}),auto:true};this.lastDuel=null;
        s.push({t:'event',id:`encounter:${h.kind}:${u.id}:${e.id}`});
        return;
      }}
  }
  private advanceScenario(){
    const s=this.state,old=this.phase;
    this.autoEncounter();
    this.applyBattleXp();
    this.applyRomanceToNew(s);
    if(this.deployment?.mission?.balance===1)for(const enemy of s.living('enemy'))if(!this.balancedEnemies.has(enemy.id)){
      const scale=missionEnemyScale(this.deployment.mission.id);enemy.stats.attack=Math.round(enemy.stats.attack*scale.attack);if(scale.hp!==1&&enemy.hp===enemy.stats.maxHp){enemy.stats.maxHp=Math.round(enemy.stats.maxHp*scale.hp);enemy.hp=enemy.stats.maxHp;}this.balancedEnemies.add(enemy.id);
    }
    if((this.deployment?.mission?.version??1)>=3)for(const u of s.living('enemy'))if(u.goalRegion==='trial_defense')u.stats.movement=3;
    if(this.revision>=4)applyOfficerFeatures(s.living(),this.deployment?.growth);
    // Breach rally belongs to the revision-4 siege rules (ram company, engineers).
    if(this.revision>=4)for(const gate of s.units.values())if(structureKind(gate.id)==='gate'&&!gate.alive&&!this.breached.has(gate.id)){this.breached.add(gate.id);breachRally(s,gate);}
    const rules=stageRules[s.stage.id],view={state:s,difficulty:this.difficulty,journalLength:this.journal.length,scouted:this.scouted};
    if(rules){
      const lost=s.outcome==='ongoing'?rules.tick?.(view):undefined;if(lost){this.failure=lost;s.outcome='defeat';s.push({t:'outcome',outcome:'defeat'});}
      if(rules.deadline&&s.outcome==='ongoing'&&s.turn>rules.deadline){this.failure=rules.deadlineText??`${rules.deadline}턴 안에 작전을 마치지 못했습니다.`;s.outcome='defeat';s.push({t:'outcome',outcome:'defeat'});}
      this.phase=rules.phase?.(view)??s.scenarioPhase??this.phase;
      if(s.outcome==='defeat'&&!this.failure)this.failure=rules.failure?.(view)??'';
    }else if(this.chapter===10){
      const who:Record<string,string>={zhang_zhao:'장소',lu_meng:'여몽',zhuge_jin:'제갈근',sun_quan:'손권',accord:'맹약'};
      this.phase=`설득 · ${who[s.activeDialogue??'']??'맹약'} · 신뢰 ${this.trust}/${this.trustLimit}`;
      if(s.outcome==='ongoing'&&this.trust<=0){this.failure='손권 조정의 신뢰를 잃었습니다. 사신단이 쫓겨났습니다.';s.activeDialogue=null;s.outcome='defeat';s.push({t:'outcome',outcome:'defeat'});}
    }else if(this.chapter===9&&s.scenarioPhase==='조운 봉쇄'){
      this.phase=`조운 봉쇄 ${encircled(s,'zhao_yun')}/4 · 사방을 막으세요`;
      if(s.outcome==='defeat'&&!s.find('cao_cao')?.alive)this.failure='조조가 퇴각했습니다.';
    }else if(this.chapter===8&&s.scenarioPhase==='부교 재건'){
      this.phase=`부교 재건 ${Math.min(2,s.heldTurns('bridge_bank','player'))}/2 · 강변을 지키세요`;
      if(s.outcome==='defeat'&&!s.find('cao_cao')?.alive)this.failure='조조가 퇴각했습니다.';
    }else if(s.scenarioPhase){
      this.phase=s.scenarioPhase;
      if((this.chapter===8||this.chapter===9)&&s.outcome==='defeat'&&!s.find('cao_cao')?.alive)this.failure='조조가 퇴각했습니다.';
    }else if(this.chapter===2){
      const hero=s.get('sima_yi');
      if(s.map.regionCoords('warehouse').some(p=>key(p)===key(hero.pos)))s.captured.set('warehouse','player');
      if(s.captured.has('warehouse')){
        this.phase='민중 무장 · 습격대 격퇴';
        for(const u of s.living('allyAi'))if(u.id.startsWith('refugee_')&&u.unitClass==='civilian'&&manhattan(hero.pos,u.pos)<=1){
          const trained=makeUnit({id:u.id,name:u.name,side:'allyAi',unitClass:'infantry',level:u.level,pos:u.pos,behavior:'advance'});
          const ratio=u.hp/u.stats.maxHp;u.unitClass='infantry';u.stats=trained.stats;u.hp=Math.ceil(u.stats.maxHp*ratio);u.range=trained.range;
          u.behavior='advance';delete u.goalRegion;
          s.captured.set('militia','player');
        }
      }
      // Acquisition is latched; the hero need not remain in the warehouse.
      if(s.outcome==='ongoing'&&s.captured.has('warehouse')&&s.captured.has('militia')&&!s.living('enemy').length){s.outcome='victory';s.push({t:'outcome',outcome:'victory'});}
    }else if(this.chapter===0){
      const combat=s.victory.some(v=>v.type==='annihilate');
      if(this.revision>=4)for(const tower of s.living('enemy').filter(u=>u.id.startsWith('tower_')))tower.behavior=combat?'hold':'passive';
      this.phase=combat?'교전 돌파':this.bribes?'남문으로':'잠입';
      if(!combat&&s.outcome==='ongoing'&&!s.activeDialogue&&['sima_yi','sima_lang'].every(id=>s.map.regionCoords('south_gate').some(p=>(key(p)===key(s.get(id).pos)||(this.revision>=4&&manhattan(p,s.get(id).pos)<=1))))){
        if(this.funds<1000){this.failure='남문 통행료 1,000전이 부족합니다.';s.outcome='defeat';s.push({t:'outcome',outcome:'defeat'});}
        else {s.activeDialogue='gate_payment';this.phase='남문 통행';}
      }
    }else if(this.chapter===3){
      const target=s.victory.find(c=>c.type==='reach')?.target;
      this.phase=target==='east_pass'?'동쪽 고개로 탈출':target==='ravine_exit'?'남쪽 계곡으로 탈출':'탈출로 선택';
      if(s.outcome==='ongoing'&&this.pressure>=this.pressureLimit){this.failure='추격 압박이 한계에 도달해 퇴로가 봉쇄되었습니다.';s.outcome='defeat';s.push({t:'outcome',outcome:'defeat'});}
    }else if(this.chapter===6){
      this.phase=s.activeDialogue?'호위 병력 배치':s.find('ma_chao')?.alive?'조조 호위 · 마초 격퇴':'본대로 관문 확보';
      if(s.outcome==='defeat'&&!s.find('cao_cao')?.alive)this.failure='후방의 조조가 퇴각했습니다.';
    }else if(this.chapter===5){
      const target=s.victory.find(v=>v.type==='reach')?.target??'escort_goal';
      for(const id of ['convoy_a','convoy_b']){const u=s.find(id);if(!u)continue;const waypoint=id+'_south';if(target==='south_exit'&&u.pos.y>=14&&u.pos.x>=10)s.captured.set(waypoint,'player');u.goalRegion=target==='south_exit'&&!s.captured.has(waypoint)?'south_approach':target;}
      this.phase=s.activeDialogue?'수송로 선택':target==='south_exit'?'남쪽 강변 호위':'교량길 호위';
      if(s.outcome==='defeat'&&!s.living('allyAi').length)this.failure='수송대 두 부대가 모두 소실되었습니다.';
    }else if(!s.find('zhang_lu')?.alive)this.phase='본대로 성채 점령';
    if(old!==this.phase)this.phaseCheckpoint=this.journal.length;
    if(s.outcome==='defeat'&&(this.deployment?.mission?.version??1)>=3){
      const protectedUnit=s.find('convoy_trial')??s.find('rescue_target');
      if(protectedUnit&&!protectedUnit.alive)this.failure=protectedUnit.name+'의 안전을 지키지 못했습니다.';
      else if(s.victory.some(c=>c.type==='survive_turns')&&s.living('enemy').some(u=>s.map.regionCoords('trial_defense').some(p=>key(p)===key(u.pos))))this.failure='적이 방어 거점에 진입했습니다.';
    }
    if(s.outcome==='defeat'&&!this.failure)this.failure=s.turn>60?'60턴 안에 작전을 마치지 못했습니다.':this.chapter===1&&s.living('allyAi').some(u=>s.map.regionCoords('central_fort').some(p=>key(p)===key(u.pos)))?'경쟁 우군이 성채를 선점했습니다.':'필수 생존 장수가 퇴각했습니다.';
  }
  get seals(){
    if(this.state.outcome!=='victory')return [];
    const rules=stageRules[this.state.stage.id],custom=rules?.seals?.({state:this.state,difficulty:this.difficulty,journalLength:this.journal.length});if(custom)return custom;
    if(this.chapter===10){const finalTries=this.state.choices.filter(c=>c.nodeId==='sun_quan').length;return [1,...(this.wrongAnswers===0?[2]:[]),...(finalTries===1?[3]:[])];}
    if(this.chapter===9)return [1,...(this.state.firedEvents.has('flood/lock')?[2]:[]),...(this.state.turn<=(this.difficulty==='extreme'?12:14)?[3]:[])];
    if(this.chapter===5)return [1,...(['convoy_a','convoy_b'].every(id=>this.state.find(id)?.alive)?[2]:[]),...(this.state.turn<=(this.difficulty==='extreme'?9:10)?[3]:[])];
    if(this.chapter===0)return [1,...(this.bribes===0&&!this.state.choices.some(c=>c.nodeId==='bribe')?[2]:[]),...(['sima_yi','sima_lang'].every(id=>{const u=this.state.get(id);return u.alive&&u.hp>=u.stats.maxHp*.5;})?[3]:[])];
    return awardedSeals(this.state,this.difficulty);
  }
  /** The turn by which the stage must be won, when its rules set one. */
  get deadline(){return stageRules[this.state.stage.id]?.deadline;}
  get somber(){return stageRules[this.state.stage.id]?.somber===true;}
  get canCalm(){return stageRules[this.state.stage.id]?.calm===true;}
  get weather(){return this.chapter===4?'☾ 흉몽 · 짙은 안개':stageRules[this.state.stage.id]?.weather??'☀ 맑음 · 바람 약함';}
  get sealNames(){const named=stageRules[this.state.stage.id]?.sealNames;if(named)return named;return this.chapter===10?['맹약 성사','실언 없는 설득','손권을 단번에']:this.chapter===9?['조조 탈출','조운 봉쇄','신속한 철수']:this.chapter===8?['야곡 출구 도착','손실 최소화','신속한 철수']:this.chapter===7?['전초 수비망 격파','전 부대 생환','신속한 진격']:this.chapter===6?['관문 돌파','호위 부대 보존','신속한 제압']:this.chapter===5?['수송대 탈출','수송대 두 부대 생존','신속한 철수']:this.chapter===4?['흉몽 돌파','사마의 생존','빠른 각성']:this.chapter===0?['탈출 성공','무발각 잠입','형제 체력 50%']:this.chapter===2?['가문 수호','민중·부대 전원 생존','신속한 방어']:this.chapter===3?['산길 탈출','형제 생존','추격 따돌리기']:['성채 점령','신속한 결단','병력 보존'];}
  restorePhase(){if(this.phaseCheckpoint===null)return false;this.journal=this.journal.slice(0,this.phaseCheckpoint);this.checkpoints=this.checkpoints.filter(n=>n<this.journal.length);this.replay();return true;}
  tick(){
    if(this.state.outcome!=='ongoing' || this.state.activeDialogue || this.activeDuel) return false;
    if(CONTROLLABLE.has(this.state.currentSide)){
      if(this.state.living(this.state.currentSide).some(u=>!u.hasActed)) return false;
      this.battle.endPhase();this.advanceScenario();this.journal.push({kind:'endPhase'});
    } else {this.battle.stepAi();this.advanceScenario();this.journal.push({kind:'aiTick'});}
    return true;
  }
  undo(){
    const until=this.checkpoints.pop(); if(until===undefined)return false;
    this.journal=this.journal.slice(0,until);this.replay();return true;
  }
  private replay(){
    const entries=[...this.journal];this.journal=[];this.battle=this.create();this.resetScenario();
    for(const entry of entries){
      if(entry.kind==='aiTick'){this.battle.stepAi();this.advanceScenario();}
      else if(!this.execute(entry).ok)throw new Error('저장 기록이 현재 전투와 맞지 않습니다.');
      this.journal.push(entry);
    }
  }
  save():Save{return {version:2,revision:this.revision,chapter:this.chapter,difficulty:this.difficulty,seed:this.seed,preparation:this.preparation,...(this.deployment?{deployment:structuredClone(this.deployment)}:{}),journal:this.journal,checkpoints:this.checkpoints};}
  static load(raw:unknown){
    const data=raw as Save;
    if(!data || data.version!==2 || !chapters[data.chapter] || !['survival','strategy','command'].includes(data.preparation) || !['normal','extreme'].includes(data.difficulty) || !Number.isSafeInteger(data.seed) || !Array.isArray(data.journal) || data.journal.length>20000 || !Array.isArray(data.checkpoints) || !data.checkpoints.every((n,i,a)=>Number.isInteger(n)&&n>=0&&n<data.journal.length&&(i===0||n>a[i-1]!))) throw new Error('저장 파일을 읽을 수 없습니다.');
    if(data.revision!==undefined&&data.revision!==2&&data.revision!==3&&data.revision!==4&&data.revision!==5)throw new Error('지원하지 않는 전장 버전입니다.');
    if(data.deployment){const d=data.deployment;if(!d.levels||!d.equipped||!OFFICERS.every(id=>Number.isInteger(d.levels[id])&&d.levels[id]!>=1&&d.levels[id]!<=40)||Object.entries(d.equipped).some(([id,item])=>!OFFICERS.includes(id as typeof OFFICERS[number])||!treasures.some(t=>t.id===item)))throw new Error('잘못된 출진 기록입니다.');}
    if(data.deployment?.run){const r=data.deployment.run;
      if(!Number.isInteger(r.floor)||r.floor<1||r.floor>RUN_FLOORS||!['battle','elite','boss','tale'].includes(r.kind)||(r.kind==='tale')!==!!taleById(r.tale)||(r.route!==undefined&&!validRoute(r.route))||!Number.isSafeInteger(r.seed)||!Array.isArray(r.party)||r.party.length<1||r.party.length>PARTY_LIMIT||!r.party.some(u=>u.hero)||!Array.isArray(r.relics)
        ||r.party.some(u=>typeof u.id!=='string'||!Number.isInteger(u.level)||u.level<1||u.level>60||!(u.hp>0&&u.hp<=1)))throw new Error('잘못된 원정 기록');
      for(const u of r.party)statsFor(u.unitClass,u.level);
    }
    if(data.deployment?.scenario||data.deployment?.run?.mods){const sc=data.deployment.scenario;
      for(const m of [sc?.mods??{},data.deployment.run?.mods??{}]){
        if((m.reinforce!==undefined&&(!Array.isArray(m.reinforce)||m.reinforce.length>4||m.reinforce.some(x=>typeof x?.name!=='string'||!['npc','ally'].includes(x.side))))||Object.entries(m).some(([k,v])=>k!=='reinforce'&&typeof v!=='boolean'))throw new Error('잘못된 시나리오 기록');
        for(const x of m.reinforce??[])statsFor(x.unitClass,1);}
      if(sc&&(typeof sc.chapter!=='string'||sc.chapter.length>40))throw new Error('잘못된 시나리오 기록');
      if(sc&&sc.recruits!==undefined&&(!Array.isArray(sc.recruits)||sc.recruits.length>3||sc.recruits.some(x=>typeof x?.name!=='string'||typeof x.id!=='string'||!(x.level>=1&&x.level<=99)||!(x.hp>0&&x.hp<=1))))throw new Error('잘못된 시나리오 기록');
      for(const x of sc?.recruits??[])statsFor(x.unitClass,1);
      if(sc&&((sc.relics!==undefined&&(!Array.isArray(sc.relics)||sc.relics.length>12||sc.relics.some(x=>typeof x!=='string')))||(sc.heroHp!==undefined&&!(sc.heroHp>0&&sc.heroHp<=1))))throw new Error('잘못된 시나리오 기록');
      if(data.deployment.run&&data.deployment.run.enemyBase!==undefined&&(!Number.isInteger(data.deployment.run.enemyBase)||data.deployment.run.enemyBase<1||data.deployment.run.enemyBase>60))throw new Error('잘못된 시나리오 기록');}
    if(data.deployment?.runStory){const r=data.deployment.runStory;
      if(!Number.isInteger(r.floor)||r.floor<1||r.floor>RUN_FLOORS||typeof r.stage!=='string'||!chapters.some(c=>c.stage.id===r.stage)||chapters[data.chapter]?.stage.id!==r.stage||!Number.isSafeInteger(r.seed)
        ||!Number.isInteger(r.heroLevel)||r.heroLevel<1||r.heroLevel>60||(r.heroXp!==undefined&&(!Number.isInteger(r.heroXp)||r.heroXp<0||r.heroXp>=XP_PER_LEVEL))||!(r.heroHp>0&&r.heroHp<=1)||!Array.isArray(r.relics)||r.relics.some(x=>typeof x!=='string'))throw new Error('잘못된 원정 기록');
    }
    if(data.deployment?.extraOfficers!==undefined&&(!Array.isArray(data.deployment.extraOfficers)||data.deployment.extraOfficers.length>2||data.deployment.extraOfficers.some(id=>!OFFICERS.includes(id as typeof OFFICERS[number]))))throw new Error('잘못된 출진 편성');
    if(data.deployment?.loadouts){const seen=new Set<string>();for(const [who,gear] of Object.entries(data.deployment.loadouts)){if(!OFFICERS.includes(who as typeof OFFICERS[number])||!gear||typeof gear!=='object')throw new Error('잘못된 장비');for(const [slot,id] of Object.entries(gear)){if(typeof id!=='string'||!treasures.some(t=>t.id===id)||treasureInfo(id).slot!==slot||seen.has(id))throw new Error('잘못된 장비');seen.add(id);}}}
    if(data.deployment?.mission&&(!expeditions.some(m=>m.id===data.deployment!.mission!.id)||typeof data.deployment.mission.runId!=='string'||data.deployment.mission.runId.length<1||data.chapter!==7||(data.deployment.mission.version!==undefined&&data.deployment.mission.version!==2&&data.deployment.mission.version!==3&&data.deployment.mission.version!==4)))throw new Error('잘못된 외전 기록');
    if(data.deployment?.mission?.balance!==undefined&&data.deployment.mission.balance!==1)throw new Error('지원하지 않는 성장 규칙입니다.');
    if(data.deployment?.mission?.supportClasses&&(!Array.isArray(data.deployment.mission.supportClasses)||data.deployment.mission.supportClasses.length!==2||data.deployment.mission.supportClasses.some(k=>!supportOptions.includes(k))))throw new Error('잘못된 지원 병종');
    if(data.deployment?.perks!==undefined&&!validGrants(data.deployment.perks))throw new Error('잘못된 연구·장수 효과 기록');
    if(data.deployment?.growth&&Object.values(data.deployment.growth).some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('잘못된 성장 기록');
    const session=new Session(data.chapter,data.difficulty,data.seed,data.preparation,data.revision??2,data.deployment?structuredClone(data.deployment):undefined);
    session.journal=structuredClone(data.journal);session.checkpoints=[...data.checkpoints];session.replay();return session;
  }
}
