/**
 * 이야기 무대의 아이소메트릭 배경 — 조조전 리메이크의 이벤트 장면처럼, 위에서 비스듬히 내려다본
 * 방·뜰·군영을 타일과 입체 소품으로 그린다. 그림 파일 없이 캔버스에 그려서 한 번 만든 뒤 재사용한다.
 *
 * 좌표: 격자 칸 (c, r). c가 늘면 화면 오른쪽 아래, r이 늘면 왼쪽 아래로 간다.
 * 실내는 c=0(왼쪽 위)·r=0(오른쪽 위) 가장자리에 벽이 선다. 인물은 칸 위에 서고 칸 단위로 걷는다.
 * 대본의 자리([x%, y%])는 화면 좌표이므로 가장 가까운 빈 칸으로 맞춘다.
 */
import type {At,Look} from './scenario-types.ts';
import {drawPxFigure,type PxDir,type PxPose} from './story-pixel.ts';
import {drawFigure} from './story-figure.ts';
import {paintGround,loadGroundArt,GW,GH,C as GC,type GroundKind,type GroundOpts} from './story-ground.ts';
/** 배경 속 인물(병사 대열·백관): 무대 인물과 같은 기존 그림, 아직 못 읽었으면 도트 인물. */
const person=(g:CanvasRenderingContext2D,x:number,y:number,name:string,look:Look,dir:PxDir,pose:PxPose,flip:boolean)=>{if(!drawFigure(g,x,y,name,look,pose,88,flip))drawPxFigure(g,x,y,name,look,dir,pose,PIXEL,flip);};

export type Cell=readonly [number,number];
export const W=1280,H=640;
const TW=80,TH=40,OX=640,N=22;
/** 방·뜰의 안쪽 모서리 높이(화면 y). 실내는 벽을 사람들 바로 뒤로 당겨 내린다(빈 바닥 대신 벽·가구가 사람 곁에). */
let OY=40;
const originFor=(kind:Kind)=>kind==='throne'?40:kind==='palace'?110:INDOOR.has(kind)?170:kind==='court'?110:kind==='wall'?200:kind==='gatehouse'||kind==='fort'||kind==='camp'||kind==='town'?70:40;
const pt=(c:number,r:number):[number,number]=>[OX+(c-r)*TW/2,OY+(c+r)*TH/2];

type Kind='hall'|'palace'|'study'|'corridor'|'tent'|'store'|'court'|'gatehouse'|'camp'|'field'|'hill'|'valley'|'forest'|'river'|'bank'|'wall'|'fort'|'fire'|'deck'|'town'|'throne'|'battlefield'|'home';
/** 이야기 배경 번호(0~17, scenario-types.ts Scene.art) → 장면 종류. */
const KIND:Record<number,Kind>={0:'court',1:'fire',2:'gatehouse',3:'hill',4:'valley',5:'palace',6:'camp',7:'river',8:'wall',9:'store',10:'court',11:'forest',12:'study',13:'corridor',14:'tent',15:'bank',16:'camp',17:'fort'};
const INDOOR=new Set<Kind>(['hall','palace','study','corridor','tent','store','throne','home']);

export interface IsoScene {
  url:string;
  /** 대본 자리(화면 %)에 가장 가까운 칸. */
  toCell(at:At):Cell;
  /** 칸의 발 디딤 자리(화면 %). */
  toPct(cell:Cell):At;
  /** 사람이 설 수 있는 화면 안의 칸인가(소품·벽이 없는). */
  standable(cell:Cell):boolean;
  /** 지나갈 수 있는 칸인가(화면 밖 포함, 소품 제외). */
  passable(cell:Cell):boolean;
  indoor:boolean;
  /** 카메라가 다가갈 수 있는 최대 배율(작은 원화를 너무 키우면 흐려진다). */
  maxZoom?:number;
  /** 알현 장면의 자리: 옥좌(황제), 통로 앞(아뢰는 사람), 양옆 줄(신하). */
  layout?:{seat:Cell;front:Cell;rows:Cell[]};
  /** 무대 위에 흩날리는 것(꽃잎·불티·비·눈·반딧불·낙엽·먼지). */
  fx:Fx|undefined;
  /** 때(인물에도 같은 빛을 입힌다). */
  light:'day'|'night'|'dawn'|'dusk';
  /** 카메라가 늘 담아야 할 자리(화면 %): 성문·문루 같은 장면의 주인공 건물. */
  focus?:At[];
  /** 인물 크기 배율(그린 원화마다 다르다). */
  figScale?:number;
}

