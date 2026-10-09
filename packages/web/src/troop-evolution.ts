/**
 * 병종 진화표 — 병종이 어떻게 강해지는가를 한눈에.
 * 계통마다 1단(기본) → 2단(정예) → 3단(최정예) → 4단(전설) 카드.
 * 그림은 도감과 같은 완성 병종 원화다.
 */
import type {UnitClass} from '../../core/src/index.ts';
import {VARIANTS,tierOf,familyOf,profileOf,classTactics,reachOffsets,reachLabel,troopEffectOf,troopEffectText,OFFICER_EFFECTS,FAMED_OFFICERS,topAbility,finalClassOf,unitReachLabel} from '../../core/src/index.ts';
import {romanceByName} from './romance.ts';
import {classNames,evolutionLines,troopSheets} from './troops.ts';
import {classSprite,paintArmor} from './codex-ui.ts';
import {classTraitSummary} from './perks.ts';
import {officerManifest,officerEntry,type OfficerEntry} from './officer-models.ts';
import {NPC_ROSTER} from './npc-roster.ts';
import {singleStageCorrectionRows} from './complete-troops.ts';
import {LORD_NAMES} from './lords.ts';
import {OFFICER_FACTION,OFFICER_FACTIONS} from './officer-factions.ts';
import {paintedTroopArt} from './painted-troops.ts';
import {spriteAtlas,type AtlasFit} from './sprite-atlas.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type EvoGroup='all'|'foot'|'spear'|'horse'|'ranged'|'mind'|'siege'|'single'|'officer'|'npc';
export const EVO_GROUPS:Array<[EvoGroup,string,string[]]>=[
  ['all','전체',[]],['foot','보병',['infantry','bandit','monk']],['spear','창병',['spearman']],['horse','기병',['cavalry','heavyCav','horseArcher']],
  ['ranged','궁·노',['archer','crossbow']],['mind','책사·술사',['strategist','fengshui','shaman','maiden','taoist']],['siege','공성·수군',['engineer','catapult','ram','navy']],['single','단일',[]],['officer','장수',[]],['npc','NPC',[]],
];
const TIER_NAME=['','기본','정예','최정예','전설','신화'];
/** 평타가 닿는 칸을 작은 격자로(가운데 = 자기). 진화할수록 넓어지는 모양이 한눈에 보인다. */
function reachMini(c:UnitClass,famed=false){
  const p=profileOf(c),cells=new Set(reachOffsets({unitClass:c,range:famed?famedRange(c):p.range,...(famed?{famedReach:true}:{})}).map(o=>o.x+','+o.y)),r=Math.max(2,...[...cells].map(k=>Math.max(...k.split(',').map(n=>Math.abs(+n)))));
  let g='';for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)g+=`<i class="${x===0&&y===0?'me':cells.has(x+','+y)?'on':''}"></i>`;
  return `<div class="evo-reach" style="--n:${2*r+1}" role="img" aria-label="공격 범위 ${esc(famed?unitReachLabel({unitClass:c,range:famedRange(c),famedReach:true}):reachLabel(c))}">${g}</div>`;
}
/** 이름난 장수의 사거리: 그 계통 마지막 진화 병종을 넘지 않는다. */
const famedRange=(c:UnitClass):readonly [number,number]=>{const p=profileOf(c).range,top=profileOf(finalClassOf(c)).range;return [p[0],Math.max(p[1],top[1])];};
function card(c:UnitClass,lv:number,prev?:UnitClass){
  const p=profileOf(c),q=prev?profileOf(prev):undefined,v=VARIANTS[c],t=tierOf(c);
  const grew=!!prev&&(reachLabel(prev)!==reachLabel(c)||p.range[1]>q!.range[1]);
  const tactic=v?.bloom?{name:v.bloom.name,description:classTraitSummary(v.traits)||v.bloom.description}:classTactics(c)[0];
  return `<article class="evo-card t${t}"><div class="evo-top">${classArt(c)}<div><small>${'◆'.repeat(t)} ${TIER_NAME[t]}${lv?` · Lv.${lv}`:''}</small><h4>${esc(classNames[c]??c)}</h4></div></div>
    <div class="evo-range">${reachMini(c)}<p><b class="${grew?'up':''}">${esc(reachLabel(c))}${grew?' ▲':''}</b><span>사거리 ${p.range[0]===p.range[1]?p.range[0]:p.range[0]+'~'+p.range[1]} · 이동 ${p.movement}</span></p></div>
    ${tactic?`<p class="evo-skill" title="${esc(tactic.description)}"><b>${v?.bloom?'개화':'전법'} 「${esc(tactic.name)}」</b>${v?.bloom&&tactic.description?`<span>${esc(tactic.description)}</span>`:''}</p>`:''}${troopNote(c)}</article>`;
}
/** 부대효과: 이 단계의 수치와 1~4단계 수치 줄(지금 단계 강조). */
function troopNote(c:UnitClass){
  const fx=troopEffectOf(c);if(!fx)return '';
  const steps=fx.effect.values.map((v,i)=>i+1===fx.tier?`<b>${v}</b>`:String(v)).join(' / ');
  return `<p class="evo-skill evo-troop" title="${esc(troopEffectText(fx.effect))}"><b>부대효과 「${esc(fx.effect.name)}」</b><span>${esc(troopEffectText(fx.effect,fx.tier))}</span>${fx.effect.values.length>1?`<span class="evo-steps">단계별 ${steps}</span>`:''}</p>`;
}
/** 그림 칸마다 여백이 달라 병종끼리 크기가 들쭉날쭉하다(민중은 작고 기병·배는 크다).
 * 진화표에서는 대기 자세의 실제 그림 둘레를 재서 같은 상자에 꽉 차게 다시 그린다(fitEvoSprites). 그 전에는 원래 그림을 보인다. */
