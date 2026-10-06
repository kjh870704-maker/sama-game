/**
 * 삼국지 인물열전 — 장수·병종·책략을 한곳에서 본다.
 *
 * 인물: 연의 장수록의 모든 장수(신장수 포함). 초상, 다섯 능력, 병종·성격, 고유능력, 열전 본문,
 *       그리고 장수 효과(배우기·장착)까지. 전용 원화가 없는 장수는 초상 생성기(portrait.ts)로 얼굴을 지어 준다.
 * 병종: 모든 병종의 그림·능력 계수·사거리·전법·개화 스킬·진화 계통·쓰는 책략.
 * 책략: 아이콘 목록과 속성·소모 MP·습득 레벨·시전 범위·효과 범위 격자·설명.
 */
import type {UnitClass,StrategyTier,TerrainKind} from '../../core/src/index.ts';
import {VARIANTS,tierOf,familyOf,profileOf,classTactics,strategyArea,tieredStrategy,strategyTierLevel,STRATEGY_TIER_NAMES,gradeProfileOf,terrainEfficiency,efficiencyMark,reachLabel,reachOffsets} from '../../core/src/index.ts';
import {strategyIconUrl} from './strategy-icons.ts';
import {allRomanceNames,romanceByName,temperOf} from './romance.ts';
import {temperNames} from './duel.ts';
import {customNames,customList} from './custom.ts';
import {officerLook,officerPortrait} from './officer-art.ts';
import {cardFace,displayName} from './faces.ts';
import {isUploaded,setPortraitImage,removePortraitImage,importPortraitFiles} from './portrait-images.ts';
import {bioOf} from './officer-bios.ts';
import {classNames,troopRoles,troopArt,basicReactionArt,artClass,recruitPool,evolutionLines,troopSheets,classSheets} from './troops.ts';
import {spriteAtlas} from './sprite-atlas.ts';
import {navalAtlas} from './naval-art.ts';
import {paintedTroopArt} from './painted-troops.ts';
import {armorFrame,MOUNTED_FAMILIES,ROBE_FAMILIES,MACHINE_FAMILIES,type ArmorTier} from './armor.ts';
import {adviceFor} from './troop-tactics.ts';
import {allStrategies,STATUS_NAMES,SHAPE_TEXT,familyAllows,schoolOf,SCHOOL_NAMES,type LearnedStrategy} from './officers.ts';
import {officerFeatures} from './officers.ts';
import {loadMeta,saveMeta} from './meta.ts';
import {perksFor,perkState,bestLevel,learnPerk,togglePerk,officerClass,perkAt,officerTier,PERK_TIERS} from './officer-perks.ts';
import {perkText} from './perks.ts';
import {skillParam} from './romance.ts';
import {perkSlots,gateText} from './research.ts';
import {CHU,HAN,isChuHan,legacyOf,legacyState,legacyText,unlockLegacy,chooseHeir} from './chuhan.ts';

export interface CodexHost {modal(html:string,closable?:boolean):void;toast(text:string):void;back():void;research?():void}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

// ─────────────────────────────────────────────── 인물

export type Side='wei'|'shu'|'wu'|'other'|'chu'|'han'|'custom';
const SIDE_NAMES:Record<Side,string>={wei:'위',shu:'촉',wu:'오',other:'군웅',chu:'초',han:'한',custom:'신장수'};
const SHU=new Set('마초 황충 조운 마속 왕평 위연 고상 맹염 강유 제갈량 방통 유비 관우 장비 서서 관평 유봉 마대 관색 황권 하후패 이엄'.split(' '));
const WU=new Set('주유 손권 장소 제갈근 여몽 여범 손소 육손 주연 제갈각 고수 황개 감녕 노숙 정봉 전종 서성'.split(' '));
const OTHER=new Set('여포 진궁 양앙 공손연 비연 안량 원담 고람 맹획 축융 올돌골 봉기 원상 심배 고간 답돈 문추 저수 채모 전풍 타사대왕 원희'.split(' '));
export function sideOf(name:string):Side{if(customNames().includes(name))return 'custom';if((CHU as readonly string[]).includes(name))return 'chu';if((HAN as readonly string[]).includes(name))return 'han';return SHU.has(name)?'shu':WU.has(name)?'wu':OTHER.has(name)?'other':'wei';}
/** 열전에 오르는 모든 장수(위·촉·오·군웅·신장수 순, 같은 세력 안에서는 장수록 순). */
export function codexNames(){const order:Side[]=['wei','shu','wu','other','chu','han','custom'];const names=allRomanceNames();return order.flatMap(s=>names.filter(n=>sideOf(n)===s));}
/** 얼굴: 넣은 그림 → 전용 원화 → 신장수 초상 → 초상 생성기로 지은 얼굴(faces.ts). */
export const codexFace=cardFace;
/** 열전 본문(신장수는 능력과 성격으로 짓는다). */
export function biography(name:string){
  const b=bioOf(name);if(b)return b;
  const c=customList().find(o=>o.name===name);
  if(c)return `${c.name}은(는) 『삼국지연의』에 이름이 없는, 이 이야기에서 새로 일어선 인물이다. 사람들은 그를 「${c.epithet||'이름 없는 장수'}」라 불렀다. ${temperNames[c.temper]}한 성품으로 ${classNames[c.unitClass]??c.unitClass}을(를) 이끌었고, 그 행적은 이제부터 쓰인다.`;
  const r=romanceByName(name);return r?`${name} — ${r.epithet}. 자세한 행적은 전하지 않는다.`:'';
}
const STAT_ROWS:Array<[keyof NonNullable<ReturnType<typeof romanceByName>>,string]>=[['war','무력'],['int','지력'],['lead','통솔'],['pol','정치'],['cha','매력']];

