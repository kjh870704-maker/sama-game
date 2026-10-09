import {Container,Sprite,Texture,Rectangle,Graphics,CanvasSource} from 'pixi.js';
import type {BattleState,TerrainKind,Coord} from '../../core/src/index.ts';
import {MATERIALS,materialOf,biomeFor,noiseField,sample,blendWeights,smooth,type Biome,type RGB} from './terrain-paint.ts';

/**
 * 전장 땅 — 한 칸 48점. 화면에서 크게 보아도 붓으로 칠한 그림처럼 보이게:
 * 바탕색은 절반 해상도에서 재질을 부드럽게 섞어 칠하고(디더링 없이) 두 배로 펴서 경계를 녹인 뒤,
 * 풀포기·자갈·물결·바퀴 자국·갈대 같은 잔붓질을 원래 해상도로 얹는다.
 */
const T=48,B=24,S=48;
const u=(n:number)=>n*T/16,Q=16/B;
let noises:{warpA:Float32Array;warpB:Float32Array;coarse:Float32Array;fine:Float32Array}|undefined;
function noise(){return noises??={warpA:noiseField(11,4,3),warpB:noiseField(23,4,3),coarse:noiseField(37,3,4),fine:noiseField(53,32,2)};}
/** Deterministic per-cell random so the same map always paints the same way. */
function hash(x:number,y:number,i=0){let h=(x*374761393+y*668265263+i*2147483647)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return ((h^(h>>>16))>>>0)/4294967296;}
const css=(c:RGB,a=1)=>a<1?`rgba(${c[0]},${c[1]},${c[2]},${a})`:`rgb(${c[0]},${c[1]},${c[2]})`;
function terrainAt(state:BattleState,x:number,y:number):TerrainKind|undefined{return state.map.inBounds({x,y})?state.map.tileAt({x,y}).terrain:undefined;}
const idx=(m:string)=>MATERIALS.indexOf(m as never);
/** 색띠(어두움→밝음)에서 0~1 자리의 색(띠 사이를 섞는다). */
function rampAt(r:RGB[],t:number,out:number[]){const k=Math.max(0,Math.min(1,t))*(r.length-1),i=Math.min(r.length-2,Math.floor(k)),f=k-i,a=r[i]!,b=r[i+1]!;out[0]=a[0]+(b[0]-a[0])*f;out[1]=a[1]+(b[1]-a[1])*f;out[2]=a[2]+(b[2]-a[2])*f;}

/** 바탕: 재질마다 색을 구해 무게대로 섞는다. 물은 깊을수록 짙고, 물가는 모래빛으로 번진다. */
function paintBase(state:BattleState,biome:Biome){
  const map=state.map,w=map.width*B,h=map.height*B,n=noise(),M=MATERIALS.length;
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d')!,img=g.createImageData(w,h),d=img.data;
  const mats=new Uint8Array(map.width*map.height);
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)mats[y*map.width+x]=idx(materialOf(map.tileAt({x,y}).terrain));
  const elev=new Float32Array(w*h),wgts=new Float32Array(w*h*M),raws=new Float32Array(w*h*M);
  const wgt=new Float32Array(M),raw=new Float32Array(M);
  const WA=idx('water'),HI=idx('hill'),R=idx('rock'),CL=idx('cliff'),F=idx('forest'),FO=idx('ford'),MA=idx('marsh');
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
    const wa=sample(n.warpA,px*1.6*Q,py*1.6*Q)-.5,wb=sample(n.warpB,px*1.6*Q,py*1.6*Q)-.5;
    blendWeights(mats,map.width,map.height,(px+.5)/B-.5+wa*.55,(py+.5)/B-.5+wb*.55,wgt,raw,3.2);
    const i=py*w+px;wgts.set(wgt,i*M);raws.set(raw,i*M);
    elev[i]=raw[HI]!*.9+raw[R]!*1.3+raw[CL]!*1.8+raw[F]!*.15-raw[WA]!*.3;
  }
  const col=[0,0,0],acc=[0,0,0];
  // 풀밭 무게(그린 풀밭 그림을 얹을 자리): 풀·언덕은 온전히, 숲 바닥은 반쯤, 길은 옅게
  const mc=document.createElement('canvas');mc.width=w;mc.height=h;const mg=mc.getContext('2d')!,mimg=mg.createImageData(w,h),md=mimg.data;
  const dc=document.createElement('canvas');dc.width=w;dc.height=h;const dg=dc.getContext('2d')!,dimg=dg.createImageData(w,h),dd=dimg.data;
  const wc=document.createElement('canvas');wc.width=w;wc.height=h;const wg=wc.getContext('2d')!,wimg=wg.createImageData(w,h),wd=wimg.data;
  const GR=idx('grass'),HL=idx('hill'),FR=idx('forest'),DI=idx('dirt'),YA=idx('yard');
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
    const i=py*w+px,cN=sample(n.coarse,px*1.2*Q,py*1.2*Q),f=sample(n.fine,px*.9*Q,py*.9*Q);
    const e0=elev[Math.max(0,py-1)*w+Math.max(0,px-1)]!,e1=elev[Math.min(h-1,py+1)*w+Math.min(w-1,px+1)]!,light=(e0-e1)*1.4/Q;
    const base=.48+(cN-.5)*.55+(f-.5)*.16+light,wet=raws[i*M+WA]!+raws[i*M+FO]!*.6+raws[i*M+MA]!*.2;
    acc[0]=acc[1]=acc[2]=0;
    for(let m=0;m<M;m++){const k=wgts[i*M+m]!;if(k<.004)continue;const name=MATERIALS[m]!;
      if(name==='water'){const depth=smooth(.42,1,wet);rampAt(biome.ramps.water,.8-depth*.58+(f-.5)*.1,col);
        if(wet<.6){const sand=[0,0,0];rampAt(biome.sand,.35+(cN-.5)*.4,sand);const t=smooth(.38,.6,wet);for(let q=0;q<3;q++)col[q]=sand[q]!*(1-t)+col[q]!*t;}}
      else if(name==='cliff')rampAt(biome.ramps.cliff,base*.9+light*.4,col);
      else if(name==='forest')rampAt(biome.ramps.forest,base*.9,col);
      else rampAt(biome.ramps[name],base,col);
      acc[0]+=col[0]!*k;acc[1]+=col[1]!*k;acc[2]+=col[2]!*k;}
    d[i*4]=acc[0]!;d[i*4+1]=acc[1]!;d[i*4+2]=acc[2]!;d[i*4+3]=255;
    const gw=wgts[i*M+GR]!+wgts[i*M+HL]!+wgts[i*M+FR]!*.55+wgts[i*M+DI]!*.1+wgts[i*M+YA]!*.06;md[i*4+3]=Math.round(Math.min(1,gw)*255);
    dd[i*4+3]=Math.round(Math.min(1,wgts[i*M+DI]!)*255);
    wd[i*4+3]=Math.round(smooth(.4,.6,raws[i*M+WA]!+raws[i*M+FO]!)*255);
  }
  g.putImageData(img,0,0);mg.putImageData(mimg,0,0);dg.putImageData(dimg,0,0);wg.putImageData(wimg,0,0);return {base:c,grassMask:mc,dirtMask:dc,waterMask:wc};
}
/** 그린 풀밭 그림(AI 채색): 있으면 풀·언덕 위에 깐다. 이음매가 보이지 않게 뒤집어 이어 붙인 판을 만든다. */
let meadow:HTMLCanvasElement|undefined,meadowSource:HTMLImageElement|undefined;
export async function loadBattleTextures(){
  if(meadow||typeof document==='undefined')return;
  try{const img=new Image();img.src=new URL('textures/meadow.webp',document.baseURI).href;await img.decode();
    const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w*2;c.height=h*2;const g=c.getContext('2d')!;
    for(const [fx,fy] of [[0,0],[1,0],[0,1],[1,1]] as const){g.save();g.translate(fx?w*2:0,fy?h*2:0);g.scale(fx?-1:1,fy?-1:1);g.drawImage(img,fx?0:0,0);g.restore();}
    meadow=c;meadowSource=img;}catch{/* 없으면 칠해서 쓴다 */}
}
/**
 * 풀밭 그림을 무늬 없이 깐다: 원본에서 아무 곳이나 오린 둥근 조각(가장자리는 흐리게)을 겹겹이 흩뿌린다.
 * 뒤집어 이어 붙인 판만 깔면 넓은 평지에서 바위·꽃이 거울처럼 짝지어 보였다(원정 전장).
 */
