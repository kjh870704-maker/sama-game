import {playbackEvents} from './battle-playback.ts';
import {troopFacing,troopReaction,troopReactionPose,retreatMotion,battlePath,stepPose} from './troop-motion.ts';
import {troopRoles,visualClass,troopArt,troopSheets,basicReactionArt,artClass,classSheets,loadClassSheets,hasPaintedMotion} from './troops.ts';
import {spriteAtlas,outlinedCanvas} from './sprite-atlas.ts';
import {paintedTroopArt,paintedTroopFrame,paintedFrames} from './painted-troops.ts';
import {cryFor,reactions,isCrisis,type Emote} from './emotes.ts';
import type {SoundEvent} from './sound-events.ts';
import {navalAtlas,navalCrewRow,NAVAL_WATERLINE} from './naval-art.ts';
import {structureKind,structureFrame} from './campaign-rules.ts';
import { Application, CanvasSource, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import {terrainLayer,loadBattleTextures} from './terrain.ts';
import {BattleFx,type Element} from './battle-fx.ts';
import {stageRules} from './stage-rules.ts';
import {factionOf,officerLook} from './officer-art.ts';
import {romanceOf} from './romance.ts';
import {crispZoom,groundScaleMode,unitTint} from './pixel-look.ts';
import {dyeOfSide,dyePixels,clothBand,needsDye,type Dye} from './dye.ts';
import {armorFrame,MOUNTED_FAMILIES,ROBE_FAMILIES,MACHINE_FAMILIES,type ArmorTier} from './armor.ts';
import {officerBattleSheet} from './officer-models.ts';
import type {LogEntry} from '../../core/src/index.ts';
import { key, manhattan, ignoresRough, tierOf, familyOf, strategyArea, inReach } from '../../core/src/index.ts';
import type { BattleState, Coord, Unit, TerrainKind } from '../../core/src/index.ts';

const W=48,H=48;
async function imageCanvas(url:string){const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d')!.drawImage(img,0,0);return c;}
const colors:Record<TerrainKind,number>={plain:0x6b7560,road:0xada084,forest:0x435f50,mountain:0x69736d,hill:0x83846a,water:0x3d6770,rapids:0x3d6770,bridge:0x98846a,fort:0xab9e7b,gate:0x8b8a77,wall:0x777f74,cliff:0x5b554b,marsh:0x6f8a5c,plank:0x8a6a45,ford:0x6f9ea3};
/** 진영 색: 아군 파랑, 편입 아군 옅은 파랑, NPC(자동 우군) 초록, 적군 빨강. */
const sides={player:0x3d86ff,ally:0x6fa8ff,allyAi:0x3fbf5a,enemy:0xff4a3d};
export const terrainNames:Record<TerrainKind,string>={plain:'평지',road:'길',forest:'숲',mountain:'산지',hill:'구릉',water:'수상',rapids:'완류',bridge:'다리',fort:'성채',gate:'성문',wall:'성벽',cliff:'절벽(통행 불가)',marsh:'갈대늪',plank:'잔도',ford:'여울'};
export {classNames} from './troops.ts';
import {classNames} from './troops.ts';
export function unitName(u:Unit){return classNames[u.name]??u.name;}
function iso(c:Coord){return {x:c.x*W+W/2,y:c.y*H+H/2};}
/** A named officer on the field: a victory/defeat target or someone with a known allegiance. */
function isCommander(state:BattleState,u:Unit){return [...state.victory,...state.defeat].some(c=>c.type==='retreat'&&c.unit===u.id)||factionOf(u.name)!==undefined;}
function diamond(g:Graphics,x:number,y:number,color:number,alpha=1){return g.rect(x-W/2,y-H/2,W,H).fill({color,alpha});}
/** 참고 화면식 칸 표시: 칸 사이를 띄운 둥근 판(이동은 푸르게, 공격은 붉게). */
function tileMark(g:Graphics,x:number,y:number,color:number,edge:number,alpha=.42){const m=3,r=6;return g.roundRect(x-W/2+m,y-H/2+m,W-2*m,H-2*m,r).fill({color,alpha}).stroke({color:edge,width:1.6,alpha:.85});}
function clear(c:Container){for(const child of c.removeChildren())child.destroy({children:true});}
/** 병종마다 다른 타격감: 맞는 모양(베기·찌르기·돌격·화살…), 화면 흔들림, 히트스톱, 밀려나는 거리, 내지르는 거리. */
interface HitStyle {kind:'slash'|'pierce'|'charge'|'arrow'|'bolt'|'blunt'|'spell'|'fire'|'heal';shake:number;stop:number;knock:number;reach:number}
export function hitStyle(family:string,unitClass:string,strategy?:string):HitStyle{
  if(strategy!==undefined){if(['heal','calm','mend','greatMend','repair'].includes(strategy))return {kind:'heal',shake:0,stop:0,knock:0,reach:0};
    return /fire|inferno|blaze/.test(strategy)?{kind:'fire',shake:4,stop:80,knock:6,reach:0}:{kind:'spell',shake:3,stop:65,knock:5,reach:0};}
  if(family==='catapult'||family==='ram')return {kind:'blunt',shake:6,stop:100,knock:8,reach:14};
  switch(family){
    case 'cavalry':return {kind:'charge',shake:5,stop:90,knock:12,reach:26};
    case 'heavyCav':return {kind:'charge',shake:7,stop:115,knock:14,reach:24};
    case 'spearman':return {kind:'pierce',shake:3.5,stop:75,knock:9,reach:24};
    case 'archer':return {kind:'arrow',shake:1.5,stop:50,knock:4,reach:0};
    case 'horseArcher':return {kind:'arrow',shake:2,stop:55,knock:5,reach:0};
    case 'crossbow':return {kind:'bolt',shake:2.5,stop:65,knock:7,reach:0};
    case 'infantry':case 'bandit':case 'monk':case 'navy':return {kind:'slash',shake:3,stop:70,knock:7,reach:19};
    default:return {kind:'slash',shake:2,stop:55,knock:5,reach:16};
  }
}

/** 완성 병종 원화 한 칸을 전장에 그리는 크기(px).
 * 48px 전투 칸에 인접한 병종의 실루엣이 침범하지 않도록 투명 여백을 포함한 프레임을 64px로 제한한다.
 * 실제 인물 키는 보병 38px(0.6), 기마·수레·배 46px(0.72)라 한 칸 안에서 읽힌다. */
const TROOP_CELL_SIZE=64;
export class Battlefield {
  app=new Application();
  world=new Container();
  ground=new Container();
  ranges=new Graphics();
  pieces=new Container();
  cursor=new Graphics();
  effects=new Container();
  /** 화면 좌표에 그리는 효과(화면 섬광). */
  overlayFx=new Container();
  private fx!:BattleFx;
  rubble=new Container();
  /** M-18 warnings: red cells with the turns left until the blow lands. */
  warnings=new Container();
  private state:BattleState|undefined;
  private selected='';
  private mode='move';
  private previousPositions=new Map<string,Coord>();
  private textures=new Map<string,Texture>();
  private atlas:Texture|undefined;
  private extra:Texture|undefined;
  private facing=new Map<string,number>();
  private troopTextures=new Map<string,Texture>();
  /** 받는 중이거나 받은(실패 포함) 병종 시트. */
  private sheetWanted=new Set<string>();
  /** 병종 시트가 새로 들어와 장수 그림을 다시 그려야 한다. */
  private artDirty=false;
  private smooth:((c:HTMLCanvasElement,rim?:boolean)=>Texture)|undefined;
  /** 병종 그림이 새로 준비되면 부른다(main이 화면을 다시 그린다). */
  onArtReady:()=>void=()=>{};
  private ram:Texture|undefined;
  private naval:Texture|undefined;
  private convoys:Texture|undefined;
  private scenery:Texture|undefined;
  private terrainTextures:Texture[]=[];
  private actors=new Map<string,{piece:Container,sprite:Sprite,unit:Unit,officer?:boolean}>();
  private minimap:HTMLCanvasElement|undefined;
  private animationEpoch=0;
  private statusSeen=new Map<string,Set<string>>();
  busy=false;
  playbackRate=1;
  onSound:(e:SoundEvent)=>void=()=>{};
  /** 기록 항목 하나로 아군이 번 경험치(원정 전투만). main.ts가 세션과 잇는다. */
  xpFor:(e:LogEntry)=>{amount:number;level?:number;learned?:string[]}|undefined=()=>undefined;
  /** Stereo position of a tile on screen, −0.85 (left) … 0.85 (right). */
  private panOf(at:Coord){const p=this.world.toGlobal({x:(at.x+.5)*W,y:0});return Math.max(-.85,Math.min(.85,p.x/Math.max(1,this.app.screen.width)*2-1));}
  onAnimationEnd:()=>void=()=>{};
  private observer:ResizeObserver|undefined;
  private zoom=1;
  private overview=false;
  private pan={x:0,y:0};
  /** 마우스 위치(가장자리 스크롤용, 캔버스 좌표). */
  private edgeAt:{x:number;y:number}|undefined;
  private drag:{x:number;y:number;px:number;py:number}|undefined;
  private dragged=false;
  private hover:Coord|undefined;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** 숨쉬기의 기준 키(그림마다 처음 크기). */
  private baseScaleY=new WeakMap<Sprite,number>();
  onCell:(c:Coord)=>void=()=>{};
  onHover:(c:Coord|undefined)=>void=()=>{};
  async init(privateHost:HTMLElement){
    await this.app.init({resizeTo:privateHost,backgroundAlpha:0,antialias:false,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl'});
    // Painted art is far larger than its cell on screen: mipmapped smooth reduction keeps
    // every stroke instead of dropping random pixels, and the dark rim keeps the dot look.
    const smooth=(canvas:HTMLCanvasElement,rim=true)=>new Texture({source:new CanvasSource({resource:rim?outlinedCanvas(canvas):canvas,autoGenerateMipmaps:true,scaleMode:'linear'})});
    // 고정 그림(기본 병종·충차·수군·수송대·성채)만 먼저 준비한다. 하나가 실패해도 빈 그림으로 대신해 전장은 열린다.
    // 병종 원화 시트는 이 전투에 나온 병종 것만 뒤에서 받는다(wantSheets) — 휴대폰 캔버스 메모리 한도를 넘지 않게.
    const blank=(cols:number,rows:number)=>{const c=document.createElement('canvas');c.width=cols*16;c.height=rows*16;return c;};
    const safe=<T extends HTMLCanvasElement>(p:Promise<T>,cols:number,rows:number,what:string)=>p.catch(error=>{console.warn(what+' 그림을 읽지 못해 빈 그림으로 대신합니다.',error);return blank(cols,rows);});
    const [ram,naval,convoys,extra,atlas,scenery]=await Promise.all([safe(spriteAtlas('ram-v1.webp',2,2),2,2,'충차'),safe(navalAtlas(),4,8,'수군'),safe(imageCanvas('convoys-v1.webp'),4,2,'수송대'),safe(spriteAtlas('units-extra-v1.webp',4),4,4,'추가 병종'),safe(spriteAtlas('units-v3.webp',6),4,6,'기본 병종'),safe(imageCanvas('scenery-v3.webp'),4,2,'성채'),loadBattleTextures().catch(()=>undefined),loadClassSheets().catch(()=>undefined)]);
    this.smooth=smooth;
    this.ram=smooth(ram);this.naval=smooth(naval);this.convoys=smooth(convoys);this.extra=smooth(extra);this.atlas=smooth(atlas);this.scenery=smooth(scenery,false);
    privateHost.appendChild(this.app.canvas);
    this.minimap=document.createElement('canvas');this.minimap.className='tactical-minimap';this.minimap.width=192;this.minimap.height=144;this.minimap.setAttribute('aria-label','전체 전황 지도. 클릭하면 해당 위치로 이동합니다.');privateHost.appendChild(this.minimap);
    this.minimap.addEventListener('pointerdown',e=>{e.stopPropagation();if(!this.state)return;const r=this.minimap!.getBoundingClientRect();this.focus({x:(e.clientX-r.left)/r.width*this.state.map.width,y:(e.clientY-r.top)/r.height*this.state.map.height});});
    this.app.canvas.setAttribute('aria-label','정방 격자 전술 지도. 방향키로 칸 이동, Enter로 선택. 확대는 +/− 버튼.');
    this.app.canvas.tabIndex=0;
    this.app.stage.addChild(this.world);this.world.addChild(this.ground,this.rubble,this.ranges,this.warnings,this.pieces,this.cursor,this.effects);this.effects.sortableChildren=true;this.app.stage.addChild(this.overlayFx);this.fx=new BattleFx(this.app,this.effects,this.overlayFx,this.reduced);
    const canvas=this.app.canvas;
    // Touch: one finger drags, two fingers pinch-zoom around their midpoint, and a
    // long press shows the tile under the finger the way hovering does with a mouse.
    const fingers=new Map<number,{x:number;y:number}>();let pinch:{dist:number;zoom:number}|undefined,hold:ReturnType<typeof setTimeout>|undefined,held=false;
    const local=(e:{clientX:number;clientY:number})=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
    const spread=()=>{const [a,b]=[...fingers.values()];return {dist:Math.hypot(a!.x-b!.x,a!.y-b!.y),mid:{x:(a!.x+b!.x)/2,y:(a!.y+b!.y)/2}};};
    canvas.addEventListener('pointerdown',e=>{
      fingers.set(e.pointerId,local(e));canvas.setPointerCapture(e.pointerId);clearTimeout(hold);held=false;
      if(fingers.size===2){pinch={dist:spread().dist,zoom:this.zoom};this.drag=undefined;this.dragged=true;return;}
      this.drag={x:e.clientX,y:e.clientY,px:this.pan.x,py:this.pan.y};this.dragged=false;
      if(e.pointerType==='touch'){const at=local(e);hold=setTimeout(()=>{if(!this.dragged&&fingers.size===1){held=true;this.setHover(this.fromPoint(at.x,at.y));}},450);}
    });
    canvas.addEventListener('pointermove',e=>{
      if(fingers.has(e.pointerId))fingers.set(e.pointerId,local(e));
      if(pinch&&fingers.size===2){const {dist,mid}=spread();if(pinch.dist>0)this.zoomAt(pinch.zoom*dist/pinch.dist,mid,false);return;}
      if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>5){this.dragged=true;clearTimeout(hold);}if(this.dragged){this.pan={x:this.drag.px+dx,y:this.drag.py+dy};this.fit();return;}}
      if(e.pointerType!=='touch'){const at=local(e);this.edgeAt=e.pointerType==='mouse'?at:undefined;this.setHover(this.fromPoint(at.x,at.y));}
    });
    const release=(e:PointerEvent,cancel:boolean)=>{
      const was=fingers.size;fingers.delete(e.pointerId);clearTimeout(hold);
      if(pinch){if(fingers.size<2){const s=spread0();this.zoomAt(this.zoom,s,true);pinch=undefined;}this.drag=undefined;return;}
      if(!cancel&&was===1&&!this.dragged&&!held){const at=local(e),c=this.fromPoint(at.x,at.y);if(c)this.onCell(c);}
      this.drag=undefined;
    };
    // After a pinch the zoom settles on the nearest crisp step around the screen centre.
    const spread0=()=>({x:this.app.screen.width/2,y:this.app.screen.height/2});
    canvas.addEventListener('pointerup',e=>release(e,false));
    canvas.addEventListener('pointercancel',e=>release(e,true));
    canvas.addEventListener('pointerleave',e=>{this.edgeAt=undefined;if(!this.drag&&e.pointerType!=='touch')this.setHover(undefined);});
    // 가장자리 스크롤: 마우스를 전장 가장자리(56px 안)에 대면 그쪽으로 화면이 따라 흐른다. 가까울수록 빠르다.
    this.app.ticker.add(t=>{const at=this.edgeAt;if(!at||this.drag||!this.state||this.busy)return;
      const w=this.app.screen.width,h=this.app.screen.height,E=Math.min(56,w*.08,h*.1),v=(d:number)=>d<E?(1-d/E)*16*t.deltaTime:0;
      const dx=v(at.x)-v(w-at.x),dy=v(at.y)-v(h-at.y);if(!dx&&!dy)return;
      const before={...this.pan};this.pan={x:this.pan.x+dx,y:this.pan.y+dy};this.fit();
      if(before.x!==this.pan.x||before.y!==this.pan.y)this.setHover(this.fromPoint(at.x,at.y));});
    // 휠로는 확대하지 않는다: 전장(배경)은 고정이고, 확대는 화면의 +/− 버튼으로만 한다.
    canvas.addEventListener('keydown',e=>{
      const moves:Record<string,Coord>={ArrowRight:{x:1,y:0},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowUp:{x:0,y:-1}};
      if(moves[e.key]){e.preventDefault();const d=moves[e.key]!,c=this.hover??this.state?.find(this.selected)?.pos??{x:0,y:0};const next={x:c.x+d.x,y:c.y+d.y};if(this.state?.map.inBounds(next))this.setHover(next);}
      if(e.key==='Enter'&&this.hover){e.preventDefault();this.onCell(this.hover);}
    });
    this.observer=new ResizeObserver(()=>requestAnimationFrame(()=>{
      this.app.resize();
      // 화면 크기가 바뀌어도 칸 크기는 같은 비율로(보던 곳을 가운데에 둔 채)
      if(this.state){const c=this.world.toLocal({x:this.app.screen.width/2,y:this.app.screen.height/2});this.zoom=this.fixedZoom();this.fit();this.focus({x:c.x/W-.5,y:c.y/H-.5});}
    }));this.observer.observe(privateHost);
    this.app.ticker.maxFPS=60;
    // Boats ride the swell while idle; tweens own the sprite during playback.
    this.app.ticker.add(()=>{if(this.reduced)return;const t=performance.now()/1000;
      // 장수의 기운은 전투 연출 중에도 맥동한다.
      for(const [id,a] of this.actors)if(a.officer){const aura=a.piece.children.find(c=>c.label==='aura');if(aura){aura.alpha=.55+Math.sin(t*3+id.length)*.35;aura.scale.set(1+Math.sin(t*3+id.length)*.05);}}
      if(this.busy)return;
      for(const [id,a] of this.actors){const phase=id.length*.7;
        if(familyOf(a.unit.unitClass)==='navy'){a.sprite.y=8+Math.sin(t*1.6+phase)*1.8;a.sprite.rotation=Math.sin(t*1.1+phase)*.035;continue;}
        if(structureKind(a.unit.id)||a.unit.id.startsWith('convoy_')||['ram','catapult'].includes(artClass(a.unit.unitClass)))continue;
        // 서 있어도 숨을 쉰다(발은 땅에 붙이고 몸만 살짝 오르내림), 사람마다 박자가 다르다.
        let by=this.baseScaleY.get(a.sprite);if(by===undefined){by=a.sprite.scale.y;this.baseScaleY.set(a.sprite,by);}
        a.sprite.scale.y=by*(1+Math.sin(t*(a.officer?2.2:1.8)+phase)*(a.officer?.016:.012));
        if(a.officer)a.sprite.y=8-(1+Math.sin(t*2.2+phase))*1.1;
        // 그림이 둘인 병종은 가끔 자세를 고쳐 선다(무게를 옮김)
        const facing=this.facing.get(id)??0;if(facing===0&&!hasPaintedMotion(a.unit.unitClass)){const cyc=(t+phase*1.7)%(3.4+phase%1.3);a.sprite.texture=this.unitTexture(a.unit,cyc<.5?3:0);}}});
  }
  private fromPoint(x:number,y:number):Coord|undefined{
    const p=this.world.toLocal({x,y});const c={x:Math.floor(p.x/W),y:Math.floor(p.y/H)};
    return this.state?.map.inBounds(c)?c:undefined;
  }
  private setHover(c:Coord|undefined){
    this.hover=c;this.cursor.clear();if(c){
      const u=this.state?.find(this.selected),def=u?this.state?.strategyFor(u,this.mode):undefined;
      if(u&&def&&manhattan(u.pos,c)<=def.range)for(const at of strategyArea(def,c,u.pos)){
        if(!this.state!.map.inBounds(at))continue;
        const p=iso(at);diamond(this.cursor,p.x,p.y,0xf5d395,.34).stroke({color:0xffe1a8,width:1.4});
      }
      const p=iso(c);diamond(this.cursor,p.x,p.y,0xffffff,.12).stroke({color:0xe9dcc0,width:1.6,alpha:.8});
    }
    this.onHover(c);
  }
  setZoom(z:number){
    if(!this.state)return;void z;return;
    this.overview=false;
    const w=this.app.screen.width,h=this.app.screen.height;
    const center=this.world.toLocal({x:w/2,y:h/2});
    this.zoom=crispZoom(Math.max(.22,Math.min(1.8,z)),this.app.renderer.resolution,Math.sign(z-this.zoom));this.fit();this.focus({x:center.x/W-.5,y:center.y/H-.5});
  }
  zoomBy(d:number){this.setZoom(this.zoom+d);}
  /** Zoom keeping the world point under `at` (screen space) fixed; snap only when the gesture ends. */
  zoomAt(z:number,at:{x:number;y:number},snap:boolean){
    if(!this.state)return;void z;void at;void snap;return;this.overview=false;
    const before=this.world.toLocal(at),clamped=Math.max(.22,Math.min(1.8,z));
    this.zoom=snap?crispZoom(clamped,this.app.renderer.resolution):clamped;this.fit();
    const now=this.world.toGlobal(before);this.pan={x:this.pan.x+at.x-now.x,y:this.pan.y+at.y-now.y};this.fit();
  }
  /** 전장 배율은 고정: 가로로 열두 칸 반, 세로로 일곱 칸 남짓이 보이게(작은 화면은 일곱 칸). 넓은 전장은 끌어서·미니맵으로 살핀다. */
  private fixedZoom(){const w=this.app.screen.width,h=this.app.screen.height,across=w<600?9:w<1000?13:17;return Math.max(.5,Math.min(w/(across*W),h/(9.5*H)));}
  reset(){if(!this.state)return;this.overview=false;this.zoom=this.fixedZoom();this.fit();if(this.selected){const u=this.state.find(this.selected);if(u){this.focus(u.pos);return;}}this.focus(this.state.living('player')[0]?.pos??{x:0,y:0});}
  overviewReset(){if(!this.state)return;this.overview=true;this.zoom=crispZoom(Math.min((this.app.screen.width-40)/(this.state.map.width*W),(this.app.screen.height-70)/(this.state.map.height*H)),this.app.renderer.resolution,-1);this.pan={x:0,y:0};this.fit();}
  /** 전장은 고정이다: 전체가 보이면 움직이지 않고, 확대해 둔 상태에서 그 칸이 화면 밖일 때만 그쪽으로 옮긴다(확대 배율은 그대로). */
  focusUnit(at:Coord){
    if(!this.state||this.overview)return;
    const p=this.world.toGlobal({x:(at.x+.5)*W,y:(at.y+.5)*H}),w=this.app.screen.width,h=this.app.screen.height,mx=w*.12,my=h*.12;
    if(p.x>=mx&&p.x<=w-mx&&p.y>=my&&p.y<=h-my)return;
    this.focus(at);
  }
  /** 전장 전체가 한눈에 들어오는 배율(너무 작아지면 쓰지 않는다). */
  private overviewZoom(){if(!this.state)return 1;return Math.min((this.app.screen.width-40)/(this.state.map.width*W),(this.app.screen.height-70)/(this.state.map.height*H));}
  focus(at:Coord){
    if(!this.state)return;
    this.pan={x:(this.state.map.width*W/2-(at.x+.5)*W)*this.zoom,y:(this.state.map.height*H/2-(at.y+.5)*H)*this.zoom};this.fit();
  }
  private fit(){
    if(!this.state)return;
    const w=this.app.screen.width,h=this.app.screen.height,m=this.state.map,scale=this.zoom;
    this.world.scale.set(scale);
    const left=(w-m.width*W*scale)/2,top=(h-m.height*H*scale)/2;
    const x=m.width*W*scale>w?Math.max(w-m.width*W*scale-24,Math.min(24,left+this.pan.x)):left;
    const y=m.height*H*scale>h?Math.max(h-m.height*H*scale-24,Math.min(24,top+this.pan.y)):top;
    // Whole device pixels keep ground dots the same size across the screen.
    const r=this.app.renderer.resolution,px=Math.round(x*r)/r,py=Math.round(y*r)/r;
    this.world.position.set(px,py);this.pan={x:px-left,y:py-top};
    this.drawMinimap();
  }
  private drawMinimap(){
    if(!this.minimap||!this.state)return;const c=this.minimap,g=c.getContext('2d')!,m=this.state.map,sx=c.width/m.width,sy=c.height/m.height;
    g.clearRect(0,0,c.width,c.height);
    for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){g.fillStyle='#'+colors[m.tileAt({x,y}).terrain].toString(16).padStart(6,'0');g.fillRect(x*sx,y*sy,sx+1,sy+1);}
    for(const u of this.state.living()){g.fillStyle='#'+sides[u.side].toString(16);g.fillRect(u.pos.x*sx-1,u.pos.y*sy-1,4,4);}
    g.strokeStyle='#fff1c0';g.lineWidth=1.5;g.strokeRect(-this.world.x/this.zoom/W*sx,-this.world.y/this.zoom/H*sy,this.app.screen.width/this.zoom/W*sx,this.app.screen.height/this.zoom/H*sy);
  }
  load(state:BattleState){
    this.animationEpoch++;this.busy=false;this.overview=false;this.state=state;this.previousPositions.clear();this.facing.clear();this.statusSeen.clear();this.actors.clear();clear(this.pieces);clear(this.ground);clear(this.effects);clear(this.rubble);this.cursor.clear();
    // Only the painted ground owns its canvas; scenery frames share the atlas.
    this.terrainTextures.forEach((texture,i)=>texture.destroy(i===0));this.terrainTextures=[];
    this.paintTerrain();
    // 전장 전체가 보이면 그대로 고정한다. 아주 큰 전장만 아군 쪽을 보여 주고 시작한다.
    // 칸이 충분히 크게 보일 때만 전체 보기로 고정하고, 넓은 전장은 아군 쪽을 크게 보여 준 채 시작한다(드래그·미니맵으로 살핀다).
    this.zoom=this.fixedZoom();this.focus(state.living('player')[0]?.pos??{x:0,y:0});
  }
  /** A bridge was built or the river rose: repaint the ground from the changed map. */
  repaintTerrain(){
    if(!this.state)return;clear(this.ground);
    this.terrainTextures.forEach((texture,i)=>texture.destroy(i===0));this.terrainTextures=[];
    this.paintTerrain();this.fit();
  }
  private paintTerrain(){
    const result=terrainLayer(this.state!,this.scenery!);this.ground.addChild(result.layer);this.terrainTextures=[result.texture,...result.frames];
    const m=this.state!.map;const ruled=stageRules[this.state!.stage.id]?.labels,labels=ruled?ruled.map(l=>({at:m.regions.get(l.region)?.[0],text:l.text})):this.state!.stage.id==='S1-07'?[{at:m.regions.get('enemy_camp')?.[0],text:'전초 수비 진지'},{at:m.regions.get('forest_route')?.[0],text:'보병 숲길'},{at:m.regions.get('main_route')?.[0],text:'기병 큰길'}]:this.state!.stage.id==='S1-05'?[{at:m.regions.get('escort_goal')?.[0],text:'동쪽 교량 출구'},{at:m.regions.get('south_exit')?.[0],text:'남쪽 강변 출구'}]:this.state!.stage.id==='S1-03'?[{at:m.regions.get('east_pass')?.[0],text:'동쪽 고개'},{at:m.regions.get('ravine_exit')?.[0],text:'남쪽 계곡'}]:this.state!.stage.id==='S1-09'?[{at:m.regions.get('exit')?.[0],text:'야곡 출구'},{at:m.regions.get('bridge_bank')?.[0],text:'부교터'}]:this.state!.stage.id==='S1-10'?[{at:m.regions.get('exit')?.[0],text:'북쪽 고개'}]:[{at:m.regions.get('objective')?.[0],text:this.state!.stage.id==='S1-06'?'관문 돌파 구역':this.state!.stage.id==='S1-04'?'황제에게 접근':this.state!.stage.id==='S1-02'?'남문':this.state!.stage.id==='S1-01'?'창고':'중앙 성채'}];
    for(const {at,text} of labels)if(at){const label=new Text({text,style:{fontFamily:'Malgun Gothic',fontSize:14,fontWeight:'700',fill:0xffe4a3,dropShadow:{color:0x14201b,blur:2,distance:1}}});label.anchor.set(.5,1);label.position.set((at.x+.5)*W,at.y*H-6);this.ground.addChild(label);}
    for(const goal of this.state!.victory){
      if(!goal.target?.startsWith('trial_'))continue;
      const at=m.regionCoords(goal.target)[0];if(!at)continue;
      const text=goal.target==='trial_defense'?'방어 거점':goal.target==='trial_safe'?'구출 안전지대':goal.type==='capture'?'점령 거점':'호위 출구';
      const label=new Text({text,style:{fontFamily:'Malgun Gothic',fontSize:14,fontWeight:'700',fill:0xffe4a3,stroke:{color:0x14201b,width:4}}});label.anchor.set(.5,1);label.position.set((at.x+.5)*W,at.y*H-6);this.ground.addChild(label);
    }
  }
  /** 이 전투의 병종에게 필요한 원화 시트 이름(전용 채색·완성 원화·반응·걷기). */
  private sheetsFor(u:Unit):string[]{
    if(structureKind(u.id)||u.id.startsWith('convoy_'))return [];
    const c=u.unitClass,a=artClass(c),out:string[]=[];
    const officer=officerBattleSheet(u);if(officer){out.push(officer.action.sheet,officer.walk.sheet,officer.sideWalk.sheet);if(officer.fallback)out.push(officer.fallback.action.sheet);}
    if(classSheets.has(c))out.push('own:'+c);
    const painted=paintedTroopArt[c];if(painted)out.push(painted.sheet);
    const basic=basicReactionArt[a];if(basic)out.push(basic.sheet);
    const art=troopArt[a];if(art)out.push(art.sheet,art.sheet+'-walk',art.sheet+'-reaction');
    return out;
  }
  /** 필요한 병종 시트를 하나씩 받아 둔다(받는 동안은 기본 병종 그림으로 그린다). 실패한 시트는 기본 그림 그대로. */
  private wantSheets(state:BattleState){
    if(!this.smooth)return;const smooth=this.smooth;
    for(const u of state.living())for(const id of this.sheetsFor(u)){
      if(this.sheetWanted.has(id))continue;this.sheetWanted.add(id);
      const own=id.startsWith('own:')?classSheets.get(id.slice(4) as Unit['unitClass']):undefined,def=troopSheets.find(x=>x.id===id) as {url:string;rows:number;union?:boolean;alphaCutoff?:number;strictGrid?:boolean}|undefined;
      const cut=own?spriteAtlas(own,3):def?spriteAtlas(def.url,def.rows,4,!!def.union,def.alphaCutoff??8,!!def.strictGrid):undefined;if(!cut)continue;
      void cut.then(c=>{this.troopTextures.set(id,smooth(c));this.artDirty=true;this.onArtReady();}).catch(error=>console.warn(id+' 병종 시트를 읽지 못해 기본 그림을 씁니다.',error));
    }
  }
  render(state:BattleState,selected:string,mode:string,showThreat:boolean,scouted=false){
    this.state=state;this.selected=selected;this.mode=mode;this.ranges.clear();
    this.wantSheets(state);
    // 새로 들어온 병종 원화로 바꿔 그린다(동작 중이 아닐 때 한 번에).
    if(this.artDirty&&!this.busy){this.artDirty=false;for(const a of this.actors.values())a.piece.destroy({children:true});this.actors.clear();this.textures.clear();}
    clear(this.warnings);
    for(const t of state.telegraphs??[]){
      const left=Math.max(1,t.at-state.turn),g=new Graphics();
      const warn=t.ratio<=0;
      for(const c of t.cells){const p=iso(c);diamond(g,p.x,p.y,warn?0xe0b030:0xd83a2a,left<=1?.38:.22).stroke({color:warn?0xffe08a:0xffb08a,width:2,alpha:.9});}
      this.warnings.addChild(g);
      const head=t.cells[0]!,p=iso(head),tag=new Text({text:`${t.label??'경고'} · ${left}턴`,style:{fontFamily:'Malgun Gothic',fontSize:12,fontWeight:'700',fill:0xffe0c8,stroke:{color:0x3a0c08,width:4}}});
      tag.anchor.set(.5,1);tag.position.set(p.x,p.y-H*.35);this.warnings.addChild(tag);
    }
    // Tile hazards: fire is always visible; traps only once the field has been scouted.
    const hazards=new Graphics();
    for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
      const tile=state.map.tileAt({x,y});if(tile.hazard==='fire'){const p=iso({x,y});diamond(hazards,p.x,p.y,0xff6a1a,.3).stroke({color:0xffb060,width:2,alpha:.85});hazards.rect(p.x-W*.22,p.y-H*.1,W*.44,H*.36).fill({color:0xffc04a,alpha:.22});}
      else if(tile.hazard==='trap'&&scouted){const p=iso({x,y});diamond(hazards,p.x,p.y,0x5a1810,.18).stroke({color:0xe0503a,width:2,alpha:.9});hazards.moveTo(p.x-W*.16,p.y-H*.16).lineTo(p.x+W*.16,p.y+H*.16).moveTo(p.x+W*.16,p.y-H*.16).lineTo(p.x-W*.16,p.y+H*.16).stroke({color:0xe0503a,width:2.5,alpha:.95});}
    }
    for(const z of stageRules[state.stage.id]?.zones??[])for(const at of state.map.regionCoords(z.region)){const p=iso(at);diamond(hazards,p.x,p.y,z.color,.16).stroke({color:z.color,width:2,alpha:.85});}
    this.warnings.addChild(hazards);
    const u=state.find(selected);
    for(const goal of state.victory){
      if(!goal.target?.startsWith('trial_'))continue;
      const color=goal.target==='trial_defense'?0xff9874:0xffdf84;
      for(const at of state.map.regionCoords(goal.target)){const p=iso(at);diamond(this.ranges,p.x,p.y,color,.35).stroke({color,width:3});}
    }
    if(state.stage.id==='S1-03'&&!state.activeDialogue){const target=state.victory.find(c=>c.type==='reach')?.target;if(target)for(const at of state.map.regionCoords(target)){const p=iso(at);diamond(this.ranges,p.x,p.y,0xffdf84,.3).stroke({color:0xffe3a0,width:3});}}
    if(scouted)for(const enemy of state.living('enemy')){
      const route=enemy.patrolRoute??[];
      if(route.length){const first=iso(enemy.pos);this.ranges.moveTo(first.x,first.y);for(const at of route){const p=iso(at);this.ranges.lineTo(p.x,p.y);}this.ranges.stroke({color:0xffd082,width:2,alpha:.7});}
    }
    // S1-08 racers: a gold ring under each competing ally instead of a line across the map.
    if(state.stage.id==='S1-08')for(const racer of state.living('allyAi').filter(u=>u.behavior==='race')){const p=iso(racer.pos);diamond(this.ranges,p.x,p.y,0xf4cc75,.12).stroke({color:0xf4cc75,width:1.5,alpha:.7});}
    if(showThreat)for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
      const c={x,y};if(state.living('enemy').some(e=>manhattan(e.pos,c)<=(e.visionRange??e.range[1]))){const p=iso(c);diamond(this.ranges,p.x,p.y,0xd36a5e,.22);}
    }
    if(u?.alive&&u.side===state.currentSide&&!u.hasActed){
      if((mode==='repair'||mode==='fortify')&&familyOf(u.unitClass)==='engineer')for(const d of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){const at={x:u.pos.x+d.x,y:u.pos.y+d.y};if(!state.map.inBounds(at))continue;const occupant=state.unitAt(at),ok=mode==='repair'?!!occupant&&occupant.side!=='enemy':!occupant;if(ok){const p=iso(at);diamond(this.ranges,p.x,p.y,mode==='repair'?0x9fe0a8:0xe0c27a,.28).stroke({color:mode==='repair'?0xb9f2c0:0xf2d79a,width:1.4});}}
      if(mode==='heal'&&familyOf(u.unitClass)==='fengshui')for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){if(manhattan(u.pos,{x,y})<=3){const p=iso({x,y});diamond(this.ranges,p.x,p.y,0x83e8b2,.22);}}
      if(mode==='move'&&!u.hasMoved){const reach=state.map.reachable(u,state.occupancy(),ignoresRough(u));for(const k of reach.keys()){const [x,y]=k.split(',').map(Number);const p=iso({x:x!,y:y!});tileMark(this.ranges,p.x,p.y,0x2f86d8,0x9fd4ff);}}
      else if(mode==='attack'||mode==='duel'||mode==='debate'||state.strategies.has(mode)){
        const def=state.strategyFor(u,mode);for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){const d=manhattan(u.pos,{x,y});if(def||mode!=='attack'?d<=(def?.range??(mode==='debate'?3:1)):inReach(u,u.pos,{x,y})){const p=iso({x,y});tileMark(this.ranges,p.x,p.y,def?0xc89a3a:0xd0442e,def?0xffe3a0:0xffa088,.36);}}
      }
    }
    if(!this.busy){
      for(const [id,actor] of this.actors)if(!state.find(id)?.alive){actor.piece.destroy({children:true});this.actors.delete(id);}
      for(const unit of state.living()){
        let actor=this.actors.get(unit.id);
        if(!actor){
          const piece=new Container(),sprite=new Sprite(this.unitTexture(unit));sprite.anchor.set(.5,.88);sprite.position.set(0,8);
          const mounted=(unit.id.startsWith('convoy_')||['cavalry','heavyCav','horseArcher','catapult','ram'].includes(artClass(unit.unitClass)));sprite.width=mounted?96:84;sprite.height=mounted?96:84;if(unit.id.startsWith('convoy_')){sprite.width=80;sprite.height=80;}else if(familyOf(artClass(unit.unitClass))==='ram'){sprite.width=sprite.height=76;}else if(familyOf(artClass(unit.unitClass))==='navy'){sprite.width=sprite.height=84;sprite.anchor.y=NAVAL_WATERLINE+.03;}else if(!structureKind(unit.id))sprite.anchor.y=.945;
          // 전용 채색 시트는 칸이 정사각형이 아닐 수 있다(코끼리 384×341): 높이를 기준으로 가로 비율을 지킨다.
          // 완성 병종 원화는 아틀라스에서 병종마다 몸집을 맞춰 두었으므로(sprite-atlas FOOT_HEIGHT·MOUNT_HEIGHT) 칸을 모두 같은 크기로 그린다.
          if((paintedTroopArt[unit.unitClass]||officerBattleSheet(unit))&&!structureKind(unit.id)&&!unit.id.startsWith('convoy_')){sprite.height=TROOP_CELL_SIZE;sprite.width=TROOP_CELL_SIZE*sprite.texture.width/sprite.texture.height;}if(structureKind(unit.id)){const kind=structureKind(unit.id);sprite.width=kind==='tower'?85:kind==='barricade'?58:64;sprite.height=kind==='tower'?118:kind==='barricade'?46:75;}
          // Troops first face the bulk of the opposing army; afterwards they turn as they move and strike.
          if(!structureKind(unit.id)){const foes=state.living().filter(o=>(o.side==='enemy')!==(unit.side==='enemy')&&!structureKind(o.id));const cx=foes.reduce((a,o)=>a+o.pos.x,0)/Math.max(1,foes.length);if(foes.length&&cx<unit.pos.x)sprite.scale.x*=-1;}
          // Dark-edged side disc under the feet: reads on grass, sand and water alike.
          const base=new Graphics();base.ellipse(0,6,20,9).fill({color:0x0b1410,alpha:.5});base.ellipse(0,7,17,7).fill({color:sides[unit.side],alpha:.3}).stroke({color:0x0d1411,width:5});base.ellipse(0,7,17,7).stroke({color:sides[unit.side],width:2.5});piece.addChild(base,sprite);
          // 이름 있는 장수는 발밑에 금빛 기운이 맴돌고, 서 있을 때도 숨을 쉰다.
          const officer=!structureKind(unit.id)&&this.isOfficer(unit);
          if(officer){const aura=new Graphics();aura.label='aura';aura.ellipse(0,7,25,11).stroke({color:0xf0cc70,width:2}).ellipse(0,7,29,13).stroke({color:0xf0cc70,width:1,alpha:.5});piece.addChildAt(aura,0);}
          actor={piece,sprite,unit,officer};this.actors.set(unit.id,actor);this.pieces.addChild(piece);
        }
        const seen=this.statusSeen.get(unit.id),now=new Set(unit.statuses.map(x=>x.kind as string));
        if(seen)for(const kind of now)if(!seen.has(kind)&&reactions[kind])this.emote(unit.pos,reactions[kind]!);
        this.statusSeen.set(unit.id,now);
        actor.unit=unit;actor.piece.position.set((unit.pos.x+.5)*W,(unit.pos.y+.5)*H);actor.piece.zIndex=unit.pos.y;
        actor.sprite.texture=this.unitTexture(unit,this.facing.get(unit.id)??0);actor.sprite.alpha=1;actor.sprite.tint=unitTint(unit);
        for(const child of actor.piece.children.filter(c=>c.label==='hud'))child.destroy();
        const bar=new Graphics();if(unit.id===selected||unit.id==='rescue_target'||unit.id==='convoy_trial')bar.ellipse(0,7,22,10).stroke({color:0xffe9aa,width:2});
        const ratio=Math.max(0,unit.hp/unit.stats.maxHp);bar.rect(-18,12,36,7).fill(0x0d1310).rect(-17,13,34,5).fill(0x40312a).rect(-17,13,Math.round(34*ratio),5).fill(ratio<.3?0xf06a4f:sides[unit.side]).rect(-17,13,Math.round(34*ratio),1).fill({color:0xffffff,alpha:.35});
        // Evolved troops (tier 2/3) wear gold rank diamonds beside the health bar.
        for(let t=1;t<tierOf(unit.unitClass);t++){const x=-25,y=15-(t-1)*8;bar.poly([x,y-4,x+3.5,y,x,y+4,x-3.5,y]).fill(0xe8c06a).stroke({color:0x2a1d0b,width:1.2});}
        bar.label='hud';actor.piece.addChild(bar);
        if(structureKind(unit.id)){const hp=new Text({text:unit.hp+'/'+unit.stats.maxHp,style:{fontFamily:'Malgun Gothic',fontSize:10,fontWeight:'700',fill:unit.hp<unit.stats.maxHp*.35?0xffa58a:0xfff1cf,stroke:{color:0x16130f,width:3}}});hp.anchor.set(.5,0);hp.y=20;hp.label='hud';actor.piece.addChild(hp);}
        else if(unit.id===selected||unit.side==='player'||['rescue_target','convoy_trial'].includes(unit.id)||isCommander(state,unit)){
          // Named commanders (targets, protected officers) carry their name so they stand out from the rank and file.
          const foe=unit.side==='enemy'&&unit.id!==selected;
          const name=new Text({text:unitName(unit),style:{fontFamily:'Malgun Gothic',fontSize:11,fontWeight:'700',fill:foe?0xffc2a8:unit.side==='allyAi'?0xffe39a:0xfff4da,stroke:{color:foe?0x2a0d08:0x0d1411,width:3}}});name.anchor.set(.5,0);name.y=20;name.label='hud';actor.piece.addChild(name);
        }
      }
      this.pieces.sortableChildren=true;
      for(const fallen of state.units.values())if(!fallen.alive&&structureKind(fallen.id)&&!this.rubble.children.some(c=>c.label===fallen.id))this.drawRubble(fallen);
    }
    this.drawMinimap();
  }
  private ownSheet(u:Unit){return structureKind(u.id)||u.id.startsWith('convoy_')?undefined:this.troopTextures.get('own:'+u.unitClass);}
  private hasReaction(u:Unit){if(this.ownSheet(u)||officerBattleSheet(u))return true;const k=artClass(u.unitClass);return !structureKind(u.id)&&!u.id.startsWith('convoy_')&&!!(paintedTroopArt[u.unitClass]||troopArt[k]||basicReactionArt[k]);}
  private unitTexture(u:Unit,pose=0,isWalking=false){
    // 병종 전용 채색 시트: 0줄 행동, 1줄 걷기, 2줄 반응. 단계 장비는 그림에 이미 그려져 있다.
    const own=this.ownSheet(u);
    const officer=officerBattleSheet(u);
    if(officer&&!structureKind(u.id)&&!u.id.startsWith('convoy_')){
      const verticalWalk=pose>=4&&pose<8,walking=isWalking||verticalWalk;
      let set=walking?(pose<4?officer.sideWalk:officer.walk):officer.action,atlas=this.troopTextures.get(set.sheet);
      if(!atlas&&officer.fallback){set=walking?(pose<4?officer.fallback.sideWalk:officer.fallback.walk):officer.fallback.action;atlas=this.troopTextures.get(set.sheet);}
      if(atlas){
        // 전용 장수 시트의 1·2열은 대기/한 걸음, 3·4열은 공격/방어다.
        const frame=walking?pose%2:pose>=8?3:pose%4,dye=dyeOfSide(u.side),dyed=needsDye('base',dye),key=`officer:${set.sheet}:${dyed?dye:''}:${set.row}:${frame}`,old=this.textures.get(key);if(old)return old;
        const w=atlas.width/4,h=atlas.height/set.rows,t=new Texture({source:dyed?this.dyedSource(atlas,'base-officer-'+set.sheet,dye):atlas.source,frame:new Rectangle(frame*w,set.row*h,w,h)});this.textures.set(key,t);return t;
      }
    }
    // 전체 병종을 새 화풍으로 교체했으므로 예전 manifest 전용 시트는 새 원화가 없을 때만 쓴다.
    if(own&&!paintedTroopArt[u.unitClass]){const row=pose>=8?2:pose>=4?1:0,frame=pose%4,dye=dyeOfSide(u.side),sheet='base-own-'+u.unitClass,dyed=needsDye('base',dye),key='own:'+u.unitClass+':'+(dyed?dye:'')+':'+row+':'+frame,old=this.textures.get(key);if(old)return old;
      const w=own.width/4,h=own.height/3,t=new Texture({source:dyed?this.dyedSource(own,sheet,dye):own.source,frame:new Rectangle(frame*w,row*h,w,h)});this.textures.set(key,t);return t;}
    const painted=paintedTroopArt[u.unitClass];
    if(painted&&!structureKind(u.id)&&!u.id.startsWith('convoy_')){
      const atlas=this.troopTextures.get(painted.sheet);
      if(atlas){
        // 파란 옷은 진영 색으로 염색한다(아군 파랑 · 적 빨강 · 우군 초록). 등갑·코끼리처럼 파란 천이 없으면 그대로다.
        const frame=paintedTroopFrame(pose,paintedFrames(painted.sheet)),dye=dyeOfSide(u.side),sheet='base-painted-'+painted.sheet,dyed=needsDye('base',dye),key=`painted:${painted.sheet}:${dyed?dye:''}:${painted.row}:${frame}`;
        const old=this.textures.get(key);if(old)return old;
        const w=atlas.width/4,h=atlas.height/painted.rows;
        const texture=new Texture({source:dyed?this.dyedSource(atlas,sheet,dye):atlas.source,frame:new Rectangle(frame*w,painted.row*h,w,h)});
        this.textures.set(key,texture);return texture;
      }
    }
    // 진화 단계는 그림을 바꾸기 전에 읽는다(2단: 강철·망토·마의, 3단: 금갑·등 깃발·마갑).
    const tier=structureKind(u.id)||u.id.startsWith('convoy_')?1:tierOf(u.unitClass),fam=familyOf(u.unitClass);
    if(artClass(u.unitClass)!==u.unitClass)u={...u,unitClass:artClass(u.unitClass)};
    const dye=dyeOfSide(u.side);
    // 진영 색으로 물든 시트에서 한 칸을 잘라 쓴다(sheet가 없으면 물들이지 않는다: 배·충차·성채·수송대).
    const cut=(id:string,atlas:Texture,rect:Rectangle,sheet?:string)=>{const dyed=!!sheet&&needsDye(sheet,dye),armored=tier>=2&&(!!sheet||MACHINE_FAMILIES.has(fam)),key=(armored?`a${tier}:${dye}:${fam}:`:'')+(dyed?dye+':':'')+id,old=this.textures.get(key);if(old)return old;
      const source=dyed?this.dyedSource(atlas,sheet!,dye):atlas.source;
      const t=armored?new Texture({source:new CanvasSource({resource:armorFrame(source.resource as HTMLCanvasElement,rect.x,rect.y,rect.width,rect.height,{tier:tier as ArmorTier,mounted:MOUNTED_FAMILIES.has(fam),dye,robe:ROBE_FAMILIES.has(fam),machine:MACHINE_FAMILIES.has(fam)}),autoGenerateMipmaps:true,scaleMode:'linear'})})
        :new Texture({source,frame:rect});this.textures.set(key,t);return t;};
    const basic=basicReactionArt[u.unitClass];if(pose>=8&&basic&&this.troopTextures.has(basic.sheet)&&!structureKind(u.id)&&!u.id.startsWith('convoy_')){const frame=pose%4,atlas=this.troopTextures.get(basic.sheet)!,w=atlas.width/4,h=atlas.height/basic.rows;return cut(basic.sheet+':'+basic.row+':'+frame,atlas,new Rectangle(frame*w,basic.row*h,w,h),basic.sheet);}
    const art=troopArt[u.unitClass],artSheet=art&&art.sheet+(pose>=8?'-reaction':pose>=4?'-walk':'');if(art&&artSheet&&this.troopTextures.has(artSheet)){const sheet=artSheet,frame=pose%4,atlas=this.troopTextures.get(sheet)!,w=atlas.width/4,h=atlas.height/art.rows;return cut(sheet+':'+art.row+':'+frame,atlas,new Rectangle(frame*w,art.row*h,w,h),sheet);}
    if(u.unitClass==='navy'){const row=navalCrewRow(u.id,u.name),frame=pose%4,a=this.naval!,w=a.width/4,h=a.height/4;return cut('naval:'+row+':'+frame,a,new Rectangle(frame*w,row*h,w,h));}
    if(troopRoles[u.unitClass])u={...u,unitClass:visualClass(u.unitClass)};
    if(u.unitClass==='ram'){const a=this.ram!,w=a.width/2,h=a.height/2;return cut('ram:'+pose,a,new Rectangle(pose%2*w,Math.floor(pose/2)*h,w,h));}
    if(u.id.startsWith('convoy_')){const row=u.id==='convoy_b'?1:0,atlas=this.convoys!,w=atlas.width/4,h=atlas.height/2;return cut('convoy:'+row+':'+pose,atlas,new Rectangle(pose*w,row*h,w,h));}
    const structure=structureKind(u.id),extraRow=['crossbow','heavyCav','engineer','fengshui'].indexOf(u.unitClass);
    if(structure){const atlas=this.scenery!,w=atlas.width/4,h=atlas.height/2,f=structureFrame(structure);return cut(structure,atlas,new Rectangle(f%4*w,Math.floor(f/4)*h,w,h));}
    if(extraRow>=0){const atlas=this.extra!,w=atlas.width/4,h=atlas.height/4;return cut('extra:'+extraRow+':'+pose,atlas,new Rectangle(pose*w,extraRow*h,w,h),'extra');}
    const row=['strategist','fengshui','civilian'].includes(u.unitClass)?4:u.unitClass==='spearman'?1:['archer','crossbow'].includes(u.unitClass)?2:['cavalry','heavyCav'].includes(u.unitClass)?3:u.unitClass==='catapult'?5:0;
    const atlas=this.atlas!,w=atlas.width/4,h=atlas.height/6;
    return cut(row+':'+pose,atlas,new Rectangle(pose*w,row*h,w,h),'base');
  }
  /** 시트 하나를 진영 색으로 물들인 사본(처음 쓸 때 한 번 만들고 둔다). */
  private dyed=new Map<string,CanvasSource>();
  private dyedSource(atlas:Texture,sheet:string,dye:Dye){
    const key=sheet+':'+dye,old=this.dyed.get(key);if(old)return old;
    const from=atlas.source.resource as HTMLCanvasElement,c=document.createElement('canvas');c.width=from.width;c.height=from.height;
    const g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(from,0,0);const img=g.getImageData(0,0,c.width,c.height);const painted=sheet.startsWith('base-painted');dyePixels(img.data,clothBand(sheet),dye,painted?.12:.22,painted?1.6:1);g.putImageData(img,0,0);
    const src=new CanvasSource({resource:c,autoGenerateMipmaps:true,scaleMode:'linear'});this.dyed.set(key,src);return src;
  }
  /** Sequential log playback keeps attack, impact and counterattack visibly separate. */
  play(logs:LogEntry[]){
    const events=playbackEvents(logs);if(!events.length)return;
    const epoch=this.animationEpoch;this.busy=true;
    void (async()=>{try{for(const e of events){if(epoch!==this.animationEpoch)break;await this.animateEvent(e,epoch);}}finally{if(epoch===this.animationEpoch){this.busy=false;this.onAnimationEnd();}}})();
  }
  private tween(ms:number,epoch:number,fn:(p:number)=>void){
    if(this.reduced){fn(1);return Promise.resolve();}
    return new Promise<void>(resolve=>{const start=performance.now();const tick=()=>{if(epoch!==this.animationEpoch){this.app.ticker.remove(tick);resolve();return;}const p=Math.min(1,(performance.now()-start)/(ms/this.playbackRate));fn(p);if(p===1){this.app.ticker.remove(tick);resolve();}};this.app.ticker.add(tick);});
  }
  private async animateEvent(e:LogEntry,epoch:number){
    if(e.t==='retreat'){
      const actor=this.actors.get(e.unit);if(!actor)return;
      const mechanical=!!structureKind(e.unit)||['ram','catapult'].includes(familyOf(actor.unit.unitClass))||e.unit.startsWith('convoy_');
      this.focusUnit(actor.unit.pos);const kind=structureKind(e.unit);this.burst(actor.unit.pos,kind==='gate'?'성문 돌파!':kind?'파괴':'퇴각',kind==='gate'?0xffd27a:0xd4c2a2);
      if(kind){this.debris(actor.unit.pos,kind==='gate'?26:16);if(kind==='gate'){this.onSound({kind:'breach',pan:this.panOf(actor.unit.pos)});this.emote(actor.unit.pos,reactions.breach!);}void this.shake(kind==='gate'?9:5,520,epoch);}
      this.onSound({kind:'retreat',unitClass:actor.unit.unitClass,structure:!!kind&&kind!=='gate',pan:this.panOf(actor.unit.pos)});
      if(!kind)this.emote(actor.unit.pos,reactions.retreat!);
      void this.fx.defeat(iso(actor.unit.pos));if(!kind)this.fx.screenFlash(0xffffff,.12,160);
      if(this.hasReaction(actor.unit))actor.sprite.texture=this.unitTexture(actor.unit,10);
      await this.tween(720,epoch,p=>{const m=retreatMotion(p,mechanical);actor.sprite.rotation=m.rotation;actor.sprite.y=8+m.drop;actor.piece.alpha=m.alpha;});
      if(epoch===this.animationEpoch){actor.piece.destroy({children:true});this.actors.delete(e.unit);this.facing.delete(e.unit);}return;
    }
    if(e.t==='guard'){
      const protector=this.actors.get(e.protector);if(!protector||!this.hasReaction(protector.unit))return;
      const facing=this.facing.get(e.protector)??0,scale=protector.sprite.scale.x;
      await this.tween(300,epoch,p=>{protector.sprite.texture=this.unitTexture(protector.unit,troopReactionPose('guard',p));protector.sprite.scale.x=Math.abs(scale);});
      if(epoch===this.animationEpoch){protector.sprite.texture=this.unitTexture(protector.unit,facing);protector.sprite.scale.x=scale;}return;
    }
    if(e.t==='move'){
      const actor=this.actors.get(e.unit);if(!actor)return;this.onSound({kind:'move',unitClass:actor.unit.unitClass,pan:this.panOf(e.from)});this.focusUnit(e.to);
      // 출발·도착만 기록되므로 지형을 따라 길을 다시 찾아 한 칸씩 걷는다(벽·물을 가로질러 미끄러지지 않게).
      const st=this.state,mover=actor.unit,cls=mover.unitClass,hostile=(c:Coord)=>!!st?.living().some(o=>o.id!==mover.id&&o.pos.x===c.x&&o.pos.y===c.y&&(o.side==='enemy')!==(mover.side==='enemy'));
      const path=battlePath(e.from,e.to,c=>st&&st.map.inBounds(c)?st.map.moveCost(cls,c,ignoresRough(mover)):Infinity,hostile);
      const walkArt=hasPaintedMotion(cls)||!!officerBattleSheet(mover),mounted=['cavalry','heavyCav','horseArcher'].includes(artClass(cls)),machine=['ram','catapult'].includes(artClass(cls))||!!structureKind(mover.id);
      const stride=actor.officer,per=Math.min(mounted?150:stride?220:190,1500/Math.max(1,path.length));
      if(stride)this.sparks(e.from,{count:6,color:0xb8a27a,speed:40,life:500,gravity:40,size:3});
      let at=e.from;
      for(let i=0;i<path.length;i++){
        if(epoch!==this.animationEpoch)return;
        const next=path[i]!,a=iso(at),b=iso(next),facing=troopFacing(b.x-a.x,b.y-a.y);
        if(walkArt){this.facing.set(e.unit,facing.pose);actor.sprite.scale.x=Math.abs(actor.sprite.scale.x)*facing.flip;}else if(!machine&&b.x!==a.x)actor.sprite.scale.x=Math.abs(actor.sprite.scale.x)*(b.x<a.x?-1:1);
        const first=i===0,last=i===path.length-1,lean=(b.x>=a.x?1:-1)*(stride?.05:.025);
        await this.tween(per*(first||last?1.15:1),epoch,p=>{
          // 처음 칸은 천천히 떼고 마지막 칸은 멈추듯 닿는다; 가운데는 고른 걸음
          const k=first&&last?p*p*(3-2*p):first?p*p*(2-p)*.5+p*.5:last?1-(1-p)*(1-p)*.5-(1-p)*.5:p;
          actor.piece.position.set(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k);actor.piece.zIndex=k>.5?next.y:at.y;
          if(mounted){actor.sprite.y=8-Math.abs(Math.sin(p*Math.PI))*4;actor.sprite.rotation=Math.sin(p*Math.PI*2)*.04;}
          else if(machine){actor.sprite.y=8-Math.abs(Math.sin(p*Math.PI*2))*1;actor.sprite.rotation=Math.sin(p*Math.PI*2)*.015;}
          else{actor.sprite.y=8-Math.abs(Math.sin(p*Math.PI*2))*(stride?2.5:2);actor.sprite.rotation=lean*Math.sin(p*Math.PI);}
          if(!machine&&!actor.unit.id.startsWith('convoy_')&&familyOf(actor.unit.unitClass)!=='navy')actor.sprite.texture=this.unitTexture(actor.unit,stepPose(walkArt,walkArt?facing.pose:0,i,p>=.5),!!officerBattleSheet(actor.unit));
          else if(actor.unit.id.startsWith('convoy_'))actor.sprite.texture=this.unitTexture(actor.unit,1+(i*2+(p>=.5?1:0))%2);
          else if(familyOf(actor.unit.unitClass)==='navy'){actor.sprite.texture=this.unitTexture(actor.unit,1+(i*2+(p>=.5?1:0))%2);actor.sprite.y=8-Math.sin(p*Math.PI)*2;}
        });
        at=next;
      }
      if(epoch===this.animationEpoch){actor.piece.position.set(iso(e.to).x,iso(e.to).y);actor.piece.zIndex=e.to.y;if(stride)this.sparks(e.to,{count:8,color:0xb8a27a,speed:50,life:520,gravity:40,size:3});actor.sprite.y=8;actor.sprite.rotation=0;actor.sprite.texture=this.unitTexture(actor.unit,this.facing.get(e.unit)??0);}return;
    }
    if(e.t==='strike'){
      // The warned blow lands: flash every marked cell, then damage numbers on whoever stayed.
      const mid=e.cells[Math.floor(e.cells.length/2)]!;this.focusUnit(mid);
      this.onSound({kind:'strike',pan:this.panOf(mid)});
      const flash=new Graphics();for(const c of e.cells){const p=iso(c);diamond(flash,p.x,p.y,0xfff1c8,.85);}this.effects.addChild(flash);
      void this.shake(6,380,epoch);for(const c of e.cells)this.debris(c,4);
      await this.tween(380,epoch,p=>{flash.alpha=1-p;});flash.destroy();
      for(const h of e.hits){const u=this.state?.find(h.unit);if(u&&h.damage>0)this.burst(u.pos,'−'+h.damage,0xffc8a0);}
      return;
    }
    if(e.t!=='attack'&&e.t!=='counter'&&e.t!=='strategy')return;
    const caster=e.t==='strategy'?e.caster:e.attacker,actor=this.actors.get(caster);if(!actor)return;
    const targetId=e.t==='strategy'?e.targets[0]:e.defender,target=this.state?.find(targetId??'');if(!target)return;
    const from=iso(actor.unit.pos),to=iso(target.pos),dx=to.x-from.x,dy=to.y-from.y,len=Math.max(1,Math.hypot(dx,dy));
    this.focusUnit({x:(actor.unit.pos.x+target.pos.x)/2,y:(actor.unit.pos.y+target.pos.y)/2});
    if(hasPaintedMotion(actor.unit.unitClass)||officerBattleSheet(actor.unit)){this.facing.set(actor.unit.id,0);actor.sprite.scale.x=Math.abs(actor.sprite.scale.x)*(dx<0?-1:1);}else if(!structureKind(actor.unit.id)&&dx!==0)actor.sprite.scale.x=Math.abs(actor.sprite.scale.x)*(dx<0?-1:1);
    const ranged=e.t==='strategy'||['archer','crossbow','catapult','horseArcher'].includes(artClass(actor.unit.unitClass))||(familyOf(actor.unit.unitClass)==='navy'&&manhattan(actor.unit.pos,target.pos)>1),fx=new Graphics();this.effects.addChild(fx);
    const reactions_=(e.t==='strategy'?e.targets:[e.defender]).map((id,i)=>{
      const victim=this.actors.get(id),damage=e.t==='strategy'?(e.damage[i]??0):e.damage;
      const kind=troopReaction(e.t==='strategy'||e.hit,damage,!!victim&&!!this.state?.hasStatus(victim.unit,'guard'));
      return {victim,kind,scale:victim?.sprite.scale.x??1,tint:victim?.sprite.tint??0xffffff,texture:victim?.sprite.texture};
    });
    let hit=false;
    this.onSound(e.t==='strategy'?{kind:'strategy-start',unitClass:actor.unit.unitClass,strategy:e.strategy,pan:this.panOf(actor.unit.pos)}:{kind:'attack-start',unitClass:actor.unit.unitClass,pan:this.panOf(actor.unit.pos)});
    const style=hitStyle(familyOf(actor.unit.unitClass),actor.unit.unitClass,e.t==='strategy'?e.strategy:undefined),officer=this.isOfficer(actor.unit),tactic=e.t!=='strategy'?e.tactic:undefined;
    const landed=e.t==='strategy'?e.damage.some(d=>d>0):e.hit,critical=e.t==='attack'&&e.critical&&e.hit;
    // 병종 전법이 발동하면 그 이름을 외치고, 장수는 휘두르기 전에 기합을 모은다.
    this.emote(actor.unit.pos,tactic?{text:tactic+'!',color:0xd9a43a,shape:'burst'}:e.t==='counter'?reactions.counter!:cryFor(actor.unit.unitClass,e.t==='strategy',e.t==='strategy'?e.strategy:''));
    // 겨눔 표시와(책략은) 발밑 마법진
    void this.fx.targetMark(to,e.t==='strategy'?760:520);
    const el:Element|undefined=e.t==='strategy'?(e.strategy==='heal'||e.strategy==='calm'||e.strategy==='repair'||e.damage.some(d=>d<0)||(this.state?.strategies.get(e.strategy)?.targetSides.includes('player')&&!this.state?.strategies.get(e.strategy)?.targetSides.includes('enemy'))?'heal':((el0=>el0==='physical'?'earth':el0)(this.state?.strategies.get(e.strategy)?.element) as Element|undefined)??'support'):undefined;
    if(el)void this.fx.castCircle(from,{fire:0xff8a3a,water:0x6ab8ff,wind:0x8fdf9a,thunder:0xfff06a,earth:0xd8b878,support:0xc080ff,heal:0x9affb0}[el]);
    if(officer)await this.officerFocus(actor,epoch,e.t==='strategy'||ranged);
    if(epoch!==this.animationEpoch)return;
    const leap=officer&&!ranged,total=(e.t==='strategy'?950:760)*(leap?1.1:1);
    const lungeAt=(p:number)=>{if(ranged)return 0;const back=style.kind==='charge'?8:3,reach=style.reach+(leap?4:0);
      if(p<.4)return -back*Math.sin(p/.4*Math.PI/2);
      if(p<.6){const q=(p-.4)/.2;return -back+(reach+back)*q*q;}
      if(p<.72)return reach;
      return reach*(1-(p-.72)/.28);};
    const frame=(p:number)=>{
      const pose=hasPaintedMotion(actor.unit.unitClass)?(p<.2||p>.9?0:e.t==='strategy'?3:p<.5?1:2):(p<.22?1:p<.65?2:p<.92?3:0);actor.sprite.texture=this.unitTexture(actor.unit,pose);
      const lunge=lungeAt(p),jump=leap&&p>=.4&&p<.6?Math.sin((p-.4)/.2*Math.PI)*16:0;actor.sprite.x=dx/len*lunge;actor.sprite.y=8+dy/len*lunge-jump;
      fx.clear();
      if(ranged&&p>.2&&p<.6){const q=(p-.2)/.4,x=from.x+dx*q,y=from.y+dy*q-Math.sin(q*Math.PI)*22;
        if(e.t==='strategy')fx.circle(x,y-20,7+q*8).stroke({color:e.strategy==='fire'?0xffae60:e.strategy==='repair'?0xe8c27a:0xb1f1ed,width:3});
        else if(familyOf(actor.unit.unitClass)==='catapult'){for(let k=1;k<=4;k++){const b=Math.max(0,q-k*.06),tx=from.x+dx*b,ty=from.y+dy*b-Math.sin(b*Math.PI)*46;fx.circle(tx,ty-20,6-k).fill({color:0xd8cdb0,alpha:.5-k*.1});}fx.circle(x,y-20-Math.sin(q*Math.PI)*24,7).fill(0xb9ad8f).stroke({color:0x4b4235,width:1.5});}
        else fx.moveTo(x-dx/len*16,y-dy/len*16-20).lineTo(x,y-20).stroke({color:0xffedba,width:2});
      }
      if(e.t==='strategy'&&(e.strategy==='heal'||e.strategy==='calm'||e.damage.some(d=>d<0))&&p>=.6&&p<.88){fx.circle(to.x,to.y-15,18+(p-.6)*50).stroke({color:0xb1f1bd,width:3,alpha:1-(p-.6)/.28});}
      if(reactions_.some(r=>r.kind!=='none')&&p>=.6&&p<.88){const q=(p-.6)/.28;fx.moveTo(to.x-20+q*35,to.y-36).lineTo(to.x+15,to.y-5).stroke({color:e.t==='strategy'?0xb0f0dc:0xffe3a0,width:4*(1-q),alpha:1-q});}
      for(const r of reactions_){const v=r.victim;if(!v||r.kind==='none')continue;
        if(p>=.6&&p<.94){const q=(p-.6)/.34;if(this.hasReaction(v.unit)){v.sprite.texture=this.unitTexture(v.unit,troopReactionPose(r.kind,q));v.sprite.scale.x=Math.abs(r.scale)*(actor.unit.pos.x<v.unit.pos.x?-1:1);}const knock=r.kind==='hurt'?(1-q)*(1-q)*style.knock*(critical?1.4:1)*(this.isOfficer(v.unit)?.55:1):0;v.sprite.x=dx/len*knock+(r.kind==='hurt'?Math.sin(q*Math.PI*6)*2*(1-q):0);v.sprite.y=8+dy/len*knock*.5;v.sprite.tint=r.kind==='hurt'?0xffd5b3:r.tint;}
        else if(p>=.94){v.sprite.x=0;v.sprite.y=8;v.sprite.scale.x=r.scale;v.sprite.tint=r.tint;if(r.texture)v.sprite.texture=r.texture;}
      }
      if(p>=.6&&!hit){
        // 새 특수효과: 속성별 책략 폭발(대상마다), 베기 궤적·찌르기 섬광·충격파, 방패막, 회피 잔상, 회심 빛살
        if(el){const area=e.t==='strategy'?e.targets.length:1,big=Math.min(1.5,.95+area*.12);(e.t==='strategy'?e.targets:[]).forEach((id,i)=>{const u=this.state?.find(id);if(u)setTimeout(()=>void this.fx.element(iso(u.pos),el,big),i*70);});if(el==='thunder'||el==='fire')void this.shake(el==='thunder'?7:5,300,epoch);}
        else if(landed){const dir=Math.atan2(dy,dx);if(style.kind==='slash')void this.fx.slash(to,dir,critical?1.35:1);else if(style.kind==='pierce'||style.kind==='arrow'||style.kind==='bolt')void this.fx.thrust(to,dx/len,dy/len,critical?1.3:1);else if(style.kind==='charge'||style.kind==='blunt')void this.fx.shock(to,critical?1.35:1);if(critical){void this.fx.critical(to);this.fx.screenFlash(officer?0xffd070:0xfff0c0,officer?.42:.3,officer?300:200);
          // 장수의 회심: 집중선이 표적으로 몰려들고, 「회심의 일격」 띠가 화면을 가로지른다.
          if(officer){const sp=this.world.toGlobal({x:to.x,y:to.y-20});void this.fx.speedLines(sp.x,sp.y);void this.fx.cutIn('회심의 일격',unitName(actor.unit));void this.fx.critical(to);}}}
        // 피해 숫자: 맞은 자리에서 튀어 오른다(회심은 크고 금빛, 회복은 초록).
        if(e.t==='strategy')e.targets.forEach((id,i)=>{const u=this.state?.find(id),d=e.damage[i]??0;if(u&&d!==0)setTimeout(()=>this.popNumber(u.pos,d>0?String(d):'+'+(-d),d>0?0xffd8b0:0x9affb0,false),i*70);});
        else if(landed&&e.damage>0)this.popNumber(target.pos,String(e.damage),critical?0xffd25a:0xffffff,critical);
        for(const r of reactions_)if(r.victim&&r.kind==='guard')void this.fx.shield(iso(r.victim.unit.pos));
        if((e.t==='attack'||e.t==='counter')&&!e.hit)void this.fx.evade(to);
        hit=true;if(landed){this.impact(target.pos,style,dx/len,dy/len,critical);for(const r of reactions_)if(r.victim&&r.kind==='hurt')this.flash(r.victim);void this.shake(style.shake*(critical?(officer?2.4:1.6):1)*(tactic?1.3:1)*(leap?1.35:1),critical&&officer?420:style.kind==='charge'||leap?320:240,epoch);}if(e.t==='attack'&&e.critical&&e.hit)this.emote(target.pos,reactions.critical!,-26);if((e.t==='attack'||e.t==='counter')&&!e.hit)this.emote(target.pos,reactions.evade!);for(const r of reactions_)if(r.victim){if(r.kind==='guard')this.emote(r.victim.unit.pos,reactions.guard!);else{const dmg=e.t==='strategy'?(e.damage[e.targets.indexOf(r.victim.unit.id)]??0):e.damage;if(isCrisis(r.victim.unit.hp,r.victim.unit.stats.maxHp,dmg))this.emote(r.victim.unit.pos,reactions.crisis!,-24);}}if(e.t==='strategy')this.onSound({kind:e.strategy==='repair'?'repair':'strategy',strategy:e.strategy,unitClass:actor.unit.unitClass,pan:this.panOf(target.pos)});else this.onSound({kind:'impact',unitClass:actor.unit.unitClass,target:{id:target.id,unitClass:target.unitClass},hit:e.hit,critical:e.t==='attack'&&e.critical,guard:reactions_.some(r=>r.kind==='guard'),heavy:e.damage>=target.stats.maxHp*.3,structure:!!structureKind(target.id),pan:this.panOf(target.pos)});if(e.t!=='strategy'&&e.hit&&(structureKind(target.id)||['ram','catapult'].includes(actor.unit.unitClass))){this.debris(target.pos,actor.unit.unitClass==='ram'?18:10);if(actor.unit.unitClass==='ram'||actor.unit.unitClass==='catapult')void this.shake(actor.unit.unitClass==='ram'?7:4,300,epoch);}if(e.t==='strategy')e.targets.forEach((id,i)=>{const u=this.state?.find(id);if(!u)return;const d=e.damage[i]??0,healing=el==='heal'||d<0;setTimeout(()=>this.fx.number(iso(u.pos),healing?'+'+Math.abs(d):String(d),healing?'heal':'hurt',(i%2?14:-6)),180+i*90);});else if(e.hit)this.fx.number(to,String(e.damage),critical?'crit':'hurt');else this.fx.number(to,'회피','miss');}
    };
    // 맞는 순간 화면이 잠깐 멎는다(히트스톱): 무거운 병종·회심일수록 길게.
    await this.tween(total*.6,epoch,p=>frame(p*.6));
    // 장수의 회심은 화면이 확실히 멎는다(띠 글씨가 읽힐 만큼).
    if(landed&&(style.stop>0||critical))await this.pause(Math.max(style.stop,90)*(critical?(officer?2.6:1.5):1)*(tactic?1.2:1),epoch);
    await this.tween(total*.4,epoch,p=>frame(.6+p*.4));
    if(epoch!==this.animationEpoch)return;
    fx.destroy();actor.sprite.x=0;actor.sprite.y=8;actor.sprite.texture=this.unitTexture(actor.unit);
    for(const r of reactions_){if(r.victim){r.victim.sprite.x=0;r.victim.sprite.y=8;r.victim.sprite.scale.x=r.scale;r.victim.sprite.tint=r.tint;if(r.texture)r.victim.sprite.texture=r.texture;}}
      // 원정 전투: 그 행동으로 번 경험치를 띄운다(레벨이 오르면 축하 연출).
    const gain=this.xpFor(e);
    if(gain&&gain.amount>0&&this.actors.has(actor.unit.id)){this.floatText(actor.unit.pos,`경험치 +${gain.amount}`,0xf3d27a);
      if(gain.level){this.emote(actor.unit.pos,{text:`레벨 업! Lv.${gain.level}`,color:0xd9a43a,shape:'burst'},-34);this.sparks(actor.unit.pos,{count:22,color:0xffe08a,speed:80,life:1000,gravity:-40,size:3});this.flash(actor);
        // 축하가 다음 반격에 묻히지 않게 잠깐 멈춘다.
        await this.pause(520,epoch);
        if(gain.learned?.length){this.floatText(actor.unit.pos,`책략 습득 · ${gain.learned.join('·')}`,0x9fd3ff);await this.pause(700,epoch);}}}
  }
  /** 이름 있는 장수: 사마의, 원정의 장수, 우두머리·적장, 초상이 있는 인물, 연의 장수록의 인물. */
  private isOfficer(u:Unit){return u.id==='sima_yi'||/^of\d+$/.test(u.id)||u.id==='boss'||u.id==='target'||!!officerLook(u.name)||(!!this.state&&isCommander(this.state,u))||!!romanceOf(u);}
  private pause(ms:number,epoch:number){if(this.reduced)return Promise.resolve();return this.tween(ms,epoch,()=>{});}
  /** 장수의 기합: 금빛 고리가 퍼지고 몸이 한 번 부풀었다 돌아온다(책사는 푸른 기운). */
  private async officerFocus(actor:{piece:Container;sprite:Sprite;unit:Unit},epoch:number,mind:boolean){
    if(this.reduced)return;const p=iso(actor.unit.pos),g=new Graphics();this.effects.addChild(g);
    const sx=actor.sprite.scale.x,sy=actor.sprite.scale.y,color=mind?0x9fe8ff:0xffd36a;
    await this.tween(260,epoch,q=>{g.clear();const r=10+q*30;g.ellipse(p.x,p.y+6,r,r*.45).stroke({color,width:3*(1-q)+1,alpha:1-q});
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2+q*2;g.circle(p.x+Math.cos(a)*r*.7,p.y-18-q*26+Math.sin(a)*6,2).fill({color,alpha:1-q});}
      const k=1+Math.sin(q*Math.PI)*.1;actor.sprite.scale.set(sx*k,sy*k);});
    g.destroy();actor.sprite.scale.set(sx,sy);
  }
  /** 맞은 자리에 병종다운 흔적: 베기는 교차한 칼빛, 찌르기는 긴 창날, 돌격은 흙먼지 고리, 화살은 불꽃, 화공은 불티. */
  private impact(at:Coord,style:HitStyle,ux:number,uy:number,critical:boolean){
    if(this.reduced||style.kind==='heal')return;const p=iso(at),g=new Graphics();g.zIndex=998;this.effects.addChild(g);
    const born=performance.now(),life=critical?420:320,big=critical?1.35:1;
    const tick=()=>{if(g.destroyed){this.app.ticker.remove(tick);return;}const t=Math.min(1,(performance.now()-born)/life);g.clear();const a=1-t,cx=p.x,cy=p.y-22;
      if(style.kind==='slash'){for(const s of [1,-1]){g.moveTo(cx-22*big,cy-16*big*s).lineTo(cx+22*big,cy+16*big*s).stroke({color:0xffffff,width:6*a*big,alpha:a});}}
      else if(style.kind==='pierce'){g.moveTo(cx-ux*30,cy-uy*30).lineTo(cx+ux*(18+20*t),cy+uy*(18+20*t)).stroke({color:0xfff6d8,width:5*a*big,alpha:a});}
      else if(style.kind==='charge'){g.ellipse(p.x,p.y+8,(14+46*t)*big,(6+18*t)*big).stroke({color:0xd9c39a,width:7*a,alpha:a*.9});g.star(cx,cy,8,(18+16*t)*big,8*big).fill({color:0xfff2c0,alpha:a*.85});}
      else if(style.kind==='blunt'){g.circle(cx,cy,(10+30*t)*big).stroke({color:0xe8dcc0,width:8*a,alpha:a});}
      else if(style.kind==='fire'){g.circle(cx,cy,(12+22*t)*big).fill({color:0xff8a3a,alpha:a*.5});}
      else if(style.kind==='spell'){g.circle(cx,cy,(10+26*t)*big).stroke({color:0xb8f4ff,width:4*a,alpha:a});}
      else{g.star(cx,cy,6,(10+8*t)*big,4).fill({color:0xfff0c0,alpha:a});}
      if(t>=1){this.app.ticker.remove(tick);g.destroy();}};this.app.ticker.add(tick);
    const spark={slash:{count:8,color:0xfff3d0,speed:120},pierce:{count:8,color:0xfff3d0,speed:150},charge:{count:16,color:0xb89a6a,speed:110},arrow:{count:6,color:0xffe0a0,speed:100},bolt:{count:9,color:0xffe0a0,speed:140},blunt:{count:14,color:0xa49b86,speed:120},fire:{count:14,color:0xff9a40,speed:90},spell:{count:10,color:0xb8f4ff,speed:90}}[style.kind];
    this.sparks(at,{...spark,count:Math.round(spark.count*(critical?1.6:1)),life:520,gravity:style.kind==='fire'||style.kind==='spell'?-60:220,size:style.kind==='charge'||style.kind==='blunt'?3:2});
  }
  /** 작은 파편·불티를 뿌린다. */
  sparks(at:Coord,o:{count:number;color:number;speed:number;life:number;gravity:number;size:number}){
    if(this.reduced)return;const p=iso(at),born=performance.now(),g=new Graphics();g.zIndex=998;this.effects.addChild(g);
    const parts=Array.from({length:o.count},(_,i)=>{const a=i/o.count*Math.PI*2+(i%3)*.4,v=o.speed*(.55+(i*37%10)/20);return {vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6-o.speed*.5};});
    const tick=()=>{if(g.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/o.life,s=t*o.life/1000;g.clear();
      for(const q of parts)g.rect(p.x+q.vx*s,p.y-20+q.vy*s+o.gravity*s*s,o.size,o.size).fill({color:o.color,alpha:Math.max(0,1-t)});
      if(t>=1){this.app.ticker.remove(tick);g.destroy();}};this.app.ticker.add(tick);
  }
  /** 맞은 몸이 하얗게 번쩍인다. */
  private flash(v:{piece:Container;sprite:Sprite}){
    if(this.reduced)return;const f=new Sprite(v.sprite.texture);f.anchor.copyFrom(v.sprite.anchor);f.scale.copyFrom(v.sprite.scale);f.position.copyFrom(v.sprite.position);f.blendMode='add';f.alpha=.85;v.piece.addChild(f);
    const born=performance.now(),tick=()=>{if(f.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/160;f.alpha=.85*(1-t);f.position.copyFrom(v.sprite.position);if(t>=1){this.app.ticker.remove(tick);f.destroy();}};this.app.ticker.add(tick);
  }
  /** 피해 숫자: 튀어 올랐다 가라앉는다(회심은 더 크고 금빛). */
  private popNumber(at:Coord,text:string,color:number,critical:boolean){
    const p=iso(at),item=new Container();item.zIndex=999;item.position.set(p.x,p.y-30);
    const label=new Text({text,style:{fontFamily:'Malgun Gothic',fontSize:critical?34:26,fontWeight:'900',fill:color,stroke:{color:0x2a0e08,width:5},dropShadow:{color:0x000000,blur:2,distance:2}}});label.anchor.set(.5);item.addChild(label);
    if(critical){const tag=new Text({text:'회심',style:{fontFamily:'Malgun Gothic',fontSize:13,fontWeight:'900',fill:0xfff6d0,stroke:{color:0x6a2a08,width:4}}});tag.anchor.set(.5);tag.y=-26;item.addChild(tag);}
    this.effects.addChild(item);
    if(this.reduced){setTimeout(()=>item.destroy({children:true}),800);return;}
    const born=performance.now(),tick=()=>{if(item.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/1000;
      const s=t<.12?.4+t/.12*1.1:t<.24?1.5-(t-.12)/.12*.5:1;item.scale.set(s);item.y=p.y-30-Math.min(t,.24)/.24*18-Math.max(0,t-.6)*30;item.alpha=t<.7?1:1-(t-.7)/.3;
      if(t>=1){this.app.ticker.remove(tick);item.destroy({children:true});}};this.app.ticker.add(tick);
  }
  /** 작은 글씨가 떠오르며 사라진다(경험치 등). */
  floatText(at:Coord,text:string,color:number){
    const p=iso(at),label=new Text({text,style:{fontFamily:'Malgun Gothic',fontSize:14,fontWeight:'800',fill:color,stroke:{color:0x1a1408,width:4}}});label.anchor.set(.5);label.zIndex=999;label.position.set(p.x,p.y-48);this.effects.addChild(label);
    if(this.reduced){setTimeout(()=>label.destroy(),900);return;}
    const born=performance.now(),tick=()=>{if(label.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/1200;label.y=p.y-48-t*26;label.alpha=t<.6?1:1-(t-.6)/.4;if(t>=1){this.app.ticker.remove(tick);label.destroy();}};this.app.ticker.add(tick);
  }
  /** Broken timber and stones stay where a gate, tower or barricade fell. */
  private drawRubble(u:Unit){
    const p=iso(u.pos),item=new Container(),g=new Graphics();item.label=u.id;
    g.ellipse(p.x,p.y+6,22,11).fill({color:0x2e2822,alpha:.6});
    // The fallen structure's own art, toppled and scorched.
    const kind=structureKind(u.id)!,frame=structureFrame(kind),a=this.scenery!,w=a.width/4,h=a.height/2;
    const fallen=new Sprite(new Texture({source:a.source,frame:new Rectangle(frame%4*w,Math.floor(frame/4)*h,w,h)}));
    fallen.anchor.set(.5,.9);fallen.position.set(p.x+3,p.y+12);fallen.width=kind==='tower'?62:50;fallen.height=kind==='tower'?44:34;fallen.rotation=kind==='gate'?.28:-.42;fallen.tint=0x8a7360;fallen.alpha=.92;
    const seed=u.pos.x*31+u.pos.y*17,stones=new Graphics();
    for(let i=0;i<10;i++){const a2=((seed*(i+3))%360)*Math.PI/180,d=8+((seed+i*7)%12),x=p.x+Math.cos(a2)*d,y=p.y+6+Math.sin(a2)*d*.5;stones.ellipse(x,y,3+(i%3)*2,2+(i%2)*2).fill(i%3===0?0x5b4330:0x8b8576).stroke({color:0x221c16,width:1});}
    for(let i=0;i<3;i++){const x=p.x-16+i*13;stones.moveTo(x,p.y+14-i*2).lineTo(x+12,p.y+4+i*3).stroke({color:0x4a2f1c,width:4});}
    stones.circle(p.x-6,p.y-4,9).fill({color:0x6e6a62,alpha:.25});
    item.addChild(g,fallen,stones);this.rubble.addChild(item);
  }
  private debris(at:Coord,count:number){
    if(this.reduced)return;const p=iso(at),born=performance.now(),g=new Graphics();this.effects.addChild(g);
    const parts=Array.from({length:count},(_,i)=>({vx:Math.cos(i*2.4)*(30+i%5*14),vy:-60-(i%4)*28,size:2+i%3,color:i%3===0?0x6d4b2c:0xa49b86}));
    const tick=()=>{if(g.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/700;g.clear();
      for(const q of parts)g.rect(p.x+q.vx*t,p.y-14+q.vy*t+140*t*t,q.size,q.size).fill({color:q.color,alpha:1-t});
      g.circle(p.x,p.y-6,10+t*26).fill({color:0xcfc4ad,alpha:.28*(1-t)});
      if(t>=1){this.app.ticker.remove(tick);g.destroy();}};this.app.ticker.add(tick);
  }
  private shake(power:number,ms:number,epoch:number){return this.tween(ms,epoch,p=>{const k=(1-p)*power;this.world.pivot.set(Math.sin(p*60)*k,Math.cos(p*47)*k*.6);if(p>=1)this.world.pivot.set(0,0);});}
  /** Pop a speech balloon (or a jagged burst for charges and criticals) above a unit. */
  emote(at:Coord,e:Emote,lift=0){
    const p=iso(at),item=new Container(),g=new Graphics();item.position.set(p.x+10,p.y-70+lift);item.zIndex=999;
    const burst=e.shape==='burst';
    const text=new Text({text:e.text,style:{fontFamily:'Malgun Gothic,"Noto Sans KR",sans-serif',fontSize:13,fontWeight:'900',fill:burst?0xfff6e0:e.color,stroke:{color:burst?0x2a1a12:0xfffaf0,width:burst?3:0}}});text.anchor.set(.5);
    const w=Math.max(30,text.width+16),h=24;
    if(burst){
      const pts:number[]=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=i%2?.78:1;pts.push(Math.cos(a)*(w/2+7)*r,Math.sin(a)*(h/2+7)*r);}
      g.poly(pts).fill(e.color).stroke({color:0x2a1a12,width:2});
    }else{
      g.roundRect(-w/2,-h/2,w,h,9).fill(0xfffaf0).stroke({color:0x2a2620,width:2});g.poly([-8,h/2-1,0,h/2-1,-11,h/2+8]).fill(0xfffaf0);g.moveTo(-8,h/2).lineTo(-11,h/2+8).lineTo(0,h/2).stroke({color:0x2a2620,width:2});
    }
    item.addChild(g,text);this.effects.addChild(item);
    if(this.reduced){setTimeout(()=>item.destroy({children:true}),900);return;}
    const born=performance.now();item.scale.set(.2);
    const tick=()=>{if(item.destroyed){this.app.ticker.remove(tick);return;}const t=(performance.now()-born)/1300;
      item.scale.set(t<.12?.2+t/.12*1:t<.2?1.2-(t-.12)/.08*.2:1);item.y=p.y-70+lift-Math.max(0,t-.55)*30;item.alpha=t<.7?1:1-(t-.7)/.3;
      if(t>=1){this.app.ticker.remove(tick);item.destroy({children:true});}};this.app.ticker.add(tick);
  }
  burst(at:Coord,text:string,color=0xf2c885){
    const p=iso(at),item=new Container(),g=new Graphics();item.position.set(p.x,p.y-20);g.circle(0,0,16).stroke({color,width:2,alpha:.7});
    const label=new Text({text,style:{fontFamily:'Malgun Gothic',fontSize:22,fontWeight:'700',fill:color,dropShadow:{color:0x15221c,blur:3,distance:2}}});label.anchor.set(.5);label.y=-20;item.addChild(g,label);this.effects.addChild(item);
    if(this.reduced){setTimeout(()=>item.destroy({children:true}),600);return;}
    const born=performance.now();const tick=()=>{if(item.destroyed){this.app.ticker.remove(tick);return;}const age=(performance.now()-born)/900;item.y=p.y-20-age*35;item.alpha=1-age;g.scale.set(1+age*2);if(age>=1){this.app.ticker.remove(tick);item.destroy({children:true});}};this.app.ticker.add(tick);
  }
}