function rng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function hash(s:string){let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
const shade=(hex:string,k:number)=>{const n=parseInt(hex.slice(1),16),f=(v:number)=>Math.max(0,Math.min(255,Math.round(v*k)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;};
const jitter=(hex:string,R:()=>number,amt=0.08)=>shade(hex,1-amt+R()*amt*2);

export type Fx='petals'|'embers'|'rain'|'snow'|'fireflies'|'leaves'|'dust'|'mist';
interface Mood {light:'day'|'night'|'dawn'|'dusk';weather?:'rain'|'snow'|'fog';fx:Fx|undefined}
/** 장소 이름에서 때와 날씨를 읽는다. */
export function moodOf(place:string,kind:Kind):Mood{
  const light:Mood['light']=/밤|야간|야습|어둠|별이|달빛|전야|한밤|자정/.test(place)?'night':/새벽|아침|여명|동틀/.test(place)?'dawn':/저녁|석양|해 지는|노을|황혼|해질/.test(place)?'dusk':kind==='fire'?'night':'day';
  const weather:Mood['weather']=/비 |비$|장마|폭우|빗속|비가|비 새는/.test(place)?'rain':/눈 |눈$|설원|한겨울|겨울|눈보라/.test(place)?'snow':/안개|연기 낀|물안개/.test(place)?'fog':undefined;
  const fx:Fx|undefined=weather==='rain'?'rain':weather==='snow'?'snow':kind==='fire'?'embers':kind==='court'?'petals':kind==='forest'||kind==='hill'||kind==='valley'?'leaves':light==='night'&&!INDOOR.has(kind)?'fireflies':kind==='river'||kind==='bank'||kind==='deck'||weather==='fog'?'mist':INDOOR.has(kind)?'dust':kind==='camp'?'embers':undefined;
  return {light,...(weather?{weather}:{}),fx};
}
const cache=new Map<string,IsoScene>();
/** 아군 깃발의 문장·색(신세력이면 그 세력의 것). */
let FLAG={emblem:'위',color:'#1f3f8a'};
export function setPlayerFlag(emblem:string,color:string){FLAG={emblem,color};}
/**
 * 장소 이름이 말하는 곳을 먼저 따른다(배경 번호는 대본을 쓸 때 고른 대략의 그림이라 장소와 어긋날 수 있다).
 * '지역 · 자세한 곳'의 자세한 곳을 본다(지역 이름의 '진'·'문' 같은 글자에 속지 않게). 말이 없으면 배경 번호.
 */
const PLACE_RULES:Array<[RegExp,Kind]>=[
  [/알현|어전|옥좌|용상|천자|황제|폐하|즉위|선양|조회/,'throne'],
  [/전장|싸움터|격전|결전|진 앞|진두|양군|대치|전투|맞선|적진|포위망/,'battlefield'],
  [/군막|막사|장막|군의|천막/,'tent'],
  [/서재|서고|서방|글방/,'study'],
  [/회랑|복도/,'corridor'],
  [/앞마당|창고 앞/,'court'],
  [/창고|곳간|무기고|군량고|병기고/,'store'],
  [/누선|배 위|갑판|선단|함선|전선 위|배들|뱃머리|선상/,'deck'],
  [/불타|불길|불탄 (?!부교)|화공|잿더미|타오르|타고 남은/,'fire'],
  [/침전|침소|침실|내실|규방|병상|누운|방 안|안방|사랑|자택|의 집$|집 안|초막|오두막|방$/,'home'],
  [/객사|빈소|사당|관청|부중|사공부|의정|중서성(?! 뒤뜰)|집무|암자|객관|실$/,'hall'],
  [/(전|궁) 앞|뒤뜰|앞뜰|바깥뜰|앞마당|뜰|마당|정원|후원/,'court'],
  [/조회|궁정|대전|어전|정전|궁중|조정|왕좌|옥좌|궁 안/,'palace'],
  [/진영|군영|본진|야영|영채|진채|주둔|집결/,'camp'],
  [/궁문|성문|관문|문 밖|문 앞|[남북동서]문/,'gatehouse'],
  [/성루|성벽|성 위|성가퀴|망루|성곽/,'wall'],
  [/요새|보루|관$|산성/,'fort'],
  [/강둑|강가|강변|나루|물가|포구|기슭|남안|북안|샘|해안|바닷가|호숫가/,'bank'],
  [/강$|강 위|물길|여울|부교|하구|강물|장강|수로|호수/,'river'],
  [/숲|수풀|대숲|숲길/,'forest'],
  [/골짜기|계곡|협곡|협석|벼랑|절벽|곡$|곡 |어귀/,'valley'],
  [/산|고개|능선|언덕|봉우리|령$|비탈/,'hill'],
  [/거리|저자|시장|성안|마을|촌$|읍|도성/,'town'],
  [/들$|들판|평원|벌판|초원|길$|가도|길목/,'field'],
  [/저택|집$|사마가|대문/,'court'],
];
export function kindFor(art:number,place:string):Kind{
  const parts=place.split('·').map(p=>p.trim()),detail=parts.at(-1)??'';
  for(const [re,k] of PLACE_RULES)if(re.test(detail))return k;
  return KIND[art]??'field';
}
/**
 * clear: 대본에서 사람이 설 자리(화면 %). 그 칸과 바로 옆 칸에는 소품을 놓지 않는다
 * (소품에 밀려 사람이 엉뚱한 자리로 가지 않게). 같은 장소라도 자리가 다르면 따로 만든다.
 */
export function isoScene(art:number,place:string,clear:readonly At[]=[]):IsoScene{
  const kind=kindFor(art,place);OY=originFor(kind);
  const cells=[...new Set(clear.map(a=>pctCell(a).join(',')))].sort(),key=`${kind}:${art}:${place}:${cells.join(';')}:${FLAG.emblem}${FLAG.color}`;
  const hit=cache.get(key);if(hit)return hit;
  const scene=build(kind,hash(place)+art*7919,place,new Set(cells),art);cache.set(key,scene);return scene;
}
/** 화면 %에 가장 가까운 칸(소품을 따지지 않고). */
function pctCell([px,py]:At):Cell{const sx=px/100*W,sy=py/100*H,u=(sx-OX)/(TW/2),v=(sy-OY)/(TH/2);return [Math.round((u+v)/2-0.5),Math.round((v-u)/2-0.5)];}

// ─────────────────────────────────────────────── 그리기 도구
type Ctx=CanvasRenderingContext2D;
function poly(g:Ctx,pts:Array<[number,number]>,fill:string,stroke?:string,lw=1.5){g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}}
const up=([x,y]:[number,number],h:number):[number,number]=>[x,y-h];
/** 바닥 칸 모양(평면 사각형 → 마름모). */
function diamond(c:number,r:number,w=1,d=1){return [pt(c,r),pt(c+w,r),pt(c+w,r+d),pt(c,r+d)];}
/** 입체 상자: 칸 (c,r)에서 w×d, 높이 h, 바닥에서 z만큼 떠 있다. */
function prism(g:Ctx,c:number,r:number,w:number,d:number,h:number,col:string,z=0,line='rgba(20,12,6,.45)'){
  const A=up(pt(c,r),z),B=up(pt(c+w,r),z),C=up(pt(c+w,r+d),z),D=up(pt(c,r+d),z);
  // 옆면은 위가 밝고 아래가 어두운 그라데이션(칠한 그림처럼), 테두리는 가늘고 옅게
  const face=(pts:Array<[number,number]>,k:number)=>{const ys=pts.map(p=>p[1]),gr=g.createLinearGradient(0,Math.min(...ys),0,Math.max(...ys));gr.addColorStop(0,shade(col,k*1.06));gr.addColorStop(1,shade(col,k*0.82));poly(g,pts,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();g.strokeStyle=line;g.lineWidth=1;g.stroke();};
  face([D,C,up(C,h),up(D,h)],0.8);
  face([C,B,up(B,h),up(C,h)],0.62);
  poly(g,[up(A,h),up(B,h),up(C,h),up(D,h)],shade(col,1.08),line,1);
  // 윗면 앞 모서리의 빛
  g.strokeStyle='rgba(255,240,210,.18)';g.lineWidth=1;g.beginPath();g.moveTo(...up(D,h));g.lineTo(...up(C,h));g.lineTo(...up(B,h));g.stroke();
}
/** 빛은 모아 두었다가 색 보정(밤·새벽) 뒤에 마지막으로 더한다 — 어두운 장면일수록 등불이 살아난다. */
let LIGHTS:Array<[number,number,number,string,number]>|null=null;
let SHAFTS:Array<{side:'left'|'right';t1:number;t2:number}>=[];
function glow(g:Ctx,x:number,y:number,rad:number,color:string,alpha=0.5){
  if(LIGHTS){LIGHTS.push([x,y,rad,color,alpha]);return;}
  lightNow(g,x,y,rad,color,alpha);
}
function lightNow(g:Ctx,x:number,y:number,rad:number,color:string,alpha:number){
  const grd=g.createRadialGradient(x,y,0,x,y,rad);grd.addColorStop(0,color.replace('A',String(alpha)));grd.addColorStop(1,color.replace('A','0'));
  g.save();g.globalCompositeOperation='lighter';g.fillStyle=grd;g.fillRect(x-rad,y-rad,rad*2,rad*2);g.restore();
}
function flame(g:Ctx,x:number,y:number,s:number,R:()=>number){
  // 혀가 여럿인 불길: 바깥(붉은 주황) → 가운데(노랑) → 속(흰빛), 혀마다 높이·기울기가 다르다
  const tongues=s>=10?5:3,lay=[['#7a1a08',1.08],['#c8320e',1],['#ff7a1a',0.82],['#ffc03a',0.58],['#fff2b0',0.3]] as const;
  const shape=Array.from({length:tongues},(_,i)=>({dx:(i-(tongues-1)/2)*s*0.32,h:s*(1.1+R()*0.8)*(i===Math.floor(tongues/2)?1.3:1),lean:(R()-0.5)*s*0.5}));
  for(const [col,k] of lay){g.fillStyle=col;for(const t of shape){const w=s*0.42*k;g.beginPath();g.moveTo(x+t.dx-w,y);g.quadraticCurveTo(x+t.dx-w*1.1,y-t.h*0.55*k,x+t.dx+t.lean*k,y-t.h*k);g.quadraticCurveTo(x+t.dx+w*1.1,y-t.h*0.5*k,x+t.dx+w,y);g.closePath();g.fill();}}
  // 튀는 불티
  for(let i=0;i<Math.round(s/3);i++){g.fillStyle=R()<0.5?'#ffd060':'#ff8a30';g.fillRect(Math.round(x+(R()-0.5)*s*1.6),Math.round(y-s*(1.4+R()*1.6)),2,2);}
  glow(g,x,y-s*0.6,s>15?s*2.2:s*3,'rgba(255,150,60,A)',s>15?0.14:0.3);
}

// ─────────────────────────────────────────────── 바닥
type Floor='wood'|'stone'|'grass'|'dirt'|'mat'|'paving'|'sand';
const FLOOR:Record<Floor,string>={wood:'#8a5a34',stone:'#8d8c86',grass:'#5f8a3c',dirt:'#9a7a50',mat:'#b39663',paving:'#a39a88',sand:'#c2a878'};
/** 칸마다 정해진 무작위(같은 장면은 늘 같은 바닥). */
const cellRand=(c:number,r:number,k=0)=>{let h=Math.imul(c*73856093^r*19349663^k*83492791,2654435761)>>>0;h^=h>>>15;return (h%10000)/10000;};
function floorTile(g:Ctx,c:number,r:number,f:Floor,R:()=>number){
  const d=diamond(c,r);
  if(f==='wood'){
    // 판자: 칸을 세 줄로 나누고, 줄마다 이음매 자리가 달라 긴 판자가 이어져 보인다.
    for(let k=0;k<3;k++){
      const v0=r+k/3,v1=r+(k+1)/3,off=cellRand(0,Math.floor(r*3+k),7)*2.5,plank=Math.floor((c-off)/2.5);
      const tone=0.9+cellRand(plank,Math.floor(r*3+k),3)*0.18;
      poly(g,[pt(c,v0),pt(c+1,v0),pt(c+1,v1),pt(c,v1)],shade(FLOOR.wood,tone));
      g.strokeStyle='rgba(30,16,6,.35)';g.lineWidth=1;g.beginPath();g.moveTo(...pt(c,v1));g.lineTo(...pt(c+1,v1));g.stroke();
      // 결
      g.strokeStyle=`rgba(${tone>1?'255,225,180':'40,20,8'},.12)`;for(let i=0;i<2;i++){const v=v0+(i+1)/3/3;g.beginPath();g.moveTo(...pt(c,v));g.lineTo(...pt(c+1,v+0.01*(cellRand(c,r,i+k)-0.5)));g.stroke();}
      // 이음매와 못
      const seam=off+(plank+1)*2.5;if(seam>c&&seam<c+1){g.strokeStyle='rgba(25,12,4,.32)';g.lineWidth=1;g.beginPath();g.moveTo(...pt(seam,v0));g.lineTo(...pt(seam,v1));g.stroke();}
      if(cellRand(c,r,k+11)<0.06){const [x,y]=pt(c+0.5,(v0+v1)/2);g.fillStyle='rgba(40,20,8,.35)';g.beginPath();g.ellipse(x,y,5,2.5,0,0,7);g.fill();}
    }
    g.strokeStyle='rgba(255,230,190,.06)';g.lineWidth=1;g.beginPath();g.moveTo(...pt(c,r));g.lineTo(...pt(c+1,r));g.stroke();
  }else if(f==='stone'||f==='paving'){
    // 돌판: 한 칸을 둘로 나눈 돌, 위쪽 모서리는 밝게·아래쪽은 어둡게(빛이 왼쪽 위에서)
    const split=cellRand(c,r,1)<0.5,parts=split?[[c,r,0.5,1],[c+0.5,r,0.5,1]]:[[c,r,1,0.5],[c,r+0.5,1,0.5]];
    poly(g,d,'#3a3632');
    for(const [a,b,w,h] of parts as Array<[number,number,number,number]>){
      const gap=0.035,q=[pt(a+gap,b+gap),pt(a+w-gap,b+gap),pt(a+w-gap,b+h-gap),pt(a+gap,b+h-gap)];
      poly(g,q,shade(FLOOR[f],0.86+cellRand(a*2,b*2,2)*0.24));
      g.strokeStyle='rgba(255,250,235,.22)';g.lineWidth=1.2;g.beginPath();g.moveTo(...q[3]!);g.lineTo(...q[0]!);g.lineTo(...q[1]!);g.stroke();
      g.strokeStyle='rgba(0,0,0,.28)';g.beginPath();g.moveTo(...q[1]!);g.lineTo(...q[2]!);g.lineTo(...q[3]!);g.stroke();
      if(cellRand(a*2,b*2,5)<0.12){const [x,y]=pt(a+w*0.5,b+h*0.5);g.strokeStyle='rgba(30,28,24,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x-8,y-2);g.lineTo(x-2,y+1);g.lineTo(x+6,y-1);g.stroke();}
      if(f==='paving'&&cellRand(a*2,b*2,6)<0.1){const [x,y]=pt(a+gap,b+h*0.5);g.fillStyle='rgba(80,110,50,.45)';g.beginPath();g.ellipse(x+4,y,6,2,0.4,0,7);g.fill();}
    }
  }else if(f==='mat'){
    poly(g,d,shade(FLOOR.mat,0.92+cellRand(c,r)*0.14),'rgba(80,60,30,.45)',1);
    g.strokeStyle='rgba(90,70,40,.22)';g.lineWidth=1;for(let i=1;i<8;i++){const a=pt(c,r+i/8),b=pt(c+1,r+i/8);g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();}
    g.strokeStyle='rgba(60,40,20,.25)';g.beginPath();g.moveTo(...pt(c+0.5,r));g.lineTo(...pt(c+0.5,r+1));g.stroke();
  }else{
    poly(g,d,shade(FLOOR[f],0.97+cellRand(c,r)*0.06));
  }
}
/** 흙·풀·모래 바닥 위에 얼룩·풀포기·꽃·자갈을 흩뿌린다(칸 무늬가 드러나지 않게). */
function scatterGround(g:Ctx,f:Floor,R:()=>number,isWater:(x:number,y:number)=>boolean){
  if(f!=='grass'&&f!=='dirt'&&f!=='sand')return;
  const base=FLOOR[f];
  // 얼룩은 따로 그려 한 번에 흐린다(얼룩마다 흐리면 느리다)
  const off=document.createElement('canvas');off.width=W;off.height=H;const o=off.getContext('2d')!;
  for(let i=0;i<320;i++){const x=R()*W,y=R()*H;if(isWater(x,y))continue;o.fillStyle=shade(base,R()<0.5?0.8:1.16).replace('rgb','rgba').replace(')',',.3)');o.beginPath();o.ellipse(x,y,24+R()*70,10+R()*26,0,0,7);o.fill();}
  g.save();g.filter='blur(10px)';g.drawImage(off,0,0);g.restore();
  if(f==='grass'){
    for(let i=0;i<1400;i++){const x=R()*W,y=R()*H;if(isWater(x,y))continue;const tall=4+R()*7;g.strokeStyle=R()<0.55?`rgba(${150+R()*60|0},${190+R()*40|0},90,.55)`:'rgba(28,58,20,.5)';g.lineWidth=1.2;
      g.beginPath();g.moveTo(x,y);g.lineTo(x-2,y-tall);g.moveTo(x,y);g.lineTo(x+2,y-tall*0.8);g.stroke();}
    for(let i=0;i<110;i++){const x=R()*W,y=R()*H;if(isWater(x,y))continue;g.fillStyle=['#f4f0e0','#f2d24a','#e98aa8','#c9a0e8'][Math.floor(R()*4)]!;g.beginPath();g.arc(x,y,1.8,0,7);g.fill();}
  }else{
    for(let i=0;i<520;i++){const x=R()*W,y=R()*H;if(isWater(x,y))continue;g.fillStyle=R()<0.5?'rgba(50,34,18,.4)':'rgba(240,225,190,.3)';g.beginPath();g.ellipse(x,y,1.5+R()*2.5,1+R()*1.5,0,0,7);g.fill();}
    if(f==='dirt')for(let i=0;i<5;i++){const y=R()*H,x=R()*W;g.strokeStyle='rgba(60,40,20,.22)';g.lineWidth=3;g.beginPath();g.moveTo(x-200,y-100);g.quadraticCurveTo(x,y+20,x+220,y+110);g.stroke();}
  }
}
/** 디딤돌 길: 대문에서 대청 앞까지 두 줄로 엇갈려 놓은 넓적한 돌(빛깔·크기 조금씩 다르게, 위 테는 밝게·틈엔 이끼). */
function flagWalk(g:Ctx,c:number,r0:number,r1:number,R:()=>number){
  for(let r=r0,k=0;r<r1;r+=0.62,k++)for(const side of k%2?[-0.3,0.34]:[-0.34,0.3]){
    const j=()=>(R()-0.5)*0.08,cc=c+side,w=0.27+R()*0.05,d=0.24+R()*0.04;
    const q:Array<[number,number]>=[pt(cc-w+j(),r-d+j()),pt(cc+w+j(),r-d+j()),pt(cc+w+j(),r+d+j()),pt(cc-w+j(),r+d+j())];
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();q.forEach(([x,y],i)=>i?g.lineTo(x+2,y+3):g.moveTo(x+2,y+3));g.closePath();g.fill();
    poly(g,q,shade('#aaa497',0.86+R()*0.22),'rgba(40,36,30,.6)');
    g.strokeStyle='rgba(255,250,235,.35)';g.lineWidth=1.4;g.beginPath();g.moveTo(...q[3]!);g.lineTo(...q[0]!);g.lineTo(...q[1]!);g.stroke();
    if(R()<0.35){const [x,y]=q[2]!;g.fillStyle='rgba(92,120,62,.6)';g.beginPath();g.ellipse(x-4,y-2,5,2,0,0,7);g.fill();}
  }
}
/** 고운 입자(화면 전체의 질감). */
function grain(g:Ctx,R:()=>number,alpha:number){
  const t=document.createElement('canvas');t.width=t.height=128;const tg=t.getContext('2d')!,img=tg.createImageData(128,128);
  for(let i=0;i<img.data.length;i+=4){const v=R()*255|0;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}
  tg.putImageData(img,0,0);g.save();g.globalAlpha=alpha;g.globalCompositeOperation='overlay';g.fillStyle=g.createPattern(t,'repeat')!;g.fillRect(0,0,W,H);g.restore();
}

/** 물: 칸으로 깐 물을 흐린 뒤 반으로 잘라 물가를 매끄럽게, 젖은 모래·물거품·물결·빛 반짝임. */
function smoothWater(g:Ctx,cells:Set<string>,lo:number,hi:number,R:()=>number,open:boolean){
  const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
  const mask=mk(),m=mask.getContext('2d')!;m.fillStyle='#fff';
  for(let c=lo-8;c<=hi;c++)for(let r=lo-8;r<=hi;r++)if(cells.has(`${c},${r}`)){m.beginPath();diamond(c,r).forEach((p,i)=>i?m.lineTo(...p):m.moveTo(...p));m.closePath();m.fill();}
  const cut=(src:HTMLCanvasElement,blur:number,th:number)=>{const o=mk(),og=o.getContext('2d',{willReadFrequently:true})!;og.filter=`blur(${blur}px)`;og.drawImage(src,0,0);og.filter='none';
    const im=og.getImageData(0,0,W,H),d=im.data;for(let i=3;i<d.length;i+=4){const a=d[i]!>th?255:0;d[i-3]=255;d[i-2]=255;d[i-1]=255;d[i]=a;}og.putImageData(im,0,0);return o;};
  const shape=cut(mask,12,128),wet=cut(shape,7,24);
  const paint=(sh:HTMLCanvasElement,draw:(o:Ctx)=>void)=>{const o=mk(),og=o.getContext('2d')!;draw(og);og.globalCompositeOperation='destination-in';og.drawImage(sh,0,0);g.drawImage(o,0,0);};
  // 젖은 물가(어두운 모래)와 물거품 띠
  if(!open)paint(wet,o=>{o.fillStyle='rgba(70,60,40,.45)';o.fillRect(0,0,W,H);});
  paint(cut(shape,3,10),o=>{o.fillStyle=open?'rgba(200,225,235,.5)':'rgba(235,240,230,.75)';o.fillRect(0,0,W,H);});
  paint(shape,o=>{
    const grd=o.createLinearGradient(0,0,W*0.3,H);grd.addColorStop(0,'#2c5a72');grd.addColorStop(0.5,'#3d7088');grd.addColorStop(1,'#2a5068');o.fillStyle=grd;o.fillRect(0,0,W,H);
    // 깊은 곳(가운데)은 더 짙게: 안쪽으로 줄인 모양을 어둡게
    for(let i=0;i<900;i++){const x=R()*W,y=R()*H,len=6+R()*16;o.strokeStyle=R()<0.6?'rgba(190,225,240,.28)':'rgba(20,50,70,.35)';o.lineWidth=1.2;o.beginPath();o.moveTo(x,y);o.quadraticCurveTo(x+len/2,y-2,x+len,y);o.stroke();}
    for(let i=0;i<90;i++){o.fillStyle='rgba(255,250,220,.55)';o.fillRect(R()*W,R()*H,2,1);}
  });
}

// ─────────────────────────────────────────────── 벽(실내)
function wallFace(g:Ctx,side:'left'|'right',h:number,col:string){
  const a=pt(0,0),b=side==='left'?pt(0,N):pt(N,0);
  poly(g,[a,b,up(b,h),up(a,h)],shade(col,side==='left'?0.92:0.72));
}
/** 벽면 위 사각형(가로 t1~t2 칸, 높이 z1~z2). */
function onWall(side:'left'|'right',t1:number,t2:number,z1:number,z2:number){
  const P=(t:number)=>side==='left'?pt(0,t):pt(t,0);
  return [up(P(t1),z1),up(P(t2),z1),up(P(t2),z2),up(P(t1),z2)] as [[number,number],[number,number],[number,number],[number,number]];
}
function lattice(g:Ctx,side:'left'|'right',t1:number,t2:number,z1:number,z2:number,lit:boolean){
  poly(g,onWall(side,t1-0.12,t2+0.12,z1-10,z2+10),'#3b2414','#1a0f08');
  poly(g,onWall(side,t1,t2,z1,z2),lit?'#f2d9a0':'#c8b48a');
  g.strokeStyle='#4a2c16';g.lineWidth=2;
  for(let i=1;i<4;i++){const t=t1+(t2-t1)*i/4,w=onWall(side,t,t,z1,z2);g.beginPath();g.moveTo(...w[0]);g.lineTo(...w[3]);g.stroke();}
  for(let i=1;i<4;i++){const z=z1+(z2-z1)*i/4,s=onWall(side,t1,t2,z,z);g.beginPath();g.moveTo(...s[0]);g.lineTo(...s[1]);g.stroke();}
  if(lit){const [m]=onWall(side,(t1+t2)/2,(t1+t2)/2,(z1+z2)/2,(z1+z2)/2);glow(g,m[0],m[1],90,'rgba(255,214,140,A)',0.25);SHAFTS.push({side,t1,t2});}
}
function hangingScroll(g:Ctx,side:'left'|'right',t1:number,t2:number,R:()=>number){
  poly(g,onWall(side,t1,t2,72,178),'#efe4c4','#3a2410',1);poly(g,onWall(side,t1-0.04,t2+0.04,176,184),'#5a3418');poly(g,onWall(side,t1-0.04,t2+0.04,68,74),'#5a3418');
  g.strokeStyle='rgba(30,20,12,.85)';g.lineWidth=2.4;for(let i=0;i<4;i++){const t=t1+(t2-t1)*(0.35+0.3*R()),z=160-i*22,[a]=onWall(side,t,t,z,z),[b]=onWall(side,t,t,z-14,z-14);g.beginPath();g.moveTo(a[0]-3,a[1]);g.lineTo(b[0]+2,b[1]);g.stroke();}
  const [seal]=onWall(side,t2-0.06,t2-0.06,86,86);g.fillStyle='#b8261a';g.fillRect(seal[0]-3,seal[1]-6,5,5);
}
function drape(g:Ctx,side:'left'|'right',t1:number,t2:number,h:number){
  poly(g,onWall(side,t1,t2,60,h-30),'#8b1a12','#3a0806',1);poly(g,onWall(side,t1,t2,h-44,h-30),'#c9952a');
  const [a]=onWall(side,(t1+t2)/2,(t1+t2)/2,h/2,h/2);g.fillStyle='rgba(230,180,60,.8)';g.beginPath();g.arc(a[0],a[1],9,0,7);g.fill();
}
function pillar(g:Ctx,c:number,r:number,h:number,col='#7a1f14'){prism(g,c,r,0.42,0.42,h,col);prism(g,c-0.06,r-0.06,0.54,0.54,10,'#3a2a1a');prism(g,c-0.04,r-0.04,0.5,0.5,8,'#b8892e',h-26);}
function indoorWalls(g:Ctx,kind:Kind,R:()=>number){
  const h=kind==='tent'?200:240,col=kind==='palace'||kind==='throne'?'#6b3a26':kind==='tent'?'#d9c9a3':kind==='store'?'#6d5a42':'#8a6a4a';
  wallFace(g,'left',h,col);wallFace(g,'right',h,col);
  if(kind==='tent'){
    // 군막 천: 처진 주름(세로 그늘), 위쪽 그늘, 붉은 띠, 버팀 기둥과 밧줄, 벽에 건 지도·깃발
    for(const side of ['left','right'] as const){
      for(let t=0;t<N;t+=1.5){const q=onWall(side,t,t+1.5,0,h);const gr=g.createLinearGradient(q[0][0],q[0][1],q[1][0],q[1][1]);gr.addColorStop(0,'rgba(90,70,40,.28)');gr.addColorStop(0.5,'rgba(255,245,220,.1)');gr.addColorStop(1,'rgba(90,70,40,.28)');poly(g,q,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();q.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();
        const s2=onWall(side,t,t,0,h);g.strokeStyle='rgba(110,90,60,.55)';g.lineWidth=1.5;g.beginPath();g.moveTo(...s2[0]);g.lineTo(...s2[3]);g.stroke();
        // 처마 끝의 처진 곡선
        const a=onWall(side,t,t,h-34,h-34)[0],b=onWall(side,t+1.5,t+1.5,h-34,h-34)[0];g.strokeStyle='rgba(80,56,30,.5)';g.lineWidth=1.2;g.beginPath();g.moveTo(...a);g.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+8,...b);g.stroke();}
      poly(g,onWall(side,0,N,h-30,h),'rgba(70,46,22,.45)');poly(g,onWall(side,0,N,30,40),'#9b2a1c');poly(g,onWall(side,0,N,40,43),'#d8aa3a');
      for(let t=3;t<N;t+=4.5){const [b0]=onWall(side,t,t,0,0),[t0]=onWall(side,t,t,h,h);g.strokeStyle='#5a3a1e';g.lineWidth=6;g.beginPath();g.moveTo(...b0);g.lineTo(...t0);g.stroke();g.strokeStyle='rgba(255,220,170,.25)';g.lineWidth=1.5;g.beginPath();g.moveTo(b0[0]-2,b0[1]);g.lineTo(t0[0]-2,t0[1]);g.stroke();
        g.strokeStyle='rgba(120,90,50,.8)';g.lineWidth=1.2;const [m]=onWall(side,t,t,h-20,h-20),[n]=onWall(side,t+1.2,t+1.2,h-60,h-60);g.beginPath();g.moveTo(...m);g.lineTo(...n);g.stroke();}
    }
    // 왼벽: 걸어 둔 지도(산·강·진 표시)
    {const q=onWall('left',4.2,7.6,80,170);poly(g,onWall('left',4.1,7.7,76,174),'#5a3418');poly(g,q,'#e8d8b0','#3a2410',1);
      const [a]=onWall('left',4.6,4.6,100,100),[b]=onWall('left',7.2,7.2,150,150);g.strokeStyle='rgba(60,110,140,.85)';g.lineWidth=2;g.beginPath();g.moveTo(a[0],a[1]);g.bezierCurveTo(a[0]+30,a[1]-20,b[0]-30,b[1]+30,b[0],b[1]);g.stroke();
      for(let i=0;i<5;i++){const [m]=onWall('left',4.6+i*0.6,4.6+i*0.6,140+((i*37)%25),140);g.fillStyle='rgba(70,60,40,.7)';g.beginPath();g.moveTo(m[0]-5,m[1]);g.lineTo(m[0],m[1]-7);g.lineTo(m[0]+5,m[1]);g.fill();}
      for(const [t,z,cl] of [[5.2,118,'#1f3f8a'],[6.6,130,'#8a1f1a'],[6.2,104,'#8a1f1a']] as const){const [m]=onWall('left',t,t,z,z);g.fillStyle=cl;g.fillRect(m[0]-3,m[1]-3,6,6);}}
    // 오른벽: 걸어 둔 군기 둘
    for(const t of [5,9]){const q=onWall('right',t,t+1,92,170);poly(g,q,t===5?FLAG.color:'#8a1f1a','#1a0c08',1);const [m]=onWall('right',t+0.5,t+0.5,130,130);g.fillStyle='rgba(255,230,160,.85)';g.font='bold 18px serif';g.textAlign='center';g.fillText(t===5?FLAG.emblem:'장',m[0],m[1]+6);g.textAlign='start';}
    return;
  }
  const palace=kind==='palace'||kind==='throne';
  for(const side of ['left','right'] as const){
    const k=side==='left'?1:0.8;
    // 회벽: 위가 밝고 아래로 어두워지는 칠
    {const q=onWall(side,0,N,46,h-34);const gr=g.createLinearGradient(0,q[3][1],0,q[0][1]);gr.addColorStop(0,'rgba(255,240,210,.08)');gr.addColorStop(1,'rgba(0,0,0,.12)');g.fillStyle=gr;g.beginPath();q.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();}
    // 징두리: 나무판 칸(안쪽 턱)
    poly(g,onWall(side,0,N,0,46),shade(palace?'#4a1c12':'#4a3220',k),'#1a0f08');
    for(let t=0.3;t<N;t+=1.1){poly(g,onWall(side,t,t+0.9,8,38),shade(palace?'#5a2416':'#5a3e28',k),'rgba(20,10,4,.6)',1);const e=onWall(side,t,t+0.9,36,38);poly(g,e,'rgba(255,220,170,.12)');}
    poly(g,onWall(side,0,N,44,50),shade('#2e1a0c',k));
    // 들보: 단청 띠(초록·파랑·붉은 마디)
    poly(g,onWall(side,0,N,h-34,h-14),shade('#3a2414',k));
    if(palace||kind==='hall'||kind==='corridor')for(let t=0;t<N;t+=1.6){poly(g,onWall(side,t,t+0.8,h-31,h-17),shade('#2e6a5a',k));poly(g,onWall(side,t+0.8,t+1.6,h-31,h-17),shade('#2a4a7a',k));
      const [m]=onWall(side,t+0.8,t+0.8,h-24,h-24);g.fillStyle='#c9952a';g.beginPath();g.arc(m[0],m[1],3,0,7);g.fill();g.fillStyle='#b8261a';g.fillRect(m[0]-1,m[1]-1,2,2);}
    poly(g,onWall(side,0,N,h-14,h),shade('#26160a',k));
    if(kind!=='store')for(let t=1.6;t<N;t+=3.2){lattice(g,side,t,t+1.5,86,170,kind!=='study'||R()<0.6);
      const m=t+2.35;if(palace)drape(g,side,m-0.3,m+0.3,h);else if(R()<0.75)hangingScroll(g,side,m-0.22,m+0.22,R);}
    else for(let t=2;t<N;t+=4){poly(g,onWall(side,t-0.08,t+1.28,96,144),'#3a2414');poly(g,onWall(side,t,t+1.2,100,140),'#20140a');for(let i=1;i<4;i++){const s2=onWall(side,t+i*0.3,t+i*0.3,100,140);g.strokeStyle='#4a3020';g.lineWidth=3;g.beginPath();g.moveTo(...s2[0]);g.lineTo(...s2[3]);g.stroke();}}
  }
  // 벽을 따라 선 기둥과 기둥머리 공포(받침 덩이)
  const pc=palace?'#8b1e12':kind==='corridor'?'#7a2014':'#5a3420';
  for(let t=0;t<N;t+=3.2){for(const [c0,r0] of [[0.05,t],[t,0.05]] as const){pillar(g,c0,r0,h,pc);
    for(let k=0;k<3;k++)prism(g,c0-0.08-k*0.06,r0-0.08-k*0.06,0.58+k*0.12,0.58+k*0.12,7,k%2?'#2e6a5a':'#3a2414',h-30+k*7);}}
  if(kind==='corridor')for(let t=3;t<N;t+=3.2)pillar(g,8,t,h,pc);
}

// ─────────────────────────────────────────────── 소품
/** 나무 잎 뒤에 가려지는 칸(줄기 기준). */
const CANOPY_BEHIND=[[-1,0],[0,-1],[-1,-1],[-2,-1],[-1,-2],[-2,-2],[-3,-2],[-2,-3],[-3,-3]] as const;
type Prop={c:number;r:number;w:number;d:number;draw:(g:Ctx)=>void;solid:boolean;canopy?:boolean;keep?:boolean};
const P=(c:number,r:number,w:number,d:number,draw:(g:Ctx)=>void,solid=true):Prop=>({c,r,w,d,draw,solid});

// ─────────────────────────────────────────────── 그린 조형물(scenery-v3: 인물과 같은 그림체)
/** 0 활엽수 1 소나무 2 성문 3 망루 4 바위산 5 군막 6 기와집 7 성벽 */
type Art=0|1|2|3|4|5|6|7;
let SPRITES:HTMLCanvasElement[]|null=null;
/** 그린 조형물을 미리 읽어 둔다(시작할 때). 읽은 뒤에 만든 장면부터 쓰이도록 만들어 둔 장면은 버린다. */
export async function loadIsoArt(){
  if(SPRITES||typeof document==='undefined')return;
  const img=new Image();img.src=new URL('scenery-v3.webp',document.baseURI).href;await img.decode();
  const cw=img.naturalWidth/4,ch=img.naturalHeight/2,out:HTMLCanvasElement[]=[];
  for(let f=0;f<8;f++){
    const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d',{willReadFrequently:true})!;
    g.drawImage(img,(f%4)*cw,Math.floor(f/4)*ch,cw,ch,0,0,cw,ch);
    const im=g.getImageData(0,0,cw,ch),d=im.data;let l=cw,t=ch,r=0,b=0;
    // 둘레의 은은한 빛 번짐은 버리고 그림만 남긴다
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=(y*cw+x)*4;if(d[i+3]!<150){d[i+3]=0;continue;}d[i+3]=255;if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}
    g.putImageData(im,0,0);
    const o=document.createElement('canvas');o.width=r-l+1;o.height=b-t+1;o.getContext('2d')!.drawImage(c,l,t,o.width,o.height,0,0,o.width,o.height);out.push(o);
  }
  SPRITES=out;cache.clear();
}
const darkCache=new Map<string,HTMLCanvasElement>();
/** 그을린 조형물(불탄 집 등): 그림 자체만 어둡게. */
function darkened(spr:HTMLCanvasElement,k:number){const key=SPRITES!.indexOf(spr)+':'+k,hit=darkCache.get(key);if(hit)return hit;
  const c=document.createElement('canvas');c.width=spr.width;c.height=spr.height;const g=c.getContext('2d')!;g.drawImage(spr,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=`rgba(24,14,8,${k})`;g.fillRect(0,0,c.width,c.height);darkCache.set(key,c);return c;}
/** 그린 조형물 하나를 칸 위에 세운다. h: 화면 높이(px), sink: 발치를 땅에 묻는 비율. */
function art(c:number,r:number,w:number,d:number,f:Art,h:number,flip=false,opts:{dark?:number;canopy?:boolean;solid?:boolean;sink?:number}={}):Prop|null{
  const spr=SPRITES?.[f];if(!spr)return null;
  return {...P(c,r,w,d,g=>{const [x,y]=pt(c+w/2,r+d/2),k=h/spr.height,dw=spr.width*k;
    g.save();g.translate(Math.round(x),Math.round(y+h*(opts.sink??0.04)));if(flip)g.scale(-1,1);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(opts.dark?darkened(spr,opts.dark):spr,-dw/2,-h,dw,h);
    g.restore();},opts.solid??true),...(opts.canopy?{canopy:true}:{})};
}

/** 둥근 장식 못. */
function stud(g:Ctx,x:number,y:number,rad=1.6,col='#e0b450'){g.fillStyle=col;g.beginPath();g.arc(x,y,rad,0,7);g.fill();g.fillStyle='rgba(255,255,230,.7)';g.fillRect(Math.round(x-rad*0.5),Math.round(y-rad*0.6),1,1);}
/** 윗면 위의 한 점(칸 c+t·w, r+u·d, 높이 h). */
const onTop=(c:number,r:number,w:number,d:number,h:number)=>(t:number,u:number)=>up(pt(c+w*t,r+d*u),h);
/** 카펫 무늬(평면): 칸 하나 = PX점. 바닥 마름모에 비스듬히 붙여 쓴다. */
const RUG_PX=96;
const rugCache=new Map<string,HTMLCanvasElement>();
function hexMix(a:string,b:string,t:number){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),m=(s:number)=>Math.round(((A>>s)&255)*(1-t)+((B>>s)&255)*t);return `rgb(${m(16)},${m(8)},${m(0)})`;}
function rugTexture(w:number,d:number,col:string){
  const key=`${w}:${d}:${col}`;const hit=rugCache.get(key);if(hit)return hit;
  const W2=Math.round(w*RUG_PX),H2=Math.round(d*RUG_PX),c=document.createElement('canvas');c.width=W2;c.height=H2;const g=c.getContext('2d')!;
  const gold='#d9a94a',dark='#1d2440',cream='#e8d8b0',deep=hexMix(col,'#000000',.35),light=hexMix(col,'#ffe0b0',.18);
  let seed=W2*31+H2;const R=()=>{seed=(seed*1103515245+12345)>>>0;return (seed>>>8)/16777216;};
  g.fillStyle=col;g.fillRect(0,0,W2,H2);
  const B1=Math.min(W2,H2)*0.085,B2=Math.min(W2,H2)*0.06;
  // 바깥 테두리: 남색 띠에 금빛 회문(번개무늬)
  g.fillStyle=dark;g.fillRect(0,0,W2,B1);g.fillRect(0,H2-B1,W2,B1);g.fillRect(0,0,B1,H2);g.fillRect(W2-B1,0,B1,H2);
  const fret=(x0:number,y0:number,len:number,horiz:boolean)=>{const step=B1*1.1,n=Math.floor(len/step);g.strokeStyle=gold;g.lineWidth=Math.max(1.5,B1*.09);g.lineCap='square';
    for(let i=0;i<n;i++){const o=i*step+(len-n*step)/2,s=B1*.62,m=B1*.19;g.beginPath();
      const P=(a:number,b:number):[number,number]=>horiz?[x0+o+a,y0+m+b]:[x0+m+b,y0+o+a];
      g.moveTo(...P(0,s));g.lineTo(...P(0,0));g.lineTo(...P(s,0));g.lineTo(...P(s,s*.75));g.lineTo(...P(s*.3,s*.75));g.lineTo(...P(s*.3,s*.35));g.lineTo(...P(s*.65,s*.35));g.stroke();}};
  fret(0,0,W2,true);fret(0,H2-B1,W2,true);fret(0,0,H2,false);fret(W2-B1,0,H2,false);
  // 둘째 띠: 크림빛에 구름무늬 줄
  g.fillStyle=cream;g.fillRect(B1,B1,W2-2*B1,B2);g.fillRect(B1,H2-B1-B2,W2-2*B1,B2);g.fillRect(B1,B1,B2,H2-2*B1);g.fillRect(W2-B1-B2,B1,B2,H2-2*B1);
  const cloud=(x:number,y:number,r:number)=>{g.strokeStyle=deep;g.lineWidth=Math.max(1,r*.28);g.beginPath();g.arc(x-r*.6,y,r*.55,Math.PI*.9,Math.PI*2.1);g.arc(x+r*.6,y,r*.55,Math.PI*.9,Math.PI*2.1);g.stroke();g.beginPath();g.arc(x,y-r*.25,r*.5,Math.PI,0);g.stroke();};
  for(let x=B1+B2;x<W2-B1-B2;x+=B2*2.2){cloud(x,B1+B2*.62,B2*.42);cloud(x,H2-B1-B2*.38,B2*.42);}
  for(let y=B1+B2;y<H2-B1-B2;y+=B2*2.2){cloud(B1+B2*.5,y,B2*.42);cloud(W2-B1-B2*.5,y,B2*.42);}
  // 금선 두 줄
  g.strokeStyle=gold;g.lineWidth=2;g.strokeRect(B1+B2+3,B1+B2+3,W2-2*(B1+B2)-6,H2-2*(B1+B2)-6);g.strokeStyle=hexMix(gold,'#000000',.3);g.lineWidth=1;g.strokeRect(B1,B1,W2-2*B1,H2-2*B1);
  // 안쪽 마당: 마름모 격자와 교차점의 작은 꽃
  const x0=B1+B2+6,y0=B1+B2+6,x1=W2-x0,y1=H2-y0;g.save();g.beginPath();g.rect(x0,y0,x1-x0,y1-y0);g.clip();
  const grd=g.createRadialGradient(W2/2,H2/2,10,W2/2,H2/2,Math.max(W2,H2)*.6);grd.addColorStop(0,light);grd.addColorStop(1,col);g.fillStyle=grd;g.fillRect(x0,y0,x1-x0,y1-y0);
  const L=RUG_PX*.42;g.strokeStyle=hexMix(col,'#000000',.22);g.lineWidth=1.5;
  for(let k=-H2;k<W2+H2;k+=L){g.beginPath();g.moveTo(k,0);g.lineTo(k+H2,H2);g.stroke();g.beginPath();g.moveTo(k,H2);g.lineTo(k+H2,0);g.stroke();}
  for(let yy=0;yy<H2+L;yy+=L/2)for(let xx=((yy/(L/2))%2)*L/2;xx<W2+L;xx+=L){g.fillStyle=gold;g.globalAlpha=.75;for(let i=0;i<4;i++){const a=i*Math.PI/2;g.beginPath();g.ellipse(xx+Math.cos(a)*3,yy+Math.sin(a)*3,2.6,1.4,a,0,7);g.fill();}g.globalAlpha=1;g.fillStyle=cream;g.beginPath();g.arc(xx,yy,1.4,0,7);g.fill();}
  g.restore();
  // 메달리온(연꽃): 겹친 고리, 꽃잎 두 겹, 가운데 보주
  const medal=(cx:number,cy:number,rad:number,clip?:[number,number,number,number])=>{g.save();if(clip){g.beginPath();g.rect(...clip);g.clip();}
    g.fillStyle=deep;g.beginPath();g.ellipse(cx,cy,rad,rad,0,0,7);g.fill();g.strokeStyle=gold;g.lineWidth=3;g.stroke();
    g.fillStyle=dark;g.beginPath();g.arc(cx,cy,rad*.82,0,7);g.fill();g.strokeStyle=gold;g.lineWidth=1.5;g.stroke();
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;g.fillStyle=i%2?gold:hexMix(gold,'#ffffff',.25);g.beginPath();g.ellipse(cx+Math.cos(a)*rad*.62,cy+Math.sin(a)*rad*.62,rad*.2,rad*.08,a,0,7);g.fill();}
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;g.fillStyle=i%2?col:light;g.strokeStyle=gold;g.lineWidth=1.2;g.beginPath();g.ellipse(cx+Math.cos(a)*rad*.34,cy+Math.sin(a)*rad*.34,rad*.2,rad*.11,a,0,7);g.fill();g.stroke();}
    g.fillStyle=gold;g.beginPath();g.arc(cx,cy,rad*.15,0,7);g.fill();g.fillStyle=cream;g.beginPath();g.arc(cx,cy,rad*.07,0,7);g.fill();g.restore();};
  const rad=Math.min(x1-x0,y1-y0)*.3;medal(W2/2,H2/2,rad);
  for(const [cx,cy] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]] as const)medal(cx,cy,rad*.62,[x0,y0,x1-x0,y1-y0]);
  // 낡은 결: 얼룩과 결 따라 옅은 줄
  for(let i=0;i<W2*H2/900;i++){g.fillStyle=R()<.5?'rgba(0,0,0,.05)':'rgba(255,240,210,.05)';g.beginPath();g.ellipse(R()*W2,R()*H2,6+R()*18,3+R()*8,R()*3,0,7);g.fill();}
  g.strokeStyle='rgba(0,0,0,.05)';g.lineWidth=1;for(let y=0;y<H2;y+=3){g.beginPath();g.moveTo(0,y);g.lineTo(W2,y);g.stroke();}
  rugCache.set(key,c);return c;
}
/** 바닥 무늬 그림을 마름모 바닥(칸 c,r에서 w×d)에 비스듬히 붙인다. */
function onFloor(g:Ctx,img:HTMLCanvasElement,c:number,r:number,w:number,d:number){
  // 그림 한 점(ix,iy) → 칸 (c+ix·w/폭, r+iy·d/높이) → 화면
  const [X,Y]=pt(c,r),ku=w/img.width,kv=d/img.height;
  g.save();g.transform(TW/2*ku,TH/2*ku,-TW/2*kv,TH/2*kv,X,Y);g.imageSmoothingQuality='high';g.drawImage(img,0,0);g.restore();
}
function rug(c:number,r:number,w:number,d:number,col='#8a1f1a'):Prop{return P(c,r,w,d,g=>{
  // 바닥에 드리운 그늘, 무늬, 앞 두 가장자리의 술
  poly(g,diamond(c+0.06,r+0.06,w,d),'rgba(0,0,0,.28)');
  onFloor(g,rugTexture(w,d,col),c,r,w,d);
  poly(g,diamond(c,r,w,d),'rgba(0,0,0,0)','rgba(30,10,6,.6)',1);
  g.strokeStyle='rgba(232,214,160,.9)';g.lineWidth=1.2;
  for(let t=0.04;t<w;t+=0.06){const [x,y]=pt(c+t,r+d);g.beginPath();g.moveTo(x,y);g.lineTo(x-1,y+5);g.stroke();}
  for(let t=0.04;t<d;t+=0.06){const [x,y]=pt(c+w,r+t);g.beginPath();g.moveTo(x,y);g.lineTo(x+1,y+5);g.stroke();}
},false);}
function table(c:number,r:number,w:number,d:number,R:()=>number):Prop{return P(c,r,w,d,g=>{
  const H=30;
  for(const [a,b] of [[0.06,0.06],[w-0.18,0.06],[0.06,d-0.18],[w-0.18,d-0.18]] as const){prism(g,c+a,r+b,0.12,0.12,H-5,'#2a1008');const [fx,fy]=pt(c+a+0.12,r+b+0.12);g.fillStyle='#1a0a04';g.beginPath();g.ellipse(fx,fy-1,4,2,0,0,7);g.fill();}
  prism(g,c+0.12,r+d-0.16,w-0.24,0.05,3,'#3a1a0c',7);
  prism(g,c+0.04,r+0.04,w-0.08,d-0.08,7,'#4a1a0e',H-12);
  {const a1=up(pt(c+0.12,r+d-0.04),H-8),a2=up(pt(c+w-0.12,r+d-0.04),H-8);g.strokeStyle='rgba(210,160,70,.8)';g.setLineDash([3,3]);g.lineWidth=1;g.beginPath();g.moveTo(...a1);g.lineTo(...a2);g.stroke();g.setLineDash([]);}
  prism(g,c,r,w,d,5,'#6e2414',H-5);
  const T=[up(pt(c,r),H),up(pt(c+w,r),H),up(pt(c+w,r+d),H),up(pt(c,r+d),H)] as Array<[number,number]>;
  const sh=g.createLinearGradient(T[0]![0],T[0]![1],T[2]![0],T[2]![1]);sh.addColorStop(0,'rgba(255,225,190,.22)');sh.addColorStop(0.5,'rgba(255,225,190,0)');g.fillStyle=sh;g.beginPath();T.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();
  poly(g,[up(pt(c+0.07,r+0.07),H),up(pt(c+w-0.07,r+0.07),H),up(pt(c+w-0.07,r+d-0.07),H),up(pt(c+0.07,r+d-0.07),H)],'rgba(0,0,0,0)','rgba(220,170,70,.75)',1);
  const at=onTop(c,r,w,d,H+1);
  // 펼친 죽간(글줄)
  {const [x,y]=at(0.32,0.5);for(let k=0;k<9;k++){g.fillStyle=k%2?'#d9be82':'#e6cf96';g.fillRect(x-14+k*3,y-5+k*0.6,3,10);}g.fillStyle='rgba(40,30,20,.75)';for(let k=0;k<9;k++)for(let j=0;j<3;j++)g.fillRect(x-13+k*3,y-3+k*0.6+j*3,1,1);
    g.strokeStyle='#7a5a2a';g.lineWidth=1;g.beginPath();g.moveTo(x-14,y-2);g.lineTo(x+13,y+3);g.moveTo(x-14,y+3);g.lineTo(x+13,y+8);g.stroke();}
  // 말린 두루마리 둘(붉은 끈)
  for(const [t,u] of [[0.72,0.25],[0.8,0.42]] as const){const [x,y]=at(t,u);g.fillStyle='#efe2bf';g.fillRect(x-9,y-3,16,5);g.fillStyle='rgba(0,0,0,.15)';g.fillRect(x-9,y+1,16,1);g.fillStyle='#7a3a1a';g.fillRect(x-10,y-4,2,7);g.fillRect(x+7,y-4,2,7);g.fillStyle='#b8261a';g.fillRect(x-2,y-3,2,5);}
  // 벼루·먹·붓걸이
  {const [x,y]=at(0.74,0.74);g.fillStyle='#1a1a1e';g.beginPath();g.ellipse(x,y,8,4,0,0,7);g.fill();g.fillStyle='#2e3a44';g.beginPath();g.ellipse(x-1,y-1,4,2,0,0,7);g.fill();g.fillStyle='#0e0e10';g.fillRect(x+6,y-4,6,3);
    g.strokeStyle='#5a3a1a';g.lineWidth=1.5;g.beginPath();g.moveTo(x-14,y-1);g.lineTo(x-14,y-13);g.moveTo(x-4,y-5);g.lineTo(x-4,y-16);g.moveTo(x-15,y-13);g.lineTo(x-3,y-17);g.stroke();
    for(let k=0;k<3;k++){g.strokeStyle='#3a2a1a';g.lineWidth=1;g.beginPath();g.moveTo(x-12+k*3,y-13-k);g.lineTo(x-12+k*3,y-4-k);g.stroke();g.fillStyle='#e8e0d0';g.fillRect(x-13+k*3,y-5-k,2,3);}}
  // 촛대와 촛불
  if(R()<0.85){const [x,y]=at(0.18,0.2);g.fillStyle='#8a6a2a';g.fillRect(x-4,y-2,8,2);g.fillRect(x-1,y-12,2,10);g.fillStyle='#f2ead8';g.fillRect(x-2,y-20,4,8);flame(g,x,y-22,4,R);glow(g,x,y-24,60,'rgba(255,200,120,A)',0.3);}
  if(R()<0.7){const [x,y]=at(0.45,0.88);g.fillStyle='#e8e4d8';g.beginPath();g.ellipse(x,y-2,4,2.5,0,0,7);g.fill();g.fillStyle='#5a7a4a';g.fillRect(x-1,y-3,2,1);}
});}
function lamp(c:number,r:number):Prop{return P(c,r,0.4,0.4,g=>{
  // 나무 받침대 위의 육각 종이등
  prism(g,c+0.05,r+0.05,0.3,0.3,6,'#3a2414');prism(g,c+0.16,r+0.16,0.08,0.08,58,'#4a2c18',6);
  const [x,y]=up(pt(c+0.2,r+0.2),64);g.fillStyle='#3a2414';g.fillRect(x-11,y-3,22,3);g.fillRect(x-11,y-33,22,3);
  const lg=g.createLinearGradient(x-10,0,x+10,0);lg.addColorStop(0,'#e8c27a');lg.addColorStop(0.5,'#fff0c0');lg.addColorStop(1,'#d8a860');g.fillStyle=lg;g.fillRect(x-10,y-31,20,28);
  g.fillStyle='rgba(90,50,20,.6)';for(const dx of [-4,4])g.fillRect(x+dx,y-31,1,28);g.fillStyle='#a02a1a';g.fillRect(x-1,y-2,2,6);
  glow(g,x,y-17,100,'rgba(255,200,110,A)',0.38);
});}
function brazier(c:number,r:number,R:()=>number):Prop{return P(c,r,0.6,0.6,g=>{
  const [x,y]=pt(c+0.3,r+0.3);g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,20,7,0,0,7);g.fill();
  // 짐승 발 세 다리
  g.strokeStyle='#3a2c18';g.lineWidth=4;for(const dx of [-14,0,14]){g.beginPath();g.moveTo(x+dx*0.6,y-30);g.quadraticCurveTo(x+dx*1.1,y-14,x+dx,y-(dx?2:-3));g.stroke();g.fillStyle='#2a2010';g.beginPath();g.ellipse(x+dx,y-(dx?1:-3),4,2,0,0,7);g.fill();}
  // 청동 그릇
  const bg=g.createLinearGradient(x-22,0,x+22,0);bg.addColorStop(0,'#a8843c');bg.addColorStop(0.45,'#6e6a44');bg.addColorStop(1,'#34362a');
  g.fillStyle=bg;g.strokeStyle='#1e1a0e';g.lineWidth=1.5;g.beginPath();g.moveTo(x-22,y-44);g.quadraticCurveTo(x-20,y-26,x,y-26);g.quadraticCurveTo(x+20,y-26,x+22,y-44);g.closePath();g.fill();g.stroke();
  g.strokeStyle='rgba(220,190,100,.55)';g.lineWidth=1;g.beginPath();g.moveTo(x-19,y-38);g.quadraticCurveTo(x,y-33,x+19,y-38);g.stroke();
  for(const dx of [-18,18]){g.strokeStyle='#6a5a2e';g.lineWidth=2.5;g.beginPath();g.arc(x+dx*1.15,y-40,4,0,7);g.stroke();}
  g.fillStyle='#4a4a34';g.beginPath();g.ellipse(x,y-44,22,7,0,0,7);g.fill();g.stroke();
  // 숯불
  g.fillStyle='#2a1208';g.beginPath();g.ellipse(x,y-45,18,5,0,0,7);g.fill();
  for(let i=0;i<14;i++){g.fillStyle=R()<0.5?'#ff7a2a':'#c83a12';g.fillRect(Math.round(x-14+R()*28),Math.round(y-48+R()*5),2,2);}
  flame(g,x-4,y-50,11,R);flame(g,x+5,y-48,8,R);
});}
function screenPanel(c:number,r:number,len:number):Prop{return P(c,r,len,0.15,g=>{
  prism(g,c,r,len,0.15,8,'#3a1e12');
  const n=Math.round(len*2);
  for(let i=0;i<n;i++){const t1=c+i/2+0.04,t2=c+(i+1)/2-0.04,a=up(pt(t1,r+0.15),8),b=up(pt(t2,r+0.15),8),zig=i%2?6:0;
    poly(g,[up(a,zig),up(b,6-zig),up(b,118-zig),up(a,112+zig)],'#4a2414','#1a0a06',1);
    const A=up(a,zig+5),B=up(b,6-zig+5),C=up(b,112-zig),D=up(a,106+zig);poly(g,[A,B,C,D],i%2?'#efe2c0':'#f4ead0');
    // 먹으로 그린 산·소나무·새
    const lx=(A[0]+B[0])/2,ly=(A[1]+D[1])/2;g.fillStyle='rgba(60,70,80,.55)';g.beginPath();g.moveTo(A[0]+2,ly+20);g.lineTo(lx-4,ly-14);g.lineTo(lx+2,ly-2);g.lineTo(lx+8,ly-22);g.lineTo(B[0]-2,ly+18);g.closePath();g.fill();
    g.fillStyle='rgba(40,70,50,.7)';g.fillRect(lx-6,ly+18,2,10);g.beginPath();g.ellipse(lx-5,ly+16,7,3,0,0,7);g.fill();
    g.fillStyle='rgba(150,40,30,.8)';if(i===0)g.fillRect(A[0]+4,A[1]-30,3,4);}
});}
function shelf(c:number,r:number,d:number,R:()=>number):Prop{return P(c,r,0.55,d,g=>{
  const Hh=156;prism(g,c,r,0.55,d,Hh,'#4a2a16');
  const face=(t1:number,t2:number,z1:number,z2:number)=>[up(pt(c+0.55,r+t1),z1),up(pt(c+0.55,r+t2),z1),up(pt(c+0.55,r+t2),z2),up(pt(c+0.55,r+t1),z2)] as Array<[number,number]>;
  poly(g,face(0.08,d-0.08,8,Hh-12),'#1c0f07');
  for(const z of [8,44,80,116]){
    poly(g,face(0.04,d-0.04,z-3,z+3),'#6a3e20','#22140a',1);
    let t=0.14;
    while(t<d-0.2){const kind=Math.floor(R()*5),p=up(pt(c+0.55,r+t),z+3);
      if(kind===0){for(let k=0;k<5;k++){const ox=(k%3)*5-5,oy=-Math.floor(k/3)*6;g.fillStyle=k%2?'#e8d8b0':'#d8c290';g.beginPath();g.arc(p[0]+ox,p[1]-4+oy,3,0,7);g.fill();g.strokeStyle='#6a4a24';g.lineWidth=0.8;g.stroke();g.fillStyle='#8a5a2a';g.fillRect(p[0]+ox-0.5,p[1]-4.5+oy,1,1);}t+=0.32;}
      else if(kind===1){for(let k=0;k<6;k++){g.fillStyle=k%2?'#c9a86a':'#b8955a';g.fillRect(p[0]-7+k*2.4,p[1]-28,2.2,27);}g.fillStyle='#8a1f1a';g.fillRect(p[0]-7,p[1]-20,15,2);g.fillRect(p[0]-7,p[1]-9,15,2);t+=0.3;}
      else if(kind===2){for(let k=0;k<3;k++){g.fillStyle=['#2f4a6a','#6a2a1a','#3a5a3a'][k]!;g.fillRect(p[0]-8,p[1]-7-k*7,16,6);g.fillStyle='rgba(230,200,120,.85)';g.fillRect(p[0]-2,p[1]-6-k*7,4,4);}t+=0.34;}
      else if(kind===3&&z>8){g.fillStyle='#3a6a7a';g.beginPath();g.ellipse(p[0],p[1]-10,6,8,0,0,7);g.fill();g.fillRect(p[0]-2,p[1]-24,4,7);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(p[0]-3,p[1]-15,1,6);t+=0.26;}
      else{g.fillStyle='#ead9b0';g.fillRect(p[0]-10,p[1]-7,20,5);g.fillStyle='#7a3a1a';g.fillRect(p[0]-11,p[1]-8,2,7);g.fillRect(p[0]+9,p[1]-8,2,7);g.fillStyle='#b8261a';g.fillRect(p[0]+11,p[1]-5,4,1);t+=0.3;}
    }
  }
  prism(g,c-0.03,r-0.03,0.61,d+0.06,6,'#3a1e0e',Hh);
});}
function throne(c:number,r:number):Prop{return P(c,r,3,2.4,g=>{
  prism(g,c,r,3,2.4,12,'#5a1a12');prism(g,c+0.3,r+0.3,2.4,1.8,12,'#7a2418',12);
  prism(g,c+0.9,r+0.5,1.2,0.5,70,'#c08a2a',24);prism(g,c+0.9,r+0.9,1.2,0.8,20,'#9a2a1a',24);
  const [x,y]=pt(c+1.5,r+0.6);glow(g,x,y-80,140,'rgba(255,210,120,A)',0.25);
});}
function crate(c:number,r:number,s=1):Prop{return P(c,r,s,s,g=>{
  const h=38*s;prism(g,c,r,s,s,h,'#8a6234');
  g.strokeStyle='rgba(50,30,12,.55)';g.lineWidth=1;
  for(let k=1;k<4;k++){const z=h*k/4;for(const [A,B] of [[pt(c,r+s),pt(c+s,r+s)],[pt(c+s,r+s),pt(c+s,r)]] as const){g.beginPath();g.moveTo(...up(A,z));g.lineTo(...up(B,z));g.stroke();}}
  for(let k=1;k<3;k++){const a=up(pt(c+s*k/3,r),h),b=up(pt(c+s*k/3,r+s),h);g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();}
  for(const P0 of [pt(c,r+s),pt(c+s,r+s),pt(c+s,r)]){g.strokeStyle='#3a3836';g.lineWidth=3;g.beginPath();g.moveTo(...P0);g.lineTo(...up(P0,h));g.stroke();for(let z=5;z<h;z+=11)stud(g,P0[0],P0[1]-z,1.1,'#a8a49a');}
  const [x,y]=up(pt(c+s/2,r+s),h/2);g.fillStyle='rgba(40,20,8,.65)';g.font=`bold ${Math.round(13*s)}px serif`;g.textAlign='center';g.fillText('곡',x-3*s,y+5);g.textAlign='start';
});}
function sacks(c:number,r:number,R:()=>number):Prop{return P(c,r,1,1,g=>{
  const [cx,cy]=pt(c+0.5,r+0.5);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,cy,32,11,0,0,7);g.fill();
  for(const [dx,dy,l] of [[-13,-2,0],[13,0,0],[0,7,0],[-1,-3,1]] as const){const x=cx+dx,y=cy+dy-l*17,col=['#c9b07a','#bfa46c','#d2ba86'][Math.floor(R()*3)]!;
    const bg=g.createLinearGradient(x-15,0,x+15,0);bg.addColorStop(0,shade(col,1.12));bg.addColorStop(1,shade(col,0.78));
    g.fillStyle=bg;g.strokeStyle='#5a4424';g.lineWidth=1.3;g.beginPath();g.moveTo(x-15,y-2);g.quadraticCurveTo(x-18,y-20,x-6,y-24);g.lineTo(x+6,y-24);g.quadraticCurveTo(x+18,y-20,x+15,y-2);g.quadraticCurveTo(x,y+3,x-15,y-2);g.fill();g.stroke();
    g.fillStyle=shade(col,0.9);g.beginPath();g.ellipse(x,y-26,5,4,0,0,7);g.fill();g.stroke();g.fillStyle='#7a2a18';g.fillRect(x-5,y-25,10,2);
    g.strokeStyle='rgba(90,68,36,.6)';g.lineWidth=1;g.beginPath();g.moveTo(x-8,y-16);g.quadraticCurveTo(x-4,y-10,x-9,y-5);g.moveTo(x+6,y-18);g.quadraticCurveTo(x+9,y-11,x+5,y-6);g.stroke();}
  for(let i=0;i<26;i++){g.fillStyle=R()<0.6?'#e0c070':'#b8963e';g.fillRect(Math.round(cx+8+R()*22),Math.round(cy+6+R()*7),2,1);}
});}
function rack(c:number,r:number,len:number):Prop{return P(c,r,len,0.3,g=>{
  prism(g,c,r,len,0.3,10,'#4a3018');
  for(const t of [0.05,len-0.17]){prism(g,c+t,r+0.08,0.12,0.12,100,'#3a2410',10);}
  for(const z of [40,92]){const a=up(pt(c+0.05,r+0.14),z),b=up(pt(c+len-0.05,r+0.14),z);g.strokeStyle='#5a3a1a';g.lineWidth=4;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();}
  let i=0;
  for(let t=0.3;t<len-0.2;t+=0.3,i++){const [x,y]=pt(c+t,r+0.15),kind=i%3;
    g.strokeStyle='#6a4422';g.lineWidth=3;g.beginPath();g.moveTo(x,y-8);g.lineTo(x,y-120);g.stroke();
    g.fillStyle='#c9ced6';g.strokeStyle='#3a3e46';g.lineWidth=1;
    if(kind===0){g.beginPath();g.moveTo(x-4,y-120);g.quadraticCurveTo(x-5,y-130,x,y-142);g.quadraticCurveTo(x+5,y-130,x+4,y-120);g.closePath();g.fill();g.stroke();}
    else if(kind===1){g.beginPath();g.moveTo(x-3,y-120);g.lineTo(x,y-140);g.lineTo(x+3,y-120);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(x+2,y-126);g.quadraticCurveTo(x+14,y-128,x+12,y-114);g.quadraticCurveTo(x+8,y-120,x+2,y-120);g.fill();g.stroke();}
    else{g.beginPath();g.moveTo(x,y-118);g.quadraticCurveTo(x+12,y-128,x+8,y-148);g.quadraticCurveTo(x-2,y-138,x-3,y-118);g.closePath();g.fill();g.stroke();g.strokeStyle='rgba(255,255,255,.5)';g.beginPath();g.moveTo(x+1,y-124);g.quadraticCurveTo(x+8,y-132,x+6,y-144);g.stroke();}
    g.fillStyle='#b8261a';g.beginPath();g.moveTo(x-4,y-118);g.lineTo(x+4,y-118);g.lineTo(x+5,y-106);g.lineTo(x-5,y-106);g.closePath();g.fill();g.fillStyle='#d8aa3a';g.fillRect(x-3,y-120,6,2);}
  // 기대 놓은 방패
  const [sx,sy]=pt(c+len-0.25,r+0.35);g.fillStyle='#7a3a1a';g.strokeStyle='#2a1208';g.lineWidth=1.5;g.beginPath();g.ellipse(sx+8,sy-22,12,22,0.15,0,7);g.fill();g.stroke();g.fillStyle='#c9952a';g.beginPath();g.arc(sx+8,sy-22,4,0,7);g.fill();g.strokeStyle='rgba(230,190,90,.7)';g.beginPath();g.ellipse(sx+8,sy-22,9,18,0.15,0,7);g.stroke();
});}
function banner(c:number,r:number,col0:string):Prop{const mine=col0==='#1f3f8a',col=mine?FLAG.color:col0,mark=mine?FLAG.emblem:'장';return P(c,r,0.2,0.2,g=>{
  const [x,y]=pt(c+0.1,r+0.1);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x,y,8,3,0,0,7);g.fill();
  g.strokeStyle='#3a2410';g.lineWidth=4;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-172);g.stroke();
  g.fillStyle='#d8aa3a';g.beginPath();g.moveTo(x-4,y-172);g.lineTo(x,y-186);g.lineTo(x+4,y-172);g.closePath();g.fill();g.fillStyle='#b8261a';g.fillRect(x-3,y-172,6,6);
  g.strokeStyle='#3a2410';g.lineWidth=2;g.beginPath();g.moveTo(x,y-164);g.lineTo(x+50,y-158);g.stroke();
  const path=()=>{g.beginPath();g.moveTo(x+1,y-163);g.quadraticCurveTo(x+26,y-156,x+50,y-157);g.quadraticCurveTo(x+56,y-128,x+50,y-98);g.quadraticCurveTo(x+26,y-100,x+1,y-106);g.closePath();};
  path();g.fillStyle=col;g.fill();g.strokeStyle='#1a0c08';g.lineWidth=1.5;g.stroke();
  // 불꽃 모양 가장자리
  g.fillStyle=mine?'#d8b04a':'#1a1a1a';for(let k=0;k<5;k++){const yy=y-150+k*11;g.beginPath();g.moveTo(x+50+Math.sin(k)*2,yy);g.lineTo(x+60,yy+5);g.lineTo(x+51,yy+10);g.closePath();g.fill();}
  // 주름 그늘
  g.save();path();g.clip();for(const k of [14,30,44]){const gr=g.createLinearGradient(x+k-6,0,x+k+6,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(0.5,'rgba(0,0,0,.22)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x+k-6,y-170,12,80);}g.restore();
  g.strokeStyle='rgba(255,230,160,.6)';g.lineWidth=1;g.beginPath();g.moveTo(x+5,y-155);g.quadraticCurveTo(x+26,y-149,x+45,y-150);g.lineTo(x+45,y-106);g.stroke();
  g.fillStyle='rgba(255,236,170,.92)';g.font='bold 22px serif';g.textAlign='center';g.fillText(mark,x+26,y-120);g.textAlign='start';
});}
function tent(c:number,r:number,w:number,d:number,col:string):Prop{return P(c,r,w,d,g=>{
  const A=pt(c,r),B=pt(c+w,r),C=pt(c+w,r+d),D=pt(c,r+d),apex=up(pt(c+w/2,r+d/2),Math.max(w,d)*58),wall=26;
  poly(g,[D,C,up(C,wall),up(D,wall)],shade(col,0.82),'#3a2a18');poly(g,[C,B,up(B,wall),up(C,wall)],shade(col,0.64),'#3a2a18');
  poly(g,[up(D,wall),up(C,wall),apex],shade(col,0.95),'#3a2a18');poly(g,[up(C,wall),up(B,wall),apex],shade(col,0.74),'#3a2a18');
  // 입구와 붉은 띠
  const m=pt(c+w/2,r+d);poly(g,[[m[0]-14,m[1]-8],[m[0]+14,m[1]-1],[m[0]+4,m[1]-40]],'#2a1a10');
  g.strokeStyle='#9b2a1c';g.lineWidth=4;g.beginPath();g.moveTo(...up(D,wall));g.lineTo(...up(C,wall));g.lineTo(...up(B,wall));g.stroke();
  void A;
});}
function tree(c:number,r:number,R:()=>number,blossom=false,big=1):Prop{const a=art(c,r,0.6,0.6,0,250*big,R()<0.5,{canopy:true});
  if(a&&blossom){const base=a.draw,[x,y]=pt(c+0.3,r+0.3),dots=Array.from({length:260},()=>[(R()-0.5)*190*big,-120*big-(R()-0.3)*150*big,R()] as const);
    a.draw=g=>{base(g);for(const [dx,dy,k] of dots){g.fillStyle=k<0.55?'rgba(246,196,210,.9)':k<0.85?'rgba(255,232,238,.95)':'rgba(214,140,165,.9)';g.fillRect(Math.round(x+dx),Math.round(y+dy),k<0.3?3:2,2);}};}
  if(a)return a;return {...P(c,r,0.6,0.6,g=>{
  const [x,y]=pt(c+0.3,r+0.3);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x+10,y+2,46*big,18*big,0,0,7);g.fill();
  g.fillStyle='#4a3020';g.beginPath();g.moveTo(x-7,y);g.lineTo(x-3,y-74*big);g.lineTo(x+4,y-74*big);g.lineTo(x+8,y);g.closePath();g.fill();
  g.strokeStyle='#3a2416';g.lineWidth=3;g.beginPath();g.moveTo(x,y-50*big);g.lineTo(x-22*big,y-82*big);g.moveTo(x+2,y-60*big);g.lineTo(x+24*big,y-90*big);g.stroke();
  // 잎: 어두운 속 → 중간 → 왼쪽 위 밝은 잎 순으로 작은 덩어리를 겹친다
  const autumn=!blossom&&R()<0.22,base=blossom?'#e3aabb':autumn?'#c9922e':'#4f7a33';
  for(const [k,n,lift] of [[0.62,26,0],[0.88,30,6],[1.18,22,12]] as const)for(let i=0;i<n;i++){
    const a=R()*Math.PI*2,rr=Math.sqrt(R())*50*big,ox=Math.cos(a)*rr*1.15-(lift?lift*0.6:0),oy=-96*big+Math.sin(a)*rr*0.75-lift;
    g.fillStyle=shade(base,k*(0.92+R()*0.16));g.beginPath();g.ellipse(x+ox,y+oy,(9+R()*9)*big,(7+R()*6)*big,R()*3,0,7);g.fill();}
  if(blossom)for(let i=0;i<40;i++){g.fillStyle='rgba(255,240,245,.85)';g.beginPath();g.arc(x+(R()-0.5)*110*big,y-60*big-R()*90*big,1.6,0,7);g.fill();}
}),canopy:true};}
function rock(c:number,r:number,R:()=>number,s=1):Prop{return P(c,r,s,s,g=>{
  const [x,y]=pt(c+s/2,r+s/2),pts:Array<[number,number]>=[];for(let i=0;i<7;i++){const a=Math.PI+i/6*Math.PI;pts.push([x+Math.cos(a)*30*s*(0.8+R()*0.3),y+Math.sin(a)*34*s*(0.7+R()*0.4)-4]);}
  poly(g,pts,jitter('#7d7a72',R,0.1),'#2a2824');poly(g,[pts[0]!,pts[1]!,pts[2]!,[x,y-6]],'rgba(255,255,255,.12)');
});}
/** 덤불: 그늘진 밑동 위에 잎 무더기를 어두운 것부터 밝은 것 순으로 겹치고, 왼쪽 위에 빛 받은 잎, 가끔 작은 꽃. */
function bush(c:number,r:number,R:()=>number):Prop{return P(c,r,0.5,0.5,g=>{const [x,y]=pt(c+0.25,r+0.25);
  g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x+4,y,26,9,0,0,7);g.fill();
  for(const [k,n,lift] of [[0.62,9,0],[0.85,12,4],[1.12,9,8]] as const)for(let i=0;i<n;i++){const a=R()*Math.PI*2,rr=Math.sqrt(R())*20;
    g.fillStyle=shade('#4d7a32',k*(0.92+R()*0.16));g.beginPath();g.ellipse(x+Math.cos(a)*rr*1.2-lift*0.5,y-14+Math.sin(a)*rr*0.6-lift,5+R()*4,4+R()*3,R()*3,0,7);g.fill();}
  if(R()<0.5)for(let i=0;i<5;i++){g.fillStyle=R()<0.5?'rgba(250,240,230,.9)':'rgba(230,150,170,.9)';g.beginPath();g.arc(x+(R()-0.5)*34,y-12-R()*16,1.6,0,7);g.fill();}
},false);}
function stoneLantern(c:number,r:number):Prop{return P(c,r,0.5,0.5,g=>{prism(g,c+0.1,r+0.1,0.3,0.3,40,'#8e8b82');prism(g,c,r,0.5,0.5,18,'#a9a59a',40);prism(g,c-0.05,r-0.05,0.6,0.6,8,'#7a776e',58);const [x,y]=pt(c+0.25,r+0.25);glow(g,x,y-50,60,'rgba(255,200,120,A)',0.35);});}
function campfire(c:number,r:number,R:()=>number):Prop{return P(c,r,0.7,0.7,g=>{const [x,y]=pt(c+0.35,r+0.35);g.fillStyle='#3a2a1a';for(let i=0;i<5;i++){g.save();g.translate(x,y-4);g.rotate(i*1.25);g.fillRect(-16,-3,32,6);g.restore();}flame(g,x,y-6,16,R);});}
function boat(c:number,r:number):Prop{return P(c,r,3,1,g=>{
  const rim:Array<[number,number]>=[pt(c,r+0.5),pt(c+0.45,r+0.12),pt(c+2.55,r+0.12),pt(c+3,r+0.5),pt(c+2.55,r+0.88),pt(c+0.45,r+0.88)].map(p=>up(p,10));
  const front:Array<[number,number]>=[rim[0]!,rim[5]!,rim[4]!,rim[3]!];poly(g,[...front,...[...front].reverse().map(p=>[p[0],p[1]+16] as [number,number])],'#4a2e16','#1a0e06');
  poly(g,rim,'#7a5230','#1a0e06');poly(g,rim.map(([x,y]):[number,number]=>[x+(OX-x)*0+0,y+4]).slice(1,5),'rgba(0,0,0,.18)');
  prism(g,c+1.2,r+0.3,0.6,0.4,26,'#8a6a3a',10);const [mx,my]=up(pt(c+1.5,r+0.5),36);g.strokeStyle='#3a2410';g.lineWidth=3;g.beginPath();g.moveTo(mx,my);g.lineTo(mx,my-90);g.stroke();
},false);}
function stall(c:number,r:number,R:()=>number,cloth:string):Prop{return P(c,r,2,1,g=>{
  prism(g,c,r,2,1,26,'#6b4426');for(let i=0;i<5;i++){const [x,y]=up(pt(c+0.3+i*0.35,r+0.5),30);g.fillStyle=['#c9a14a','#9b4a2a','#7a9a4a','#e0d0a0','#b8603a'][Math.floor(R()*5)]!;g.beginPath();g.ellipse(x,y,7,4,0,0,7);g.fill();}
  for(const [a,b] of [[0,0],[2,0],[0,1],[2,1]] as const){const [x,y]=pt(c+a,r+b);g.strokeStyle='#3a2410';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-74);g.stroke();}
  const A=up(pt(c-0.1,r-0.1),74),B=up(pt(c+2.1,r-0.1),74),C=up(pt(c+2.1,r+1.1),64),D=up(pt(c-0.1,r+1.1),64);poly(g,[A,B,C,D],cloth,'#1a0c08');
  for(let i=1;i<6;i++){const t=i/6,p0=[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t],p1=[D[0]+(C[0]-D[0])*t,D[1]+(C[1]-D[1])*t];g.strokeStyle='rgba(255,240,210,.35)';g.lineWidth=3;g.beginPath();g.moveTo(p0[0]!,p0[1]!);g.lineTo(p1[0]!,p1[1]!);g.stroke();}
});}
function well(c:number,r:number):Prop{return P(c,r,1,1,g=>{prism(g,c,r,1,1,30,'#8e8b82');poly(g,diamond(c+0.15,r+0.15,0.7,0.7).map(p=>up(p,30)),'#1c2a30');const [x,y]=pt(c+0.5,r+0.5);g.strokeStyle='#4a3020';g.lineWidth=3;g.beginPath();g.moveTo(x-30,y-30);g.lineTo(x-30,y-86);g.lineTo(x+30,y-86);g.lineTo(x+30,y-30);g.stroke();});}
function mast(c:number,r:number):Prop{return P(c,r,0.5,0.5,g=>{
  const [x,y]=pt(c+0.25,r+0.25);g.strokeStyle='#4a2c14';g.lineWidth=8;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-330);g.stroke();
  poly(g,[[x-90,y-300],[x+90,y-290],[x+80,y-120],[x-80,y-130]],'#e6dcc0','#5a4a30');g.strokeStyle='rgba(120,90,50,.5)';g.lineWidth=2;for(let i=1;i<5;i++){g.beginPath();g.moveTo(x-88+i*0.5,y-300+i*36);g.lineTo(x+88-i*2,y-290+i*36);g.stroke();}
  g.strokeStyle='rgba(40,30,20,.6)';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y-330);g.lineTo(x-260,y+40);g.moveTo(x,y-330);g.lineTo(x+260,y+20);g.stroke();
});}
function cushion(c:number,r:number,col='#7a2a1c'):Prop{return P(c,r,0.6,0.6,g=>{prism(g,c,r,0.6,0.6,7,col);const [x,y]=up(pt(c+0.3,r+0.3),7);g.fillStyle='rgba(230,190,90,.7)';g.fillRect(x-2,y-1,4,2);},false);}
function vase(c:number,r:number,col='#2f5a6a'):Prop{return P(c,r,0.4,0.4,g=>{const [x,y]=pt(c+0.2,r+0.2);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x,y,12,5,0,0,7);g.fill();
  g.fillStyle=col;g.strokeStyle='#14100c';g.lineWidth=1.5;g.beginPath();g.moveTo(x-5,y-36);g.quadraticCurveTo(x-16,y-22,x-8,y-2);g.lineTo(x+8,y-2);g.quadraticCurveTo(x+16,y-22,x+5,y-36);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x-6,y-26,2,12);g.strokeStyle='rgba(230,210,150,.7)';g.beginPath();g.moveTo(x-11,y-18);g.lineTo(x+11,y-18);g.stroke();});}
