/**
 * 연구 화면 — 전투·내정·편성·고사 네 갈래의 나무. 칸은 그림(아이콘)으로, 단계는 점으로 보인다.
 * 칸을 누르면 아래에 단계별 효과표·비용·선행·조건(진행 막대)이 뜨고 천명으로 한 단계 올린다.
 * 오른쪽에는 지금 걸려 있는 연구 효과 합계와, 천명을 얻는 법(이번 회차 예상 천명 포함)을 보여 준다.
 */
import {loadMeta,saveMeta,type MetaState} from './meta.ts';
import {RESEARCH,RESEARCH_TABS,nodeById,nodeState,rankOf,buyResearch,gateOpen,researchProgress,mandateBonus,rankGate,rankBand,type ResearchTab,type ResearchNode,type Gate} from './research.ts';
import {researchIcon,TAB_ICONS} from './research-icons.ts';
import {loadScenario,runMandate} from './scenario.ts';
import {PERK_TEXT} from './perks.ts';

export interface ResearchHost {modal(html:string,closable?:boolean):void;toast(text:string):void;back():void;codex?():void}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const CELL_W=112,CELL_H=104;
const pips=(r:number,max:number)=>max>5?`<span class="rs-pips bar"><i style="width:${r/max*100}%"></i><b>${r}/${max}</b></span>`:`<span class="rs-pips">${Array.from({length:max},(_,i)=>`<i class="${i<r?'on':''}"></i>`).join('')}</span>`;

/** 조건 하나하나를 진행 막대로. */
function gateRows(m:MetaState,g:Gate){
  const best=Math.max(0,...Object.values(m.officerBest??{}));
  const rows:Array<[string,number,number]>=[];
  if(g.runs)rows.push(['천명의 길 회차',m.runs,g.runs]);if(g.chronicle)rows.push(['이긴 연의 전장',m.chronicle.length,g.chronicle]);
  if(g.endings)rows.push(['본 결말',m.endings.length,g.endings]);if(g.wins)rows.push(['끝까지 완주',m.wins,g.wins]);if(g.officerLv)rows.push(['장수 최고 레벨',best,g.officerLv]);
  return rows.map(([k,v,need])=>`<div class="rs-gate ${v>=need?'ok':''}"><span>${k}</span><i><i style="width:${Math.min(100,v/need*100)}%"></i></i><b>${Math.min(v,need)}/${need}</b></div>`).join('');
}
const gateLabel=(g:Gate)=>[g.runs?`천명의 길 ${g.runs}회차`:'',g.chronicle?`연의 전장 ${g.chronicle}승`:'',g.endings?`결말 ${g.endings}개`:'',g.wins?`완주 ${g.wins}번`:'',g.officerLv?`장수 Lv.${g.officerLv}`:''].filter(Boolean).join(' · ');
/** 걸려 있는 연구 효과를 특성별로 합친다. */
function activeEffects(m:MetaState){
  const sum=new Map<string,number>(),other:string[]=[];
  for(const n of RESEARCH){const r=rankOf(m,n.id);if(!r)continue;
    if(n.perk&&!n.perk.families){const k=n.perk.trait+(n.perk.hero?'@hero':'');sum.set(k,(sum.get(k)??0)+n.perk.per*r);}else other.push(n.effect(r));}
  const lines=[...sum].map(([k,v])=>{const [trait,hero]=k.split('@');const t=PERK_TEXT[trait!],n=Math.round(v*10)/10;return (hero?'사마의 · ':'')+(t?t.text(n):`${trait} ${n}`);});
  return [...lines,...other];
}
/** 천명 얻는 법 + 이번 회차 예상. */
function mandateGuide(m:MetaState){
  let now='';try{const s=loadScenario();if(s.run&&s.run.status==='alive'){const base=runMandate(s),bonus=mandateBonus(m);now=`<div class="rs-now"><b>이번 회차에서 지금까지 모은 천명</b><strong>${base+bonus}</strong><small>회차가 끝나면(결말·패배·포기) 한꺼번에 받는다${bonus?` · 연구 보너스 +${bonus} 포함`:''}</small></div>`;}}catch{/* 저장이 없으면 생략 */}
  const row=(icon:string,title:string,gain:string,note='')=>`<li><span class="rs-gi">${researchIcon(icon)}</span><div><b>${title}</b>${note?`<small>${note}</small>`:''}</div><em>${gain}</em></li>`;
  return `<section class="rs-guide"><h4>천명 얻는 법</h4>${now}<ul>
    ${row('stratagem','연의 전장·고사 전장 승리','+2','이야기 전장을 이길 때마다')}
    ${row('unrivaled','대전(보스 전장) 승리','+3','장의 마지막 큰 싸움')}
    ${row('vanguard','갈림길을 지날 때마다','+1','다음 장으로 행군한 칸 하나')}
    ${row('unify','결말에 닿음','+10','회차를 끝까지 걸으면')}
    ${row('granary','연구 보너스','+'+mandateBonus(m),'군량·공물·소하의 장부 연구로 회차마다 더')}
  </ul><p>천명은 <b>천명의 길 회차가 끝날 때</b>(결말·패배·포기) 정산해 받는다. 져도 그때까지 모은 만큼은 남는다.</p>
  <div class="rs-stat"><span>지금까지 얻은 천명 <b>${m.earned}</b></span><span>회차 <b>${m.runs}</b></span><span>본 결말 <b>${m.endings.length}</b></span><span>이긴 연의 전장 <b>${m.chronicle.length}</b></span></div></section>`;
}

