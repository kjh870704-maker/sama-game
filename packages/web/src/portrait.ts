/**
 * 장수 초상 — 초한지(항우·유방·장량)의 옛 인물화처럼 그린다.
 *
 * 누렇게 바랜 비단 바탕에, 먹선으로 윤곽을 뜨고 석채(주사·석청·석록·황토)로 평평하게 칠한 반신상.
 * 한나라 관모(진현관·유씨관·패왕 투구·무변·책)와 교령(옷깃을 여민) 포, 찰갑, 가늘고 긴 수염,
 * 오른쪽 위 제첨(이름을 세로로 쓴 띠)과 붉은 낙관까지 넣어 족자에 걸린 옛 초상처럼 보이게 한다.
 * 그림은 고르는 값(PortraitSpec)만 저장하고 화면에 낼 때 그린다(같은 값·이름은 한 번만).
 */
import type {UnitClass} from '../../core/src/index.ts';
import type {Temper} from './duel.ts';

export const PORTRAIT_PARTS={
  face:['갸름한','긴','각진','둥근'],
  skin:['밝은','보통','볕에 그은','짙은'],
  eyes:['봉황눈','차분한','부리부리한','가는','부드러운'],
  brows:['굵은','가는','치켜올린','찌푸린'],
  mouth:['다문','엷은 미소','굳게 다문','웃는'],
  beard:['없음','콧수염','턱수염','구레나룻','긴 수염'],
  hair:['검은','갈색','희끗한','흰'],
  hat:['상투와 비녀','진현관','패왕 투구','붉은 무변','검은 책(두건)','여인 쌍환계','풀어 내린 머리','유씨관(죽피관)'],
  robe:['석청(남)','주사(적)','석록(청록)','먹(흑)','자','황토','소(백)'],
  armor:['없음','찰갑','가죽 갑옷','금빛 명광개'],
  item:['없음','깃털 부채','검','창','죽간','활'],
  bg:['누런 비단','푸른 비단','먹빛 비단','붉은 바탕','옥색 바탕'],
  age:['젊은','장년','노년'],
  mark:['없음','뺨 흉터','눈 흉터','거친 수염 자국'],
} as const;
export type PortraitPart=keyof typeof PORTRAIT_PARTS;
export type PortraitSpec=Record<PortraitPart,number>;
export const PORTRAIT_KEYS=Object.keys(PORTRAIT_PARTS) as PortraitPart[];