function chest(c:number,r:number,col='#6a2a18'):Prop{return P(c,r,1,0.6,g=>{
  const h=32;prism(g,c,r,1,0.6,h,col);
  const D=pt(c,r+0.6),C=pt(c+1,r+0.6),B=pt(c+1,r);
  g.strokeStyle='rgba(20,8,4,.6)';g.lineWidth=1.5;g.beginPath();g.moveTo(...up(D,h-9));g.lineTo(...up(C,h-9));g.lineTo(...up(B,h-9));g.stroke();
  // 놋 모서리 판
  for(const [P0,z] of [[D,0],[D,h-9],[C,0],[C,h-9],[B,0],[B,h-9]] as const){const [x,y]=up(P0,z);g.fillStyle='#c9952a';g.fillRect(x-3,y-(z?6:3),6,6);g.fillStyle='rgba(255,240,180,.6)';g.fillRect(x-3,y-(z?6:3),6,1);}
  // 자물쇠 판과 손잡이
  const [x,y]=up(pt(c+0.5,r+0.6),h-12);g.fillStyle='#d8aa3a';g.beginPath();g.ellipse(x,y,6,7,0,0,7);g.fill();g.strokeStyle='#6a4a14';g.lineWidth=1;g.stroke();g.fillStyle='#2a1a08';g.fillRect(x-1,y-2,2,5);
  const [hx,hy]=up(pt(c+1,r+0.3),h-14);g.strokeStyle='#c9952a';g.lineWidth=2;g.beginPath();g.arc(hx+2,hy,4,-1.2,1.6);g.stroke();
  const sh=up(pt(c+0.1,r+0.6),h-3),sh2=up(pt(c+0.9,r+0.6),h-3);g.strokeStyle='rgba(255,220,180,.25)';g.lineWidth=1;g.beginPath();g.moveTo(...sh);g.lineTo(...sh2);g.stroke();
});}
function censer(c:number,r:number,R:()=>number):Prop{return P(c,r,0.5,0.5,g=>{prism(g,c+0.1,r+0.1,0.3,0.3,22,'#6a5a3a');prism(g,c,r,0.5,0.5,14,'#9a7a3a',22);const [x,y]=up(pt(c+0.25,r+0.25),38);
  g.strokeStyle='rgba(220,220,230,.35)';g.lineWidth=3;g.beginPath();g.moveTo(x,y);for(let i=1;i<6;i++)g.lineTo(x+Math.sin(i*1.4+R())*8,y-i*14);g.stroke();});}
