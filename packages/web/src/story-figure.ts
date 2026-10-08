/**
 * 이야기 무대의 인물 그림 — 새로 그리지 않고 이미 있는 그림을 쓴다.
 * - 장수 전신 일러스트(officer-story: 사마의·소년 사마의·사마랑·사마방·조진·조조·조비·허저)
 * - 그 밖의 이름 있는 장수는 문관/무장 일러스트를 옷 색만 바꿔서
 * - 이름 없는 병사·백성은 전장의 병종 그림(말 탄 병종은 무대에서 말에서 내린다)
 *
 * 전신 일러스트는 키가 머리 일곱 개쯤 되는 늘씬한 그림이라, 머리 셋 반쯤 되는 병종 그림 곁에 세우면
 * 혼자 가늘고 길어 보인다. 그래서 무대에 세울 때만 머리를 조금 키우고 몸을 줄여 병종 그림과 같은
 * 비율로 맞춘다(그림 자체는 그대로). 모두 같은 키의 칸에 담고, 걷기·말하기·절·무릎 꿇기·놀람 자세는
 * 같은 그림의 윗몸과 아랫몸(옷자락·다리)을 나눠 기울이고 흔들어 만든다.
 *
 * 시트 배치는 도트 인물(story-pixel)과 같다: 8열(자세) × 3행(앞·뒤·옆).
 */
import type {Look} from './scenario-types.ts';
import {officerLook} from './officer-art.ts';
import {romanceByName} from './romance.ts';
import {spriteAtlas,SPRITE_CELL} from './sprite-atlas.ts';
import {PX_COLS,PX_ROWS,PX_POSE,type PxPose} from './story-pixel.ts';
import {officerEntry,officerManifest} from './officer-models.ts';

export const FIG_W=160,FIG_H=160;
/** 칸 안에서 인물의 키(발끝은 칸 바닥에서 FOOT px 위). 그림을 크게 만들어 화면에서 줄여 쓴다(확대하면 계단이 진다). */
const BODY_H=150,FOOT=4;
/** 64px 칸 기준으로 잡았던 자세 이동량을 이 칸 크기로. */
const U=FIG_H/64;

type Sheet={url:string;rows:number;row:number;walk?:{url:string;rows:number}|undefined};
const S=(url:string,rows:number,row:number,walk?:string):Sheet=>({url,rows,row,walk:walk?{url,rows}:undefined});
const CASTERS='troops-casters-v1.webp',SPECIAL='troops-specialists-v1.webp';
const BY_LOOK:Record<Look,Sheet>={
  strategist:S('units-v3.webp',6,4),civil:S('units-v3.webp',6,4),infantry:S('units-v3.webp',6,0),spear:S('units-v3.webp',6,1),
  archer:S('units-v3.webp',6,2),cavalry:S('units-v3.webp',6,3),crossbow:S('units-extra-v1.webp',4,0),heavy:S('units-extra-v1.webp',4,1),
  engineer:S('units-extra-v1.webp',4,2),sage:S('units-extra-v1.webp',4,3),
  shaman:S(CASTERS,3,0,'w'),lady:S(CASTERS,3,1,'w'),taoist:S(CASTERS,3,2,'w'),
  physician:S(SPECIAL,4,0,'w'),monk:S(SPECIAL,4,1,'w'),horseArcher:S(SPECIAL,4,2,'w'),bandit:S(SPECIAL,4,3,'w'),assassin:S(SPECIAL,4,3,'w'),
  elephant:S('units-extra-v1.webp',4,1),
};
for(const s of Object.values(BY_LOOK))if(s.walk)s.walk.url=s.url.replace('-v1','-walk-v1');
const OFFICERS={url:'officer-story-v1.webp',rows:2};

