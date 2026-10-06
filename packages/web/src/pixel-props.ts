/**
 * 야외 이야기 무대 소품을 '도트 그림'으로 그린다 — 집·나무 그림(scenery-v3)과 같은 결이 되게.
 * 한 도트 = 지도 3px. 작은 화폭에 도트를 찍어 명암(왼쪽 위에서 오는 빛)·질감·테두리를 넣은 뒤, 흐리지 않게(최근접) 키워 붙인다.
 * 둥근 것(바위·덤불·볏단·항아리·디딤돌)은 '높이 → 기울기 → 빛'으로 도트마다 밝기를 정해 색 계단에 맞춰 찍고,
 * 바위는 면(깎인 판)마다 같은 기울기를 줘서 모가 난다. 건물·노점·석등 같은 것은 도트를 직접 찍는다.
 */
export const PX=3;
type Ctx=CanvasRenderingContext2D;
type R=()=>number;
export interface Pix {c:HTMLCanvasElement;g:Ctx;w:number;h:number}
export function pix(w:number,h:number):Pix{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d')!;g.imageSmoothingEnabled=false;return {c,g,w,h};}
/** 작은 화폭을 PX배로 키워 붙인다. (ax,ay): 화폭에서 땅에 닿는 점 → 지도 좌표 (x,y)에 맞춘다. */
export function blit(g:Ctx,p:Pix,x:number,y:number,ax=p.w/2,ay=p.h){g.save();g.imageSmoothingEnabled=false;g.drawImage(p.c,Math.round(x-ax*PX),Math.round(y-ay*PX),p.w*PX,p.h*PX);g.restore();}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>v/16-.5);
const dither=(x:number,y:number)=>BAYER[(y&3)*4+(x&3)]!;
const hex=(c:string)=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)] as const;

/** 도트 하나하나에 색을 정하는 화폭(빠르게 ImageData로). */
class Dots{
  img:ImageData;d:Uint8ClampedArray;
  constructor(public p:Pix){this.img=p.g.getImageData(0,0,p.w,p.h);this.d=this.img.data;}
  set(x:number,y:number,c:string|readonly [number,number,number],a=255){x|=0;y|=0;if(x<0||y<0||x>=this.p.w||y>=this.p.h)return;const [r,g,b]=typeof c==='string'?hex(c):c,i=(y*this.p.w+x)*4;
    if(a>=255){this.d[i]=r;this.d[i+1]=g;this.d[i+2]=b;this.d[i+3]=255;}else{const k=a/255,o=this.d[i+3]!/255;this.d[i]=r*k+this.d[i]!*(1-k);this.d[i+1]=g*k+this.d[i+1]!*(1-k);this.d[i+2]=b*k+this.d[i+2]!*(1-k);this.d[i+3]=Math.max(this.d[i+3]!,a)*(o||k?1:1);}}
  alpha(x:number,y:number){if(x<0||y<0||x>=this.p.w||y>=this.p.h)return 0;return this.d[(y*this.p.w+x)*4+3]!;}
  /** 그림 둘레에 어두운 테두리(집·나무 도트 그림처럼). */
  outline(c='#1a120a'){const {w,h}=this.p,A=new Uint8Array(w*h);for(let i=0;i<w*h;i++)A[i]=this.d[i*4+3]!>40?1:0;
    const on=(x:number,y:number)=>x>=0&&y>=0&&x<w&&y<h&&A[y*w+x]===1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)&&(!on(x-1,y)||!on(x+1,y)||!on(x,y-1)||!on(x,y+1)))this.set(x,y,c);}
  done(){this.p.g.putImageData(this.img,0,0);}
}

/** 모양 틀: true인 도트만 칠한다. */
type Mask={w:number;h:number;m:Uint8Array};
const mask=(w:number,h:number):Mask=>({w,h,m:new Uint8Array(w*h)});
const inM=(k:Mask,x:number,y:number)=>x>=0&&y>=0&&x<k.w&&y<k.h&&k.m[y*k.w+x]===1;
/** 울퉁불퉁한 덩어리(타원 + 둘레 잡음). flatBottom: 아래를 잘라 땅에 앉힌다. */
function blob(k:Mask,cx:number,cy:number,rx:number,ry:number,R:R,rough=.18,flatBottom=0){
  const n=9,amp=Array.from({length:n},()=>1+(R()-.5)*2*rough),ph=R()*6.283;
  for(let y=0;y<k.h;y++)for(let x=0;x<k.w;x++){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,a=Math.atan2(dy,dx)+ph,t=(a/6.283+1)%1*n,i=Math.floor(t),f=t-i,rr=amp[i%n]!*(1-f)+amp[(i+1)%n]!*f;
    if(dx*dx+dy*dy<=rr*rr&&(!flatBottom||y<cy+ry*flatBottom))k.m[y*k.w+x]=1;}
}
/** 틀 안쪽 거리(가장자리에서 몇 도트 들어왔나). */
function inset(k:Mask){const D=new Float32Array(k.w*k.h).fill(0);
  for(let y=0;y<k.h;y++)for(let x=0;x<k.w;x++)if(inM(k,x,y)){let v=99;for(let r=1;r<12&&v===99;r++){for(let a=0;a<16;a++){const xx=Math.round(x+Math.cos(a*.3927)*r),yy=Math.round(y+Math.sin(a*.3927)*r);if(!inM(k,xx,yy)){v=r;break;}}}D[y*k.w+x]=v===99?12:v;}return D;}
const L=(()=>{const v=[-.55,-.7,.75],m=Math.hypot(...v);return v.map(x=>x/m) as [number,number,number];})();

/**
 * 둥근 덩어리 명암: 높이(가장자리 거리의 제곱근) → 기울기 → 빛 → 색 계단. 테두리는 가장 어두운 색.
 * facets: 면 개수(바위는 깎인 판처럼, 0이면 매끈).
 */
