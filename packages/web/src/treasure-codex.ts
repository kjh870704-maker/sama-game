/**
 * 보물 도감 — 첫 화면(본영)에서 보물을 한눈에: 가진 것, 어디서 얻는지, 효과(능력치·특기·특성), 장착한 장수.
 *
 * 도감은 종류(무기·방어구·보조구·회차 보물)·형태(검·창·방패·말…)·등급(전설~일반)·보유로 걸러 보고, 등급별로 묶어 보인다.
 *
 * 보물은 두 갈래다.
 *  · 장착 보물(treasures): 연의 전장·보물 외전에서 얻어 장수에게 끼운다(무기·방어구·보조구). 영구 보관.
 *  · 회차 보물(RELICS): 천명의 길·원정의 행군로 '보물고'에서 고른다. 그 회차 동안 부대 전원에 효과. 회차가 끝나면 사라진다.
 */
import {treasures,treasureInfo,gearNames,readCampaign,type GearSlot} from './progression.ts';
import {treasurePowerText} from '../../core/src/treasure-traits.ts';
import {TREASURE_SPECIALS} from './treasure-specials.ts';
import {treasureIcon,relicIcon,formOf,FORMS,GRADES,RELIC_GRADE,type TreasureForm} from './treasure-art.ts';
import {RELICS} from './roguelike.ts';
import {loadRun} from './run-ui.ts';
import {loadScenario} from './scenario.ts';
import {chapters} from './session.ts';
import {expeditions} from './expeditions.ts';

const OFFICER_KO:Record<string,string>={sima_yi:'사마의',sima_lang:'사마랑',sima_fang:'사마방',cao_zhen:'조진'};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** 종류 필터(예전 탭 이름도 받는다: 'owned'는 보유 필터로). */
export type TreasureTab='all'|'owned'|GearSlot|'relic';
export type TreasureKind='all'|GearSlot|'relic';
export const TREASURE_KINDS:Array<[TreasureKind,string]>=[['all','전체'],['weapon','무기'],['armor','방어구'],['accessory','보조구'],['relic','회차 보물']];
export interface CodexFilter {kind:TreasureKind;form:TreasureForm|'all';grade:number;own:'all'|'owned'|'missing'}
export const defaultFilter=(tab:TreasureTab='all'):CodexFilter=>({kind:tab==='owned'?'all':tab,form:'all',grade:0,own:tab==='owned'?'owned':'all'});

/** 보물을 얻는 곳(연의 장 제목 또는 보물 외전·연무장 이름) */
export function treasureSource(stage:string){
  const ch=chapters.find(c=>c.stage.id===stage);if(ch)return `연의 「${ch.stage.title}」 (${ch.label})`;
  const q=expeditions.find(e=>e.id===stage);if(q)return q.kind==='training'?`연무장 「${q.name}」 첫 승리`:q.kind==='bounty'?`보물 사냥 「${q.name}」 승리마다 하나씩`:q.kind==='challenge'?`도전 ${q.step}단계 첫 돌파`:`보물 외전 「${q.name}」`;
  return stage;
}
/** 지금 가진 보물과 장착 상태(영구 보관 + 이번 회차) */
export function treasureHoldings(){
  const c=readCampaign(),owned=new Set(c.treasures),wearer=new Map<string,string>();
  for(const [officer,slots] of Object.entries(c.loadouts??{}))for(const id of Object.values(slots??{}))if(id)wearer.set(id,officer);
  for(const [officer,id] of Object.entries(c.equipped))if(id&&!wearer.has(id))wearer.set(id,officer);
  const sc=loadScenario(),run=loadRun();
  const relics=new Set<string>([...(sc.run?.status==='alive'?sc.run.relics:[]),...(run?.relics??[])]);
  return {owned,wearer,relics};
}
export function treasureSummary(){const h=treasureHoldings();return {owned:h.owned.size,total:treasures.length,relics:h.relics.size,relicTotal:RELICS.length};}

/** 도감에 올리는 한 줄: 장착 보물과 회차 보물을 같은 꼴로. */
interface Entry {id:string;relic:boolean;name:string;kind:Exclude<TreasureKind,'all'>;form?:TreasureForm;grade:number;have:boolean}
function entries(h:ReturnType<typeof treasureHoldings>):Entry[]{
  return [...treasures.map(t=>{const info=treasureInfo(t.id);return {id:t.id,relic:false,name:t.name,kind:info.slot,form:formOf(t.id),grade:info.grade,have:h.owned.has(t.id)};}),
    ...RELICS.map(r=>({id:r.id,relic:true,name:r.name,kind:'relic' as const,grade:RELIC_GRADE[r.id]??1,have:h.relics.has(r.id)}))];
}
/** 필터에 맞는 보물(형태 필터는 그 종류의 형태일 때만 건다). */
export function filterTreasures(f:CodexFilter,h=treasureHoldings()){
  return entries(h).filter(e=>(f.kind==='all'||e.kind===f.kind)&&(f.form==='all'||e.form===f.form)&&(!f.grade||e.grade===f.grade)&&(f.own==='all'||(f.own==='owned')===e.have));
}