function peopleTab(pick:string,side:Side|'all'){
  const meta=loadMeta(),names=codexNames().filter(n=>side==='all'||sideOf(n)===side),name=names.includes(pick)?pick:names[0]??'';
  const r=romanceByName(name),cls=officerClass(name),temper=temperOf(name),skill=r?.skill??officerFeatures[name];
  const st=perkState(meta,name),best=bestLevel(meta,name),tier=officerTier(meta,name),slots=perkSlots(meta),perks=perksFor(name);
  const list=`<div class="cx-filter"><label class="cx-upload" title="파일 이름을 장수 이름으로 봅니다(조조.png → 조조)">🖼 여러 장 넣기<input type="file" accept="image/*" multiple data-cx-bulk hidden></label>${(['all','wei','shu','wu','other','chu','han','custom'] as const).map(s=>`<button data-cx-side="${s}" class="${side===s?'active':''}">${s==='all'?'전체':SIDE_NAMES[s]}</button>`).join('')}</div>
    <div class="cx-people">${names.map(n=>`<button data-cx-person="${esc(n)}" class="cx-person side-${sideOf(n)} ${n===name?'chosen':''}" aria-label="${esc(n)}"><span class="cx-face">${codexFace(n)}</span><b>${esc(n)}</b></button>`).join('')||'<p class="muted">이 세력에는 아직 장수가 없다.</p>'}</div>`;
  const detail=!name?'':`<div class="cx-detail cx-person-detail">
    <div class="cx-head"><span class="cx-big-face">${codexFace(name)}</span><div><small class="cx-side side-${sideOf(name)}">${SIDE_NAMES[sideOf(name)]}</small><h3>${esc(displayName(name))}</h3><p class="cx-epithet">${esc(r?.epithet??'')}</p>
      <p class="cx-tags"><span>${esc(classNames[cls]??cls)}</span>${temper?`<span>성격 ${temperNames[temper]}</span>`:''}${best?`<span>최고 Lv.${best}</span>`:''}</p>
      <p class="cx-img-tools"><label class="cx-upload">🖼 초상 이미지 넣기<input type="file" accept="image/*" data-cx-upload hidden></label>${isUploaded(name)?'<button data-cx-unimg>넣은 그림 지우기</button>':''}</p></div></div>
    ${r?`<div class="cx-stats">${STAT_ROWS.map(([k,label])=>{const v=r[k] as number;return `<div class="cx-stat"><span>${label}</span><i><i style="width:${v}%" class="${v>=90?'hi':v<40?'lo':''}"></i></i><b>${v}</b></div>`;}).join('')}</div>`:''}
    ${skill?`<p class="cx-unique"><b>고유능력 「${esc(skill.name)}」</b> ${esc(skill.description)}${'param' in skill&&skill.param!==undefined?`<br><span class="cx-tiers">${[1,2,3,4].map(t=>`<i class="${t===tier?'now':''}">${PERK_TIERS[t-1]!.mark} ${esc(perkText(skill.trait,skillParam(skill.param!,t)))}</i>`).join('')}</span>`:''}</p>`:''}
    <p class="cx-evo">진화 단계 <b>${'◆'.repeat(tier)}${'◇'.repeat(4-tier)}</b> <small>병종이 진화할수록 장수 효과와 고유능력이 Ⅰ→Ⅱ→Ⅲ→Ⅳ(전설)로 강해진다${best?` · 최고 Lv.${best} 기준`:''}</small></p>
    <div class="cx-bio"><h4>열전</h4><p>${esc(biography(name))}</p></div>
    ${isChuHan(name)?legacyBlock(meta,name):`    <div class="cx-perks"><h4>장수 효과 <small>장착 ${st.equipped.length}/${slots} · 천명 ${meta.mandate}</small></h4>
      ${perks.map(p=>{const learned=st.learned.includes(p.id),on=st.equipped.includes(p.id),reach=best>=p.level;
        return `<div class="cx-perk ${learned?'learned':''} ${on?'equipped':''} ${!learned&&!reach?'locked':''}"><span class="cx-perk-glyph">${on?'◆':learned?'◇':'🔒'}</span><div><b>${esc(perkAt(p,tier).name)}</b> <small>${p.source}</small><br><span class="cx-tiers">${[1,2,3,4].map(t=>`<i class="${t===tier?'now':''}">${PERK_TIERS[t-1]!.mark} ${esc(perkText(p.trait,perkAt(p,t).param))}</i>`).join('')}</span><br><small>필요 Lv.${p.level} · 천명 ${p.cost}</small></div>
        ${learned?`<button data-cx-toggle="${p.id}">${on?'해제':'장착'}</button>`:`<button data-cx-learn="${p.id}" ${reach&&meta.mandate>=p.cost?'':'disabled'}>${reach?'습득':'Lv.'+p.level+' 필요'}</button>`}</div>`;}).join('')}
      <p class="muted">필요 레벨은 이 장수가 어느 회차에서든 닿은 가장 높은 레벨입니다. 장착한 효과는 이 장수가 천명의 길에서 출진할 때 적용되고, 교체는 무료입니다.</p></div>`}
  </div>`;
  return {html:`<div class="cx-split"><div class="cx-list">${list}</div>${detail}</div>`,name};
}