function shadeBlob(dots:Dots,k:Mask,ramp:string[],R:R,o:{facets?:number;grain?:number;outline?:string;top?:number;lift?:number}={}){
  const D=inset(k),H=(x:number,y:number)=>inM(k,x,y)?Math.sqrt(Math.min(D[y*k.w+x]!,o.top??6)):0;
  const seeds=o.facets?Array.from({length:o.facets},()=>{let x=0,y=0;for(let t=0;t<40;t++){x=Math.floor(R()*k.w);y=Math.floor(R()*k.h);if(inM(k,x,y))break;}return {x,y,tilt:[(R()-.5)*1.1,(R()-.5)*.8],off:(R()-.5)*.18};}):[];
  for(let y=0;y<k.h;y++)for(let x=0;x<k.w;x++){if(!inM(k,x,y))continue;
    let nx=(H(x-1,y)-H(x+1,y))*.9,ny=(H(x,y-1)-H(x,y+1))*.9-(o.lift??.25),nz=1;
    if(seeds.length){let best=seeds[0]!,bd=1e9;for(const s of seeds){const d=(s.x-x)**2+((s.y-y)*1.3)**2;if(d<bd){bd=d;best=s;}}const cn=[(H(best.x-1,best.y)-H(best.x+1,best.y))*.9,(H(best.x,best.y-1)-H(best.x,best.y+1))*.9];nx=cn[0]!+best.tilt[0]!;ny=cn[1]!+best.tilt[1]!-(o.lift??.25);}
    let off=0;if(seeds.length){let best=seeds[0]!,bd=1e9;for(const s of seeds){const d=(s.x-x)**2+((s.y-y)*1.3)**2;if(d<bd){bd=d;best=s;}}off=best.off;}
    const m=Math.hypot(nx,ny,nz);let lum=(nx*L[0]+ny*L[1]+nz*L[2])/m;lum=(lum-.3)/.65+off+(R()-.5)*(o.grain??.08)+dither(x,y)*.07-(y>k.h*.8?.18:0);
    const i=Math.max(1,Math.min(ramp.length-1,Math.floor(lum*(ramp.length-1)+.5)));dots.set(x,y,ramp[i]!);}
  // 테두리
  const edge=o.outline??ramp[0]!;
  for(let y=0;y<k.h;y++)for(let x=0;x<k.w;x++)if(inM(k,x,y)&&(!inM(k,x-1,y)||!inM(k,x+1,y)||!inM(k,x,y-1)||!inM(k,x,y+1)))dots.set(x,y,edge);
  return D;
}
/** 땅에 드리운 그림자(지도 해상도, 부드럽게). */
export function groundShadow(g:Ctx,x:number,y:number,rx:number,ry:number,a=.42){const gr=g.createRadialGradient(x,y,0,x,y,rx);gr.addColorStop(0,`rgba(10,14,6,${a})`);gr.addColorStop(.7,`rgba(10,14,6,${a*.55})`);gr.addColorStop(1,'rgba(10,14,6,0)');g.save();g.translate(x,y);g.scale(1,ry/rx);g.translate(-x,-y);g.fillStyle=gr;g.fillRect(x-rx,y-rx,rx*2,rx*2);g.restore();}

const STONE=['#231f1a','#37312a','#4d463d','#655d51','#7f7667','#9a907f','#b8ad99'];
const MOSS=['#3a4a22','#566a2c','#738a3a'];
const LEAF=['#16260f','#22391a','#2f4f22','#40672c','#558238','#6e9c46','#8db35a'];
const STRAW=['#4a3414','#6e5020','#94702e','#b8913e','#d6b058','#ecd07c'];
const CLAY=['#2e1a0c','#4e2e16','#70441f','#93602c','#b07c3e','#cc9a58'];
const WOOD=['#2a1a0e','#432915','#5e3c20','#7c522c','#9a6a3a','#b8844c'];

/** 바위: 모가 난 면, 위쪽 이끼, 금 몇 줄. */
export function rock(g:Ctx,x:number,y:number,s:number,R:R){
  const w=Math.round(30*s)+6,h=Math.round(22*s)+6,p=pix(w,h),k=mask(w,h);
  blob(k,w/2,h*.62,w*.44,h*.52,R,.22,.86);
  const dots=new Dots(p);shadeBlob(dots,k,STONE,R,{facets:5+Math.floor(R()*3),grain:.05});
  for(let i=0;i<w*h*.05;i++){const xx=Math.floor(R()*w),yy=Math.floor(R()*h*.6);if(inM(k,xx,yy)&&inM(k,xx,yy-1)&&!inM(k,xx,yy-2))dots.set(xx,yy,MOSS[Math.floor(R()*3)]!);}
  dots.done();groundShadow(g,x+6,y,w*PX*.52,h*PX*.2,.45);blit(g,p,x,y,w/2,h*.92);
}
/** 덤불: 잎 덩이 여럿, 잎결 잡음, 가끔 꽃. */
export function bush(g:Ctx,x:number,y:number,s:number,R:R){
  const w=Math.round(30*s)+6,h=Math.round(22*s)+6,p=pix(w,h),k=mask(w,h);
  for(let i=0;i<6;i++)blob(k,w*(.25+R()*.5),h*(.35+R()*.35),w*(.14+R()*.1),h*(.18+R()*.12),R,.3);
  const dots=new Dots(p);shadeBlob(dots,k,LEAF,R,{grain:.3,top:4});
  if(R()<.4)for(let i=0;i<5;i++){const xx=Math.floor(R()*w),yy=Math.floor(R()*h);if(inM(k,xx,yy)&&inM(k,xx,yy+1))dots.set(xx,yy,R()<.5?'#f0e6f0':'#f2a0b8');}
  dots.done();groundShadow(g,x+6,y,w*PX*.5,h*PX*.18,.38);blit(g,p,x,y,w/2,h*.85);
}
/** 볏단: 짚 결이 세로로 흐르는 둥근 더미와 새끼줄. */
export function haystack(g:Ctx,x:number,y:number,s:number,R:R){
  const w=Math.round(30*s),h=Math.round(28*s),p=pix(w,h),k=mask(w,h);blob(k,w/2,h*.7,w*.46,h*.66,R,.08,.95);
  const dots=new Dots(p);shadeBlob(dots,k,STRAW,R,{grain:.05,top:7});
  for(let xx=1;xx<w-1;xx+=2)for(let yy=0;yy<h;yy++)if(inM(k,xx,yy)&&R()<.5)dots.set(xx,yy,STRAW[1]!,90);
  const by=Math.floor(h*.55);for(let xx=0;xx<w;xx++)if(inM(k,xx,by)){dots.set(xx,by,'#5a3a14');dots.set(xx,by-1,'#a0742c');}
  dots.done();groundShadow(g,x+8,y,w*PX*.55,h*PX*.16,.45);blit(g,p,x,y,w/2,h*.97);
}
/** 항아리: 둥근 몸·어깨 띠·주둥이. */
export function jar(g:Ctx,x:number,y:number,s:number,R:R){
  const w=Math.round(16*s)+2,h=Math.round(20*s)+2,p=pix(w,h),k=mask(w,h);blob(k,w/2,h*.58,w*.44,h*.42,R,.03,.98);
  const dots=new Dots(p);shadeBlob(dots,k,CLAY,R,{grain:.05,top:5});
  const ty=Math.round(h*.18);for(let xx=Math.round(w*.32);xx<w*.68;xx++){dots.set(xx,ty,CLAY[4]!);dots.set(xx,ty+1,CLAY[1]!);}
  for(let xx=0;xx<w;xx++)if(inM(k,xx,Math.round(h*.38)))dots.set(xx,Math.round(h*.38),CLAY[2]!);
  dots.done();groundShadow(g,x+4,y,w*PX*.55,h*PX*.15,.45);blit(g,p,x,y,w/2,h*.98);
}
/** 디딤돌: 납작하고 반들반들한 돌. */
export function stepstone(g:Ctx,x:number,y:number,s:number,R:R){
  const w=Math.round(26*s),h=Math.round(12*s),p=pix(w,h),k=mask(w,h);blob(k,w/2,h/2,w*.46,h*.4,R,.12);
  const dots=new Dots(p);shadeBlob(dots,k,STONE.slice(1),R,{grain:.04,top:3,lift:.35});dots.done();
  groundShadow(g,x+3,y+6,w*PX*.5,h*PX*.4,.3);blit(g,p,x,y,w/2,h/2);
}
/** 그루터기. */
export function stump(g:Ctx,x:number,y:number,s:number,R:R){
  const w=Math.round(18*s),h=Math.round(16*s),p=pix(w,h),dots=new Dots(p),cx=w/2;
  for(let yy=Math.round(h*.35);yy<h;yy++)for(let xx=2;xx<w-2;xx++){const t=(xx-2)/(w-4);dots.set(xx,yy,WOOD[Math.max(1,Math.min(5,Math.round(4-t*3+dither(xx,yy))))]!);}
  for(let yy=0;yy<h*.7;yy++)for(let xx=0;xx<w;xx++){const dx=(xx+.5-cx)/(w*.45),dy=(yy+.5-h*.35)/(h*.28);const r=dx*dx+dy*dy;if(r<=1)dots.set(xx,yy,r>.75?'#6e4826':Math.floor(Math.sqrt(r)*4)%2?'#c49a62':'#d9b47c');}
  dots.outline();dots.done();groundShadow(g,x+4,y,w*PX*.5,h*PX*.18,.4);blit(g,p,x,y,cx,h);
}