function scatterMeadow(g:CanvasRenderingContext2D,w:number,h:number,sc:number,seed:number){
  const src=meadowSource;if(!src)return;
  const size=Math.round(Math.min(src.naturalWidth,src.naturalHeight)*.42*sc),step=size*.55,patch=document.createElement('canvas');patch.width=patch.height=size;const pg=patch.getContext('2d')!;
  const feather=pg.createRadialGradient(size/2,size/2,size*.18,size/2,size/2,size/2);feather.addColorStop(0,'rgba(0,0,0,1)');feather.addColorStop(1,'rgba(0,0,0,0)');
  const cut=size/sc;let i=0;
  for(let y=-step;y<h+step;y+=step)for(let x=-step;x<w+step;x+=step,i++){
    const sx=hash(i,1,seed)*(src.naturalWidth-cut),sy=hash(i,2,seed)*(src.naturalHeight-cut),dx=x+(hash(i,3,seed)-.5)*step*.6,dy=y+(hash(i,4,seed)-.5)*step*.6;
    pg.globalCompositeOperation='source-over';pg.clearRect(0,0,size,size);pg.save();if(hash(i,5,seed)>.5){pg.translate(size,0);pg.scale(-1,1);}pg.drawImage(src,sx,sy,cut,cut,0,0,size,size);pg.restore();
    pg.globalCompositeOperation='destination-in';pg.fillStyle=feather;pg.fillRect(0,0,size,size);
    g.drawImage(patch,Math.round(dx-size/2),Math.round(dy-size/2));
  }
}
/** 풀밭 그림을 무게(마스크)만큼 덮는다. 배율은 바위가 반 칸쯤 되게. */
function overlayMeadow(ctx:CanvasRenderingContext2D,mask:HTMLCanvasElement,w:number,h:number,seed:number){
  if(!meadow)return;
  const t=document.createElement('canvas');t.width=w;t.height=h;const g=t.getContext('2d')!;
  const pat=g.createPattern(meadow,'repeat')!;const sc=.46,ox=(seed*97)%meadow.width;pat.setTransform(new DOMMatrix([sc,0,0,sc,-ox*sc,0]));
  g.fillStyle=pat;g.fillRect(0,0,w,h);scatterMeadow(g,w,h,sc,seed);
  g.globalCompositeOperation='destination-in';g.imageSmoothingQuality='high';g.drawImage(mask,0,0,w,h);
  ctx.drawImage(t,0,0);
}
/**
 * 흙길·마당 채색: 풀밭 그림의 명암만 빌려 흙 위에 겹쳐(overlay) 울퉁불퉁한 흙결을 살리고,
 * 그 위에 따뜻한 밝은 붓질과 어두운 패인 자국을 흙 무게만큼 얹는다.
 */
