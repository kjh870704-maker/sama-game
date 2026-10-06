/**
 * 이야기 무대 — 조조전의 이벤트 장면처럼, 배경 그림 위에 작은 픽셀 인물들이 서서 걷고, 머리 위에
 * 말풍선·감정을 띄운다. 대사는 무대 위에 겹친 먹 붓 테두리의 대화창(큰 초상 + 이름 + 대사)으로 나오고,
 * 화자가 무대 아래쪽에 있으면 대화창은 위에, 위쪽에 있으면 아래에 뜬다. 장면 사이에는 해설 자막이 흐른다.
 *
 * Stage 하나가 무대 하나를 맡는다(이야기 장면, 출진 전 진영이 함께 쓴다). DOM과 CSS 전환만 쓴다.
 */
import type {Scene,ScriptStep,ChoiceOption,ChoiceEffect,Look,At,CastMember} from './scenario-types.ts';
import {isoScene,stepsBetween,offscreenCell,type Cell,type IsoScene} from './story-iso.ts';
import {officerPortrait,officerLook} from './officer-art.ts';
import {bustFace,displayName} from './faces.ts';
import {pxStyle,type PxDir,type PxPose} from './story-pixel.ts';
import {figSheet,figArtFor,loadFigures,type FigArt} from './story-figure.ts';
import {inkChoice} from './ink-choice.ts';

/** 겉모습 → 병사 그림(시트·줄). 시트는 main.ts가 CSS 변수(--이름-atlas)로 올려 둔다. */
const SPRITES:Record<Look,{sheet:string;rows:number;row:number;walk?:string}>={
  strategist:{sheet:'base',rows:6,row:4},civil:{sheet:'base',rows:6,row:4},infantry:{sheet:'base',rows:6,row:0},spear:{sheet:'base',rows:6,row:1},
  archer:{sheet:'base',rows:6,row:2},cavalry:{sheet:'base',rows:6,row:3},crossbow:{sheet:'extra',rows:4,row:0},heavy:{sheet:'extra',rows:4,row:1},
  engineer:{sheet:'extra',rows:4,row:2},sage:{sheet:'extra',rows:4,row:3},shaman:{sheet:'casters',rows:3,row:0,walk:'casters-walk'},lady:{sheet:'casters',rows:3,row:1,walk:'casters-walk'},
  taoist:{sheet:'casters',rows:3,row:2,walk:'casters-walk'},physician:{sheet:'specialists',rows:4,row:0,walk:'specialists-walk'},monk:{sheet:'specialists',rows:4,row:1,walk:'specialists-walk'},
  horseArcher:{sheet:'specialists',rows:4,row:2,walk:'specialists-walk'},bandit:{sheet:'specialists',rows:4,row:3,walk:'specialists-walk'},assassin:{sheet:'specialists',rows:4,row:3,walk:'specialists-walk'},
  elephant:{sheet:'extra',rows:4,row:1},
};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export function spriteStyle(look:Look,frame=0,walking=false){
  const s=SPRITES[look]??SPRITES.infantry,sheet=walking&&s.walk?s.walk:s.sheet;
  return `background-image:var(--${sheet}-atlas);background-size:400% ${s.rows*100}%;background-position:${frame/3*100}% ${s.rows>1?s.row/(s.rows-1)*100:0}%`;
}
/** 먹 붓 테두리 대화창: 큰 초상과 이름·대사. place: 무대 위('top')·아래('bottom'). */
/**
 * 이야기 무대의 인물 그림. 조조전 이벤트처럼 무기를 휘두르는 전투 그림이 아니라 '서 있는 사람'을 쓴다.
 * - fig: 장수 전신 일러스트(사마의·사마랑·사마방·조진·조조·조비·허저 등). 이름 있는 다른 장수는 문관/무장 일러스트를 옷 색만 바꿔 쓴다.
 * - sheet: 이름 없는 병사·백성은 병종 그림(말 탄 병종은 무대에서 말에서 내린다).
 */
type Art=FigArt;
const artFor=figArtFor;
/** 전신 일러스트의 윗몸(초상이 없는 장수의 대화창 그림). */
function figFace(art:Extract<Art,{kind:'fig'}>){
  return `<div class="officer-face sprite-face" role="img" style="background-image:var(--officer-story-atlas);background-size:800% 400%;background-position:${(art.slot%4*2+0.5)/7*100}% ${(Math.floor(art.slot/4)*2+0.08)/3*100}%;filter:hue-rotate(${art.tint}deg)"></div>`;
}
/** 그린 초상이 없는 인물은 무대 위 병종 그림의 윗몸을 크게 잘라 초상으로 쓴다. */
function spriteFace(look:Look){
  const s=SPRITES[look]??SPRITES.infantry,y=s.rows>1?(s.row*2+0.42)/(s.rows*2-1)*100:0;
  return `<div class="officer-face sprite-face" role="img" style="background-image:var(--${s.sheet}-atlas);background-size:800% ${s.rows*200}%;background-position:${0.5/7*100}% ${y}%"></div>`;
}
/**
 * 대화창: 조조전 리메이크처럼 화자의 흉상이 상자 왼쪽에서 크게 솟아 걸치고, 이름 옆에 자를 붙인다.
 * 먹 상자(이야기 장면)와 양피지 상자(진영 대화) 두 가지. 흉상은 넣은 그림 → 원화 → 지은 초상 순이고,
 * 이름 없는 인물(척후·병사)은 무대 그림의 윗몸을 쓴다.
 */
