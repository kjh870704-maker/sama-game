/**
 * 병종 진화표 — 병종이 어떻게 강해지는가를 한눈에.
 * 계통마다 1단(기본) → 2단(정예) → 3단(최정예) → 4단(전설) 카드.
 * 그림은 도감과 같은 완성 병종 원화다.
 */
import type {UnitClass} from '../../core/src/index.ts';
import {VARIANTS,tierOf,familyOf,profileOf,classTactics,reachOffsets,reachLabel} from '../../core/src/index.ts';
import {classNames,evolutionLines} from './troops.ts';
import {classSprite,paintArmor} from './codex-ui.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type EvoGroup='all'|'foot'|'spear'|'horse'|'ranged'|'mind'|'siege';
export const EVO_GROUPS:Array<[EvoGroup,string,string[]]>=[
  ['all','전체',[]],['foot','보병',['infantry','bandit','monk']],['spear','창병',['spearman']],['horse','기병',['cavalry','heavyCav','horseArcher']],
  ['ranged','궁·노',['archer','crossbow']],['mind','책사·술사',['strategist','fengshui','shaman','maiden','taoist']],['siege','공성·수군',['engineer','catapult','ram','navy']],
];
const TIER_NAME=['','기본','정예','최정예','전설','신화'];
/** 평타가 닿는 칸을 작은 격자로(가운데 = 자기). 진화할수록 넓어지는 모양이 한눈에 보인다. */
function reachMini(c:UnitClass){
  const p=profileOf(c),cells=new Set(reachOffsets({unitClass:c,range:p.range}).map(o=>o.x+','+o.y)),r=Math.max(2,...[...cells].map(k=>Math.max(...k.split(',').map(n=>Math.abs(+n)))));
  let g='';for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)g+=`<i class="${x===0&&y===0?'me':cells.has(x+','+y)?'on':''}"></i>`;
  return `<div class="evo-reach" style="--n:${2*r+1}" role="img" aria-label="공격 범위 ${esc(reachLabel(c))}">${g}</div>`;
}
function card(c:UnitClass,lv:number,prev?:UnitClass){
  const p=profileOf(c),q=prev?profileOf(prev):undefined,v=VARIANTS[c],t=tierOf(c);
  const grew=!!prev&&(reachLabel(prev)!==reachLabel(c)||p.range[1]>q!.range[1]);
  const tactic=v?.bloom??classTactics(c)[0];
  return `<article class="evo-card t${t}"><div class="evo-top">${classSprite(c)}<div><small>${'◆'.repeat(t)} ${TIER_NAME[t]}${lv?` · Lv.${lv}`:''}</small><h4>${esc(classNames[c]??c)}</h4></div></div>
    <div class="evo-range">${reachMini(c)}<p><b class="${grew?'up':''}">${esc(reachLabel(c))}${grew?' ▲':''}</b><span>사거리 ${p.range[0]===p.range[1]?p.range[0]:p.range[0]+'~'+p.range[1]} · 이동 ${p.movement}</span></p></div>
    ${tactic?`<p class="evo-skill" title="${esc(tactic.description)}">${v?.bloom?'개화':'전법'} 「${esc(tactic.name)}」</p>`:''}</article>`;
}
export function evolutionChart(group:EvoGroup='all'){
  const fams=EVO_GROUPS.find(g=>g[0]===group)![2];
  const lines=evolutionLines().filter(l=>!fams.length||fams.includes(familyOf(l[0]![0])));
  return `<div class="evo-tabs">${EVO_GROUPS.map(([id,name])=>`<button data-evo-group="${id}" class="${id===group?'active':''}">${name}</button>`).join('')}<span class="muted">${lines.length}계통</span></div>
  <div class="evo-lines">${lines.map(l=>`<section class="evo-line"><h3>${esc(classNames[l[0]![0]]??l[0]![0])} 계통 <small>${esc(classNames[familyOf(l[0]![0])]??'')} 계열</small></h3>
    <div class="evo-row">${l.map(([c,lv],i)=>`${i?'<i class="evo-arrow2">▶</i>':''}${card(c,lv,i?l[i-1]![0]:undefined)}`).join('')}</div></section>`).join('')}</div>`;
}
export {paintArmor};