const fitCanvas=(sheet:string,row:number)=>`<canvas class="evo-fit" data-fit="${esc(sheet)}" data-row="${row}"></canvas>`;
function classArt(c:UnitClass){
  const p=paintedTroopArt[c];if(!p)return classSprite(c);
  return `<div class="cx-sprite" role="img" aria-label="${esc(classNames[c]??c)}" style="background-image:var(--${p.sheet}-atlas);background-size:400% ${p.rows*100}%;background-position:0 ${p.rows>1?p.row/(p.rows-1)*100:0}%">${fitCanvas(p.sheet,p.row)}</div>`;
}
// 시트 칸을 그대로 잘라 보이면 칸을 넘는 창끝이 잘리고 이웃 행의 조각이 끼어든다: 전장과 같은 분리 아틀라스(실루엣을 제 칸에 모은 것)에서 대기 자세를 그린다.
const officerArt=(name:string,b:OfficerEntry["battle"][string])=>`<div class="cx-sprite" role="img" aria-label="${esc(name)}"><canvas class="evo-fit" data-fit="${esc(b.sheet)}" data-row="0" data-rows="${b.rows}" data-uniform="1"></canvas></div>`;
const rangeLine=(c:UnitClass,famed=false)=>{const p=profileOf(c),rg=famed?famedRange(c):p.range;return `<div class="evo-range">${reachMini(c,famed)}<p><b>${esc(classNames[c]??c)} · ${esc(famed?unitReachLabel({unitClass:c,range:rg,famedReach:true}):reachLabel(c))}</b><span>사거리 ${rg[0]===rg[1]?rg[0]:rg[0]+'~'+rg[1]} · 이동 ${p.movement}</span></p></div>`;};
const personCard=(art:string,small:string,name:string,c:UnitClass,extra='',famed=false)=>`<article class="evo-card evo-person-card"><div class="evo-top">${art}<div><small>${small}</small><h4>${esc(name)}</h4></div></div>${rangeLine(c,famed)}${extra}</article>`;
/** 장수의 병종: 군주 9명과 서초패왕 항우는 군주, 나머지는 전용 전투 그림의 첫 병종(제갈량 수레 제외). */
const officerClass=(e:OfficerEntry):UnitClass=>(LORD_NAMES.includes(e.name)?'lord':Object.keys(e.battle).find(k=>k!=='cart')) as UnitClass;
const officerSheet=(e:OfficerEntry,c:string)=>e.battle[c]??e.battle.lord??Object.entries(e.battle).find(([k])=>k!=='cart')?.[1];
/** 장수 특성(가장 높은 연의 능력)·이름난 장수 표시. 수치는 병종 단계를 따라 오른다. */
function officerNote(name:string,c:UnitClass){
  const r=romanceByName(name)??romanceByName(name.replace(/^소년 /,''));if(!r)return '';
  const e=OFFICER_EFFECTS[topAbility(r,profileOf(c).canUseStrategy?'int':'war')];
  return `<p class="evo-skill evo-troop" title="${esc(troopEffectText(e))}"><b>장수 특성 「${esc(e.name)}」</b><span>${esc(troopEffectText(e))} (병종 1~4단계)</span></p>${FAMED_OFFICERS.includes(name)?'<p class="evo-skill evo-troop"><b>이름난 장수</b><span>공격 범위가 이 병종 계통의 마지막 진화와 같다(근접은 팔방). 그보다 넓어지지 않는다.</span></p>':''}`;
}
function officerCards(){
  return OFFICER_FACTIONS.map(f=>{
    const list=officerManifest.filter(e=>(OFFICER_FACTION[e.id]??'군웅')===f);if(!list.length)return '';
    return `<section class="evo-line"><h3>${f} <small>${list.length}명</small></h3><div class="evo-grid">${list.map(e=>{const c=officerClass(e),b=officerSheet(e,c);return personCard(b?officerArt(e.name,b):classArt(c),'장수',e.name,c,officerNote(e.name,c),FAMED_OFFICERS.includes(e.name));}).join('')}</div></section>`;
  }).join('');
}
/** 본편 전장의 NPC(아군 AI). 한 사람은 카드 한 장·병종 하나다.
 * "곽회 창병"·"조휴 궁수"·"조상 친위"처럼 장수 이름을 단 부대는 따로 세우지 않고 그 장수 카드에 휘하로 적는다. */