/** 정자: 돌 기단·계단, 붉은 기둥(빛 받는 면과 그늘), 난간, 겹처마 기와지붕(기와골·처마 끝 반짝임), 꼭대기 장식. */
export function pavilion(g:Ctx,x:number,y:number,s:number,R:R){
  const W=Math.round(84*s),H=Math.round(78*s),p=pix(W,H),dots=new Dots(p),cx=W/2;
  const baseTop=Math.round(H*.74),baseH=Math.round(H*.1);
  // 기단: 윗면(밝게)·앞면(어둡게)
  for(let yy=baseTop-Math.round(H*.08);yy<baseTop;yy++)for(let xx=Math.round(W*.1);xx<W*.9;xx++){const v=STONE[5-(yy%3===0?1:0)]!;dots.set(xx,yy,(xx+yy*2)%7===0?STONE[4]!:v);}
  for(let yy=baseTop;yy<baseTop+baseH;yy++)for(let xx=Math.round(W*.1);xx<W*.9;xx++){dots.set(xx,yy,(xx%6===0||yy===baseTop)?STONE[1]!:STONE[3-(yy-baseTop>baseH/2?1:0)]!);}
  for(let k=0;k<3;k++)for(let xx=Math.round(cx-6+k);xx<cx+6-k;xx++){dots.set(xx,baseTop+baseH+k,STONE[4-k]!);}
  // 기둥 4개
  const colTop=Math.round(H*.36);for(const fx of [.2,.4,.6,.8]){const x0=Math.round(W*fx)-2;for(let yy=colTop;yy<baseTop-Math.round(H*.04);yy++){dots.set(x0,yy,'#d0584a');dots.set(x0+1,yy,'#a8352c');dots.set(x0+2,yy,'#7a2018');dots.set(x0+3,yy,'#4a120e');}
    for(const dx of [0,1,2,3])dots.set(x0+dx,colTop,'#e0b050');}
  // 난간
  for(let xx=Math.round(W*.18);xx<W*.82;xx++){const ry=baseTop-Math.round(H*.1);dots.set(xx,ry,'#7a4a24');dots.set(xx,ry+1,'#4a2a12');if(xx%4===0)for(let k=2;k<6;k++)dots.set(xx,ry+k,'#5a3618');}
  // 지붕: 꼭대기에서 처마로 넓어지며, 처마 끝이 살짝 들린다
  const apex=Math.round(H*.04),eave=Math.round(H*.42);
  for(let yy=apex;yy<=eave;yy++){const t=(yy-apex)/(eave-apex),hw=Math.max(1,W*.5*Math.pow(t,.75));
    for(let xx=Math.round(cx-hw);xx<=cx+hw;xx++){const u=(xx-cx)/hw;const lift=Math.max(0,(Math.abs(u)-.7)/.3);const yLift=yy-Math.round(lift*lift*4);
      const stripe=Math.floor((u+1)*9+.5)%2===0,side=u<-.05?1:u>.05?-1:0,base=side>0?['#21403c','#335e56','#457a6e']:['#16302c','#264a44','#356056'];
      let c=stripe?base[2]!:base[1]!;if((yy-apex)%3===0)c=base[0]!;if(yy===eave||yy===eave-1)c=yy===eave?'#0e1e1c':'#7aa496';for(let k=yLift;k<=yy;k++)dots.set(xx,k,k===yLift?c:(yy===eave?'#7aa496':c));}}
  // 처마 아래 그늘 띠

  // 꼭대기 장식
  for(let k=0;k<3;k++){dots.set(cx,apex-k,'#e8c060');dots.set(cx-1,apex-k,'#b08830');}
  dots.outline();dots.done();groundShadow(g,x+20,y-4,W*PX*.5,W*PX*.16,.5);blit(g,p,x,y,cx,baseTop+baseH+3);
}
/** 노점: 기둥·판자 진열대·물건(과일·항아리·천)·줄무늬 차양(물결 끝단, 아래 그늘). */
export function stall(g:Ctx,x:number,y:number,s:number,R:R,tone='#a8322a'){
  const W=Math.round(50*s),H=Math.round(44*s),p=pix(W,H),dots=new Dots(p),[r,gg,b]=hex(tone);
  const dark=[r*.55,gg*.55,b*.55] as const,mid=[r,gg,b] as const,lite=[Math.min(255,r*1.25+30),Math.min(255,gg*1.25+30),Math.min(255,b*1.25+30)] as const,cream=[236,226,200] as const,creamD=[196,184,156] as const;
  const tableY=Math.round(H*.62),tableH=Math.round(H*.18);
  // 기둥
  for(const fx of [.12,.88])for(let yy=Math.round(H*.18);yy<H;yy++){const x0=Math.round(W*fx);dots.set(x0,yy,WOOD[4]!);dots.set(x0+1,yy,WOOD[2]!);}
  // 진열대(윗면 밝게, 앞면 판자)
  for(let yy=tableY-3;yy<tableY;yy++)for(let xx=Math.round(W*.08);xx<W*.92;xx++)dots.set(xx,yy,WOOD[5-(yy===tableY-1?1:0)]!);
  for(let yy=tableY;yy<tableY+tableH;yy++)for(let xx=Math.round(W*.08);xx<W*.92;xx++)dots.set(xx,yy,xx%7===0?WOOD[1]!:WOOD[3-(yy>tableY+tableH/2?1:0)]!);
  // 차양: 위로 갈수록 좁은 사다리꼴, 줄무늬, 앞쪽 끝단 물결
  const top=Math.round(H*.06),bot=Math.round(H*.3);
  for(let yy=top;yy<=bot;yy++){const t=(yy-top)/(bot-top),hw=W*(.38+t*.14);for(let xx=Math.round(W/2-hw);xx<=W/2+hw;xx++){const stripe=Math.floor((xx-(W/2-hw))/((hw*2)/8))%2===0;const shade=t<.25?2:t>.8?0:1;dots.set(xx,yy,stripe?[mid,lite,mid][shade]!:[creamD,cream,creamD][shade]!);}}
  for(let xx=Math.round(W*.04);xx<W*.96;xx++){const k=(xx%5);const d=k<3?1:0;for(let j=0;j<=d+1;j++)dots.set(xx,bot+1+j,j>d?dark:Math.floor((xx-W*.04)/((W*.92)/8))%2===0?mid:creamD);}
  for(let xx=Math.round(W*.1);xx<W*.9;xx++)for(let k=0;k<3;k++)dots.set(xx,bot+4+k,'#1a120a',110-k*30);
  dots.outline();
  // 물건
  const goods=['#d84a30','#e8a030','#9ac040','#f0e0a0','#c06030','#7a4a8a'];for(let xx=Math.round(W*.12);xx<W*.86;xx+=3){const c=goods[Math.floor(R()*goods.length)]!;const big=R()<.3;dots.set(xx,tableY-4,c);dots.set(xx+1,tableY-4,c);dots.set(xx,tableY-5,c);dots.set(xx+1,tableY-5,'#fff4d8');if(big){dots.set(xx,tableY-6,c);dots.set(xx+1,tableY-6,c);}}
  dots.done();groundShadow(g,x+10,y,W*PX*.55,W*PX*.14,.45);blit(g,p,x,y,W/2,H);
}
/** 석등: 받침·기둥·불창(따뜻한 빛)·지붕돌·보주. */
export function lantern(g:Ctx,x:number,y:number,s:number,R:R){
  const W=Math.round(18*s)+2,H=Math.round(36*s)+2,p=pix(W,H),dots=new Dots(p),cx=Math.floor(W/2);
  const box=(x0:number,y0:number,w:number,h:number,lit=true)=>{for(let yy=y0;yy<y0+h;yy++)for(let xx=x0;xx<x0+w;xx++){const t=(xx-x0)/Math.max(1,w-1);dots.set(xx,yy,STONE[Math.max(1,Math.min(6,Math.round((lit?5.4:4.4)-t*3+dither(xx,yy))))]!);}for(let xx=x0;xx<x0+w;xx++)dots.set(xx,y0+h-1,STONE[1]!);};
  box(cx-6,H-4,12,4);box(cx-2,Math.round(H*.45),4,Math.round(H*.45));box(cx-5,Math.round(H*.4),10,3);
  box(cx-4,Math.round(H*.25),8,Math.round(H*.15));for(let yy=Math.round(H*.28);yy<H*.37;yy++)for(let xx=cx-2;xx<cx+2;xx++)dots.set(xx,yy,(xx+yy)%2?'#ffd27a':'#f0a040');
  for(let yy=Math.round(H*.12);yy<H*.25;yy++){const t=(yy-H*.12)/(H*.13),hw=2+t*5;for(let xx=Math.round(cx-hw);xx<=cx+hw;xx++)dots.set(xx,yy,STONE[xx<cx?5:3]!);}
  dots.set(cx,Math.round(H*.09),STONE[5]!);dots.set(cx,Math.round(H*.1)-2,STONE[4]!);
  dots.outline();dots.done();groundShadow(g,x+6,y,W*PX*.6,W*PX*.2,.4);blit(g,p,x,y,cx,H);
  // 불빛
  const gl=g.createRadialGradient(x,y-H*PX*.68,0,x,y-H*PX*.68,60);gl.addColorStop(0,'rgba(255,200,110,.35)');gl.addColorStop(1,'rgba(255,200,110,0)');g.fillStyle=gl;g.fillRect(x-60,y-H*PX*.68-60,120,120);
}
/** 평상: 판자 윗면·앞판·다리. */
export function bench(g:Ctx,x:number,y:number,s:number,R:R){
  const W=Math.round(46*s),H=Math.round(16*s),p=pix(W,H),dots=new Dots(p);
  for(let yy=0;yy<5;yy++)for(let xx=0;xx<W;xx++)dots.set(xx,yy,xx%8===0?WOOD[2]!:WOOD[yy<1?5:4]!);
  for(let yy=5;yy<8;yy++)for(let xx=0;xx<W;xx++)dots.set(xx,yy,WOOD[2]!);
  for(const x0 of [2,W-5])for(let yy=8;yy<H;yy++){dots.set(x0,yy,WOOD[3]!);dots.set(x0+1,yy,WOOD[3]!);dots.set(x0+2,yy,WOOD[1]!);}
  dots.outline();dots.done();groundShadow(g,x+6,y,W*PX*.55,H*PX*.3,.4);blit(g,p,x,y,W/2,H);
}
/** 울타리 한 칸: 기둥 둘과 가로대 둘. */
export function fence(g:Ctx,x:number,y:number,cell:number){
  const W=Math.round(cell/PX),H=24,p=pix(W,H),dots=new Dots(p);
  for(const x0 of [2,W-5]){for(let yy=1;yy<H;yy++){dots.set(x0,yy,WOOD[4]!);dots.set(x0+1,yy,WOOD[3]!);dots.set(x0+2,yy,WOOD[1]!);}dots.set(x0,0,WOOD[5]!);dots.set(x0+1,0,WOOD[4]!);}
  for(const ry of [6,14])for(let xx=0;xx<W;xx++){dots.set(xx,ry,WOOD[4]!);dots.set(xx,ry+1,WOOD[2]!);}
  dots.outline();dots.done();blit(g,p,x,y,W/2,H);
}
/** 우물: 돌 둘레(둥근 돌 쌓기)·검은 물·두레박 틀. */
export function well(g:Ctx,x:number,y:number,s:number,R:R){
  const W=Math.round(40*s),H=Math.round(36*s),p=pix(W,H),dots=new Dots(p),cx=W/2,cy=H*.62;
  for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++){const dx=(xx+.5-cx)/(W*.46),dy=(yy+.5-cy)/(H*.3);const r=dx*dx+dy*dy;
    if(r<=1){if(r<.42&&yy<cy+H*.05)dots.set(xx,yy,r<.3?'#0c1a1e':'#1c3036');else{const brick=(Math.floor(Math.atan2(dy,dx)*4)+Math.floor(r*3))%2;dots.set(xx,yy,STONE[brick?4:5-(dy>0?2:0)]!);}}}
  for(let xx=0;xx<W;xx++)for(let yy=0;yy<H;yy++){const dx=(xx+.5-cx)/(W*.46),dy=(yy+.5-cy)/(H*.3);const r=dx*dx+dy*dy;if(r>.92&&r<=1.08&&dy>-.2)dots.set(xx,yy,STONE[1]!);}
  for(const x0 of [Math.round(W*.1),Math.round(W*.86)])for(let yy=Math.round(H*.06);yy<cy;yy++){dots.set(x0,yy,WOOD[4]!);dots.set(x0+1,yy,WOOD[2]!);}
  for(let xx=Math.round(W*.1);xx<W*.9;xx++){dots.set(xx,Math.round(H*.06),WOOD[4]!);dots.set(xx,Math.round(H*.06)+1,WOOD[1]!);}
  for(let yy=Math.round(H*.08);yy<H*.3;yy++)dots.set(Math.round(cx),yy,'#c8b890');for(let yy=Math.round(H*.3);yy<H*.38;yy++)for(let xx=Math.round(cx-2);xx<cx+3;xx++)dots.set(xx,yy,WOOD[3]!);
  dots.outline();dots.done();groundShadow(g,x+8,y,W*PX*.55,H*PX*.2,.45);blit(g,p,x,y,cx,H*.95);
}
/** 상자: 윗면 밝게·앞면 판자·테 쇠. */
export function crate(g:Ctx,x:number,y:number,s:number,R:R){
  const W=Math.round(18*s)+2,H=Math.round(20*s)+2,p=pix(W,H),dots=new Dots(p),top=Math.round(H*.3);
  for(let yy=0;yy<top;yy++)for(let xx=0;xx<W;xx++)dots.set(xx,yy,yy===0||xx===0||xx===W-1?WOOD[2]!:xx%5===0?WOOD[3]!:WOOD[5]!);
  for(let yy=top;yy<H;yy++)for(let xx=0;xx<W;xx++)dots.set(xx,yy,xx===0||xx===W-1||yy===H-1||yy===top?WOOD[1]!:(xx===yy-top+1||xx===W-(yy-top)-2)?WOOD[2]!:WOOD[3+(xx<W/2?1:0)]!);
  for(const [xx,yy] of [[1,top+1],[W-2,top+1],[1,H-2],[W-2,H-2]] as const)dots.set(xx,yy,'#c0b8a0');
  dots.outline();dots.done();groundShadow(g,x+5,y,W*PX*.6,W*PX*.22,.45);blit(g,p,x,y,W/2,H);
}
/** 허물어진 담: 들쭉날쭉한 윗선의 돌 쌓기, 이끼, 앞 돌무더기. */
export function ruinWall(g:Ctx,x:number,y:number,s:number,R:R,flip:boolean){
  const W=Math.round(70*s),H=Math.round(34*s),p=pix(W,H),dots=new Dots(p);
  const tops:number[]=[];let t=H*.3;for(let xx=0;xx<W;xx++){const peak=flip?W*.75:W*.25;t=Math.max(H*.1,Math.min(H*.9,H*(.15+Math.abs(xx-peak)/W*1.2)+(R()-.5)*3));tops.push(Math.round(t));}
  for(let xx=0;xx<W;xx++)for(let yy=tops[xx]!;yy<H-2;yy++){const row=Math.floor((yy-H)/5),off=(row%2)*5,bx=(xx+off)%10,by=(H-yy)%5;const mortar=bx===0||by===0;
    const lit=yy-tops[xx]!<2;dots.set(xx,yy,mortar?STONE[1]!:lit?STONE[6]!:STONE[(xx+row*3)%3+3]!);}
  for(let xx=0;xx<W;xx++)if(R()<.25)dots.set(xx,tops[xx]!,MOSS[Math.floor(R()*3)]!);
  for(let i=0;i<10;i++){const rx=Math.floor(R()*W),ry=H-2-Math.floor(R()*3);dots.set(rx,ry,STONE[4]!);dots.set(rx+1,ry,STONE[3]!);dots.set(rx,ry-1,STONE[5]!);}
  dots.outline();dots.done();groundShadow(g,x+10,y,W*PX*.5,H*PX*.18,.45);blit(g,p,x,y,W/2,H-1);
}
/** 마른 나무: 도트로 그린 굽은 가지. */
export function deadTree(g:Ctx,x:number,y:number,s:number,R:R,flip:boolean){
  const W=Math.round(60*s),H=Math.round(76*s),p=pix(W,H),dots=new Dots(p);
  const line=(x0:number,y0:number,x1:number,y1:number,w:number)=>{const n=Math.ceil(Math.hypot(x1-x0,y1-y0));for(let i=0;i<=n;i++){const xx=x0+(x1-x0)*i/n,yy=y0+(y1-y0)*i/n;for(let k=0;k<w;k++){dots.set(xx+k-w/2,yy,k===0?'#7a5a3e':k===w-1?'#2a1a10':'#4e3824');}}};
  const br=(bx:number,by:number,a:number,l:number,w:number,d:number):void=>{const ex=bx+Math.cos(a)*l,ey=by+Math.sin(a)*l;line(bx,by,ex,ey,Math.max(1,Math.round(w)));if(d<4)for(const k of [-1,1])br(ex,ey,a+k*(.35+R()*.4),l*(.6+R()*.15),w*.62,d+1);};
  br(W/2,H-1,-Math.PI/2+(flip?.1:-.1),H*.36,5*s+1,0);
  dots.done();groundShadow(g,x+12,y,W*PX*.3,W*PX*.08,.4);blit(g,p,x,y,W/2,H-1);
}
/** 갈대 한 무더기(도트 줄기와 부들 이삭). */
export function reeds(g:Ctx,x:number,y:number,s:number,R:R){
  const W=Math.round(22*s)+4,H=Math.round(18*s)+4,p=pix(W,H),dots=new Dots(p),G=['#3e5a22','#5a7a2e','#7a9a3e','#9ab858'];
  for(let i=0;i<12;i++){const x0=Math.floor(3+R()*(W-6)),h=Math.floor(H*(.35+R()*.6)),lean=(R()-.5)*.6;for(let k=0;k<h;k++){const xx=Math.round(x0+lean*k*k/h);dots.set(xx,H-1-k,G[Math.min(3,1+Math.floor(k/h*3))]!);if(k<h*.3)dots.set(xx+1,H-1-k,G[0]!);}
    if(R()<.4){const tx=Math.round(x0+lean*h);dots.set(tx,H-1-h,'#7a5228');dots.set(tx,H-h,'#5a3a18');dots.set(tx,H+1-h,'#6a4420');}}
  dots.done();blit(g,p,x,y,W/2,H);
}
/** 들꽃 한 무더기: 잎 도트 위에 색 꽃 도트. */
export function flowers(g:Ctx,x:number,y:number,R:R){
  const W=26,H=12,p=pix(W,H),dots=new Dots(p),cols=['#f6f0dc','#f2d24a','#e98aa8','#c9a0e8','#ff9a6a'];
  for(let i=0;i<9;i++){const xx=Math.floor(R()*(W-2))+1,yy=Math.floor(R()*(H-3))+2,c=cols[Math.floor(R()*cols.length)]!;dots.set(xx,yy+1,'#4a7a2c');dots.set(xx,yy,c);dots.set(xx+1,yy,c);dots.set(xx,yy-1,c);if(R()<.5)dots.set(xx+1,yy-1,'#fff8e0');}
  dots.done();blit(g,p,x,y,W/2,H/2);
}

