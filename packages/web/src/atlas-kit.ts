/**
 * 채색 원화(scenery-v3: 참나무·소나무·성문·망루·바위산·막사·집·성벽)에서 조각을 오려 새 소품을 짜 맞춘다.
 * 같은 붓결·같은 빛·같은 도트 크기라 집·나무 옆에 놓아도 따로 놀지 않는다.
 *  · 정자: 성문 위 기와지붕(용마루 장식·들린 처마·기와골)을 그대로 쓰고, 아래는 원화 기둥 색을 이어 붉은 기둥·난간·돌 기단·계단을 같은 결로 그린다.
 *  · 노점: 막사 지붕 아랫단(크림빛 천·물결 테두리·장식 꼭지)을 차양으로, 아래 판매대와 물건은 같은 결로 그린다. 색 테두리는 색조를 돌려 여러 가지.
 *  · 바위: 바위산 발치의 이끼 낀 바위, 큰 바위 무리는 바위산 전체를 작게.
 *  · 덤불: 바위산 꼭대기의 둥근 떨기나무.
 * 좌표는 모두 원화 픽셀(1536×1024 아틀라스) 기준.
 */
type Ctx=CanvasRenderingContext2D;
type R=()=>number;
const cv=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true})!;g.imageSmoothingEnabled=false;return {c,g};};
const hex=(s:string)=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)] as [number,number,number];

let IMG:CanvasImageSource|undefined;
const cache=new Map<string,HTMLCanvasElement>();
export function setKitImage(img:CanvasImageSource){IMG=img;cache.clear();}
export const kitReady=()=>!!IMG;
function once(key:string,make:()=>HTMLCanvasElement){let c=cache.get(key);if(!c){c=make();cache.set(key,c);}return c;}
/** 아틀라스 사각 영역을 오려 낸다(반투명 가장자리는 정리). */
function cut(x:number,y:number,w:number,h:number){const {c,g}=cv(w,h);g.drawImage(IMG!,x,y,w,h,0,0,w,h);const img=g.getImageData(0,0,w,h),d=img.data;for(let i=3;i<d.length;i+=4)d[i]=d[i]!<50?0:d[i]!>200?255:d[i]!;g.putImageData(img,0,0);return c;}
/** 아래·옆 가장자리를 몇 픽셀에 걸쳐 투명하게(잘린 자리가 칼로 벤 듯 보이지 않게). */
function feather(c:HTMLCanvasElement,sides:{bottom?:number;left?:number;right?:number;top?:number}){const g=c.getContext('2d')!,img=g.getImageData(0,0,c.width,c.height),d=img.data,W=c.width,H=c.height;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let k=1;if(sides.bottom)k=Math.min(k,(H-1-y)/sides.bottom);if(sides.top)k=Math.min(k,y/sides.top);if(sides.left)k=Math.min(k,x/sides.left);if(sides.right)k=Math.min(k,(W-1-x)/sides.right);
    if(k<1){const i=(y*W+x)*4+3;const hash=((x*73856093)^(y*19349663))>>>0;d[i]=k<=0||(hash%100)/100>k?0:d[i]!;}}g.putImageData(img,0,0);return c;}
/** 타원 안만 남긴다(오린 조각에 딸려 온 바닥 풀을 걷어 냄). 가장자리는 들쭉날쭉하게. */
function ellipseMask(c:HTMLCanvasElement,cx:number,cy:number,rx:number,ry:number,keepBelow=1){const g=c.getContext('2d')!,img=g.getImageData(0,0,c.width,c.height),d=img.data,W=c.width;
  for(let y=0;y<c.height;y++)for(let x=0;x<W;x++){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/(y>cy?ry*keepBelow:ry),r=dx*dx+dy*dy,j=(((x*7919)^(y*104729))>>>0)%100/100*.18;if(r>1-j)d[(y*W+x)*4+3]=0;}g.putImageData(img,0,0);return c;}
/** 크기를 바꿔 붙인다(도트가 뭉개지지 않게 정수배에 가까우면 최근접, 아니면 고품질). */
function put(g:Ctx,src:HTMLCanvasElement,x:number,y:number,scale:number,ax:number,ay:number,flip=false,filter=''){
  const w=src.width*scale,h=src.height*scale;g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';if(filter)g.filter=filter;
  if(flip){g.translate(Math.round(x),0);g.scale(-1,1);g.drawImage(src,Math.round(-w*(1-ax)),Math.round(y-h*ay),Math.round(w),Math.round(h));}
  else g.drawImage(src,Math.round(x-w*ax),Math.round(y-h*ay),Math.round(w),Math.round(h));g.restore();}
