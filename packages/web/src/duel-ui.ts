/**
 * 일기토·설전 화면 — 두 단계.
 *  1) 대결 선포: 왼쪽 붉은 깃발에 상대, 오른쪽 푸른 깃발에 우리 장수, 가운데 붓글씨 「對決」(설전은 「舌戰」)과
 *     엇갈린 칼(설전은 붓), 위에 「단기접전」 띠.
 *  2) 겨루기: 옆에서 본 채색 배경 위에 두 사람이 마주 서고, 왼쪽 위·오른쪽 아래에 먹 붓 대사창(흉상·이름·대사),
 *     아래에는 검붉은 옻칠 판에 합 순서(一~五)와 행동 칸(먹 그림 아이콘)이 놓인다.
 */
import type {DuelAction,DuelState} from './duel.ts';
import {duelActionNames,duelLine,newDuel,duelRound,type DuelKind} from './duel.ts';
import {storyBackdrop} from './story.ts';
import {bustFace,displayName} from './faces.ts';
import {officerPortrait} from './officer-art.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const NUM=['1합','2합','3합','4합','5합'];
/** 행동 아이콘(먹 붓으로 그린 듯한 선 그림). */
const ICON:Record<'duel'|'debate',Record<DuelAction,string>>={
  duel:{
    attack:'<path d="M10 54 L50 14 M44 12 L54 10 L52 20 M16 40 L24 48" />',
    guard:'<path d="M32 8 C44 14 52 14 54 16 C54 38 46 50 32 58 C18 50 10 38 10 16 C12 14 20 14 32 8 Z M32 18 V48" />',
    rally:'<path d="M32 56 C18 46 22 34 30 28 C28 38 36 38 36 30 C36 22 30 18 32 8 C46 18 50 34 44 46 C40 54 36 56 32 56 Z" />',
    special:'<path d="M8 40 C22 34 36 20 56 8 M14 50 C30 44 44 32 58 18 M10 28 C20 22 30 14 40 8" />',
  },
  debate:{
    attack:'<path d="M12 50 L44 18 M40 14 L50 12 L48 22 M12 50 L8 56 L14 54 Z M20 20 C28 12 40 10 48 14" />',
    guard:'<path d="M10 14 H54 V44 H34 L22 56 V44 H10 Z M20 26 H44 M20 34 H38" />',
    rally:'<path d="M32 10 A16 16 0 1 1 31.9 10 M32 18 V26 M32 32 L38 38 M14 54 H50" />',
    special:'<path d="M32 6 L38 24 L58 24 L42 36 L48 56 L32 44 L16 56 L22 36 L6 24 L26 24 Z" />',
  },
};
const icon=(kind:'duel'|'debate',a:DuelAction)=>`<svg viewBox="0 0 64 64" aria-hidden="true" class="duel-ico">${ICON[kind][a]}</svg>`;
const HELP:Record<'duel'|'debate',Record<DuelAction,string>>={
  duel:{attack:'무력 = 피해',guard:'피해 65% 감소 · 기합 +1',rally:'기합 +2 (피해 +10%씩)',special:'기합 2 · 무력 ×1.5'},
  debate:{attack:'지력 = 피해',guard:'피해 65% 감소 · 논거 +1',rally:'논거 +2 (피해 +10%씩)',special:'논거 2 · 지력 ×1.5'},
};
/** 대결 장소(옆에서 본 배경): 일기토는 들·산길·진영, 설전은 대청·서재·군막. */
export function duelBackdrop(kind:'duel'|'debate',seed:string,indoor=false){
  const pool=kind==='debate'||indoor?[5,12,14,9]:[3,11,15,6,16,17,4];let h=0;for(const ch of seed)h=(h*31+ch.charCodeAt(0))>>>0;
  return storyBackdrop(pool[h%pool.length]!);
}
const face=(name:string)=>bustFace(name)??`<div class="talk-bust sprite">${officerPortrait(name)}</div>`;
/** 겨루기 화면에 크게 세우는 장수 초상(그린 초상이 있으면 그 그림, 없으면 인물 그림). */
export function duelCard(name:string,side:'player'|'enemy'){return `<div class="duel-model duel-card ${side==='enemy'?'face-left':'face-right'}">${face(name)}<span class="duel-card-name">${esc(displayName(name))}</span></div>`;}