export type FigArt={kind:'fig';slot:number;tint:number}|{kind:'sheet';look:Look};
const ON_FOOT:Partial<Record<Look,Look>>={cavalry:'infantry',heavy:'infantry',horseArcher:'archer',elephant:'infantry'};
const ROBE=new Set<Look>(['strategist','civil','sage','physician','taoist']);
const nameHash=(s:string)=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
/** 이 인물을 어떤 그림으로 세우나. */
export function figArtFor(name:string,look:Look):FigArt{
  const p=officerLook(name);if(p&&p.slot<8)return {kind:'fig',slot:p.slot,tint:0};
  // 황제는 관을 쓴 군주 그림(조조)을 누런 곤룡포 빛으로
  if(/^(헌제|황제|천자|꿈속의 황제|조예|조방|조모|조환|유선)$/.test(name))return {kind:'fig',slot:5,tint:name==='조예'||name==='조방'||name==='조모'||name==='조환'?-150:36};
  if(romanceByName(name)&&look!=='lady'&&look!=='shaman'&&look!=='monk'&&look!=='bandit'&&look!=='assassin'){
    const h=nameHash(name),pool=ROBE.has(look)?[2,3,6]:[4,7];
    return {kind:'fig',slot:pool[h%pool.length]!,tint:((h>>>3)%9-4)*36||40};
  }
  return {kind:'sheet',look:ON_FOOT[look]??look};
}
/** 적군 병사는 붉게, 촉군은 푸르게 보이지 않도록 초록으로(전장 색과 같다). */
function sideTint(name:string){return /촉군|촉병/.test(name)?-105:/적군|적병|오군|붉은|반군|도적|산적|황건/.test(name)?135:0;}

/**
 * 전신 일러스트의 목 높이(그림 키에 대한 비율, 모자 꼭대기부터). 칸마다 모자 높이가 달라 따로 잰다.
 * 0 사마의 1 소년 사마의 2 사마랑 3 사마방 4 조진 5 조조 6 조비 7 허저
 */
const NECK=[0.25,0.205,0.235,0.235,0.255,0.245,0.235,0.255];
/** 머리는 이만큼 키우고, 목 아래는 이만큼 줄인다 → 머리가 키의 1/3쯤(병종 그림과 같은 비율). */
const HEAD_UP=1.15,BODY_DOWN=0.74;

const ready=new Map<string,HTMLCanvasElement>();
const storyReady=new Set<string>();
const atlasKey=(url:string,rows:number)=>url+':'+rows;
/** 무대에 쓰는 그림들을 미리 읽어 둔다(main.ts가 시작할 때 부른다). */
export async function loadFigures(){
  const want=new Map<string,{url:string;rows:number}>([[atlasKey(OFFICERS.url,OFFICERS.rows),OFFICERS]]);
  for(const s of Object.values(BY_LOOK)){want.set(atlasKey(s.url,s.rows),s);if(s.walk)want.set(atlasKey(s.walk.url,s.walk.rows),s.walk);}
  await Promise.all([
    ...[...want].map(async([k,s])=>{try{ready.set(k,await spriteAtlas(s.url,s.rows));}catch{/* 없는 그림은 건너뛴다 */}}),
    ...officerManifest.filter(e=>e.story).map(e=>new Promise<void>(resolve=>{const url=`officers/${e.story}`,img=new Image();img.onload=()=>{storyReady.add(url);resolve();};img.onerror=()=>resolve();img.src=url;})),
  ]);
}
export const figuresReady=()=>ready.has(atlasKey(OFFICERS.url,OFFICERS.rows));

