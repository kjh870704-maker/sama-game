import {spriteAtlas,SPRITE_CELL} from './sprite-atlas.ts';

/** Naval crews are composed from the existing troop sheet (units-v3) riding a hull
 * whose planks, banner and ram-head figurehead are cut from the siege ram sheet. */
export const navalCrews=[
  {id:'shield',name:'방패 수병',sourceRow:0},
  {id:'spear',name:'창 수병',sourceRow:1},
  {id:'bow',name:'궁 수병',sourceRow:2},
  {id:'flag',name:'지휘선',sourceRow:4},
] as const;
export const NAVAL_ROWS=navalCrews.length;
/** Waterline as a fraction of the cell height; battlefield anchors boats on it. */
export const NAVAL_WATERLINE=214/SPRITE_CELL;

/** Stable crew choice so a unit keeps its boat between renders. */
export function navalCrewRow(id:string,name=''){
  if(/지휘|기함|장군|flag/.test(name+id))return 3;
  if(/궁|노|사격|bow|archer/.test(name+id))return 2;
  if(/창|spear/.test(name+id))return 1;
  let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;
  return h%3;
}
/** Oar sweep per pose: rest, catch, drive, release. */
export function oarAngle(pose:number){return [0.62,0.38,0.82,0.55][pose%4]!;}

// Source rectangles inside the normalized ram cell (frame 0).
const WOOD={x:66,y:172,w:76,h:24},HEAD={x:190,y:162,w:46,h:48},BANNER={x:20,y:54,w:54,h:60};

function crop(src:CanvasImageSource,r:{x:number;y:number;w:number;h:number}){
  const c=document.createElement('canvas');c.width=r.w;c.height=r.h;
  const g=c.getContext('2d')!;g.imageSmoothingEnabled=false;g.drawImage(src,r.x,r.y,r.w,r.h,0,0,r.w,r.h);return c;
}
function hullPath(g:CanvasRenderingContext2D,ox:number,oy:number){
  g.beginPath();g.moveTo(ox+14,oy+146);
  g.quadraticCurveTo(ox+60,oy+174,ox+128,oy+172);g.quadraticCurveTo(ox+196,oy+174,ox+228,oy+144);
  g.lineTo(ox+236,oy+150);g.quadraticCurveTo(ox+216,oy+214,ox+170,oy+224);
  g.lineTo(ox+72,oy+224);g.quadraticCurveTo(ox+26,oy+214,ox+14,oy+146);g.closePath();
}

