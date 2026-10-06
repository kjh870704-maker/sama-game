/**
 * 직접 넣은 초상 이미지 — 그린 초상 대신 플레이어(또는 제작자)가 준 그림을 쓴다.
 *
 * 두 곳에서 온다.
 *  1) 게임 안에서 올린 그림: 인물열전·신장수 화면에서 파일을 고르면 이 브라우저(IndexedDB)에 저장한다.
 *     여러 장을 한꺼번에 고르면 파일 이름(확장자 뺀 것)을 장수 이름으로 본다 — 「조조.png」 → 조조.
 *  2) 저장소에 넣은 그림: public/portraits/ 에 그림을 두고 manifest.json 에 {"이름":"파일"}로 적는다.
 *  3) 신장수 기본 초상: 신장수 만들기에서 고른 저장소 그림(public/portraits/custom-N.webp).
 * 같은 장수에 여럿 있으면 게임 안에서 올린 그림 → 고른 기본 초상 → 저장소 그림 순이다.
 * 그림은 얼굴이 위쪽에 오는 흉상이 가장 잘 맞는다(투명 바탕 PNG면 대화창에서 그대로 겹쳐 보인다).
 */
const memory=new Map<string,string>();
const shipped=new Map<string,string>();
const assigned=new Map<string,string>();
let shippedBase='';
/** 신장수가 고를 수 있는 기본 초상(public/portraits/<id>.webp). */
export const PRESET_PORTRAITS=[
  {id:'custom-1',label:'백마의 젊은 장수'},
  {id:'custom-2',label:'사자 갑주의 장수'},
  {id:'custom-3',label:'녹옥 갑주의 장수'},
  {id:'custom-4',label:'꽃 장식의 여인'},
] as const;
export type PresetPortrait=typeof PRESET_PORTRAITS[number]['id'];
export const isPresetPortrait=(id:unknown):id is PresetPortrait=>PRESET_PORTRAITS.some(p=>p.id===id);
export const presetPortraitURL=(id:PresetPortrait)=>shippedBase+'portraits/'+id+'.webp';
/** 장수에게 기본 초상을 붙인다(undefined면 뗀다). */
export function assignPresetPortrait(name:string,id:PresetPortrait|undefined){if(id)assigned.set(name,presetPortraitURL(id));else assigned.delete(name);}
/** 붙여 둔 기본 초상을 모두 뗀다(신장수 목록을 다시 올릴 때). */
export function clearPresetPortraits(){assigned.clear();}
const DB='sama-portraits',STORE='images';
let changed:(()=>void)|undefined;
/** 그림이 바뀌면 부를 함수(화면 다시 그리기). */
export function onPortraitImagesChanged(f:()=>void){changed=f;}

/** 이 장수에게 넣은 그림의 URL(없으면 undefined). */
export function portraitImage(name:string){return memory.get(name)??assigned.get(name)??shipped.get(name);}
export const portraitImageNames=()=>[...new Set([...memory.keys(),...assigned.keys(),...shipped.keys()])];
export const isUploaded=(name:string)=>memory.has(name);

function db():Promise<IDBDatabase|undefined>{
  return new Promise(res=>{try{if(typeof indexedDB==='undefined')return res(undefined);const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>res(undefined);}catch{res(undefined);}});
}
async function tx<T>(mode:IDBTransactionMode,f:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T|undefined>{
  const d=await db();if(!d)return undefined;
  return new Promise(res=>{try{const q=f(d.transaction(STORE,mode).objectStore(STORE));q.onsuccess=()=>res(q.result);q.onerror=()=>res(undefined);}catch{res(undefined);}});
}
/** 시작할 때 한 번: 저장소의 그림 목록과 이 브라우저에 올린 그림을 읽는다. */
export async function loadPortraitImages(base=''){
  if(base!==shippedBase){shippedBase=base;for(const [n,u] of assigned)assigned.set(n,base+u.slice(u.indexOf('portraits/')));}
  try{const r=await fetch(base+'portraits/manifest.json',{cache:'no-cache'});if(r.ok){const m=await r.json() as Record<string,unknown>;
    for(const [name,file] of Object.entries(m))if(typeof file==='string'&&/^[^/\\]+\.(png|jpe?g|webp)$/i.test(file)&&name.length<=12)shipped.set(name,base+'portraits/'+encodeURIComponent(file));}}catch{/* 목록이 없어도 된다 */}
  const d=await db();if(d)await new Promise<void>(res=>{try{const q=d.transaction(STORE,'readonly').objectStore(STORE).openCursor();q.onsuccess=()=>{const c=q.result;if(!c)return res();if(typeof c.value==='string')memory.set(String(c.key),c.value);c.continue();};q.onerror=()=>res();}catch{res();}});
  changed?.();
}
/** 그림 파일을 알맞은 크기(긴 변 512)로 줄여 data URL로. */
export function shrink(file:Blob,max=512):Promise<string>{
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*k),h=Math.round(img.height*k),c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d')!.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);const webp=c.toDataURL('image/webp',.88);res(webp.startsWith('data:image/webp')?webp:c.toDataURL('image/png'));};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('그림을 읽을 수 없습니다.'));};img.src=url;});
}
/** 장수 한 명의 초상 그림을 넣는다. */
export async function setPortraitImage(name:string,file:Blob){
  const data=await shrink(file);memory.set(name,data);await tx('readwrite',s=>s.put(data,name));changed?.();return data;
}
/** 넣은 그림을 지운다(그린 초상으로 돌아간다). */
export async function removePortraitImage(name:string){memory.delete(name);await tx('readwrite',s=>s.delete(name));changed?.();}
/** 여러 파일을 한꺼번에: 파일 이름 = 장수 이름. 알려진 이름만 넣고, 넣은 이름을 돌려준다. */
export async function importPortraitFiles(files:Iterable<File>,known:(name:string)=>boolean){
  const done:string[]=[],skipped:string[]=[];
  for(const f of files){const name=f.name.normalize('NFC').replace(/\.[^.]+$/,'').trim();if(!known(name)){skipped.push(f.name);continue;}try{await setPortraitImage(name,f);done.push(name);}catch{skipped.push(f.name);}}
  return {done,skipped};
}