/** 초한 영웅: 장수 효과 대신 계승(유산을 열고, 회차마다 한 영웅을 골라 그 힘을 빌린다). */
function legacyBlock(meta:ReturnType<typeof loadMeta>,name:string){
  const l=legacyOf(name);
  if(!l)return `<div class="cx-perks"><h4>계승</h4><p class="muted">사백 년 전의 영웅. 이 사람의 유산은 아직 전해지지 않는다.</p></div>`;
  const st=legacyState(meta,l);
  const btn=st==='active'?'<button data-cx-heir="'+esc(name)+'">계승 내려놓기</button>':st==='owned'?'<button data-cx-heir="'+esc(name)+'" class="primary">이 영웅을 계승</button>':st==='open'?`<button data-cx-legacy="${esc(name)}" ${meta.mandate>=l.cost?'':'disabled'}>유산 열기 · 천명 ${l.cost}</button>`:`<button disabled>🔒 ${esc(gateText(l.gate!))}</button>`;
  return `<div class="cx-perks cx-legacy ${st}"><h4>계승 「${esc(l.name)}」 <small>${st==='active'?'계승 중':st==='owned'?'열림':st==='open'?'열 수 있음':'잠김'} · 천명 ${meta.mandate}</small></h4>
    <p class="cx-unique"><b>${esc(l.story)}</b><br>${esc(legacyText(l))}</p>${btn}
    <p class="muted">초한의 영웅은 사마의의 부대에 들어오지 않는다. 대신 유산을 열어 두면, 회차마다 한 영웅을 골라 그 힘을 아군 전원이 빌려 싸운다. 회차·연의 전장·결말을 쌓을수록 더 많은 영웅의 유산이 열린다.</p></div>`;
}

// ─────────────────────────────────────────────── 병종