function plant(c:number,r:number,R:()=>number):Prop{return P(c,r,0.5,0.5,g=>{prism(g,c+0.05,r+0.05,0.4,0.4,18,'#6a4a3a');const [x,y]=up(pt(c+0.25,r+0.25),18);for(let i=0;i<9;i++){g.strokeStyle=shade('#3f7a3a',0.7+R()*0.5);g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+(R()-0.5)*30,y-20,x+(R()-0.5)*40,y-30-R()*20);g.stroke();}});}
function armorStand(c:number,r:number):Prop{return P(c,r,0.5,0.5,g=>{
  const [x,y]=pt(c+0.25,r+0.25);prism(g,c+0.08,r+0.08,0.34,0.34,6,'#3a2410');
  g.strokeStyle='#3a2410';g.lineWidth=4;g.beginPath();g.moveTo(x,y-6);g.lineTo(x,y-70);g.moveTo(x-20,y-70);g.lineTo(x+20,y-70);g.stroke();
  // 어깨받이
  for(const s of [-1,1]){g.fillStyle='#4a4e58';g.strokeStyle='#141418';g.lineWidth=1;g.beginPath();g.moveTo(x+s*8,y-72);g.quadraticCurveTo(x+s*24,y-74,x+s*22,y-56);g.lineTo(x+s*12,y-60);g.closePath();g.fill();g.stroke();
    for(let k=0;k<3;k++){g.strokeStyle='rgba(200,170,90,.7)';g.beginPath();g.moveTo(x+s*10,y-68+k*4);g.lineTo(x+s*21,y-66+k*4);g.stroke();}}
  // 비늘 갑옷 몸통
  poly(g,[[x-14,y-74],[x+14,y-74],[x+12,y-34],[x-12,y-34]],'#3e4450','#141418');
  for(let row=0;row<6;row++)for(let k=0;k<5;k++){const sx=x-11+k*5.5+(row%2)*2.5,sy=y-70+row*6;g.fillStyle=(row+k)%2?'#5a606c':'#4a505c';g.beginPath();g.arc(sx,sy,2.8,0,Math.PI);g.fill();}
  g.fillStyle='#8a1f1a';g.fillRect(x-14,y-46,28,4);stud(g,x,y-44,2.2,'#d8aa3a');
  // 투구와 붉은 술
  g.fillStyle='#3a3e48';g.beginPath();g.arc(x,y-84,10,Math.PI,0);g.fill();g.fillRect(x-11,y-85,22,4);g.fillStyle='#d8aa3a';g.fillRect(x-1,y-96,2,6);g.fillStyle='#b8261a';g.beginPath();g.moveTo(x,y-96);g.quadraticCurveTo(x-6,y-104,x-2,y-110);g.quadraticCurveTo(x+4,y-104,x,y-96);g.fill();
});}
function barrel(c:number,r:number):Prop{return P(c,r,0.55,0.55,g=>{
  const [x,y]=pt(c+0.27,r+0.27),h=40,w=15;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x,y,18,7,0,0,7);g.fill();
  const bg=g.createLinearGradient(x-w,0,x+w,0);bg.addColorStop(0,'#a07040');bg.addColorStop(0.4,'#7a5230');bg.addColorStop(1,'#3a2414');
  g.fillStyle=bg;g.strokeStyle='#1e120a';g.lineWidth=1.5;g.beginPath();g.moveTo(x-w+2,y-2);g.quadraticCurveTo(x-w-4,y-h/2,x-w+2,y-h);g.lineTo(x+w-2,y-h);g.quadraticCurveTo(x+w+4,y-h/2,x+w-2,y-2);g.closePath();g.fill();g.stroke();
  g.strokeStyle='rgba(30,18,8,.45)';g.lineWidth=1;for(const k of [-8,-3,3,8]){g.beginPath();g.moveTo(x+k*0.85,y-2);g.quadraticCurveTo(x+k*1.15,y-h/2,x+k*0.85,y-h);g.stroke();}
  for(const z of [6,h/2-4,h/2+4,h-6]){const bw=w+(z>8&&z<h-8?2.5:0.5);g.strokeStyle='#2e2c2a';g.lineWidth=2.4;g.beginPath();g.ellipse(x,y-z,bw,3,0,0,Math.PI);g.stroke();g.strokeStyle='rgba(200,200,190,.35)';g.lineWidth=1;g.beginPath();g.ellipse(x,y-z-1,bw-1,3,0,Math.PI*0.15,Math.PI*0.45);g.stroke();}
  g.fillStyle='#5a3a20';g.beginPath();g.ellipse(x,y-h,w-2,5,0,0,7);g.fill();g.strokeStyle='#2a1a0c';g.stroke();g.strokeStyle='rgba(40,24,10,.6)';g.beginPath();g.moveTo(x-8,y-h);g.lineTo(x+8,y-h);g.stroke();
});}
function hay(c:number,r:number,R:()=>number):Prop{return P(c,r,0.9,0.7,g=>{const [x,y]=pt(c+0.45,r+0.35);g.fillStyle='#c9a24a';g.strokeStyle='#6a5020';g.lineWidth=1.2;g.beginPath();g.ellipse(x,y-14,26,16,0,0,7);g.fill();g.stroke();
  for(let i=0;i<14;i++){g.strokeStyle='rgba(120,90,30,.6)';g.beginPath();const a=R()*6.28;g.moveTo(x+Math.cos(a)*10,y-14+Math.sin(a)*6);g.lineTo(x+Math.cos(a)*24,y-14+Math.sin(a)*14);g.stroke();}});}
function cart(c:number,r:number):Prop{return P(c,r,2,1,g=>{
  // 끌채
  const [a0]=[pt(c+2,r+0.5)];g.strokeStyle='#5a3a1e';g.lineWidth=4;g.beginPath();g.moveTo(a0[0]-4,a0[1]-22);g.lineTo(a0[0]+62,a0[1]+6);g.moveTo(a0[0]-10,a0[1]-18);g.lineTo(a0[0]+52,a0[1]+12);g.stroke();
  prism(g,c,r+0.1,2,0.8,12,'#7a5230',20);
  for(let k=1;k<6;k++){const A=up(pt(c+k/3,r+0.9),20),B=up(pt(c+k/3,r+0.9),32);g.strokeStyle='#4a3018';g.lineWidth=2;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();}
  // 실은 짐: 자루와 덮개
  prism(g,c+0.2,r+0.25,1.5,0.5,16,'#c9b07a',32);g.strokeStyle='#5a4424';g.lineWidth=2;for(const t of [0.6,1.2]){const A=up(pt(c+t,r+0.75),32),B=up(pt(c+t,r+0.75),48);g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();}
  // 바퀴: 테·바큇살·굴대
  for(const cc of [c+0.4,c+1.6]){const [x,y]=pt(cc,r+0.95);g.strokeStyle='#2a1a0c';g.lineWidth=4;g.beginPath();g.ellipse(x,y-16,12,17,0,0,7);g.stroke();
    g.lineWidth=1.5;for(let k=0;k<8;k++){const a=k/8*Math.PI*2;g.beginPath();g.moveTo(x,y-16);g.lineTo(x+Math.cos(a)*11,y-16+Math.sin(a)*16);g.stroke();}
    g.fillStyle='#5a3a1e';g.beginPath();g.ellipse(x,y-16,4,5,0,0,7);g.fill();g.strokeStyle='#8a6a3a';g.lineWidth=1;g.beginPath();g.ellipse(x,y-16,12,17,0,Math.PI*1.1,Math.PI*1.5);g.stroke();}
});}

function reeds(c:number,r:number,R:()=>number):Prop{return P(c,r,0.6,0.6,g=>{const [x,y]=pt(c+0.3,r+0.3);for(let i=0;i<12;i++){const ox=(R()-0.5)*30;g.strokeStyle=shade('#6a8a3a',0.7+R()*0.5);g.lineWidth=1.6;g.beginPath();g.moveTo(x+ox,y);g.quadraticCurveTo(x+ox+(R()-0.5)*8,y-20,x+ox+(R()-0.5)*14,y-34-R()*16);g.stroke();
  if(R()<0.4){g.fillStyle='#7a5a2a';g.fillRect(x+ox-1,y-40-R()*10,3,8);}}},false);}
function pine(c:number,r:number,R:()=>number,big=1):Prop{const a=art(c,r,0.6,0.6,1,270*big,R()<0.5,{canopy:true});if(a)return a;return {...P(c,r,0.6,0.6,g=>{const [x,y]=pt(c+0.3,r+0.3);g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(x,y,34*big,14*big,0,0,7);g.fill();g.fillStyle='#4a3020';g.fillRect(x-5,y-40*big,10,40*big);
  for(let i=0;i<4;i++){const w=(46-i*9)*big,yy=y-(34+i*30)*big;g.fillStyle=shade('#2f5a32',0.75+i*0.1+R()*0.1);g.beginPath();g.moveTo(x-w,yy);g.lineTo(x,yy-44*big);g.lineTo(x+w,yy);g.closePath();g.fill();g.strokeStyle='rgba(10,30,10,.4)';g.stroke();}}),canopy:true};}
function bamboo(c:number,r:number,R:()=>number):Prop{return {...P(c,r,0.8,0.8,g=>{const [x,y]=pt(c+0.4,r+0.4);for(let i=0;i<9;i++){const ox=(R()-0.5)*40,h=110+R()*80;g.strokeStyle=shade('#6a9a3a',0.7+R()*0.4);g.lineWidth=4;g.beginPath();g.moveTo(x+ox,y);g.lineTo(x+ox+(R()-0.5)*10,y-h);g.stroke();
  for(let k=0;k<h;k+=24){g.strokeStyle='rgba(40,60,20,.5)';g.lineWidth=1;g.beginPath();g.moveTo(x+ox-2,y-k);g.lineTo(x+ox+2,y-k);g.stroke();}
  for(let k=0;k<4;k++){g.fillStyle=shade('#5a8a3a',0.7+R()*0.5);g.beginPath();g.ellipse(x+ox+(R()-0.5)*30,y-h+R()*40,12,4,R()*3,0,7);g.fill();}}}),canopy:true};}
function firewood(c:number,r:number):Prop{return P(c,r,1,0.6,g=>{for(let i=0;i<9;i++){const [x,y]=up(pt(c+0.2+(i%3)*0.3,r+0.3),6+Math.floor(i/3)*10);g.fillStyle='#6a4a2a';g.strokeStyle='#2a1a0c';g.beginPath();g.ellipse(x,y,7,5,0,0,7);g.fill();g.stroke();g.fillStyle='#b8925a';g.beginPath();g.ellipse(x,y,3,2,0,0,7);g.fill();}});}
function fence(c:number,r:number,len:number,alongC=true):Prop{return P(c,r,alongC?len:0.1,alongC?0.1:len,g=>{for(let i=0;i<=len*2;i++){const [x,y]=alongC?pt(c+i/2,r):pt(c,r+i/2);g.fillStyle='#6a4a2a';g.fillRect(x-2,y-30,4,30);}
  for(const z of [10,24]){const a=up(alongC?pt(c,r):pt(c,r),z),b=up(alongC?pt(c+len,r):pt(c,r+len),z);g.strokeStyle='#5a3a1e';g.lineWidth=3;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();}});}
function pond(c:number,r:number,w:number,d:number,R:()=>number):Prop{return P(c,r,w,d,g=>{const [x,y]=pt(c+w/2,r+d/2);g.fillStyle='#7d7a72';g.beginPath();g.ellipse(x,y,w*30+8,d*16+5,0,0,7);g.fill();g.fillStyle='#2f5a6a';g.beginPath();g.ellipse(x,y,w*30,d*16,0,0,7);g.fill();
  g.fillStyle='rgba(200,230,240,.25)';g.beginPath();g.ellipse(x-10,y-4,w*14,d*5,0,0,7);g.fill();for(let i=0;i<5;i++){g.fillStyle='#4a7a3a';g.beginPath();g.ellipse(x+(R()-0.5)*w*40,y+(R()-0.5)*d*18,6,3,0,0,7);g.fill();}
  for(let i=0;i<3;i++){g.fillStyle=['#e8742a','#f0f0e8','#e8742a'][i]!;g.beginPath();g.ellipse(x+(R()-0.5)*w*30,y+(R()-0.5)*d*12,4,1.5,R(),0,7);g.fill();}});}
function mat(c:number,r:number,w:number,d:number,col='#7a8a4a'):Prop{return P(c,r,w,d,g=>{poly(g,diamond(c,r,w,d),shade(col,0.92),'rgba(40,40,20,.5)',1);poly(g,diamond(c+0.08,r+0.08,w-0.16,d-0.16),'rgba(0,0,0,0)','rgba(230,220,160,.35)',1);
  g.strokeStyle='rgba(60,70,30,.25)';for(let i=1;i<w*6;i++){g.beginPath();g.moveTo(...pt(c+i/6,r));g.lineTo(...pt(c+i/6,r+d));g.stroke();}},false);}
function lowTable(c:number,r:number,w:number,d:number,R:()=>number):Prop{return P(c,r,w,d,g=>{
  for(const [a,b] of [[0.1,0.1],[w-0.2,0.1],[0.1,d-0.2],[w-0.2,d-0.2]] as const)prism(g,c+a,r+b,0.1,0.1,16,'#2a1810');
  prism(g,c,r,w,d,6,'#7a4a28',16);
  for(let i=0;i<Math.max(1,Math.floor(w*d));i++){const [x,y]=up(pt(c+0.3+R()*(w-0.6),r+0.3+R()*(d-0.6)),22);g.fillStyle=R()<0.5?'#efe2bf':'#c9a86a';g.fillRect(x-6,y-3,12,4);}
});}
function runner(c:number,r:number,w:number,d:number):Prop{return P(c,r,w,d,g=>{poly(g,diamond(c,r,w,d),'#8a8270','rgba(40,36,30,.6)',1);poly(g,diamond(c+0.12,r+0.12,w-0.24,d-0.24),'#b0a888');
  for(let t=1;t<d;t+=2.2){const [x,y]=pt(c+w/2,r+t);g.strokeStyle='rgba(120,100,60,.55)';g.lineWidth=2;g.beginPath();g.ellipse(x,y,w*15,w*7.5,0,0,7);g.stroke();g.beginPath();g.ellipse(x,y,w*8,w*4,0,0,7);g.stroke();}},false);}
function thatchedHouse(g:Ctx,c:number,r:number,w:number,d:number,R:()=>number){
  prism(g,c-0.1,r-0.1,w+0.2,d+0.2,22,'#8a8274');
  for(let i=0;i<w*4;i++){const [x,y]=up(pt(c-0.1+i/4,r+d+0.1),6+(i%2)*8);g.fillStyle='rgba(60,56,50,.45)';g.beginPath();g.ellipse(x,y,6,3,0,0,7);g.fill();}
  prism(g,c,r,w,d,74,'#d8cdb4',22);
  // 나무 기둥·창·문
  for(let t=0;t<=w;t+=1){const a=up(pt(c+t,r+d),22);g.fillStyle='#4a3020';g.fillRect(a[0]-3,a[1]-74,6,74);}
  for(let t=0.25;t<w-0.4;t+=1.1){const a=up(pt(c+t,r+d),46),b=up(pt(c+t+0.5,r+d),46);poly(g,[a,b,up(b,22),up(a,22)],'#5a3a20','#2a1a0c',1);g.strokeStyle='#d8c08a';g.lineWidth=1;g.beginPath();g.moveTo((a[0]+b[0])/2,(a[1]+b[1])/2);g.lineTo((a[0]+b[0])/2,(a[1]+b[1])/2-22);g.stroke();}
  // 초가지붕: 둥글게 부푼 짚, 결을 따라 짧은 붓질
  const h=96,o=0.55,A=up(pt(c-o,r-o),h),B=up(pt(c+w+o,r-o),h),C=up(pt(c+w+o,r+d+o),h-6),D=up(pt(c-o,r+d+o),h-6),RA=up(pt(c+w*0.2,r+d/2),h+70),RB=up(pt(c+w*0.8,r+d/2),h+70);
  poly(g,[D,C,RB,RA],'#a8884a','rgba(60,40,20,.6)',1);poly(g,[C,B,RB],'#8a6e3a','rgba(60,40,20,.6)',1);poly(g,[A,D,RA],'#9a7c42','rgba(60,40,20,.6)',1);
  for(let i=0;i<260;i++){const t=R(),u=R(),px=D[0]+(C[0]-D[0])*t+(RA[0]+(RB[0]-RA[0])*t-(D[0]+(C[0]-D[0])*t))*u,py=D[1]+(C[1]-D[1])*t+(RA[1]+(RB[1]-RA[1])*t-(D[1]+(C[1]-D[1])*t))*u;
    g.strokeStyle=R()<0.5?'rgba(220,190,120,.45)':'rgba(90,60,30,.35)';g.lineWidth=1.2;g.beginPath();g.moveTo(px,py);g.lineTo(px+2,py+8);g.stroke();}
  g.strokeStyle='rgba(70,50,25,.7)';g.lineWidth=4;g.beginPath();g.moveTo(...RA);g.lineTo(...RB);g.stroke();
}
function stoneBorder(c:number,r:number,len:number,R:()=>number,alongC=true):Prop{return P(c,r,alongC?len:0.4,alongC?0.4:len,g=>{for(let i=0;i<len*3;i++){const [x,y]=alongC?pt(c+i/3,r+0.2):pt(c+0.2,r+i/3);g.fillStyle=shade('#9a958a',0.8+R()*0.3);g.strokeStyle='rgba(30,28,24,.5)';g.lineWidth=1;g.beginPath();g.ellipse(x,y-4,10+R()*5,6+R()*3,R(),0,7);g.fill();g.stroke();
  if(R()<0.3){g.fillStyle=['#b89ad8','#e8e0f0','#f2d24a'][Math.floor(R()*3)]!;g.beginPath();g.arc(x+(R()-0.5)*14,y-12,2,0,7);g.fill();}}},false);}
function pots(c:number,r:number):Prop{return P(c,r,0.8,0.6,g=>{for(const [dc,dr,s] of [[0.2,0.2,1],[0.55,0.35,0.75]] as const){const [x,y]=pt(c+dc,r+dr);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x,y,14*s,6*s,0,0,7);g.fill();g.fillStyle='#5a4a3a';g.strokeStyle='#1a120c';g.lineWidth=1;g.beginPath();g.ellipse(x,y-14*s,13*s,15*s,0,0,7);g.fill();g.stroke();g.fillStyle='#3a2e24';g.beginPath();g.ellipse(x,y-27*s,8*s,3*s,0,0,7);g.fill();}});}
function grandThrone(c:number,r:number):Prop{return {keep:true,...P(c,r,3.2,3.2,g=>{
  // 세 층의 단, 용상, 뒤 병풍과 일산
  prism(g,c,r,3.2,3.2,10,'#5a1a12');prism(g,c+0.3,r+0.3,2.6,2.6,10,'#7a2418',10);prism(g,c+0.6,r+0.6,2,2,10,'#8a2c1e',20);
  for(const k of [0,1,2]){const z=10+k*10,A=up(pt(c+0.3*k,r+3.2-0.3*k),z),B=up(pt(c+3.2-0.3*k,r+3.2-0.3*k),z);g.strokeStyle='#d8a838';g.lineWidth=1.5;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();}
  prism(g,c+0.7,r+0.6,1.8,0.25,96,'#b8862a',30);
  {const A=up(pt(c+0.8,r+0.85),40),B=up(pt(c+2.4,r+0.85),40);poly(g,[A,B,up(B,80),up(A,80)],'#8a1a12','#3a0806',1);const [x,y]=up(pt(c+1.6,r+0.85),82);g.strokeStyle='#e8c050';g.lineWidth=2;g.beginPath();g.arc(x,y,12,0,7);g.stroke();g.beginPath();g.moveTo(x-8,y);g.quadraticCurveTo(x,y-10,x+8,y);g.quadraticCurveTo(x,y+10,x-8,y);g.stroke();}
  prism(g,c+0.8,r+1,1.6,1,14,'#c89a32',30);prism(g,c+0.7,r+0.9,0.2,1.2,30,'#b8862a',30);prism(g,c+2.3,r+0.9,0.2,1.2,30,'#b8862a',30);
  prism(g,c+1.1,r+1.2,1,0.6,6,'#9a2a1a',44);
  const [x,y]=up(pt(c+1.6,r+1.6),150);g.fillStyle='#a01e14';g.beginPath();g.ellipse(x,y,70,20,0,0,7);g.fill();g.fillStyle='#d8a838';g.fillRect(x-70,y,140,4);for(let k=-60;k<=60;k+=12)g.fillRect(x+k,y+4,2,10);
  glow(g,x,y+60,170,'rgba(255,210,120,A)',0.22);
})};}
function ceremonialFan(c:number,r:number):Prop{return P(c,r,0.3,0.3,g=>{const [x,y]=pt(c+0.15,r+0.15);g.strokeStyle='#4a2c14';g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-150);g.stroke();
  g.fillStyle='#b8261a';g.beginPath();g.ellipse(x,y-170,24,28,0,0,7);g.fill();g.strokeStyle='#e8c050';g.lineWidth=2;g.stroke();g.fillStyle='#e8c050';g.beginPath();g.arc(x,y-170,7,0,7);g.fill();});}
function bed(c:number,r:number,R:()=>number):Prop{return P(c,r,2.2,1.4,g=>{
  prism(g,c,r,2.2,1.4,22,'#5a2c18');prism(g,c+0.1,r+0.1,2,1.2,8,'#e8dcc0',22);prism(g,c+0.2,r+0.5,1.8,0.8,6,'#7a3a4a',30);prism(g,c+0.15,r+0.15,0.5,0.3,6,'#efe6d0',30);
  for(const [a,b] of [[0,0],[2.1,0],[0,1.3],[2.1,1.3]] as const)prism(g,c+a,r+b,0.1,0.1,110,'#3a1a10');
  {const A=up(pt(c,r),110),B=up(pt(c+2.2,r),110),C=up(pt(c+2.2,r+1.4),110),D=up(pt(c,r+1.4),110);poly(g,[A,B,C,D],'#5a2c18','#1a0a06',1);
   g.fillStyle='rgba(210,180,140,.55)';g.beginPath();g.moveTo(...D);g.lineTo(...C);g.lineTo(C[0]-6,C[1]+70);g.lineTo(D[0]+30,D[1]+64);g.closePath();g.fill();
   g.fillStyle='rgba(200,170,130,.5)';g.beginPath();g.moveTo(...C);g.lineTo(...B);g.lineTo(B[0]-4,B[1]+76);g.lineTo(C[0]+4,C[1]+70);g.closePath();g.fill();}
  void R;});}
function wardrobe(c:number,r:number):Prop{return P(c,r,1.2,0.5,g=>{prism(g,c,r,1.2,0.5,120,'#5a2c18');const a=up(pt(c+0.08,r+0.5),10),b=up(pt(c+1.12,r+0.5),10),m=up(pt(c+0.6,r+0.5),10);
  poly(g,[a,m,up(m,100),up(a,100)],'#6a3420','#2a1008',1);poly(g,[m,b,up(b,100),up(m,100)],'#6a3420','#2a1008',1);g.fillStyle='#d8a838';const h=up(m,55);g.fillRect(h[0]-5,h[1]-3,3,6);g.fillRect(h[0]+2,h[1]-3,3,6);});}
function teaSet(c:number,r:number):Prop{return P(c,r,1,0.8,g=>{prism(g,c,r,1,0.8,14,'#6a3a20');for(const [t,u] of [[0.3,0.3],[0.6,0.4],[0.45,0.6]] as const){const [x,y]=up(pt(c+t,r+u),15);g.fillStyle='#e8e4d8';g.beginPath();g.ellipse(x,y,3.5,2,0,0,7);g.fill();g.fillStyle='#5a6a3a';g.fillRect(x-1,y-1,2,1);}
  const [x,y]=up(pt(c+0.75,r+0.25),15);g.fillStyle='#3a5a6a';g.beginPath();g.ellipse(x,y-5,6,6,0,0,7);g.fill();g.fillRect(x+5,y-8,4,2);},false);}
function barricade(c:number,r:number,len:number,alongC=true):Prop{return P(c,r,alongC?len:0.4,alongC?0.4:len,g=>{for(let i=0;i<len*1.5;i++){const [x,y]=alongC?pt(c+i/1.5+0.3,r+0.2):pt(c+0.2,r+i/1.5+0.3);
  g.strokeStyle='#5a3a1a';g.lineWidth=4;g.beginPath();g.moveTo(x-14,y);g.lineTo(x+10,y-30);g.moveTo(x+14,y);g.lineTo(x-10,y-30);g.stroke();g.fillStyle='#d8c8a0';g.fillRect(x+9,y-33,3,4);g.fillRect(x-12,y-33,3,4);}
  const a=alongC?pt(c,r+0.2):pt(c+0.2,r),b=alongC?pt(c+len,r+0.2):pt(c+0.2,r+len);g.strokeStyle='#4a2c14';g.lineWidth=4;g.beginPath();g.moveTo(a[0],a[1]-14);g.lineTo(b[0],b[1]-14);g.stroke();});}