/** 저장된 초상 값 정리(범위 밖·없는 값은 0). */
export function readPortrait(raw:unknown):PortraitSpec|undefined{
  if(!raw||typeof raw!=='object')return undefined;const r=raw as Record<string,unknown>,out={} as PortraitSpec;
  for(const k of PORTRAIT_KEYS){const v=r[k],n=PORTRAIT_PARTS[k].length;out[k]=Number.isInteger(v)&&(v as number)>=0&&(v as number)<n?v as number:0;}
  return out;
}
const hashName=(s:string)=>{let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
const MARTIAL=new Set(['infantry','spearman','cavalry','heavyCav','horseArcher','bandit','archer','crossbow','assassin']);
/** 이름·병종·성격으로 어울리는 초상을 지어 준다(무작위의 씨앗은 이름). */
export function suggestPortrait(name:string,unitClass:UnitClass|string,temper:Temper|string,salt=0):PortraitSpec{
  let h=hashName(name+'#'+salt);const pick=(n:number)=>{h=Math.imul(h^(h>>>15),2246822519)>>>0;return h%n;};
  const martial=MARTIAL.has(unitClass),mage=['taoist','fengshui','monk'].includes(String(unitClass));
  const s:PortraitSpec={face:pick(4),skin:martial?1+pick(3):pick(3),eyes:pick(5),brows:pick(4),mouth:pick(4),beard:pick(5),hair:pick(10)<8?0:1+pick(3),
    hat:martial?[2,2,3,6,0][pick(5)]!:mage?[6,4][pick(2)]!:[1,4,0,7][pick(4)]!,robe:pick(7),armor:martial?1+pick(3):0,item:0,bg:pick(5),age:pick(10)<6?0:pick(10)<8?1:2,mark:martial&&pick(4)===0?1+pick(3):0};
  if(temper==='reckless'||temper==='brave'){s.eyes=2;s.brows=pick(2)?0:3;s.mouth=2;}
  if(temper==='wise'||temper==='calm'){s.eyes=1;s.brows=1;s.mouth=1;}
  if(temper==='proud'){s.eyes=0;s.brows=2;}
  if(temper==='timid'){s.eyes=4;s.brows=1;s.mouth=0;}
  if(s.age===2&&s.hair<2)s.hair=2+pick(2);
  s.item=unitClass==='strategist'||unitClass==='fengshui'?1+pick(2)*3:['archer','crossbow','horseArcher'].includes(String(unitClass))?5:['spearman'].includes(String(unitClass))?3:martial?2:pick(2)?4:0;
  return s;
}

// ─────────────────────────────────────────────── 그리기
type G=CanvasRenderingContext2D;
const S=256,CX=124;
/** 먹 */
const INK='#22160e';
/** 살빛: 바탕·그늘·윤곽 */
const SKIN:Array<[string,string,string]>=[['#f3dfc6','#e2bfa0','#9a6a4e'],['#ebcfaf','#d6ad88','#8e5e42'],['#dcb890','#c49870','#7a4e34'],['#bf9470','#a47852','#5e3a24']];
const HAIR:Array<[string,string]>=[['#1c1612','#3c3028'],['#3a281a','#6a4e34'],['#6a6660','#a29e96'],['#cfcac0','#f4f0e8']];
/** 석채: 바탕색·짙은 색·옷깃 띠 */
const ROBE:Array<[string,string,string]>=[['#4e6e96','#2c4466','#c8a24a'],['#b4553a','#7a2e1c','#2a2a2a'],['#5f9478','#35624c','#b8402a'],['#3c3632','#1c1816','#b8402a'],['#7e5684','#4e2e56','#d8b860'],['#c09a52','#86662a','#3c5a7a'],['#ece2cc','#b8aa8c','#3c3632']];
/** 비단 바탕: 밝은 곳·어두운 곳 */
const SILK:Array<[string,string]>=[['#e2cfa2','#a88a58'],['#c9d0bc','#7e8a74'],['#b8aa90','#5e5242'],['#d9b49a','#93604a'],['#cfdcc4','#86a08a']];

function rng(seed:number){let a=seed>>>0||1;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const mix=(hex:string,a:number)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};
const lin=(g:G,x0:number,y0:number,x1:number,y1:number,stops:Array<[number,string]>)=>{const gr=g.createLinearGradient(x0,y0,x1,y1);for(const [o,c] of stops)gr.addColorStop(o,c);return gr;};
/** 먹선: 모양을 칠하고(있으면) 먹으로 윤곽을 뜬다. */
function shape(g:G,path:()=>void,fill:string|CanvasGradient|undefined,w=1.6,ink=INK){g.beginPath();path();if(fill){g.fillStyle=fill;g.fill();}if(w>0){g.strokeStyle=ink;g.lineWidth=w;g.stroke();}}
/** 붓선 하나: 굵은 심에 엷은 번짐을 겹쳐 붓맛을 낸다. */
function stroke(g:G,pts:Array<[number,number]>,w:number,color=INK){
  for(let k=0;k<3;k++){g.strokeStyle=color;g.globalAlpha=k===0?1:.3;g.lineWidth=Math.max(.5,w*(1+k*.5));g.beginPath();g.moveTo(pts[0]![0],pts[0]![1]);
    if(pts.length===3)g.quadraticCurveTo(pts[1]![0],pts[1]![1],pts[2]![0],pts[2]![1]);else for(const p of pts.slice(1))g.lineTo(p[0],p[1]);g.stroke();if(k===0)g.globalAlpha=.3;}
  g.globalAlpha=1;
}

interface Face {cx:number;cy:number;rx:number;ry:number;jaw:number;top:number;bot:number;eyeY:number;fx:number}
function faceOf(s:PortraitSpec):Face{
  const f=[{rx:33,ry:42,jaw:.55},{rx:31,ry:46,jaw:.5},{rx:36,ry:41,jaw:.85},{rx:37,ry:40,jaw:.72}][s.face]!;
  const cy=114;return {...f,cx:CX,cy,top:cy-f.ry,bot:cy+f.ry,eyeY:cy-4,fx:CX-3};
}
function facePath(g:G,f:Face){
  const {cx,cy,rx,ry,jaw,top,bot}=f;
  g.moveTo(cx-rx,cy-8);g.bezierCurveTo(cx-rx,top-4,cx+rx,top-4,cx+rx,cy-8);
  g.bezierCurveTo(cx+rx+1,cy+ry*.35,cx+rx*jaw+3,bot-8,cx+2,bot);g.bezierCurveTo(cx-rx*jaw-3,bot-8,cx-rx-1,cy+ry*.35,cx-rx,cy-8);g.closePath();
}

/** 바랜 비단: 얼룩·결·접힌 자국. */
function silk(g:G,s:PortraitSpec,R:()=>number){
  const [l,d]=SILK[s.bg]!;
  const gr=g.createRadialGradient(CX,110,20,CX,128,200);gr.addColorStop(0,l);gr.addColorStop(1,d);g.fillStyle=gr;g.fillRect(0,0,S,S);
  for(let i=0;i<26;i++){g.fillStyle=mix(R()<.5?'#5a3c1c':'#fff4d8',.04+R()*.06);g.beginPath();g.ellipse(R()*S,R()*S,10+R()*40,6+R()*30,R()*3,0,7);g.fill();}
  g.lineWidth=.6;for(let i=0;i<180;i++){const v=R()<.6;g.strokeStyle=mix(R()<.5?'#3a2410':'#fff8e0',.05+R()*.05);g.beginPath();if(v){const x=R()*S;g.moveTo(x,0);g.lineTo(x+R()*2-1,S);}else{const y=R()*S;g.moveTo(0,y);g.lineTo(S,y+R()*2-1);}g.stroke();}
  for(const y of [60+R()*30,176+R()*30]){g.strokeStyle='rgba(60,36,16,.12)';g.lineWidth=2;g.beginPath();g.moveTo(0,y);g.lineTo(S,y+4*(R()-.5));g.stroke();g.strokeStyle='rgba(255,246,220,.12)';g.lineWidth=1;g.beginPath();g.moveTo(0,y+2);g.lineTo(S,y+2);g.stroke();}
}
function hairBack(g:G,s:PortraitSpec,f:Face){
  if(s.hat!==5&&s.hat!==6)return;const [d,l]=HAIR[s.hair]!;
  shape(g,()=>{g.moveTo(f.cx-f.rx-6,f.cy-20);g.bezierCurveTo(f.cx-f.rx-20,f.cy+40,f.cx-f.rx-26,f.cy+100,f.cx-f.rx-14,S);g.lineTo(f.cx+f.rx+14,S);g.bezierCurveTo(f.cx+f.rx+26,f.cy+100,f.cx+f.rx+20,f.cy+40,f.cx+f.rx+6,f.cy-20);g.closePath();},d,1.4);
  for(let i=0;i<14;i++){const side=i%2?1:-1,x=f.cx+side*(f.rx+2+i*1.2);stroke(g,[[x,f.cy-10],[x+side*8,f.cy+70],[x+side*3,S-6]],.6,mix(l,.5));}
}
/** 교령 포: 왼섶이 오른섶을 덮어 'y'자로 여민 옷깃, 넓은 깃 띠와 흰 속깃, 옷주름, (있으면) 찰갑. */
function robe(g:G,s:PortraitSpec,f:Face){
  const [c,d,band]=ROBE[s.robe]!,[sk,sh,skl]=SKIN[s.skin]!,ny=f.bot-10;
  shape(g,()=>{g.moveTo(f.cx-15,ny-8);g.lineTo(f.cx-17,ny+26);g.lineTo(f.cx+17,ny+26);g.lineTo(f.cx+15,ny-8);g.closePath();},lin(g,0,ny,0,ny+26,[[0,sh],[1,sk]]),1.2);
  g.strokeStyle=mix(skl,.6);g.lineWidth=1;g.beginPath();g.moveTo(f.cx-6,ny+6);g.quadraticCurveTo(f.cx-2,ny+14,f.cx-4,ny+22);g.stroke();
  const body=()=>{g.moveTo(-4,S);g.lineTo(-4,236);g.bezierCurveTo(14,214,52,196,f.cx-18,ny+22);g.lineTo(f.cx+18,ny+22);g.bezierCurveTo(S-52,196,S-14,214,S+4,236);g.lineTo(S+4,S);g.closePath();};
  shape(g,body,lin(g,0,170,S,S,[[0,c],[.6,c],[1,d]]),1.8);
  g.strokeStyle=mix(INK,.55);g.lineWidth=1;
  for(const [x0,y0,x1,y1,x2,y2] of [[34,214,46,232,40,S],[72,200,84,222,78,S],[S-36,214,S-48,234,S-42,S],[S-74,200,S-88,222,S-82,S]] as const){g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(x1,y1,x2,y2);g.stroke();}
  // 안섶 깃(목 왼쪽에서 가운데로) 위에 겉섶 깃(목 오른쪽에서 왼쪽 아래로) — 'y'자 교령
  const inner=(w:number)=>{g.moveTo(f.cx-16,ny+18);g.quadraticCurveTo(f.cx-6,ny+36,f.cx+4,ny+58);g.lineTo(f.cx+4+w,ny+52);g.quadraticCurveTo(f.cx-2+w*.4,ny+30,f.cx-16+w,ny+16);g.closePath();};
  shape(g,()=>inner(11),band,1.4);
  const outer=(dx:number,w:number)=>{g.moveTo(f.cx+16+dx,ny+16);g.quadraticCurveTo(f.cx+2+dx,ny+50,f.cx-40+dx,S);g.lineTo(f.cx-40+dx-w,S);g.quadraticCurveTo(f.cx-6+dx-w,ny+46,f.cx+12+dx-w*.5,ny+14);g.closePath();};
  shape(g,()=>outer(3,7),'#f1e8d4',1.1);shape(g,()=>outer(-5,14),band,1.5);
  g.fillStyle=mix('#f4e2a8',.7);for(let i=1;i<6;i++){const t=i/6;g.beginPath();g.arc(f.cx+4-t*50,ny+22+t*(S-ny-22),1.4,0,7);g.fill();}
  if(s.armor){
    const [m0,m1,rim]=s.armor===3?['#d8b456','#8a6a20','#f4dc8a']:s.armor===2?['#9a6a42','#5e3c22','#c09060']:['#8a8f94','#4c5054','#c8ccd0'];
    for(const side of [-1,1]){const x0=side<0?-4:S+4;
      const pad=()=>{g.moveTo(x0,222);g.bezierCurveTo(x0-side*24,204,x0-side*56,200,x0-side*70,214);g.lineTo(x0-side*66,250);g.bezierCurveTo(x0-side*44,242,x0-side*18,244,x0,250);g.closePath();};
      shape(g,pad,lin(g,x0,200,x0-side*70,248,[[0,m1],[.5,m0],[1,m1]]),1.6);
      // 찰갑: 엇갈린 작은 미늘(아래가 둥근 비늘)
      g.save();g.beginPath();pad();g.clip();g.strokeStyle=mix(INK,.65);g.lineWidth=.8;
      for(let row=0;row<7;row++)for(let k=0;k<10;k++){const x=x0-side*(4+k*7+(row%2)*3.5),y=206+row*6+Math.abs(x-(x0-side*35))*.08;g.beginPath();g.moveTo(x-3,y);g.lineTo(x-3,y+3);g.quadraticCurveTo(x,y+7,x+3,y+3);g.lineTo(x+3,y);g.stroke();}
      g.restore();
      g.strokeStyle=rim;g.lineWidth=2.2;g.beginPath();g.moveTo(x0,250);g.bezierCurveTo(x0-side*18,244,x0-side*44,242,x0-side*66,250);g.stroke();}
    if(s.armor===3)for(const side of [-1,1])shape(g,()=>g.ellipse(f.cx+side*38,236,11,9,0,0,7),lin(g,0,220,0,244,[[0,'#fff0b8'],[1,'#b08a2a']]),1.6);
  }
}
function ears(g:G,s:PortraitSpec,f:Face){
  const [sk,sh]=SKIN[s.skin]!;
  for(const side of [-1,1]){const x=f.cx+side*(f.rx+1),y=f.cy+2;shape(g,()=>g.ellipse(x,y,6,12,side*.15,0,7),side<0?sk:sh,1.3);
    g.strokeStyle=mix(INK,.6);g.lineWidth=1;g.beginPath();g.arc(x+side,y,3.5,side<0?-1.3:1.8,side<0?1.3:4.4);g.stroke();}
}
function faceSkin(g:G,s:PortraitSpec,f:Face){
  const [sk,sh,skl]=SKIN[s.skin]!;
  shape(g,()=>facePath(g,f),lin(g,f.cx-f.rx,0,f.cx+f.rx,0,[[0,sk],[.62,sk],[1,sh]]),1.7);
  // 옛 인물화의 엷은 바림: 볼의 홍조, 눈두덩, 먼 쪽 볼
  g.save();g.beginPath();facePath(g,f);g.clip();g.filter='blur(5px)';
  for(const side of [-1,1]){g.fillStyle='rgba(206,110,90,.22)';g.beginPath();g.ellipse(f.cx+side*f.rx*.52,f.cy+14,9,6,0,0,7);g.fill();}
  g.fillStyle=mix(skl,.18);g.beginPath();g.ellipse(f.cx+f.rx*.8,f.cy+6,10,f.ry*.8,0,0,7);g.fill();
  g.fillStyle=mix(skl,.16);for(const side of [-1,1]){g.beginPath();g.ellipse(f.fx+side*14,f.eyeY-4,9,4,0,0,7);g.fill();}
  g.restore();
}
function eye(g:G,s:PortraitSpec,f:Face,side:number){
  const x=f.fx+side*14,y=f.eyeY,st=s.eyes,w=st===2||st===3?9:8,h=st===2?4.2:st===3?2:st===0?2.6:3.2,tilt=st===0?-4:st===3?-2:st===4?1:-1;
  const ox=x+side*w,ix=x-side*w*.8,oy=y+tilt;
  const almond=()=>{g.moveTo(ix,y);g.quadraticCurveTo(x,y-h*1.6,ox,oy);g.quadraticCurveTo(x,y+h*1.1,ix,y);g.closePath();};
  shape(g,almond,'#f7f0e2',0);
  g.save();g.beginPath();almond();g.clip();g.fillStyle=INK;g.beginPath();g.arc(x-side,y-.4,Math.min(3.4,h+1),0,7);g.fill();g.restore();
  g.fillStyle='rgba(255,255,255,.85)';g.fillRect(x-side-1.5,y-2,1.2,1.2);
  stroke(g,[[ix,y],[x,y-h*1.7],[ox+side*3,oy-1]],st===2?2:1.6);
  g.strokeStyle=mix(INK,.45);g.lineWidth=.8;g.beginPath();g.moveTo(ix+side,y+.5);g.quadraticCurveTo(x,y+h*1.2,ox-side,oy+.5);g.stroke();
  if(st===0||st===1){g.strokeStyle=mix(INK,.5);g.lineWidth=.8;g.beginPath();g.moveTo(ix+side*2,y-h*1.4);g.quadraticCurveTo(x,y-h*2.4,ox,oy-h*1.2);g.stroke();}
}
function brows(g:G,s:PortraitSpec,f:Face){
  const [d]=HAIR[s.hair]!,th=s.brows===0?3:s.brows===1?1.4:2.3;
  for(const side of [-1,1]){
    const x0=f.fx+side*5,x1=f.fx+side*26,y0=f.eyeY-10+(s.brows===3?3:0),y1=f.eyeY-12-(s.brows===2?7:s.brows===3?-1:2);
    stroke(g,[[x0,y0],[(x0+x1)/2,Math.min(y0,y1)-4-(s.brows===2?2:0)],[x1,y1]],th,d);
    if(s.brows===0||s.brows===2){g.strokeStyle=mix(d,.6);g.lineWidth=.7;for(let i=0;i<6;i++){const t=i/6,x=x0+(x1-x0)*t;g.beginPath();g.moveTo(x,y0+(y1-y0)*t-1);g.lineTo(x+side*3,y0+(y1-y0)*t-4);g.stroke();}}
  }
}
function nose(g:G,s:PortraitSpec,f:Face){
  const x=f.fx,y=f.cy+16,[,,skl]=SKIN[s.skin]!;
  g.strokeStyle=mix(skl,.85);g.lineWidth=1.2;g.beginPath();g.moveTo(x+5,f.eyeY-2);g.quadraticCurveTo(x+7,y-8,x+6,y-1);g.stroke();
  g.strokeStyle=INK;g.lineWidth=1.3;g.beginPath();g.moveTo(x-6,y);g.quadraticCurveTo(x-8,y+5,x-3,y+5);g.moveTo(x+6,y);g.quadraticCurveTo(x+8,y+5,x+3,y+5);g.stroke();
  g.lineWidth=1;g.beginPath();g.moveTo(x-2,y+5);g.quadraticCurveTo(x,y+6,x+2,y+5);g.stroke();
}
function mouth(g:G,s:PortraitSpec,f:Face){
  const y=f.cy+28,x=f.fx+1,w=s.mouth===3?9:7.5,curve=s.mouth===1?2:s.mouth===3?3:s.mouth===2?-1.5:0,lip=s.hat===5?'#c4423e':'#b8645a';
  shape(g,()=>{g.moveTo(x-w,y-curve*.5);g.quadraticCurveTo(x,y-3,x+w,y-curve*.5);g.quadraticCurveTo(x,y+5,x-w,y-curve*.5);g.closePath();},mix(lip,s.hat===5?.9:.55),0);
  stroke(g,[[x-w,y-curve*.5],[x,y+1.5-curve*.3],[x+w,y-curve*.5]],1.2);
  if(s.mouth===3){g.fillStyle='#f4ecdc';g.fillRect(x-4,y-.5,8,1.6);}
}
function ageMarks(g:G,s:PortraitSpec,f:Face,R:()=>number){
  const [,,skl]=SKIN[s.skin]!;
  if(s.age>=1){g.strokeStyle=mix(skl,.55+s.age*.1);g.lineWidth=.9;for(const side of [-1,1]){g.beginPath();g.moveTo(f.fx+side*8,f.cy+18);g.quadraticCurveTo(f.fx+side*14,f.cy+26,f.fx+side*13,f.cy+34);g.stroke();
    g.beginPath();g.moveTo(f.fx+side*25,f.eyeY+1);g.lineTo(f.fx+side*29,f.eyeY+4);g.stroke();}}
  if(s.age===2){g.strokeStyle=mix(skl,.55);g.lineWidth=.8;for(let k=0;k<3;k++){g.beginPath();g.moveTo(f.cx-16,f.top+18+k*4);g.quadraticCurveTo(f.cx,f.top+16+k*4,f.cx+14,f.top+19+k*4);g.stroke();}}
  if(s.mark===1)stroke(g,[[f.cx+f.rx*.32,f.cy+2],[f.cx+f.rx*.48,f.cy+12],[f.cx+f.rx*.6,f.cy+22]],1.4,'#8a3a2a');
  if(s.mark===2)stroke(g,[[f.fx-8,f.eyeY-18],[f.fx-14,f.eyeY],[f.fx-20,f.eyeY+14]],1.4,'#8a3a2a');
  if(s.mark===3){g.save();g.beginPath();facePath(g,f);g.clip();for(let i=0;i<260;i++){const a=R()*Math.PI,r=R();const x=f.cx+Math.cos(a)*f.rx*.85*r,y=f.cy+22+Math.sin(a)*f.ry*.5*r;g.fillStyle=mix(INK,.12+R()*.15);g.fillRect(x,y,1,1);}g.restore();}
}
/** 옛 인물화의 수염: 가늘고 긴 먹선 여러 가닥(팔자 콧수염, 턱 아래로 흘러내리는 긴 수염). */
function beard(g:G,s:PortraitSpec,f:Face,R:()=>number){
  if(!s.beard||s.hat===5)return;const [d,l]=HAIR[s.hair]!,my=f.cy+24,col=()=>R()<.25?mix(l,.7):mix(d,.75+R()*.25);
  for(const side of [-1,1])for(let i=0;i<9;i++){const t=i/9;stroke(g,[[f.fx+side*(2+t*3),my-1+t],[f.fx+side*(9+t*4),my+1],[f.fx+side*(15+t*6),my+8+t*6]],.7,col());}
  if(s.beard===2||s.beard===4){const len=s.beard===4?S-f.bot-14:20,lip=f.cy+32;
    // 턱수염: 턱 끝에 모여 아래로 가늘게 흘러내린다(가운데가 길고 양끝이 짧다)
    for(let i=0;i<14;i++){const t=(i/13)*2-1,x=f.cx+t*8,l2=len*(1-Math.abs(t)*.45)*(.85+R()*.15),sway=(R()-.5)*5;
      g.strokeStyle=col();g.lineWidth=.8;g.beginPath();g.moveTo(x,f.bot-5);g.bezierCurveTo(x+t*3+sway,f.bot+l2*.35,x+t*1-sway,f.bot+l2*.7,f.cx+t*2+sway*.6,f.bot+l2);g.stroke();}
    for(let i=0;i<7;i++){const t=(i/6)*2-1;g.strokeStyle=col();g.lineWidth=.7;g.beginPath();g.moveTo(f.fx+t*4,lip);g.quadraticCurveTo(f.fx+t*4.5,lip+5,f.fx+t*5,lip+9);g.stroke();}}
  if(s.beard===3)for(const side of [-1,1])for(let i=0;i<16;i++){const t=i/15,x=f.cx+side*f.rx*(.98-t*.6),y=f.cy+2+t*f.ry*.8;stroke(g,[[x,y],[x-side,y+6],[x-side*2,y+12+R()*6]],.6,col());}
}
function hairFront(g:G,s:PortraitSpec,f:Face){
  const [d,l]=HAIR[s.hair]!;
  shape(g,()=>{g.moveTo(f.cx-f.rx-2,f.cy-6);g.bezierCurveTo(f.cx-f.rx-6,f.top-22,f.cx+f.rx+6,f.top-22,f.cx+f.rx+2,f.cy-6);g.quadraticCurveTo(f.cx+f.rx-6,f.top+14,f.cx,f.top+10);g.quadraticCurveTo(f.cx-f.rx+6,f.top+14,f.cx-f.rx-2,f.cy-6);g.closePath();},d,1.4);
  g.strokeStyle=mix(l,.5);g.lineWidth=.7;for(let i=0;i<14;i++){const t=i/13,x=f.cx-f.rx+t*f.rx*2;g.beginPath();g.moveTo(x,f.top+12-Math.sin(t*Math.PI)*2);g.quadraticCurveTo(f.cx+(x-f.cx)*.6,f.top-8,f.cx+(x-f.cx)*.3,f.top-18);g.stroke();}
  for(const side of [-1,1])stroke(g,[[f.cx+side*(f.rx-2),f.cy-14],[f.cx+side*(f.rx+1),f.cy-2],[f.cx+side*(f.rx-1),f.cy+8]],1.4,d);
  if(s.hat===6){
    shape(g,()=>{g.moveTo(f.cx-f.rx-3,f.top+16);g.quadraticCurveTo(f.cx,f.top+4,f.cx+f.rx+3,f.top+16);g.lineTo(f.cx+f.rx+3,f.top+22);g.quadraticCurveTo(f.cx,f.top+10,f.cx-f.rx-3,f.top+22);g.closePath();},'#8a2a1c',1.2);
    for(const side of [-1,1])stroke(g,[[f.cx+side*(f.rx+8),f.cy-8],[f.cx+side*(f.rx+12),f.cy+30],[f.cx+side*(f.rx+8),f.cy+70]],2.2,d);}
}
function headwear(g:G,s:PortraitSpec,f:Face,R:()=>number){
  const top=f.top,[d]=HAIR[s.hair]!;
  if(s.hat===0){// 상투와 비녀, 작은 검은 건
    shape(g,()=>g.ellipse(f.cx,top-20,15,13,0,0,7),d,1.4);shape(g,()=>{g.moveTo(f.cx-17,top-12);g.quadraticCurveTo(f.cx,top-18,f.cx+17,top-12);g.lineTo(f.cx+15,top-6);g.quadraticCurveTo(f.cx,top-12,f.cx-15,top-6);g.closePath();},'#1c1814',1.2);
    stroke(g,[[f.cx-30,top-18],[f.cx,top-24],[f.cx+32,top-28]],2.2,'#c8a04a');shape(g,()=>g.arc(f.cx+32,top-28,2.6,0,7),'#e8c870',1);}
  if(s.hat===1){// 진현관: 검은 사 관, 앞이 높고 뒤로 기운 양, 갓끈
    shape(g,()=>{g.moveTo(f.cx-f.rx-4,top+14);g.quadraticCurveTo(f.cx,top+2,f.cx+f.rx+4,top+14);g.lineTo(f.cx+f.rx+2,top+4);g.quadraticCurveTo(f.cx,top-8,f.cx-f.rx-2,top+4);g.closePath();},'#1e1a18',1.4);
    shape(g,()=>{g.moveTo(f.cx-18,top+2);g.lineTo(f.cx-22,top-36);g.quadraticCurveTo(f.cx+4,top-50,f.cx+30,top-30);g.lineTo(f.cx+20,top-2);g.closePath();},lin(g,f.cx-20,0,f.cx+30,0,[[0,'#3a3430'],[1,'#141210']]),1.6);
    g.strokeStyle='rgba(220,200,160,.4)';g.lineWidth=1;for(let k=0;k<3;k++){g.beginPath();g.moveTo(f.cx-12+k*10,top);g.lineTo(f.cx-16+k*12,top-38+k*3);g.stroke();}
    for(const side of [-1,1])stroke(g,[[f.cx+side*(f.rx+2),top+10],[f.cx+side*(f.rx+4),f.cy+20],[f.cx+side*8,f.bot+4]],.8,'#2a2420');}
  if(s.hat===2){// 패왕 투구: 둥근 철 투구, 금테, 봉황 날개, 높은 붉은 술
    const gold=s.armor===3,[a,b]=gold?['#e8c86a','#9a7424']:['#a8aeb4','#5c6268'];
    for(const side of [-1,1])shape(g,()=>{g.moveTo(f.cx+side*(f.rx-4),top+2);g.bezierCurveTo(f.cx+side*(f.rx+20),top-20,f.cx+side*(f.rx+36),top-12,f.cx+side*(f.rx+40),top-34);g.bezierCurveTo(f.cx+side*(f.rx+26),top-18,f.cx+side*(f.rx+14),top-30,f.cx+side*(f.rx+2),top-10);g.closePath();},gold?'#f2d886':'#d8dce0',1.4);
    shape(g,()=>{g.moveTo(f.cx-f.rx-6,f.eyeY-12);g.bezierCurveTo(f.cx-f.rx-10,top-40,f.cx+f.rx+10,top-40,f.cx+f.rx+6,f.eyeY-12);g.quadraticCurveTo(f.cx,f.eyeY-26,f.cx-f.rx-6,f.eyeY-12);g.closePath();},lin(g,f.cx-f.rx,0,f.cx+f.rx,0,[[0,b],[.3,a],[1,b]]),1.8);
    shape(g,()=>{g.moveTo(f.cx-f.rx-6,f.eyeY-12);g.quadraticCurveTo(f.cx,f.eyeY-28,f.cx+f.rx+6,f.eyeY-12);g.lineTo(f.cx+f.rx+4,f.eyeY-17);g.quadraticCurveTo(f.cx,f.eyeY-33,f.cx-f.rx-4,f.eyeY-17);g.closePath();},'#d8b04a',1.2);
    g.strokeStyle=mix(INK,.6);g.lineWidth=.9;for(let k=-3;k<=3;k++){g.beginPath();g.moveTo(f.cx+k*9,f.eyeY-24+Math.abs(k));g.quadraticCurveTo(f.cx+k*8,top-14,f.cx+k*3,top-30);g.stroke();}
    for(const side of [-1,1])shape(g,()=>{g.moveTo(f.cx+side*(f.rx+5),f.eyeY-14);g.lineTo(f.cx+side*(f.rx+7),f.cy+22);g.quadraticCurveTo(f.cx+side*(f.rx-2),f.cy+30,f.cx+side*(f.rx-5),f.cy+20);g.lineTo(f.cx+side*(f.rx-3),f.eyeY-10);g.closePath();},b,1.4);
    shape(g,()=>{g.moveTo(f.cx-3,top-30);g.lineTo(f.cx+3,top-30);g.lineTo(f.cx+2,top-40);g.lineTo(f.cx-2,top-40);g.closePath();},'#d8b04a',1);
    for(let i=0;i<16;i++){const ang=-Math.PI/2+(i/15-.5)*1.1;stroke(g,[[f.cx,top-40],[f.cx+Math.cos(ang)*16,top-40+Math.sin(ang)*20],[f.cx+Math.cos(ang)*24+(R()-.5)*6,top-40+Math.sin(ang)*30]],1.8,i%3?'#b8261a':'#d84a32');}}
  if(s.hat===3){// 붉은 무변: 무관의 둥근 붉은 건, 뒤로 늘어진 끈
    shape(g,()=>{g.moveTo(f.cx-f.rx-4,f.eyeY-14);g.bezierCurveTo(f.cx-f.rx-6,top-30,f.cx+f.rx+6,top-30,f.cx+f.rx+4,f.eyeY-14);g.quadraticCurveTo(f.cx,f.eyeY-26,f.cx-f.rx-4,f.eyeY-14);g.closePath();},lin(g,f.cx-f.rx,0,f.cx+f.rx,0,[[0,'#c84a32'],[1,'#8a2416']]),1.6);
    g.strokeStyle=mix(INK,.55);g.lineWidth=.9;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(f.cx+k*12,f.eyeY-22);g.quadraticCurveTo(f.cx+k*10,top-12,f.cx+k*4,top-22);g.stroke();}
    shape(g,()=>{g.moveTo(f.cx+f.rx,f.eyeY-20);g.quadraticCurveTo(f.cx+f.rx+20,f.eyeY-6,f.cx+f.rx+16,f.cy+30);g.lineTo(f.cx+f.rx+8,f.cy+28);g.quadraticCurveTo(f.cx+f.rx+10,f.eyeY,f.cx+f.rx-2,f.eyeY-12);g.closePath();},'#a83020',1.3);}
  if(s.hat===4){// 검은 책: 머리를 감싼 검은 두건, 뒤에 두 귀
    for(const side of [-1,1])shape(g,()=>{g.moveTo(f.cx+side*12,top-18);g.quadraticCurveTo(f.cx+side*26,top-36,f.cx+side*34,top-30);g.quadraticCurveTo(f.cx+side*24,top-22,f.cx+side*16,top-12);g.closePath();},'#1c1c1e',1.2);
    shape(g,()=>{g.moveTo(f.cx-f.rx-3,f.eyeY-12);g.bezierCurveTo(f.cx-f.rx-6,top-26,f.cx+f.rx+6,top-26,f.cx+f.rx+3,f.eyeY-12);g.quadraticCurveTo(f.cx,f.eyeY-24,f.cx-f.rx-3,f.eyeY-12);g.closePath();},lin(g,f.cx-f.rx,0,f.cx+f.rx,0,[[0,'#3a3a3c'],[1,'#121214']]),1.6);}
  if(s.hat===5){// 여인 쌍환계: 높이 올린 두 고리, 금비녀·꽃·드리개
    for(const side of [-1,1]){shape(g,()=>g.ellipse(f.cx+side*18,top-26,14,18,side*.3,0,7),d,1.4);shape(g,()=>g.ellipse(f.cx+side*18,top-26,6,9,side*.3,0,7),'#b8aa90',1);}
    shape(g,()=>{g.moveTo(f.cx-f.rx-4,f.cy-2);g.bezierCurveTo(f.cx-f.rx-6,top-16,f.cx+f.rx+6,top-16,f.cx+f.rx+4,f.cy-2);g.quadraticCurveTo(f.cx+f.rx-8,top+16,f.cx,top+8);g.quadraticCurveTo(f.cx-f.rx+8,top+16,f.cx-f.rx-4,f.cy-2);g.closePath();},d,1.4);
    stroke(g,[[f.cx-40,top-8],[f.cx,top-14],[f.cx+44,top-22]],2,'#d0a848');
    for(const [x,y,c] of [[f.cx+30,top-14,'#d8506a'],[f.cx-28,top-8,'#e88aa0'],[f.cx+6,top-12,'#f0c24a']] as const){for(let k=0;k<5;k++){const a=k/5*Math.PI*2;shape(g,()=>g.ellipse(x+Math.cos(a)*3.4,y+Math.sin(a)*3.4,3,2.2,a,0,7),c,.6);}shape(g,()=>g.arc(x,y,1.6,0,7),'#fff3b0',0);}
    for(let k=0;k<3;k++){g.strokeStyle='#c8a048';g.lineWidth=.8;g.beginPath();g.moveTo(f.cx+44,top-22);g.lineTo(f.cx+46+k*3,top+4+k*5);g.stroke();shape(g,()=>g.arc(f.cx+46+k*3,top+6+k*5,1.8,0,7),'#7ac0b0',.6);}}
  if(s.hat===7){// 유씨관(죽피관): 정수리에 세운 길고 납작한 대나무 껍질 관, 턱끈
    shape(g,()=>g.ellipse(f.cx,top-10,12,9,0,0,7),d,1.2);
    shape(g,()=>{g.moveTo(f.cx-8,top-10);g.lineTo(f.cx-14,top-62);g.quadraticCurveTo(f.cx+2,top-70,f.cx+18,top-60);g.lineTo(f.cx+10,top-10);g.closePath();},lin(g,f.cx-14,0,f.cx+18,0,[[0,'#3a2c20'],[.5,'#1c1612'],[1,'#3a2c20']]),1.6);
    g.strokeStyle='rgba(220,190,130,.35)';g.lineWidth=.8;for(let k=0;k<4;k++){g.beginPath();g.moveTo(f.cx-6+k*5,top-12);g.lineTo(f.cx-10+k*7,top-62+k);g.stroke();}
    for(const side of [-1,1])stroke(g,[[f.cx+side*10,top-12],[f.cx+side*(f.rx+4),f.cy],[f.cx+side*10,f.bot+2]],.8,'#2a2420');}
}
function heldItem(g:G,s:PortraitSpec){
  if(s.item===1){g.save();g.translate(192,232);g.rotate(-.35);
    // 학우선: 깃털이 겹친 부채(가장자리가 깃 끝처럼 갈라진다)
    for(let k=-5;k<=5;k++){const a=-Math.PI/2+k*.13;g.save();g.rotate(k*.13);shape(g,()=>{g.moveTo(0,-6);g.quadraticCurveTo(-7,-40,-1,-74+Math.abs(k)*3);g.lineTo(1,-74+Math.abs(k)*3);g.quadraticCurveTo(7,-40,0,-6);g.closePath();},k%2?'#f4efe4':'#e6dfd0',.8);g.restore();void a;}
    shape(g,()=>g.ellipse(0,-6,6,4,0,0,7),'#3a2416',1);shape(g,()=>g.rect(-3,-4,6,28),'#6a3a1c',1.2);g.restore();}
  if(s.item===2){g.save();g.translate(214,200);g.rotate(.38);shape(g,()=>g.rect(-4,-56,8,40),'#3a2416',1.2);shape(g,()=>g.rect(-14,-18,28,6),'#c8a04a',1.2);shape(g,()=>g.arc(0,-58,5,0,7),'#a8241a',1.2);g.restore();}
  if(s.item===3){g.strokeStyle=INK;g.lineWidth=7;g.beginPath();g.moveTo(232,S);g.lineTo(212,4);g.stroke();g.strokeStyle='#6a4428';g.lineWidth=4.5;g.beginPath();g.moveTo(232,S);g.lineTo(212,4);g.stroke();
    shape(g,()=>{g.moveTo(210,-6);g.lineTo(216,-6);g.lineTo(214,26);g.closePath();},'#c8ccd0',1.2);shape(g,()=>{g.moveTo(204,30);g.lineTo(222,30);g.lineTo(224,46);g.lineTo(202,46);g.closePath();},'#b8261a',1.2);}
  if(s.item===4){g.save();g.translate(200,232);g.rotate(-.3);for(let k=0;k<7;k++)shape(g,()=>g.rect(-28+k*8,-22,7,44),k%2?'#d8c088':'#cbb07a',1);g.strokeStyle='#5a3418';g.lineWidth=1.4;for(const y of [-12,12]){g.beginPath();g.moveTo(-30,y);g.lineTo(28,y);g.stroke();}
    g.fillStyle=mix(INK,.6);for(let k=0;k<7;k++)for(let r=0;r<4;r++)g.fillRect(-26+k*8,-18+r*10,3,2);g.restore();}
  if(s.item===5){g.strokeStyle=INK;g.lineWidth=5;g.beginPath();g.arc(250,160,92,Math.PI*.6,Math.PI*1.18);g.stroke();g.strokeStyle='#6a3a18';g.lineWidth=3;g.beginPath();g.arc(250,160,92,Math.PI*.6,Math.PI*1.18);g.stroke();
    const a=Math.PI*.6,b=Math.PI*1.18;g.strokeStyle='rgba(60,40,20,.8)';g.lineWidth=.8;g.beginPath();g.moveTo(250+Math.cos(a)*92,160+Math.sin(a)*92);g.lineTo(250+Math.cos(b)*92,160+Math.sin(b)*92);g.stroke();}
}
/** 제첨(이름 띠)과 낙관. 이름이 없으면 낙관만. */
function inscription(g:G,name:string|undefined,R:()=>number){
  if(name){const chars=[...name].slice(0,6),h=Math.max(52,chars.length*19+14),x=S-34,y=12;
    shape(g,()=>g.rect(x,y,24,h),'rgba(246,236,210,.92)',1.2,'#5a4024');g.strokeStyle='rgba(90,64,36,.6)';g.lineWidth=.6;g.strokeRect(x+2.5,y+2.5,19,h-5);
    g.fillStyle=INK;g.font='bold 17px "Noto Serif KR","Nanum Myeongjo","Batang",serif';g.textAlign='center';g.textBaseline='middle';
    chars.forEach((c,i)=>g.fillText(c,x+12,y+16+i*19));}
  const sx=12,sy=S-38;g.save();g.translate(sx+13,sy+13);g.rotate(-.04);g.fillStyle='#b8261a';g.fillRect(-12,-12,24,24);
  g.strokeStyle='#f4e6cc';g.lineWidth=1.2;g.strokeRect(-9,-9,18,18);g.fillStyle='#f4e6cc';g.font='bold 13px "Noto Serif KR",serif';g.textAlign='center';g.textBaseline='middle';g.fillText(name?[...name][0]!:'장',0,1);
  g.globalCompositeOperation='destination-out';for(let i=0;i<40;i++){g.fillStyle=`rgba(0,0,0,${.2+R()*.5})`;g.fillRect(-12+R()*24,-12+R()*24,1.4,1.4);}g.restore();
}
function finish(g:G,s:PortraitSpec,R:()=>number){
  // 오래된 그림: 색이 바래고(누런 막), 비단 결이 그림 위로 비치며, 가장자리가 그을린다.
  g.save();g.globalCompositeOperation='multiply';g.fillStyle=mix(SILK[s.bg]![0],.3);g.fillRect(0,0,S,S);g.restore();
  const img=g.getImageData(0,0,S,S),d=img.data;for(let i=0;i<d.length;i+=4){const n=(R()-.5)*16;d[i]=Math.max(0,Math.min(255,d[i]!+n));d[i+1]=Math.max(0,Math.min(255,d[i+1]!+n));d[i+2]=Math.max(0,Math.min(255,d[i+2]!+n*.8));}g.putImageData(img,0,0);
  const v=g.createRadialGradient(CX,118,80,CX,128,190);v.addColorStop(0,'rgba(60,36,14,0)');v.addColorStop(1,'rgba(60,36,14,.5)');g.fillStyle=v;g.fillRect(0,0,S,S);
  g.strokeStyle='rgba(70,46,20,.55)';g.lineWidth=3;g.strokeRect(1.5,1.5,S-3,S-3);g.strokeStyle='rgba(240,222,180,.25)';g.lineWidth=1;g.strokeRect(5.5,5.5,S-11,S-11);
}
export interface DrawOpts {
  /** 대화창 흉상: 바탕·제첨·낙관·테두리 없이 사람만(투명 바탕) */
  bare?:boolean;
}
/** 초상 한 장을 캔버스(256×256)에 그린다. 이름을 주면 제첨에 세로로 쓴다. */
export function drawPortrait(g:G,s:PortraitSpec,name?:string,opts:DrawOpts={}){
  const R=rng(PORTRAIT_KEYS.reduce((h,k)=>Math.imul(h^(s[k]+1),16777619)>>>0,2166136261)),f=faceOf(s);
  g.save();g.clearRect(0,0,S,S);g.lineCap='round';g.lineJoin='round';
  if(!opts.bare)silk(g,s,R);else R();
  if(s.item===3||s.item===5)heldItem(g,s);hairBack(g,s,f);robe(g,s,f);ears(g,s,f);faceSkin(g,s,f);
  ageMarks(g,s,f,R);eye(g,s,f,-1);eye(g,s,f,1);brows(g,s,f);nose(g,s,f);mouth(g,s,f);beard(g,s,f,R);
  if(![2,3,4].includes(s.hat))hairFront(g,s,f);headwear(g,s,f,R);if(s.item!==3&&s.item!==5)heldItem(g,s);
  if(opts.bare)grain(g,R);else{finish(g,s,R);inscription(g,name,R);}g.restore();
}
/** 흉상용 마감: 바탕을 건드리지 않고(투명은 투명대로) 칠의 결만 얹는다. */
function grain(g:G,R:()=>number){
  const img=g.getImageData(0,0,S,S),d=img.data;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const n=(R()-.5)*14;d[i]=Math.max(0,Math.min(255,d[i]!+n));d[i+1]=Math.max(0,Math.min(255,d[i+1]!+n));d[i+2]=Math.max(0,Math.min(255,d[i+2]!+n*.8));}g.putImageData(img,0,0);
}
const urls=new Map<string,string>();
/** 초상의 data URL(같은 값·이름은 한 번만 그린다). 캔버스가 없으면(시험 환경) 빈 문자열. */
export function portraitURL(s:PortraitSpec,name?:string,opts:DrawOpts={}){
  const key=PORTRAIT_KEYS.map(k=>s[k]).join(',')+'|'+(name??'')+(opts.bare?'|bare':'');const hit=urls.get(key);if(hit)return hit;
  if(typeof document==='undefined')return '';
  const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d',{willReadFrequently:true})!;drawPortrait(g,s,name,opts);
  const url=c.toDataURL('image/png');urls.set(key,url);return url;
}
