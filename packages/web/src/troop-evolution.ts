/**
 * 병종 진화표 — 병종이 어떻게 강해지는가를 한눈에.
 * 계통마다 1단(기본) → 2단(정예) → 3단(최정예) → 4단(전설) 카드.
 * 그림은 도감과 같은 완성 병종 원화다.
 */
import type {UnitClass} from '../../core/src/index.ts';
import {VARIANTS,tierOf,familyOf,profileOf,classTactics,reachOffsets,reachLabel} from '../../core/src/index.ts';
import {classNames,evolutionLines} from './troops.ts';
import {classSprite,paintArmor} from './codex-ui.ts';
import {classTraitSummary} from './perks.ts';
import {officerManifest,officerEntry,type OfficerEntry} from './officer-models.ts';
import {NPC_ROSTER} from './npc-roster.ts';
import {singleStageCorrectionRows} from './complete-troops.ts';
import {LORD_NAMES} from './lords.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type EvoGroup='all'|'foot'|'spear'|'horse'|'ranged'|'mind'|'siege'|'single';
export const EVO_GROUPS:Array<[EvoGroup,string,string[]]>=[
  ['all','전체',[]],['foot','보병',['infantry','bandit','monk']],['spear','창병',['spearman']],['horse','기병',['cavalry','heavyCav','horseArcher']],
  ['ranged','궁·노',['archer','crossbow']],['mind','책사·술사',['strategist','fengshui','shaman','maiden','taoist']],['siege','공성·수군',['engineer','catapult','ram','navy']],['single','단일·NPC',[]],
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
  const tactic=v?.bloom?{name:v.bloom.name,description:classTraitSummary(v.traits)||v.bloom.description}:classTactics(c)[0];
  return `<article class="evo-card t${t}"><div class="evo-top">${classSprite(c)}<div><small>${'◆'.repeat(t)} ${TIER_NAME[t]}${lv?` · Lv.${lv}`:''}</small><h4>${esc(classNames[c]??c)}</h4></div></div>
    <div class="evo-range">${reachMini(c)}<p><b class="${grew?'up':''}">${esc(reachLabel(c))}${grew?' ▲':''}</b><span>사거리 ${p.range[0]===p.range[1]?p.range[0]:p.range[0]+'~'+p.range[1]} · 이동 ${p.movement}</span></p></div>
    ${tactic?`<p class="evo-skill" title="${esc(tactic.description)}"><b>${v?.bloom?'개화':'전법'} 「${esc(tactic.name)}」</b>${v?.bloom&&tactic.description?`<span>${esc(tactic.description)}</span>`:''}</p>`:''}</article>`;
}
/** 이 병종들로 싸우는 이름 있는 장수(전용 전투 그림이 있는 장수). */
function officersOf(classes:Set<string>){
  return officerManifest.flatMap(e=>{
    // 군주(조조·유비·손권 등)는 그림이 어느 병종이든 군주 계통에 선다.
    if(LORD_NAMES.includes(e.name)){const b=Object.values(e.battle)[0];return classes.has('lord')&&b?[{e,cls:'lord',b}]:[];}
    return Object.entries(e.battle).filter(([k])=>classes.has(k)&&k!=='cart').map(([k,b])=>({e,cls:k,b}));
  });
}
const officerArt=(name:string,b:OfficerEntry['battle'][string])=>{const [w,h]=b.cell;return `<span class="evo-person-art" role="img" aria-label="${esc(name)}" style="aspect-ratio:${w}/${h};background-image:url('${b.sheet}');background-size:400% ${b.rows*100}%;background-position:0 0"></span>`;};
function officerChip({e,cls,b}:{e:OfficerEntry;cls:string;b:OfficerEntry['battle'][string]}){
  return `<figure class="evo-person officer" title="${esc(e.name)} · ${esc(classNames[cls as UnitClass]??cls)}">${officerArt(e.name,b)}<figcaption>${esc(e.name)}</figcaption></figure>`;
}
/** NPC로 나오는 장수는 전용 전투 그림을, 이름 없는 NPC는 그 병종 그림을 보여 준다. */
function npcChip(n:typeof NPC_ROSTER[number]){
  const e=officerEntry({id:'npc',name:n.name}),own=e?.battle[n.unitClass]??(e&&LORD_NAMES.includes(e.name)?Object.values(e.battle)[0]:undefined);
  return `<figure class="evo-person npc ${n.side}" title="${esc(n.name)} · ${n.side==='allyAi'?'NPC(아군 AI)':'우군'} · ${n.stages.join(', ')}">${own?officerArt(n.name,own):classSprite(n.unitClass)}<figcaption>${esc(n.name)}<small>${n.side==='allyAi'?'NPC':'우군'} · ${esc(n.stages.join(' '))}</small></figcaption></figure>`;
}
/** 계통 아래에 붙는 "장수 · NPC" 줄. 둘 다 없으면 비운다. */
function peopleRow(classes:Set<string>){
  const officers=officersOf(classes),npcs=NPC_ROSTER.filter(n=>classes.has(n.unitClass));
  if(!officers.length&&!npcs.length)return '';
  return `<div class="evo-people">${officers.length?`<div class="evo-people-group"><b>장수</b><div>${officers.map(officerChip).join('')}</div></div>`:''}${npcs.length?`<div class="evo-people-group npc"><b>NPC·우군</b><div>${npcs.map(npcChip).join('')}</div></div>`:''}</div>`;
}
/** 진화하지 않는 단일 병종(민중·물자대·공병·수군 등). NPC가 주로 쓴다. */
function singleLines(){
  return (Object.values(singleStageCorrectionRows).flat() as UnitClass[]).filter((c,i,a)=>a.indexOf(c)===i);
}
export function evolutionChart(group:EvoGroup='all'){
  const fams=EVO_GROUPS.find(g=>g[0]===group)![2];
  const lines=group==='single'?[]:evolutionLines().filter(l=>!fams.length||fams.includes(familyOf(l[0]![0])));
  const singles=group==='all'||group==='single'?singleLines():[];
  return `<div class="evo-tabs">${EVO_GROUPS.map(([id,name])=>`<button data-evo-group="${id}" class="${id===group?'active':''}">${name}</button>`).join('')}<span class="muted">${lines.length?lines.length+'계통':''}${lines.length&&singles.length?' · ':''}${singles.length?'단일 병종 '+singles.length:''}</span></div>
  <div class="evo-lines">${lines.map(l=>`<section class="evo-line"><h3>${esc(classNames[l[0]![0]]??l[0]![0])} 계통 <small>${esc(classNames[familyOf(l[0]![0])]??'')} 계열</small></h3>
    <div class="evo-row">${l.map(([c,lv],i)=>`${i?'<i class="evo-arrow2">▶</i>':''}${card(c,lv,i?l[i-1]![0]:undefined)}`).join('')}</div>${peopleRow(new Set(l.map(([c])=>c)))}</section>`).join('')}
    ${singles.length?`<section class="evo-line evo-single"><h3>단일 병종 <small>진화하지 않는 병종 · NPC가 주로 쓴다</small></h3>
    <div class="evo-row single">${singles.map(c=>`<div class="evo-single-col">${card(c,0)}${peopleRow(new Set([c]))}</div>`).join('')}</div></section>`:''}</div>`;
}
export {paintArmor};