// ───────────── 넓은 바닥(연못·논밭·바위 비탈)은 지도 전체를 1/PX 화폭에 도트로 그린 뒤 키운다
export interface Field {p:Pix;dots:Dots}
export function fieldLayer(pw:number,ph:number):Field{const p=pix(Math.ceil(pw/PX),Math.ceil(ph/PX));return {p,dots:new Dots(p)};}
export function fieldBlit(g:Ctx,f:Field){f.dots.done();g.save();g.imageSmoothingEnabled=false;g.drawImage(f.p.c,0,0,f.p.w*PX,f.p.h*PX);g.restore();}
/** 값 잡음(부드러운 무작위 높낮이). */
function valueNoise(w:number,h:number,cell:number,R:R){const gw=Math.ceil(w/cell)+2,gh=Math.ceil(h/cell)+2,v=Array.from({length:gw*gh},()=>R());const sm=(t:number)=>t*t*(3-2*t);
  return (x:number,y:number)=>{const fx=x/cell,fy=y/cell,ix=Math.floor(fx),iy=Math.floor(fy),tx=sm(fx-ix),ty=sm(fy-iy),X0=((ix%gw)+gw)%gw,X1=(X0+1)%gw,Y0=((iy%gh)+gh)%gh,Y1=(Y0+1)%gh,a=v[Y0*gw+X0]!,b=v[Y0*gw+X1]!,c=v[Y1*gw+X0]!,d=v[Y1*gw+X1]!;return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;};}