/** 아틀라스 한 칸에서 그림이 차지하는 상자. */
function cellBox(src:HTMLCanvasElement,col:number,row:number){
  const g=src.getContext('2d',{willReadFrequently:true})!,d=g.getImageData(col*SPRITE_CELL,row*SPRITE_CELL,SPRITE_CELL,SPRITE_CELL).data;
  let l=SPRITE_CELL,t=SPRITE_CELL,r=0,b=0;
  for(let y=0;y<SPRITE_CELL;y++)for(let x=0;x<SPRITE_CELL;x++)if(d[(y*SPRITE_CELL+x)*4+3]!>40){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}
  return {x:col*SPRITE_CELL+l,y:row*SPRITE_CELL+t,w:r-l+1,h:b-t+1,d,l,t};
}
/** 목 줄에서 그림의 가운데 x(머리를 몸 위에 바로 얹으려고). */
function neckCenter(box:ReturnType<typeof cellBox>,neckY:number){
  const y=box.t+Math.round(neckY);let sum=0,n=0;
  for(let x=0;x<SPRITE_CELL;x++)if(box.d[(y*SPRITE_CELL+x)*4+3]!>40){sum+=x;n++;}
  return n?sum/n-box.l:box.w/2;
}
/** 옷 색만 돌린다(살갗·금붙이 같은 누런빛과 무채색은 그대로 둔다). */
function hueRotate(g:CanvasRenderingContext2D,w:number,h:number,deg:number,bluesOnly=false){
  if(!deg)return;
  const img=g.getImageData(0,0,w,h),d=img.data;
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;
    const r=d[i]!/255,gg=d[i+1]!/255,b=d[i+2]!/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),l=(mx+mn)/2,c=mx-mn;
    if(c<0.08)continue;const s=c/(1-Math.abs(2*l-1));if(s<0.18)continue;
    let hh=mx===r?((gg-b)/c)%6:mx===gg?(b-r)/c+2:(r-gg)/c+4;hh*=60;if(hh<0)hh+=360;
    if(hh>=10&&hh<=52||bluesOnly&&(hh<170||hh>285))continue;
    hh=(hh+deg+720)%360;const x=c*(1-Math.abs((hh/60)%2-1)),m=l-c/2;
    const [r1,g1,b1]=hh<60?[c,x,0]:hh<120?[x,c,0]:hh<180?[0,c,x]:hh<240?[0,x,c]:hh<300?[x,0,c]:[c,0,x];
    d[i]=(r1+m)*255;d[i+1]=(g1+m)*255;d[i+2]=(b1+m)*255;}
  g.putImageData(img,0,0);
}
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

/** 한 칸 그림(발끝을 맞춘 FIG_W×FIG_H). 전신 일러스트는 머리·몸 비율을 고친다. */
function standFrom(src:HTMLCanvasElement,col:number,row:number,slot:number|undefined,tint:number):HTMLCanvasElement{
  const box=cellBox(src,col,row);
  // 1) 원본 크기에서 비율을 고친 그림
  let w=box.w,h=box.h;let big:HTMLCanvasElement;
  if(slot!==undefined){
    const neck=Math.round(box.h*(NECK[slot]??0.24)),cx=neckCenter(box,neck);
    const headH=Math.round(neck*HEAD_UP),headW=Math.round(box.w*HEAD_UP),bodyH=Math.round((box.h-neck)*BODY_DOWN);
    w=headW;h=headH+bodyH;big=canvas(w,h);const g=big.getContext('2d')!;g.imageSmoothingQuality='high';
    const bx=Math.round((w-box.w)/2);
    g.drawImage(src,box.x,box.y+neck,box.w,box.h-neck,bx,headH-2,box.w,bodyH+2);
    // 머리는 목 가운데를 기준으로 키운다
    const hx=bx+cx-cx*HEAD_UP;
    g.drawImage(src,box.x,box.y,box.w,neck+1,hx,0,headW,headH+Math.round(HEAD_UP));
  }else{big=canvas(w,h);big.getContext('2d')!.drawImage(src,box.x,box.y,box.w,box.h,0,0,w,h);}
  // 2) 무대 칸 크기로 줄인다. 가장자리는 부드럽게 두고(투명도를 자르지 않는다), 옅은 먹선 테두리만 두른다.
  const k=Math.min(BODY_H/h,(FIG_W-4)/w),out=canvas(FIG_W,FIG_H),g=out.getContext('2d',{willReadFrequently:true})!;
  g.imageSmoothingQuality='high';const dw=Math.round(w*k),dh=Math.round(h*k);
  g.drawImage(big,0,0,w,h,Math.round((FIG_W-dw)/2),FIG_H-FOOT-dh,dw,dh);
  hueRotate(g,FIG_W,FIG_H,tint,slot===undefined);
  const img=g.getImageData(0,0,FIG_W,FIG_H),d=img.data;
  // 거의 투명한 얼룩은 지우고, 안쪽의 반투명은 채워 몸이 비치지 않게
  for(let i=3;i<d.length;i+=4)d[i]=d[i]!<24?0:d[i]!>200?255:d[i]!;
  const out2=new Uint8ClampedArray(d),al=(x:number,y:number)=>x>=0&&y>=0&&x<FIG_W&&y<FIG_H?d[(y*FIG_W+x)*4+3]!:0;
  for(let y=0;y<FIG_H;y++)for(let x=0;x<FIG_W;x++){const a=al(x,y);if(a>140)continue;
    const n=Math.max(al(x-1,y),al(x+1,y),al(x,y-1),al(x,y+1));if(n<160)continue;
    const i=(y*FIG_W+x)*4,e=Math.round(n*0.55*(1-a/255));if(e<=0)continue;
    // 테두리 색을 바깥에 덧칠(이미 있는 색과 섞는다)
    const ta=a+e*(1-a/255),mix=(c:number,o:number)=>Math.round((c*a+o*e*(1-a/255))/Math.max(1,ta));
    out2[i]=mix(d[i]!,30);out2[i+1]=mix(d[i+1]!,22);out2[i+2]=mix(d[i+2]!,16);out2[i+3]=Math.min(255,Math.round(ta));}
  img.data.set(out2);g.putImageData(img,0,0);return out;
}
/** 그림의 위·아래 끝(불투명한 줄). */
function rows(c:HTMLCanvasElement){const d=c.getContext('2d',{willReadFrequently:true})!.getImageData(0,0,FIG_W,FIG_H).data;let t=FIG_H,b=0;
  for(let y=0;y<FIG_H;y++)for(let x=0;x<FIG_W;x++)if(d[(y*FIG_W+x)*4+3]!>60){if(y<t)t=y;b=y;break;}return {t,b};}