/** 1) 대결 선포 화면. */
export function duelSplash(d:DuelState,acceptLine?:string,historic=false){
  const title=d.kind==='duel'?'일기토':'설전',sub=d.kind==='duel'?'단기접전':'설전';
  const banner=(name:string,side:'red'|'blue',model:string)=>`<div class="vs-banner ${side}"><div class="vs-face">${face(name)}</div><b>${esc(displayName(name))}</b><div class="vs-model">${model}</div></div>`;
  return `<div class="duel-splash ${d.kind}" role="dialog" aria-label="${sub}">
    <div class="vs-title">${sub}</div>
    ${banner(d.enemy.name,'red','<span data-vs-model="enemy"></span>')}
    <div class="vs-emblem"><div class="vs-hex"></div><span class="vs-glyph">${title}</span><div class="vs-cross ${d.kind}"></div></div>
    ${banner(d.player.name,'blue','<span data-vs-model="player"></span>')}
    ${acceptLine?`<p class="vs-accept">${historic?'<b>연의의 대결</b> · ':''}${esc(d.enemy.name)}: “${esc(acceptLine)}”</p>`:''}
    <button type="button" class="vs-go primary">${d.kind==='duel'?'겨룬다':'논한다'} ▶</button>
  </div>`;
}
/** 먹 붓 대사창(위·아래). */
function inkLine(name:string,line:string,pos:'top'|'bottom'){
  return `<div class="duel-talk ${pos}"><div class="duel-talk-face">${face(name)}</div><div class="duel-talk-body"><b>${esc(displayName(name))}</b><p>${esc(line)}</p></div></div>`;
}
/**
 * 한 사람에게 들어온 한 합의 연출. incoming: 상대의 수, own: 내 수, dmg: 받은 피해, stat: 상대의 무력(지력).
 * 피해 숫자 아래에 「무력 87」처럼 피해가 어디서 왔는지 적는다.
 */
export function hitFx(kind:DuelKind,incoming:DuelAction,own:DuelAction,dmg:number,stat:number){
  const fx:string[]=[];
  if(own==='rally')fx.push(`<i class="fx fx-aura ${kind}"></i>`);
  if(dmg>0){
    const big=incoming==='special',guarded=own==='guard';
    if(kind==='duel')fx.push(`<i class="fx fx-slash${big?' big':''}"></i>`,big?'<i class="fx fx-slash cross big"></i>':'','<i class="fx fx-spark"></i>');
    else fx.push(`<i class="fx fx-ink${big?' big':''}"></i>`,'<i class="fx fx-ring"></i>',`<b class="fx-word${big?' big':''}">${big?'논파!':'논박!'}</b>`);
    if(big&&kind==='duel')fx.push('<b class="fx-word duel big">필살!</b>');
    if(guarded)fx.push(`<b class="fx-guard">${kind==='duel'?'막았다':'반론'}</b>`);
    fx.push(`<b class="damage-number${big?' crit':''}${guarded?' guarded':''}">−${dmg}<small>${kind==='duel'?'무력':'지력'} ${stat}${big?' ×1.5':''}${guarded?' · 방어':''}</small></b>`);
  }else if(own==='guard'&&(incoming==='attack'||incoming==='special'))fx.push(`<b class="fx-guard">${kind==='duel'?'막았다':'반론'}</b>`);
  return fx.filter(Boolean).join('');
}
/** 2) 겨루기 화면. models: 두 사람의 전장 그림(HTML). */
export function duelArena(d:DuelState,o:{models:{player:string;enemy:string};backdrop:string;openingLine?:string}){
  const labels=duelActionNames(d.kind),last=d.history.at(-1),energy=d.kind==='debate'?'논거':'기합';
  const pLine=last?duelLine(d.kind,last.action):d.kind==='duel'?'내가 상대해 주마!':'그 말, 내가 받아 주겠소.';
  const eLine=last?duelLine(d.kind,last.enemyAction):o.openingLine??'덤벼라!';
  /** 머리 위 작은 막대: 이름·체력(남은 만큼 초록→노랑→빨강)·기합(논거) 구슬. */
  const hp=(u:DuelState['player'],side:string)=>{const k=u.hp/Math.max(1,u.maxHp);return `<div class="duel-mini ${side}${k<=.3?' low':k<=.6?' mid':''}"><b>${esc(displayName(u.name))} <span>${d.kind==='duel'?'무력':'지력'} ${u.stat}</span></b><div class="duel-hp"><i style="width:${(k*100).toFixed(1)}%"></i></div><small>${u.hp}/${u.maxHp}</small><em title="${energy}">${'●'.repeat(u.energy)}${'○'.repeat(Math.max(0,3-u.energy))}</em></div>`;};
  const track=NUM.map((n,i)=>{const h=d.history[i];const cls=!h?'':h.dealt>h.taken?'won':h.dealt<h.taken?'lost':'even';
    return `<div class="duel-round ${cls}${i===d.round&&!d.result?' now':''}"><span class="duel-round-no">${n}</span><div class="duel-round-tile">${h?icon(d.kind,h.action):''}</div>${h?`<small>${h.dealt}:${h.taken}</small>`:''}</div>${i<4?'<i class="duel-arrow">➜</i>':''}`;}).join('');
  const actions=(Object.keys(labels) as DuelAction[]).map(a=>{const off=a==='special'&&d.player.energy<2;
    return `<button type="button" class="duel-act${off?' off':''}" data-duel-action="${a}" ${off||d.result?'disabled':''}>${icon(d.kind,a)}<b>${labels[a]}</b><small>${HELP[d.kind][a]}</small></button>`;}).join('');
  const result=d.result?`<div class="duel-result ${d.result}"><span>${d.result==='win'?'승리':d.result==='lose'?'패배':'무승부'}</span><p>${d.result==='win'?'승리':d.result==='lose'?'패배':'무승부'} · 전투 체력: 승자 15% · 패자 45% · 무승부 양쪽 25% 피해(최소 1). 패자는 2턴 ${d.kind==='duel'?'쇠약·둔화':'혼란·책략 봉인'}.</p><button id="duel-return" class="primary">전장으로 돌아가기</button></div>`:'';
  // 타격 연출: 맞은 쪽에 베기·불꽃(일기토) 또는 먹물·글자 충격파(설전), 막으면 방패 번쩍임, 필살기는 화면 번쩍임·크게 흔들림.
  const special=!!last&&((last.action==='special'&&last.dealt>0)||(last.enemyAction==='special'&&last.taken>0));
  const shake=!last?'':special?' shake-big':last.dealt||last.taken?' shake':'';
  return `<div class="duel-stage portraits ${d.kind}">
    <div class="duel-view${shake}" style="${o.backdrop}">${special?`<i class="duel-flash ${d.kind}"></i>`:''}
      <div class="duel-sun"></div>
      <div class="duel-ground">
        <div class="duel-fighter player motion-${last?.action??'idle'}${last?.taken?' hit':''}">${hp(d.player,'left')}${o.models.player}${last?hitFx(d.kind,last.enemyAction,last.action,last.taken,d.enemy.stat):''}</div>
        <div class="duel-fighter enemy motion-${last?.enemyAction??'idle'}${last?.dealt?' hit':''}">${hp(d.enemy,'right')}${o.models.enemy}${last?hitFx(d.kind,last.action,last.enemyAction,last.dealt,d.player.stat):''}</div>
      </div>
      ${inkLine(d.player.name,pLine,'top')}${inkLine(d.enemy.name,eLine,'bottom')}
      ${result}
    </div>
    <div class="duel-panel">
      <div class="duel-panel-head"><span>${d.kind==='duel'?'일기토':'설전'}</span><b>${Math.min(5,d.round+ (d.result?0:1))} / 5합</b></div>
      <div class="duel-track">${track}</div>
      <div class="duel-acts">${actions}</div>
      ${last?`<p class="duel-report" aria-live="polite">${last.round}합 · ${labels[last.action]} 대 ${labels[last.enemyAction]} · 준 피해 ${last.dealt} / 받은 피해 ${last.taken}</p>`:''}
    </div>
  </div>`;
}

