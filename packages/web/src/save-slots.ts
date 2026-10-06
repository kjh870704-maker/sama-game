/** Manual battle save slots beside the automatic one. Each slot keeps the
 * replayable save plus a small label so the list can be shown without loading. */
export const SLOT_COUNT=3;
export const slotKey=(i:number)=>`sama-slot-${i}`;
export interface SlotMeta {title:string;turn:number;difficulty:string;at:number}
export interface SlotRecord {meta:SlotMeta;save:unknown}
export function readSlot(raw:string|null):SlotRecord|undefined{
  try{const v=raw?JSON.parse(raw) as SlotRecord:undefined;return v&&v.meta&&typeof v.meta.title==='string'&&v.save?v:undefined;}catch{return undefined;}
}
export function slotLabel(r:SlotRecord|undefined,now=Date.now()){
  if(!r)return '비어 있음';
  const min=Math.round((now-r.meta.at)/60000),ago=min<1?'방금':min<60?`${min}분 전`:min<1440?`${Math.round(min/60)}시간 전`:`${Math.round(min/1440)}일 전`;
  return `${r.meta.title} · ${r.meta.turn}턴 · ${r.meta.difficulty==='extreme'?'극한':'일반'} · ${ago}`;
}

// ─────────────────────────────────────────────── 통째 저장(v42)
/** 저장 칸 하나가 게임 전체(천명의 길 진행·연구·보물·성장·진행 중 전투)를 통째로 담는다. */
export interface FullSlot {full:1;meta:{title:string;where:string;at:number;hero?:number;mandate?:number};keys:Record<string,string>}
const OWN=(k:string)=>k.startsWith('sama-')&&!k.startsWith('sama-slot-');
export function snapshotKeys():Record<string,string>{
  const out:Record<string,string>={};
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&OWN(k)){const v=localStorage.getItem(k);if(v!==null)out[k]=v;}}}catch{/* 저장소 없음 */}
  return out;
}
export function restoreKeys(keys:Record<string,string>){
  const old:string[]=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&OWN(k)&&k!=='sama-settings-v1')old.push(k);}
  for(const k of old)localStorage.removeItem(k);
  for(const [k,v] of Object.entries(keys))if(OWN(k))localStorage.setItem(k,v);
}
export function readFull(raw:string|null):FullSlot|undefined{
  try{const v=raw?JSON.parse(raw) as FullSlot:undefined;return v&&v.full===1&&v.meta&&typeof v.meta.title==='string'&&v.keys&&typeof v.keys==='object'?v:undefined;}catch{return undefined;}
}
export function agoText(at:number,now=Date.now()){const min=Math.round((now-at)/60000);return min<1?'방금':min<60?`${min}분 전`:min<1440?`${Math.round(min/60)}시간 전`:`${Math.round(min/1440)}일 전`;}
