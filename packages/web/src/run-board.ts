/**
 * 본영의 로그라이크 진행판 — 『천명의 길』이 로그라이크라는 것이 첫 화면에서 바로 보이게.
 * 회차 · 지나온 장과 행군로(지도 띠) · 다음 행군로 세 갈래 · 회차 보물 · 부상 장수 · 쌓인 천명.
 */
import {scenarioPath,currentStep,pendingMarch,marchNodes,type ScenarioState,type ScenarioStep,type MarchKind} from './scenario.ts';
import {stepTitle} from './scenario-ui.ts';
import {RELICS} from './roguelike.ts';
import type {MetaState} from './meta.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const STEP_GLYPH:Record<ScenarioStep['kind'],string>={story:'연',tale:'가',boss:'왕',fate:'갈',ending:'결'};
const MARCH_GLYPH:Record<MarchKind,string>={battle:'전',elite:'정',recruit:'모',rest:'의',treasure:'보',training:'수'};
/** 행군로가 끼는 자리: 싸우는 장(연의·가상·우두머리) 바로 다음, 다음 장이 결말이 아닐 때. */
const marchAfter=(a:ScenarioStep,b:ScenarioStep|undefined)=>!!b&&a.kind!=='fate'&&b.kind!=='ending';

export function runBoard(state:ScenarioState,meta:MetaState){
  const run=state.run;
  if(!run)return `<section class="rogue-board fresh"><header><b>로그라이크 · 천명의 길</b><span class="rogue-status">아직 회차 없음</span></header>
    <p class="rogue-oneline">회차마다 189년부터 다시 · 장 사이 행군로 세 갈래 · 체력·보물이 이어진다 · 끝나면 천명</p></section>`;
  const path=scenarioPath(state),done=new Set(state.done),cur=currentStep(state),at=cur?path.findIndex(x=>x.id===cur.id):path.length;
  const from=Math.max(0,at-3),to=Math.min(path.length,at+5),cells:string[]=[];
  for(let i=from;i<to;i++){
    const s=path[i]!,st=done.has(s.id)?'done':s.id===cur?.id?'now':'next';
    cells.push(`<li class="rogue-node ${st} kind-${s.kind}" title="${esc(stepTitle(s,state))}"><i>${STEP_GLYPH[s.kind]}</i><small>${esc(stepTitle(s,state))}</small></li>`);
    if(marchAfter(s,path[i+1])&&i<to-1){const went=run.marched.includes(s.id);cells.push(`<li class="rogue-march ${went?'done':done.has(s.id)?'now':'next'}" title="행군로"><i>◆</i></li>`);}
  }
  const waiting=pendingMarch(state),choices=waiting?marchNodes(state,waiting):[];
  const hurt=Object.entries(run.hp).filter(([,v])=>v<1).map(([k,v])=>`${esc(k)} ${Math.round(v*100)}%`);
  const relics=run.relics.map(id=>RELICS.find(r=>r.id===id)).filter(r=>!!r).map(r=>`<span class="run-relic" title="${esc(r!.effect)}">${esc(r!.name)}</span>`).join('');
  const status=run.status==='alive'?'진행 중':run.status==='complete'?'완주':'회차 종료';
  return `<section class="rogue-board"><header><b>로그라이크 · 천명의 길 제${run.no}회차</b><span class="rogue-status ${run.status}">${status}</span><span class="muted">행군 ${run.nodes}갈래 · 마친 장 ${state.done.length}</span></header>
    <ol class="rogue-path" aria-label="지나온 길과 앞길">${from>0?'<li class="rogue-more">…</li>':''}${cells.join('')}${to<path.length?'<li class="rogue-more">…</li>':''}</ol>
    ${choices.length?`<div class="rogue-next"><b>다음 행군로 — 하나를 고른다</b>${choices.map(c=>`<span class="rogue-choice m-${c.kind}" title="${esc(c.detail)}"><i>${MARCH_GLYPH[c.kind]}</i>${esc(c.label)}</span>`).join('')}</div>`:cur?`<div class="rogue-next"><b>다음 장</b><span class="rogue-choice"><i>${STEP_GLYPH[cur.kind]}</i>${esc(stepTitle(cur,state))}</span></div>`:''}
    <div class="rogue-res"><span><small>회차 보물</small>${relics||'<em class="muted">아직 없음 — 보물고·정예에서</em>'}</span>
    <span><small>천명의 가호</small>${run.guard?'<b class="ok">남음</b> 한 번 패배해도 회차가 이어진다':'<em class="muted">없음</em>'}</span>
    <span><small>부상</small>${hurt.length?hurt.join(' · '):'<em class="muted">모두 온전</em>'}</span>
    <span><small>천명</small><b>${meta.mandate}</b>${run.bonus?` · 이번 회차 +${run.bonus} 쌓임`:''}</span></div></section>`;
}