/**
 * 전투 밖의 대결(이야기 선택지·출진 전 조우): 선포 화면 → 5합 겨루기를 덮개 하나에 띄우고 결과를 돌려준다.
 * stat은 일기토면 무력, 설전이면 지력(+레벨)을 넣는다.
 */
export function playContest(kind:DuelKind,me:{name:string;stat:number},foe:{name:string;stat:number},o:{acceptLine?:string;seed?:string;indoor?:boolean;done?:string}={}):Promise<'win'|'lose'|'draw'>{
  const d=newDuel(kind,{id:'me',...me},{id:'foe',...foe});
  const el=document.createElement('div');el.className='contest-overlay';
  // 열린 dialog(최상위 층) 안에 붙여야 그 위로 보인다.
  (document.querySelector('dialog[open]')??document.body).appendChild(el);
  const models={player:duelCard(me.name,'player'),enemy:duelCard(foe.name,'enemy')};
  return new Promise(resolve=>{
    const arena=()=>{el.innerHTML=`<div class="contest-box">${duelArena(d,{models,backdrop:duelBackdrop(kind,o.seed??foe.name,o.indoor),...(o.acceptLine?{openingLine:o.acceptLine}:{})}).replace('전장으로 돌아가기',esc(o.done??'이야기로 돌아가기')).replace(/전투 체력: 승자 15% · 패자 45% · 무승부 양쪽 25% 피해\(최소 1\)\. 패자는 2턴 [^<]*/,kind==='duel'?'이기면 이번 전투 아군 사기 상승 · 적의 기세가 꺾인다.':'이기면 이번 전투 아군 사기 상승 · 사마의 책략 MP +15.')}</div>`;
      el.querySelectorAll<HTMLButtonElement>('[data-duel-action]').forEach(b=>b.onclick=()=>{if(duelRound(d,b.dataset.duelAction as DuelAction))arena();});
      el.querySelector<HTMLButtonElement>('#duel-return')?.addEventListener('click',()=>{el.remove();resolve(d.result??'draw');});};
    el.innerHTML=`<div class="contest-box">${duelSplash(d,o.acceptLine)}</div>`;
    el.querySelectorAll<HTMLElement>('[data-vs-model]').forEach(x=>x.innerHTML=x.dataset.vsModel==='enemy'?models.enemy:models.player);
    let started=false;const go=()=>{if(started)return;started=true;arena();};
    el.querySelector('.vs-go')?.addEventListener('click',go);setTimeout(go,2600);
  });
}
