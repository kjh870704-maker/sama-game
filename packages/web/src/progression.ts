import type {RunBattleRef,RunStoryRef} from './roguelike.ts';
import {treasurePowers,treasurePowerText} from '../../core/src/treasure-traits.ts';
import {extraTreasures,trainingTreasures,questTreasures} from './treasure-catalogue.ts';
import type {Difficulty,Unit,UnitClass} from '../../core/src/index.ts';

export const OFFICERS=['sima_yi','sima_lang','sima_fang','cao_zhen'] as const;
export interface Campaign {version:1; xp:Record<string,number>; rewards:string[]; treasures:string[]; equipped:Record<string,string>;loadouts?:Record<string,Partial<Record<GearSlot,string>>>;completedRuns?:string[];trainingWins?:number;quests?:string[];/** 넘은 도전 단계(C01~C10) */challenges?:string[];/** 반복 퀘스트(보물 사냥) 승리 수 */bountyWins?:number}
export interface Growth {storyWins:number;trainingWins:number;questWins:number}
/** 시나리오 모드의 장: 장 id와 대사 선택이 남긴 전투 효과. */
export interface ScenarioDeployment {chapter:string;mods?:import('./roguelike.ts').BattleMods;/** 가상 전장을 극한으로 */difficulty?:'extreme';/** 로그라이크 회차: 연의 장에 들고 가는 보물과 사마의의 남은 체력 */relics?:string[];heroHp?:number;/** 회차에서 영입한 장수(연의 장에 함께 나선다, 최대 3) */recruits?:import('./roguelike.ts').RunUnit[]}
export interface Deployment {scenario?:ScenarioDeployment;/** 연구·장수 효과(출진 순간의 값) */perks?:import('./perks.ts').PerkGrants;/** 연의 장에 더 데려가는 장수(필수 장수 밖) */extraOfficers?:string[];treasureRules?:1;/** 넓은 전장(연의 지도 1.5배 · 이동 +2) — 새로 시작한 전투만 */wide?:1;/** 천명의 시련(로그라이크 난이도): 적 체력 +20%·공격 +12%·방어 +10% — 연구로 이겨낸다 */trial?:1;/** 천명의 원정 전투 (로그라이크) */run?:RunBattleRef;/** 원정 안의 연의 전장 */runStory?:RunStoryRef;levels:Record<string,number>;/** 연의 장수의 이번 레벨 안 경험치(전투 중에 싸워서 번 경험치가 여기서부터 쌓인다) */xp?:Record<string,number>;equipped:Record<string,string>;loadouts?:Record<string,Partial<Record<GearSlot,string>>>;growth?:Growth;mission?:{id:string;runId:string;version?:2|3|4;balance?:1;supportClasses?:UnitClass[]}}
export type GearSlot="weapon"|"armor"|"accessory";
export interface Treasure {id:string;name:string;stage:string;glyph:string;effect:string;description:string;bonus:Partial<Unit['stats']>;slot?:GearSlot;grade?:number;icon?:number;quest?:string}
export const treasures:Treasure[]=[
  {id:'silverarmor',name:'백은갑',stage:'S1-07',glyph:'백',effect:'방어 +4 · 최대 체력 +8',description:'연의 속 장수들의 갑주 묘사에서 착안한 창작 보상. 사마의의 실제 소유 이력을 뜻하지 않습니다.',bonus:{defense:4,maxHp:8}},
  {id:'yitian',name:'의천검',stage:'S1-06',glyph:'의',effect:'공격 +5 · 최대 체력 +8',description:'조조의 위엄을 상징하는 명검. 동관의 위기를 넘긴 공로로 인연을 맺습니다.',bonus:{attack:5,maxHp:8}},
  {id:'dunjia',name:'둔갑천서',stage:'S1-05',glyph:'둔',effect:'민첩 +4 · 최대 체력 +8',description:'기문과 도술의 이치를 전하는 서책. 장강에서 지켜 낸 수송대의 물자 속에서 발견합니다.',bonus:{agility:4,maxHp:8}},
  {id:'taiping',name:'태평청령도',stage:'S1-01',glyph:'태',effect:'최대 체력 +12',description:'백성을 구제하는 가르침을 담은 도술서. 사마가를 지킨 이들에게 전해집니다.',bonus:{maxHp:12}},
  {id:'sevenstar',name:'칠성보도',stage:'S1-02',glyph:'칠',effect:'공격 +4',description:'동탁 암살에 쓰려 했던 일곱 별의 보도. 낙양 탈출의 증표로 얻습니다.',bonus:{attack:4}},
  {id:'dilu',name:'적로',stage:'S1-03',glyph:'적',effect:'이동 +1',description:'유비와 적로의 탈출 일화에서 착안한 게임 창작 장구입니다.',bonus:{movement:1}},
  {id:'mengde',name:'맹덕신서',stage:'S1-04',glyph:'맹',effect:'최대 MP +10 · 지력 +3',description:'조조의 병법과 용병술을 담은 병서. 흉몽을 이겨 낸 깨달음으로 그 뜻을 읽습니다.',bonus:{maxMp:10,intellect:3}},
  {id:'qinggang',name:'청강검',stage:'S1-08',glyph:'청',effect:'공격 +7 · 방어 +2',description:'갑옷을 가르는 명검. 한중의 성채를 돌파한 보상으로 인연을 맺습니다.',bonus:{attack:7,defense:2}},
];
const extraItems=[
 ['greenDragon','청룡언월도','S1-06','청','공격 +8',{attack:8},'관우의 청룡언월도'],
 ['serpentSpear','사모','S1-03','사','공격 +5 · 민첩 +2',{attack:5,agility:2},'장비의 장팔사모'],
 ['halberd','방천화극','S1-04','방','공격 +7',{attack:7},'여포의 방천화극'],
 ['bow','보조궁','S1-02','보','공격 +3 · 민첩 +3',{attack:3,agility:3},'연의 장수들의 활'],
 ['redHare','적토마','S1-08','적','이동 +1 · 민첩 +5',{movement:1,agility:5},'관우와 적토마'],
 ['fan','백우선','S1-05','백','지력 +5 · 최대 MP +5',{intellect:5,maxMp:5},'제갈량의 깃털 부채'],
 ['seal','옥새','S1-07','옥','정신 +5 · 최대 체력 +10',{spirit:5,maxHp:10},'전국옥새를 둘러싼 연의의 다툼'],
 ['ironArmor','환쇄개','S1-01','환','방어 +2',{defense:2},'조식의 상소에 이름이 오른 쇠고리 갑옷'],
] as const;
for(const [id,name,stage,glyph,effect,bonus,motif] of extraItems)treasures.push({id,name,stage,glyph,effect,bonus,description:motif+'에 얽힌 보물. 전장에서 쌓은 공로로 그 인연을 이어받습니다.'});
treasures.push(...extraTreasures,...trainingTreasures,...questTreasures);
export const gearNames:Record<GearSlot,string>={weapon:'무기',armor:'방어구',accessory:'보조구'};
export function treasureInfo(id:string){const i=treasures.findIndex(t=>t.id===id),item=treasures[i];const slot:GearSlot=['silverarmor','ironArmor'].includes(id)?'armor':['dunjia','taiping','dilu','mengde','redHare','fan','seal'].includes(id)?'accessory':'weapon';const grade=['ironArmor','taiping'].includes(id)?1:['sevenstar','bow','dilu'].includes(id)?2:['yitian','qinggang','greenDragon','halberd','seal','redHare'].includes(id)?4:3;return {slot:item?.slot??slot,grade:item?.grade??grade,rarity:['일반','희귀','영웅','전설'][(item?.grade??grade)-1]!,icon:atlasCell(id)};}
/** 그림 판(6×10)의 칸. 판 밖의 보물은 -1(낱장 그림을 쓴다). */
export const ATLAS_CELLS=60;
function atlasCell(id:string){const k=treasurePowers.findIndex(t=>t.id===id);return k>=0&&k<ATLAS_CELLS?k:-1;}
export function equippedItems(c:Pick<Campaign,'equipped'|'loadouts'>,id:string){return c.loadouts?.[id]?Object.values(c.loadouts[id]!):c.equipped[id]?[c.equipped[id]!]:[];}
export function equipSlot(c:Campaign,officer:string,slot:GearSlot,id:string){
 if(!OFFICERS.includes(officer as typeof OFFICERS[number])||!Object.hasOwn(gearNames,slot))return false;
 if(id&&(!c.treasures.includes(id)||treasureInfo(id).slot!==slot))return false;
 if(!c.loadouts){c.loadouts={};for(const [who,item] of Object.entries(c.equipped))c.loadouts[who]={[treasureInfo(item).slot]:item};}
 for(const gear of Object.values(c.loadouts))for(const key of Object.keys(gear) as GearSlot[])if(gear[key]===id&&id)delete gear[key];
 const gear=c.loadouts[officer]??={};if(id)gear[slot]=id;else delete gear[slot];return true;
}
export function freshCampaign():Campaign{return {version:1,xp:{sima_yi:0,sima_lang:100,sima_fang:350,cao_zhen:250},rewards:[],treasures:[],equipped:{}};}
export function levelInfo(total:number){
  let level=1,remaining=Math.max(0,Math.floor(total));
  while(level<40&&remaining>=100+(level-1)*20){remaining-=100+(level-1)*20;level++;}
  return {level,xp:remaining,next:level===40?0:100+(level-1)*20};
}
export function deployment(c:Campaign,modern=false):Deployment{return {...(modern?{treasureRules:1 as const,growth:{storyWins:new Set(c.rewards.filter(r=>r.endsWith(':normal')).map(r=>r.split(':')[0])).size,trainingWins:c.trainingWins??0,questWins:c.quests?.length??0}}:{}),levels:Object.fromEntries(OFFICERS.map(id=>[id,levelInfo(c.xp[id]??0).level])),xp:Object.fromEntries(OFFICERS.map(id=>[id,levelInfo(c.xp[id]??0).xp])),equipped:{...c.equipped},...(c.loadouts?{loadouts:structuredClone(c.loadouts)}:{})};}
export function award(c:Campaign,stage:string,difficulty:Difficulty,participants:string[],seals:number[]){
  const id=stage+':'+difficulty;if(c.rewards.includes(id)||!seals.includes(1))return {xp:0,treasure:null as Treasure|null,levels:[] as string[]};
  const amount=difficulty==='normal'?140:70,levels:string[]=[];c.rewards.push(id);
  for(const officer of OFFICERS){if(officer!=='sima_yi'&&!participants.includes(officer))continue;const before=levelInfo(c.xp[officer]??0).level;c.xp[officer]=(c.xp[officer]??0)+amount;if(levelInfo(c.xp[officer]!).level>before)levels.push(officer);}
  const treasure=treasures.find(t=>t.stage===stage&&!c.treasures.includes(t.id))??null;
  for(const item of treasures.filter(t=>t.stage===stage))if(!c.treasures.includes(item.id))c.treasures.push(item.id);
  return {xp:amount,treasure,levels};
}
export function equip(c:Campaign,officer:string,id:string){
  if(!OFFICERS.includes(officer as typeof OFFICERS[number]))return false;
  if(!id){delete c.equipped[officer];return true;}
  if(!c.treasures.includes(id)||!treasures.some(t=>t.id===id))return false;
  for(const [other,item] of Object.entries(c.equipped))if(item===id)delete c.equipped[other];
  c.equipped[officer]=id;return true;
}
export function applyTreasure(unit:Unit,id:string|undefined,uniqueEffects=true){
  const item=treasures.find(t=>t.id===id);if(!item)return;
  for(const [stat,value] of Object.entries(item.bonus))unit.stats[stat as keyof Unit['stats']]+=value;
  if(uniqueEffects&&treasurePowers.some(t=>t.id===id)&&!unit.traits.includes("treasure:"+id))unit.traits.push("treasure:"+id);
  unit.hp=unit.stats.maxHp;unit.mp=unit.stats.maxMp;
}
export function readCampaign():Campaign{
  try{const value=JSON.parse(localStorage.getItem('sama-campaign-v1')??'null') as Campaign;
    if(value?.version!==1||!value.xp||!Array.isArray(value.rewards)||!Array.isArray(value.treasures)||!value.equipped)return freshCampaign();
    if(Object.values(value.xp).some(n=>!Number.isFinite(n)||n<0)||value.rewards.some(n=>typeof n!=='string'))return freshCampaign();
    const clean=freshCampaign();for(const id of OFFICERS)clean.xp[id]=Math.min(100000,Math.floor(value.xp[id]??clean.xp[id]!));
    clean.rewards=[...new Set(value.rewards.filter(id=>/^S[123]-\d{2}:(normal|extreme)$/.test(id)))];clean.treasures=[...new Set(value.treasures.filter(id=>treasures.some(t=>t.id===id)))];
    clean.completedRuns=Array.isArray(value.completedRuns)?[...new Set(value.completedRuns.filter(x=>typeof x==='string'&&x.length<100))]:[];clean.trainingWins=Number.isSafeInteger(value.trainingWins)?Math.max(0,value.trainingWins!):0;clean.quests=Array.isArray(value.quests)?[...new Set(value.quests.filter(x=>typeof x==='string'&&/^Q\d{2}$/.test(x)))]:[];clean.challenges=Array.isArray(value.challenges)?[...new Set(value.challenges.filter(x=>typeof x==='string'&&/^C\d{2}$/.test(x)))]:[];clean.bountyWins=Number.isSafeInteger(value.bountyWins)?Math.max(0,value.bountyWins!):0;
    for(const item of treasures)if(!item.quest&&clean.rewards.some(r=>r.startsWith(item.stage+':'))&&!clean.treasures.includes(item.id))clean.treasures.push(item.id);
    for(const id of OFFICERS)if(typeof value.equipped[id]==='string')equip(clean,id,value.equipped[id]!);
    if(value.loadouts&&typeof value.loadouts==='object')for(const id of OFFICERS){const gear=value.loadouts[id];if(!gear||typeof gear!=='object')continue;for(const slot of Object.keys(gearNames) as GearSlot[])equipSlot(clean,id,slot,typeof gear[slot]==='string'?gear[slot]!:'');}
    return clean;
  }catch{return freshCampaign();}
}
export function writeCampaign(c:Campaign){localStorage.setItem('sama-campaign-v1',JSON.stringify(c));}

export {treasurePowerText};