function arrows(c:number,r:number,R:()=>number):Prop{return P(c,r,1,1,g=>{for(let i=0;i<9;i++){const [x,y]=pt(c+R(),r+R()),lean=(R()-0.5)*10;g.strokeStyle='#5a3a1a';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+lean,y-16);g.stroke();g.fillStyle='#e8e4d8';g.fillRect(x+lean-2,y-18,4,3);}},false);}
function debris(c:number,r:number,R:()=>number):Prop{return P(c,r,1.4,1,g=>{const [x,y]=pt(c+0.7,r+0.5);g.fillStyle='rgba(30,26,22,.35)';g.beginPath();g.ellipse(x,y,40,14,0,0,7);g.fill();
  for(let i=0;i<6;i++){g.save();g.translate(x+(R()-0.5)*50,y+(R()-0.5)*14);g.rotate((R()-0.5)*2);g.fillStyle=R()<0.5?'#5a3a1a':'#3a2a1a';g.fillRect(-14,-3,28,5);g.restore();}
  const [sx,sy]=[x+(R()-0.5)*20,y-10];g.strokeStyle='#8a8e96';g.lineWidth=2;g.beginPath();g.moveTo(sx-12,sy+4);g.lineTo(sx+12,sy-4);g.stroke();g.fillStyle='#a02a1a';g.fillRect(sx-14,sy+3,4,3);});}
function smoke(c:number,r:number,R:()=>number):Prop{return P(c,r,0.5,0.5,g=>{const [x,y]=pt(c,r);for(let i=0;i<8;i++){g.fillStyle=`rgba(${60+i*8},${58+i*8},${56+i*8},${0.32-i*0.03})`;g.beginPath();g.ellipse(x+i*6+(R()-0.5)*8,y-20-i*22,16+i*5,10+i*3,0,0,7);g.fill();}flame(g,x,y-4,10,R);},false);}
function trunkLog(c:number,r:number):Prop{return P(c,r,1.6,0.5,g=>{const a=pt(c,r+0.25),b=pt(c+1.6,r+0.25);g.strokeStyle='#4a3020';g.lineWidth=12;g.lineCap='round';g.beginPath();g.moveTo(a[0],a[1]-6);g.lineTo(b[0],b[1]-6);g.stroke();g.lineCap='butt';g.fillStyle='#b8925a';g.beginPath();g.ellipse(b[0],b[1]-6,6,6,0,0,7);g.fill();g.fillStyle='rgba(70,110,40,.8)';g.fillRect(a[0]+10,a[1]-14,14,3);},false);}
function fern(c:number,r:number,R:()=>number):Prop{return P(c,r,0.5,0.5,g=>{const [x,y]=pt(c+0.25,r+0.25);for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*0.35;g.strokeStyle=shade('#3f7a32',0.7+R()*0.5);g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*14,y+Math.sin(a)*20,x+Math.cos(a)*24,y+Math.sin(a)*14);g.stroke();}},false);}
/** 가장자리를 따라 선 담·목책·성벽(r=0 또는 c=0 줄). */
// ─────────────────────────────────────────────── 조형물(석사자·청동 정·전고·비석·태호석·횃대·분재·정자)
/** 돌사자: 받침 위에 앉은 사자(갈기는 말린 덩어리). flip이면 오른쪽을 본다. */
function stoneLion(c:number,r:number,flip=false,col='#a29d90'):Prop{return P(c,r,0.8,0.8,g=>{
  prism(g,c,r,0.8,0.8,30,col);prism(g,c+0.05,r+0.05,0.7,0.7,6,col,30);
  const [x0,y0]=up(pt(c+0.4,r+0.4),36);g.save();g.translate(x0,y0);if(flip)g.scale(-1,1);g.scale(1.35,1.35);
  const dk=shade(col,0.62),md=col,lt=shade(col,1.18);g.lineWidth=1.5;g.strokeStyle='rgba(30,26,20,.75)';
  const blob=(x:number,y:number,rx:number,ry:number,f:string)=>{g.fillStyle=f;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill();g.stroke();};
  blob(6,-14,16,14,dk);blob(-4,-20,12,18,md);// 엉덩이·몸
  g.fillStyle=md;g.fillRect(-12,-16,6,16);g.fillRect(-4,-14,6,14);g.strokeRect(-12,-16,6,16);g.strokeRect(-4,-14,6,14);// 앞다리
  blob(-12,-42,13,12,md);// 머리
  for(let i=0;i<9;i++){const a=-2.6+i*0.55;blob(-8+Math.cos(a)*13,-42+Math.sin(a)*13,4.6,4.6,i%2?dk:md);}// 말린 갈기
  blob(-21,-39,5,4,lt);g.fillStyle='#2a2218';g.fillRect(-18,-46,3,2);g.fillRect(-23,-35,6,2);// 코·눈·입
  blob(3,-4,6,4,lt);g.fillStyle=lt;g.fillRect(-11,-44,5,2);// 공·볕
  g.restore();});}
/** 청동 정(세 발 솥): 푸른 녹, 두 귀, 향 연기. */
function ding(c:number,r:number,R:()=>number,s=1):Prop{return P(c,r,0.9*s,0.9*s,g=>{
  const [x,y]=pt(c+0.45*s,r+0.45*s);g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,30*s,10*s,0,0,7);g.fill();
  g.strokeStyle='#3a2c14';g.lineWidth=5*s;for(const dx of [-18,0,18]){g.beginPath();g.moveTo(x+dx*s,y-14*s);g.lineTo(x+dx*1.15*s,y+(dx?-2:4)*s);g.stroke();}
  const body=g.createLinearGradient(x-30*s,0,x+30*s,0);body.addColorStop(0,'#8a7238');body.addColorStop(0.45,'#5e6a46');body.addColorStop(1,'#2e3a2a');
  g.fillStyle=body;g.strokeStyle='#1e1a0e';g.lineWidth=1.5;g.beginPath();g.moveTo(x-30*s,y-44*s);g.quadraticCurveTo(x-32*s,y-8*s,x,y-8*s);g.quadraticCurveTo(x+32*s,y-8*s,x+30*s,y-44*s);g.closePath();g.fill();g.stroke();
  g.strokeStyle='rgba(210,180,90,.6)';g.lineWidth=2;g.beginPath();g.moveTo(x-27*s,y-32*s);g.quadraticCurveTo(x,y-26*s,x+27*s,y-32*s);g.stroke();
  for(let i=-2;i<=2;i++){g.fillStyle='rgba(220,190,100,.55)';g.fillRect(x+i*9*s-2,y-30*s,4,3);}// 띠 무늬
  g.fillStyle='#4a5a3e';g.beginPath();g.ellipse(x,y-44*s,31*s,9*s,0,0,7);g.fill();g.stroke();g.fillStyle='#1a1a12';g.beginPath();g.ellipse(x,y-44*s,25*s,6*s,0,0,7);g.fill();
  g.strokeStyle='#6a5a2e';g.lineWidth=4*s;for(const dx of [-20,20]){g.beginPath();g.moveTo(x+dx*s-5*s,y-46*s);g.lineTo(x+dx*s-5*s,y-60*s);g.lineTo(x+dx*s+5*s,y-60*s);g.lineTo(x+dx*s+5*s,y-46*s);g.stroke();}
  for(let i=0;i<6;i++){g.fillStyle=`rgba(225,225,215,${0.22-i*0.03})`;g.beginPath();g.ellipse(x+Math.sin(i*1.3+R())*8,y-58*s-i*16,6+i*3,4+i*1.5,0,0,7);g.fill();}
  glow(g,x,y-46*s,36,'rgba(255,170,90,A)',0.25);});}
/** 전고(싸움북): 나무 받침 위의 붉은 북, 금 못. */
function warDrum(c:number,r:number):Prop{return P(c,r,1,0.8,g=>{
  const [x,y]=pt(c+0.5,r+0.4);g.strokeStyle='#3a2410';g.lineWidth=5;g.beginPath();g.moveTo(x-30,y);g.lineTo(x-10,y-46);g.moveTo(x+30,y);g.lineTo(x+10,y-46);g.moveTo(x-30,y-4);g.lineTo(x+30,y-4);g.stroke();
  g.fillStyle='#8a1f16';g.strokeStyle='#2a0a06';g.lineWidth=1.5;g.beginPath();g.ellipse(x,y-56,30,26,0,0,7);g.fill();g.stroke();
  g.fillStyle='#b8302a';g.beginPath();g.ellipse(x-8,y-56,20,24,0,0,7);g.fill();
  g.fillStyle='#e0cfa4';g.beginPath();g.ellipse(x-14,y-56,13,22,0,0,7);g.fill();g.stroke();g.fillStyle='rgba(120,40,20,.35)';g.beginPath();g.ellipse(x-14,y-56,6,10,0,0,7);g.fill();
  g.fillStyle='#e0b03a';for(let i=0;i<9;i++){const a=i/9*Math.PI*2;g.fillRect(x-14+Math.cos(a)*14-1,y-56+Math.sin(a)*23-1,3,3);}
  g.strokeStyle='#5a3a1e';g.lineWidth=3;g.beginPath();g.moveTo(x+18,y-30);g.lineTo(x+40,y-78);g.moveTo(x+26,y-28);g.lineTo(x+48,y-70);g.stroke();
});}
/** 비석: 거북 받침 위의 돌판(새긴 글줄), 이무기 머리. */
function stele(c:number,r:number):Prop{return P(c,r,1,1,g=>{
  const [x,y]=pt(c+0.5,r+0.5);g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,40,14,0,0,7);g.fill();
  g.fillStyle='#6e6a60';g.strokeStyle='#26241e';g.lineWidth=1.5;g.beginPath();g.ellipse(x,y-10,36,16,0,0,7);g.fill();g.stroke();
  for(let i=0;i<7;i++){g.strokeStyle='rgba(30,28,22,.45)';g.beginPath();g.ellipse(x-14+(i%3)*14,y-12-(i>2?4:0),6,4,0,0,7);g.stroke();}
  g.fillStyle='#6e6a60';g.beginPath();g.ellipse(x-38,y-6,10,7,0,0,7);g.fill();g.stroke();g.fillStyle='#1a1812';g.fillRect(x-43,y-8,2,2);// 거북 머리
  const sl=g.createLinearGradient(x-18,0,x+18,0);sl.addColorStop(0,'#a8a498');sl.addColorStop(1,'#7a766c');g.fillStyle=sl;g.fillRect(x-17,y-118,34,100);g.strokeRect(x-17,y-118,34,100);
  g.fillStyle='#8e8a7e';g.beginPath();g.moveTo(x-20,y-116);g.quadraticCurveTo(x,y-142,x+20,y-116);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(30,28,22,.55)';for(let col=0;col<4;col++)for(let k=0;k<9;k++)g.fillRect(x-11+col*7,y-106+k*9,4,5);
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x-17,y-118,5,100);});}
/** 태호석: 울퉁불퉁한 덩어리를 아래에서 위로 쌓은 기암. 구멍은 안쪽 그늘과 아래쪽 밝은 테두리로, 겉에는 세로 주름과 이끼. */
function rockery(c:number,r:number,R:()=>number,s=1):Prop{return P(c,r,s,s,g=>{
  const [x,y]=pt(c+s/2,r+s/2),hgt=(96+R()*36)*s;g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x+6*s,y,36*s,12*s,0,0,7);g.fill();
  const lobes:Array<{cx:number;cy:number;rx:number;ry:number;rot:number}>=[];const n=9;
  for(let i=0;i<n;i++){const t=i/(n-1),w=(1-Math.abs(t-0.4)*0.8)*17*s;lobes.push({cx:x+(R()-0.5)*22*s+Math.sin(t*4+R())*8*s,cy:y-12*s-t*(hgt-22*s),rx:w*(0.7+R()*0.5),ry:(13+R()*9)*s,rot:(R()-0.5)*1.1});}
  // 덩어리: 어두운 테두리 → 한 방향(왼쪽)에서 빛을 받는 면
  for(const L of lobes){g.fillStyle='#34322c';g.beginPath();g.ellipse(L.cx,L.cy,L.rx+2,L.ry+2,L.rot,0,7);g.fill();}
  const lin=g.createLinearGradient(x-34*s,0,x+30*s,0);lin.addColorStop(0,'#cfcabc');lin.addColorStop(0.45,'#a29d90');lin.addColorStop(1,'#5c5850');
  g.fillStyle=lin;for(const L of lobes){g.beginPath();g.ellipse(L.cx,L.cy,L.rx,L.ry,L.rot,0,7);g.fill();}
  g.fillStyle='rgba(40,36,30,.18)';for(const L of lobes){g.beginPath();g.ellipse(L.cx+L.rx*0.25,L.cy+L.ry*0.35,L.rx*0.8,L.ry*0.45,L.rot,0,7);g.fill();}
  // 세로 주름
  g.strokeStyle='rgba(50,46,40,.35)';g.lineWidth=1.2;for(let i=0;i<10;i++){const L=lobes[Math.floor(R()*n)]!,sx=L.cx+(R()-0.5)*L.rx*1.4;g.beginPath();g.moveTo(sx,L.cy-L.ry*0.6);g.quadraticCurveTo(sx+(R()-0.5)*6,L.cy,sx+(R()-0.5)*4,L.cy+L.ry*0.6);g.stroke();}
  // 구멍: 짙은 속 + 아래쪽 밝은 테
  for(let i=0;i<5;i++){const L=lobes[1+Math.floor(R()*(n-1))]!,hx=L.cx+(R()-0.5)*L.rx*0.8,hy=L.cy+(R()-0.5)*L.ry*0.6,hr=(3+R()*4)*s,hv=hr*(1.2+R()*0.5);
    const hg=g.createRadialGradient(hx,hy-hv*0.3,0,hx,hy,hv);hg.addColorStop(0,'#1c1a16');hg.addColorStop(1,'#4a463e');g.fillStyle=hg;g.beginPath();g.ellipse(hx,hy,hr,hv,(R()-0.5)*0.6,0,7);g.fill();
    g.strokeStyle='rgba(235,230,215,.55)';g.lineWidth=1.4;g.beginPath();g.ellipse(hx,hy,hr+1,hv+1,0,0.25*Math.PI,0.85*Math.PI);g.stroke();}
  // 밑동 이끼·풀
  for(let i=0;i<6;i++){g.fillStyle=i%2?'rgba(80,118,58,.75)':'rgba(110,148,72,.6)';g.beginPath();g.ellipse(x+(R()-0.5)*40*s,y-3-R()*8*s,(4+R()*4)*s,(2+R()*2)*s,0,0,7);g.fill();}
  void up;});}
/** 횃대: 쇠 바구니에 장작불. */
function torch(c:number,r:number,R:()=>number):Prop{return P(c,r,0.3,0.3,g=>{
  const [x,y]=pt(c+0.15,r+0.15);g.strokeStyle='#2a1a0c';g.lineWidth=4;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-78);g.moveTo(x-10,y);g.lineTo(x,y-20);g.lineTo(x+10,y);g.stroke();
  g.fillStyle='#3a3028';g.beginPath();g.moveTo(x-12,y-86);g.lineTo(x+12,y-86);g.lineTo(x+7,y-76);g.lineTo(x-7,y-76);g.closePath();g.fill();flame(g,x,y-88,13,R);});}
/** 분재: 네모난 화분에 비틀린 줄기와 구름 같은 잎. */
function bonsai(c:number,r:number,R:()=>number):Prop{return P(c,r,0.6,0.6,g=>{
  prism(g,c+0.05,r+0.05,0.5,0.5,22,'#5a3a2a');prism(g,c,r,0.6,0.6,4,'#3a6a6a',22);
  const [x,y]=up(pt(c+0.3,r+0.3),26);g.strokeStyle='#4a3020';g.lineWidth=5;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x-14,y-16,x+16,y-26,x-4,y-44);g.stroke();
  for(const [dx,dy,rx] of [[-16,-30,16],[12,-38,14],[-4,-52,15]] as const){g.fillStyle='#2f5a32';g.beginPath();g.ellipse(x+dx,y+dy,rx,7,0,0,7);g.fill();g.fillStyle='#4f7a3e';g.beginPath();g.ellipse(x+dx-3,y+dy-2,rx*0.7,4,0,0,7);g.fill();}
  void R;});}
/** 정자: 붉은 기둥 네 개, 기와 지붕(처마 끝이 들림), 돌 기단. */
function pavilion(c:number,r:number,s=2.2):Prop{return P(c,r,s,s,g=>{
  prism(g,c,r,s,s,16,'#9a958a');
  for(const [dc,dr] of [[0.2,0.2],[s-0.4,0.2],[0.2,s-0.4],[s-0.4,s-0.4]] as const)prism(g,c+dc,r+dr,0.2,0.2,110,'#8a2418',16);
  prism(g,c+0.1,r+0.1,s-0.2,s-0.2,8,'#5a2a1a',112);
  const A=up(pt(c-0.35,r-0.35),124),B=up(pt(c+s+0.35,r-0.35),124),C=up(pt(c+s+0.35,r+s+0.35),124),D=up(pt(c-0.35,r+s+0.35),124),[tx,ty]=up(pt(c+s/2,r+s/2),196);
  poly(g,[A,B,[tx,ty]],'#2e3a40','#141c20');poly(g,[A,D,[tx,ty]],'#3a4a52','#141c20');poly(g,[D,C,[tx,ty]],'#46565e','#141c20');poly(g,[B,C,[tx,ty]],'#26323a','#141c20');
  g.strokeStyle='rgba(10,16,20,.55)';g.lineWidth=1;for(let i=1;i<9;i++){const t=i/9;for(const [P1,P2] of [[D,C],[A,D]] as const){g.beginPath();g.moveTo(P1[0]+(tx-P1[0])*0,P1[1]);g.moveTo(P1[0]+(P2[0]-P1[0])*t,P1[1]+(P2[1]-P1[1])*t);g.lineTo(tx,ty);g.stroke();}}
  g.fillStyle='#c9a24a';g.beginPath();g.arc(tx,ty-6,5,0,7);g.fill();
  for(const p of [A,B,C,D]){g.strokeStyle='#141c20';g.lineWidth=3;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[0]+(p[0]<tx?-8:8),p[1]-10);g.stroke();}
});}
function edgeWall(g:Ctx,side:'left'|'right',from:number,to:number,h:number,col:string,crenel:boolean,roof?:string){
  for(let t=from;t<to;t+=1){const c=side==='right'?t:-0.6,r=side==='right'?-0.6:t;prism(g,c,r,side==='right'?1:0.6,side==='right'?0.6:1,h,col);
    if(crenel&&t%2===0)prism(g,c,r,side==='right'?0.5:0.6,side==='right'?0.6:0.5,16,col,h);
    if(roof){const A=up(pt(c,r),h),B=up(pt(c+(side==='right'?1:0.6),r),h),C=up(pt(c+(side==='right'?1:0.6),r+(side==='right'?0.6:1)),h),D=up(pt(c,r+(side==='right'?0.6:1)),h);poly(g,[up(A,4),up(B,4),up(C,14),up(D,14)],roof,'#141414');}}
}
function palisade(g:Ctx,side:'left'|'right',from:number,to:number){
  for(let t=from;t<to;t+=0.22){const [x,y]=side==='right'?pt(t,-0.3):pt(-0.3,t);g.fillStyle=t%0.44<0.22?'#6a4a2a':'#5a3e22';g.strokeStyle='#2a1a0c';g.lineWidth=1;g.beginPath();g.moveTo(x-5,y);g.lineTo(x-5,y-84);g.lineTo(x,y-96);g.lineTo(x+5,y-84);g.lineTo(x+5,y);g.closePath();g.fill();g.stroke();}
}
function hallFacade(g:Ctx,c:number,r:number,w:number,d:number,wallCol:string){
  prism(g,c,r,w,d,16,'#7a7468');prism(g,c+0.2,r+0.2,w-0.4,d-0.4,100,wallCol,16);
  for(let t=0.6;t<w-0.4;t+=1.1){const a=up(pt(c+0.2+t,r+d-0.2),24),b=up(pt(c+0.2+t+0.6,r+d-0.2),24);poly(g,[a,b,up(b,62),up(a,62)],'#f2d9a0','#3a2010');}
  // 팔작지붕
  const h=116,o=0.5,A=up(pt(c-o,r-o),h),B=up(pt(c+w+o,r-o),h),C=up(pt(c+w+o,r+d+o),h),D=up(pt(c-o,r+d+o),h),ridgeA=up(pt(c+w*0.25,r+d/2),h+80),ridgeB=up(pt(c+w*0.75,r+d/2),h+80);
  poly(g,[D,C,ridgeB,ridgeA],'#2e3a40','#0e1214');poly(g,[C,B,ridgeB],'#222c30','#0e1214');poly(g,[A,D,ridgeA],'#26323a','#0e1214');
  g.strokeStyle='rgba(160,180,190,.25)';g.lineWidth=1;for(let i=1;i<10;i++){const t=i/10,p=[D[0]+(C[0]-D[0])*t,D[1]+(C[1]-D[1])*t],q=[ridgeA[0]+(ridgeB[0]-ridgeA[0])*t,ridgeA[1]+(ridgeB[1]-ridgeA[1])*t];g.beginPath();g.moveTo(p[0]!,p[1]!);g.lineTo(q[0]!,q[1]!);g.stroke();}
  void B;
}
function burningHouse(g:Ctx,c:number,r:number,R:()=>number){hallFacade(g,c,r,3,2,'#6a5a48');for(let i=0;i<4;i++){const [x,y]=pt(c+R()*3,r+R()*2);flame(g,x,y-120-R()*40,18+R()*10,R);}}

// ─────────────────────────────────────────────── 성곽
/** 성벽 돌: 성의 바깥 벽돌빛(회갈). */
const WALL_STONE='#8f8676',WALL_TOP='#9d9686';
const lerp2=(a:[number,number],b:[number,number],t:number):[number,number]=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
/**
 * 벽돌 면: 바닥 모서리 a→b 위로 z0~z1. 줄마다 이음이 엇갈리고 벽돌마다 빛이 조금씩 다르다.
 * 위는 밝고 아래는 어둡게, 빗물 자국과 밑동의 이끼·흙 튄 자국까지.
 */