export function showResearch(host:ResearchHost,tab:ResearchTab='battle',pick?:string){
  const meta=loadMeta(),nodes=RESEARCH.filter(n=>n.tab===tab),t=RESEARCH_TABS.find(x=>x.id===tab)!,prog=researchProgress(meta,tab),all=researchProgress(meta);
  const sel=nodes.find(n=>n.id===pick)??nodes.find(n=>nodeState(meta,n)==='open')??nodes[0]!;
  const cols=Math.max(...nodes.map(n=>n.col))+1,rows=Math.max(...nodes.map(n=>n.row))+1,W=cols*CELL_W,H=rows*CELL_H;
  const at=(n:{col:number;row:number})=>({x:n.col*CELL_W+CELL_W/2,y:n.row*CELL_H+CELL_H/2});
  const arrows=nodes.flatMap(n=>(n.requires??[]).map(([id])=>{const from=nodeById(id);if(!from||from.tab!==tab)return '';const a=at(from),b=at(n),lit=rankOf(meta,id)>0;
    const pts=a.y===b.y?`${a.x+34},${a.y} ${b.x-38},${b.y}`:a.x===b.x?`${a.x},${a.y+(b.y>a.y?34:-34)} ${b.x},${b.y+(b.y>a.y?-38:38)}`:`${a.x+34},${a.y} ${b.x-46},${a.y} ${b.x-46},${b.y} ${b.x-38},${b.y}`;
    return `<polyline points="${pts}" class="${lit?'lit':''}" marker-end="url(#rs-arrow)"/>`;})).join('');
  const tiles=nodes.map(n=>{const st=nodeState(meta,n),r=rankOf(meta,n.id),p=at(n),afford=st==='open'&&meta.mandate>=n.cost(r);
    return `<button data-rs="${n.id}" class="rs-node ${st} ${afford?'afford':''} ${n.id===sel.id?'chosen':''}" style="left:${p.x-32}px;top:${p.y-36}px" aria-label="${esc(n.name)} ${r}/${n.max}" title="${esc(n.name)} — ${esc(n.effect(Math.max(1,r)))}">
      <span class="rs-icon">${researchIcon(n.id)}</span>${st==='locked'?'<span class="rs-lock">🔒</span>':''}${afford?'<span class="rs-up">▲</span>':''}${pips(r,n.max)}<em>${esc(n.name)}</em></button>`;}).join('');
  const st=nodeState(meta,sel),r=rankOf(meta,sel.id),cost=r<sel.max?sel.cost(r):0;
  const reqs=(sel.requires??[]).map(([id,k])=>{const x=nodeById(id)!;const ok=rankOf(meta,id)>=k;return `<button data-rs-jump="${x.id}" data-rs-tabof="${x.tab}" class="rs-reqchip ${ok?'ok':'no'}"><span>${researchIcon(x.id)}</span>${esc(x.name)} ${k}단계 ${ok?'✓':''}</button>`;}).join('');
  const unlocks=RESEARCH.filter(n=>(n.requires??[]).some(([id])=>id===sel.id));
  const levels=Array.from({length:sel.max},(_,i)=>{const band=rankBand(sel,i+1),g=rankGate(sel,i),newBand=band&&band!==rankBand(sel,i);return `${newBand&&i>0&&g?`<li class="rs-band">${band} 구간 — 조건: ${esc(gateLabel(g))}</li>`:''}<li class="${i<r?'done':i===r?'next':''} ${band?'b-'+(band==='극의'?3:band==='숙련'?2:1):''}"><span>${i+1}단계</span>${esc(sel.effect(i+1))}${i===r?` <em>천명 ${sel.cost(i)}</em>`:''}</li>`;}).join('');
  const rg=r<sel.max?rankGate(sel,r):undefined;
  const detail=`<div class="rs-detail"><div class="rs-detail-head"><span class="rs-icon big ${st}">${researchIcon(sel.id)}</span><div class="rs-dtitle"><h3>${esc(sel.name)}</h3>${pips(r,sel.max)}
      <p>${r?`지금 <b>${esc(sel.effect(r))}</b>`:'아직 배우지 않았다.'}</p></div>
      ${r<sel.max?`<button id="rs-buy" class="primary" ${st==='open'&&meta.mandate>=cost?'':'disabled'}>${st==='locked'?(rg&&!gateOpen(meta,rg)?'강화 조건':'잠김'):meta.mandate>=cost?(rankBand(sel,r+1)&&rankBand(sel,r+1)!==rankBand(sel,r)?'강화한다':'연구한다'):'천명 부족'}<small>천명 ${cost}</small></button>`:'<span class="rs-max">완성</span>'}</div>
    <div class="rs-dgrid"><ol class="rs-levels">${levels}</ol><div>
      ${reqs?`<div class="rs-sub">먼저 배울 것</div><div class="rs-reqs">${reqs}</div>`:''}
      ${sel.gate?`<div class="rs-sub">열리는 조건 ${gateOpen(meta,sel.gate)?'<b class="ok">충족</b>':''}</div>${gateRows(meta,sel.gate)}`:''}
      ${rg?`<div class="rs-sub">${rankBand(sel,r+1)} 구간 강화 조건 ${gateOpen(meta,rg)?'<b class="ok">충족</b>':''}</div>${gateRows(meta,rg)}`:''}
      ${unlocks.length?`<div class="rs-sub">배우면 열리는 칸</div><div class="rs-reqs">${unlocks.map(x=>`<button data-rs-jump="${x.id}" data-rs-tabof="${x.tab}" class="rs-reqchip"><span>${researchIcon(x.id)}</span>${esc(x.name)}</button>`).join('')}</div>`:''}
    </div></div></div>`;
  const effects=activeEffects(meta);
  host.modal(`<div class="briefing research-screen"><div class="eyebrow">연구 · 회차를 넘어 남는 힘</div><h2>연구</h2>
    <div class="rs-tabs">${RESEARCH_TABS.map(x=>{const pg=researchProgress(meta,x.id);return `<button data-rs-tab="${x.id}" class="rs-tab-${x.id} ${x.id===tab?'active':''}"><span class="rs-tabicon">${TAB_ICONS[x.id]}</span>${x.name}<small>${pg.done}/${pg.total}</small></button>`;}).join('')}
      <span class="rs-mandate"><span class="rs-tabicon">${researchIcon('unify')}</span>천명 <b>${meta.mandate}</b></span></div>
    <div class="rs-body${cols>5?' wide':''}"><aside class="rs-banner rs-tab-${tab}"><div class="rs-bhead"><div class="rs-emblem">${TAB_ICONS[tab]}</div><div><h3>${t.name}</h3><div class="rs-ring" style="--p:${prog.total?prog.done/prog.total*100:0}"><b>${prog.done}</b><small>/${prog.total}</small></div></div></div><p>${esc(t.blurb)}</p><small>전체 연구 ${all.done}/${all.total}</small>
      <section class="rs-effects"><h4>지금 걸린 효과</h4>${effects.length?`<ul>${effects.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:'<p>아직 연구한 것이 없다.</p>'}</section></aside>
    <div class="rs-tree-wrap"><div class="rs-tree" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" aria-hidden="true"><defs><marker id="rs-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>${arrows}</svg>${tiles}</div>
      <div class="rs-legend"><span><i class="lg done"></i>완성</span><span><i class="lg open"></i>배울 수 있음</span><span><i class="lg afford"></i>천명 충분 ▲</span><span><i class="lg locked"></i>잠김</span></div></div>
    ${detail}</div>
    ${mandateGuide(meta)}
    <div class="run-actions">${host.codex?'<button id="rs-codex">인물열전 ▸</button>':''}<button id="rs-back">← 본영</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-rs-tab]').forEach(b=>b.onclick=()=>showResearch(host,b.dataset.rsTab as ResearchTab));
  document.querySelectorAll<HTMLButtonElement>('[data-rs]').forEach(b=>b.onclick=()=>showResearch(host,tab,b.dataset.rs));
  document.querySelectorAll<HTMLButtonElement>('[data-rs-jump]').forEach(b=>b.onclick=()=>showResearch(host,b.dataset.rsTabof as ResearchTab,b.dataset.rsJump));
  document.getElementById('rs-buy')?.addEventListener('click',()=>{const m=loadMeta();if(buyResearch(m,sel.id)){saveMeta(m);host.toast(`「${sel.name}」 ${rankOf(m,sel.id)}단계 연구를 마쳤다.`);}showResearch(host,tab,sel.id);});
  document.getElementById('rs-codex')?.addEventListener('click',()=>host.codex!());
  document.getElementById('rs-back')!.onclick=host.back;
}
export type {ResearchNode};