export function talkBox(speaker:string,line:string,place:'top'|'bottom',stageLook?:Look,skin:'ink'|'paper'='ink'){
  const look=officerLook(speaker),base=look?.name??speaker;
  let face=bustFace(base);
  if(!face){let f=officerPortrait(speaker);
    if(stageLook&&(f.includes('unknown-face')||f.includes('troop-face'))){const art=artFor(speaker,stageLook);f=art.kind==='fig'?figFace(art):f.includes('unknown-face')?spriteFace(art.look):f;}
    face=`<div class="talk-bust sprite">${f}</div>`;}
  void place;
  return `<div class="ss-talk bottom ${skin}"><div class="ss-talk-face">${face}</div><div class="ss-talk-body"><b>${esc(displayName(base))}</b><p>${esc(line)}</p></div><span class="ss-talk-next" aria-hidden="true">⚔</span></div>`;
}

export interface StageHooks {
  onChoice?(option:ChoiceOption,step:Extract<ScriptStep,{choice:string}>):void;
  /** 선택지의 일기토·설전 효과를 겨루게 하고 결과를 돌려준다. */
  onContest?(effect:Extract<ChoiceEffect,{kind:'duel'|'debate'}>):Promise<'win'|'lose'|'draw'>;
  /** 표식(when/unless 판정) — 선택으로 늘어날 수 있어 매번 읽는다. */
  flags():readonly string[];
}
type Actor={el:HTMLElement;cell:Cell;face:'left'|'right';look:Look;art:Art;on:boolean;tick:number;posedUntil:number;px:string;dir:PxDir;pose:PxPose};
/** 서 있을 때 번갈아 쓰는 그림(숨쉬듯 자세가 바뀐다). 병종 그림의 0번은 기본, 3번은 같은 자세의 다른 그림이다. */
const IDLE_FRAMES=(look:Look,art?:Art)=>{if(art?.kind==='fig')return [0];const s=SPRITES[look];return s.sheet==='base'||s.sheet==='extra'||look==='monk'||look==='horseArcher'?[0,3]:[0];};
/** 말을 꺼낼 때의 몸짓(책사는 부채로 가리키고, 의원은 약초를 들고, 무장은 자세를 고친다). */
const TALK_FRAME=(look:Look)=>look==='strategist'||look==='civil'||look==='sage'||look==='shaman'||look==='lady'||look==='taoist'?2:look==='physician'||look==='monk'?3:look==='bandit'||look==='assassin'?1:3;
/** 성낼 때(무장은 무기를 치켜든다). */
const ANGER_FRAME=(look:Look)=>look==='bandit'||look==='assassin'||look==='physician'?3:look==='strategist'||look==='civil'?1:1;
const REACTION:Array<[RegExp,string]>=[[/^!+$|놀람/,'jolt'],[/\?/,'tilt'],[/분노|怒|💢|화/,'shake'],[/땀|💧|…|\.\.\./,'droop'],[/♪|웃음|하하/,'bounce']];
const same=(a:Cell,b:Cell)=>a[0]===b[0]&&a[1]===b[1];