function brickFace(g:Ctx,a:[number,number],b:[number,number],z0:number,z1:number,col:string,k:number,R:()=>number,course=13){
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),L=30;
  const quad=(t0:number,t1:number,za:number,zb:number):Array<[number,number]>=>{const p=lerp2(a,b,t0/len),q=lerp2(a,b,t1/len);return [up(p,za),up(q,za),up(q,zb),up(p,zb)];};
  poly(g,quad(0,len,z0,z1),shade(col,k*0.7));
  for(let j=0,z=z0;z<z1;j++,z+=course){const zb=Math.min(z1,z+course-1.2),off=(j%2)*L/2;
    for(let t=-off;t<len;t+=L){const t0=Math.max(0,t+0.8),t1=Math.min(len,t+L-0.8);if(t1<=t0)continue;
      const v=0.84+R()*0.24-(R()<0.06?0.12:0);poly(g,quad(t0,t1,z,zb),shade(col,k*v));
      if(R()<0.25){const qq=quad(t0,t1,zb,zb),p0=qq[0]!,p1=qq[1]!;g.strokeStyle='rgba(255,245,225,.12)';g.lineWidth=1;g.beginPath();g.moveTo(...p0);g.lineTo(...p1);g.stroke();}}}
  // 위는 밝게, 아래는 어둡게
  {const q=quad(0,len,z0,z1),ys=q.map(p=>p[1]),gr=g.createLinearGradient(0,Math.min(...ys),0,Math.max(...ys));gr.addColorStop(0,'rgba(255,240,215,.1)');gr.addColorStop(0.6,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(20,14,8,.32)');g.fillStyle=gr;g.beginPath();q.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();}
  // 빗물 자국
  for(let i=0;i<len/26;i++){const t=R()*len,p=lerp2(a,b,t/len),h0=z1-R()*20,h1=h0-30-R()*(z1-z0)*0.6;const gr=g.createLinearGradient(0,p[1]-h0,0,p[1]-h1);gr.addColorStop(0,'rgba(30,26,20,.28)');gr.addColorStop(1,'rgba(30,26,20,0)');g.fillStyle=gr;g.fillRect(p[0]-1.5-R()*2,p[1]-h0,3+R()*4,h0-h1);}
  // 밑동의 이끼와 흙
  for(let i=0;i<len/9;i++){const t=R()*len,p=lerp2(a,b,t/len);g.fillStyle=R()<0.55?`rgba(${70+R()*30|0},${95+R()*30|0},50,.45)`:'rgba(60,46,30,.4)';g.beginPath();g.ellipse(p[0],p[1]-z0-2-R()*8,4+R()*7,2+R()*4,0,0,7);g.fill();}
}
/** 벽 윗면(성 위 길): 네 모서리 높이 z. */
function wallTop(g:Ctx,c0:number,r0:number,c1:number,r1:number,z:number){
  poly(g,[up(pt(c0,r0),z),up(pt(c1,r0),z),up(pt(c1,r1),z),up(pt(c0,r1),z)],WALL_TOP,'rgba(30,26,20,.5)',1);
  g.strokeStyle='rgba(40,34,26,.3)';g.lineWidth=1;
  for(let c=Math.ceil(c0*2)/2;c<c1;c+=0.5){g.beginPath();g.moveTo(...up(pt(c,r0),z));g.lineTo(...up(pt(c,r1),z));g.stroke();}
  for(let r=Math.ceil(r0*2)/2;r<r1;r+=0.5){g.beginPath();g.moveTo(...up(pt(c0,r),z));g.lineTo(...up(pt(c1,r),z));g.stroke();}
}
/** 성가퀴(여장): 바깥 가장자리를 따라 엇갈린 타구와 활 쏘는 구멍. along: 'c'면 c를 따라(r 고정). */
function merlons(g:Ctx,along:'c'|'r',fixed:number,from:number,to:number,z:number,R:()=>number,h=34,thick=0.45){
  for(let t=from;t<to-0.1;t+=1){
    const w=0.62;const [c,r,ww,dd]=along==='c'?[t,fixed,w,thick]:[fixed,t,thick,w];
    if(R()<0.06){prism(g,c,r,ww,dd,h*0.45,WALL_STONE,z);continue;}// 깨진 타구
    prism(g,c,r,ww,dd,h,WALL_STONE,z);
    // 활 쏘는 구멍(가운데 좁은 틈)
    const mid=t+w/2,[p]=along==='c'?[up(pt(mid,fixed+thick),z+h*0.55)]:[up(pt(fixed+thick,mid),z+h*0.55)];g.fillStyle='rgba(15,12,10,.75)';g.fillRect(p[0]-1.5,p[1]-7,3,10);
    // 낮은 이음 벽(타구 사이)
    const [c2,r2,w2,d2]=along==='c'?[t+w,fixed,1-w,thick]:[fixed,t+w,thick,1-w];if(t+1<=to)prism(g,c2,r2,w2,d2,h*0.42,'#8a8171',z);
  }
}
/** 겹처마 지붕: 네 귀가 들린 팔작지붕(기와 줄·용마루·치미). */
function hipRoof(g:Ctx,c:number,r:number,w:number,d:number,z:number,rise:number,col='#2b3439',o=0.6){
  const A=up(pt(c-o,r-o),z),B=up(pt(c+w+o,r-o),z),C=up(pt(c+w+o,r+d+o),z),D=up(pt(c-o,r+d+o),z);
  const rA=up(pt(c+w*0.22,r+d/2),z+rise),rB=up(pt(c+w*0.78,r+d/2),z+rise);
  const lift=(p:[number,number],dy:number):[number,number]=>[p[0],p[1]-dy];
  // 들린 처마 끝
  const A2=lift(A,10),B2=lift(B,10),C2=lift(C,12),D2=lift(D,12);
  const face=(pts:Array<[number,number]>,k:number)=>{poly(g,pts,shade(col,k),'#0c1012',1.5);};
  face([A2,B2,rB,rA],0.75);face([B2,C2,rB],0.62);face([A2,rA,D2],0.9);face([D2,C2,rB,rA],1);
  // 기와 골
  g.strokeStyle='rgba(170,190,200,.22)';g.lineWidth=1;for(let i=1;i<14;i++){const t=i/14,p=lerp2(D2,C2,t),q=lerp2(rA,rB,Math.min(1,Math.max(0,(t-0.22)/0.56)));g.beginPath();g.moveTo(...p);g.lineTo(...q);g.stroke();}
  // 처마 끝 막새 줄
  g.strokeStyle='#14181a';g.lineWidth=3;g.beginPath();g.moveTo(...D2);g.quadraticCurveTo((D2[0]+C2[0])/2,(D2[1]+C2[1])/2+5,...C2);g.stroke();
  // 용마루와 치미
  g.strokeStyle='#1a2024';g.lineWidth=5;g.beginPath();g.moveTo(...rA);g.lineTo(...rB);g.stroke();
  for(const p of [rA,rB]){g.fillStyle='#1a2024';g.beginPath();g.moveTo(p[0]-5,p[1]);g.quadraticCurveTo(p[0]-2,p[1]-16,p[0]+6,p[1]-14);g.lineTo(p[0]+4,p[1]);g.closePath();g.fill();}
}
/** 누각 한 채(문루·각루): 붉은 기둥, 난간, 창살 벽, 겹처마. z는 받침 높이. */
function tower(g:Ctx,c:number,r:number,w:number,d:number,z:number,R:()=>number,stories=2,plaque?:string){
  const H1=64;
  // 받침돌
  prism(g,c-0.15,r-0.15,w+0.3,d+0.3,8,'#6e675a',z);
  for(let s=0;s<stories;s++){
    const zs=z+8+s*(H1+30),sh=s?0.35:0;
    // 벽(안쪽으로 물린 크림빛 벽에 창살)
    prism(g,c+0.3+sh,r+0.3+sh,w-0.6-2*sh,d-0.6-2*sh,H1,'#cdbb98',zs);
    const fa=pt(c+0.3+sh,r+d-0.3-sh),fb=pt(c+w-0.3-sh,r+d-0.3-sh);
    for(let t=0.12;t<0.9;t+=0.26){const p=lerp2(fa,fb,t),q=lerp2(fa,fb,t+0.18);const box:[number,number][]=[up(p,zs+14),up(q,zs+14),up(q,zs+H1-10),up(p,zs+H1-10)];poly(g,box,'#3a2a1c','#2a1a10',1);
      g.strokeStyle='rgba(200,170,110,.55)';g.lineWidth=1;for(let k=1;k<4;k++){const m0=lerp2(box[0]!,box[1]!,k/4),m1=lerp2(box[3]!,box[2]!,k/4);g.beginPath();g.moveTo(...m0);g.lineTo(...m1);g.stroke();}
      for(let k=1;k<5;k++){const m0=lerp2(box[0]!,box[3]!,k/5),m1=lerp2(box[1]!,box[2]!,k/5);g.beginPath();g.moveTo(...m0);g.lineTo(...m1);g.stroke();}}
    // 붉은 기둥(앞줄·옆줄)
    for(let t=0;t<=w+0.001;t+=w/Math.max(2,Math.round(w/0.9)))prism(g,c+t-0.08-sh*(t>w/2?1:-1)*0,r+d-0.2-sh,0.16,0.16,H1,'#8e2a1c',zs);
    for(let t=0;t<d;t+=d/2)prism(g,c+w-0.2-sh,r+t-0.08,0.16,0.16,H1,'#7a2418',zs);
    // 난간
    const ra=pt(c-0.05+sh,r+d+0.05-sh),rb=pt(c+w+0.05-sh,r+d+0.05-sh);g.strokeStyle='#5a2a18';g.lineWidth=2;g.beginPath();g.moveTo(...up(ra,zs+16));g.lineTo(...up(rb,zs+16));g.stroke();
    for(let t=0;t<=1;t+=0.06){const p=lerp2(ra,rb,t);g.beginPath();g.moveTo(...up(p,zs));g.lineTo(...up(p,zs+16));g.stroke();}
    // 들보 단청 띠
    poly(g,[up(fa,zs+H1-8),up(fb,zs+H1-8),up(fb,zs+H1),up(fa,zs+H1)],'#2e6a5a');
    // 처마(아래층은 짧은 처마, 위층은 지붕)
    if(s<stories-1){const o=0.55,a2=up(pt(c-o+sh,r+d+o-sh),zs+H1+4),b2=up(pt(c+w+o-sh,r+d+o-sh),zs+H1+4),b3=up(pt(c+w+o-sh,r-o+sh),zs+H1+4),a3=up(pt(c+w*0.5,r+d*0.5),zs+H1+30);
      poly(g,[a2,b2,up(b2,-0),lerp2(a3,b2,0.5)],'#2b3439');poly(g,[a2,b2,lerp2(b2,a3,0.55),lerp2(a2,a3,0.55)],'#323c42','#0c1012',1.2);poly(g,[b2,b3,lerp2(b3,a3,0.55),lerp2(b2,a3,0.55)],'#252d32','#0c1012',1.2);}
    else hipRoof(g,c+sh,r+sh,w-2*sh,d-2*sh,zs+H1+2,48);
  }
  if(plaque){const p=lerp2(pt(c+0.3,r+d-0.3),pt(c+w-0.3,r+d-0.3),0.5),[x,y]=up(p,z+8+H1+12);g.fillStyle='#1e2a46';g.strokeStyle='#d8aa3a';g.lineWidth=2;g.fillRect(x-26,y-12,52,22);g.strokeRect(x-26,y-12,52,22);g.fillStyle='#f0d070';g.font='bold 15px serif';g.textAlign='center';g.fillText(plaque,x,y+5);g.textAlign='start';}
  void R;
}
/**
 * 성벽 한 줄(두께가 있는 성벽): along 'c'면 r=rA~rB 두께로 c=c0~c1을 따라, 'r'이면 c=cA~cB 두께로.
 * 안쪽 면에 벽돌, 위에 길, 바깥 가장자리에 성가퀴, 안쪽 가장자리에 낮은 난간.
 */
function cityWall(g:Ctx,along:'c'|'r',a0:number,a1:number,t0:number,t1:number,H:number,R:()=>number){
  if(along==='c'){brickFace(g,pt(Math.max(a0,t1),t1),pt(a1,t1),0,H,WALL_STONE,0.82,R);wallTop(g,a0,t0,a1,t1,H);merlons(g,'c',t0,a0,a1,H,R);prism(g,a0,t1-0.22,a1-a0,0.22,14,'#888070',H);}
  else{brickFace(g,pt(t1,Math.max(a0,t1)),pt(t1,a1),0,H,WALL_STONE,0.66,R);wallTop(g,t0,a0,t1,a1,H);merlons(g,'r',t0,a0,a1,H,R);prism(g,t1-0.22,a0,0.22,a1-a0,14,'#888070',H);}
  // 밑동의 기단
  if(along==='c')prism(g,a0,t1,a1-a0,0.18,10,'#6e675a');else prism(g,t1,a0,0.18,a1-a0,10,'#6e675a');
}
/** 성벽 안쪽 면의 아치 성문: c=gc~gc+gw(r=rB 면), 높이 gh. 두 짝 문이 안으로 반쯤 열려 있다. */
function archGate(g:Ctx,rB:number,gc:number,gw:number,gh:number){
  const a=pt(gc,rB),b=pt(gc+gw,rB),spring=gh*0.62,n=18;
  const arch:Array<[number,number]>=[up(a,0)];
  for(let i=0;i<=n;i++){const th=Math.PI*(1-i/n),t=0.5+0.5*Math.cos(th),p=lerp2(a,b,t);arch.push(up(p,spring+(gh-spring)*Math.sin(th)));}
  arch.push(up(b,0));
  // 아치 둘레 돌(홍예석)
  const ring:Array<[number,number]>=[];for(let i=0;i<=n;i++){const th=Math.PI*(1-i/n),t=0.5+0.5*Math.cos(th)*1.16,p=lerp2(a,b,t);ring.push(up(p,spring+(gh-spring+12)*Math.sin(th)));}
  g.strokeStyle='#b4ab98';g.lineWidth=11;g.beginPath();ring.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();
  g.strokeStyle='rgba(40,34,26,.6)';g.lineWidth=1;for(let i=0;i<=n;i+=2){const th=Math.PI*(1-i/n),t1=0.5+0.5*Math.cos(th),p0=up(lerp2(a,b,t1),spring+(gh-spring)*Math.sin(th)),t2=0.5+0.5*Math.cos(th)*1.24,p1=up(lerp2(a,b,t2),spring+(gh-spring+18)*Math.sin(th));g.beginPath();g.moveTo(...p0);g.lineTo(...p1);g.stroke();}
  // 문 안의 어둠(굴)
  const gr=g.createLinearGradient(0,arch[0]![1]-gh,0,arch[0]![1]);gr.addColorStop(0,'#0c0806');gr.addColorStop(1,'#2a1e14');
  g.fillStyle=gr;g.beginPath();arch.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();
  // 굴 너머로 비치는 바깥 빛
  const far=lerp2(a,b,0.5),[fx,fy]=up(far,0);const lg=g.createRadialGradient(fx,fy-gh*0.35,4,fx,fy-gh*0.35,gh*0.5);lg.addColorStop(0,'rgba(255,236,190,.35)');lg.addColorStop(1,'rgba(255,236,190,0)');g.fillStyle=lg;g.beginPath();arch.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();
  // 반쯤 열린 문짝 두 개(징 박힌 붉은 나무)
  for(const side of [0,1]){const hinge=side?b:a,dir=side?-1:1,open=pt(side?gc+gw*0.78:gc+gw*0.22,rB+0.7),h=spring+ (gh-spring)*0.55;
    const pts:[number,number][]=[up(hinge,0),up(open,0),up(open,h),up(hinge,h)];poly(g,pts,'#5a1e12','#1a0806',2);
    g.strokeStyle='rgba(20,8,4,.6)';g.lineWidth=1.2;for(let k=1;k<4;k++){const m0=lerp2(pts[0]!,pts[1]!,k/4),m1=lerp2(pts[3]!,pts[2]!,k/4);g.beginPath();g.moveTo(...m0);g.lineTo(...m1);g.stroke();}
    for(let row=1;row<6;row++)for(let k=1;k<5;k++){const p=lerp2(lerp2(pts[0]!,pts[3]!,row/6),lerp2(pts[1]!,pts[2]!,row/6),k/5);stud(g,p[0],p[1],1.8);}
    void dir;}
}
/** 성 안쪽에서 성벽 위로 오르는 계단(마도): 왼쪽 성벽(c=cB 면)에 붙어 r=r0에서 앞으로 내려온다. */
function wallStairs(g:Ctx,cB:number,r0:number,H:number,steps=12){
  const dep=0.42,wid=1.3;
  for(let i=0;i<steps;i++){const h=H*(steps-i)/steps;prism(g,cB,r0+i*dep,wid,dep,h,i%2?'#958c7c':'#9a917f');}
  // 바깥 난간벽(비스듬히 내려오는 낮은 벽)
  for(let i=0;i<steps;i++){const h=H*(steps-i)/steps;prism(g,cB+wid,r0+i*dep,0.18,dep,h+10,'#817969');}
}
/** 성 밖 먼 들판(성벽 위에서 내려다본): 산·강·적진의 군막과 대열·연기, 옅은 안개. 바깥 세모꼴 땅에. */
function distantLand(g:Ctx,R:()=>number,enemy:boolean){
  g.save();g.beginPath();g.moveTo(0,0);g.lineTo(W,0);g.lineTo(W,H);g.lineTo(...pt(N+4,0));g.lineTo(...pt(0,0));g.lineTo(...pt(0,N+4));g.lineTo(0,H);g.closePath();g.clip();
  const sky=g.createLinearGradient(0,0,0,OY+120);sky.addColorStop(0,'#c9c4b0');sky.addColorStop(0.35,'#a9a688');sky.addColorStop(1,'#6e7650');g.fillStyle=sky;g.fillRect(0,0,W,H);
  // 먼 산줄기 두 겹
  for(const [base,amp,col] of [[OY*0.55,26,'#8f9488'],[OY*0.9,18,'#7a8270']] as const){g.fillStyle=col;g.beginPath();g.moveTo(0,base+40);for(let x=0;x<=W;x+=40)g.lineTo(x,base-amp*0.5-Math.sin(x*0.011+base)*amp-R()*8);g.lineTo(W,base+40);g.closePath();g.fill();}
  // 들판의 밭두렁과 길
  for(let i=0;i<40;i++){g.fillStyle=`rgba(${80+R()*40|0},${90+R()*30|0},${50+R()*20|0},.35)`;g.beginPath();g.ellipse(R()*W,OY*0.9+R()*H*0.6,60+R()*90,10+R()*16,0,0,7);g.fill();}
  g.strokeStyle='rgba(170,150,110,.6)';g.lineWidth=5;g.beginPath();g.moveTo(W*0.1,OY+40);g.bezierCurveTo(W*0.3,OY-10,W*0.6,OY+30,W*0.92,OY-6);g.stroke();
  // 강
  g.strokeStyle='rgba(90,130,150,.75)';g.lineWidth=9;g.beginPath();g.moveTo(-10,OY*0.75);g.bezierCurveTo(W*0.25,OY*1.15,W*0.6,OY*0.55,W+10,OY*0.95);g.stroke();
  if(enemy){
    // 적진: 작은 군막들과 깃발, 대열(점), 연기 기둥
    for(let i=0;i<14;i++){const x=W*0.62+R()*W*0.32,y=OY*0.65+R()*60;g.fillStyle='#d8cdb0';g.beginPath();g.moveTo(x-7,y);g.lineTo(x,y-9);g.lineTo(x+7,y);g.closePath();g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x-7,y,14,1);}
    for(let i=0;i<5;i++){const x=W*0.62+R()*W*0.3,y=OY*0.6+R()*50;g.strokeStyle='#3a2a1a';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-16);g.stroke();g.fillStyle='#9a2418';g.fillRect(x,y-16,7,5);}
    for(let k=0;k<3;k++){const x0=W*(0.12+k*0.12)+R()*20,y0=OY*0.85+R()*40;for(let i=0;i<10;i++)for(let j=0;j<4;j++){g.fillStyle=R()<0.5?'#5a2a20':'#3a2a22';g.fillRect(x0+i*4+j*2,y0+j*3,2,3);}}
    for(let i=0;i<3;i++){const x=W*0.68+R()*W*0.25,y=OY*0.7;for(let k=0;k<7;k++){g.fillStyle=`rgba(60,58,56,${0.3-k*0.035})`;g.beginPath();g.ellipse(x+k*5,y-k*12,7+k*3,5+k*2,0,0,7);g.fill();}}
  }
  // 아지랑이(멀수록 옅게)
  const haze=g.createLinearGradient(0,0,0,OY+100);haze.addColorStop(0,'rgba(220,214,190,.55)');haze.addColorStop(1,'rgba(220,214,190,0)');g.fillStyle=haze;g.fillRect(0,0,W,H);
  g.restore();
}
/** 성 위에 꽂은 작은 깃발. */
function drawFlagPole(g:Ctx,[x,y]:[number,number],col:string){g.strokeStyle='#3a2410';g.lineWidth=2.5;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-70);g.stroke();
  g.fillStyle=col;g.strokeStyle='#120a06';g.lineWidth=1;g.beginPath();g.moveTo(x+1,y-68);g.quadraticCurveTo(x+16,y-64,x+28,y-66);g.lineTo(x+30,y-44);g.quadraticCurveTo(x+16,y-42,x+1,y-46);g.closePath();g.fill();g.stroke();
  g.fillStyle='#d8b04a';g.fillRect(x+27,y-66,3,22);}
/** 성벽에 걸친 공성 사다리 끝(바깥에서 걸어 올린): 두 기둥 끝과 가로대. */
function siegeLadder(g:Ctx,along:'c'|'r',fixed:number,t:number,z:number){
  const p=along==='c'?pt(t,fixed):pt(fixed,t),q=along==='c'?pt(t+0.5,fixed):pt(fixed,t+0.5);
  const [a,b]=[up(p,z+46),up(q,z+46)],[a0,b0]=[[a[0]-8,a[1]-40] as [number,number],[b[0]-8,b[1]-40] as [number,number]];
  g.strokeStyle='#4a3020';g.lineWidth=4;g.beginPath();g.moveTo(...a);g.lineTo(...a0);g.moveTo(...b);g.lineTo(...b0);g.stroke();
  g.lineWidth=2.5;for(let k=0.15;k<1;k+=0.28){const m=lerp2(a,a0,k),n=lerp2(b,b0,k);g.beginPath();g.moveTo(...m);g.lineTo(...n);g.stroke();}
  // 갈고리
  g.strokeStyle='#2a2a2a';g.lineWidth=2;for(const s of [a,b]){g.beginPath();g.moveTo(s[0],s[1]);g.quadraticCurveTo(s[0]+8,s[1]+2,s[0]+6,s[1]+10);g.stroke();}
}
/** 굴릴 돌 무더기(뇌석)와 통나무 더미(곤목). */
function stonePile(c:number,r:number,R:()=>number):Prop{return P(c,r,0.9,0.9,g=>{const [x,y]=pt(c+0.45,r+0.45);g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x,y,30,11,0,0,7);g.fill();
  for(let i=0;i<14;i++){const lay=Math.floor(i/6),ox=(R()-0.5)*(44-lay*14),oy=-lay*10-R()*4;g.fillStyle=shade('#8e897e',0.8+R()*0.35);g.strokeStyle='rgba(30,26,22,.6)';g.lineWidth=1;g.beginPath();g.ellipse(x+ox,y+oy-6,8+R()*3,6+R()*2,R(),0,7);g.fill();g.stroke();g.fillStyle='rgba(255,250,235,.25)';g.beginPath();g.ellipse(x+ox-2,y+oy-9,3,2,0,0,7);g.fill();}});}
function logPile(c:number,r:number):Prop{return P(c,r,1.4,0.6,g=>{for(let lay=0;lay<3;lay++)for(let i=0;i<3-lay;i++){const a=up(pt(c+0.1,r+0.15+i*0.18+lay*0.09),8+lay*12),b=up(pt(c+1.3,r+0.15+i*0.18+lay*0.09),8+lay*12);g.strokeStyle='#5a3a20';g.lineWidth=11;g.lineCap='round';g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();g.strokeStyle='rgba(255,220,170,.18)';g.lineWidth=2;g.beginPath();g.moveTo(a[0],a[1]-4);g.lineTo(b[0],b[1]-4);g.stroke();g.lineCap='butt';g.fillStyle='#b8925a';g.beginPath();g.ellipse(b[0],b[1],5.5,5.5,0,0,7);g.fill();g.strokeStyle='#6a4a2a';g.lineWidth=1;g.stroke();}});}
/** 노포(큰 쇠뇌): 나무 틀 위의 큰 활과 굵은 화살. */
function ballista(c:number,r:number):Prop{return P(c,r,1.2,1,g=>{prism(g,c+0.2,r+0.2,0.8,0.6,14,'#5a3a20');const [x,y]=up(pt(c+0.6,r+0.5),18);
  g.strokeStyle='#4a2c14';g.lineWidth=6;g.beginPath();g.moveTo(x-30,y+6);g.lineTo(x+26,y-14);g.stroke();
  g.strokeStyle='#3a2410';g.lineWidth=4;g.beginPath();g.moveTo(x-18,y-24);g.quadraticCurveTo(x-2,y-6,x-12,y+18);g.stroke();
  g.strokeStyle='rgba(230,220,190,.8)';g.lineWidth=1;g.beginPath();g.moveTo(x-18,y-24);g.lineTo(x-28,y+3);g.lineTo(x-12,y+18);g.stroke();
  g.strokeStyle='#2a1a0c';g.lineWidth=3;g.beginPath();g.moveTo(x-30,y+4);g.lineTo(x+34,y-20);g.stroke();g.fillStyle='#8a8a8a';g.beginPath();g.moveTo(x+34,y-20);g.lineTo(x+26,y-22);g.lineTo(x+30,y-14);g.closePath();g.fill();});}
/** 거마(말막이): 엇갈려 묶은 뾰족한 말뚝 한 줄. */
function chevalDeFrise(c:number,r:number,len:number,alongC=true):Prop{return P(c,r,alongC?len:0.5,alongC?0.5:len,g=>{
  const a=alongC?pt(c,r+0.25):pt(c+0.25,r),b=alongC?pt(c+len,r+0.25):pt(c+0.25,r+len);g.strokeStyle='#4a3020';g.lineWidth=6;g.beginPath();g.moveTo(a[0],a[1]-10);g.lineTo(b[0],b[1]-10);g.stroke();
  for(let t=0.05;t<1;t+=0.12){const p=lerp2(a,b,t);for(const s of [-1,1]){g.strokeStyle='#6a4a2a';g.lineWidth=3;g.beginPath();g.moveTo(p[0]-s*14,p[1]+2);g.lineTo(p[0]+s*16,p[1]-30);g.stroke();g.fillStyle='#c8c0a8';g.beginPath();g.moveTo(p[0]+s*16,p[1]-30);g.lineTo(p[0]+s*12,p[1]-25);g.lineTo(p[0]+s*18,p[1]-26);g.closePath();g.fill();}}});}
/** 나무 망루: 네 기둥, 엇걸린 버팀대, 판자 망대와 지붕, 사다리. */
function watchTower(c:number,r:number,R:()=>number):Prop{return P(c,r,1.4,1.4,g=>{
  const z=150;for(const [dc,dr] of [[0,0],[1.2,0],[0,1.2],[1.2,1.2]] as const)prism(g,c+dc,r+dr,0.2,0.2,z,'#5a3a20');
  g.strokeStyle='#4a2c14';g.lineWidth=3;for(const z0 of [30,90]){const a=up(pt(c+0.1,r+1.3),z0),b=up(pt(c+1.3,r+1.3),z0+50),a2=up(pt(c+1.3,r+1.3),z0),b2=up(pt(c+0.1,r+1.3),z0+50);g.beginPath();g.moveTo(...a);g.lineTo(...b);g.moveTo(...a2);g.lineTo(...b2);g.stroke();}
  prism(g,c-0.15,r-0.15,1.7,1.7,8,'#6a4a2a',z);
  for(let t=0;t<1.7;t+=0.17)prism(g,c-0.15+t,r+1.4,0.15,0.15,30,'#5a3a20',z+8);for(let t=0;t<1.7;t+=0.17)prism(g,c+1.4,r-0.15+t,0.15,0.15,30,'#4f3420',z+8);
  hipRoof(g,c,r,1.4,1.4,z+62,34,'#4a3a2a',0.35);
  for(const [dc,dr] of [[0,1.4],[1.4,1.4],[1.4,0]] as const)prism(g,c+dc-0.08,r+dr-0.08,0.1,0.1,24,'#3a2410',z+38);
  const la=pt(c+0.5,r+1.9),lb=pt(c+0.9,r+1.9);g.strokeStyle='#5a3a20';g.lineWidth=3;g.beginPath();g.moveTo(...la);g.lineTo(...up(pt(c+0.5,r+1.4),z));g.moveTo(...lb);g.lineTo(...up(pt(c+0.9,r+1.4),z));g.stroke();
  g.lineWidth=2;for(let k=0.08;k<1;k+=0.09){const m=lerp2(la,up(pt(c+0.5,r+1.4),z),k),n=lerp2(lb,up(pt(c+0.9,r+1.4),z),k);g.beginPath();g.moveTo(...m);g.lineTo(...n);g.stroke();}
  void R;});}
/** 목책 한 줄(돌 기단 위): along 'c'면 r 고정. */
function stakeWall(g:Ctx,along:'c'|'r',fixed:number,from:number,to:number,base:number,R:()=>number){
  if(along==='c')brickFace(g,pt(from,fixed+0.5),pt(to,fixed+0.5),0,base,'#857c6a',0.8,R,12);else brickFace(g,pt(fixed+0.5,from),pt(fixed+0.5,to),0,base,'#857c6a',0.66,R,12);
  if(along==='c')wallTop(g,from,fixed,to,fixed+0.5,base);else wallTop(g,fixed,from,fixed+0.5,to,base);
  for(let t=from;t<to;t+=0.2){const p=along==='c'?pt(t,fixed+0.3):pt(fixed+0.3,t),[x,y]=up(p,base),h=74+R()*10;g.fillStyle=shade('#6a4a2a',0.85+R()*0.25);g.strokeStyle='#2a1a0c';g.lineWidth=1;
    g.beginPath();g.moveTo(x-4.5,y);g.lineTo(x-4.5,y-h);g.lineTo(x,y-h-11);g.lineTo(x+4.5,y-h);g.lineTo(x+4.5,y);g.closePath();g.fill();g.stroke();}
  // 가로 묶음 띠
  const A=along==='c'?pt(from,fixed+0.3):pt(fixed+0.3,from),B=along==='c'?pt(to,fixed+0.3):pt(fixed+0.3,to);for(const zz of [base+22,base+60]){g.strokeStyle='#3a2410';g.lineWidth=3;g.beginPath();g.moveTo(...up(A,zz));g.lineTo(...up(B,zz));g.stroke();}
}

// ─────────────────────────────────────────────── 도트로
/** 배경 한 점 = 도트 인물 한 점(3배). 그린 장면을 1/3로 줄이고 색을 48가지로 모아 도트 그림으로 만든다. */
export const PIXEL=3;
/** 배경을 그리는 배율. */
const SS=2;
/** 이야기 장면 성벽의 높이(사람 키의 세 배쯤). */
const CASTLE_H=230;

// ─────────────────────────────────────────────── 그린 배경(AI 채색 원화)
/**
 * 장소 종류에 맞는 채색 원화가 있으면 그것을 쓴다. 원화마다 바닥 마름모(뒤 모서리·오른쪽 모서리)와
 * 사람이 설 수 있는 바닥, 가구가 놓인 곳(못 서는 곳)을 원화 좌표로 적어 둔다.
 * 원화는 가로 1280에 맞춰 줄이고 cropTop만큼 위를 잘라 무대(2:1)에 깐다.
 */
interface Painted {url:string;w:number;h:number;cropTop:number;kinds:Kind[];
  /** 여러 장이 모인 판에서 이 그림의 자리(없으면 그림 전체). arts: 이 그림을 먼저 고를 이야기 배경 번호. */
  sx?:number;sy?:number;arts?:number[];
  /** 같은 장소의 야간·우천 전용 원화. */
  variant?:'day'|'night'|'rain';
  /** 같은 종류 안에서도 이 장소 이름에만 우선 쓰는 전용 원화. */
  places?:RegExp;
  /** 그림 자체에 빛(밤·노을)이 들어 있어 따로 색을 입히지 않는다. */
  lit?:boolean;
  /** 바닥 뒤 모서리와 오른쪽 모서리(원화 좌표): 격자 원점과 칸 크기를 맞춘다. */
  back:[number,number];right:[number,number];
  floor:Array<[number,number]>;blocks:Array<Array<[number,number]>>;
  /** 이 원화에서 인물 크기 배율. */
  figScale:number}
/**
 * 옆에서 본 채색 원화(story-backgrounds-1·2, 3×3 판 두 장)를 이야기 무대에 깐다. 무대는 2:1이라 그림의 아래쪽
 * (바닥이 있는 쪽)을 보여 주고, 바닥이 시작되는 높이(yTop)부터 아래를 사람이 설 수 있는 바닥으로 삼는다.
 * 바닥 격자는 얕게 눕힌 마름모(멀고 가까움이 작은 옆모습)로 맞춘다.
 */