/**
 * 서 있는 그림 하나로 자세를 만든다. 윗몸(허리 위)과 아랫몸(옷자락·다리)을 나눠
 * 걸을 때는 아랫몸을 앞뒤로 비껴 흔들고, 절할 때는 윗몸을 허리에서 숙인다.
 */
function poseFrom(stand:HTMLCanvasElement,pose:PxPose,alt?:HTMLCanvasElement):HTMLCanvasElement{
  if(pose==='stand')return stand;
  if((pose==='walkA'||pose==='walkB'||pose==='point')&&alt)return alt;
  const {t,b}=rows(stand),hip=Math.round(t+(b-t)*0.62),cx=FIG_W/2;
  const out=canvas(FIG_W,FIG_H),g=out.getContext('2d')!;g.imageSmoothingQuality='high';
  const top=(dy:number,rot=0,dx=0)=>{g.save();g.translate(cx+dx,hip+dy);g.rotate(rot);g.beginPath();g.rect(-cx-8*U,-hip-8*U,FIG_W+16*U,hip+8*U);g.clip();g.drawImage(stand,-cx,-hip);g.restore();};
  const legs=(shear:number,squash=1,dy=0)=>{g.save();g.beginPath();g.rect(0,hip,FIG_W,FIG_H-hip);g.clip();
    g.setTransform(1,0,shear,squash,-shear*hip,hip*(1-squash)+dy);g.drawImage(stand,0,0);g.restore();};
  switch(pose){
    case 'walkA':case 'walkB':{const k=pose==='walkA'?0.2:-0.2;legs(k);top(-U,k*0.08);break;}
    case 'talk':legs(0);top(0,0.05,0);break;
    case 'point':legs(0);top(-U,-0.06,-U);break;
    case 'bow':legs(0);top(2*U,0.32,2*U);break;
    case 'kneel':{const sq=0.55,drop=Math.round((b-hip)*(1-sq));
      g.save();g.beginPath();g.rect(0,hip+drop,FIG_W,FIG_H);g.clip();g.setTransform(1.12,0,0,sq,-cx*0.12,b-b*sq);g.drawImage(stand,0,0);g.restore();
      top(drop,0.12,U);break;}
    case 'surprise':g.setTransform(0.97,0,0,1.03,cx*0.03,-(FIG_H-FOOT)*0.03-2*U);g.drawImage(stand,0,0);break;
  }
  return out;
}

