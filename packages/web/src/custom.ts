/**
 * 신장수 — 플레이어가 직접 만드는 장수. 이름·별호·병종·성격·능력치(무력·지력·통솔·정치·매력)를 정한다.
 * 만든 장수는 천명 기록(meta)에 영구히 남아 장수록에 오르고(전투 능력·일기토·설득 성격·무대 그림에 쓰인다),
 * 신세력으로 시작하는 회차에 처음부터 함께하거나, 모병소·전투 보상에 나온다.
 */
import type {UnitClass} from '../../core/src/index.ts';
import {currentClass} from '../../core/src/index.ts';
import type {Temper} from './duel.ts';
import {registerOfficer,unregisterOfficer,romanceByName} from './romance.ts';
import {registerFace,clearFaces} from './officer-art.ts';
import {readPortrait,suggestPortrait,portraitURL,type PortraitSpec} from './portrait.ts';
import {assignPresetPortrait,clearPresetPortraits,isPresetPortrait,type PresetPortrait} from './portrait-images.ts';

export interface CustomOfficer {name:string;epithet:string;unitClass:UnitClass;temper:Temper;war:number;int:number;lead:number;pol:number;cha:number;/** 초상(없으면 이름·병종·성격으로 지어 준다) */portrait?:PortraitSpec;/** 고른 기본 초상 그림(있으면 그린 초상 대신) */art?:PresetPortrait}
export interface Faction {name:string;emblem:string;color:string}

export const STAT_KEYS=['war','int','lead','pol','cha'] as const;
export const STAT_NAMES:Record<typeof STAT_KEYS[number],string>={war:'무력',int:'지력',lead:'통솔',pol:'정치',cha:'매력'};
export const STAT_MIN=20,STAT_MAX=95,STAT_BUDGET=350,CUSTOM_LIMIT=8;
/** 신장수가 고를 수 있는 병종(기본 병종). */
export const CUSTOM_CLASSES:UnitClass[]=['infantry','spearman','cavalry','archer','crossbow','strategist','heavyCav','horseArcher','fengshui','slinger','bandit','monk','taoist','assassin','xiliang','swordsman','wheelSage','valiantCav'] as UnitClass[];
export const TEMPERS:Temper[]=['reckless','brave','proud','calm','cautious','wise','timid'];
export const FACTION_COLORS=['#1f3f8a','#8a1f1a','#2a6a3a','#6a2a7a','#b8862a','#2a2a2a'];

const total=(o:Pick<CustomOfficer,typeof STAT_KEYS[number]>)=>STAT_KEYS.reduce((a,k)=>a+o[k],0);
export const statTotal=total;
/** 잘못된 곳을 말로 돌려준다(없으면 undefined). others: 이미 만든 다른 신장수 이름. */
export function checkCustom(o:CustomOfficer,others:readonly string[]=[]):string|undefined{
  if(!/^[가-힣]{1,4}$/.test(o.name))return '이름은 한글 1~4자';
  if(o.name==='사마의'||others.includes(o.name))return '이미 있는 이름';
  const known=romanceByName(o.name);if(known&&!(known as {custom?:boolean}).custom)return '연의 장수록에 이미 있는 이름';
  if(o.epithet.length>24)return '별호는 24자까지';
  if(!CUSTOM_CLASSES.includes(o.unitClass))return '고를 수 없는 병종';
  if(!TEMPERS.includes(o.temper))return '성격을 고르세요';
  if(o.art!==undefined&&!isPresetPortrait(o.art))return '없는 기본 초상';
  for(const k of STAT_KEYS){const v=o[k];if(!Number.isInteger(v)||v<STAT_MIN||v>STAT_MAX)return `${STAT_NAMES[k]}은 ${STAT_MIN}~${STAT_MAX}`;}
  if(total(o)>STAT_BUDGET)return `능력치 합계 ${total(o)} — ${STAT_BUDGET}을 넘을 수 없다`;
  return undefined;
}
export function checkFaction(f:Faction):string|undefined{
  if(!/^[가-힣]{1,4}$/.test(f.name))return '세력 이름은 한글 1~4자';
  if([...f.emblem].length!==1)return '문장은 글자 하나';
  if(!FACTION_COLORS.includes(f.color))return '깃발 색을 고르세요';
  return undefined;
}
/** 저장된 신장수를 정리한다(잘못된 것은 버림). */
export function readCustoms(raw:unknown):CustomOfficer[]{
  if(!Array.isArray(raw))return [];const out:CustomOfficer[]=[];
  for(const x of raw){const o=x as CustomOfficer;if(!o||typeof o!=='object')continue;
    const pt=readPortrait(o.portrait),clean:CustomOfficer={name:String(o.name??''),epithet:String(o.epithet??'').slice(0,24),unitClass:currentClass(String(o.unitClass)),temper:o.temper,war:o.war,int:o.int,lead:o.lead,pol:o.pol,cha:o.cha,...(pt?{portrait:pt}:{}),...(isPresetPortrait(o.art)?{art:o.art}:{})};
    if(!checkCustom(clean,out.map(c=>c.name))&&out.length<CUSTOM_LIMIT)out.push(clean);}
  return out;
}
let registered:string[]=[],registeredList:CustomOfficer[]=[];
/** 장수록에 올린다(이전에 올린 신장수는 내린다). */
export function registerCustoms(list:readonly CustomOfficer[]){
  for(const n of registered)unregisterOfficer(n);
  registered=list.map(o=>o.name);registeredList=list.map(o=>({...o}));
  clearFaces();clearPresetPortraits();
  for(const o of list){registerOfficer({name:o.name,epithet:o.epithet||'신장수',war:o.war,int:o.int,lead:o.lead,pol:o.pol,cha:o.cha,custom:true} as never,o.temper);const spec=portraitOf(o);registerFace(o.name,()=>portraitURL(spec,o.name));assignPresetPortrait(o.name,o.art);}
}
export const customNames=()=>[...registered];
export const customList=()=>registeredList.map(o=>({...o}));

/** 신장수의 초상 값(정해 둔 것이 없으면 이름·병종·성격으로). */
export const portraitOf=(o:CustomOfficer):PortraitSpec=>o.portrait??suggestPortrait(o.name,o.unitClass,o.temper);