function paintDirt(ctx:CanvasRenderingContext2D,mask:HTMLCanvasElement,w:number,h:number,seed:number){
  const t=document.createElement('canvas');t.width=w;t.height=h;const g=t.getContext('2d')!;
  if(meadow){const pat=g.createPattern(meadow,'repeat')!,sc=.9,ox=(seed*53)%meadow.width;pat.setTransform(new DOMMatrix([sc,0,0,sc,-ox*sc,-ox*.4*sc]));
    g.filter='grayscale(1) blur(2.5px) contrast(.9)';g.fillStyle=pat;g.fillRect(0,0,w,h);g.filter='none';}
  else{g.fillStyle='rgb(128,128,128)';g.fillRect(0,0,w,h);}
  // 마른 흙의 밝은 붓질(가늘고 길게), 드물게 짙은 패인 자국
  g.lineCap='round';
  for(let i=0;i<w*h/420;i++){const x=hash(i,11,seed)*w,y=hash(i,12,seed)*h,l=10+hash(i,13,seed)*22,a=(hash(i,14,seed)-.5)*.5,k=hash(i,15,seed);
    g.strokeStyle=k<.7?'rgba(255,248,226,.35)':'rgba(70,50,28,.28)';g.lineWidth=2+hash(i,16,seed)*3;
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+l/2,y+Math.sin(a)*l*.5-2,x+l,y+Math.sin(a)*l);g.stroke();}
  // 자갈: 아래 그늘, 위 밝은 면
  for(let i=0;i<w*h/1500;i++){const x=hash(i,21,seed)*w,y=hash(i,22,seed)*h,r=1.5+hash(i,23,seed)*2.6;
    g.fillStyle='rgba(30,22,12,.6)';g.beginPath();g.ellipse(x+.8,y+1.2,r*1.1,r*.75,0,0,7);g.fill();
    g.fillStyle='rgba(235,226,206,.9)';g.beginPath();g.ellipse(x,y,r,r*.68,hash(i,24,seed),0,7);g.fill();}
  g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0,w,h);
  ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.7;ctx.drawImage(t,0,0);ctx.restore();
}
/** 고운 붓결(화면 전체에 옅게 깔리는 질감). */
function brushGrain(ctx:CanvasRenderingContext2D,w:number,h:number){
  const t=document.createElement('canvas');t.width=t.height=192;const tg=t.getContext('2d')!;
  for(let i=0;i<900;i++){const x=hash(i,1,7)*192,y=hash(i,2,7)*192,l=4+hash(i,3,7)*10,a=hash(i,4,7)*Math.PI;tg.strokeStyle=hash(i,5,7)<.5?'rgba(255,248,225,.16)':'rgba(20,16,8,.16)';tg.lineWidth=1+hash(i,6,7)*1.5;tg.beginPath();tg.moveTo(x,y);tg.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l*.5);tg.stroke();}
  ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=ctx.createPattern(t,'repeat')!;ctx.fillRect(0,0,w,h);ctx.restore();
}
/** Scenery-v3 그림(참나무·소나무·바위…)을 크기에 맞춰 줄인다. 가장자리는 부드럽게 두되 옅은 번짐은 잘라 낸다. */
const thumbs=new Map<string,HTMLCanvasElement>();
export {sceneryThumb};
const boxes=new Map<number,{x:number;y:number;w:number;h:number}>();
function sceneryThumb(atlas:Texture,frame:number,w:number,h:number,flip=false,dark=false){
  w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  const key=frame+':'+w+':'+h+':'+flip+':'+dark;const old=thumbs.get(key);if(old)return old;
  const src=atlas.source.resource as CanvasImageSource,cw=atlas.width/4,ch=atlas.height/2,ox=(frame%4)*cw,oy=Math.floor(frame/4)*ch;
  if(!boxes.has(frame)){
    const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(src,ox,oy,cw,ch,0,0,cw,ch);
    const a=g.getImageData(0,0,cw,ch).data;let x0=cw,y0=ch,x1=0,y1=0;
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(a[(y*cw+x)*4+3]!>200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    boxes.set(frame,{x:ox+x0,y:oy+y0,w:Math.max(1,x1-x0+1),h:Math.max(1,y1-y0+1)});
  }
  const b=boxes.get(frame)!,out=document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d',{willReadFrequently:true})!;
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';if(flip){g.translate(w,0);g.scale(-1,1);}g.drawImage(src,b.x,b.y,b.w,b.h,0,0,w,h);
  const img=g.getImageData(0,0,w,h);for(let i=3;i<img.data.length;i+=4){const a=img.data[i]!;img.data[i]=a<60?0:a>200?255:Math.round((a-60)/140*255);if(dark){img.data[i-3]=img.data[i-3]!*.55;img.data[i-2]=img.data[i-2]!*.5;img.data[i-1]=img.data[i-1]!*.52;}}g.setTransform(1,0,0,1,0,0);g.putImageData(img,0,0);
  thumbs.set(key,out);return out;
}
const stroke=(ctx:CanvasRenderingContext2D,color:string,lw:number,pts:Array<[number,number]>,curve?:[number,number])=>{ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...pts[0]!);if(curve&&pts[1])ctx.quadraticCurveTo(...curve,...pts[1]);else for(const p of pts.slice(1))ctx.lineTo(...p);ctx.stroke();};