/** 무대 하나: 아이소메트릭 배경·인물·대화창·자막·선택지. 인물은 칸 위에 서고 한 칸씩 걷는다. */
export class Stage {
  readonly el:HTMLElement;
  readonly actors=new Map<string,Actor>();
  readonly scene:IsoScene;
  /** 배경과 인물을 담은 판(카메라가 이것을 당기고 민다). */
  readonly world:HTMLElement;
  private cam={z:1,tx:0,ty:0};
  private talk:HTMLElement;private caption:HTMLElement;private choices:HTMLElement;
  private advance:(()=>void)|undefined;
  skipping=false;
  /** 마지막 대사(선택지의 물음으로 다시 띄운다). */
  private lastLine:{speaker:string;line:string}|undefined;
  /** 대화 상자: 먹(이야기 장면) · 양피지(진영) */
  skin:'ink'|'paper'='ink';
  constructor(host:HTMLElement,art:number,place:string,cast:CastMember[],spots:readonly At[]=[]){
    // 사람이 설 자리(처음 자리·걸어갈 자리)에는 소품을 놓지 않는다
    this.scene=isoScene(art,place,[...cast.flatMap(m=>m.at?[m.at]:[]),...spots]);
    host.innerHTML=`<div class="ss-stage iso light-${this.scene.light}${this.scene.indoor?' indoor':''}"><div class="ss-cam"><div class="ss-world"></div></div><div class="ss-shade"></div><span class="ss-place">${esc(place)}</span><div class="ss-caption" hidden></div><div class="ss-talk-slot"></div></div><div class="ss-choices"></div>`;
    this.el=host.querySelector<HTMLElement>('.ss-stage')!;if(this.scene.figScale)this.el.style.setProperty('--fig-scale',String(this.scene.figScale));this.world=host.querySelector<HTMLElement>('.ss-world')!;this.world.style.backgroundImage=`url(${this.scene.url})`;
    // 흩날리는 것들(꽃잎·불티·비·눈·반딧불·낙엽·먼지·물안개)
    if(this.scene.fx){const fx=document.createElement('div');fx.className=`ss-fx fx-${this.scene.fx}`;const n=this.scene.fx==='rain'?70:this.scene.fx==='mist'?6:26;
      for(let i=0;i<n;i++){const p=document.createElement('i');p.style.cssText=`--x:${(Math.random()*110-5).toFixed(1)}%;--y:${(Math.random()*100).toFixed(1)}%;--d:${(-Math.random()*12).toFixed(2)}s;--s:${(0.6+Math.random()*0.8).toFixed(2)};--t:${(0.8+Math.random()*0.6).toFixed(2)}`;fx.appendChild(p);}
      this.el.insertBefore(fx,this.el.querySelector('.ss-place'));}
    this.talk=host.querySelector<HTMLElement>('.ss-talk-slot')!;this.caption=host.querySelector<HTMLElement>('.ss-caption')!;this.choices=host.querySelector<HTMLElement>('.ss-choices')!;
    // 대사·해설을 기다리는 중이면 어디를 눌러도(인물·대화창 위라도) 넘어간다. 기다리는 게 없을 때만 인물 누르기가 말 걸기다.
    this.el.addEventListener('click',e=>{if(!this.advance&&(e.target as HTMLElement).closest('.ss-actor.clickable'))return;this.next();});
    // 알현 장면: 황제(또는 그 자리의 군주)는 옥좌, 사마의(없으면 첫 사람)는 통로 앞, 나머지는 양옆 줄에
    const seats=new Map<string,Cell>();const L=this.scene.layout;
    if(L){const present=cast.filter(m=>m.at);
      const ruler=present.find(m=>/헌제|황제|천자|폐하|조예|조방|조모|유선/.test(m.name))??present.find(m=>/^(조조|조비|손권|원소|유비)$/.test(m.name));
      if(ruler)seats.set(ruler.name,L.seat);
      const rest=present.filter(m=>m!==ruler),lead=rest.find(m=>m.name==='사마의')??rest[0];if(lead)seats.set(lead.name,L.front);
      let k=0;for(const m of rest)if(m!==lead&&k<L.rows.length)seats.set(m.name,L.rows[k++]!);}
    for(const m of cast)this.addActor(m,seats.get(m.name));
    // 처음 화면: 서 있는 사람들과 이 장면에서 걸어갈 자리를 함께 담도록 다가간다
    this.frame([...[...this.actors.values()].filter(a=>a.on).map(a=>a.cell),...spots.map(at=>this.scene.toCell(at))],false);
    // 인물은 서 있어도 멈추지 않는다: 자세 그림을 번갈아 바꾸고(숨쉬기는 CSS), 가끔 고개를 돌린다.
    const idle=setInterval(()=>{if(!document.contains(this.el)){clearInterval(idle);return;}this.idleTick();},620);
  }
  private idleTick(){
    const now=Date.now();
    for(const a of this.actors.values()){
      if(!a.on||a.el.classList.contains('walking')||a.posedUntil>now)continue;
      a.tick++;const frames=IDLE_FRAMES(a.look,a.art);
      // 사람마다 박자가 다르게(넷 중 하나는 쉬고)
      void frames;
    }
  }
  /** 잠시 한 자세를 취한다(말하는 몸짓·성냄). */
  gesture(name:string,frame:number,ms=900){
    const a=this.actors.get(name);if(!a||a.el.classList.contains('walking'))return;
    this.posePx(a,frame===ANGER_FRAME(a.look)&&frame!==TALK_FRAME(a.look)?'surprise':(a.look==='strategist'||a.look==='civil'||a.look==='sage')?'point':'talk',ms);
  }
  /** 몸으로 하는 반응(펄쩍·갸웃·부들부들·축 처짐·들썩). */
  react(name:string,kind:string){const a=this.actors.get(name);if(!a)return;
    if(kind==='jolt'||kind==='shake')this.posePx(a,'surprise',700);else if(kind==='droop'||kind==='nod')this.posePx(a,'bow',kind==='nod'?450:900);a.el.classList.remove('jolt','tilt','shake','droop','bounce','nod');void a.el.offsetWidth;a.el.classList.add(kind);setTimeout(()=>a.el.classList.remove(kind),900);}
  next(){this.advance?.();}
  /** 이 칸에 다른 사람이 서 있는가. */
  private taken(cell:Cell,except?:string){for(const [n,a] of this.actors)if(n!==except&&a.on&&same(a.cell,cell))return true;return false;}
  /** 원하는 칸이 차 있으면 가장 가까운 빈 칸. */
  private free(cell:Cell,except?:string):Cell{
    if(this.scene.standable(cell)&&!this.taken(cell,except))return cell;
    for(let d=1;d<12;d++)for(let i=-d;i<=d;i++)for(const c of [[cell[0]+i,cell[1]+d-Math.abs(i)],[cell[0]+i,cell[1]-d+Math.abs(i)]] as Cell[])if(this.scene.standable(c)&&!this.taken(c,except))return c;
    return cell;
  }
  addActor(m:CastMember,seat?:Cell){
    const art=artFor(m.name,m.look),look=art.kind==='sheet'?art.look:m.look;
    const el=document.createElement('div');el.className='ss-actor px fig';el.dataset.name=m.name;
    if(art.kind==='fig'&&art.tint)el.style.setProperty('--tint',`${art.tint}deg`);
    // 윗몸과 다리를 나눠 그린다: 걸을 때 다리(옷자락)만 번갈아 흔들려 한 걸음씩 내딛는 것처럼 보인다.
    el.innerHTML=`<div class="ss-shadow"></div><div class="ss-body"><div class="ss-sprite top"></div><div class="ss-sprite legs"></div></div><span class="ss-name">${esc(m.name)}</span><div class="ss-bubble" hidden></div>`;
    const cell=seat??(m.at?this.free(this.scene.toCell(m.at)):this.scene.toCell([-12,60]));
    const face=m.face??(this.scene.toPct(cell)[0]<50?'right':'left');
    const a:Actor={el,cell,face,look,art,px:figSheet(m.name,m.look)??'',dir:'front',pose:'stand',on:!!m.at,tick:Math.floor(Math.random()*4),posedUntil:0};this.actors.set(m.name,a);el.style.setProperty('--d',`${-(Math.random()*2.4).toFixed(2)}s`);
    this.paint(a);this.place(a,false);if(!m.at)el.classList.add('off');this.world.appendChild(el);
    // 그림을 아직 읽는 중이면 다 읽은 뒤에 칠한다
    if(!a.px)void loadFigures().then(()=>{a.px=figSheet(m.name,m.look)??'';this.paint(a);});
    return a;
  }
  /** 인물 그림(윗몸·다리 두 겹에 같은 그림). */
  private paint(a:Actor,pose:PxPose=a.pose){a.pose=pose;a.el.querySelector<HTMLElement>('.ss-sprite.top')!.setAttribute('style',pxStyle(a.px,a.dir,pose));}
  /** 잠깐 한 자세(말하기·절·놀람 등)를 하고 돌아온다. */
  private posePx(a:Actor,pose:PxPose,ms:number){if(a.el.classList.contains('walking'))return;a.posedUntil=Date.now()+ms;this.paint(a,pose);setTimeout(()=>{if(a.posedUntil<=Date.now()&&!a.el.classList.contains('walking'))this.paint(a,'stand');},ms+20);}
  /** 화면 위 자리(%). */
  at(name:string):At|undefined{const a=this.actors.get(name);return a?this.scene.toPct(a.cell):undefined;}
  cellOf(name:string){return this.actors.get(name)?.cell;}
  private place(a:Actor,animate:boolean){
    const [x,y]=this.scene.toPct(a.cell);this.moveTo(a,x,y);
    a.el.classList.toggle('face-left',a.face==='left');if(!animate)a.el.style.transitionDuration='0ms';
  }
  /** 다른 사람 쪽을 본다. */
  faceTo(name:string,other:string){const a=this.actors.get(name),b=this.actors.get(other);if(!a||!b||a===b)return;const [ax,ay]=this.scene.toPct(a.cell),[bx,by]=this.scene.toPct(b.cell);
    if(ax!==bx){a.face=bx>ax?'right':'left';a.el.classList.toggle('face-left',a.face==='left');}
    // 상대가 아래(앞)에 있으면 앞모습, 위(뒤)에 있으면 뒷모습, 거의 같은 높이면 옆모습
    const nd:PxDir=Math.abs(by-ay)<2.5?'side':by>ay?'front':'back';if(nd!==a.dir&&!a.el.classList.contains('walking')){a.dir=nd;this.paint(a);}}
  private waitClick(){return this.skipping?Promise.resolve():new Promise<void>(r=>{this.advance=()=>{this.advance=undefined;r();};});}
  bubble(name:string,text:string,kind:'emote'|'talk'){const a=this.actors.get(name);if(a)bubble(a.el,text,kind);}
  /** 화자가 말한다: 화자 쪽 반대편(위/아래)에 대화창. */
  async say(speaker:string,line:string,to?:string){
    this.lastLine={speaker,line};
    const a=this.actors.get(speaker);for(const o of this.actors.values())o.el.classList.remove('speaking');
    if(a){
      a.el.classList.add('speaking');if(to)this.faceTo(speaker,to);
      // 듣는 사람들은 말하는 사람 쪽으로 몸을 돌린다.
      for(const [n,o] of this.actors)if(n!==speaker&&o.on&&!o.el.classList.contains('walking'))this.faceTo(n,speaker);
      if(!to){const near=[...this.actors.entries()].filter(([n,o])=>n!==speaker&&o.on).sort((p,q)=>Math.abs(p[1].cell[0]-a.cell[0])+Math.abs(p[1].cell[1]-a.cell[1])-Math.abs(q[1].cell[0]-a.cell[0])-Math.abs(q[1].cell[1]-a.cell[1]))[0];if(near)this.faceTo(speaker,near[0]);}
      this.gesture(speaker,/[!！]{1}$|이놈|닥쳐|물러서/.test(line)?ANGER_FRAME(a.look):TALK_FRAME(a.look),1000);
    }
    this.talk.innerHTML=talkBox(speaker,'',a&&this.scene.toPct(a.cell)[1]>58?'top':'bottom',a?.look,this.skin);
    await this.typeLine(this.talk.querySelector<HTMLElement>('.ss-talk-body p')!,line,a);
    await this.waitClick();if(a)a.el.classList.remove('speaking');this.talk.innerHTML='';
  }
  /** 한 글자씩 써 내려간다. 도중에 누르면 문장을 한꺼번에 보인다. 말하는 동안 몸짓을 한두 번 더 한다. */
  private typeLine(el:HTMLElement,line:string,a?:Actor){
    if(this.skipping){el.textContent=line;return Promise.resolve();}
    return new Promise<void>(done=>{
      const chars=[...line];let i=0;
      const finish=()=>{clearInterval(t);el.textContent=line;this.advance=undefined;done();};
      this.advance=finish;
      const t=setInterval(()=>{if(!document.contains(el)){finish();return;}i++;el.textContent=chars.slice(0,i).join('');
        if(a&&i%22===0)this.gesture([...this.actors].find(([,o])=>o===a)![0],i%44===0?TALK_FRAME(a.look):IDLE_FRAMES(a.look).at(-1)!,420);
        if(i>=chars.length)finish();},28);
    });
  }
  async narrate(text:string){this.caption.hidden=false;this.caption.textContent=text;this.talk.innerHTML='';await this.waitClick();this.caption.hidden=true;}
  /** 화면 위 자리(%)에 세운다. 앞(아래)에 선 사람이 위에 그려진다. */
  private moveTo(a:Actor,x:number,y:number){a.el.style.left=x+'%';a.el.style.top=y+'%';a.el.style.zIndex=String(100+Math.round(y*3));this.queueDeclutter();}
  /** 이름표가 겹치면 뒤(위쪽)에 선 사람의 이름표를 머리 위로 올린다. */
  private declutterQueued=false;
  private queueDeclutter(){if(this.declutterQueued)return;this.declutterQueued=true;requestAnimationFrame(()=>{this.declutterQueued=false;this.declutter();});}
  private declutter(){
    const on=[...this.actors.values()].filter(a=>a.on);for(const a of on)a.el.classList.remove('name-up');
    const box=on.map(a=>({a,r:a.el.querySelector('.ss-name')?.getBoundingClientRect(),z:Number(a.el.style.zIndex)||0}));
    for(let i=0;i<box.length;i++)for(let j=i+1;j<box.length;j++){const p=box[i]!,q=box[j]!;if(!p.r||!q.r)continue;
      if(p.r.left<q.r.right+2&&q.r.left<p.r.right+2&&p.r.top<q.r.bottom+2&&q.r.top<p.r.bottom+2)(p.z<q.z?p:q).a.el.classList.add('name-up');}
  }
  /**
   * 카메라: 이 칸들이 모두 들어오도록 다가가거나 물러난다(배경과 인물이 함께 커진다).
   * 너무 가까이는 가지 않고(방 하나가 화면을 채울 만큼), 사람들은 대화창에 가리지 않게 화면 위쪽 가운데에 둔다.
   */
  frame(cells:readonly Cell[],animate=true){
    if(!cells.length)return;
    const pts=[...cells.map(c=>this.scene.toPct(c)),...(this.scene.focus??[]).map(([x,y]):At=>[x,y+20])];
    let x0=Math.min(...pts.map(p=>p[0]))-9,x1=Math.max(...pts.map(p=>p[0]))+9,y0=Math.min(...pts.map(p=>p[1]))-24,y1=Math.max(...pts.map(p=>p[1]))+8;
    const grow=(lo:number,hi:number,min:number):[number,number]=>hi-lo>=min?[lo,hi]:[(lo+hi)/2-min/2,(lo+hi)/2+min/2];
    [x0,x1]=grow(x0,x1,60);[y0,y1]=grow(y0,y1,58);
    // 좁은 화면(휴대폰)에서는 무대가 작아 인물이 콩알만 해지므로 더 당겨서 본다
    const narrow=(this.el.clientWidth||window.innerWidth)<600,cap=this.scene.maxZoom??9,zMax=Math.min(narrow?2:1.65,cap),zMin=Math.min(narrow?1.15:1,zMax);
    const z=Math.max(zMin,Math.min(zMax,100/(x1-x0),100/(y1-y0))),cx=(x0+x1)/2,cy=(y0+y1)/2;
    const clamp=(v:number)=>Math.max(100-100*z,Math.min(0,v));
    const tx=clamp(50-z*cx),ty=clamp(46-z*cy);
    if(Math.abs(z-this.cam.z)<0.03&&Math.abs(tx-this.cam.tx)<2&&Math.abs(ty-this.cam.ty)<2&&animate)return;
    this.cam={z,tx,ty};
    this.world.style.transition=animate&&!this.skipping?'transform 1.2s cubic-bezier(.45,.05,.3,1)':'none';
    this.world.style.transform=`translate(${tx.toFixed(2)}%,${ty.toFixed(2)}%) scale(${z.toFixed(3)})`;
  }
  /** 이 칸들 가운데 화면 밖(가장자리 가까이)인 것이 있으면, 무대 위 사람들과 함께 다시 담는다. */
  private keepInView(cells:readonly Cell[]){
    const {z,tx,ty}=this.cam,vx0=-tx/z,vx1=(100-tx)/z,vy0=-ty/z,vy1=(100-ty)/z;
    const out=cells.some(c=>{const [x,y]=this.scene.toPct(c);return x<vx0+6||x>vx1-6||y<vy0+18||y>vy1-6;});
    if(out)this.frame([...[...this.actors.values()].filter(a=>a.on).map(a=>a.cell),...cells]);
  }
  /** 두 칸 사이를 곧게 걸어갈 수 있는가(소품·다른 사람에 걸리지 않고). */
  private clearLine(a:Cell,b:Cell,name:string){
    const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*5);
    for(let k=1;k<n;k++){const t=k/n,u=a[0]+0.5+(b[0]-a[0])*t,v=a[1]+0.5+(b[1]-a[1])*t;
      for(const [du,dv] of [[0.2,-0.2],[-0.2,0.2]] as const){const c:Cell=[Math.floor(u+du),Math.floor(v+dv)];if(!this.scene.passable(c)||this.taken(c,name))return false;}}
    return true;
  }
  /** 칸 길(격자를 따라 꺾이는 길)을 곧은 몇 토막으로 편다. */
  private straighten(from:Cell,path:readonly Cell[],name:string):Cell[]{
    const out:Cell[]=[];let cur=from,i=0;
    while(i<path.length){let j=path.length-1;for(;j>i;j--)if(this.clearLine(cur,path[j]!,name))break;out.push(path[j]!);cur=path[j]!;i=j+1;}
    return out;
  }
  /**
   * 걷기: 꺾이는 곳마다 방향을 틀며 일정한 빠르기로 미끄러지듯 걷는다(칸마다 서지 않는다).
   * 출발과 도착에서만 살짝 느려지고, 발 그림은 걸은 거리에 맞춰 번갈아 바뀐다(발이 미끄러지지 않게).
   */
  private glide(a:Actor,way:readonly Cell[],sideways=false):Promise<void>{
    if(!way.length)return Promise.resolve();
    const end=way.at(-1)!;
    if(this.skipping){a.cell=end;this.place(a,false);return Promise.resolve();}
    // 화면 단위(가로·세로 같은 길이): x%×2, y%
    const pts=[this.scene.toPct(a.cell),...way.map(c=>this.scene.toPct(c))].map(([x,y])=>[x*2,y] as [number,number]);
    const seg:number[]=[];let D=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i]![0]-pts[i-1]![0],pts[i]![1]-pts[i-1]![1]);seg.push(d);D+=d;}
    if(D<0.01){a.cell=end;this.place(a,false);return Promise.resolve();}
    const speed=Math.max(17,D/4.2),T=D/speed*1000,q=Math.min(0.22,260/T),stride=2.9;
    // 사다리꼴 빠르기: 처음 q만큼 빨라지고 끝 q만큼 느려진다
    const prog=(p:number)=>p<q?p*p/(2*q*(1-q)):p>1-q?1-(1-p)**2/(2*q*(1-q)):(p-q/2)/(1-q);
    a.el.classList.add('walking');a.el.style.setProperty('--step',Math.round(stride/speed*2000)+'ms');
    let lastPose:PxPose|undefined,lastSeg=-1;const t0=performance.now();
    return new Promise<void>(done=>{
      const tick=(now:number)=>{
        const p=Math.min(1,(now-t0)/T);
        if(this.skipping||!document.contains(this.el))return finish();
        let s=prog(p)*D,i=0;while(i<seg.length-1&&s>seg[i]!){s-=seg[i]!;i++;}
        const A=pts[i]!,B=pts[i+1]!,f=seg[i]?Math.min(1,s/seg[i]!):1,x=A[0]+(B[0]-A[0])*f,y=A[1]+(B[1]-A[1])*f;
        this.moveTo(a,x/2,y);
        if(i!==lastSeg){lastSeg=i;const dx=B[0]-A[0],dy=B[1]-A[1];if(Math.abs(dx)>0.3)a.face=dx>0?'right':'left';a.el.classList.toggle('face-left',a.face==='left');
          a.dir=sideways||Math.abs(dy)<Math.abs(dx)*0.18?'side':dy>0?'front':'back';lastPose=undefined;}
        const pose:PxPose=Math.floor(prog(p)*D/stride)%2?'walkB':'walkA';if(pose!==lastPose){lastPose=pose;this.paint(a,pose);}
        if(p>=1)return finish();requestAnimationFrame(tick);
      };
      const finish=()=>{a.cell=end;this.place(a,false);a.el.classList.remove('walking','step-b');if(sideways)a.dir='front';this.paint(a,'stand');done();};
      requestAnimationFrame(tick);
    });
  }
  async walk(name:string,to:At,mode:'move'|'enter'|'exit'='move',from?:'left'|'right'){
    const a=this.actors.get(name);if(!a)return;
    if(mode==='exit'){
      const side=from??(this.scene.toPct(a.cell)[0]<50?'left':'right');
      await this.glide(a,[offscreenCell(a.cell,side)],true);a.el.classList.add('off');a.on=false;return;
    }
    const target=this.free(this.scene.toCell(to),name);
    if(mode==='enter'){
      const side=from??(to[0]<50?'left':'right');a.cell=offscreenCell(target,side);a.face=side==='left'?'right':'left';
      this.place(a,false);a.el.classList.remove('off');a.on=true;await wait(30);
      await this.glide(a,[target],true);return;
    }
    await this.glide(a,this.straighten(a.cell,stepsBetween(this.scene,a.cell,target,c=>this.taken(c,name)),name));
  }
  /** 다른 사람 곁(앞·옆 빈 칸)으로 걸어가 마주 본다. */
  async approach(name:string,other:string){
    const a=this.actors.get(name),b=this.actors.get(other);if(!a||!b)return;
    // 나란히 서서 마주 보는 자리(화면 가로 옆)가 먼저, 그다음 앞뒤 칸.
    const near=([[1,-1],[-1,1],[1,0],[0,1],[-1,0],[0,-1]] as const).map(([dc,dr]):Cell=>[b.cell[0]+dc,b.cell[1]+dr]).filter(c=>this.scene.standable(c)&&(!this.taken(c,name)||same(c,a.cell)));
    near.sort((p,q)=>(Math.abs(p[0]-a.cell[0])+Math.abs(p[1]-a.cell[1])+(Math.abs(p[0]-b.cell[0])+Math.abs(p[1]-b.cell[1])===2?0:3))-(Math.abs(q[0]-a.cell[0])+Math.abs(q[1]-a.cell[1])+(Math.abs(q[0]-b.cell[0])+Math.abs(q[1]-b.cell[1])===2?0:3)));
    const spot=near[0];if(spot&&!same(spot,a.cell))await this.glide(a,this.straighten(a.cell,stepsBetween(this.scene,a.cell,spot,c=>this.taken(c,name)),name));
    this.faceTo(name,other);this.faceTo(other,name);
  }
  /** 제자리 근처의 빈 칸으로 몇 걸음. */
  async wander(name:string,home:Cell,radius=2){
    const a=this.actors.get(name);if(!a||a.el.classList.contains('walking'))return;
    const options:Cell[]=[];for(let dc=-radius;dc<=radius;dc++)for(let dr=-radius;dr<=radius;dr++){const c:Cell=[home[0]+dc,home[1]+dr];if(Math.abs(dc)+Math.abs(dr)<=radius&&this.scene.standable(c)&&!this.taken(c,name))options.push(c);}
    const pick=options[Math.floor(Math.random()*options.length)];if(!pick||same(pick,a.cell))return;
    await this.glide(a,this.straighten(a.cell,stepsBetween(this.scene,a.cell,pick,c=>this.taken(c,name)),name));
  }
  /** 대본의 단계들을 차례로. 이어진 걷기·등장·퇴장은 함께 움직인다. */
  async run(steps:ScriptStep[],hooks:StageHooks){
    for(let i=0;i<steps.length;i++){
      const st=steps[i]!,flags=hooks.flags();
      if((st.when&&!flags.includes(st.when))||(st.unless&&flags.includes(st.unless)))continue;
      if('move' in st||'enter' in st||'exit' in st){
        const group:ScriptStep[]=[st];
        while(i+1<steps.length){const n=steps[i+1]!;if(!('move' in n||'enter' in n||'exit' in n))break;i++;if((n.when&&!flags.includes(n.when))||(n.unless&&flags.includes(n.unless)))continue;group.push(n);}
        this.keepInView(group.flatMap(g=>'enter' in g?[this.scene.toCell(g.at)]:'move' in g?[this.scene.toCell((g as {to:At}).to)]:[]));
        await Promise.all(group.map(g=>'enter' in g?this.walk(g.enter,g.at,'enter',g.from):'exit' in g?this.walk(g.exit,[0,0],'exit',g.to):this.walk((g as {move:string}).move,(g as {to:At}).to)));continue;
      }
      if('emote' in st){
        this.bubble(st.emote,st.text,'emote');
        const r=REACTION.find(([re])=>re.test(st.text));if(r)this.react(st.emote,r[1]);
        if(r?.[1]==='shake'){const a=this.actors.get(st.emote);if(a)this.gesture(st.emote,ANGER_FRAME(a.look),900);}
        if(!this.skipping)await wait(650);continue;
      }
      if('narrate' in st){await this.narrate(st.narrate);continue;}
      if('say' in st){await this.say(st.say,st.line,st.to);continue;}
      if('choice' in st){
        this.skipping=false;this.el.classList.add('choosing');
        const hero=this.actors.get(st.choice);if(hero){hero.el.classList.add('speaking');bubble(hero.el,'?','emote');}
        const q=this.lastLine,ask=q?.line??'…어떻게 할 것인가.';
        this.talk.innerHTML=`<div class="ss-ink">${inkChoice(st.choice,ask,st.options.map(o=>({text:o.text,...(o.note?{note:o.note}:{})})),q?{asker:q.speaker}:{})}</div>`;
        const picked=await new Promise<ChoiceOption>(r=>{this.talk.querySelectorAll<HTMLButtonElement>('.ink-option').forEach(b=>b.onclick=e=>{e.stopPropagation();r(st.options[Number(b.dataset.k)]!);});});
        this.choices.innerHTML='';this.talk.innerHTML='';this.el.classList.remove('choosing');hero?.el.classList.remove('speaking');
        hooks.onChoice?.(picked,st);
        if(picked.reply)await this.say(st.choice,picked.reply);
        if(picked.answer){this.bubble(picked.answer.speaker,'!','emote');this.react(picked.answer.speaker,'jolt');await this.say(picked.answer.speaker,picked.answer.line);}
        for(const e of picked.effects??[])if((e.kind==='duel'||e.kind==='debate')&&hooks.onContest){
          const r=await hooks.onContest(e),who=e.by??st.choice;
          if(this.actors.has(e.foe))this.react(e.foe,r==='win'?'shake':'jolt');
          await this.narrate(`${e.kind==='duel'?'일기토':'설전'} — ${r==='win'?`${who}이(가) ${e.foe}을(를) 꺾었다. 군의 사기가 오른다.`:r==='lose'?`${e.foe}에게 밀렸다. 분한 마음을 삼킨다.`:'승부가 나지 않았다.'}`);}
      }
    }
  }
}
/**
 * 장을 여는 해설 — 고전 조조전의 장 사이 화면처럼, 첫 장면의 배경을 어둡게 깔고 해와 장 이름, 역사·시나리오 배경을
 * 한 줄씩 써 내려간다. 누르면 다음 줄(쓰는 중이면 한꺼번에), 건너뛰기로 끝.
 */