function drawBoat(g:CanvasRenderingContext2D,ox:number,oy:number,row:number,pose:number,units:HTMLCanvasElement,wood:CanvasPattern,head:HTMLCanvasElement,banner:HTMLCanvasElement){
  const flagship=navalCrews[row]!.id==='flag';
  // Wake behind the hull.
  g.save();g.globalAlpha=.55;g.fillStyle='#cfe6e4';
  g.beginPath();g.ellipse(ox+124,oy+222,112,11,0,0,Math.PI*2);g.fill();g.globalAlpha=.35;g.fillStyle='#2f6470';g.beginPath();g.ellipse(ox+124,oy+224,104,8,0,0,Math.PI*2);g.fill();g.restore();
  // Mast, battened sail and the ram's blue banner.
  const mx=ox+78,top=oy+(flagship?18:34);
  g.fillStyle='#4a3424';g.fillRect(mx-3,top,6,oy+176-top);
  g.save();g.beginPath();g.moveTo(mx+3,top+14);g.lineTo(mx+(flagship?66:54),top+22);g.lineTo(mx+(flagship?70:58),oy+142);g.lineTo(mx+3,oy+148);g.closePath();
  g.fillStyle=flagship?'#e3cf98':'#cdb98a';g.fill();g.lineWidth=2;g.strokeStyle='#5b4330';g.stroke();g.clip();
  g.strokeStyle='rgba(74,52,36,.75)';g.lineWidth=2;for(let y=top+34;y<oy+146;y+=flagship?18:22){g.beginPath();g.moveTo(mx,y);g.lineTo(mx+80,y+6);g.stroke();}
  g.fillStyle='rgba(120,90,60,.14)';g.fillRect(mx+30,top,40,160);g.restore();
  g.imageSmoothingEnabled=false;g.drawImage(banner,mx-50,top-22,flagship?60:48,flagship?66:52);
  // Crew from the existing troop sheet; legs fall behind the gunwale.
  const source=navalCrews[row]!.sourceRow,s=flagship?.7:.76,feet=oy+200;
  g.drawImage(units,pose*SPRITE_CELL,source*SPRITE_CELL,SPRITE_CELL,SPRITE_CELL,ox+146-SPRITE_CELL/2*s,feet-242*s,SPRITE_CELL*s,SPRITE_CELL*s);
  if(flagship){const t=.5;g.drawImage(units,0,0,SPRITE_CELL,SPRITE_CELL,ox+56-SPRITE_CELL/2*t,oy+192-242*t,SPRITE_CELL*t,SPRITE_CELL*t);}
  // Hull planked with siege-ram timber.
  g.save();hullPath(g,ox,oy);g.save();g.translate(ox,oy);g.fillStyle=wood;g.fill();g.restore();
  const shade=g.createLinearGradient(0,oy+168,0,oy+224);shade.addColorStop(0,'rgba(255,220,160,.08)');shade.addColorStop(.55,'rgba(20,14,10,.18)');shade.addColorStop(1,'rgba(10,8,6,.62)');g.fillStyle=shade;g.fill();
  g.clip();g.strokeStyle='rgba(28,18,12,.55)';g.lineWidth=1.5;for(const y of [188,200,212]){g.beginPath();g.moveTo(ox,oy+y);g.quadraticCurveTo(ox+128,oy+y+6,ox+256,oy+y-8);g.stroke();}
  g.restore();
  hullPath(g,ox,oy);g.lineWidth=3;g.strokeStyle='#22170f';g.stroke();
  // Gunwale rail and shields hung along it.
  g.beginPath();g.moveTo(ox+16,oy+150);g.quadraticCurveTo(ox+60,oy+176,ox+128,oy+174);g.quadraticCurveTo(ox+196,oy+176,ox+228,oy+148);
  g.lineWidth=6;g.strokeStyle='#6d4b2c';g.stroke();g.lineWidth=2;g.strokeStyle='#c99a45';g.stroke();
  for(const x of [52,86,120,154,186]){const y=oy+178+Math.abs(x-120)*-.02;g.beginPath();g.arc(ox+x,y,8,0,Math.PI*2);g.fillStyle='#7a2f22';g.fill();g.lineWidth=2;g.strokeStyle='#d8aa52';g.stroke();g.fillStyle='#d8aa52';g.beginPath();g.arc(ox+x,y,2.4,0,Math.PI*2);g.fill();}
  // Oars sweep with the pose so attacks read as rowing hard.
  const a=oarAngle(pose);g.lineCap='round';
  for(const x of [66,100,134,168]){const sx=ox+x,sy=oy+190,ex=sx-Math.cos(a)*40,ey=sy+Math.sin(a)*52;g.lineWidth=4;g.strokeStyle='#3b2a1c';g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.stroke();g.lineWidth=2;g.strokeStyle='#9c7448';g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.stroke();g.fillStyle='#e6f2ee';g.globalAlpha=.6;g.beginPath();g.ellipse(ex,Math.min(ey,oy+238),7,2.5,0,0,Math.PI*2);g.fill();g.globalAlpha=1;}
  // Ram-head figurehead from the siege ram on the prow.
  g.drawImage(head,ox+204,oy+112,HEAD.w*.9,HEAD.h*.9);
  // Foam at the waterline in front of the hull.
  g.strokeStyle='rgba(230,244,240,.8)';g.lineWidth=2.5;
  for(const [x,w] of [[40,26],[118,30],[196,22]] as const){g.beginPath();g.moveTo(ox+x,oy+226);g.quadraticCurveTo(ox+x+w/2,oy+230-(pose%2)*2,ox+x+w,oy+226);g.stroke();}
}

let cache:Promise<HTMLCanvasElement>|undefined;
export function navalAtlas(){
  cache??=(async()=>{
    const [units,ram]=await Promise.all([spriteAtlas('units-v3.webp',6),spriteAtlas('ram-v1.webp',2,2)]);
    const out=document.createElement('canvas');out.width=SPRITE_CELL*4;out.height=SPRITE_CELL*NAVAL_ROWS;
    const g=out.getContext('2d')!;g.imageSmoothingEnabled=false;
    const wood=g.createPattern(crop(ram,WOOD),'repeat')!,head=crop(ram,HEAD),banner=crop(ram,BANNER);
    for(let row=0;row<NAVAL_ROWS;row++)for(let pose=0;pose<4;pose++)drawBoat(g,pose*SPRITE_CELL,row*SPRITE_CELL,row,pose,units,wood,head,banner);
    return out;
  })();
  return cache;
}
