/**
 * 전투 하단 정보창 — 조조전 온라인 화면처럼, 맵 아래 양쪽에 먹 붓 바탕의 장수 카드를 띄운다.
 * 왼쪽은 고른(또는 치는) 쪽, 오른쪽은 상대. 카드에는 초상·이름(자)·병종·레벨, 지형(平 100%),
 * 체력·책략 막대가 있다. 공격을 겨눌 때는 깎일 체력을 막대 위에 미리 보이고,
 * 실제로 싸우면 막대가 앞의 체력에서 뒤의 체력으로 줄어든다.
 */
import type {BattleState,TerrainKind,Unit} from '../../core/src/index.ts';
import {cardFace,displayName} from './faces.ts';
import {factionOf} from './officer-art.ts';
import {romanceByName} from './romance.ts';
import {classNames} from './troops.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** 지형 한 글자(카드 머리띠에 크게). */
export const TERRAIN_GLYPH:Record<TerrainKind,string>={plain:'평지',road:'길',forest:'숲',mountain:'산',hill:'언덕',water:'물',rapids:'급류',bridge:'다리',fort:'성채',gate:'성문',wall:'성벽',cliff:'벼랑',marsh:'늪',plank:'잔도',ford:'여울'};
const isOfficer=(u:Unit)=>factionOf(u.name)!==undefined||!!romanceByName(u.name);

export interface CardOpts {
  /** 막대가 처음 보일 체력(싸움 직전). 없으면 지금 체력. */
  hpFrom?:number;
  /** 겨눈 공격으로 깎일 체력(미리보기). */
  preview?:number;
  /** 미리보기 칸에 붙일 말(명중 %·격파). */
  note?:string;
}
function bar(kind:'hp'|'mp',now:number,max:number,from?:number,preview=0){
  const pct=(v:number)=>Math.max(0,Math.min(100,v/Math.max(1,max)*100)).toFixed(1);
  const start=from??now,cut=Math.min(preview,now);
  return `<div class="hud-bar ${kind}"><i class="hud-icon">${kind==='hp'?'♥':'책'}</i><div class="hud-track"><span class="hud-fill" style="width:${pct(start)}%" data-to="${pct(now)}"></span>${cut>0?`<span class="hud-cut" style="left:${pct(now-cut)}%;width:${pct(cut)}%"></span>`:''}</div><b class="hud-num" data-to="${now}">${start}/${max}</b></div>`;
}
/** 카드 한 장(HTML). side: 'left'면 초상이 왼쪽, 'right'면 오른쪽. */
export function hudCard(u:Unit,state:BattleState,side:'left'|'right',o:CardOpts={}){
  const t=state.map.tileAt(u.pos).terrain,aff=Math.round(state.map.terrainAffinity(u.unitClass,u.pos)*100);
  const team=u.side==='enemy'?'enemy':u.side==='allyAi'?'npc':'ally';
  const name=isOfficer(u)?displayName(u.name):classNames[u.name]??u.name;
  return `<div class="hud-card ${side} ${team}"><div class="hud-face">${cardFace(u.name)}</div><div class="hud-body">
    <div class="hud-band"><span class="hud-glyph">${TERRAIN_GLYPH[t]}</span><span class="hud-aff">${aff}%</span></div>
    <div class="hud-name"><b>${esc(name)}</b><small>${esc(classNames[u.unitClass]??u.unitClass)} · Lv.${u.level}</small></div>
    ${bar('hp',u.hp,u.stats.maxHp,o.hpFrom,o.preview)}${bar('mp',u.mp,u.stats.maxMp)}
    ${o.note?`<div class="hud-note">${esc(o.note)}</div>`:''}</div></div>`;
}
/** 정보창을 그린다(왼쪽·오른쪽 어느 쪽이든 빌 수 있다). 막대는 다음 틀에 목표치로 줄어든다. */
export function renderHud(el:HTMLElement,state:BattleState,left?:{u:Unit;o?:CardOpts},right?:{u:Unit;o?:CardOpts}){
  if(!left&&!right){el.classList.remove('show');return;}
  el.innerHTML=(left?hudCard(left.u,state,'left',left.o):'<div></div>')+(right?hudCard(right.u,state,'right',right.o):'<div></div>');
  el.classList.add('show');
  if(left?.o?.hpFrom!==undefined||right?.o?.hpFrom!==undefined)setTimeout(()=>{
    for(const f of el.querySelectorAll<HTMLElement>('.hud-fill'))f.style.width=f.dataset.to+'%';
    for(const n of el.querySelectorAll<HTMLElement>('.hud-num')){const to=Number(n.dataset.to),[from,max]=n.textContent!.split('/').map(Number);if(from===to)continue;
      const t0=performance.now(),tick=(now:number)=>{const k=Math.min(1,(now-t0)/700);n.textContent=`${Math.round(from!+(to-from!)*k)}/${max}`;if(k<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}
  },520);
}