/**
 * 연못·늪: 칸 덩어리를 잡음으로 일그러뜨린 물가, 물가 진흙 띠·풀, 얕은 물빛 → 깊은 물빛 계단, 물결 반짝임, 연잎·연꽃, 물가 돌.
 * inside(x,y): 지도 좌표(px)가 물칸인가.
 */
export function pond(f:Field,cellPx:number,isPool:(cx:number,cy:number)=>boolean,R:R){
  const {p,dots}=f,cs=cellPx/PX,n1=valueNoise(p.w,p.h,9,R),n2=valueNoise(p.w,p.h,3,R);
  const W=p.w,H=p.h,M=new Uint8Array(W*H);
  // 물칸 중심에서의 거리장(부드러운 합) + 잡음 → 문턱
  const centers:Array<[number,number]>=[];for(let cy=0;cy<Math.ceil(H/cs);cy++)for(let cx=0;cx<Math.ceil(W/cs);cx++)if(isPool(cx,cy))centers.push([(cx+.5)*cs,(cy+.5)*cs]);
  if(!centers.length)return;
  const F=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let v=0;for(const [cx,cy] of centers){const d2=((x-cx)**2+(y-cy)**2)/(cs*cs);if(d2<4)v+=Math.exp(-d2*1.6);}F[y*W+x]=v+(n1(x,y)-.5)*.5+(n2(x,y)-.5)*.12;}
  for(let i=0;i<W*H;i++)M[i]=F[i]!>.62?1:0;
  const at=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&M[y*W+x]===1;
  const dist=(x:number,y:number)=>{for(let r=1;r<9;r++)for(const [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,r],[r,-r],[-r,-r]] as const)if(!at(x+dx,y+dy))return r;return 9;};
  const WATER=['#123040','#183a4c','#1f4a5a','#2a5e68','#3a7476','#518a84','#6aa094'];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(at(x,y)){const d=dist(x,y),depth=Math.min(1,(d-1)/7);let up=0;for(let k=1;k<=8;k++)if(!at(x,y-k)){up=k;break;}
      // 북쪽 둑 그늘(물에 비친 둑) → 가운데 깊은 물 → 하늘이 비치는 밝은 물결 띠
      const bank=up?(1-up/8)*.55:0,sky=Math.max(0,Math.sin((y*.13+n2(x,y)*2.4))*.5-.1)*.35;
      const lum=1.05-depth*.75-bank+sky+(n2(x,y)-.5)*.18+dither(x,y)*.12;dots.set(x,y,WATER[Math.max(0,Math.min(6,Math.round(lum*6)))]!);
      if(d===1)dots.set(x,y,at(x,y-1)?'#7fb0a0':'#a8ccbc');else if(d===2&&!at(x,y+2))dots.set(x,y,'#5e9a8c');}
    else{let near=9;for(let r=1;r<4&&near===9;r++)for(const [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r]] as const)if(at(x+dx,y+dy)){near=r;break;}
      if(near<=2){dots.set(x,y,near===1?(at(x,y-1)?'#3e3222':'#5a4a30'):'#6e6040',near===1?255:150);}}}
  // 물결 반짝임
  for(let i=0;i<centers.length*14;i++){const x=Math.floor(R()*W),y=Math.floor(R()*H);if(at(x,y)&&at(x+3,y)&&dist(x,y)>2){for(let k=0;k<2+Math.floor(R()*3);k++)dots.set(x+k,y,'#b8dcd0',200);}}
  // 연잎
  for(let i=0;i<centers.length*3;i++){const x=Math.floor(R()*W),y=Math.floor(R()*H);if(!at(x,y)||dist(x,y)<3)continue;for(let dy=-1;dy<=1;dy++)for(let dx=-2;dx<=2;dx++){if(Math.abs(dx)===2&&dy!==0)continue;if(dx===1&&dy===-1)continue;dots.set(x+dx,y+dy,dy===-1?'#7ea84a':dy===1?'#3e6a2a':'#5a8a38');}if(R()<.3){dots.set(x,y-1,'#f4b0c8');dots.set(x+1,y-1,'#fbe0ea');}}
  // 물가 돌
  for(let i=0;i<centers.length*4;i++){const x=Math.floor(R()*W),y=Math.floor(R()*H);if(at(x,y)||!(at(x,y-1)||at(x,y-2)))continue;const w=2+Math.floor(R()*3);for(let dx=0;dx<w;dx++){dots.set(x+dx,y,STONE[4]!);dots.set(x+dx,y+1,STONE[2]!);if(dx>0&&dx<w-1)dots.set(x+dx,y-1,STONE[5]!);}}
}
/**
 * 논밭: 들쭉날쭉한 두렁, 이랑마다 줄지은 포기(세 가지 초록·익은 금빛), 반은 물 댄 논(포기 사이 물빛).
 */