/** 모든 병종: 모병 가능 계통부터, 진화 단계 순. */
export function codexClasses():UnitClass[]{
  const lines=evolutionLines().map(l=>l.map(([c])=>c)),seen=new Set<UnitClass>(),out:UnitClass[]=[];
  const firsts=[...recruitPool,...lines.map(l=>l[0]!)];for(const f of firsts){const line=lines.find(l=>l[0]===f)??[f];for(const c of line)if(!seen.has(c)){seen.add(c);out.push(c);}}
  for(const c of ['ram','catapult','engineer','navy'] as UnitClass[])if(!seen.has(c)){seen.add(c);out.push(c);}
  return out;
}
export function classSprite(c:UnitClass){return sprite(c);}
function sprite(c:UnitClass){
  const painted=paintedTroopArt[c];
  if(painted)return `<div class="cx-sprite" role="img" aria-label="${esc(classNames[c]??c)}" style="background-image:var(--${painted.sheet}-atlas);background-size:400% ${painted.rows*100}%;background-position:0 ${painted.row/(painted.rows-1)*100}%"></div>`;
  // 신규 전체 원화가 없는 경우에만 예전 manifest 전용 시트를 보조 그림으로 쓴다.
  if(classSheets.has(c))return `<div class="cx-sprite" style="background-image:var(--own-${c}-atlas);background-size:400% 300%;background-position:0 0"></div>`;
  const base=artClass(c),fam=familyOf(base),art=troopArt[base]??troopArt[fam],react=basicReactionArt[base]??basicReactionArt[fam],tint=troopRoles[c]?.tint;
  const hex=tint!==undefined?'#'+tint.toString(16).padStart(6,'0'):'',glow=hex?`;--cx-tint:${hex}`:'';
  const sheet=art??react;
  if(sheet){const pos=`0% ${sheet.row/(sheet.rows-1)*100}%`,size=`400% ${sheet.rows*100}%`,img=`var(--${sheet.sheet}-atlas)`;
    // 진화·확장 병종은 전장처럼 색조를 입힌다(그림 모양대로만 물들도록 같은 그림을 가면으로 쓴다).
    const dye=hex&&VARIANTS[c]?`<i class="cx-dye" style="background:${hex};-webkit-mask-image:${img};mask-image:${img};-webkit-mask-size:${size};mask-size:${size};-webkit-mask-position:${pos};mask-position:${pos}"></i>`:'';
    return `<div class="cx-sprite" style="background-image:${img};background-size:${size};background-position:${pos}${glow}">${armorCanvas(c)}${dye}</div>`;}
  if(fam==='ram')return `<div class="cx-sprite" style="background-image:var(--ram-atlas);background-size:200% 200%;background-position:0 0${glow}">${armorCanvas(c)}</div>`;
  if(fam==='navy')return `<div class="cx-sprite" style="background-image:var(--naval-atlas);background-size:400% 400%;background-position:0 ${(tierOf(c)===3?3:tierOf(c)===2?1:0)/3*100}%${glow}">${armorCanvas(c)}</div>`;
  return `<div class="cx-sprite empty" style="${glow.slice(1)}"><span>${esc((classNames[c]??c).slice(0,1))}</span></div>`;
}
/** 진화 2·3단은 단계 장비(망토·금갑·깃발·마갑)를 입힌 그림을 덧그린다(paintArmor가 채운다). */
const armorCanvas=(c:UnitClass)=>tierOf(c)>=2&&!classSheets.has(c)?`<canvas class="cx-armor" data-armor="${c}"></canvas>`:'';
function sheetFor(c:UnitClass):{load:()=>Promise<HTMLCanvasElement>;rows:number;cols:number;row:number}|undefined{
  const base=artClass(c),fam=familyOf(base),art=troopArt[base]??troopArt[fam],react=basicReactionArt[base]??basicReactionArt[fam];
  if(fam==='ram')return {load:()=>spriteAtlas('ram-v1.webp',2,2),rows:2,cols:2,row:0};
  if(fam==='navy')return {load:navalAtlas,rows:4,cols:4,row:tierOf(c)===3?3:1};
  const sh=art??react;if(!sh)return undefined;const url=troopSheets.find(s=>s.id===sh.sheet)?.url;if(!url)return undefined;
  return {load:()=>spriteAtlas(url,sh.rows,4),rows:sh.rows,cols:4,row:sh.row};
}
export async function paintArmor(){
  for(const el of [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-armor]')]){
    const c=el.dataset.armor as UnitClass,info=sheetFor(c),t=tierOf(c);if(!info||t<2)continue;
    try{const atlas=await info.load(),w=atlas.width/info.cols,h=atlas.height/info.rows,fam=familyOf(artClass(c));
      const f=armorFrame(atlas,0,info.row*h,w,h,{tier:t as ArmorTier,mounted:MOUNTED_FAMILIES.has(fam),dye:'blue',robe:ROBE_FAMILIES.has(fam),machine:MACHINE_FAMILIES.has(fam)});
      el.width=f.width;el.height=f.height;el.getContext('2d')!.drawImage(f,0,0);el.classList.add('on');}catch{/* 그림을 못 읽으면 원래 그림 그대로 */}
  }
}
const CC_TERRAINS:Array<[TerrainKind,string]>=[['plain','평지'],['forest','숲'],['hill','구릉'],['mountain','산지'],['marsh','늪'],['water','물'],['fort','성채']];
/** 조조전 병과 등급(새 전투 규칙): 다섯 능력 등급·HP/MP 성장·지형 효율. */
function ccGrades(c:UnitClass){
  const g=gradeProfileOf(c),[a,sp,d,ag,m]=g.grades;
  const terrain=CC_TERRAINS.map(([t,name])=>`${name}${efficiencyMark(terrainEfficiency(c,t))}`).join(' ');
  return `<p class="cx-unique"><b>조조전 병과 「${esc(g.name)}」</b> 공격 ${a} · 정신 ${sp} · 방어 ${d} · 순발 ${ag} · 사기 ${m} · HP ${g.hp[0]}+${g.hp[1]}/Lv · MP ${g.mp[0]}+${g.mp[1]}/Lv<br><small>지형 효율 ${terrain} (★120% ◎110% ○100% △90% X80%)</small></p>`;
}
const PROFILE_ROWS:Array<[keyof ReturnType<typeof profileOf>,string]>=[['hp','체력'],['attack','공격'],['defense','방어'],['intellect','지력'],['spirit','정신'],['agility','순발'],['mp','책략']];
function classesTab(pick:string){
  const all=codexClasses(),c=(all.includes(pick as UnitClass)?pick:all[0]!) as UnitClass,p=profileOf(c),v=VARIANTS[c],line=evolutionLines().find(l=>l.some(([x])=>x===c));
  const spells=troopRoles[c]?.spells??(p.canUseStrategy&&['strategist','fengshui'].includes(familyOf(c))?allStrategies.filter(s=>familyAllows(familyOf(c),s)).map(s=>s.id):[]);
  const grid=`<div class="cx-classes">${all.map(k=>`<button data-cx-class="${k}" class="cx-class tier-${tierOf(k)} ${k===c?'chosen':''}">${sprite(k)}<b>${esc(classNames[k]??k)}</b><small>${'◆'.repeat(tierOf(k))}</small></button>`).join('')}</div>`;
  const detail=`<div class="cx-detail"><div class="cx-head">${sprite(c)}<div><small>${'◆'.repeat(tierOf(c))} ${tierOf(c)===1?'기본':tierOf(c)===2?'정예':tierOf(c)===3?'최정예':tierOf(c)===4?'전설':'신화'} · ${esc(classNames[familyOf(c)]??familyOf(c))} 계열</small><h3>${esc(classNames[c]??c)}</h3><p>${esc(troopRoles[c]?.role??adviceFor(c))}</p></div></div>
    <div class="cx-stats">${PROFILE_ROWS.map(([k,label])=>{const n=p[k] as number;return `<div class="cx-stat"><span>${label}</span><i><i style="width:${Math.min(100,n/2.2*100)}%" class="${n>=1.3?'hi':n<0.7?'lo':''}"></i></i><b>${n.toFixed(2)}</b></div>`;}).join('')}</div>
    <p class="cx-tags"><span>이동 ${p.movement}</span><span>사거리 ${p.range[0]}~${p.range[1]} · ${reachLabel(c)}</span>${p.canUseStrategy?'<span>책략 사용</span>':''}</p>
    <div class="cx-ranges"><figure><figcaption>평타 범위 · ${reachLabel(c)}</figcaption>${rangeGrid(reachOffsets({unitClass:c,range:p.range}),'cast')}</figure></div>
    ${ccGrades(c)}
    ${v?.bloom?`<p class="cx-unique"><b>개화 「${esc(v.bloom.name)}」</b> ${esc(v.bloom.description)}</p>`:''}
    ${classTactics(c).map(t=>`<p class="cx-unique"><b>전법 「${esc(t.name)}」</b> ${esc(t.description)}</p>`).join('')}
    ${line?`<div class="cx-line">${line.map(([k,lv],i)=>`${i?`<span class="evo-arrow">Lv.${lv} →</span>`:''}<button data-cx-class="${k}" class="evo-node ${k===c?'chosen':''}"><b>${'◆'.repeat(tierOf(k))}</b>${esc(classNames[k]??k)}</button>`).join('')}</div>`:''}
    ${spells.length?`<div class="cx-spells"><b>쓰는 책략 ${spells.length}</b><div>${spells.map(id=>{const s=allStrategies.find(x=>x.id===id);return s?`<button data-cx-spell="${s.id}" title="${esc(s.name)} · Lv.${s.level}"><img src="${strategyIcon(s.id)}" alt=""><small>${esc(s.name)}</small></button>`:'';}).join('')}</div></div>`:''}</div>`;
  return `<div class="cx-split"><div class="cx-list">${grid}</div>${detail}</div>`;
}

