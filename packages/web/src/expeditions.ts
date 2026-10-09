import {configureTrialGoal} from './expedition-objectives.ts';
import {trialMap,expeditionLandscape,navalEnemies,trialLayout} from './expedition-scenes.ts';
import {layoutMap} from './expedition-maps-data.ts';
import type {MapFile,StageDef,UnitClass} from '../../core/src/index.ts';
import base from '../../data/stages/S1-07.json';
import {treasures,levelInfo,OFFICERS,type Campaign} from './progression.ts';
export type ExpeditionKind='training'|'quest'|'bounty'|'challenge';
export interface Expedition {id:string;name:string;kind:ExpeditionKind;level:number;requires:number;art:number;lines:string[];/** 도전 퀘스트 단계(1~10) */step?:number}
/** 반복 퀘스트 · 보물 사냥: 이길 때마다 꾸러미에서 아직 없는 보물 하나. */
const bounties:Array<[string,number,number,number,string,string,string]>=[
 ['산적 소굴 소탕',1,6,11,'길잡이: 산적 소굴에 약탈한 물건이 쌓여 있습니다. 갈 때마다 다른 것이 나오지요.','사마의: 소굴을 칠 때마다 길이 조금씩 안전해질 것입니다.','길잡이: 이번에도 쓸 만한 물건이 나왔습니다. 소굴은 또 채워질 테지요.'],
 ['도적 군량 탈환',3,12,2,'수문장: 도적이 군량 수레를 노리고 또 모였습니다.','조진: 군량을 지키면 그들이 숨긴 장비도 손에 들어온다.','수문장: 군량도 지키고 도적의 장비도 거뒀습니다.'],
 ['변경 봉화대 수비',5,18,6,'봉화대장: 변경에 오랑캐가 밤마다 내려옵니다.','사마의: 봉화를 지키면 그들이 남긴 무구를 거둘 수 있습니다.','봉화대장: 봉화가 꺼지지 않았습니다. 남긴 무구를 가져가십시오.'],
 ['오환 기병 추격',7,24,3,'조진: 오환 기병이 말을 훔쳐 북으로 달아났다.','사마의: 창병으로 길을 막고 궁병으로 퇴로를 끊겠습니다.','조진: 말도 되찾고 그들의 활과 갑옷도 얻었다.'],
 ['남만 보급로 개척',8,30,17,'남만 길잡이: 독기 서린 숲길에 등갑을 입은 무리가 버티고 있습니다.','사마의: 불과 물을 가려 쓰며 길을 열겠습니다.','남만 길잡이: 숲길이 열렸습니다. 그들의 보물은 이제 장군의 것입니다.'],
];
/** 도전 퀘스트: 10단계. 앞 단계를 넘어야 다음 단계가 열리고, 단계마다 적이 늘고 강해진다. 5·10단계에는 수문장. */
const challengeSteps:Array<[string,number,number,number,string,string,string]>=[
 ['첫 번째 문 · 들판의 시험',0,4,6,'시험관: 열 개의 문이 있다. 첫 문은 들판에서 연다.','사마의: 첫 문부터 진형을 흐트러뜨리지 않겠습니다.','시험관: 첫 문을 넘었다. 다음 문은 더 거세다.'],
 ['두 번째 문 · 갈대숲',1,7,11,'시험관: 갈대숲에 숨은 적이 두 번 밀려온다.','조진: 숲을 등지고 증원을 받아 내자.','시험관: 숲을 넘었다. 이제 강이다.'],
 ['세 번째 문 · 다리목',2,10,3,'시험관: 다리 하나를 두고 세 번의 물결이 온다.','사마의: 다리목을 막고 후열을 지키겠습니다.','시험관: 다리를 지켜 냈다.'],
 ['네 번째 문 · 관문 산길',3,13,11,'시험관: 굽이진 산길, 적은 늘고 길은 좁다.','조진: 길목마다 창을 세우자.','시험관: 산길을 넘었다. 다음 문에는 수문장이 기다린다.'],
 ['다섯 번째 문 · 군수고 수문장',4,16,2,'수문장: 여기까지 온 자는 많지 않다. 나를 넘어 보아라.','사마의: 수문장을 묶고 호위를 먼저 무너뜨리겠습니다.','시험관: 수문장을 꺾었다. 절반을 넘었다.'],
 ['여섯 번째 문 · 궁궐 앞뜰',5,20,14,'시험관: 궁궐 앞뜰, 정예가 사방에서 몰려온다.','사마의: 회랑을 나누어 막고 하나씩 치겠습니다.','시험관: 앞뜰을 지켰다.'],
 ['일곱 번째 문 · 검각 잔도',6,24,11,'시험관: 벼랑 사이 잔도, 물러설 곳이 없다.','조진: 좁은 길이 오히려 우리 편이다.','시험관: 잔도를 넘었다.'],
 ['여덟 번째 문 · 한수 여울',7,28,3,'시험관: 여울을 건너는 동안 적의 기병이 덮친다.','사마의: 여울목 앞에 창병을 세우고 기다리겠습니다.','시험관: 여울을 건넜다. 두 문 남았다.'],
 ['아홉 번째 문 · 박망파',8,32,11,'시험관: 박망파의 숲, 네 번의 물결이 온다.','조진: 버티면 반드시 틈이 생긴다.','시험관: 박망파를 넘었다. 마지막 문이다.'],
 ['열 번째 문 · 패왕의 성채',8,36,17,'패왕의 수문장: 열 번째 문은 아무도 넘지 못했다.','사마의: 오늘 처음으로 넘는 자가 나올 것입니다.','시험관: 열 개의 문을 모두 넘었다. 천하제일검과 패왕갑은 그대의 것이다.'],
];
const tales:Array<[string,number,number,number,string,string,string]>=[
 ['흩어진 무구',1,2,9,'사마랑: 피난민의 수레에 가문의 무구와 군고가 실려 있었다.','사마의: 약탈대의 길목을 막고, 무구가 주인을 찾게 하겠습니다.','장인: 자웅일대검과 고정도를 손질했습니다. 피갑과 군고도 가져가십시오.'],
 ['봉인된 군수고',2,3,2,'사마방: 낙양을 떠나며 맡긴 군수고에 도적이 들었다.','사마의: 군수고의 열쇠를 되찾아 남은 이들의 장비를 마련하겠습니다.','수문장: 열쇠를 되찾았군요. 사모와 비도, 쇄자갑과 장군인을 받아 주십시오.'],
 ['산길의 약속',2,4,11,'길잡이: 고개를 지키던 동료들이 산적에게 쫓겨났습니다.','사마랑: 우회로를 확보하고 장인들을 안전하게 돌려보내자.','길잡이: 봉취도와 월아극, 어린갑과 비운안을 약속대로 드립니다.'],
 ['활시위의 비밀',3,5,6,'노장: 사수들이 지키는 진지를 뚫어 보아라. 무작정 다가오면 쓰러질 것이다.','사마의: 숲을 이용해 접근하고 기병으로 측면을 열겠습니다.','노장: 철태궁과 원융노를 맡긴다. 등갑과 손자병법도 전술에 보탬이 될 것이다.'],
 ['병서가 잠든 사당',4,6,14,'학자: 사당을 점거한 무리가 병서를 불태우려 합니다.','사마의: 기록이 사라지면 다음 세대는 같은 실수를 되풀이합니다.','학자: 육도와 명광개를 지켰습니다. 삼첨도와 강편도 함께 가져가십시오.'],
 ['잃어버린 군마',5,7,3,'조진: 군마를 빼앗은 기병이 능선에 진을 쳤다.','사마의: 창병으로 돌격을 막고 노병으로 퇴로를 끊으십시오.','조진: 양유궁과 개산부, 현철갑과 삼략을 회수했다. 다음 싸움에 쓰자.'],
 ['용담의 시험',6,8,17,'백마의 무인: 창은 용기만으로 다루는 것이 아니다. 동료를 지키는 눈이 필요하다.','사마의: 지원대를 보존하면서 중앙의 수비대를 격파하겠습니다.','백마의 무인: 용담창과 쌍철극, 호위갑과 절영을 맡길 만하군.'],
 ['달빛 아래의 교환',6,9,0,'상인: 약탈자를 막아 준다면 숨겨 둔 보물을 내놓겠습니다.','조진: 거래보다 사람이 먼저다. 피난길을 열자.','상인: 유금추와 월광검, 학창의와 조황비전입니다. 약속을 지킵니다.'],
 ['의원의 잃어버린 서책',7,10,9,'의원: 청낭서를 빼앗겼습니다. 부상자들을 치료할 방법이 담겨 있습니다.','사마의: 책을 되찾을 때까지 다친 병사를 뒤로 물리고 진을 유지하십시오.','의원: 청낭서와 백옥검, 호두창과 운금포를 드립니다. 생명을 지키는 데 써 주십시오.'],
 ['팔진의 문',8,11,7,'노군사: 길이 보인다고 곧장 나아가지 마라. 진의 틈을 읽어라.','사마의: 적의 중앙을 묶고 양익을 돌파하겠습니다.','노군사: 팔진도와 칠성기, 용린갑과 황금갑을 계승할 자격을 얻었다.'],
 ['천하를 읽는 기록',8,12,14,'사마방: 사람을 얻는 것과 땅을 얻는 것 중 무엇이 더 어려운가.','사마의: 오늘의 승리보다 내일 함께할 이들을 남기겠습니다.','사마방: 춘추좌씨전과 백옥환, 호부와 군사포를 받거라. 네 길의 증표다.'],
];
export const expeditions:Expedition[]=[
 {id:'T01',name:'초진 연무',kind:'training',level:1,requires:0,art:6,lines:['교관: 처음부터 실전에 익숙한 병사는 없다.','사마의: 이동과 협공을 반복하며 부대의 호흡을 맞추겠습니다.','교관: 오늘의 성장을 다음 전장으로 가져가거라. 다시 연습해도 좋다.']},
 {id:'T02',name:'산길 토벌',kind:'training',level:4,requires:2,art:11,lines:['조진: 산길의 잔당이 보급을 괴롭히고 있다.','사마의: 매번 달라지는 적의 배치를 살피며 부대를 단련합시다.','조진: 보급로가 열렸다. 다음 순찰에도 함께하자.']},
 {id:'T03',name:'군사 대련',kind:'training',level:8,requires:5,art:17,lines:['교관: 정예 부대와 실전처럼 겨뤄 보아라.','사마의: 책략과 지원을 함께 써야 오래 버틸 수 있습니다.','교관: 패배를 두려워하지 않는 반복이 장수를 만든다.']},
 {id:'T07',name:'장강 수군 조련',kind:'training',level:11,requires:6,art:3,lines:['조진: 오의 수군이 강을 오르내리며 보급선을 끊고 있다.','사마의: 배 위에서는 기병도 창병도 같은 물결 위에 섭니다. 수군으로 물길을 막고 육군은 부교로 건너겠습니다.','조진: 북방 병사도 물 위에서 싸울 수 있다는 것을 보였구나.']},
 {id:'T04',name:'교량 확보 연습',kind:'training',level:14,requires:6,art:3,lines:['교관: 강을 건너는 동안 후열이 무너지면 전군이 위험하다.','사마의: 선봉과 회복대를 나누어 교두보를 만들겠습니다.','교관: 좁은 지형에서도 서로를 지키는 법을 배웠구나.']},
 {id:'T05',name:'정예 진형 돌파',kind:'training',level:20,requires:8,art:11,lines:['조진: 정예병이 산길에 방진을 세웠다.','사마의: 광역 책략과 지원을 조합해 틈을 만들겠습니다.','조진: 정예를 상대할 실력이 쌓이고 있다.']},
 {id:'T06',name:'군략의 완성',kind:'training',level:27,requires:8,art:17,lines:['교관: 이제 부대 전체의 움직임으로 답해 보아라.','사마의: 천뢰와 공성계에 이르는 길도 오늘의 연습에서 시작합니다.','교관: 대가에게도 배움은 끝나지 않는다. 다시 겨뤄 보자.']},
 ...tales.map(([name,requires,level,art,...lines],i)=>({id:'Q'+String(i+1).padStart(2,'0'),name,requires,level,art,lines,kind:'quest' as const})),
 ...bounties.map(([name,requires,level,art,...lines],i)=>({id:'R'+String(i+1).padStart(2,'0'),name,requires,level,art,lines,kind:'bounty' as const})),
 ...challengeSteps.map(([name,requires,level,art,...lines],i)=>({id:'C'+String(i+1).padStart(2,'0'),name,requires,level,art,lines,kind:'challenge' as const,step:i+1})),
];
/** 외전 적의 공격·체력 배율: 수련은 약하게, 도전은 단계마다 세게. */
export function missionEnemyScale(id:string,revision=0){
 const m=expeditions.find(x=>x.id===id),k=revision>=6?missionEdges6[id]??1:1;
 if(m?.kind==='challenge'){const p=challengePlan(m.step!);return {attack:p.attack*k,hp:p.hp*k};}
 return {attack:(id.startsWith('T')?.6:.75)*k,hp:k};
}
/** 규칙판 6(비율 피해)에서 외전마다 적 공격·체력에 더 곱하는 값 — 권장 레벨에서 수련·퀘스트·사냥 90%, 도전 80% 이상. */
export const missionEdges6:Record<string,number>={T03:.85,T07:.8,Q06:.5,Q09:.75,C05:.7,C08:.5,C09:.55,C10:.42};
/** 도전 단계의 세기: 처음부터 깔린 추가 적, 증원 물결(차례), 물결마다 적 수, 수문장. */
export function challengePlan(step:number){
 return {extra:step<5?0:1,waves:step<3?[]:step<5?[3]:step<8?[3,5]:step<9?[3,5,7]:[4,7,10],waveSize:step<8?1:2,boss:step===5||step===10,attack:.76+step*.03,hp:1+step*.04};
}
export const storyWins=(c:Campaign)=>new Set(c.rewards.filter(x=>x.endsWith(':normal')).map(x=>x.split(':')[0])).size;
export function canExpedition(c:Campaign,id:string){const m=expeditions.find(x=>x.id===id);if(!m||storyWins(c)<m.requires)return false;
 // 도전은 앞 단계를 넘어야 다음 단계가 열린다.
 return m.kind!=='challenge'||m.step===1||(c.challenges??[]).includes('C'+String(m.step!-1).padStart(2,'0'));}