/** 물가: 바깥은 젖은 모래의 짙은 띠, 안쪽은 얕은 물빛과 흰 거품선. 물 마스크를 흐려서 띠를 만든다. */
function paintShore(ctx:CanvasRenderingContext2D,mask:HTMLCanvasElement,w:number,h:number){
  const layer=(fn:(g:CanvasRenderingContext2D)=>void)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d')!;fn(g);return c;};
  const big=(g:CanvasRenderingContext2D)=>g.drawImage(mask,0,0,w,h);
  const land=layer(g=>{g.fillStyle='#000';g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-out';big(g);});
  // 물 무게 판(mask)은 칸 크기가 작은 판이라 지도 크기로 늘려 그린다. 그대로 그리면 젖은 모래 띠가 강의 절반 위치에 세로로 생겼다.
  const band=(src:HTMLCanvasElement,blur:number,clip:'in'|'out',color:string)=>layer(g=>{g.filter=`blur(${blur}px)`;g.drawImage(src,0,0,w,h);g.filter='none';
    g.globalCompositeOperation=clip==='in'?'destination-in':'destination-out';big(g);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,w,h);});
  ctx.drawImage(band(mask as HTMLCanvasElement,7,'out','rgba(70,58,34,.42)'),0,0);// 젖은 모래
  ctx.drawImage(band(land,14,'in','rgba(120,176,168,.5)'),0,0);// 얕은 물
  ctx.drawImage(band(land,3,'in','rgba(236,244,236,.55)'),0,0);// 거품선
}
/** 물결·여울·급류: 밝은 물결 붓질, 흰 물거품, 여울의 디딤돌. */
function paintWaterDetail(ctx:CanvasRenderingContext2D,state:BattleState,biome:Biome){
  const foam=biome.ramps.water[4]!;
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    const t=terrainAt(state,x,y),px=x*T,py=y*T;
    if(t==='water')for(let i=0;i<3;i++){if(hash(x,y,i+60)<.3)continue;const sx=px+hash(x,y,i+61)*T*.7-4,sy=py+4+hash(x,y,i+62)*T*.85,l=16+hash(x,y,i+63)*22,dk=hash(x,y,i+64)<.4;stroke(ctx,dk?'rgba(10,30,44,.22)':css(foam,.22+hash(x,y,i+65)*.12),dk?2.4:1.3,[[sx,sy],[sx+l,sy+(hash(x,y,i+66)-.5)*4]],[sx+l*.5,sy-1.5-hash(x,y,i+67)*2]);}
    if(t==='rapids')for(let i=0;i<9;i++){const sx=px+hash(x,y,i)*T*.8,sy=py+3+i*5+hash(x,y,i+9)*3,l=8+hash(x,y,i+3)*14;stroke(ctx,i%2?'rgba(240,248,245,.85)':css(foam,.7),2,[[sx,sy],[sx+l,sy+1]],[sx+l/2,sy-4]);}
    if(t==='ford')for(let i=0;i<5;i++){const sx=px+6+hash(x,y,i+20)*(T-12),sy=py+6+hash(x,y,i+21)*(T-12),r=3+hash(x,y,i+22)*3;ctx.fillStyle='rgba(235,245,240,.55)';ctx.beginPath();ctx.ellipse(sx,sy+2,r+3,r*.6+1,0,0,7);ctx.fill();ctx.fillStyle='rgb(128,124,110)';ctx.beginPath();ctx.ellipse(sx,sy,r,r*.7,0,0,7);ctx.fill();ctx.fillStyle='rgba(220,215,195,.8)';ctx.beginPath();ctx.ellipse(sx-1,sy-1,r*.5,r*.3,0,0,7);ctx.fill();}
  }
}
/** 갈대늪: 가는 갈대 줄기와 이삭, 사이사이 고인 물. */
function paintMarsh(ctx:CanvasRenderingContext2D,state:BattleState,biome:Biome){
  const [dark,,mid,light]=biome.canopy;
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(terrainAt(state,x,y)!=='marsh')continue;
    for(let i=0;i<3;i++){ctx.fillStyle=css(biome.ramps.water[2]!,.45);ctx.beginPath();ctx.ellipse(x*T+hash(x,y,i+90)*T,y*T+hash(x,y,i+91)*T,6+hash(x,y,i+92)*6,3+hash(x,y,i+93)*2,0,0,7);ctx.fill();}
    for(let i=0;i<26;i++){const sx=x*T+hash(x,y,i+30)*T,sy=y*T+8+hash(x,y,i+31)*(T-6),h=8+hash(x,y,i+32)*10,lean=(hash(x,y,i+33)-.5)*6;
      stroke(ctx,css(i%3===0?light!:i%3===1?mid!:dark!),1.2,[[sx,sy],[sx+lean,sy-h]]);if(i%4===0){ctx.fillStyle='rgb(150,112,62)';ctx.beginPath();ctx.ellipse(sx+lean,sy-h,1.4,3,0,0,7);ctx.fill();}}
  }
}
/** 들풀: 칸마다 풀포기(짧은 붓질 셋), 가끔 들꽃. */
function paintGrass(ctx:CanvasRenderingContext2D,state:BattleState,biome:Biome){
  const g=biome.ramps.grass;
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    const t=terrainAt(state,x,y);if(t!=='plain'&&t!=='hill')continue;
    for(let i=0;i<9;i++){const sx=x*T+hash(x,y,i+40)*T,sy=y*T+4+hash(x,y,i+41)*(T-4),h=4+hash(x,y,i+42)*5,c=hash(x,y,i+43)<.55?g[4]!:g[0]!;
      for(const dx of [-2.2,0,2.2])stroke(ctx,css(c,.7),1.1,[[sx+dx*.4,sy],[sx+dx,sy-h*(dx?0.8:1)]]);}
    if(t==='plain'&&hash(x,y,77)>.82)for(let k=0;k<3;k++){const fx=x*T+6+hash(x,y,78+k)*(T-12),fy=y*T+6+hash(x,y,81+k)*(T-12);ctx.fillStyle=['rgb(242,232,170)','rgb(240,236,226)','rgb(226,150,170)'][k]!;ctx.beginPath();ctx.arc(fx,fy,1.6,0,7);ctx.fill();}
    if(hash(x,y,88)>.9){const sx=x*T+8+hash(x,y,89)*(T-16),sy=y*T+8+hash(x,y,90)*(T-16);ctx.fillStyle='rgba(30,26,18,.25)';ctx.beginPath();ctx.ellipse(sx+1,sy+2,5,2.5,0,0,7);ctx.fill();ctx.fillStyle='rgb(150,146,132)';ctx.beginPath();ctx.ellipse(sx,sy,4.5,3,.3,0,7);ctx.fill();ctx.fillStyle='rgba(235,232,220,.6)';ctx.beginPath();ctx.ellipse(sx-1,sy-1,2,1.2,0,0,7);ctx.fill();}
  }
}
/** 길: 바퀴 자국 두 줄과 자갈. */
function paintRoads(ctx:CanvasRenderingContext2D,state:BattleState){
  const road=(x:number,y:number)=>{const t=terrainAt(state,x,y);return t==='road'||t==='bridge'||t==='gate';};
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(terrainAt(state,x,y)!=='road')continue;const px=x*T,py=y*T,h=road(x-1,y)||road(x+1,y),v=road(x,y-1)||road(x,y+1);
    void h;void v;
    for(let i=0;i<5;i++){const sx=px+hash(x,y,i+50)*T,sy=py+hash(x,y,i+51)*T;ctx.fillStyle=hash(x,y,i+52)<.5?'rgba(60,44,26,.45)':'rgba(236,222,190,.45)';ctx.beginPath();ctx.ellipse(sx,sy,1.6+hash(x,y,i+53)*1.5,1.2,0,0,7);ctx.fill();}
  }
}
/**
 * 밭(보리밭): 칸 둘씩 묶은 다랑이마다 이랑 방향과 익은 빛깔을 달리한다. 이랑은 세계 좌표에 맞춰 칸을 넘어 이어지고,
 * 다랑이 사이에는 흙두둑, 밭 바깥 가장자리는 둥글게 풀밭으로 번진다. 이삭은 밝은 점으로 성기게 찍는다.
 */