export function crops(f:Field,cellPx:number,isCrop:(cx:number,cy:number)=>boolean,R:R){
  const {p,dots}=f,cs=Math.round(cellPx/PX),n=valueNoise(p.w,p.h,13,R),n2=valueNoise(p.w,p.h,5,R);
  const seen=new Set<string>();const plots:Array<{x0:number;y0:number;x1:number;y1:number}>=[];
  for(let cy=0;cy<Math.ceil(p.h/cs);cy++)for(let cx=0;cx<Math.ceil(p.w/cs);cx++){if(!isCrop(cx,cy)||seen.has(cx+','+cy))continue;let x1=cx;while(isCrop(x1+1,cy))x1++;let y1=cy;while([...Array(x1-cx+1).keys()].every(k=>isCrop(cx+k,y1+1)))y1++;for(let y=cy;y<=y1;y++)for(let x=cx;x<=x1;x++)seen.add(x+','+y);plots.push({x0:cx*cs,y0:cy*cs,x1:(x1+1)*cs,y1:(y1+1)*cs});}
  const GREEN=['#234a18','#2f5e1e','#3e7626','#548e30','#6ea840','#8cc054'],GOLD=['#6a4a14','#8e6820','#b48a2e','#d2aa42','#e8c860','#f4dc8a'];
  const MUD=['#4a3a26','#57452e','#645238'],WATERP=['#3e5a58','#4a6a66','#5e807a','#86a8a0'];
  plots.forEach((pl,pi)=>{const ripe=pi%3===1,paddy=pi%3===0,P=ripe?GOLD:GREEN;
    const inside=(x:number,y:number)=>{const ex=Math.min(x-pl.x0,pl.x1-1-x),ey=Math.min(y-pl.y0,pl.y1-1-y),j=(n2(x,y)-.5)*2.5;return ex>=3+j&&ey>=3+j&&!(ex<7&&ey<7&&(7-ex)**2+(7-ey)**2>36);};
    // 두렁(풀 덮인 흙둑) + 바닥(논은 물, 밭은 흙 이랑)
    for(let y=pl.y0;y<pl.y1;y++)for(let x=pl.x0;x<pl.x1;x++){
      if(!inside(x,y)){const ex=Math.min(x-pl.x0,pl.x1-1-x),ey=Math.min(y-pl.y0,pl.y1-1-y);if(Math.min(ex,ey)>=0&&Math.min(ex,ey)<5){const k=n2(x*3,y*3);dots.set(x,y,k>.62?'#6e8e3c':k>.4?'#8a9a50':'#a89466');if(!inside(x,y+1)&&inside(x,y+2))dots.set(x,y,'#5a4a30');}continue;}
      if(paddy){const v=n2(x,y)+dither(x,y)*.4+((y-pl.y0)%6===0?.25:0);dots.set(x,y,WATERP[Math.max(0,Math.min(3,Math.floor(v*3.2)))]!);}
      else{const row=(y-pl.y0)%6;dots.set(x,y,row===5?MUD[0]!:row===0?MUD[2]!:MUD[1]!);}}
    // 포기: 6도트 이랑마다 4~5도트 간격, 포기마다 V자 잎 3~5줄과 발치 그늘
    for(let ry=pl.y0+5;ry<pl.y1-3;ry+=6)for(let x=pl.x0+4+((ry/6|0)%2)*2;x<pl.x1-4;x+=4+(R()<.25?1:0)){
      if(!inside(x,ry)||!inside(x,ry-4))continue;const lush=n(x+pi*31,ry),h=3+Math.round(lush*3+R()),wide=lush>.5?2:1;
      dots.set(x,ry+1,paddy?'#2e4a46':MUD[0]!);dots.set(x+1,ry+1,paddy?'#2e4a46':MUD[0]!);
      for(let b=-wide;b<=wide;b++)for(let k=0;k<h-Math.abs(b);k++){const xx=x+b*(k>h*.45?1:0)+(b<0&&k>h*.8?-1:0)+(b>0&&k>h*.8?1:0),c=P[Math.min(5,1+Math.floor((k/h)*3.2)+(b<0?1:0)+(lush>.65?1:0))]!;dots.set(xx,ry-k,c);}
      if(ripe&&R()<.7){dots.set(x,ry-h,P[5]!);dots.set(x+1,ry-h+1,P[4]!);}}
  });
}
/** 바위 비탈: 회갈색 자갈땅에 도트 자갈(빛·그늘)과 풀 포기. */
export function scree(f:Field,cellPx:number,isScree:(cx:number,cy:number)=>boolean,R:R){
  const {p,dots}=f,cs=cellPx/PX,n1=valueNoise(p.w,p.h,14,R),n2=valueNoise(p.w,p.h,6,R),W=p.w,H=p.h;
  const S=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const cx=Math.floor(x/cs),cy=Math.floor(y/cs);let v=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(isScree(cx+dx,cy+dy)){const d=Math.hypot(x-(cx+dx+.5)*cs,y-(cy+dy+.5)*cs)/cs;v=Math.max(v,1.25-d);}
    S[y*W+x]=v+(n1(x,y)-.5)*.38;}
  const at=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&S[y*W+x]!>.55;
  const G=['#4a4238','#5a5246','#6a6254','#7a7262'];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!at(x,y))continue;const v=n2(x,y)*.8+n1(x*2,y*2)*.2;dots.set(x,y,G[Math.max(0,Math.min(3,Math.floor(v*4)))]!);
    if(!at(x,y-1)||!at(x,y-2))dots.set(x,y,!at(x,y-1)?'#a89c84':'#8a8070');else if(!at(x,y+1))dots.set(x,y,'#2a241c');}
  // 자갈: 2~5도트 덩이, 위 밝게·아래 그늘
  for(let i=0;i<W*H*.012;i++){const x=Math.floor(R()*W),y=Math.floor(R()*H);if(!at(x,y)||!at(x+4,y+2))continue;const w=2+Math.floor(R()*4),h=1+Math.floor(R()*2);
    for(let dx=0;dx<w;dx++){dots.set(x+dx,y+h,STONE[1]!);for(let dy=0;dy<h;dy++)dots.set(x+dx,y+dy,dy===0?STONE[5]!:STONE[3]!);}dots.set(x,y,STONE[4]!);dots.set(x+w-1,y,STONE[4]!);}
  for(let i=0;i<W*H*.003;i++){const x=Math.floor(R()*W),y=Math.floor(R()*H);if(!at(x,y))continue;for(const [dx,dy,c] of [[0,0,'#3e5a22'],[1,-1,'#5e7a2e'],[-1,-1,'#4e6a28'],[0,-2,'#7e9a40'],[2,-2,'#6e8a36']] as const)dots.set(x+dx,y+dy,c);}
}