function shadow(g:Ctx,x:number,y:number,rx:number,ry:number,a=.42){const gr=g.createRadialGradient(x,y,0,x,y,rx);gr.addColorStop(0,`rgba(10,14,6,${a})`);gr.addColorStop(.7,`rgba(10,14,6,${a*.5})`);gr.addColorStop(1,'rgba(10,14,6,0)');g.save();g.translate(x,y);g.scale(1,ry/rx);g.translate(-x,-y);g.fillStyle=gr;g.fillRect(x-rx,y-rx,rx*2,rx*2);g.restore();}

// ───────────── 원화에서 고른 색(돌·나무·풀) — 새로 그리는 부분도 이 색만 쓴다
const STONE=['#2b2925','#45423c','#5f5b53','#7b766b','#979185','#b4ad9f','#cbc5b6'].map(hex);
const WOOD=['#2a1a10','#4a2e1a','#6a4426','#8a5c34','#a87a48','#c49a62'].map(hex);
const RED=['#3a120c','#5e1c12','#7e2a1a','#9c3a24','#b84e34'].map(hex);
const GRASS=['#2a3e18','#3e5a22','#557a2c','#6e963a','#8cb04c'].map(hex);

class Dots{img:ImageData;d:Uint8ClampedArray;constructor(public g:Ctx,public w:number,public h:number){this.img=g.getImageData(0,0,w,h);this.d=this.img.data;}
  set(x:number,y:number,c:[number,number,number],a=255){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.w||y>=this.h)return;const i=(y*this.w+x)*4;if(a>=255){this.d[i]=c[0];this.d[i+1]=c[1];this.d[i+2]=c[2];this.d[i+3]=255;return;}const k=a/255;this.d[i]=c[0]*k+this.d[i]!*(1-k);this.d[i+1]=c[1]*k+this.d[i+1]!*(1-k);this.d[i+2]=c[2]*k+this.d[i+2]!*(1-k);this.d[i+3]=Math.max(this.d[i+3]!,a);}
  get(x:number,y:number){const i=(y*this.w+x)*4;return [this.d[i]!,this.d[i+1]!,this.d[i+2]!,this.d[i+3]!] as const;}
  done(){this.g.putImageData(this.img,0,0);}}
const rng=(seed:number)=>{let s=seed>>>0||1;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};
/** 발치의 풀포기·자갈(원화의 밑동 풀 결): 아래 가장자리를 따라. */
function baseGrass(dots:Dots,x0:number,x1:number,y:number,R:R,dense=1){
  for(let x=x0;x<x1;x++){if(R()>.55*dense)continue;const h=2+Math.floor(R()*5),lean=R()<.5?-1:1;for(let k=0;k<h;k++){const c=GRASS[Math.min(4,Math.floor(k/h*4)+(R()<.3?1:0))]!;dots.set(x+(k>h/2?lean:0),y-k,c);}dots.set(x,y+1,GRASS[0]!);}
  for(let i=0;i<(x1-x0)/9;i++){const x=x0+R()*(x1-x0),yy=y+R()*3;dots.set(x,yy,STONE[5]!);dots.set(x+1,yy,STONE[3]!);dots.set(x,yy+1,STONE[1]!);}
}
/** 돌을 엇갈려 쌓은 벽면(원화 성벽 결): 돌마다 위·왼쪽은 밝고 아래·오른쪽은 어둡게, 틈은 짙게. */
function stoneFace(dots:Dots,x0:number,y0:number,w:number,h:number,R:R,course=6){
  for(let row=0;row*course<h;row++){const yy=y0+row*course,off=(row%2)*Math.round(course*1.4);let x=x0-off;
    while(x<x0+w){const bw=Math.round(course*(1.8+R()*1.4)),tone=2+Math.floor(R()*3);
      for(let y=yy;y<Math.min(yy+course,y0+h);y++)for(let xx=Math.max(x0,x);xx<Math.min(x+bw,x0+w);xx++){const ly=y-yy,lx=xx-x;
        const c=ly===course-1||lx===bw-1?STONE[1]!:ly===0||lx===0?STONE[Math.min(6,tone+2)]!:ly===course-2||lx===bw-2?STONE[Math.max(1,tone-1)]!:STONE[tone]!;dots.set(xx,y,c);
        if(R()<.04&&ly>0&&ly<course-2)dots.set(xx,y,STONE[Math.max(1,tone-1)]!);}
      if(R()<.12){const mx=x+Math.floor(R()*bw),my=yy+course-2;for(let k=0;k<3;k++)dots.set(mx+k,my,GRASS[1+Math.floor(R()*2)]!);}
      x+=bw;}}
}
/** 돌판 윗면(살짝 비스듬히 보이는 마당): 큰 판석 줄, 앞쪽 가장자리는 밝은 모서리 선. */
function stoneTop(dots:Dots,x0:number,y0:number,w:number,h:number,R:R){
  for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const row=Math.floor((y-y0)/4),col=Math.floor((x-x0+(row%2)*7)/14);const seam=(y-y0)%4===3||(x-x0+(row%2)*7)%14===13;
    const v=4+((col*7+row*3)%3===0?1:0)-((y-y0)<2?1:0);dots.set(x,y,seam?STONE[3]!:STONE[Math.min(6,v)]!);if(R()<.03)dots.set(x,y,STONE[3]!);}
  for(let x=x0;x<x0+w;x++){dots.set(x,y0+h-1,STONE[6]!);dots.set(x,y0,STONE[2]!);}
}

