import type {TerrainKind,UnitClass} from '../../core/src/index.ts';
import {familyOf} from '../../core/src/index.ts';
import {expeditionLandscape} from './expedition-scenes.ts';
import {troopRoles} from './troops.ts';

/** Score data for the procedural soundtrack. Everything here is pure so the
 * choice of place theme and class motif can be tested without Web Audio. */
export type Place='title'|'camp'|'estate'|'city'|'mountain'|'river'|'naval'|'forest'|'fortress'|'court'|'field';
export type Lead='zheng'|'flute'|'erhu'|'pipa'|'horn'|'bell';
export type Pulse='none'|'march'|'war'|'oars'|'temple'|'patter';
export interface PlaceTheme {name:string;root:number;mode:number[];tempo:number;lead:Lead;counter:Lead;pulse:Pulse;pad:'drone'|'water'|'wind'|'gong';phrase:number[]}

// Pentatonic modes (semitones from root): gong, shang, jue, zhi, yu.
const GONG=[0,2,4,7,9],SHANG=[0,2,5,7,10],JUE=[0,3,5,8,10],ZHI=[0,2,5,7,9],YU=[0,3,5,7,10];
export const placeThemes:Record<Place,PlaceTheme>={
  title:   {name:'연의 서곡',root:57,mode:YU,tempo:.72,lead:'zheng',counter:'erhu',pulse:'none',pad:'gong',phrase:[0,2,3,4,3,2,0,-1,-2,0,2,4,5,4,3,2]},
  camp:    {name:'군영의 밤',root:62,mode:GONG,tempo:.56,lead:'zheng',counter:'flute',pulse:'none',pad:'drone',phrase:[0,2,4,3,2,1,0,-1,0,2,3,5,4,2,1,0]},
  estate:  {name:'온현 장원',root:67,mode:GONG,tempo:.5,lead:'zheng',counter:'flute',pulse:'patter',pad:'wind',phrase:[0,1,2,4,2,1,0,1,2,3,2,0,-1,0,1,0]},
  city:    {name:'낙양 성시',root:57,mode:YU,tempo:.36,lead:'pipa',counter:'bell',pulse:'march',pad:'drone',phrase:[0,2,3,4,3,2,0,2,4,5,4,3,2,1,0,-1]},
  mountain:{name:'관문의 바람',root:60,mode:JUE,tempo:.48,lead:'flute',counter:'erhu',pulse:'war',pad:'wind',phrase:[0,3,4,3,0,-1,0,1,3,4,6,5,3,1,0,0]},
  river:   {name:'장강의 물결',root:64,mode:SHANG,tempo:.42,lead:'zheng',counter:'flute',pulse:'patter',pad:'water',phrase:[0,1,2,3,4,3,2,1,2,3,4,5,4,2,1,0]},
  naval:   {name:'수채의 노 젓기',root:59,mode:SHANG,tempo:.34,lead:'horn',counter:'zheng',pulse:'oars',pad:'water',phrase:[0,2,4,2,0,2,4,5,4,2,0,-1,0,2,1,0]},
  forest:  {name:'숲속 보급로',root:62,mode:ZHI,tempo:.4,lead:'flute',counter:'zheng',pulse:'patter',pad:'wind',phrase:[0,1,3,1,0,2,3,4,3,1,0,-1,0,1,2,0]},
  fortress:{name:'공성의 북',root:55,mode:YU,tempo:.33,lead:'horn',counter:'erhu',pulse:'war',pad:'gong',phrase:[0,0,2,3,2,0,-1,0,3,4,5,4,3,2,0,0]},
  court:   {name:'흉몽의 궁정',root:58,mode:JUE,tempo:.62,lead:'bell',counter:'erhu',pulse:'temple',pad:'drone',phrase:[0,1,3,2,0,-1,-2,0,1,2,4,3,1,0,-1,0]},
  field:   {name:'들판의 결전',root:62,mode:YU,tempo:.4,lead:'erhu',counter:'zheng',pulse:'march',pad:'drone',phrase:[0,2,3,4,2,3,1,0,2,4,5,6,4,3,2,0]},
};
const stagePlaces:Record<string,Place>={'S1-01':'estate','S1-02':'city','S1-03':'mountain','S1-04':'court','S1-05':'river','S1-06':'fortress','S1-07':'forest','S1-08':'fortress','S1-09':'river','S1-10':'river','S1-11':'court','S2-01':'fortress','S2-02':'naval','S2-03':'river','S2-04':'fortress','S2-05':'fortress','S2-06':'mountain','S2-07':'mountain','S2-08':'mountain','S2-09':'fortress','S2-10':'field','S2-11':'mountain','S2-12':'river','S2-13':'mountain','S2-14':'field','S3-01':'river','S3-02':'fortress','S3-03':'fortress','S3-04':'river','S3-05':'mountain','S3-06':'city','S3-07':'naval'};
const landscapePlaces={field:'field',forest:'forest',river:'river',pass:'mountain',court:'court',fort:'fortress',naval:'naval'} as const;

