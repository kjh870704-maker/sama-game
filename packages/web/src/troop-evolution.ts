/**
 * 병종 진화표 — 병종이 어떻게 강해지는가를 한눈에.
 * 계통마다 1단(기본) → 2단(정예) → 3단(최정예) → 4단(전설) 카드.
 * 그림은 도감과 같은 완성 병종 원화다.
 */
import type {UnitClass} from '../../core/src/index.ts';
import {VARIANTS,tierOf,familyOf,profileOf,classTactics} from '../../core/src/index.ts';
import {classNames,evolutionLines} from './troops.ts';
import {classSprite,paintArmor} from './codex-ui.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type EvoGroup='all'|'foot'|'spear'|'horse'|'ranged'|'mind'|'siege';
export const EVO_GROUPS:Array<[EvoGroup,string,string[]]>=[
  ['all','전체',[]],['foot','보병',['infantry','bandit','monk']],['spear','창병',['spearman']],['horse','기병',['cavalry','heavyCav','horseArcher']],
  ['ranged','궁·노',['archer','crossbow']],['mind','책사·술사',['strategist','fengshui','shaman','maiden','taoist']],['siege','공성·수군',['engineer','catapult','ram','navy']],
];
const TIER_NAME=['','기본','정예','최정예','전설','신화'];
const KEY:Array<[keyof ReturnType<typeof profileOf>,string]>=[['hp','체력'],['attack','공격'],['defense','방어'],['intellect','지력'],['spirit','정신'],['agility','순발']];

function card(c:UnitClass,lv:number,prev?:UnitClass){
  const p=profileOf(c),q=prev?profileOf(prev):undefined,v=VARIANTS[c],t=tierOf(c);
  const stat=KEY.map(([k,label])=>{const n=p[k] as number,d=q?n-(q[k] as number):0;return `<span><small>${label}</small><b>${n.toFixed(2)}</b>${d>0.004?`<em>▲${d.toFixed(2)}</em>`:''}</span>`;}).join('');
  const more=[q&&p.movement>q.movement?`이동 ${q.movement}→${p.movement}`:'',q&&(p.range[1]>q.range[1]||p.range[0]<q.range[0])?`사거리 ${q.range[0]}~${q.range[1]}→${p.range[0]}~${p.range[1]}`:'',!q?`이동 ${p.movement} · 사거리 ${p.range[0]}~${p.range[1]}`:''].filter(Boolean).join(' · ');
  const skill=v?.bloom?`<p class="evo-skill"><b>개화 「${esc(v.bloom.name)}」</b> ${esc(v.bloom.description)}</p>`:classTactics(c).slice(0,1).map(x=>`<p class="evo-skill"><b>전법 「${esc(x.name)}」</b> ${esc(x.description)}</p>`).join('');
  return `<article class="evo-card t${t}"><div class="evo-top">${classSprite(c)}<div><small>${'◆'.repeat(t)} ${TIER_NAME[t]}${lv?` · Lv.${lv}에 진화`:' · 처음부터'}</small><h4>${esc(classNames[c]??c)}</h4></div></div>
    <div class="evo-stats">${stat}</div>${more?`<p class="evo-more">${more}</p>`:''}${skill}</article>`;
}
export function evolutionChart(group:EvoGroup='all'){
  const fams=EVO_GROUPS.find(g=>g[0]===group)![2];
  const lines=evolutionLines().filter(l=>!fams.length||fams.includes(familyOf(l[0]![0])));
  return `<div class="evo-tabs">${EVO_GROUPS.map(([id,name])=>`<button data-evo-group="${id}" class="${id===group?'active':''}">${name}</button>`).join('')}<span class="muted">${lines.length}계통 · 모두 4단 진화</span></div>
  <div class="evo-lines">${lines.map(l=>`<section class="evo-line"><h3>${esc(classNames[l[0]![0]]??l[0]![0])} 계통 <small>${esc(classNames[familyOf(l[0]![0])]??'')} 계열 · ${l.map(([,lv],i)=>i?`Lv.${lv}`:'Lv.1').join(' → ')}</small></h3>
    <div class="evo-row">${l.map(([c,lv],i)=>`${i?'<i class="evo-arrow2">▶</i>':''}${card(c,lv,i?l[i-1]![0]:undefined)}`).join('')}</div></section>`).join('')}</div>`;
}
export {paintArmor};