export async function playNarration(root:HTMLElement,o:{heading:string;year:string;title:string;lines:readonly string[];art:number;place:string}){
  const scene=isoScene(o.art,o.place);
  root.innerHTML=`<div class="ss-root"><div class="ss-head"><span class="eyebrow">${esc(o.heading)} · 해설</span></div>
    <div class="ss-narr" style="background-image:url(${scene.url})"><div class="ss-narr-veil"></div><div class="ss-narr-box"><div class="ss-narr-year">${esc(o.year)}</div><h3 class="ss-narr-title">${esc(o.title)}</h3><div class="ss-narr-lines"></div><span class="ss-narr-next" aria-hidden="true">▼</span></div></div>
    <div class="ss-controls"><button type="button" class="ss-skip">해설 건너뛰기 ⏭</button><button type="button" class="primary ss-next">다음 ▶</button></div></div>`;
  const box=root.querySelector<HTMLElement>('.ss-narr-lines')!;let advance:(()=>void)|undefined,skip=false;
  const next=()=>advance?.();
  root.querySelector<HTMLElement>('.ss-narr')!.addEventListener('click',next);root.querySelector<HTMLButtonElement>('.ss-next')!.onclick=next;
  root.querySelector<HTMLButtonElement>('.ss-skip')!.onclick=()=>{skip=true;next();};
  const waitClick=()=>skip?Promise.resolve():new Promise<void>(r=>{advance=()=>{advance=undefined;r();};});
  for(const line of o.lines){
    const p=document.createElement('p');box.appendChild(p);const chars=[...line];
    if(skip){p.textContent=line;continue;}
    await new Promise<void>(done=>{let i=0;const fin=()=>{clearInterval(t);p.textContent=line;advance=undefined;done();};advance=fin;
      const t=setInterval(()=>{if(!document.contains(p)){fin();return;}i++;p.textContent=chars.slice(0,i).join('');if(i>=chars.length)fin();},34);});
    await waitClick();
  }
}