/** Stage first, then the expedition landscape, then what the map is made of. */
export function placeFor(stageId:string,terrain:TerrainKind[]=[]):Place{
  if(stagePlaces[stageId])return stagePlaces[stageId]!;
  if(/^[TQ]\d\d$/.test(stageId))return landscapePlaces[expeditionLandscape(stageId)];
  const share=(...kinds:TerrainKind[])=>terrain.length?terrain.filter(t=>kinds.includes(t)).length/terrain.length:0;
  if(share('water','rapids')>.35)return 'naval';
  if(terrain.some(t=>t==='gate'||t==='wall'))return 'fortress';
  if(share('water','rapids')>.1)return 'river';
  if(share('forest')>.25)return 'forest';
  if(share('mountain','hill')>.25)return 'mountain';
  return 'field';
}

export type Family='horse'|'foot'|'bow'|'sage'|'siege'|'boat'|'folk';
export function classFamily(cls:UnitClass|string|undefined):Family|undefined{
  if(!cls)return undefined;
  cls=familyOf(cls as UnitClass);
  const base=(troopRoles as Record<string,{base:string}>)[cls]?.base??cls;
  if(['cavalry','heavyCav','horseArcher'].includes(cls)||['cavalry','heavyCav'].includes(base))return 'horse';
  if(['archer','crossbow'].includes(cls))return 'bow';
  if(['strategist','fengshui','shaman','maiden','taoist'].includes(cls)||['strategist','fengshui'].includes(base))return 'sage';
  if(['ram','catapult','engineer'].includes(cls))return 'siege';
  if(cls==='navy')return 'boat';
  if(cls==='civilian')return 'folk';
  return 'foot';
}
/** Each troop family adds its own layer while one of its units has the field. */
export const familyMotifs:Record<Family,{name:string;lead:Lead;notes:number[];rhythm:number[]}>={
  horse:{name:'기마 질주',lead:'horn',notes:[0,4,7,12],rhythm:[1,0,1,1,0,1,1,0]},
  foot: {name:'보병 행진',lead:'erhu',notes:[0,2,4,2],rhythm:[1,0,0,0,1,0,1,0]},
  bow:  {name:'궁시 연사',lead:'pipa',notes:[7,9,12,9],rhythm:[1,1,0,1,1,0,1,0]},
  sage: {name:'책략의 종',lead:'bell',notes:[12,9,7,4],rhythm:[1,0,0,1,0,0,1,0]},
  siege:{name:'공성 기계',lead:'horn',notes:[-12,-5,-12,-7],rhythm:[1,0,0,0,1,0,0,0]},
  boat: {name:'뱃노래',lead:'zheng',notes:[0,5,7,5],rhythm:[1,0,1,0,1,0,1,0]},
  folk: {name:'민요',lead:'flute',notes:[0,2,4,7],rhythm:[1,0,0,1,0,0,0,0]},
};
export function midiToHz(m:number){return 440*2**((m-69)/12);}
/** Map a scale degree (may be negative or above five) to a MIDI note. */
export function degree(theme:PlaceTheme,step:number){const n=theme.mode.length,oct=Math.floor(step/n),i=((step%n)+n)%n;return theme.root+oct*12+theme.mode[i]!;}

/** Named enemy commanders whose approach turns the battle music toward a duel. */
export const BOSSES=new Set(['ma_chao','lu_bu','xu_chu','yang_ang','zhang_lu','chen_gong','zhou_yu','huang_zhong','zhao_yun']);
export function bossNear(units:{id:string;side:string;alive:boolean;pos:{x:number;y:number}}[],range=5){
  const players=units.filter(u=>u.alive&&u.side==='player');
  return units.some(b=>b.alive&&b.side==='enemy'&&BOSSES.has(b.id)&&players.some(p=>Math.abs(p.pos.x-b.pos.x)+Math.abs(p.pos.y-b.pos.y)<=range));
}