function paintFields(ctx:CanvasRenderingContext2D,state:BattleState){
  const cells=(state.map.regions.get('fields')??[]).filter(p=>state.map.tileAt(p).terrain==='plain');if(!cells.length)return;
  const key=(x:number,y:number)=>x+','+y,set=new Set(cells.map(p=>key(p.x,p.y)));
  // 다랑이: 두 줄 띠마다 2~4칸 너비로 끊는다(띠마다 끊는 자리가 엇갈린다)
  const plots=new Map<string,{id:number;h:number}>();
  for(let band=0;band*2<state.map.height;band++){let x=-Math.floor(hash(band,1,402)*3),n=0;
    while(x<state.map.width){const w=2+Math.floor(hash(band,n,403)*3),id=band*997+n,h=hash(band,n,401);for(let i=0;i<w;i++)for(const dy of [0,1])plots.set(key(x+i,band*2+dy),{id,h});x+=w;n++;}}
  const plot=(x:number,y:number)=>plots.get(key(x,y))??{id:-1,h:0};
  const CROPS:Array<[string,string,string]>=[['rgb(190,162,86)','rgba(110,86,40,.26)','rgba(246,224,150,.3)'],['rgb(174,148,74)','rgba(100,76,34,.26)','rgba(236,212,136,.3)'],['rgb(150,150,82)','rgba(70,80,36,.26)','rgba(214,212,140,.28)'],['rgb(200,174,100)','rgba(120,92,44,.24)','rgba(250,232,166,.3)'],['rgb(182,160,96)','rgba(104,84,44,.24)','rgba(240,222,160,.3)']];
  const crop=(x:number,y:number)=>CROPS[Math.floor(plot(x,y).h*CROPS.length)]!;
  const W=state.map.width*T,H=state.map.height*T,f=document.createElement('canvas');f.width=W;f.height=H;const g=f.getContext('2d')!;
  // 1) 다랑이 바탕(밭 바깥 모서리는 둥글게)
  for(const {x,y} of cells){const px=x*T,py=y*T,L=set.has(key(x-1,y)),R=set.has(key(x+1,y)),U=set.has(key(x,y-1)),D=set.has(key(x,y+1)),r=12;
    g.fillStyle=crop(x,y)[0];g.beginPath();g.roundRect(px-(L?.5:-2),py-(U?.5:-2),T+(L?.5:-2)+(R?.5:-2),T+(U?.5:-2)+(D?.5:-2),[!L&&!U?r:0,!R&&!U?r:0,!R&&!D?r:0,!L&&!D?r:0]);g.fill();}
  // 2) 이랑: 세계 좌표에 맞춘 물결 줄(다랑이마다 방향이 다르다)
  g.save();g.globalCompositeOperation='source-atop';g.lineCap='round';
  for(const {x,y} of cells){const pl=plot(x,y),[,dark,light]=crop(x,y),vert=pl.h>.55,px=x*T,py=y*T;
    g.save();g.beginPath();g.rect(px,py,T,T);g.clip();
    for(let k=0;k<T;k+=7){const a=(hash(pl.id,k,503)-.5)*3,b=(hash(pl.id,k,504)-.5)*3;
      g.strokeStyle=dark;g.lineWidth=3;g.beginPath();if(vert){g.moveTo(px+k,py);g.quadraticCurveTo(px+k+a,py+T/2,px+k,py+T);}else{g.moveTo(px,py+k);g.quadraticCurveTo(px+T/2,py+k+a,px+T,py+k);}g.stroke();
      g.strokeStyle=light;g.lineWidth=1.6;g.beginPath();if(vert){g.moveTo(px+k+3,py);g.quadraticCurveTo(px+k+3+b,py+T/2,px+k+3,py+T);}else{g.moveTo(px,py+k+3);g.quadraticCurveTo(px+T/2,py+k+3+b,px+T,py+k+3);}g.stroke();}
    // 이삭: 짧은 붓질 무더기
    for(let i=0;i<14;i++){const sx=px+hash(x,y,i+520)*T,sy=py+hash(x,y,i+530)*T,l=2+hash(x,y,i+540)*2.5;g.strokeStyle=i%3?'rgba(250,236,184,.55)':'rgba(120,92,40,.4)';g.lineWidth=1.3;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+(vert?.6:l),sy-(vert?l:.6));g.stroke();}
    g.restore();}
  // 3) 바람 자국·햇빛 얼룩: 밭 전체에 걸친 큰 부드러운 얼룩(칸 경계를 지운다)
  for(let i=0;i<cells.length*1.4;i++){const c=cells[Math.floor(hash(i,7,610)*cells.length)]!,cx=(c.x+hash(i,8,610))*T,cy=(c.y+hash(i,9,610))*T,r=T*(.6+hash(i,10,610)*.9);
    const gr=g.createRadialGradient(cx,cy,0,cx,cy,r),lit=hash(i,11,610)<.55;gr.addColorStop(0,lit?'rgba(255,244,200,.22)':'rgba(70,52,20,.2)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(cx-r,cy-r,r*2,r*2);}
  g.restore();
  // 4) 다랑이 사이 흙두둑
  g.lineCap='round';
  for(const {x,y} of cells){const id=plot(x,y).id,px=x*T,py=y*T;
    const ridge=(x0:number,y0:number,x1:number,y1:number)=>{stroke(g,'rgba(104,80,46,.75)',3.2,[[x0,y0],[x1,y1]]);stroke(g,'rgba(222,200,150,.55)',1.2,[[x0-1.2,y0-1.2],[x1-1.2,y1-1.2]]);};
    if(set.has(key(x+1,y))&&plot(x+1,y).id!==id)ridge(px+T,py+1,px+T,py+T-1);
    if(set.has(key(x,y+1))&&plot(x,y+1).id!==id)ridge(px+1,py+T,px+T-1,py+T);}
  ctx.save();ctx.shadowColor='rgba(46,34,12,.55)';ctx.shadowBlur=7;ctx.shadowOffsetY=2;ctx.drawImage(f,0,0);ctx.restore();
}
/**
 * 성 안 마당(fort): 엇갈려 깐 돌판. 돌마다 빛깔을 조금씩 달리하고, 위·왼쪽 모서리는 밝게, 아래·오른쪽은 어둡게,
 * 줄눈에는 이끼, 가끔 금 간 돌. 마당 바깥 가장자리는 흐리게 번져 흙과 섞인다.
 */
function paintPaving(ctx:CanvasRenderingContext2D,state:BattleState){
  const cells:Coord[]=[];for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++)if(terrainAt(state,x,y)==='fort')cells.push({x,y});
  if(!cells.length)return;
  const W=state.map.width*T,H=state.map.height*T,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
  let x0=W,y0=H,x1=0,y1=0;for(const p of cells){x0=Math.min(x0,p.x*T);y0=Math.min(y0,p.y*T);x1=Math.max(x1,p.x*T+T);y1=Math.max(y1,p.y*T+T);}
  g.fillStyle='rgb(118,110,96)';g.fillRect(x0,y0,x1-x0,y1-y0);
  const RH=24;
  for(let r=Math.floor(y0/RH);r*RH<y1;r++){let x=x0-Math.floor(hash(r,1,700)*20),n=0;
    while(x<x1){const w=24+Math.floor(hash(r,n,701)*22),k=hash(r,n,702),sx=x+1,sy=r*RH+1,sw=w-2,sh=RH-2;
      const v=Math.round((k-.5)*18),warm=hash(r,n,703)<.3?8:0;g.fillStyle=`rgb(${178+v+warm},${172+v+warm/2},${156+v})`;g.fillRect(sx,sy,sw,sh);
      g.fillStyle='rgba(255,250,236,.16)';g.fillRect(sx,sy,sw,1.2);g.fillRect(sx,sy,1.2,sh);
      g.fillStyle='rgba(40,34,26,.18)';g.fillRect(sx,sy+sh-1.2,sw,1.2);g.fillRect(sx+sw-1.2,sy,1.2,sh);
      for(let q=0;q<3;q++){g.fillStyle=hash(r*7+q,n,707)<.5?'rgba(255,248,230,.1)':'rgba(60,50,36,.1)';g.beginPath();g.ellipse(sx+hash(r,n*3+q,708)*sw,sy+hash(r,n*3+q,709)*sh,3+hash(r,n+q,710)*5,2+hash(r,n+q,711)*3,0,0,7);g.fill();}
      if(k>.95){g.strokeStyle='rgba(60,52,40,.55)';g.lineWidth=1;g.beginPath();g.moveTo(sx+sw*.2,sy+1);g.lineTo(sx+sw*.45,sy+sh*.55);g.lineTo(sx+sw*.4,sy+sh-1);g.stroke();}
      if(hash(r,n,704)<.18){g.fillStyle='rgba(96,118,60,.55)';g.beginPath();g.ellipse(x+(hash(r,n,705)<.5?0:w),r*RH+RH,3+hash(r,n,706)*3,1.6,0,0,7);g.fill();}
      x+=w;n++;}}
  // 바깥 가장자리: 칸 모양 마스크를 흐려서 번지게
  const m=document.createElement('canvas');m.width=W;m.height=H;const mg=m.getContext('2d')!;mg.filter='blur(3px)';mg.fillStyle='#000';
  for(const p of cells)mg.fillRect(p.x*T-1,p.y*T-1,T+2,T+2);
  g.globalCompositeOperation='destination-in';g.drawImage(m,0,0);
  ctx.save();ctx.globalAlpha=.94;ctx.drawImage(c,0,0);ctx.restore();
}
/** 다리: 판자를 가로질러 깔고 난간 기둥, 물에 비친 그늘. */
function paintBridges(ctx:CanvasRenderingContext2D,state:BattleState,stone:(at:Coord)=>boolean){
  const wetAt=(x:number,y:number)=>{const t=terrainAt(state,x,y);return t==='water'||t==='rapids';};
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(terrainAt(state,x,y)!=='bridge')continue;
    // across: 위아래로 건너는 다리(물이 양옆에) — 판자는 가로로 깔고 난간은 좌우에
    const across=!(wetAt(x,y-1)||wetAt(x,y+1))&&(wetAt(x-1,y)||wetAt(x+1,y)),isStone=stone({x,y});
    const deck=isStone?['rgb(201,194,173)','rgb(171,163,142)']:['rgb(190,148,94)','rgb(160,120,72)'],rail=isStone?'rgb(120,114,100)':'rgb(86,58,34)';
    const px=x*T,py=y*T,m=6;
    ctx.fillStyle='rgba(8,24,30,.45)';if(across)ctx.fillRect(px+m+3,py,T-2*m,T);else ctx.fillRect(px,py+m+3,T,T-2*m);
    for(let k=0;k<T;k+=4){ctx.fillStyle=deck[(k/4)%2]!;if(across)ctx.fillRect(px+m,py+k,T-2*m,4);else ctx.fillRect(px+k,py+m,4,T-2*m);}
    ctx.strokeStyle='rgba(40,24,12,.35)';ctx.lineWidth=1;for(let k=0;k<T;k+=4){ctx.beginPath();if(across){ctx.moveTo(px+m,py+k);ctx.lineTo(px+T-m,py+k);}else{ctx.moveTo(px+k,py+m);ctx.lineTo(px+k,py+T-m);}ctx.stroke();}
    ctx.fillStyle=rail;if(across){ctx.fillRect(px+m-3,py,3,T);ctx.fillRect(px+T-m,py,3,T);for(const k of [4,24,44]){ctx.fillRect(px+m-5,py+k,6,5);ctx.fillRect(px+T-m-1,py+k,6,5);}}
    else{ctx.fillRect(px,py+m-3,T,3);ctx.fillRect(px,py+T-m,T,3);for(const k of [4,24,44]){ctx.fillRect(px+k,py+m-5,5,6);ctx.fillRect(px+k,py+T-m-1,5,6);}}
  }
}
/** 잔도: 벼랑에 박은 판자길. */
function paintPlanks(ctx:CanvasRenderingContext2D,state:BattleState){
  const path=(x:number,y:number)=>{const t=terrainAt(state,x,y);return t!==undefined&&t!=='cliff'&&t!=='water'&&t!=='rapids'&&t!=='mountain';};
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(terrainAt(state,x,y)!=='plank')continue;
    const px=x*T,py=y*T,horizontal=path(x-1,y)||path(x+1,y);
    ctx.fillStyle='rgba(10,8,6,.55)';if(horizontal)ctx.fillRect(px,py+u(12),T,u(3));else ctx.fillRect(px+u(12),py,u(3),T);
    for(let k=0;k<T;k+=4){ctx.fillStyle=k%8?'rgb(170,126,74)':'rgb(138,98,56)';if(horizontal)ctx.fillRect(px+k,py+u(4),4,u(8));else ctx.fillRect(px+u(4),py+k,u(8),4);}
    ctx.fillStyle='rgb(74,50,30)';
    if(horizontal){ctx.fillRect(px,py+u(3),T,2);ctx.fillRect(px,py+u(12),T,2);for(const k of [2,9].map(u))ctx.fillRect(px+k,py+u(12),3,u(4));}
    else{ctx.fillRect(px+u(3),py,2,T);ctx.fillRect(px+u(12),py,2,T);for(const k of [2,9].map(u))ctx.fillRect(px+u(12),py+k,u(4),3);}
  }
}
/**
 * 성벽(위에서 비스듬히 내려다본): 성 위 길(돌판), 바깥 가장자리마다 성가퀴(타구와 활 구멍),
 * 남쪽으로 드러난 벽면(벽돌 줄·빗물 자국·밑동의 그늘), 동쪽 그림자. 모서리는 각루처럼 넓게.
 * 성문 칸은 문루 바닥과 두 문짝(징 박힌 붉은 나무), 부서진 성문은 열린 통로.
 */