/**
 * 장면들을 차례로 연출한다. root 안을 통째로 그린다. 끝나면(또는 건너뛰면) resolve.
 * 선택이 있는 장면은 건너뛰기를 눌러도 선택에서 멈춘다.
 */
export async function playScenes(root:HTMLElement,scenes:Scene[],hooks:StageHooks&{heading:string}){
  let skipping=false;
  for(let si=0;si<scenes.length;si++){
    const scene=scenes[si]!;
    root.innerHTML=`<div class="ss-root"><div class="ss-head"><span class="eyebrow">${esc(hooks.heading)} · 장면 ${si+1}/${scenes.length}</span></div><div class="ss-frame"></div>
      <div class="ss-controls"><button type="button" class="ss-skip">장면 건너뛰기 ⏭</button><button type="button" class="primary ss-next">다음 ▶</button></div></div>`;
    const spots=scene.steps.flatMap(st=>'move' in st?[st.to]:'enter' in st?[st.at]:[]);
    const stage=new Stage(root.querySelector<HTMLElement>('.ss-frame')!,scene.art,scene.place,scene.cast,spots);stage.skipping=skipping;
    root.querySelector<HTMLButtonElement>('.ss-skip')!.onclick=()=>{skipping=true;stage.skipping=true;stage.next();};
    root.querySelector<HTMLButtonElement>('.ss-next')!.onclick=()=>stage.next();
    await stage.run(scene.steps,hooks);skipping=stage.skipping;
    if(!skipping)await wait(250);
  }
}
function bubble(el:HTMLElement,text:string,kind:'emote'|'talk'){
  const b=el.querySelector<HTMLElement>('.ss-bubble')!;b.textContent=text;b.className='ss-bubble '+kind;b.hidden=false;
  clearTimeout(Number(b.dataset.t??0));b.dataset.t=String(setTimeout(()=>{b.hidden=true;},kind==='emote'?1300:2600));
}