/** 보물 사냥 꾸러미에서 이번 승리로 받을 보물: 아직 없는 것 중 runId로 정한 하나(다시 불러와도 같다). */
export function bountyPick(c:Campaign,id:string,runId:string){
 const pool=treasures.filter(t=>t.quest===id&&!c.treasures.includes(t.id));if(!pool.length)return undefined;
 let h=0;for(const ch of runId)h=(h*31+ch.charCodeAt(0))>>>0;return pool[h%pool.length]!.id;
}
export function trainingXp(c:Campaign,m:Expedition){
 const excess=Math.max(0,levelInfo(c.xp.sima_yi??0).level-m.level-3);
 return Math.max(20,Math.round((40+m.level*12)*Math.max(.3,1-excess*.12)));
}
export function growthAdvice(c:Campaign,targetLevel:number){
 const current=levelInfo(c.xp.sima_yi??0).level;
 if(current>=targetLevel)return '권장 레벨 충족 · 지형과 병종 조합을 확인하세요.';
 const practice=expeditions.filter(m=>m.kind==='training'&&canExpedition(c,m.id)&&m.level<=current+1).at(-1)!;
 const projected=structuredClone(c);let wins=0;
 while(levelInfo(projected.xp.sima_yi??0).level<targetLevel&&wins<999){projected.xp.sima_yi=(projected.xp.sima_yi??0)+trainingXp(projected,practice);wins++;}
 return '권장 레벨까지 '+(targetLevel-current)+'레벨 · '+practice.name+' 약 '+wins+'승 (현재 수련만 반복 시, 본편·보물 보상 제외)';
}
export function expeditionReward(c:Campaign,id:string,runId:string,victory:boolean){
 const m=expeditions.find(x=>x.id===id);if(!m||!victory||!runId||!canExpedition(c,id)||(c.completedRuns??[]).includes(runId))return {xp:0,items:[] as string[]};
 (c.completedRuns??=[]).push(runId);
 if(m.kind==='quest'&&(c.quests??[]).includes(id))return {xp:0,items:[] as string[]};
 if(m.kind==='challenge'&&(c.challenges??[]).includes(id))return {xp:0,items:[] as string[]};
 const xp=m.kind==='quest'?100+m.level*12:m.kind==='challenge'?120+m.level*14:trainingXp(c,m);
 for(const who of OFFICERS)c.xp[who]=(c.xp[who]??0)+xp;
 if(m.kind==='bounty'){c.bountyWins=(c.bountyWins??0)+1;const pick=bountyPick(c,id,runId);if(pick)c.treasures.push(pick);return {xp,items:pick?[pick]:[]};}
 if(m.kind==='training')c.trainingWins=(c.trainingWins??0)+1;else if(m.kind==='challenge')(c.challenges??=[]).push(id);else(c.quests??=[]).push(id);
 const items=treasures.filter(t=>t.quest===id&&!c.treasures.includes(t.id)).map(t=>t.id);c.treasures.push(...items);return {xp,items};
}
export function expeditionBattle(id:string,seed:number,version=1,supportClasses?:UnitClass[]){
 const m=expeditions.find(x=>x.id===id);if(!m)throw new Error('알 수 없는 외전');
 let map:MapFile={id:'expedition-field',name:m.name,legend:{'.':'plain',',':'road',f:'forest',h:'hill'},rows:['............','..ff....ff..','..ff....ff..','............',',,,,,,,,,,,,',',,,,,,,,,,,,','............','...hh..ff...','...hh..ff...','............'],regions:{player_start:[{x:1,y:4},{x:1,y:5},{x:2,y:3},{x:2,y:6},{x:1,y:6},{x:1,y:3}],ally_start:[{x:2,y:3},{x:2,y:6},{x:1,y:6},{x:1,y:3}],camp:[{x:10,y:5}]}};
 if(version>=2)map=trialMap(id,m.name,version);
 const stage=structuredClone(base) as StageDef;stage.id=m.id;stage.subtitle=m.name;stage.mapId=map.id;stage.dialogues=[];stage.gimmicks=[];
 stage.deployment={forced:['sima_yi','cao_zhen'],slots:2,grantedUnits:[{type:supportClasses?.[0]??'infantry',count:1,level:m.level,countsTowardAllyLoss:true},{type:supportClasses?.[1]??'fengshui',count:1,level:m.level,countsTowardAllyLoss:true}]};
 const naval=version>=2&&expeditionLandscape(id)==='naval';
 // Naval trials always add two boats; they are placed on the water cells after the land slots.
 if(naval)stage.deployment.grantedUnits!.push({type:'navy',count:2,level:m.level,countsTowardAllyLoss:true});
 stage.title={training:'반복 수련',quest:'보물 인연',bounty:'보물 사냥',challenge:'도전 '+m.step+'단계'}[m.kind];
 stage.difficulty={normal:{recommendedLevel:m.level,minEnemyLevel:m.level},extreme:{recommendedLevel:m.level,minEnemyLevel:m.level}};
 stage.events=[{id:m.id+'/start',trigger:{type:'battle_start'},actions:[{type:'spawn_units',side:'enemy',units:([['infantry',8,4],['spearman',9,6],['archer',10,3],['cavalry',10,5]] as const).slice(0,m.kind==='training'&&m.level===1?3:4).map(([template,x,y],i)=>({id:'trial_enemy_'+i,name:['대련 보병','대련 창병','대련 궁병','대련 기병'][i]!,template,at:{x:version>=2?map.rows[0]!.length-12+x:x,y:y+(Math.abs(seed)%2&&i===0?1:0)},level:m.level,behavior:'hold' as const}))},{type:'set_phase',phase:m.kind==='training'?'부대 연계 수련':'보물 인연의 시련'}]}];
 if(version>=4){
  // Enemies hold scattered posts drawn on the map instead of one column.
  const layout=trialLayout(id),posts=layoutMap(layout,id,m.name).enemies;
  stage.events[0]!.actions[0]!.units=layout.templates.slice(0,m.kind==='training'&&m.level===1?3:4).map((template,i)=>({id:'trial_enemy_'+i,name:layout.names[i]!,template,at:posts[i]!,level:m.level,behavior:'hold' as const}));
 }else if(naval)stage.events[0]!.actions[0]!.units=navalEnemies.map((e,i)=>({id:'trial_enemy_'+i,name:e.name,template:e.template,at:{x:e.at.x,y:e.at.y+(Math.abs(seed)%2&&i===0?1:0)},level:m.level,behavior:'hold' as const}));
 if(version>=3)configureTrialGoal(stage,map,m.level);
 if(m.kind==='challenge')escalate(stage,map,m.step!,m.level);
 return {stage,map};
}
const CHALLENGE_TROOPS:UnitClass[][]=[['infantry','spearman','archer'],['spearman','crossbow','cavalry'],['heavyCav','pikeman','longbow'],['shieldGuard','repeater','lancer'],['halberdier','sharpshooter','ironCav']];
/** 도전 단계마다 추가 적·증원 물결·수문장을 붙인다. 적은 동쪽 증원 지점에서 나와 밀고 들어온다. */
function escalate(stage:StageDef,map:MapFile,step:number,level:number){
 const plan=challengePlan(step),troops=CHALLENGE_TROOPS[Math.min(CHALLENGE_TROOPS.length-1,Math.floor((step-1)/2))]!,w=map.rows[0]!.length;
 // 증원 물결은 4단 병종(방패·연노·창기)까지만: 9·10단계 물결이 철기·저격병 여섯으로 사마의만 노려 단계 하나에 레벨 +20이 필요하던 절벽을 없앤다. 최상위 병종은 정예·수문장이 맡는다.
 const waveTroops=CHALLENGE_TROOPS[Math.min(3,Math.floor((step-1)/2))]!;
 map.regions??={};map.regions.trial_reinforcements??=[{x:w-2,y:4},{x:w-2,y:5},{x:w-3,y:4},{x:w-3,y:5}];
 const events=stage.events??=[],first=events[0]!.actions.find(a=>a.type==='spawn_units')!;
 for(let i=0;i<plan.extra;i++)first.units!.push({id:'challenge_guard_'+i,name:'도전 정예',template:troops[i%troops.length]!,level:level+1,region:'trial_reinforcements',behavior:'advance'});
 if(plan.boss)first.units!.push({id:'challenge_boss',name:step===10?'패왕의 수문장':'군수고 수문장',template:step===10?'ironPagoda':'tigerRider',level:level+3,region:'trial_reinforcements',behavior:'hold'});
 plan.waves.forEach((turn,k)=>events.push({id:stage.id+'/challenge-wave/'+turn,trigger:{type:'turn_start',turn,side:'enemy'},actions:[{type:'spawn_units',side:'enemy',units:Array.from({length:plan.waveSize},(_,i)=>({id:'challenge_wave_'+turn+'_'+i,name:'증원 '+(k+1)+'진',template:waveTroops[(k+i)%waveTroops.length]!,level,region:'trial_reinforcements',behavior:'advance' as const}))}]}));
 stage.synopsis=(stage.synopsis?stage.synopsis+' · ':'')+'도전 '+step+'단계'+(plan.waves.length?' · 증원 '+plan.waves.length+'회':'')+(plan.boss?' · 수문장 등장':'');
}