function paintWalls(ctx:CanvasRenderingContext2D,state:BattleState){
  const isWall=(x:number,y:number)=>{const t=terrainAt(state,x,y);return t==='wall'||t==='gate';};
  const cells:Coord[]=[];for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++)if(isWall(x,y))cells.push({x,y});
  const FACE=Math.round(T*.46);
  // 1) 그림자와 남쪽 벽면(성 위 길보다 먼저)
  for(const {x,y} of cells){const px=x*T,py=y*T;
    if(!isWall(x+1,y)){const gr=ctx.createLinearGradient(px+T,0,px+T+14,0);gr.addColorStop(0,'rgba(10,14,8,.45)');gr.addColorStop(1,'rgba(10,14,8,0)');ctx.fillStyle=gr;ctx.fillRect(px+T,py+6,14,T+(isWall(x,y+1)?0:FACE));}
    if(isWall(x,y+1))continue;
    const fy=py+T,gr=ctx.createLinearGradient(0,fy,0,fy+FACE);gr.addColorStop(0,'rgb(126,118,102)');gr.addColorStop(1,'rgb(82,76,64)');ctx.fillStyle=gr;ctx.fillRect(px,fy,T,FACE);
    for(let r=0;r*6<FACE;r++){const yy=fy+r*6,off=(r%2)*7;ctx.fillStyle='rgba(30,26,20,.5)';ctx.fillRect(px,yy,T,1);for(let k=-off;k<T;k+=14)ctx.fillRect(px+Math.max(0,k),yy,1,6);
      for(let k=-off;k<T;k+=14)if(hash(x*7+k,y*5+r,3)<.3){ctx.fillStyle=hash(x+k,y+r,4)<.5?'rgba(255,245,225,.1)':'rgba(0,0,0,.12)';ctx.fillRect(px+Math.max(0,k)+1,yy+1,13,5);}}
    for(let i=0;i<2;i++){const sx=px+hash(x,y,i+70)*T;const g2=ctx.createLinearGradient(0,fy,0,fy+FACE*.8);g2.addColorStop(0,'rgba(30,26,20,.35)');g2.addColorStop(1,'rgba(30,26,20,0)');ctx.fillStyle=g2;ctx.fillRect(sx,fy,3,FACE*.8);}
    ctx.fillStyle='rgba(10,14,8,.4)';ctx.fillRect(px,fy+FACE,T,5);ctx.fillStyle='rgba(70,90,50,.35)';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(px+hash(x,y,i+80)*T,fy+FACE-1,4,2,0,0,7);ctx.fill();}
  }
  // 2) 성 위 길과 성가퀴
  for(const {x,y} of cells){
    const px=x*T,py=y*T,gate=terrainAt(state,x,y)==='gate';
    const L=isWall(x-1,y),Rr=isWall(x+1,y),U=isWall(x,y-1),D=isWall(x,y+1),corner=(L||Rr)&&(U||D),lone=!L&&!Rr&&!U&&!D;
    const gr=ctx.createLinearGradient(px,py,px+T,py+T);gr.addColorStop(0,'rgb(184,176,156)');gr.addColorStop(1,'rgb(156,148,128)');ctx.fillStyle=gr;ctx.fillRect(px,py,T,T);
    ctx.strokeStyle='rgba(60,54,44,.3)';ctx.lineWidth=1;for(let k=12;k<T;k+=12){ctx.beginPath();ctx.moveTo(px,py+k);ctx.lineTo(px+T,py+k);ctx.stroke();}
    for(let r=0;r<4;r++)for(let k=(r%2)*8;k<T;k+=16){ctx.beginPath();ctx.moveTo(px+k,py+r*12);ctx.lineTo(px+k,py+r*12+12);ctx.stroke();}
    if(gate){
      const across=L||Rr;// 성벽이 가로로 이어지면 문은 위아래로 지난다
      const intact=!!state.find(`gate_${x}_${y}`);
      ctx.fillStyle='rgb(120,110,92)';if(across)ctx.fillRect(px+10,py,T-20,T);else ctx.fillRect(px,py+10,T,T-20);
      if(!intact){ctx.fillStyle='rgba(20,14,8,.35)';if(across)ctx.fillRect(px+12,py,T-24,T);else ctx.fillRect(px,py+12,T,T-24);}
      else for(const side of [0,1]){const dx=across?(side?T/2:12):0,dy=across?0:(side?T/2:12);ctx.fillStyle='rgb(110,34,22)';if(across)ctx.fillRect(px+dx,py+6,T/2-12,T-12);else ctx.fillRect(px+6,py+dy,T-12,T/2-12);
        ctx.fillStyle='rgb(222,184,90)';for(let a=0;a<3;a++)for(let b=0;b<4;b++){const sx=across?px+dx+4+a*((T/2-20)/2):px+10+b*((T-20)/3),sy=across?py+10+b*((T-20)/3):py+dy+4+a*((T/2-20)/2);ctx.beginPath();ctx.arc(sx,sy,1.6,0,7);ctx.fill();}}
    }
    // 성가퀴: 바깥(이웃이 성벽이 아닌) 가장자리마다
    const parapet=(x0:number,y0:number,len:number,horiz:boolean)=>{
      ctx.fillStyle='rgb(128,120,104)';if(horiz)ctx.fillRect(x0,y0,len,6);else ctx.fillRect(x0,y0,6,len);
      for(let k=2;k<len-4;k+=10){ctx.fillStyle='rgb(198,190,170)';if(horiz)ctx.fillRect(x0+k,y0-1,6,7);else ctx.fillRect(x0-1,y0+k,7,6);
        ctx.fillStyle='rgba(30,26,20,.55)';if(horiz)ctx.fillRect(x0+k+6,y0,2,6);else ctx.fillRect(x0,y0+k+6,6,2);ctx.fillStyle='rgb(40,34,28)';if(horiz)ctx.fillRect(x0+k+2.5,y0+2,1,3);else ctx.fillRect(x0+2,y0+k+2.5,3,1);}};
    if(!U&&!(gate&&(L||Rr)))parapet(px,py,T,true);if(!D&&!(gate&&(L||Rr)))parapet(px,py+T-6,T,true);
    if(!L&&!(gate&&(U||D)))parapet(px,py,T,false);if(!Rr&&!(gate&&(U||D)))parapet(px+T-6,py,T,false);
    if(corner||lone){ctx.strokeStyle='rgba(40,34,26,.6)';ctx.lineWidth=2;ctx.strokeRect(px+3,py+3,T-6,T-6);ctx.fillStyle='rgba(255,245,220,.12)';ctx.fillRect(px+8,py+8,T-16,T-16);}
  }
}
/** 벼랑: 아래쪽이 트인 곳에 깎아지른 바위 면. */
function paintCliffFaces(ctx:CanvasRenderingContext2D,state:BattleState,biome:Biome){
  const r=biome.ramps.cliff;
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(terrainAt(state,x,y)!=='cliff')continue;const below=terrainAt(state,x,y+1);if(below==='cliff'||below===undefined)continue;
    const px=x*T,py=y*T+T-10,gr=ctx.createLinearGradient(0,py,0,py+16);gr.addColorStop(0,css(r[1]!));gr.addColorStop(1,css(r[0]!));ctx.fillStyle=gr;ctx.fillRect(px,py,T,16);
    for(let k=2;k<T;k+=7+hash(x,k,3)*4)stroke(ctx,css(r[3]!,.5),1.2,[[px+k,py+1],[px+k-2,py+14]]);ctx.fillStyle='rgba(10,10,8,.4)';ctx.fillRect(px,py+16,T,5);
  }
}
/**
 * 나무·바위·산(scenery-v3), 뒤에서 앞으로. 숲은 칸마다 짙은 우듬지 그늘을 이웃과 이어 깔고,
 * 큰 참나무·소나무를 서너 그루씩 칸 밖으로 넘치게 겹쳐 세워 한 덩어리 숲으로 읽히게 한다.
 */