const escortOf=(n:typeof NPC_ROSTER[number],all:typeof NPC_ROSTER)=>all.find(o=>o!==n&&n.name.startsWith(o.name+' '));
export const npcList=()=>{const ai=NPC_ROSTER.filter(n=>n.side==='allyAi');return ai.filter(n=>!escortOf(n,ai));};
function npcCards(){
  const ai=NPC_ROSTER.filter(n=>n.side==='allyAi');
  return `<div class="evo-grid">${npcList().map(n=>{const e=officerEntry({id:'npc',name:n.name}),b=e&&officerSheet(e,LORD_NAMES.includes(e.name)?'lord':n.unitClass);
    const escorts=ai.filter(o=>escortOf(o,ai)===n).map(o=>classNames[o.unitClass]??o.unitClass);
    return personCard(b?officerArt(n.name,b):classArt(n.unitClass),`NPC · ${esc(n.stages.join(' '))}`,n.name,n.unitClass,escorts.length?`<p class="evo-escort">휘하 ${esc(escorts.join('·'))} 부대</p>`:'');}).join('')}</div>`;
}
/** 진화하지 않는 단일 병종(민중·물자대·공병·수군 등). */
function singleLines(){
  return (Object.values(singleStageCorrectionRows).flat() as UnitClass[]).filter((c,i,a)=>a.indexOf(c)===i);
}
export function evolutionChart(group:EvoGroup='all'){
  const tabs=(note:string)=>`<div class="evo-tabs">${EVO_GROUPS.map(([id,name])=>`<button data-evo-group="${id}" class="${id===group?'active':''}">${name}</button>`).join('')}<span class="muted">${note}</span></div>`;
  if(group==='officer')return `${tabs('장수 '+officerManifest.length)}<div class="evo-lines">${officerCards()}</div>`;
  if(group==='npc')return `${tabs('NPC '+npcList().length)}<div class="evo-lines">${npcCards()}</div>`;
  const fams=EVO_GROUPS.find(g=>g[0]===group)![2];
  const lines=group==='single'?[]:evolutionLines().filter(l=>!fams.length||fams.includes(familyOf(l[0]![0])));
  const singles=group==='all'||group==='single'?singleLines():[];
  return `${tabs(`${lines.length?lines.length+'계통':''}${lines.length&&singles.length?' · ':''}${singles.length?'단일 병종 '+singles.length:''}`)}
  <div class="evo-lines">${lines.map(l=>`<section class="evo-line"><h3>${esc(classNames[l[0]![0]]??l[0]![0])} 계통 <small>${esc(classNames[familyOf(l[0]![0])]??'')} 계열</small></h3>
    <div class="evo-row">${l.map(([c,lv],i)=>`${i?'<i class="evo-arrow2">▶</i>':''}${card(c,lv,i?l[i-1]![0]:undefined)}`).join('')}</div></section>`).join('')}
    ${singles.length?`<section class="evo-line evo-single"><h3>단일 병종 <small>진화하지 않는 병종</small></h3>
    <div class="evo-grid">${singles.map(c=>card(c,0)).join('')}</div></section>`:''}</div>`;
}
type SheetDef={id:string;url:string;rows:number;union?:boolean;alphaCutoff?:number;strictGrid?:boolean;fit?:AtlasFit};
const boxes=new Map<string,Promise<{atlas:HTMLCanvasElement;x:number;y:number;w:number;h:number;ch:number}|undefined>>();
/** 시트 한 줄의 대기 자세(첫 칸)에서 실제 그림이 차지하는 둘레. */
function idleBox(sheet:string,row:number){
  const key=sheet+'#'+row;if(boxes.has(key))return boxes.get(key)!;
  const def=(troopSheets as readonly SheetDef[]).find(s=>s.id===sheet);
  const p=!def?Promise.resolve(undefined):spriteAtlas(def.url,def.rows,4,!!def.union,def.alphaCutoff??8,!!def.strictGrid,def.fit).then(atlas=>{
    const cw=Math.floor(atlas.width/4),ch=Math.floor(atlas.height/def.rows),top=row*ch,d=atlas.getContext('2d',{willReadFrequently:true})!.getImageData(0,top,cw,ch).data;
    let l=cw,t=ch,r=-1,b=-1;
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(d[(y*cw+x)*4+3]!>24){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}
    return r<0?undefined:{atlas,x:l,y:top+t,w:r-l+1,h:b-t+1,ch};
  }).catch(()=>undefined);
  boxes.set(key,p);return p;
}
/** 진화표의 모든 병종·장수·NPC 그림을 같은 상자 크기로 맞춘다: 그림 둘레가 가로형 상자(5:4) 폭 96%·높이 90% 안에 꽉 차고 발은 같은 선에 선다. */
export async function fitEvoSprites(root:ParentNode=document){
  await Promise.all([...root.querySelectorAll<HTMLCanvasElement>('canvas.evo-fit:not(.on)')].map(async el=>{
    const box=await idleBox(el.dataset.fit!,Number(el.dataset.row??0));if(!box||!el.isConnected)return;
    const W=320,H=256,g=el.getContext('2d')!;
    // 병종·장수·NPC 모두 한 축척: 아틀라스가 이미 모든 병사·장수의 서 있는 키를 칸 높이에 맞춰 두었으므로 칸 높이 기준으로 그린다
    // (그림마다 둘레에 맞추면 기병·긴 창은 작아지고 책사·민중은 커진다). 그래도 넓어 상자를 넘는 그림만 그만큼 줄인다.
    const k=Math.min(H*1.35/box.ch,W*.96/box.w,H*.94/box.h),w=box.w*k,h=box.h*k;
    el.width=W;el.height=H;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(box.atlas,box.x,box.y,box.w,box.h,(W-w)/2,H*.96-h,w,h);el.classList.add('on');
  }));
}
export {paintArmor};