// ───────────── 정자
export function pavilionSprite(){return once('pavilion',()=>{
  const R=rng(7),roof=cut(832,128,268,104),W=268,colH=46,face=16,steps=9,H=104+colH+face+steps+4;
  const {c,g}=cv(W,H),dots=new Dots(g,W,H);
  const top=104+colH-12;// 기단 윗면 시작
  // 기단 윗면 + 지붕 그늘
  stoneTop(dots,6,top,W-12,12,R);
  for(let y=top;y<top+12;y++)for(let x=20;x<W-20;x++)dots.set(x,y,[20,16,12],Math.round(90*(1-(y-top)/12)));
  // 기단 앞면(돌 쌓기) + 아래 그늘 + 발치 풀
  stoneFace(dots,6,top+12,W-12,face,R,5);
  for(let x=6;x<W-6;x++){dots.set(x,top+12,STONE[6]!);dots.set(5,top+12+(x%face),STONE[1]!);}
  // 계단(가운데)
  const sx0=W/2-30,sw=60;for(let k=0;k<3;k++){const y=top+12+face-6+k*3+3;for(let x=sx0-k*3;x<sx0+sw+k*3;x++){dots.set(x,y,STONE[6]!);dots.set(x,y+1,STONE[4]!);dots.set(x,y+2,STONE[2]!);}}
  // 기둥: 원화 기둥 색(밝은 왼쪽 → 짙은 오른쪽)을 이어 내린다. 아래에는 돌 주춧돌.
  const pillars=[[36,14],[94,13],[165,14],[222,14]] as const;
  for(const [px,pw] of pillars){for(let y=100;y<top+4;y++)for(let k=0;k<pw;k++){const t=k/(pw-1),i=Math.min(4,Math.max(0,Math.round(4-t*3.4-(y>top-6?1:0))));dots.set(px+k,y,RED[i]!);}
    for(let k=-2;k<pw+2;k++){dots.set(px+k,top+2,STONE[5]!);dots.set(px+k,top+3,STONE[4]!);dots.set(px+k,top+4,STONE[2]!);}
    for(let y=100;y<top+2;y+=7)dots.set(px+2,y,RED[4]!);}
  // 난간: 가운데(드나드는 곳)는 비우고 양옆 칸에만 — 붉은 가로대와 살
  for(const [a,b] of [[50,94],[179,222]] as const){for(let x=a;x<b;x++){dots.set(x,top-14,RED[3]!);dots.set(x,top-13,RED[1]!);dots.set(x,top-3,RED[2]!);if((x-a)%5===2)for(let y=top-12;y<top-3;y++)dots.set(x,y,RED[(x-a)%10<5?3:2]!);}}
  // 처마 밑 서까래 그늘
  for(let x=24;x<W-24;x++)for(let k=0;k<4;k++)dots.set(x,100+k,[18,12,10],140-k*30);
  baseGrass(dots,4,W-4,H-2,R,1.3);
  dots.done();g.drawImage(roof,0,0);
  return c;});}