// ─────────────────────────────────────────────── 책략

const ELEMENT_NAMES:Record<string,string>={fire:'화',wind:'풍',water:'수',thunder:'뇌',earth:'지',support:'술'};
/** 책략마다 한 줄 풀이(무엇을 하는 계책인가). */
export const STRATEGY_TEXT:Record<string,string>={
  bowangFire:'박망파 — 좁은 길로 끌어들인 적을 둘레째 불사른다.',riverDam:'백하의 둑을 터 한 줄의 적을 쓸어 가고 걸음을 늦춘다.',fireShips:'적벽의 화선 — 불붙은 배를 한 줄로 몰아 들이받는다.',
  counterSpy:'반간계 — 적의 첩자를 역으로 써 적 책사의 책략을 봉인한다.',beautyTrap:'미인계 — 적장의 마음을 흔들어 혼란에 빠뜨린다.',lureTiger:'조호이산 — 범을 산에서 끌어내듯 적을 꾀어내 걸음을 늦춘다.',
  burnCamp:'이릉의 연영 화공 — 길게 늘어선 진영을 둘레째 태운다.',rockAmbush:'매복한 병사가 돌을 굴려 한 줄의 적을 치고 포박한다.',selfInjury:'고육계 — 거짓 투항으로 적의 경계를 풀어 받는 피해를 늘린다.',
  thunderStorm:'뇌우를 불러 둘레의 적을 감전시킨다.',borrowKnife:'차도살인 — 남의 칼을 빌리듯 둘레의 적끼리 의심하게 해 힘을 뺀다.',eastWind:'동남풍 — 바람을 빌려 넓은 땅의 적을 휩쓴다.',
  sevenArmies:'칠군 수몰 — 한수의 물을 끌어 넓은 땅의 적을 잠그고 발을 묶는다.',lockedGates:'팔문금쇄진 — 여덟 문을 닫아 둘레의 적을 가둔다.',stoneMaze:'석병팔진 — 돌무더기 진으로 넓은 땅의 적을 길 잃게 한다.',
  relief:'구휼 — 둘레의 아군에게 양식과 약을 나눠 체력을 회복한다.',strawBoats:'초선차전 — 적의 화살을 빌려 둘레의 아군 사기를 높인다(공격 피해 증가).',supplyLine:'군량 수송 — 둘레의 아군이 MP를 되찾는다.',
  woodenOx:'목우유마 — 수레로 보급을 잇대어 넓은 땅의 아군 이동력을 늘린다.',peachOath:'도원결의 — 의형제의 맹세로 넓은 땅의 아군이 결사의 각오를 한다.',
  fire:'적 한 부대에 불을 놓아 태운다. 숲에서 더 거세다.',embers:'작은 불씨를 던져 적을 그을린다. 적은 MP로 쓰는 첫 화계.',inferno:'넓은 땅을 업화로 덮는다. 맞은 적은 화상을 입는다.',fireWall:'불의 진을 쳐 둘레의 적을 태운다.',
  chainFire:'배를 묶은 연환처럼, 한 줄로 늘어선 적을 차례로 불사른다.',skyFire:'하늘에서 불비를 내려 십자로 퍼뜨린다.',
  windDragon:'바람의 용이 휘몰아쳐 둘레의 적을 친다. 사마의의 장기.',gust:'돌풍으로 적 한 부대를 밀어 친다.',whirlwind:'회오리로 둘레를 휩쓴다.',tempest:'폭풍으로 넓은 땅을 휩쓴다.',gale:'칼날 같은 질풍이 한 줄로 내달린다.',
  flood:'물길을 터 십자로 적을 휩쓴다. 물가에서 더 세다.',waterSurge:'격류로 둘레의 적을 덮치고 발을 묶는다.',deluge:'큰물을 일으켜 넓은 땅을 잠근다.',tidalLine:'둑을 무너뜨려 한 줄의 적을 쓸어 가고 발을 묶는다.',mire:'땅을 진흙탕으로 만들어 적의 걸음을 늦춘다.',
  thunder:'벼락 한 줄기로 적을 감전시킨다.',lightningNet:'번개 그물로 둘레의 적을 감전시킨다.',thunderbolt:'천뢰가 한 부대를 꿰뚫는다.',thunderCross:'벼락이 십자로 갈라져 내리꽂힌다.',
  bind:'적 한 부대를 묶어 움직이지 못하게 한다.',ambush:'숨긴 병사가 덮쳐 적을 포박한다.',rockfall:'산 위에서 돌을 굴려 친다. 산지에서 더 세다.',encircle:'둘레를 에워싸 적을 포박한다.',poison:'독을 풀어 적이 피를 흘리게 한다.',plague:'역병을 퍼뜨려 둘레의 적이 피를 흘린다.',
  quake:'땅을 뒤흔들어 넓은 땅의 적을 치고 걸음을 늦춘다.',breakArmor:'갑옷의 이음매를 노려 적이 받는 피해를 늘린다.',shatter:'진을 부수어 둘레의 적이 받는 피해를 늘린다.',
  confuse:'헛소문으로 적 한 부대를 혼란에 빠뜨린다.',feint:'허를 찔러 적을 혼란시킨다.',demoralize:'이간책으로 둘레의 적을 혼란시킨다.',grandFeint:'공성계 — 성문을 열어 두어 넓은 땅의 적을 헷갈리게 한다.',rumor:'여러 부대에 헛소문을 흘려 혼란 상태로 만든다.',chaos:'대혼란계 — 넓은 땅의 적을 한꺼번에 흔든다.',
  silence:'적 책사의 입을 막아 책략을 봉인한다.',weakenCurse:'저주로 적의 힘을 빼 공격 피해를 줄인다.',terror:'위세로 둘레의 적을 눌러 공격 피해를 줄인다.',
  mend:'아군 한 부대의 체력을 회복한다.',greatMend:'둘레의 아군을 크게 회복한다.',sanctuary:'성역을 펼쳐 넓은 땅의 아군을 회복한다.',purify:'해로운 상태이상을 씻어 낸다.',focus:'마음을 가다듬어 아군 한 부대의 MP를 되찾게 한다.',
  fortify:'아군 한 부대를 견고하게 해 받는 피해를 줄인다.',ironWall:'둘레의 아군을 철벽처럼 굳힌다.',march:'강행군으로 아군의 이동력을 늘린다.',swiftWind:'둘레의 아군을 빠르게 움직이게 한다.',
  hongmen:'홍문의 잔치 — 칼춤 속에 적장을 붙잡아 책략을 봉인하고 혼란에 빠뜨린다.',secretPath:'명수잔도 암도진창 — 잔도를 고치는 척하며 샛길로 나아가, 둘레의 아군이 빠르게 움직인다.',
  burnBoats:'파부침주 — 솥을 깨고 배를 가라앉혀, 둘레의 아군이 더 세게 치고 덜 다친다.',backWater:'배수진 — 강을 등지고 진을 쳐 넓은 땅의 아군이 죽기로 싸운다.',
  fourSongs:'사면초가 — 사방에서 고향 노래가 들려 넓은 땅의 적이 혼란에 빠지고 힘이 빠진다.',weiRiver:'유수 수공 — 상류의 모래주머니를 터뜨려 한 줄의 적을 끊고 쓸어 간다.',tenAmbush:'십면매복 — 열 겹의 복병이 넓은 땅의 적을 덮쳐 포박한다.',
  inspire:'북을 울려 둘레 아군의 사기를 올린다.',warCry:'함성으로 둘레 아군의 공격 피해를 늘린다.',grandDrum:'큰 북소리로 넓은 땅의 아군을 고무한다.',valor:'결사의 각오 — 한 부대가 더 세게 치고 덜 다친다.',
};
/** 책략 그림 아이콘(진화 단계별). */
export const strategyIcon=(id:string,tier:StrategyTier=1)=>strategyIconUrl(id,tier);
/** 9×9 격자: 가운데가 시전자(또는 찍은 칸). */
export function rangeGrid(cells:Array<{x:number;y:number}>,kind:'cast'|'effect'|'help',center='self'){
  const set=new Set(cells.map(c=>`${c.x},${c.y}`));let out='';
  for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++){const on=set.has(`${x},${y}`),mid=x===0&&y===0;out+=`<i class="${on?kind:''} ${mid?'mid '+center:''}"></i>`;}
  return `<div class="cx-grid">${out}</div>`;
}
export function castCells(range:number){const out:Array<{x:number;y:number}>=[];for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(Math.abs(x)+Math.abs(y)<=range)out.push({x,y});return out;}
/** 책략을 쓰는 병종: 병종 목록(troops.ts)에 든 병종 + 계통 규칙(책사·풍수사 계열)에 맞는 병종. */
export function strategyUsers(s:LearnedStrategy):UnitClass[]{
  const named=Object.entries(troopRoles).filter(([,r])=>r?.spells.includes(s.id)).map(([k])=>k as UnitClass);
  const fam=(['strategist','fengshui'] as UnitClass[]).flatMap(f=>[f,...(Object.keys(VARIANTS) as UnitClass[]).filter(k=>VARIANTS[k]!.family===f&&VARIANTS[k]!.profile.canUseStrategy)]).filter(k=>!troopRoles[k]&&familyAllows(familyOf(k),s));
  return [...new Set([...fam,...named])];
}
const GROUPS:Array<{key:string;name:string;test:(s:LearnedStrategy)=>boolean}>=[
  {key:'fire',name:'불',test:s=>schoolOf(s)==='attack'&&s.element==='fire'},{key:'wind',name:'바람',test:s=>schoolOf(s)==='attack'&&s.element==='wind'},
  {key:'water',name:'물',test:s=>schoolOf(s)==='attack'&&s.element==='water'},{key:'thunder',name:'번개',test:s=>schoolOf(s)==='attack'&&s.element==='thunder'},
  {key:'earth',name:'땅',test:s=>schoolOf(s)==='attack'&&s.element==='earth'},{key:'curse',name:'술법',test:s=>schoolOf(s)==='mind'},
  {key:'heal',name:'회복',test:s=>schoolOf(s)==='heal'},{key:'buff',name:'고무·지원',test:s=>schoolOf(s)==='buff'}];