/**
 * 돌판 마당(도트): 크기가 다른 판석을 엇갈려 깔고, 판석마다 왼쪽 위 밝은 모서리·오른쪽 아래 그늘·짙은 줄눈,
 * 색은 원화 성벽 돌빛 7단, 군데군데 금·이끼·닳은 자국, 바깥 가장자리는 풀이 파고든 듯 들쭉날쭉.
 */
export function paving(f:Field,cellPx:number,isStone:(cx:number,cy:number)=>boolean,R:R){
  const {p,dots}=f,cs=cellPx/PX,n=valueNoise(p.w,p.h,9,R),W=p.w,H=p.h;
  const S=['#3a3630','#57524a','#6e685e','#857e72','#9b9486','#b0a999','#c4beae'];
  const inside=(x:number,y:number)=>{const cx=Math.floor(x/cs),cy=Math.floor(y/cs);if(!isStone(cx,cy))return false;
    const ex=x-cx*cs,ey=y-cy*cs,j=(n(x*2,y*2)-.5)*5;if(!isStone(cx-1,cy)&&ex<2+j)return false;if(!isStone(cx+1,cy)&&cs-ex<2+j)return false;if(!isStone(cx,cy-1)&&ey<2+j)return false;if(!isStone(cx,cy+1)&&cs-ey<2+j)return false;return true;};
  // 판석 줄: 줄마다 높이 10~14, 판석 너비 14~26(넓적한 마당 돌), 줄눈은 1도트, 명암은 은은하게
  const T=['#5e594f','#7c766a','#8d877a','#9b9486','#a8a192','#b7b09f'];
  let y=0;while(y<H){const rh=10+Math.floor(R()*5);let x=-Math.floor(R()*14);
    while(x<W){const bw=14+Math.floor(R()*13),tone=2+Math.round((R()-.5)*1.6+(n(x*.5,y*.5)-.5)*2);
      for(let yy=y;yy<y+rh;yy++)for(let xx=x;xx<x+bw;xx++){if(!inside(xx,yy))continue;const lx=xx-x,ly=yy-y;
        let c=T[Math.max(1,Math.min(5,tone))]!;if(lx===bw-1||ly===rh-1)c=T[0]!;else if(ly===0||lx===0)c=T[Math.min(5,tone+1)]!;else if(ly===rh-2)c=T[Math.max(1,tone-1)]!;
        else if(((xx*13+yy*7)%23===0))c=T[Math.max(1,tone-1)]!;
        dots.set(xx,yy,c);}
      if(R()<.08){let cx=x+3+Math.floor(R()*(bw-6)),cy=y+1;for(let k=0;k<rh-3;k++){if(inside(cx,cy))dots.set(cx,cy,T[0]!);cx+=R()<.4?(R()<.5?1:-1):0;cy++;}}
      if(R()<.14){const mx=x+bw-1,my=y+Math.floor(R()*rh);if(inside(mx,my)){dots.set(mx,my,'#4e6a2a');dots.set(mx,my-1,'#6e8a36');dots.set(mx-1,my,'#5a7a30');}}
      x+=bw;}
    y+=rh;}
  // 넓은 얼룩(닳은 자리·그늘) — 마당이 한 장의 판처럼 보이지 않게
  for(let i=0;i<W*H/900;i++){const cx=R()*W,cy=R()*H,r=6+R()*16,dark=R()<.5;for(let yy=cy-r;yy<cy+r;yy++)for(let xx=cx-r;xx<cx+r;xx++){if(!inside(xx|0,yy|0))continue;const d=((xx-cx)**2+(yy-cy)**2)/(r*r);if(d<1&&dither(xx|0,yy|0)+.5>d)dots.set(xx,yy,dark?[60,54,46]:[230,224,210],dark?28:22);}}
  // 가장자리 풀포기
  for(let i=0;i<W*H*.006;i++){const x=Math.floor(R()*W),y2=Math.floor(R()*H);if(!inside(x,y2)||inside(x,y2+3))continue;for(const [dx,dy,c] of [[0,0,'#3e5a22'],[1,-1,'#5a7a2e'],[-1,-1,'#4e6a28'],[0,-2,'#7e9a40']] as const)dots.set(x+dx,y2+dy,c);}
}
/** 연못을 건너는 돌다리(도트): 두꺼운 판석을 이어 놓고 옆면 그늘·물에 비친 그림자. */
export function stoneBridge(f:Field,cellPx:number,isBridge:(cx:number,cy:number)=>boolean){
  const {dots}=f,cs=Math.round(cellPx/PX),S=['#2e2a26','#57524a','#857e72','#a29a8a','#bdb6a4','#d2cbb8'];
  for(let cy=0;cy<40;cy++)for(let cx=0;cx<40;cx++){if(!isBridge(cx,cy))continue;const x0=cx*cs+8,x1=(cx+1)*cs-8,y0=cy*cs,y1=(cy+1)*cs;
    for(let y=y0;y<y1;y++){const slab=Math.floor((y-y0)/10),ly=(y-y0)%10;
      for(let x=x0-2;x<x1+3;x++){if(x>=x1){dots.set(x,y+2,'#0e2630',160);continue;}const lx=x-x0;
        let c=ly===9?S[0]!:ly===0?S[5]!:lx===0?S[4]!:lx===x1-x0-1?S[1]!:ly>=7?S[2]!:S[(slab+lx/7|0)%2?3:4]!;if(x<x0)c=S[1]!;dots.set(x,y,c);}}}
}