export function drawPavilion(g:Ctx,x:number,y:number,s:number){const sp=pavilionSprite(),k=1.12*s;shadow(g,x+24,y-6,sp.width*k*.52,sp.width*k*.14,.5);put(g,sp,x,y,k,.5,.98);}

// ───────────── 노점
const GOODS:Array<[number,number,number]>=[[214,82,46],[232,160,48],[150,186,64],[238,222,160],[186,96,46],[122,74,140],[90,140,60]];
export function stallSprite(tint:number){return once('stall:'+tint,()=>{
  const R=rng(11+tint),W=256,cH=86,H=cH+78;
  const {c,g}=cv(W,H),dots=new Dots(g,W,H);
  const deskTop=cH+30,deskH=26;
  // 기둥(차양 장식 꼭지 아래로 이어지는 나무 기둥)
  for(const px of [14,238]){for(let y=cH-6;y<H-4;y++){dots.set(px,y,WOOD[4]!);dots.set(px+1,y,WOOD[3]!);dots.set(px+2,y,WOOD[2]!);dots.set(px+3,y,WOOD[1]!);}}
  // 판매대 윗면(판자) + 앞판(세로 판자) + 그늘
  for(let y=deskTop-8;y<deskTop;y++)for(let x=10;x<W-10;x++){const plank=Math.floor((y-deskTop+8)/3);dots.set(x,y,(x+plank*5)%29===0?WOOD[2]!:WOOD[y===deskTop-8?5:4-((y-deskTop)%3===0?1:0)]!);}
  for(let y=deskTop;y<deskTop+deskH;y++)for(let x=10;x<W-10;x++){const b=(x-10)%13;dots.set(x,y,b===0?WOOD[0]!:b===1?WOOD[4]!:b===12?WOOD[1]!:WOOD[y>deskTop+deskH-4?2:3]!);}
  for(let x=10;x<W-10;x++){dots.set(x,deskTop,WOOD[5]!);dots.set(x,deskTop+deskH-1,WOOD[0]!);}
  for(const bx of [10,W-11])for(let y=deskTop-8;y<deskTop+deskH;y++)dots.set(bx,y,WOOD[0]!);
  // 물건: 과일 더미·채소·항아리·천 두루마리 — 원화처럼 한 덩이마다 밝은 왼쪽 위·짙은 오른쪽 아래와 테두리
  let x=18;while(x<W-30){const kind=R();
    if(kind<.45){// 과일 더미(작은 공 6~10개)
      const col=GOODS[Math.floor(R()*GOODS.length)]!,n=6+Math.floor(R()*5),bw=22;for(let i=0;i<n;i++){const fx=x+3+(i%4)*5+((i>>2)%2)*2,fy=deskTop-10-Math.floor(i/4)*4;
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(dx*dx+dy*dy>5)continue;const lit=dx+dy<-1?1.25:dx+dy>1?.62:1;dots.set(fx+dx,fy+dy,[Math.min(255,col[0]*lit),Math.min(255,col[1]*lit),Math.min(255,col[2]*lit)]);}
        dots.set(fx-1,fy-1,[255,246,220]);}
      x+=bw+4;}
    else if(kind<.7){// 항아리
      const cx=x+8;for(let dy=-14;dy<=0;dy++){const r=dy<-12?2.5:dy<-10?4:6.5-Math.abs(dy+6)*.22;for(let dx=-Math.round(r);dx<=Math.round(r);dx++){const t=(dx+r)/(2*r);dots.set(cx+dx,deskTop-9+dy,WOOD[Math.max(1,Math.min(5,Math.round(5-t*4)))]!);}}
      for(let dx=-3;dx<=3;dx++)dots.set(cx+dx,deskTop-22,WOOD[0]!);x+=20;}
    else{// 천 두루마리(색 천을 눕혀 쌓음)
      const col=GOODS[Math.floor(R()*GOODS.length)]!;for(let k=0;k<2;k++)for(let dx=0;dx<18;dx++)for(let dy=0;dy<4;dy++){const lit=dy===0?1.25:dy===3?.6:1;dots.set(x+dx+k*2,deskTop-12+k*-5+dy+4,[Math.min(255,col[0]*lit),Math.min(255,col[1]*lit),Math.min(255,col[2]*lit)]);}
      for(let k=0;k<2;k++)for(let dy=0;dy<4;dy++){dots.set(x+k*2,deskTop-8+k*-5+dy,[60,40,30]);}x+=24;}}
  // 차양 그늘(판매대 위)
  for(let y=cH-2;y<deskTop-6;y++)for(let x2=12;x2<W-12;x2++)dots.set(x2,y,[16,12,8],Math.max(0,Math.round(110-(y-cH)*3.4)));
  baseGrass(dots,6,W-6,H-2,R,.8);
  dots.done();
  const canopy=feather(cut(440,700,256,86),{bottom:4});
  g.save();if(tint)g.filter=`hue-rotate(${tint}deg) saturate(1.15)`;g.drawImage(canopy,0,0);g.restore();
  return c;});}