function strategiesTab(pick:string,tierPick:StrategyTier=1){
  const list=[...allStrategies].sort((a,b)=>a.level-b.level||a.id.localeCompare(b.id)),s=list.find(x=>x.id===pick)??list[0]!;
  const d=tieredStrategy(s,tierPick),users=strategyUsers(s);
  const effect=strategyArea(d,{x:0,y:0},{x:-1,y:0});
  const grid=`<div class="cx-spell-groups">${GROUPS.map(g=>{const xs=list.filter(g.test);return xs.length?`<section class="cx-sg cx-sg-${g.key}"><h5>${g.name} <small>${xs.length}</small></h5><div class="cx-spell-grid">${xs.map(x=>`<button data-cx-spell="${x.id}" class="cx-spell ${x.id===s.id?'chosen':''}" title="${esc(x.name)} · Lv.${x.level}"><img src="${strategyIcon(x.id)}" alt=""><small>${esc(x.name)}</small></button>`).join('')}</div></section>`:'';}).join('')}</div>`;
  const tiers=([1,2,3] as StrategyTier[]).map(t=>({t,d:tieredStrategy(s,t),lv:strategyTierLevel(s,t)}));
  const row=(label:string,f:(x:typeof tiers[number])=>string)=>`<tr><th>${label}</th>${tiers.map(x=>`<td class="${x.t===tierPick?'on':''}">${f(x)}</td>`).join('')}</tr>`;
  const table=`<table class="cx-tiers"><thead><tr><th></th>${tiers.map(x=>`<th class="${x.t===tierPick?'on':''}"><button data-cx-tier="${x.t}"><img src="${strategyIcon(s.id,x.t)}" alt=""><b>${STRATEGY_TIER_NAMES[x.t]}</b><small>Lv.${x.lv}</small></button></th>`).join('')}</tr></thead><tbody>
    ${s.support&&s.support!=='heal'&&s.support!=='mana'?'':row(s.support?'회복량':'위력',x=>String(x.d.power))}${row('소모 MP',x=>String(x.d.mpCost))}${row('사거리',x=>x.d.range+'칸')}${row('범위',x=>SHAPE_TEXT(x.d))}</tbody></table>`;
  const detail=`<div class="cx-detail cx-spell-detail"><div class="cx-head"><img class="cx-spell-big" src="${strategyIcon(s.id,tierPick)}" alt=""><div><small>${SCHOOL_NAMES[schoolOf(s)]} · ${s.support?'지원':ELEMENT_NAMES[s.element]} 속성 · 습득 Lv.${s.level}</small><h3>${esc(s.name)} <em class="cx-tiername t${tierPick}">${STRATEGY_TIER_NAMES[tierPick]}</em></h3><p>${esc(STRATEGY_TEXT[s.id]??'')}</p></div></div>
    <div class="cx-evo"><div class="cx-sub">진화 — 쓰는 장수의 레벨이 오르면 저절로 강해진다(위력·MP 상승, 극의는 범위나 사거리 +1)</div>${table}</div>
    <div class="cx-ranges"><figure><figcaption>시전 범위 · ${d.range}칸</figcaption>${rangeGrid(castCells(d.range),'cast')}</figure><figure><figcaption>효과 범위 · ${SHAPE_TEXT(d)}</figcaption>${rangeGrid(effect,s.support?'help':'effect','target')}</figure>
    <div class="cx-users"><div class="cx-sub">쓰는 병종 <small>(장수는 갈래 없이 레벨에 따라 배운다)</small></div>${users.length?users.map(k=>`<button data-cx-class="${k}" class="cx-user">${sprite(k)}<b>${esc(classNames[k]??k)}</b></button>`).join(''):'<p class="muted">장수 전용</p>'}
    <p class="muted">${s.inflicts?.length?`상태: ${s.inflicts.map(x=>STATUS_NAMES[x]??x).join('·')}`:''}${s.shape==='line'?' · 시전자에게서 멀어지는 방향으로 뻗는다':''}</p></div></div></div>`;
  return `<div class="cx-split"><div class="cx-list">${grid}</div>${detail}</div>`;
}