function paintScenery(ctx:CanvasRenderingContext2D,state:BattleState,atlas:Texture,biome:Biome){
  const props:Array<{frame:number;x:number;y:number;w:number;h:number;flip:boolean;dark?:boolean;tree?:boolean}>=[];
  const forest=(x:number,y:number)=>terrainAt(state,x,y)==='forest';
  const [c0,c1]=biome.canopy;
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(!forest(x,y))continue;const cx=x*T+T/2,cy=y*T+T/2,r=T*(.78+hash(x,y,30)*.12);
    const gr=ctx.createRadialGradient(cx,cy,r*.2,cx,cy,r);gr.addColorStop(0,css(c0!,.82));gr.addColorStop(.6,css(c0!,.6));gr.addColorStop(1,css(c0!,0));
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();
    for(let i=0;i<5;i++){ctx.fillStyle=css(c1!,.55);ctx.beginPath();ctx.ellipse(x*T+hash(x,y,i+31)*T,y*T+hash(x,y,i+36)*T,u(3)+hash(x,y,i+41)*u(3),u(2)+hash(x,y,i+46)*u(2),0,0,7);ctx.fill();}
  }
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    const t=terrainAt(state,x,y),px=x*T,py=y*T;
    if(t==='forest'){
      const edges=[forest(x-1,y),forest(x+1,y),forest(x,y-1),forest(x,y+1)].filter(Boolean).length,count=edges>=3?4:3;
      for(let i=0;i<count;i++){
        const gx=(i%2)*.5+.25+(hash(x,y,i+3)-.5)*.42,gy=(i<2?.3:.78)+(hash(x,y,i+4)-.5)*.3+(count===3&&i===2?-.2:0);
        const h=u(17)+hash(x,y,i+2)*u(8),w=h*.86,gxx=count===3&&i===2?.5+(hash(x,y,i+3)-.5)*.4:gx;
        props.push({frame:hash(x,y,i+7)>.6?1:0,x:px+gxx*T-w/2,y:py+gy*T+u(3),w,h,flip:hash(x,y,i+5)>.5,tree:true});
      }
    }
    if(t==='mountain'){
      const inner=terrainAt(state,x-1,y)==='mountain'&&terrainAt(state,x+1,y)==='mountain'&&terrainAt(state,x,y-1)==='mountain'&&terrainAt(state,x,y+1)==='mountain';
      if(inner&&hash(x,y,12)<.62)continue;
      const w=u(inner?30:23)+hash(x,y,13)*u(7),h=w*1.1;props.push({frame:4,x:px+T/2-w/2+(hash(x,y,14)-.5)*u(8),y:py+T+u(2),w,h,flip:hash(x,y,15)>.5});
    }
    if(t==='cliff'){const w=u(16)+hash(x,y,16)*u(5),h=w*1.3;props.push({frame:4,x:px+T/2-w/2,y:py+T,w,h,flip:hash(x,y,17)>.5,dark:true});}
  }
  props.sort((a,b)=>a.y-b.y);
  for(const p of props){
    ctx.fillStyle=p.tree?'rgba(8,16,8,.38)':'rgba(10,20,10,.32)';ctx.beginPath();ctx.ellipse(p.x+p.w/2+5,p.y-3,p.w*.46,p.w*.17,0,0,7);ctx.fill();
    ctx.drawImage(sceneryThumb(atlas,p.frame,p.w,p.h,p.flip,p.dark),Math.round(p.x),Math.round(p.y-p.h));
  }
}