const sheets=new Map<string,string>();
const artKey=(a:FigArt,tint:number)=>a.kind==='fig'?`f${a.slot}:${a.tint+tint}`:`s${a.look}:${tint}`;
/** 무대 인물 시트(data URL). 그림이 아직 안 읽혔으면 undefined. */
export function figSheet(name:string,look:Look):string|undefined{
  const entry=officerEntry({id:'story_actor',name}),story=entry?.story?`officers/${entry.story}`:undefined;
  if(story&&storyReady.has(story))return story;
  const art=figArtFor(name,look),tint=art.kind==='sheet'?sideTint(name):0,key=artKey(art,tint);
  const hit=sheets.get(key);if(hit)return hit;
  const frames=figFrames(art,tint);if(!frames)return undefined;
  const cv=canvas(FIG_W*PX_COLS,FIG_H*PX_ROWS),g=cv.getContext('2d')!;
  for(let row=0;row<PX_ROWS;row++)for(const pose of Object.keys(PX_POSE) as PxPose[])g.drawImage(frames[pose],PX_POSE[pose]*FIG_W,row*FIG_H);
  const url=cv.toDataURL('image/png');sheets.set(key,url);return url;
}
const frameCache=new Map<string,Record<PxPose,HTMLCanvasElement>>();
function figFrames(art:FigArt,tint:number){
  const key=artKey(art,tint),hit=frameCache.get(key);if(hit)return hit;
  let stand:HTMLCanvasElement,walkA:HTMLCanvasElement|undefined,walkB:HTMLCanvasElement|undefined,point:HTMLCanvasElement|undefined;
  if(art.kind==='fig'){const src=ready.get(atlasKey(OFFICERS.url,OFFICERS.rows));if(!src)return undefined;stand=standFrom(src,art.slot%4,Math.floor(art.slot/4),art.slot,art.tint);}
  else{const s=BY_LOOK[art.look]??BY_LOOK.infantry,src=ready.get(atlasKey(s.url,s.rows));if(!src)return undefined;
    stand=standFrom(src,0,s.row,undefined,tint);
    // 병종 그림에 걷는 그림이 따로 있으면 그것을 쓴다
    const w=s.walk&&ready.get(atlasKey(s.walk.url,s.walk.rows));if(w){walkA=standFrom(w,1,s.row,undefined,tint);walkB=standFrom(w,3,s.row,undefined,tint);}
    // 책사·문관은 부채로 가리키는 그림이 있다
    if(art.look==='strategist'||art.look==='civil')point=standFrom(src,2,s.row,undefined,tint);}
  const f={} as Record<PxPose,HTMLCanvasElement>;
  for(const pose of Object.keys(PX_POSE) as PxPose[])f[pose]=poseFrom(stand,pose,pose==='walkA'?walkA:pose==='walkB'?walkB:pose==='point'?point:undefined);
  frameCache.set(key,f);return f;
}
/** 배경에 그려 넣는 인물(전장의 병사 대열·알현실의 백관 등). x·y는 발 디딤 자리, h는 키(px). 그림이 없으면 false. */
export function drawFigure(g:CanvasRenderingContext2D,x:number,y:number,name:string,look:Look,pose:PxPose,h:number,flip=false){
  const art=figArtFor(name,look),f=figFrames(art,art.kind==='sheet'?sideTint(name):0);if(!f)return false;
  const k=h/BODY_H;g.save();g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,15*U*k,4.5*U*k,0,0,7);g.fill();
  g.translate(x,y-(FIG_H-FOOT)*k);if(flip)g.scale(-1,1);g.imageSmoothingQuality='high';g.drawImage(f[pose],-FIG_W/2*k,0,FIG_W*k,FIG_H*k);g.restore();return true;
}