export function drawStall(g:Ctx,x:number,y:number,s:number,tint:number){const sp=stallSprite(tint),k=.86*s;shadow(g,x+10,y-4,sp.width*k*.52,sp.width*k*.12,.45);put(g,sp,x,y,k,.5,.98);}

// ───────────── 바위·덤불
const boulder=()=>once('boulder',()=>ellipseMask(cut(176,914,56,44),28,26,25,19));
const shrub=()=>once('shrub',()=>ellipseMask(cut(136,536,64,38),32,20,31,19));
export function drawBoulder(g:Ctx,x:number,y:number,s:number,flip:boolean,R:R,flat=1){const sp=boulder(),k=1.55*s*(.9+R()*.2);shadow(g,x+8,y-2,sp.width*k*.5,sp.width*k*.15*flat,.4);
  if(flat<1){g.save();g.translate(0,y);g.scale(1,flat);g.translate(0,-y);put(g,sp,x,y,k,.5,.9,flip,`brightness(${(.95+R()*.12).toFixed(2)}) saturate(.7)`);g.restore();return;}
  put(g,sp,x,y,k,.5,.9,flip,`brightness(${(.92+R()*.14).toFixed(2)})`);}
export function drawShrub(g:Ctx,x:number,y:number,s:number,flip:boolean,R:R){const sp=shrub(),k=1.25*s*(.85+R()*.3);shadow(g,x+6,y-2,sp.width*k*.48,sp.width*k*.13,.36);put(g,sp,x,y,k,.5,.92,flip,`hue-rotate(${Math.round((R()-.5)*16)}deg)`);}

// ───────────── 허물어진 담: 원화 성벽을 잘라 윗선을 무너뜨리고 발치에 돌무더기
export function ruinSprite(variant:number){return once('ruin:'+variant,()=>{
  const R=rng(31+variant),src=cut(1180,722,340,194),W=src.width,H=src.height,{c,g}=cv(W,H+10);g.drawImage(src,0,6);
  const img=g.getImageData(0,0,W,H+10),d=img.data;
  // 무너진 윗선: 한쪽이 높고 한쪽으로 무너져 내린 들쭉날쭉한 선
  const peak=variant%2?W*.78:W*.22;let wob=0;
  for(let x=0;x<W;x++){wob+=(R()-.5)*3;wob*=.86;const t=Math.abs(x-peak)/W,cutY=Math.round(6+H*(.08+t*1.05)+wob+(R()<.08?R()*10:0));for(let y=0;y<Math.min(cutY,H+10);y++)d[(y*W+x)*4+3]=0;
    // 새로 드러난 깨진 단면: 밝은 돌빛 두어 줄
    for(let k=0;k<2;k++){const i=((cutY+k)*W+x)*4;if(cutY+k<H+10&&d[i+3]!>0){const f=k?1.12:1.28;d[i]=Math.min(255,d[i]!*f);d[i+1]=Math.min(255,d[i+1]!*f);d[i+2]=Math.min(255,d[i+2]!*f);}}}
  g.putImageData(img,0,0);
  const dots=new Dots(g,W,H+10);
  for(let i=0;i<26;i++){const bx=R()*W,by=H+2+R()*6,w=3+Math.floor(R()*5);for(let dx=0;dx<w;dx++){dots.set(bx+dx,by,STONE[5]!);dots.set(bx+dx,by+1,STONE[3]!);dots.set(bx+dx,by+2,STONE[1]!);}}
  baseGrass(dots,0,W,H+8,R,1.1);dots.done();return c;});}
export function drawRuin(g:Ctx,x:number,y:number,s:number,variant:number,flip:boolean){const sp=ruinSprite(variant),k=.62*s;shadow(g,x+10,y-4,sp.width*k*.5,sp.width*k*.1,.45);put(g,sp,x,y,k,.5,.97,flip);}
