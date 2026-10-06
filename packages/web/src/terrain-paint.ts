import type {TerrainKind} from '../../core/src/index.ts';

/** Pure helpers for the pixel-art battlefield: materials, biome colour ramps,
 * noise, ordered dithering and the warped per-pixel material blend. */
export type Material='grass'|'forest'|'dirt'|'water'|'rock'|'hill'|'yard'|'marsh'|'ford'|'cliff';
export const MATERIALS:Material[]=['grass','forest','dirt','water','rock','hill','yard','marsh','ford','cliff'];
export function materialOf(t:TerrainKind):Material{
  switch(t){
    case 'plain':return 'grass';case 'forest':return 'forest';case 'road':return 'dirt';
    case 'mountain':return 'rock';case 'hill':return 'hill';
    case 'water':case 'rapids':case 'bridge':return 'water';
    case 'marsh':return 'marsh';case 'ford':return 'ford';
    case 'cliff':case 'plank':return 'cliff';
    default:return 'yard';
  }
}
export type RGB=[number,number,number];
/** Colour ramps run dark → light; the renderer only ever paints ramp colours. */
export interface Biome {name:string;ramps:Record<Material,RGB[]>;sand:RGB[];canopy:RGB[];tint?:[RGB,number]}
const hex=(h:string):RGB=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const ramp=(...c:string[])=>c.map(hex);
const springRamps:Record<Material,RGB[]>={
  grass:ramp('#3d5a2b','#4b6c32','#5a7e3a','#6e9145','#86a553'),
  forest:ramp('#22361f','#2b4426','#35532c','#406232'),
  dirt:ramp('#8a7656','#a08a66','#b6a07a','#c9b48e','#d8c6a2'),
  water:ramp('#1c3f52','#22506a','#2b6178','#377487','#4b8b98'),
  rock:ramp('#3e3b35','#55514a','#6d685d','#878173','#a29c8c'),
  hill:ramp('#4d6a31','#5e7d3a','#729244','#89a650','#a3ba63'),
  yard:ramp('#7f7768','#958c7b','#aaa08c','#bdb39d','#cec5af'),
  marsh:ramp('#34452c','#425636','#526841','#647a4b'),
  ford:ramp('#3d7684','#4f8b95','#66a2a5','#83b8b3'),
  cliff:ramp('#2c2a26','#3c3934','#524e46','#6a655a','#857f71'),
};
const spring:Biome={name:'중원 봄 들판',ramps:springRamps,sand:ramp('#9d8f63','#b6a677','#cbbd8e'),canopy:ramp('#1e3520','#2e4d29','#406a35','#5a8743','#7aa356')};
export const biomes:Record<string,Biome>={
  spring,
  loess:{name:'동관 황토 고원',ramps:{...springRamps,grass:ramp('#6c6a3c','#827d48','#998f55','#ada063','#c0b273'),hill:ramp('#7a6640','#937b4c','#ab9159','#c1a667','#d3ba7a'),dirt:ramp('#8a6c41','#a6834f','#bf9a5f','#d1ae70','#e0c186'),rock:ramp('#4b4135','#655848','#7f705b','#998870','#b2a086'),forest:ramp('#3a3e26','#4a4f2e','#5b6036','#6b713e')},sand:ramp('#a89568','#c0ad7d','#d4c393'),canopy:ramp('#2e3820','#43502b','#5a6a35','#738440','#8f9e4e')},
  lush:{name:'한중 산림',ramps:{...springRamps,grass:ramp('#2f4e27','#3b602d','#477234','#58863d','#6e9b49'),forest:ramp('#18291a','#203520','#284327','#30502c')},sand:spring.sand,canopy:ramp('#142817','#21401f','#2f5a2a','#447436','#5f8f44')},
  river:{name:'장강 유역',ramps:{...springRamps,water:ramp('#173a4f','#1d4a63','#255a73','#306d82','#438596')},sand:spring.sand,canopy:spring.canopy},
  dream:{...spring,name:'흉몽',tint:[hex('#2e2a58'),.4]},
};
export function biomeFor(stageId:string){
  if(stageId==='S1-06')return biomes.loess!;
  if(stageId==='S1-07'||stageId==='S1-08')return biomes.lush!;
  if(stageId==='S1-05'||stageId==='T07'||stageId==='T04'||stageId==='Q01'||stageId==='Q08')return biomes.river!;
  if(stageId==='S1-04')return biomes.dream!;
  return spring;
}

/** 4×4 Bayer matrix in [0,1): classic ordered dithering for pixel art. */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function bayer(x:number,y:number){return (BAYER[(y&3)*4+(x&3)]!+.5)/16;}

/** Tileable fractal value noise in [0,1], 256×256. */
export function noiseField(seed:number,cells=8,octaves=4):Float32Array{
  const N=256,out=new Float32Array(N*N);let amp=1,total=0;
  let s=seed>>>0||1;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  for(let o=0;o<octaves;o++){
    const g=cells<<o,grid=Float32Array.from({length:g*g},rnd),step=N/g;
    for(let y=0;y<N;y++){const gy=y/step,y0=Math.floor(gy),fy=gy-y0,sy=fy*fy*(3-2*fy);
      for(let x=0;x<N;x++){const gx=x/step,x0=Math.floor(gx),fx=gx-x0,sx=fx*fx*(3-2*fx);
        const a=grid[(y0%g)*g+x0%g]!,b=grid[(y0%g)*g+(x0+1)%g]!,c=grid[((y0+1)%g)*g+x0%g]!,d=grid[((y0+1)%g)*g+(x0+1)%g]!;
        out[y*N+x]=out[y*N+x]!+amp*((a*(1-sx)+b*sx)*(1-sy)+(c*(1-sx)+d*sx)*sy);}}
    total+=amp;amp*=.5;
  }
  for(let i=0;i<out.length;i++)out[i]=out[i]!/total;
  return out;
}
export function sample(n:Float32Array,x:number,y:number){return n[((Math.floor(y)&255)<<8)|(Math.floor(x)&255)]!;}

/**
 * Material weights at a point in tile space. Tile centres are blended bilinearly,
 * then sharpened so borders read as organic lines instead of squares. `raw`
 * keeps the unsharpened weights, which drive water depth and elevation.
 */
export function blendWeights(mats:Uint8Array,w:number,h:number,tx:number,ty:number,out:Float32Array,raw:Float32Array,sharp=5){
  out.fill(0);raw.fill(0);
  const ix=Math.floor(tx),iy=Math.floor(ty),fx=tx-ix,fy=ty-iy;
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){
    const cx=Math.min(w-1,Math.max(0,ix+i)),cy=Math.min(h-1,Math.max(0,iy+j));
    const b=(i?fx:1-fx)*(j?fy:1-fy),m=mats[cy*w+cx]!;raw[m]=raw[m]!+b;
  }
  let sum=0;for(let m=0;m<raw.length;m++){const v=raw[m]!**sharp;out[m]=v;sum+=v;}
  for(let m=0;m<out.length;m++)out[m]=out[m]!/(sum||1);
}
/** Pick one material per pixel: the dither threshold walks the cumulative weights,
 * so blends become pixel-art checker transitions instead of soft gradients. */
export function pickMaterial(weights:Float32Array,threshold:number){
  let acc=0;for(let m=0;m<weights.length;m++){acc+=weights[m]!;if(threshold<acc)return m;}
  return weights.length-1;
}
/** Index into a ramp from a 0..1 shade, dithered. */
export function rampIndex(shade:number,length:number,threshold:number){
  return Math.max(0,Math.min(length-1,Math.floor(shade*(length-1)+threshold)));
}
export const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