function sidePanel(idx:number,kinds:Kind[],yTop:number,o:{blocks?:Array<Array<[number,number]>>;inset?:[number,number];fig?:number}={}):Painted{
  const edges=idx<9?[0,340,681,1024]:[0,340,665,1024],row=Math.floor(idx%9/3),w=508,h=edges[row+1]!-edges[row]!-4,cropTop=Math.max(0,Math.min(h-254,yTop-150));// 바닥 위 경치(지붕·성루)를 150px쯤 남기고, 남는 만큼 아래 빈 바닥을 덜어 낸다
  const [l,r]=o.inset??[6,6];
  return {url:`story-backgrounds-${idx<9?1:2}.webp`,sx:idx%3*512+2,sy:edges[row]!+2,w,h,cropTop,kinds,arts:[idx],lit:true,
    back:[w/2,yTop+2],right:[w+40,yTop+(h-yTop)*.55],figScale:o.fig??1.4,
    floor:[[l,yTop],[w-r,yTop],[w,h],[0,h]],blocks:o.blocks??[]};
}
function storyVariant(url:string,kinds:Kind[],variant:'day'|'night'|'rain',yTop:number,figScale=1.08):Painted{
  return {url,w:1600,h:900,cropTop:0,kinds,variant,lit:true,back:[800,yTop],right:[1560,yTop+190],figScale,
    floor:[[45,yTop],[1555,yTop],[1600,900],[0,900]],blocks:[]};
}
/** 3번째 3×3 판: 지역 전용 5장 + 강가/성 밖 진영의 밤·비 4장. */
function specialPanel(idx:number,kinds:Kind[],yTop:number,o:{variant?:'night'|'rain';places:RegExp;inset?:[number,number];fig?:number}):Painted{
  const edges=[0,340,682,1024],row=Math.floor(idx/3),w=508,h=edges[row+1]!-edges[row]!-4,cropTop=Math.max(0,Math.min(h-254,yTop-150)),[l,r]=o.inset??[8,8];
  return {url:'story-backgrounds-3.webp',sx:idx%3*512+2,sy:edges[row]!+2,w,h,cropTop,kinds,lit:true,...(o.variant?{variant:o.variant}:{}),places:o.places,
    back:[w/2,yTop+2],right:[w+40,yTop+(h-yTop)*.55],figScale:o.fig??1.18,
    floor:[[l,yTop],[w-r,yTop],[w,h],[0,h]],blocks:[]};
}
interface SpecialPanelSpec {idx:number;kinds:Kind[];yTop:number;variant?:'night'|'rain';places:RegExp;inset?:[number,number];fig?:number}
const SPECIAL_PANELS:SpecialPanelSpec[]=[
  {idx:0,kinds:['forest','valley','camp'],yTop:235,places:/남만|팔납|은갱|독룡|오과|맹획/,inset:[24,24]},
  {idx:1,kinds:['field','hill','camp'],yTop:218,places:/초원|백랑산|오환/,inset:[16,16]},
  {idx:2,kinds:['wall','fort','gatehouse'],yTop:216,places:/눈|설원|겨울|남피|동흥|얼어붙/,inset:[24,24]},
  {idx:3,kinds:['valley','hill'],yTop:205,places:/잔도|절벽|벼랑|검각|자오곡/,inset:[54,54],fig:1.08},
  {idx:4,kinds:['deck'],yTop:205,places:/./,inset:[44,44],fig:1.08},
  {idx:5,kinds:['camp','bank'],yTop:208,variant:'night',places:/강가 진영|강변 진영|강둑 진영|상류 강가/},
  {idx:6,kinds:['camp','bank'],yTop:208,variant:'rain',places:/강가 진영|강변 진영|강둑 진영|상류 강가/},
  {idx:7,kinds:['camp'],yTop:208,variant:'night',places:/성 밖 진영|성외 진영/},
  {idx:8,kinds:['camp'],yTop:208,variant:'rain',places:/성 밖 진영|성외 진영/},
];
/** 테스트와 문서가 쓰는 3번째 배경판 칸 번호. */
export function specialBackdropCell(art:number,place:string){
  const kind=kindFor(art,place),mood=moodOf(place,kind),variant=mood.weather==='rain'?'rain':mood.light==='night'?'night':undefined;
  return SPECIAL_PANELS.find(s=>s.kinds.includes(kind)&&s.variant===variant&&s.places.test(place))?.idx
    ??SPECIAL_PANELS.find(s=>s.kinds.includes(kind)&&!s.variant&&s.places.test(place))?.idx;
}
const PAINTED:Painted[]=[
  // 레퍼런스 전투 화면과 같은 낮은 디테일 밀도·넓은 인물 배치 공간의 지역 전용 배경.
  ...SPECIAL_PANELS.map(s=>specialPanel(s.idx,s.kinds,s.yTop,{places:s.places,...(s.variant?{variant:s.variant}:{}),...(s.inset?{inset:s.inset}:{}),...(s.fig!==undefined?{fig:s.fig}:{})})),
  storyVariant('story-tent-day-v1.webp',['tent'],'day',350),
  storyVariant('story-tent-night-v1.webp',['tent'],'night',350),
  storyVariant('story-tent-rain-v1.webp',['tent'],'rain',350),
  storyVariant('story-camp-day-v1.webp',['camp','battlefield'],'day',420,.98),
  storyVariant('story-camp-night-v1.webp',['camp','battlefield'],'night',420,.98),
  storyVariant('story-camp-rain-v1.webp',['camp','battlefield'],'rain',420,.98),
  storyVariant('story-palace-day-v1.webp',['palace'],'day',430,1.02),
  storyVariant('story-palace-night-v1.webp',['palace'],'night',430,1.02),
  storyVariant('story-palace-rain-v1.webp',['palace'],'rain',430,1.02),
  {url:'scenes/study.webp',w:1800,h:1004,cropTop:56,kinds:['study','home','hall'],back:[905,300],right:[1745,690],figScale:1.35,
    floor:[[905,330],[1700,690],[905,1100],[110,690]],
    blocks:[[[50,560],[490,450],[590,530],[150,740]],[[470,400],[770,370],[780,470],[560,560]],[[850,300],[960,300],[960,380],[850,380]],[[920,370],[1320,430],[1330,620],[1170,640],[910,480]],[[1330,540],[1760,600],[1760,720],[1500,800],[1330,650]]]},
  sidePanel(0,['court'],238),sidePanel(10,['court','town'],252),sidePanel(1,['fire'],220,{inset:[60,60]}),sidePanel(2,['gatehouse'],228),
  sidePanel(3,['hill','field'],252),sidePanel(4,['valley'],255),sidePanel(5,['palace'],212,{inset:[40,40]}),
  sidePanel(6,['camp','battlefield'],192),sidePanel(16,['camp','battlefield'],210),sidePanel(7,['river','deck'],210),
  sidePanel(8,['wall','fort'],246),sidePanel(17,['fort','wall'],272),
  sidePanel(9,['store'],238,{blocks:[[[0,200],[125,200],[125,290],[0,290]],[[425,205],[508,205],[508,290],[425,290]]]}),
  sidePanel(11,['forest'],246,{inset:[30,30]}),sidePanel(13,['corridor'],196,{inset:[90,90]}),sidePanel(14,['tent'],222,{inset:[30,30]}),sidePanel(15,['bank'],278),
];
const paintedImg=new Map<string,HTMLImageElement>();
export async function loadPaintedScenes(){
  if(typeof document==='undefined')return;
  await loadGroundArt();
  await Promise.all(PAINTED.map(async p=>{if(paintedImg.has(p.url))return;try{const img=new Image();img.src=new URL(p.url,document.baseURI).href;await img.decode();paintedImg.set(p.url,img);}catch{/* 없으면 그려서 쓴다 */}}));
  cache.clear();
}
const inPoly=(x:number,y:number,poly:ReadonlyArray<readonly [number,number]>)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i]!,[xj,yj]=poly[j]!;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
function paintedFor(kind:Kind,art=-1,place='',variantOnly=false,placeOnly=false){
  const ok=PAINTED.filter(p=>p.kinds.includes(kind)&&paintedImg.has(p.url)),mood=moodOf(place,kind);
  const variant=mood.weather==='rain'?'rain':mood.light==='night'?'night':mood.light==='day'?'day':undefined;
  if(variant){const themed=ok.find(p=>p.variant===variant&&p.places?.test(place))??ok.find(p=>p.variant===variant&&!p.places);if(themed)return themed;}
  if(variantOnly)return undefined;
  if(placeOnly)return ok.find(p=>!p.variant&&p.places?.test(place));
  return ok.find(p=>!p.variant&&p.places?.test(place))??ok.find(p=>!p.variant&&p.arts?.includes(art))??ok.find(p=>!p.variant&&!p.places);
}
function buildPainted(p:Painted,kind:Kind,place:string):IsoScene{
  const img=paintedImg.get(p.url)!,mood=moodOf(place,kind),k=W/p.w;
  const canvas=document.createElement('canvas');canvas.width=W*SS;canvas.height=H*SS;const g=canvas.getContext('2d')!;g.scale(SS,SS);g.imageSmoothingQuality='high';
  g.fillStyle='#120c08';g.fillRect(0,0,W,H);
  // 전투 인물·이동 효과보다 배경의 잔무늬가 먼저 튀지 않도록 레퍼런스 화면 수준으로 눌러 그린다.
  // 원본 자산은 보존하고 실제 무대에 합성할 때만 채도·대비와 미세 선명도를 낮춘다.
  g.save();g.filter='saturate(.72) contrast(.84) brightness(.93) blur(.45px)';
  if(p.sx!==undefined)g.drawImage(img,p.sx,p.sy!+p.cropTop,p.w,H/k,0,0,W,H);else g.drawImage(img,0,-p.cropTop*k,W,p.h*k);
  g.restore();
  g.fillStyle='rgba(104,99,88,.08)';g.fillRect(0,0,W,H);
  const grade=(color:string,op:GlobalCompositeOperation)=>{g.save();g.globalCompositeOperation=op;g.fillStyle=color;g.fillRect(0,0,W,H);g.restore();};
  if(!p.lit&&mood.light==='night'){grade('rgba(40,60,120,.58)','multiply');grade('rgba(255,190,110,.10)','screen');}
  if(!p.lit&&mood.light==='dawn')grade('rgba(170,180,230,.3)','multiply');
  if(!p.lit&&mood.light==='dusk')grade('rgba(255,150,80,.28)','multiply');
  // 원화 좌표 ↔ 무대 좌표
  const toWorld=([x,y]:[number,number]):[number,number]=>[x*k,(y-p.cropTop)*k];
  const B=toWorld(p.back),Rr=toWorld(p.right),n=(Rr[0]-B[0])/(TW/2),half=(Rr[1]-B[1])/n;
  // 이 원화의 격자: 칸 가로 TW, 세로는 원화 바닥 기울기를 따른다
  const ox=B[0],oy=B[1],th=half*2;
  const ptP=(c:number,r:number):[number,number]=>[ox+(c-r)*TW/2,oy+(c+r)*th/2];
  const toImg=([x,y]:[number,number]):[number,number]=>[x/k,y/k+p.cropTop];
  const passable=([c,r]:Cell)=>{const [x,y]=toImg(ptP(c+0.5,r+0.5));return inPoly(x,y,p.floor)&&!p.blocks.some(b=>inPoly(x,y,b));};
  const onScreen=([c,r]:Cell)=>{const [x,y]=ptP(c+0.5,r+0.5);return x>40&&x<W-40&&y>90&&y<H-20;};
  const standable=(c:Cell)=>passable(c)&&onScreen(c);
  const toPct=([c,r]:Cell):At=>{const [x,y]=ptP(c+0.5,r+0.5);return [x/W*100,y/H*100];};
  const toCell=([px,py]:At):Cell=>{const sx=px/100*W,sy=py/100*H,u=(sx-ox)/(TW/2),v=(sy-oy)/(th/2);const want:Cell=[Math.round((u+v)/2-0.5),Math.round((v-u)/2-0.5)];
    if(standable(want))return want;let best=want,bd=Infinity;
    // 대본 자리가 그림 위쪽(바닥 밖) 멀리 있으면 가까운 칸이 없을 수 있어 넓혀 찾는다
    for(const reach of [10,40])if(bd===Infinity)for(let c=want[0]-reach;c<=want[0]+reach;c++)for(let r=want[1]-reach;r<=want[1]+reach;r++){if(!standable([c,r]))continue;const [x,y]=ptP(c+0.5,r+0.5),d=(x-sx)**2+(y-sy)**2*2;if(d<bd){bd=d;best=[c,r];}}return best;};
  return {url:canvas.toDataURL('image/jpeg',0.9),toCell,toPct,standable,passable:(c:Cell)=>passable(c)||!onScreen(c),indoor:INDOOR.has(kind),fx:mood.fx,light:mood.light,figScale:p.figScale,...(p.sx!==undefined?{maxZoom:1.18}:{})};
}

// ─────────────────────────────────────────────── 위에서 본 야외(채색 지도)
const OUTDOOR=new Set<Kind>(['field','hill','valley','forest','river','bank','deck','camp','battlefield','town','fire','gatehouse','wall','fort','court']);
/** 장소 이름이 더 자세히 말하면 같은 종류 안에서도 다른 땅을 그린다(정원·고갯길·늪·논밭·옛터·숲속 빈터·저자·나루). */
export function groundVariant(kind:Kind,place:string):[GroundKind,GroundOpts]{
  const d=place.split('·').map(p=>p.trim()).at(-1)??'',snow=moodOf(place,kind).weather==='snow',camp=/진영|군영|야영|진채|진$|본진|군막|영채|진지/.test(d),o:GroundOpts={...(snow?{snow}:{}),...(camp?{camp}:{})};
  const v:GroundKind|undefined=
    /나루|포구|선착/.test(d)&&kind!=='deck'?'ferry':
    /갈대|늪|습지|소택|모래톱|여울목/.test(d)?'marsh':
    /무너진|폐허|옛터|허물어진|잿더미/.test(d)&&kind!=='camp'&&kind!=='tent'?'ruins':
    /정원|후원|연못|뒤뜰|사마가의 뜰|저택 뜰|불길이 지난 뜰/.test(d)?'garden':
    /고갯길|고개|산길|령$|갈림길|내리막|벼랑 위|산마루/.test(d)&&kind!=='camp'?'pass':
    /저자|시장|거리/.test(d)?'market':
    /마을|고향|농가|논|밭|곡창|둔전|전원/.test(d)?'farm':
    (kind==='forest'||kind==='camp')&&/숲|빈터/.test(d)||kind==='forest'&&/야영|진영|쉼터/.test(d)?'clearing':undefined;
  return [v??kind as GroundKind,o];
}
function groundScene(kind:Kind,seed:number,place:string,clearPct:readonly At[]):IsoScene|undefined{
  const mood=moodOf(place,kind),[gk,gopts]=groundVariant(kind,place);
  const cellOf=([px,py]:At):[number,number]=>[Math.max(0,Math.min(GW-1,Math.floor(px/100*GW))),Math.max(0,Math.min(GH-1,Math.floor(py/100*GH-.3)))];
  const ground=paintGround(gk,seed,mood.light==='night'?'night':mood.light==='dawn'?'dawn':mood.light==='dusk'?'dusk':'day',clearPct.map(cellOf),gopts);
  if(!ground)return undefined;
  const standable=([x,y]:Cell)=>ground.standable(x,y);
  const toPct=([x,y]:Cell):At=>[(x+.5)/GW*100,(y+.8)/GH*100];
  const toCell=(at:At):Cell=>{const want=cellOf(at);if(standable(want))return want;let best:Cell=want,bd=Infinity;
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){if(!standable([x,y]))continue;const d=(x-want[0])**2+((y-want[1])*1.5)**2;if(d<bd){bd=d;best=[x,y];}}return best;};
  void GC;
  return {url:ground.canvas.toDataURL('image/jpeg',0.9),toCell,toPct,standable,passable:(c:Cell)=>{const [x,y]=c;return x<0||y<0||x>=GW||y>=GH||standable(c);},indoor:false,fx:mood.fx,light:mood.light,figScale:.8,maxZoom:1};
}