function card(id:string,h:ReturnType<typeof treasureHoldings>){
  const t=treasures.find(x=>x.id===id)!,info=treasureInfo(id),own=h.owned.has(id),who=h.wearer.get(id),power=treasurePowerText(id),sp=TREASURE_SPECIALS[id];
  const extra=[power?`특성 · ${esc(power)}`:'',sp?`✦ 「${esc(sp.name)}」 ${esc(sp.text)}`:''].filter(Boolean).join(' · ');
  return `<article class="tc-card g${info.grade} ${own?'owned':'missing'}">${treasureIcon(id)}<div class="tc-body"><h4>${esc(t.name)} <small class="tc-star g${info.grade}">${'★'.repeat(info.grade)}</small></h4>
    <p class="tc-effect">${esc(t.effect)}</p>${extra?`<p class="tc-power" title="${extra.replace(/<[^>]+>/g,'')}">${extra}</p>`:''}
    <p class="tc-where">${own?who?`장착 · ${esc(OFFICER_KO[who]??who)}`:'보관 중':`얻는 곳 · ${esc(treasureSource(t.stage))}`}</p></div></article>`;
}
function relicCard(id:string,h:ReturnType<typeof treasureHoldings>){
  const r=RELICS.find(x=>x.id===id)!,have=h.relics.has(id),g=RELIC_GRADE[id]??1;
  return `<article class="tc-card relic g${g} ${have?'owned':'missing'}">${relicIcon(id,r.name)}<div class="tc-body"><h4>${esc(r.name)} <small class="tc-star g${g}">${'★'.repeat(g)}</small></h4><p class="tc-effect">${esc(r.effect)}</p><p class="tc-where">${have?'이번 회차에 지님':'행군로 보물고에서 얻음'}</p></div></article>`;
}
const chip=(attr:string,value:string|number,label:string,on:boolean,count?:number)=>`<button data-${attr}="${value}" class="${on?'active':''}" aria-pressed="${on}">${label}${count===undefined?'':` <small>${count}</small>`}</button>`;
/** 보물 도감 화면 본문 */
export function treasureCodex(f:CodexFilter|TreasureTab=defaultFilter()){
  if(typeof f==='string')f=defaultFilter(f);
  const h=treasureHoldings(),s=treasureSummary(),all=entries(h);
  const count=(g:Partial<CodexFilter>)=>filterTreasures({...f as CodexFilter,...g},h).length;
  const forms=FORMS.filter(x=>f.kind==='all'||x.slot===f.kind);
  const list=filterTreasures(f,h).sort((a,b)=>b.grade-a.grade||Number(b.have)-Number(a.have)||Number(a.relic)-Number(b.relic));
  const groups=GRADES.map(g=>({...g,items:list.filter(e=>e.grade===g.grade)})).filter(g=>g.items.length);
  return `<div class="tc-filters">
    <div class="tc-row" role="group" aria-label="종류"><b>종류</b>${TREASURE_KINDS.map(([id,name])=>chip('tc-kind',id,name,f.kind===id,count({kind:id,form:'all'}))).join('')}</div>
    ${f.kind==='relic'||f.kind==='all'?'':`<div class="tc-row" role="group" aria-label="형태"><b>형태</b>${chip('tc-form','all','전체',f.form==='all')}${forms.map(x=>chip('tc-form',x.id,x.name,f.form===x.id,count({form:x.id}))).join('')}</div>`}
    <div class="tc-row" role="group" aria-label="등급"><b>등급</b>${chip('tc-grade',0,'전체',!f.grade)}${GRADES.map(g=>chip('tc-grade',g.grade,`<span class="tc-star g${g.grade}">${'★'.repeat(g.grade)}</span> ${g.name}`,f.grade===g.grade,count({grade:g.grade}))).join('')}</div>
    <div class="tc-row" role="group" aria-label="보유"><b>보유</b>${chip('tc-own','all','전체',f.own==='all')}${chip('tc-own','owned','가진 것',f.own==='owned',count({own:'owned'}))}${chip('tc-own','missing','못 얻은 것',f.own==='missing',count({own:'missing'}))}
      <span class="muted">가진 것 ${s.owned+s.relics}/${all.length}</span></div>
  </div>
  <p class="muted tc-help">장착 보물은 장수에게 끼우고, 회차 보물은 그 회차 동안 부대 전원에 효과가 있다.</p>
  ${groups.length?groups.map(g=>`<section class="tc-group g${g.grade}"><h3><span class="tc-star g${g.grade}">${'★'.repeat(g.grade)}</span> ${g.name} <small>${g.items.filter(e=>e.have).length}/${g.items.length}</small></h3>
    <div class="tc-grid">${g.items.map(e=>e.relic?relicCard(e.id,h):card(e.id,h)).join('')}</div></section>`).join(''):'<p class="muted tc-empty">이 조건에 맞는 보물이 없다.</p>'}`;
}
/** 본영의 보물 패널: 가진 보물 몇 개를 그림으로, 없으면 어디서 얻는지. */
export function treasurePanel(){
  const h=treasureHoldings(),s=treasureSummary();
  const owned=treasures.filter(t=>h.owned.has(t.id)).sort((a,b)=>treasureInfo(b.id).grade-treasureInfo(a.id).grade).slice(0,8);
  const relics=RELICS.filter(r=>h.relics.has(r.id));
  return `<section class="hub-treasure"><div class="section-label">보물 <span>장착 ${s.owned}/${s.total} · 회차 ${s.relics}/${s.relicTotal}</span></div>
    <div class="hub-treasure-row">${owned.length?owned.map(t=>`<button class="hub-treasure-item g${treasureInfo(t.id).grade}" data-treasure="${t.id}" title="${esc(t.effect)}">${treasureIcon(t.id)}<b>${esc(t.name)}</b></button>`).join(''):'<p class="muted">아직 보물이 없다. 전투에서 이기면 얻는다.</p>'}
    ${relics.map(r=>`<span class="hub-treasure-item relic" title="${esc(r.effect)}">${relicIcon(r.id,r.name)}<b>${esc(r.name)}</b></span>`).join('')}</div>
    <button id="hub-treasures" class="hub-treasure-more">보물 도감 보기 ▶</button></section>`;
}