function tint(ctx:CanvasRenderingContext2D,w:number,h:number,biome:Biome){
  if(!biome.tint)return;const [c,a]=biome.tint;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=css(c);ctx.globalCompositeOperation='multiply';ctx.fillRect(0,0,w,h);ctx.restore();
}

/** Render actual map data; decorations never replace collision or terrain rules. */
export function terrainLayer(state:BattleState,atlas:Texture){
  const map=state.map,layer=new Container(),biome=biomeFor(state.stage.id);
  const canvas=document.createElement('canvas');canvas.width=map.width*T;canvas.height=map.height*T;
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const base=paintBase(state,biome);ctx.drawImage(base.base,0,0,canvas.width,canvas.height);
  overlayMeadow(ctx,base.grassMask,canvas.width,canvas.height,state.stage.id.length*7+map.width);
  paintDirt(ctx,base.dirtMask,canvas.width,canvas.height,map.width*3+map.height);
  if(!meadow)brushGrain(ctx,canvas.width,canvas.height);
  paintPaving(ctx,state);
  paintFields(ctx,state);
  paintRoads(ctx,state);
  paintShore(ctx,base.waterMask,canvas.width,canvas.height);
  paintWaterDetail(ctx,state,biome);
  paintMarsh(ctx,state,biome);
  if(!meadow)paintGrass(ctx,state,biome);
  paintBridges(ctx,state,at=>state.stage.id==='S1-08'&&at.y<20);
  paintPlanks(ctx,state);
  paintWalls(ctx,state);
  paintCliffFaces(ctx,state,biome);
  paintScenery(ctx,state,atlas,biome);
  tint(ctx,canvas.width,canvas.height,biome);
  const texture=new Texture({source:new CanvasSource({resource:canvas,autoGenerateMipmaps:true,scaleMode:'linear'})});const ground=new Sprite(texture);ground.scale.set(S/T);layer.addChild(ground);
  const frames=Array.from({length:8},(_,i)=>new Texture({source:atlas.source,frame:new Rectangle((i%4)*atlas.width/4,Math.floor(i/4)*atlas.height/2,atlas.width/4,atlas.height/2)}));
  const object=(cell:number,x:number,y:number,w:number,h:number)=>{
    const s=new Sprite(frames[cell]);s.anchor.set(.5,.87);s.position.set((x+.5)*S,(y+.8)*S);s.width=w;s.height=h;layer.addChild(s);
  };
  // Landmarks keep the existing painted buildings: towers, halls, camps and villages.
  if(state.stage.id==='S1-08'){
    object(6,39,7,155,145);
    for(const [x,y] of [[33,5],[44,5],[33,16],[44,16]])if(!state.find(`tower_${x}_${y}`))object(3,x!,y!,85,118);
  }
  for(const region of ['camp','village']){
    const cells=map.regions.get(region);if(cells)for(const [i,at] of cells.entries())if(i%2===0)object(region==='camp'?5:6,at.x,at.y,90,94);
  }
  for(const at of map.regions.get('objective')??[]){const g=new Graphics();g.rect(at.x*S,at.y*S,S,S).fill({color:0xf5d48e,alpha:.14}).stroke({color:0xf4d493,width:2,alpha:.8});layer.addChild(g);}
  return {layer,texture,frames};
}