// ─────────────────────────────────────────────── 장면 조립
function build(kind:Kind,seed:number,place='',clear:Set<string>=new Set(),artNo=-1):IsoScene{
  // 반복이 많은 군막·야외 진영·대전은 밤/비 전용 원화를 먼저 쓴다.
  const themed=paintedFor(kind,artNo,place,true);if(themed)return buildPainted(themed,kind,place);
  // 지역 이름이 지정된 신규 원화(남만·초원·설성·잔도·갑판)는 절차식 야외 지도보다 먼저 쓴다.
  const dedicated=paintedFor(kind,artNo,place,false,true);if(dedicated)return buildPainted(dedicated,kind,place);
  // 알현(옥좌) 장면은 자리 배치가 따로 있어 그린 배경을 쓴다.
  if(OUTDOOR.has(kind)){const t=groundScene(kind,seed,place,[...clear].map(k=>{const [c,r]=k.split(',').map(Number);return [((c!-r!)*TW/2+OX)/W*100,(OY+(c!+r!)*TH/2)/H*100] as At;}));if(t)return t;}
  if(kind!=='throne'){const p=paintedFor(kind,artNo,place);if(p)return buildPainted(p,kind,place);}
  const R=rng(seed),indoor=INDOOR.has(kind),mood=moodOf(place,kind);
  LIGHTS=[];SHAFTS=[];
  // 두 배 크기로 그린다(화면에서 다가가 보아도 또렷하게). 그리는 좌표는 그대로 W×H.
  const canvas=document.createElement('canvas');canvas.width=W*SS;canvas.height=H*SS;
  const g=canvas.getContext('2d')!;g.scale(SS,SS);g.imageSmoothingQuality='high';
  const floor:Floor=kind==='corridor'||kind==='throne'?'stone':kind==='palace'||kind==='home'?'wood':kind==='battlefield'?'dirt':kind==='tent'?'mat':kind==='store'?'wood':indoor?'wood':kind==='court'||kind==='town'?'dirt':kind==='gatehouse'||kind==='wall'||kind==='fire'?'paving':kind==='fort'?'dirt':kind==='deck'?'wood':kind==='bank'?'sand':kind==='valley'||kind==='camp'?'dirt':'grass';
  const props:Prop[]=[],waterCells=new Set<string>();
  const add=(p:Prop|null|false)=>{if(p)props.push(p);};
  /** 그린 조형물(없으면 대신 그린 것). */
  const addArt=(p:Prop|null,fallback?:()=>Prop)=>{if(p)props.push(p);else if(fallback)props.push(fallback());};
  // 소품 배치: 대본의 사람들은 대개 화면 가운데 아래에 서므로, 무거운 소품은 뒤쪽 가장자리에.
  switch(kind){
    case 'throne':
      // 알현: 정면 위에 옥좌, 화면 한가운데를 세로로 내려오는 붉은 길, 양옆에 등과 신하의 자리
      add(grandThrone(0.2,0.2));add(ceremonialFan(0.3,3.9));add(ceremonialFan(3.9,0.3));
      add(P(1.5,1.5,13,13,g=>{const A=pt(3.6,2.4),B=pt(15,13.8),C=pt(13.8,15),D=pt(2.4,3.6);poly(g,[A,B,C,D],'#9a1e16','#3a0806',1.5);
        const a=pt(3.75,2.75),b=pt(14.75,13.75),c2=pt(13.75,14.75),d=pt(2.75,3.75);poly(g,[a,b,c2,d],'rgba(0,0,0,0)','#d8a838',2);
        for(let t=5;t<=13;t+=4){const [x,y]=pt(t+0.5,t+0.5);g.strokeStyle='#d8a838';g.lineWidth=2;g.beginPath();g.ellipse(x,y,26,13,0,0,7);g.stroke();}},false));
      for(let k=3;k<=11;k+=4){add(lamp(k-2.4,k+4.4));add(lamp(k+4.4,k-2.4));}
      add(censer(2.2,4.4,R));add(censer(4.4,2.2,R));add(vase(0.6,6.4,'#c9952a'));add(vase(6.4,0.6,'#c9952a'));
      add(ding(0.4,4.6,R,0.9));add(ding(4.6,0.4,R,0.9));add(stoneLion(2.6,5.2,false,'#9a7e3e'));add(stoneLion(5.2,2.6,true,'#9a7e3e'));add(bonsai(0.5,9.4,R));add(bonsai(9.4,0.5,R));
      break;
    case 'home':
      add(rug(4.6,4.6,4.4,3.6,'#6a3a2a'));add(bed(0.4,2.2,R));add(wardrobe(5,0.3));add(screenPanel(8,0.35,2));add(teaSet(5.6,5.6));add(cushion(5,6.8,'#2a3a6a'));add(cushion(6.8,5,'#7a2a1c'));
      add(lamp(4.2,1.2));add(lamp(1.2,6.2));add(chest(0.5,8.2));add(bonsai(11,0.6,R));add(vase(10,0.6,'#2f5a6a'));add(shelf(0.35,10.5,2.4,R));add(censer(3.2,0.6,R));add(plant(0.5,13.6,R));
      break;
    case 'battlefield':
      add(barricade(1,7,4));add(barricade(7,1,4,false));add(arrows(5,9,R));add(arrows(9,5,R));add(arrows(7,11,R));add(debris(10,9,R));add(debris(3,12,R));add(smoke(12,4,R));add(smoke(2.5,3.5,R));
      add(banner(4,2,'#1f3f8a'));add(banner(2,4.5,'#1f3f8a'));add(banner(11.5,1.6,'#8a1f1a'));add(rock(12,11,R,0.6));add(bush(6,13,R));
      add(art(-3.2,1.2,1.4,1.4,3,300,false));add(art(14.4,-3.4,1.4,1.4,3,290,true,{dark:0.15}));add(art(-4,-4,2,2,4,330));add(art(6,-6,2,2,4,300,true));
      add(warDrum(3.4,6.4));add(torch(6.2,3.6,R));add(torch(3.6,9.4,R));add(art(-3.6,9.2,1.6,1.6,5,190,false));
      break;
    case 'palace':
      // 조회·군의의 대청: 가운데 통로, 양옆에 긴 탁자와 자리(초록 돗자리)가 늘어선다
      add(runner(5.6,2.8,2.2,12));add(throne(5.2,0.3));
      for(let i=0;i<3;i++){add(mat(2.4,3.6+i*3,2.4,1.6));add(lowTable(2.6,3.4+i*3,2,0.5,R));add(mat(8.8,3.6+i*3,2.4,1.6));add(lowTable(9,3.4+i*3,2,0.5,R));}
      add(lamp(4.6,1.2));add(lamp(8.6,1.2));add(censer(4.6,13.4,R));add(screenPanel(12.4,0.35,3));add(vase(0.6,0.6,'#c9952a'));add(plant(0.5,14.5,R));add(plant(14.5,0.5,R));add(armorStand(0.6,8.6));add(chest(13.5,6.2));
      add(ding(0.5,3.2,R,0.8));add(ding(3.2,0.5,R,0.8));add(bonsai(0.5,12,R));add(bonsai(12,0.5,R));
      break;
    case 'hall':case 'study':case 'corridor':
      add(rug(5,5,6,5,'#7a2a1c'));
      add(table(1.4,1.6,2.2,1.2,R));
      add(lamp(1.1,4.2));add(lamp(4.4,1.1));add(lamp(1.1,10.5));add(lamp(10.5,1.1));
      if(kind==='study'){add(shelf(0.35,6,3.2,R));add(shelf(0.35,12,3.2,R));add(screenPanel(7,0.35,3));}
      else add(screenPanel(13,0.35,3));
      add(cushion(2,3.2));add(cushion(3.2,3.2,'#2a3a6a'));add(vase(0.5,2.2));add(vase(2.4,0.5,'#8a3a2a'));add(censer(4.2,3.2,R));add(plant(0.5,14.5,R));add(plant(14.5,0.5,R));
      if(kind!=='study'){add(chest(11.5,0.5));add(armorStand(0.6,8.6));add(ding(0.5,6.4,R,0.7));}
      add(bonsai(8.6,0.5,R));add(bonsai(0.5,12.4,R));
      break;
    case 'tent':
      add(rug(4,4,6,5,'#5a3a22'));add(table(5.4,5.2,3,2,R));add(rack(0.4,3,3));add(brazier(1.4,9,R));add(brazier(9.5,1.4,R));add(banner(0.6,0.6,'#8a1f1a'));add(armorStand(3,0.6));add(chest(6,0.5));add(chest(0.5,12,'#4a3018'));add(cushion(4.6,6));add(cushion(8.6,6.4));add(barrel(12,0.6));add(warDrum(0.6,6.2));add(torch(3,9.6,R));add(torch(9.6,3,R));
      break;
    case 'store':
      for(let i=0;i<5;i++)add(crate(0.4+(i%2)*1.1,1.4+i*1.6,0.9));for(let i=0;i<4;i++)add(sacks(3+i*1.4,0.3,R));add(rack(10,0.4,3));add(lamp(6,6));for(let i=0;i<4;i++)add(barrel(13.5+(i%2)*0.6,0.4+Math.floor(i/2)*0.6));add(hay(2.6,9,R));add(chest(0.5,10.5,'#4a3018'));
      break;
    case 'court':
      add(pavilion(10.4,1.4,2.4));add(rockery(1,7.6,R,0.9));add(rockery(8.4,9.6,R,0.6));add(stele(6.6,0.8));add(stoneLion(0.6,4.2,false));add(stoneLion(4.2,0.6,true));add(bonsai(3,6,R));add(torch(12.6,6,R));
      add(stoneLantern(4.5,9));add(stoneLantern(9,4.5));add(tree(1.5,10,R,true,1.1));add(tree(10.5,1.6,R,true,1));add(bush(3,12,R));add(bush(12,3,R));add(pond(11.5,5.5,2.2,1.6,R));add(bamboo(0.5,13.5,R));add(bamboo(13.5,0.5,R));add(rock(9.8,7.8,R,0.5));add(pots(7.2,1.2));add(stoneBorder(1.2,4.6,4,R));add(stoneBorder(4.6,1.2,3.4,R,false));add(pots(0.6,7.4));
      break;
    case 'gatehouse':{
      // 성 안뜰: 뒤 두 면이 두꺼운 성벽(c·r<2.6), 오른쪽 성벽 c=6.2~8.6에 성문, 왼쪽 성벽에 오르는 계단
      add(P(6.25,2.6,2.3,12,g=>{const q=[pt(6.25,2.6),pt(8.55,2.6),pt(8.55,15),pt(6.25,15)];poly(g,q,'rgba(150,142,126,.55)');g.strokeStyle='rgba(60,54,44,.35)';g.lineWidth=1;for(let r=3;r<15;r+=0.6){g.beginPath();g.moveTo(...pt(6.25,r));g.lineTo(...pt(8.55,r));g.stroke();}},false));
      add(P(2.6,8,1.6,5.2,g=>wallStairs(g,2.6,8,CASTLE_H)));
      add(stoneLion(5,3,false));add(stoneLion(9,3,true));add(torch(5.6,3.1,R));add(torch(8.9,3.6,R));add(banner(3.3,3.3,'#1f3f8a'));add(banner(11.5,3.2,'#1f3f8a'));
      add(cart(11.2,5));add(rack(13.5,3.1,2.4));add(brazier(3.4,5.8,R));add(barrel(3.2,14.2));add(barrel(3.8,14.6));add(crate(4.4,14,0.8));add(firewood(14,4.4));add(stonePile(12.6,7.2,R));add(logPile(3.1,16));
      break;}
    case 'wall':
      // 성벽 위: 사람은 성 위 길에 선다. 뒤쪽은 성가퀴, 그 너머로 성 밖 들판. 문루와 각루, 지킬 채비(돌·통나무·노포)
      add(P(13,0.6,4,2.2,g=>tower(g,13,0.6,4,2.2,0,R,2,'성루')));
      add(stonePile(2,4,R));add(stonePile(4.6,1.4,R));add(logPile(1.2,7.4));add(ballista(6,1.2));add(ballista(1.2,10.6));add(warDrum(10.4,1.2));
      add(banner(1.1,3.2,'#1f3f8a'));add(banner(3.2,1.1,'#1f3f8a'));add(banner(1.1,13,'#1f3f8a'));add(banner(14.4,1.1,'#1f3f8a'));
      add(brazier(2.2,6.4,R));add(brazier(6.4,2.6,R));add(torch(1.2,15.4,R));add(arrows(3.6,3.6,R));add(arrows(1.4,12,R));add(debris(8.6,1.4,R));add(rack(1.1,16.6,2,));add(crate(11.8,2.8,0.8));
      break;
    case 'fort':
      // 산 위 보루: 돌 기단 위 목책, 모서리와 문 옆의 망루, 말막이 말뚝, 군막·장작
      add(watchTower(0.5,0.5,R));add(watchTower(10.5,0.5,R));add(chevalDeFrise(3,1.2,4.5));add(chevalDeFrise(1.2,4,4.5,false));
      addArt(art(12.6,2.4,2.4,2.4,5,210,true),()=>tent(12.6,2.4,2.4,2.4,'#ddd0b4'));add(banner(3.2,3.4,'#1f3f8a'));add(banner(8.4,1.6,'#1f3f8a'));add(torch(5.4,3.2,R));add(torch(2.6,9.4,R));add(warDrum(1.3,10.6));
      add(firewood(6.4,1.2));add(rack(1.2,13,2.2));add(crate(3.6,13.6,0.8));add(barrel(14,6.4));add(stonePile(7.4,3.2,R));add(campfire(9.6,9.2,R));
      break;
    case 'camp':
      addArt(art(0.6,1,3,3,5,250),()=>tent(0.6,1,3,3,'#e6dcc4'));addArt(art(5.6,0.4,2.6,2.6,5,220,true),()=>tent(5.6,0.4,2.6,2.6,'#ddd0b4'));addArt(art(0.4,6.4,2.6,2.6,5,220),()=>tent(0.4,6.4,2.6,2.6,'#e2d6bc'));addArt(art(9.6,-0.6,2.4,2.4,5,200,true),()=>tent(9.6,-0.6,2.4,2.4,'#d8c8a8'));
      add(art(-2,-2,1.6,1.6,3,330));add(warDrum(6.2,4.4));add(torch(4.8,5.6,R));add(torch(10.8,6.4,R));add(torch(4.4,12,R));add(banner(4.2,3.6,'#8a1f1a'));add(banner(3.6,10.2,'#1f3f8a'));add(campfire(8,8,R));add(rack(10.5,2.4,2.4));add(crate(4,9.5,0.8));add(barrel(4.8,9.8));add(hay(13,2.4,R));add(firewood(9,6.6));add(cart(0.6,10.6));add(armorStand(8.6,2.6));
      break;
    case 'fire':
      // 불타는 집: 지붕마루를 따라 큰 불길, 창마다 새어 나오는 불빛, 위로 솟는 검은 연기 기둥
      for(const [c0,r0,f] of [[0.6,0.2,false],[5.4,-1,true],[-1,5.2,false],[10.4,-1.2,true]] as const){const h=art(c0,r0,3,2,6,250,f,{dark:0.5});if(h){const base=h.draw;h.draw=g=>{base(g);
        const [hx,hy]=pt(c0+1.5,r0+1);
        for(let i=0;i<5;i++){g.fillStyle=`rgba(${30+i*6},${26+i*6},${26+i*6},${0.42-i*0.06})`;g.beginPath();g.ellipse(hx+i*14+(R()-0.5)*10,hy-210-i*38,30+i*10,18+i*5,0,0,7);g.fill();}
        for(let i=0;i<4;i++){const x=hx-60+i*40+(R()-0.5)*14,y=hy-150+Math.abs(i-1.5)*14;flame(g,x,y,20+R()*12,R);}
        for(let i=0;i<3;i++){const x=hx-50+i*48,y=hy-70;g.fillStyle='rgba(255,150,50,.85)';g.fillRect(x-6,y-10,12,12);flame(g,x,y,8,R);}};add(h);}}
      add(crate(5,9,0.8));add(rock(9,6,R,0.6));add(debris(3,7,R));add(debris(8,3,R));add(debris(11.5,8,R));add(smoke(6,1,R));
      // 땅에 떨어져 타는 들보·쓰러진 깃발·엎어진 수레
      for(const [c0,r0] of [[4,5],[10,10.5],[2.2,10]] as const)add(P(c0,r0,1.2,0.4,g=>{const a=pt(c0,r0+0.2),b=pt(c0+1.2,r0+0.2);g.strokeStyle='#2a1a10';g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(a[0],a[1]-5);g.lineTo(b[0],b[1]-5);g.stroke();g.lineCap='butt';g.strokeStyle='rgba(255,110,30,.8)';g.lineWidth=2;g.setLineDash([4,5]);g.beginPath();g.moveTo(a[0],a[1]-7);g.lineTo(b[0],b[1]-7);g.stroke();g.setLineDash([]);flame(g,(a[0]+b[0])/2,(a[1]+b[1])/2-6,10,R);},false));
      add(P(7.2,12,1,0.3,g=>{const [x,y]=pt(7.2,12.15);g.strokeStyle='#3a2410';g.lineWidth=3;g.beginPath();g.moveTo(x-30,y);g.lineTo(x+40,y-8);g.stroke();g.fillStyle='#6a1a12';g.beginPath();g.moveTo(x+6,y-4);g.lineTo(x+40,y-8);g.lineTo(x+44,y+10);g.lineTo(x+10,y+12);g.closePath();g.fill();g.fillStyle='rgba(240,210,150,.7)';g.font='bold 12px serif';g.fillText('한',x+20,y+6);},false));
      add(cart(12,4));
      break;
    case 'town':
      for(const [c0,r0,h,f] of [[0.4,-2.4,250,false],[5.6,-2.8,240,true],[11,-2.6,250,false],[-2.8,0.8,240,true],[-3,6.4,250,false]] as const)add(art(c0,r0,3,2.4,6,h,f));
      add(stele(13.6,6.8));add(torch(6,4,R));add(rockery(0.6,9,R,0.6));
      add(stall(1.2,7,R,'#9b2a1c'));add(stall(7,1.2,R,'#2a5a8a'));add(stall(1.2,11,R,'#3a7a3a'));add(well(9.5,9.5));add(crate(4,10.5,0.8));add(sacks(10.5,4,R));add(banner(5,0.8,'#8a1f1a'));add(barrel(12,1.2));add(cart(11,6));add(pots(3.4,6.6));add(stoneBorder(1,4.2,3,R));add(tree(13.4,2.6,R));add(bush(0.6,13,R));
      break;
    case 'deck':
      for(let c=-14;c<N+8;c++)for(let r=-14;r<N+8;r++)if(!(c>=0&&c<=15&&r>=3&&r<=14))waterCells.add(`${c},${r}`);
      add(mast(6,6.6));add(crate(1,4,0.8));add(crate(1,5,0.8));add(sacks(13,4,R));add(rack(10,3.1,2));
      break;
    case 'river':case 'bank':
      for(let c=-8;c<N+8;c++)for(let r=-8;r<N+8;r++){const band=kind==='river'?(r-c>=-1&&r-c<=3):(c+r>=4&&c+r<=7);if(band)waterCells.add(`${c},${r}`);}
      add(tree(12,1,R,false,0.9));add(rock(2,10,R,0.8));add(pine(13.5,3.5,R,0.9));add(art(-4,-3,2,2,4,300));add(pine(0.5,-1.5,R,0.8));
      if(kind==='bank'){add(boat(1,2.2));for(let i=0;i<6;i++)add(reeds(-1+i*1.6,8.1-i*1.6+0.0,R));
        // 나루: 물로 내민 판자 다리와 말뚝
        add(P(6.2,3.2,0.9,3.2,g=>{for(let k=0;k<6;k++){prism(g,6.2,3.2+k*0.55,0.9,0.5,6,'#7a5636',10);}for(const [dc,dr] of [[0,0],[0.8,0],[0,2.8],[0.8,2.8]] as const){prism(g,6.2+dc,3.2+dr,0.12,0.12,26,'#4a3020');}},false));
        add(rock(9,7.4,R,0.5));add(rock(2.4,5.8,R,0.4));add(art(-4,-3,2.2,2.2,4,320,true));add(pine(-1.5,1,R,0.8));add(torch(8.6,8.4,R));}
      else{for(let i=0;i<7;i++)add(reeds(2+i*1.5,7.2+i*1.5,R));add(rock(6,3.4,R,0.5));add(rock(9.6,8.6,R,0.6));add(tree(1.2,6,R,false,0.7));}
      break;
    case 'forest':
      // 오솔길(화면 가운데로 굽어 내려가는 흙길)을 두고 양옆에 나무가 빽빽이: 사람은 길 위에 선다
      // 그린 나무는 커서 길 양옆으로 물려 심고(사람을 가리지 않게), 뒤쪽엔 바위산
      for(let i=0;i<20;i++){const t=i/20,side=i%2?1:-1,base=-1+t*15,off=3.4+R()*3,c=base+(side>0?off:0),r=base+(side<0?off:0);
        add(i%3===0?pine(c,r,R,0.62+R()*0.2):tree(c,r,R,false,0.58+R()*0.2));}
      add(art(-4,-2,2,2,4,280));add(art(4,-6,2,2,4,260,true));
      for(let i=0;i<10;i++)add(fern(R()*14,R()*14,R));add(trunkLog(9.5,5.6));add(rock(4,8.5,R,0.5));add(bush(11,13,R));add(bush(13,11,R));
      break;
    case 'hill':case 'valley':
      for(let i=0;i<6;i++)add(rock(i<3?0.3+R():2+i*2.2,i<3?2+i*3:0.4+R(),R,0.8+R()*0.6));add(pine(12,1,R,1));add(pine(1,12,R,0.9));add(bush(7,11,R));add(bush(12.5,7,R));add(pine(4,0.6,R,0.8));add(rock(10,11,R,0.4));
      if(kind==='valley')for(let i=0;i<4;i++)add(rock(10+i,10-i*2,R,0.6));
      add(art(-3,-1,2,2,4,320));add(art(8,-5,2.4,2.4,4,360,true));if(kind==='valley'){add(art(-5,6,2,2,4,340,true));add(art(13,-4,2,2,4,300));}
      break;
    default:
      add(tree(1,10,R));add(tree(10,1,R));add(pine(13,2,R));add(rock(4,12,R,0.5));add(bush(12,9,R));add(fence(2,4,3));add(art(-3,-2,2,2,4,300));add(tree(4,-1,R,false,0.9));add(stele(13,8));
  }
  // ── 그리기
  g.fillStyle=indoor?'#1a120c':'#2a3420';g.fillRect(0,0,W,H);
  if(indoor)indoorWalls(g,kind,R);
  if(kind==='wall')distantLand(g,R,true);
  const lo=indoor||kind==='wall'?0:-14,hi=N+8;
  // 흙·풀·모래는 칸 무늬 없이 한 장으로 깔고(얼룩으로 질감), 물·판자·돌만 칸으로
  const natural=floor==='grass'||floor==='dirt'||floor==='sand';
  if(natural){g.fillStyle=FLOOR[floor];g.fillRect(0,0,W,H);}
  for(let s=lo*2;s<=hi*2;s++)for(let c=lo;c<=hi;c++){const r=s-c;if(r<lo||r>hi)continue;
    if(waterCells.has(`${c},${r}`)){if(!natural)floorTile(g,c,r,floor,R);}else if(!natural)floorTile(g,c,r,floor,R);}
  const cellAt=(x:number,y:number):Cell=>{const u=(x-OX)/(TW/2),v=(y-OY)/(TH/2);return [Math.floor((u+v)/2),Math.floor((v-u)/2)];};
  scatterGround(g,floor,R,(x,y)=>{const [c,r]=cellAt(x,y);return waterCells.has(`${c},${r}`)||(indoor&&(c<0||r<0));});
  if(waterCells.size)smoothWater(g,waterCells,lo,hi,R,kind==='deck');
  if(kind==='court')flagWalk(g,4.7,4.3,14,R);
  if(kind==='forest'||kind==='battlefield'||kind==='field'||kind==='hill'||kind==='valley'){
    // 흙길: 화면 위에서 아래로 굽은 길
    const o=document.createElement('canvas');o.width=W;o.height=H;const og=o.getContext('2d')!;og.strokeStyle=kind==='battlefield'?'#7a6444':'#9a7a50';og.lineWidth=kind==='battlefield'?150:110;og.lineCap='round';
    og.beginPath();og.moveTo(W*0.52,-20);og.bezierCurveTo(W*0.38,H*0.35,W*0.62,H*0.6,W*0.48,H+20);og.stroke();
    if(kind==='battlefield'){og.lineWidth=60;og.strokeStyle='#5a4a34';og.beginPath();og.moveTo(-20,H*0.7);og.bezierCurveTo(W*0.3,H*0.55,W*0.7,H*0.75,W+20,H*0.5);og.stroke();}
    g.save();g.filter='blur(8px)';g.globalAlpha=0.85;g.drawImage(o,0,0);g.restore();
    for(let i=0;i<220;i++){const x=W*0.4+(R()-0.5)*W*0.3,y=R()*H;g.fillStyle=R()<0.5?'rgba(60,40,20,.4)':'rgba(220,200,160,.3)';g.fillRect(x,y,2,1.5);}
  }
  if(indoor){
    // 벽 밑 그늘
    for(const side of ['left','right'] as const){const A=pt(0,0),B=side==='left'?pt(0,N):pt(N,0),C=side==='left'?pt(1.1,N):pt(N,1.1),D=side==='left'?pt(1.1,0):pt(0,1.1);
      const grd=g.createLinearGradient(...A,...(side==='left'?pt(1.1,0):pt(0,1.1)));grd.addColorStop(0,'rgba(0,0,0,.45)');grd.addColorStop(1,'rgba(0,0,0,0)');poly(g,[A,B,C,D],'rgba(0,0,0,0)');g.fillStyle=grd;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.lineTo(...C);g.lineTo(...D);g.closePath();g.fill();}
    // 창으로 드는 빛(바닥에 비스듬한 빛 기둥)
    if(mood.light!=='night')for(const sh of SHAFTS){const len=4.2,q=sh.side==='left'?[pt(0,sh.t1),pt(0,sh.t2),pt(len,sh.t2+1.2),pt(len,sh.t1+1.2)]:[pt(sh.t1,0),pt(sh.t2,0),pt(sh.t2+1.2,len),pt(sh.t1+1.2,len)];
      const grd=g.createLinearGradient(...q[0]!,...q[3]!);grd.addColorStop(0,'rgba(255,226,160,.28)');grd.addColorStop(1,'rgba(255,226,160,0)');g.save();g.globalCompositeOperation='lighter';g.fillStyle=grd;g.beginPath();q.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();g.restore();}
  }
  // 바깥 장면의 뒤쪽 경계(담·목책·성벽·건물)
  if(kind==='court'){edgeWall(g,'left',0,N,70,'#d8d0bc',false,'#2e3a40');edgeWall(g,'right',0,N,70,'#d8d0bc',false,'#2e3a40');hallFacade(g,1,1,6,3,'#c9b9a0');}
  if(kind==='gatehouse'){
    cityWall(g,'r',-3,N,-3,2.6,CASTLE_H,R);cityWall(g,'c',-3,N,-3,2.6,CASTLE_H,R);
    archGate(g,2.6,6.2,2.4,150);
    tower(g,-2.2,-2.2,3.4,3.4,CASTLE_H,R,1);tower(g,5.4,-1.6,4,3.6,CASTLE_H,R,2,'성문');
    // 성 위의 깃발 줄
    for(const t of [11,14,17])drawFlagPole(g,up(pt(t,2.2),CASTLE_H),FLAG.color);for(const t of [5,9,13])drawFlagPole(g,up(pt(2.2,t),CASTLE_H),FLAG.color);
  }
  if(kind==='wall'){
    merlons(g,'r',-0.45,0,N,0,R,46,0.45);merlons(g,'c',-0.45,0,N,0,R,46,0.45);
    siegeLadder(g,'c',-0.45,5.2,0);siegeLadder(g,'r',-0.45,7.4,0);siegeLadder(g,'c',-0.45,15.4,0);
    tower(g,-1.4,-1.4,2.4,2.4,0,R,1);
  }
  if(kind==='fort'){stakeWall(g,'r',-0.5,0,N,46,R);stakeWall(g,'c',-0.5,0,N,46,R);
    // 통나무 문(오른쪽 목책)
    {const a=pt(5.2,0),b=pt(7.4,0);poly(g,[up(a,46),up(b,46),up(b,150),up(a,150)],'#3a2614','#1a0e06',2);for(let t=0.06;t<1;t+=0.11){const p=lerp2(a,b,t);g.strokeStyle='#5a3a20';g.lineWidth=7;g.beginPath();g.moveTo(...up(p,48));g.lineTo(...up(p,148));g.stroke();}
      g.strokeStyle='#2a1a0c';g.lineWidth=5;for(const z of [70,125]){g.beginPath();g.moveTo(...up(a,z));g.lineTo(...up(b,z));g.stroke();}}
  }
  if(kind==='camp'){palisade(g,'left',0,N);palisade(g,'right',0,N);}
  if(kind==='battlefield'){
    // 양군의 대열: 왼쪽 위는 아군(푸른 깃), 오른쪽 위는 적군(붉은 깃)
    const troop=(c0:number,r0:number,name:string,look:Look,dir:PxDir,flip:boolean)=>{for(let i=0;i<4;i++)for(let k=0;k<3;k++){const [x,y]=pt(c0+i*0.7,r0+k*0.7);person(g,x,y,name,look,dir,'stand',flip);}};
    troop(-1.5,4.5,'위군 창병','spear','front',false);troop(-1.2,8.6,'위군 궁병','archer','front',false);
    troop(5.2,-1.6,'적군 창병 붉은','spear','front',true);troop(9.4,-1.4,'적군 보병 붉은','infantry','front',true);
  }
  if(kind==='town'&&!SPRITES){thatchedHouse(g,0.4,-2.4,4,2,R);thatchedHouse(g,5.6,-2.6,3,2,R);thatchedHouse(g,-2.6,0.6,2,4,R);thatchedHouse(g,-2.8,6,2,3,R);thatchedHouse(g,10,-2.4,4,2,R);}
  if(kind==='deck'){for(let c=0;c<=15;c++){prism(g,c,2.85,1,0.15,18,'#5a3a1e');}for(let r=3;r<=14;r++)prism(g,-0.15,r,0.15,1,18,'#5a3a1e');}
  if(kind==='fire'&&!SPRITES){burningHouse(g,0.6,0.6,R);burningHouse(g,5,-0.6,R);burningHouse(g,-0.6,5,R);burningHouse(g,10,-0.6,R);}
  // 소품을 깊이 순서로(뒤 → 앞)
  // 사람이 설 자리(와 바로 옆)를 덮는 소품은 뺀다. 나무는 잎 뒤쪽 칸까지 따진다. 옥좌처럼 장면의 뼈대인 것은 남긴다.
  if(clear.size){const near=new Set<string>();for(const k of clear){const [c,r]=k.split(',').map(Number) as [number,number];for(let dc=-1;dc<=1;dc++)for(let dr=-1;dr<=1;dr++)near.add(`${c+dc},${r+dr}`);}
    for(let i=props.length-1;i>=0;i--){const p=props[i]!;if(!p.solid||p.keep)continue;let hitP=false;
      for(let c=Math.floor(p.c);c<Math.ceil(p.c+p.w)&&!hitP;c++)for(let r=Math.floor(p.r);r<Math.ceil(p.r+p.d)&&!hitP;r++){
        if(near.has(`${c},${r}`))hitP=true;
        if(p.canopy)for(const [dc,dr] of CANOPY_BEHIND)if(clear.has(`${c+dc},${r+dr}`))hitP=true;}
      if(hitP)props.splice(i,1);}}
  props.sort((a,b)=>(a.c+a.r+(a.w+a.d)/2)-(b.c+b.r+(b.w+b.d)/2));
  if(kind==='throne'){
    // 바깥 줄에 늘어선 문무백관(배경 인물): 왼쪽 문관, 오른쪽 무관이 길을 향해 선다
    for(let k=3;k<=8;k++){let [x,y]=pt(k+0.5,k+5.5);person(g,x,y,'문관 '+k,'civil','front',k%3?'stand':'bow',false);[x,y]=pt(k+5.5,k+0.5);person(g,x,y,'무관 '+k,'heavy','front',k%3?'stand':'bow',true);}
    for(const [c0,r0,f] of [[3.2,0.6,true],[0.6,3.2,false]] as const){const [x,y]=pt(c0,r0);person(g,x,y,'금군 위사','spear','front','stand',f);}
  }
  // 소품 그림자(빛은 왼쪽 위에서): 먼저 모두 깔고 소품을 올린다
  {const sh=document.createElement('canvas');sh.width=W;sh.height=H;const o=sh.getContext('2d')!;o.fillStyle='rgba(0,0,0,.32)';
    for(const p of props){if(!p.solid)continue;const [x,y]=pt(p.c+p.w/2+0.25,p.r+p.d/2+0.25);o.beginPath();o.ellipse(x,y,(p.w+p.d)*TW/4+6,(p.w+p.d)*TH/4+4,0,0,7);o.fill();}
    g.save();g.filter='blur(6px)';g.drawImage(sh,0,0);g.restore();}
  props.forEach(p=>p.draw(g));
  if(kind==='deck'){for(let c=0;c<=15;c++)prism(g,c,15,1,0.15,18,'#5a3a1e');for(let r=3;r<=14;r++)prism(g,16,r,0.15,1,18,'#5a3a1e');}
  // 빛과 공기
  const vg=g.createRadialGradient(W/2,H*0.6,H*0.3,W/2,H*0.6,H*0.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,indoor?'rgba(10,6,2,.55)':'rgba(5,10,5,.35)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  if(kind==='fire'){g.fillStyle='rgba(120,30,10,.18)';g.fillRect(0,0,W,H);for(let i=0;i<6;i++){g.fillStyle='rgba(30,25,25,.25)';g.beginPath();g.ellipse(R()*W,R()*H*0.4,120,50,0,0,7);g.fill();}}
  if(kind==='camp'||kind==='bank'){g.fillStyle='rgba(255,200,140,.07)';g.fillRect(0,0,W,H);}
  // 칠한 그림처럼: 살짝 흐리고(붓 자국), 따뜻한 빛을 얹는다
  {g.save();g.globalCompositeOperation='soft-light';g.fillStyle='rgba(255,214,160,.35)';g.fillRect(0,0,W,H);g.restore();}
  grain(g,R,0.07);
  // 때와 날씨: 장소 이름의 밤·새벽·저녁·비·눈·안개
  const grade=(color:string,op:GlobalCompositeOperation)=>{g.save();g.globalCompositeOperation=op;g.fillStyle=color;g.fillRect(0,0,W,H);g.restore();};
  if(mood.light==='night'){grade('rgba(40,60,120,.62)','multiply');grade('rgba(10,16,40,.25)','source-over');}
  if(mood.light==='dawn'){grade('rgba(170,180,230,.35)','multiply');grade('rgba(255,190,170,.08)','screen');}
  if(mood.light==='dusk'){grade('rgba(255,150,80,.32)','multiply');grade('rgba(255,170,90,.1)','screen');}
  if(mood.weather==='rain'){grade('rgba(120,130,140,.35)','multiply');for(let i=0;i<400;i++){const x=R()*W,y=R()*H;g.strokeStyle='rgba(200,215,230,.25)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x-4,y+14);g.stroke();}
    for(let i=0;i<14;i++){const x=R()*W,y=H*0.3+R()*H*0.7;g.fillStyle='rgba(150,170,190,.25)';g.beginPath();g.ellipse(x,y,20+R()*30,6+R()*6,0,0,7);g.fill();}}
  if(mood.weather==='snow'){for(let i=0;i<60;i++){const x=R()*W,y=R()*H;g.fillStyle='rgba(245,248,255,.55)';g.beginPath();g.ellipse(x,y,20+R()*50,6+R()*16,0,0,7);g.fill();}grade('rgba(200,210,235,.18)','screen');}
  if(mood.weather==='fog'){const grd=g.createLinearGradient(0,0,0,H);grd.addColorStop(0,'rgba(220,225,230,.45)');grd.addColorStop(1,'rgba(220,225,230,.08)');g.fillStyle=grd;g.fillRect(0,0,W,H);}
  // 모아 둔 빛(등불·화로·불길·창)
  const boost=mood.light==='night'?1.3:mood.light==='dusk'?1.15:1;
  for(const [x,y,rad,color,alpha] of LIGHTS!)lightNow(g,x,y,rad,color,Math.min(0.75,alpha*boost));
  LIGHTS=null;
  // ── 걸을 수 있는 칸
  const blocked=new Set<string>();
  for(const p of props)if(p.solid)for(let c=Math.floor(p.c);c<Math.ceil(p.c+p.w);c++)for(let r=Math.floor(p.r);r<Math.ceil(p.r+p.d);r++){blocked.add(`${c},${r}`);
    // 나무 잎 뒤에 사람이 서면 잎 위에 그려지므로, 줄기 뒤쪽 칸도 비워 둔다
    if(p.canopy)for(const [dc,dr] of CANOPY_BEHIND)blocked.add(`${c+dc},${r+dr}`);}
  for(const k of waterCells)blocked.add(k);
  const minEdge=kind==='gatehouse'?3:indoor?1:kind==='camp'||kind==='court'||kind==='wall'||kind==='fort'?1:-6;
  const passable=([c,r]:Cell)=>!blocked.has(`${c},${r}`)&&c>=minEdge&&r>=minEdge;
  // 돌려주는 함수들은 이 장면의 원점을 붙들어 둔다(다른 장면을 만들면 OY가 바뀐다)
  const oy=OY,ptL=(c:number,r:number):[number,number]=>[OX+(c-r)*TW/2,oy+(c+r)*TH/2];
  const onScreen=([c,r]:Cell)=>{const [x,y]=ptL(c+0.5,r+0.5);return x>56&&x<W-56&&y>Math.max(oy+(indoor||kind==='wall'?60:150),120)&&y<H-24;};
  const standable=(cell:Cell)=>passable(cell)&&onScreen(cell);
  const toPct=([c,r]:Cell):At=>{const [x,y]=ptL(c+0.5,r+0.5);return [x/W*100,y/H*100];};
  const toCell=([px,py]:At):Cell=>{
    const sx=px/100*W,sy=py/100*H,u=(sx-OX)/(TW/2),v=(sy-oy)/(TH/2);
    const want:Cell=[Math.round((u+v)/2-0.5),Math.round((v-u)/2-0.5)];
    if(standable(want))return want;
    let best=want,bd=Infinity;
    for(let c=want[0]-10;c<=want[0]+10;c++)for(let r=want[1]-10;r<=want[1]+10;r++){if(!standable([c,r]))continue;const [x,y]=ptL(c+0.5,r+0.5),d=(x-sx)**2+(y-sy)**2*2;if(d<bd){bd=d;best=[c,r];}}
    return best;
  };
  // 옥좌(1,1)는 화면 가운데 위, 아뢰는 자리(6,6)는 길 한가운데, 신하 줄은 길 양옆(c−r=±3)
  const layout=kind==='throne'?{seat:[1,1] as Cell,front:[6,6] as Cell,rows:[[4,7],[7,4],[6,9],[9,6],[8,11],[11,8],[10,13],[13,10],[5,8],[8,5]] as Cell[]}:undefined;
  if(layout){blocked.delete('1,1');}
  // 꼭 화면에 담을 곳(성문 위 문루의 아래·망루): 카메라가 너무 다가가지 않게
  const pct=([x,y]:[number,number]):At=>[x/W*100,y/H*100];
  const focus:At[]|undefined=kind==='gatehouse'?[pct(up(pt(7.4,2.6),CASTLE_H+30)),pct(pt(7.4,2.6))]:kind==='wall'?[pct(up(pt(0,3),90)),pct(up(pt(3,0),90))]:kind==='fort'?[pct(up(pt(1.2,1.9),120))]:undefined;
  return {url:canvas.toDataURL('image/jpeg',0.9),toCell,toPct,standable,passable,indoor,fx:mood.fx,light:mood.light,...(focus?{focus}:{}),...(layout?{layout}:{})};
}

/** 칸에서 칸으로 가는 걸음들. 조조전처럼 한 축을 먼저 걷고 꺾는다(막히면 돌아간다). */
export function stepsBetween(scene:IsoScene,from:Cell,to:Cell,taken:(c:Cell)=>boolean):Cell[]{
  const ok=(c:Cell)=>(c[0]===to[0]&&c[1]===to[1])||(scene.passable(c)&&!taken(c));
  const line=(a:Cell,axis:0|1):Cell[]|undefined=>{const out:Cell[]=[];let cur:Cell=a;
    for(const ax of axis===0?[0,1] as const:[1,0] as const){while(cur[ax]!==to[ax]){const n:[number,number]=[cur[0],cur[1]];n[ax]+=Math.sign(to[ax]-cur[ax]);cur=n;if(!ok(cur)&&!(cur[0]===to[0]&&cur[1]===to[1]))return undefined;out.push(cur);}}
    return out;};
  const dc=Math.abs(to[0]-from[0]),dr=Math.abs(to[1]-from[1]);
  const direct=line(from,dc>=dr?0:1)??line(from,dc>=dr?1:0);if(direct)return direct;
  // 너비 우선 탐색(가까운 범위)
  const key=(c:Cell)=>`${c[0]},${c[1]}`,prev=new Map<string,Cell|null>([[key(from),null]]),q:Cell[]=[from];
  while(q.length){const cur=q.shift()!;if(cur[0]===to[0]&&cur[1]===to[1])break;
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]] as const){const n:Cell=[cur[0]+a,cur[1]+b];if(prev.has(key(n))||Math.abs(n[0]-from[0])+Math.abs(n[1]-from[1])>40||!ok(n))continue;prev.set(key(n),cur);q.push(n);}}
  // 닿을 길이 없으면(강 건너 등) 그냥 곧장 걸어간다(물을 건너는 것처럼).
  if(!prev.has(key(to))){const out:Cell[]=[];let [c,r]=from;while(c!==to[0])out.push([c+=Math.sign(to[0]-c),r]);while(r!==to[1])out.push([c,r+=Math.sign(to[1]-r)]);return out;}
  const path:Cell[]=[];for(let c:Cell|null=to;c&&!(c[0]===from[0]&&c[1]===from[1]);c=prev.get(key(c))??null)path.unshift(c);
  return path;
}
/** 화면 가로로 걸어 들어오고 나가는 바깥 칸(같은 높이에서 화면 밖까지). */
export function offscreenCell(cell:Cell,side:'left'|'right'):Cell{
  let [c,r]=cell;for(let i=0;i<40;i++){const [x]=pt(c+0.5,r+0.5);if(side==='left'?x<-70:x>W+70)break;if(side==='left'){if(i%2)r++;else c--;}else{if(i%2)c++;else r--;}}
  return [c,r];
}

/** 목록 썸네일·정비 화면 배경용(장소 이름 없이 종류별로 한 장). */
export function isoBackdrop(art:number,place=''){return `background-image:url(${isoScene(art,place).url});background-size:cover;background-position:center 70%`;}