// ─────────────────────────────────────────────── 화면

export type CodexTab='people'|'classes'|'strategies';
export interface CodexView {tab:CodexTab;person?:string;side?:Side|'all';cls?:string;spell?:string;tier?:StrategyTier}
export function showCodex(host:CodexHost,view:CodexView={tab:'people'}){
  const v:CodexView={side:'all',...view};
  const people=v.tab==='people'?peopleTab(v.person??'사마의',v.side??'all'):undefined;
  const body=people?people.html:v.tab==='classes'?classesTab(v.cls??'infantry'):strategiesTab(v.spell??'fire',v.tier??1);
  host.modal(`<div class="briefing codex-screen"><div class="eyebrow">삼국지 인물열전 · 사람과 병종과 책략</div><h2>${v.tab==='people'?'난세를 살아간 사람들':v.tab==='classes'?'병종 — 전장을 채운 부대들':'책략 목록'}</h2>
    <div class="cx-tabs">${([['people','인물 열전'],['classes','병종'],['strategies','책략']] as const).map(([id,label])=>`<button data-cx-tab="${id}" class="${v.tab===id?'active':''}">${label}</button>`).join('')}${host.research?'<button id="cx-research" class="cx-research">연구 ▸</button>':''}</div>
    ${body}<div class="run-actions"><button id="cx-back">← 본영</button></div></div>`,false);
  const all=<T extends HTMLElement>(sel:string)=>document.querySelectorAll<T>(sel);
  all('[data-cx-tab]').forEach(b=>b.onclick=()=>showCodex(host,{...v,tab:b.dataset.cxTab as CodexTab}));
  all('[data-cx-side]').forEach(b=>b.onclick=()=>showCodex(host,{...v,side:b.dataset.cxSide as Side|'all',person:''}));
  all('[data-cx-person]').forEach(b=>b.onclick=()=>showCodex(host,{...v,person:b.dataset.cxPerson!}));
  all('[data-cx-class]').forEach(b=>b.onclick=()=>showCodex(host,{...v,tab:'classes',cls:b.dataset.cxClass!}));
  all('[data-cx-spell]').forEach(b=>b.onclick=()=>showCodex(host,{...v,tab:'strategies',spell:b.dataset.cxSpell!,tier:1}));
  void paintArmor();
  all('[data-cx-tier]').forEach(b=>b.onclick=()=>showCodex(host,{...v,tier:Number(b.dataset.cxTier) as StrategyTier}));
  const who=people?.name??'';
  all('[data-cx-learn]').forEach(b=>b.onclick=()=>{const m=loadMeta();if(learnPerk(m,who,b.dataset.cxLearn!)){saveMeta(m);host.toast('장수 효과를 익혔다.');}showCodex(host,{...v,person:who});});
  all('[data-cx-toggle]').forEach(b=>b.onclick=()=>{const m=loadMeta();if(togglePerk(m,who,b.dataset.cxToggle!))saveMeta(m);else host.toast('장착 칸이 가득 찼다. 연구 「장수 효과 칸」으로 늘릴 수 있다.');showCodex(host,{...v,person:who});});
  all('[data-cx-legacy]').forEach(b=>b.onclick=()=>{const m=loadMeta();if(unlockLegacy(m,b.dataset.cxLegacy!)){saveMeta(m);host.toast(`「${legacyOf(b.dataset.cxLegacy!)!.name}」의 유산을 열었다.`);}showCodex(host,{...v,person:who});});
  all('[data-cx-heir]').forEach(b=>b.onclick=()=>{const m=loadMeta();if(chooseHeir(m,b.dataset.cxHeir!))saveMeta(m);showCodex(host,{...v,person:who});});
  document.querySelector<HTMLInputElement>('[data-cx-upload]')?.addEventListener('change',e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;
    void setPortraitImage(who,f).then(()=>{host.toast(`${who}의 초상을 넣었다.`);showCodex(host,{...v,person:who});},()=>host.toast('그림을 읽지 못했다.'));});
  document.querySelector<HTMLButtonElement>('[data-cx-unimg]')?.addEventListener('click',()=>{void removePortraitImage(who).then(()=>showCodex(host,{...v,person:who}));});
  document.querySelector<HTMLInputElement>('[data-cx-bulk]')?.addEventListener('change',e=>{const fs=(e.target as HTMLInputElement).files;if(!fs?.length)return;
    void importPortraitFiles([...fs],n=>codexNames().includes(n)).then(r=>{host.toast(`초상 ${r.done.length}장을 넣었다.${r.skipped.length?` 이름을 모르는 파일 ${r.skipped.length}개는 건너뛰었다.`:''}`);showCodex(host,{...v,...(r.done[0]?{person:r.done[0]}:{})});});});
  document.getElementById('cx-research')?.addEventListener('click',()=>host.research!());
  document.getElementById('cx-back')!.onclick=host.back;
  document.querySelector('.cx-list .chosen')?.scrollIntoView?.({block:'nearest'});
}
