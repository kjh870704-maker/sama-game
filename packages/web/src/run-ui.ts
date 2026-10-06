/** 천명의 원정 화면: 본영(첫 화면) · 출발 · 층 갈림길 · 보상 · 원정 종료 · 천명 해금. 규칙은 roguelike.ts, 영구 진행은 meta.ts. */
import {showCodex} from './codex-ui.ts';
import {showResearch} from './research-ui.ts';
import {newRun,startingOfficers,departingOfficers,floorChoices,visitNode,finishBattle,finishStory,takeReward,skipReward,describeReward,nextEvolutionText,battleRef,survivorsOf,
  regionFor,actOf,isBossFloor,mandateEarned,chooseFate,taleById,RELICS,REGIONS,STORY_ORDER,RUN_FLOORS,PARTY_LIMIT,XP_PER_LEVEL,type Run,type RunNode,type RunUnit,type OfficerSpec} from './roguelike.ts';
import {romanceStats,romanceByName} from './romance.ts';
import {scenarioSummary} from './scenario-ui.ts';
import {runBoard} from './run-board.ts';
import {showCustomEditor} from './custom-ui.ts';
import {treasurePanel,treasureCodex,defaultFilter,type TreasureTab,type CodexFilter} from './treasure-codex.ts';
import {fateMap} from './fate-map.ts';
import {classTactics} from '../../core/src/index.ts';
import {loadMeta,saveMeta,buyUnlock,recordStory,settleRun,UNLOCKS,type MetaState} from './meta.ts';
import {deploymentPerks} from './officer-perks.ts';
import {fatePoint,ROUTES,routesFor,routeById,endingFor,ALL_ENDINGS} from './fate.ts';
import {classNames} from './troops.ts';
import {chapters,campaignOrder} from './session.ts';
import {freshCampaign,award,deployment as campaignDeployment} from './progression.ts';
import {tierOf,currentClass,type UnitClass,type BattleState} from '../../core/src/index.ts';
import type {Deployment} from './progression.ts';

export interface RunHost {
  modal(html:string,closable?:boolean):void;
  /** 본영(첫 화면)으로 */
  showMenu():void;
  toast(text:string):void;
  startBattle(deployment:Deployment,seed:number):void;
  /** 연의 전장 출진: 스토리 장의 실제 전장을 원정 상태로 연다 */
  startStory(chapter:number,deployment:Deployment,seed:number):void;
  /** 지금 열려 있는 원정 전투(끝나지 않은 것) */
  liveRunBattle():{seed:number;floor:number;kind:string}|undefined;
  backToBattle():void;
  /** 연의 회상(이긴 연의 전장 다시 치르기) */
  showChronicle():void;
  showTroops():void;
  showOfficers():void;
  showSlots():void;
  /** 시나리오 모드(본편: 연의 + 가상) */
  showScenario():void;
  /** 수련·보물 인연(반복 퀘스트) */
  showExpeditions(tab?:'training'|'quest'|'bounty'|'challenge'):void;
  /** 자동 저장된 전투가 있으면 이어 하기 */
  resumeSaved?:(()=>void)|undefined;
}

const KEY='sama-run-v1';
export const RUN_CHAPTER=11;

export function loadRun():Run|null{try{const raw=localStorage.getItem(KEY);if(!raw)return null;const r=JSON.parse(raw) as Run;if(r?.version!==1||!Array.isArray(r.party))return null;for(const u of r.party)u.unitClass=currentClass(u.unitClass);return r;}catch{return null;}}
function saveRun(run:Run){try{localStorage.setItem(KEY,JSON.stringify(run));}catch{/* storage optional */}}
function clearRun(){try{localStorage.removeItem(KEY);}catch{/* storage optional */}}

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const name=(c:UnitClass)=>classNames[c]??c;
const pips=(c:UnitClass)=>'◆'.repeat(tierOf(c))+'◇'.repeat(3-tierOf(c));
const stageTitle=(id:string)=>{const c=chapters.find(x=>x.stage.id===id);return c?`${c.stage.subtitle??c.stage.title}`:id;};
const ongoing=(run:Run|null):run is Run=>!!run&&(run.status==='map'||run.status==='reward');

function unitCard(u:RunUnit){
  return `<div class="run-unit${u.hero?' hero':''}${u.officer?' officer':''}"><div class="run-unit-head"><strong>${esc(u.hero?'사마의':u.name)}</strong><span class="run-tier" title="병종 단계">${pips(u.unitClass)}</span></div>
  <small>${esc(name(u.unitClass))} · Lv.${u.level} · 경험치 ${u.xp}/${XP_PER_LEVEL}</small>
  <div class="run-bar hp" title="체력"><i style="width:${Math.round(u.hp*100)}%"></i></div>
  <div class="run-bar xp" title="경험치"><i style="width:${Math.round(u.xp/XP_PER_LEVEL*100)}%"></i></div>
  <small class="run-next">${esc(nextEvolutionText(u.unitClass))}</small></div>`;
}
function partyPanel(run:Run){
  const relics=run.relics.map(id=>RELICS.find(r=>r.id===id)!).map(r=>`<span class="run-relic" title="${esc(r.effect)}">${esc(r.name)}</span>`).join('');
  return `<div class="run-party">${run.party.map(unitCard).join('')}</div><p class="run-relics">${relics||'<span class="muted">보물 없음</span>'}${run.secondChance?'<span class="run-relic grace" title="원정마다 한 번, 패배해도 원정이 끝나지 않는다">천명의 가호</span>':''}</p>`;
}
const news=(run:Run)=>run.news.length?`<div class="run-news">${run.news.map(n=>`<p${n.startsWith('진화!')?' class="evo"':''}>${esc(n)}</p>`).join('')}</div>`:'';
const actTrack=(run:Run)=>`<div class="run-track" aria-label="원정 진행">${[1,2,3].map(act=>{const cur=actOf(run.floor),r=regionFor(run,(act-1)*6+1),route=routeById(run.route?.[act as 1|2|3]);return `<span class="${act<cur?'done':act===cur?'now':''}${route&&!route.history?' if':''}">${r.arc} · ${!route?'갈림길 전':r.name}${route&&!route.history?' · 가상':''}</span>`;}).join('')}</div>`;

// ─────────────────────────────────────────────── 본영 (첫 화면)

/** 게임의 첫 화면. 본편은 시나리오(연의 + 가상), 레벨업용 반복 전투는 '반복 퀘스트'로 따로 둔다. */
export function showHub(host:RunHost){
  const meta=loadMeta(),sc=scenarioSummary(),done=sc.state.done.length;
  host.modal(`<div class="campaign run-hub"><div class="campaign-art"><img src="sima-portrait-v2.webp" alt="부채를 든 사마의 창작 초상"><div class="art-caption">사 마 의 <span>천명은 기다리는 자에게 온다</span></div></div>
  <div class="campaign-copy"><h2>사마의전</h2><p class="tagline">칼을 거두고, 때를 기다린다.</p>
  <div class="hub-stats"><span><b>${done}</b><small>마친 장</small></span><span><b>${esc(sc.tag)}</b><small>지금</small></span><span><b>${meta.endings.length}/${ALL_ENDINGS.length}</b><small>본 결말</small></span><span><b>${meta.mandate}</b><small>천명</small></span></div>
  ${runBoard(sc.state,meta)}
  ${treasurePanel()}
  <div class="hub-actions"><button id="hub-scenario" class="primary">${done?'천명의 길 이어하기':'천명의 길 시작'}${sc.state.run?` · 제${sc.state.run.no}회차`:''} · ${esc(sc.tag)} 「${esc(sc.title)}」</button>
  <button id="hub-quests">반복 퀘스트</button>${host.resumeSaved?'<button id="hub-resume">전투 이어하기</button>':''}<button id="hub-codex">삼국지 인물열전</button><button id="hub-research">연구</button><button id="hub-custom">신장수 · 신세력</button><button id="hub-slots">저장 칸</button><button id="hub-troops">병종 진화표</button><button id="hub-officers">장수 · 연의 장수록</button><button id="hub-fate">갈림길 지도</button></div></div></div>`,false);
  const on=(id:string,f:()=>void)=>{const el=document.getElementById(id);if(el)el.onclick=f;};
  on('hub-scenario',host.showScenario);on('hub-quests',()=>showQuests(host));on('hub-custom',()=>showCustomEditor(host,()=>showHub(host)));
  const codex=()=>showCodex({modal:host.modal,toast:host.toast,back:()=>showHub(host),research:()=>research()}),research=()=>showResearch({modal:host.modal,toast:host.toast,back:()=>showHub(host),codex});
  on('hub-codex',codex);on('hub-research',research);
  on('hub-treasures',()=>showTreasures(host));document.querySelectorAll<HTMLButtonElement>('[data-treasure]').forEach(b=>b.onclick=()=>showTreasures(host,'owned'));on('hub-fate',()=>showFateMap(host,()=>showHub(host)));
  on('hub-resume',()=>host.resumeSaved?.());on('hub-slots',host.showSlots);on('hub-troops',host.showTroops);on('hub-officers',host.showOfficers);
}

/** 보물 도감: 가진 것·얻는 곳·효과·특기·장착한 장수. */
export function showTreasures(host:RunHost,tab:TreasureTab|CodexFilter='all'){
  const f=typeof tab==='string'?defaultFilter(tab):tab;
  host.modal(`<div class="briefing treasure-screen"><div class="eyebrow">보물 · 도감</div><h2>천하의 보물</h2>${treasureCodex(f)}<div class="run-actions"><button id="tc-back">← 본영</button></div></div>`,false);
  const go=(g:Partial<CodexFilter>)=>showTreasures(host,{...f,...g});
  document.querySelectorAll<HTMLButtonElement>('[data-tc-kind]').forEach(b=>b.onclick=()=>go({kind:b.dataset.tcKind as CodexFilter['kind'],form:'all'}));
  document.querySelectorAll<HTMLButtonElement>('[data-tc-form]').forEach(b=>b.onclick=()=>go({form:b.dataset.tcForm as CodexFilter['form']}));
  document.querySelectorAll<HTMLButtonElement>('[data-tc-grade]').forEach(b=>b.onclick=()=>go({grade:Number(b.dataset.tcGrade)}));
  document.querySelectorAll<HTMLButtonElement>('[data-tc-own]').forEach(b=>b.onclick=()=>go({own:b.dataset.tcOwn as CodexFilter['own']}));
  document.getElementById('tc-back')!.onclick=host.showMenu;
}
/** 갈림길 지도: 연의에서 가상으로 갈라지는 자리와 진행 방식. */
export function showFateMap(host:Pick<RunHost,'modal'>,back:()=>void){
  host.modal(`<div class="briefing fate-map-screen"><div class="eyebrow">천명의 길 · 갈림길 지도</div><h2>정사와 가상, 어디서 갈라지는가</h2>${fateMap()}<div class="run-actions"><button id="fm-back">← 돌아가기</button></div></div>`,false);
  document.getElementById('fm-back')!.onclick=back;
}
/** 반복 퀘스트: 본편(시나리오)과 따로 레벨을 올리고 보물을 모으는 곳. */
export function showQuests(host:RunHost){
  const meta=loadMeta(),run=loadRun(),told=meta.chronicle.length;
  host.modal(`<div class="briefing run-screen quest-screen"><div class="eyebrow">반복 퀘스트 · 본편과 별도</div><h2>수련하고, 다시 싸운다</h2>
  <p>여기의 전투는 시나리오 진행과 상관없이 몇 번이든 할 수 있다. 시나리오가 막히면 이곳에서 레벨을 올리고 보물을 모은다.</p>
  <div class="quest-grid">
    <article><h3>천명의 원정 <small>로그라이크</small></h3><p>3편 18층을 오르는 한 번뿐인 원정. 쓰러진 장수는 돌아오지 않는다. 원정이 끝나면 천명을 얻어 영구 해금에 쓴다.</p>
      <p class="muted">천명 ${meta.mandate} · 최고 ${meta.best}층 · 원정 ${meta.runs}회</p>
      <div class="run-actions">${ongoing(run)?`<button id="q-run-continue" class="primary">원정 이어하기 · ${run.floor}층</button>`:''}<button id="q-run-new" class="${ongoing(run)?'':'primary'}">${ongoing(run)?'새 원정 (지금 원정은 포기)':'새 원정'}</button><button id="q-shop">천명 해금 ${meta.unlocks.length}/${UNLOCKS.length}</button></div></article>
    <article><h3>도전 퀘스트 <small>10단계</small></h3><p>단계를 넘을 때마다 적이 늘고 강해진다. 5·10단계에는 수문장. 처음 넘는 단계마다 보물을 준다.</p>
      <div class="run-actions"><button id="q-challenge" class="primary">도전의 문으로</button></div></article>
    <article><h3>보물 사냥 · 수련 <small>반복</small></h3><p>보물 사냥은 이길 때마다 아직 없는 보물 하나를 준다. 수련과 보물 인연 외전으로 경험치와 보물을 모은다.</p>
      <div class="run-actions"><button id="q-exp">연무장으로</button></div></article>
    <article><h3>연의 회상</h3><p>이긴 연의 전장을 다시 치른다(일반 · 극한). 원정의 연의 기록 ${told}개.</p>
      <div class="run-actions"><button id="q-chronicle">연의 기록 · 회상</button></div></article>
  </div>
  <div class="run-actions"><button id="q-back">← 본영</button></div></div>`,false);
  const on=(id:string,f:()=>void)=>{const el=document.getElementById(id);if(el)el.onclick=f;};
  on('q-run-continue',()=>showRun(host,run!));on('q-shop',()=>showShop(host));on('q-exp',()=>host.showExpeditions('bounty'));on('q-challenge',()=>host.showExpeditions('challenge'));on('q-chronicle',()=>showChronicleSummary(host));on('q-back',host.showMenu);
  on('q-run-new',()=>{if(ongoing(run)){const b=document.getElementById('q-run-new')!;if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='정말 포기하고 새로 시작';b.classList.add('danger');return;}run.status='lost';run.news=['원정을 포기했다.'];saveRun(run);return showEnd(host,run);}showStart(host);});
}

function showShop(host:RunHost,note=''){
  const meta=loadMeta();
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명 해금 · 영구 진행</div><h2>천명 ${meta.mandate}</h2>
  <p>원정이 끝날 때마다 천명을 얻는다: 오른 층 1 · 꺾은 우두머리 3 · 이긴 연의 전장 2 · 완주 10. 해금은 다음 원정부터 계속 적용된다.</p>${note?`<div class="run-news"><p>${esc(note)}</p></div>`:''}
  <div class="run-choices">${UNLOCKS.map(u=>{const own=meta.unlocks.includes(u.id);return `<button data-unlock="${u.id}" ${own||meta.mandate<u.cost?'disabled':''} class="${own?'owned':''}"><strong>${esc(u.name)} <small>${own?'해금됨':`천명 ${u.cost}`}</small></strong><small>${esc(u.effect)}</small></button>`;}).join('')}</div>
  <div class="run-actions"><button id="shop-back">← 반복 퀘스트</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-unlock]').forEach(b=>b.onclick=()=>{const m=loadMeta();if(buyUnlock(m,b.dataset.unlock!)){saveMeta(m);showShop(host,`「${UNLOCKS.find(u=>u.id===b.dataset.unlock)!.name}」을(를) 해금했다.`);}});
  document.getElementById('shop-back')!.onclick=()=>showQuests(host);
}

function showChronicleSummary(host:RunHost){
  const meta=loadMeta(),known=new Set(meta.chronicle);
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">연의 기록</div><h2>원정에서 이긴 연의 전장</h2>
  <p>연의 전장은 원정의 갈림길로 나온다. 한 번 이기면 여기 남고, 다음 원정은 그다음 이야기를 보여 준다. 이긴 전장은 '연의 회상'에서 다시 치를 수 있다.</p>
  ${REGIONS.map((r,i)=>{const list=STORY_ORDER[(i+1) as 1|2|3];return `<h3>${r.arc} · ${list.filter(id=>known.has(id)).length}/${list.length}</h3><div class="chronicle-list">${list.map(id=>`<span class="${known.has(id)?'done':''}">${known.has(id)?'◆':'·'} ${esc(known.has(id)?stageTitle(id):'아직 모르는 이야기')}</span>`).join('')}</div>`;}).join('')}
  <h3>가상 시나리오 · 이긴 가상 전장 ${meta.tales.length}/${ROUTES.reduce((n,r)=>n+r.tales.length,0)}</h3><div class="chronicle-list">${ROUTES.filter(r=>!r.history||r.tales.length).map(r=>r.tales.map(t=>`<span class="${meta.tales.includes(t.id)?'done':''}">${meta.tales.includes(t.id)?'◆':'·'} ${esc(meta.tales.includes(t.id)?`${t.title} (${r.choice})`:'아직 가 보지 않은 길')}</span>`).join('')).join('')}</div>
  <h3>결말 ${meta.endings.length}/${ALL_ENDINGS.length}</h3><div class="chronicle-list">${ALL_ENDINGS.map(id=>{const e=endingFor({3:id}),seen=meta.endings.includes(id);return `<span class="${seen?'done':''}">${seen?'◆ '+esc(e.title):'· 아직 보지 못한 결말'}</span>`;}).join('')}</div>
  <div class="run-actions"><button id="chron-replay" class="primary" ${known.size?'':'disabled'}>연의 회상 (이긴 전장 다시 치르기)</button><button id="chron-back">← 반복 퀘스트</button></div></div>`,false);
  document.getElementById('chron-replay')!.onclick=host.showChronicle;
  document.getElementById('chron-back')!.onclick=()=>showQuests(host);
}

// ─────────────────────────────────────────────── 원정

/** 원정 열기: 진행 중이면 이어서, 없으면 출발 부대 선택. */
export function openRun(host:RunHost){
  const run=loadRun();
  if(ongoing(run))return showRun(host,run);
  showStart(host);
}

/** 원정의 출발: 부대를 고르지 않는다. 사마의와 그를 따르는 장수들이 정해진 대로 떠난다. */
function showStart(host:RunHost){
  const meta=loadMeta(),seed=(Date.now()%2147483647)||7,start=startingOfficers(meta.unlocks);
  const card=(o:OfficerSpec)=>{const r=romanceByName(o.name),t=classTactics(o.unitClass)[0];return `<div class="run-unit officer"><div class="run-unit-head"><strong>${esc(o.name)}</strong><span class="run-tier">${esc(name(o.unitClass))}</span></div>
    <small>${esc(r?.epithet??'')}</small><small>${esc(romanceStats(o.name))}</small>${t?`<small class="run-next">전법 「${esc(t.name)}」 ${esc(t.description)}</small>`:''}</div>`;};
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명의 원정 · 출발</div><h2>사마의를 따르는 장수들</h2>
  <p>원정은 언제나 이 장수들과 함께 떠난다. 장수는 연의의 능력을 지니고, 싸울 때마다 경험치를 얻어 레벨이 오르며 병종이 진화한다. 쓰러진 장수는 돌아오지 않고, 사마의가 쓰러지면 원정이 끝난다. 새 장수는 모병소와 전투 보상에서 영입한다.</p>
  <p class="muted">천명 ${meta.mandate} · 해금 ${meta.unlocks.length}/${UNLOCKS.length} · 부대는 사마의 포함 최대 ${PARTY_LIMIT}</p>
  <div class="run-party"><div class="run-unit hero"><div class="run-unit-head"><strong>사마의</strong><span class="run-tier">책사</span></div><small>${esc(romanceByName('사마의')?.epithet??'')}</small><small>${esc(romanceStats('사마의'))}</small></div>${start.map(card).join('')}</div>
  <div class="run-actions"><button id="run-go" class="primary">출진</button><button id="run-back">← 반복 퀘스트</button></div></div>`,false);
  document.getElementById('run-go')!.onclick=()=>{
    if(meta.unlocks.includes('heirloom'))return pickHeirloom(host,seed,start,meta);
    begin(host,seed,start,meta);
  };
  document.getElementById('run-back')!.onclick=()=>showQuests(host);
}
function pickHeirloom(host:RunHost,seed:number,start:OfficerSpec[],meta:MetaState){
  const options=RELICS.filter((_,i)=>(i+seed)%2===0).slice(0,3);
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명 해금 · 가보</div><h2>들고 갈 가보를 고른다</h2>
  <div class="run-choices">${options.map(r=>`<button data-relic="${r.id}"><strong>${esc(r.name)}</strong><small>${esc(r.effect)}</small></button>`).join('')}</div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-relic]').forEach(b=>b.onclick=()=>begin(host,seed,start,meta,b.dataset.relic));
}
function begin(host:RunHost,seed:number,start:OfficerSpec[],meta:MetaState,relic?:string){
  const run=newRun(seed,start,{chronicle:meta.chronicle,unlocks:meta.unlocks,...(relic?{relic}:{})});
  saveRun(run);showRun(host,run);
}

export function showRun(host:RunHost,run:Run){
  if(run.status==='reward')return showReward(host,run);
  if(run.status==='won'||run.status==='lost')return showEnd(host,run);
  if(run.active)return showActive(host,run);
  const choices=floorChoices(run),region=regionFor(run,run.floor);
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명의 원정 · ${run.floor}/${RUN_FLOORS}층 · ${esc(region.arc)} · ${esc(region.name)}</div>${actTrack(run)}
  <h2>${isBossFloor(run.floor)?`${esc(region.arc)}의 끝 · 우두머리가 기다린다`:'갈림길'}</h2>${news(run)}${partyPanel(run)}
  <div class="run-choices">${choices.map((c,i)=>`<button data-node="${i}" class="${c.kind==='boss'?'primary':c.kind==='story'?'story':''}"><strong>${esc(c.label)}${c.stage?` · ${esc(stageTitle(c.stage))}`:''}</strong><small>${esc(c.detail)}</small></button>`).join('')}</div>
  <div class="run-actions"><button id="run-menu">← 반복 퀘스트 (원정은 저장됨)</button><button id="run-abandon">원정 포기</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-node]').forEach(b=>b.onclick=()=>choose(host,run,choices[Number(b.dataset.node)]!));
  document.getElementById('run-menu')!.onclick=()=>showQuests(host);
  const abandon=document.getElementById('run-abandon')!;
  abandon.onclick=()=>{
    // 한 번 더 눌러야 포기된다: 실수로 원정 전체를 잃지 않게.
    if(abandon.dataset.armed!=='1'){abandon.dataset.armed='1';abandon.textContent='정말 포기 (부대 전원 해산)';abandon.classList.add('danger');return;}
    run.status='lost';run.news=['원정을 포기했다.'];saveRun(run);showEnd(host,run);};
}

/** 운명의 갈림길: 사마의가 역사의 길과 다른 길 가운데 하나를 고른다. 고른 길은 그 편 끝까지 간다. */
function showFate(host:RunHost,run:Run){
  const act=actOf(run.floor) as 1|2|3,p=fatePoint(act,run.route);
  host.modal(`<div class="briefing run-screen fate-screen"><div class="eyebrow">${esc(p.year)} · 운명의 갈림길</div><h2>${esc(p.title)}</h2>
  <blockquote>${esc(p.prompt)}</blockquote>
  <div class="run-choices">${routesFor(act,run.route).map(r=>`<button data-route="${r.id}" class="${r.history?'history':'what-if'}"><strong><span class="route-tag">${r.history?'정사':'가상'}</span>${esc(r.choice)}</strong><small>${esc(r.detail)}</small><small class="route-meta">${esc(r.region.name)} · 우두머리 ${esc(r.region.boss.name)}${(()=>{const d=departingOfficers(run,r.id);return d.length?` · 떠나는 장수: ${esc(d.map(u=>u.name).join('·'))}`:'';})()}</small></button>`).join('')}</div>
  <p class="muted">한 번 고른 길은 되돌릴 수 없다. 가상으로 들어선 길은 끝까지 가상으로 이어지고, 하편의 길이 결말을 정한다.</p>
  <div class="run-actions"><button id="run-menu">← 반복 퀘스트 (원정은 저장됨)</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(b=>b.onclick=()=>{if(chooseFate(run,b.dataset.route!)){saveRun(run);showRun(host,run);}});
  document.getElementById('run-menu')!.onclick=()=>showQuests(host);
}

/** 가상 전장: 출진 전에 그 세계의 이야기를 한 장 보여 준다. */
function showTale(host:RunHost,run:Run,taleId:string){
  const t=taleById(taleId);if(!t)return;
  host.modal(`<div class="briefing run-screen fate-screen"><div class="eyebrow">가상 전장 · ${esc(regionFor(run,run.floor).name)} · ${run.floor}층</div><h2>${esc(t.title)}</h2>
  <blockquote>${esc(t.intro)}</blockquote><p class="muted">승리 조건: 적장 ${esc(t.target.name)} 격퇴 · 쓰러진 부대는 원정에서 사라진다.</p>
  <div class="run-actions"><button id="tale-go" class="primary">출진</button><button id="tale-back">← 갈림길</button></div></div>`,false);
  document.getElementById('tale-go')!.onclick=()=>launch(host,run,'tale',taleId);
  document.getElementById('tale-back')!.onclick=()=>showRun(host,run);
}

function launch(host:RunHost,run:Run,kind:'battle'|'elite'|'boss'|'tale',tale?:string){
  const hero=run.party.find(u=>u.hero)!;
  const p=deploymentPerks(loadMeta(),run.party.map(u=>({name:u.hero?'사마의':u.name,unitClass:u.unitClass})));
  const deployment:Deployment={levels:{sima_yi:Math.min(40,hero.level),sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:battleRef(run,kind,tale),trial:1,...(p?{perks:p}:{})};
  run.active=kind;if(tale)run.activeTale=tale;else delete run.activeTale;saveRun(run);host.startBattle(deployment,(run.seed+run.floor*97)%2147483647);
}

/** 연의 전장의 장수 레벨: 연의를 그 장까지 따라온 사람의 레벨, 사마의는 원정 레벨이 더 높으면 그것. */
export function storyDeployment(run:Run,stage:string):{chapter:number;deployment:Deployment}{
  const chapter=chapters.findIndex(c=>c.stage.id===stage);
  const c=freshCampaign();
  for(const i of campaignOrder){const s=chapters[i]!.stage;if(s.id===stage)break;award(c,s.id,'normal',s.deployment.forced,[1]);}
  const d=campaignDeployment(c,true),hero=run.party.find(u=>u.hero)!;
  d.equipped={};delete d.loadouts;
  d.levels.sima_yi=Math.min(40,Math.max(d.levels.sima_yi??1,hero.level));
  d.runStory={seed:run.seed,floor:run.floor,stage,heroLevel:hero.level,heroHp:hero.hp,relics:[...run.relics],heroXp:hero.xp};
  {const p=deploymentPerks(loadMeta(),['사마의']);if(p)d.perks=p;}d.trial=1;
  return {chapter,deployment:d};
}
function launchStory(host:RunHost,run:Run,stage:string){
  const {chapter,deployment}=storyDeployment(run,stage);
  if(chapter<0){host.toast('이 연의 전장을 찾을 수 없습니다.');return;}
  run.active='story';run.activeStage=stage;saveRun(run);host.startStory(chapter,deployment,(run.seed+run.floor*131)%2147483647);
}

/** 전투 도중 메뉴로 나왔다면: 그 전장으로 돌아가거나, 같은 전장을 처음부터 다시 치른다. 다른 갈림길로는 빠질 수 없다. */
function showActive(host:RunHost,run:Run){
  const kind=run.active!,live=host.liveRunBattle(),same=live?.seed===run.seed&&live.floor===run.floor&&live.kind===kind;
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명의 원정 · ${run.floor}/${RUN_FLOORS}층 · ${esc(regionFor(run,run.floor).name)}</div>
  <h2>전투가 아직 끝나지 않았다</h2><p>${same?'열려 있는 전장으로 돌아가 승부를 마저 낸다.':'진행하던 전장 기록이 다른 전투로 바뀌었다. 같은 전장을 처음부터 다시 치른다(지형·적 배치는 같다).'} 전투를 마치기 전에는 다른 갈림길을 고를 수 없다.</p>
  ${partyPanel(run)}<div class="run-actions"><button id="run-resume" class="primary">${same?'전장으로 돌아가기':'같은 전장 다시 시작'}</button><button id="run-menu">← 본영</button></div></div>`,false);
  document.getElementById('run-resume')!.onclick=()=>same?host.backToBattle():kind==='story'?launchStory(host,run,run.activeStage!):launch(host,run,kind as 'battle'|'elite'|'boss'|'tale',run.activeTale);
  document.getElementById('run-menu')!.onclick=()=>showQuests(host);
}

function choose(host:RunHost,run:Run,node:RunNode){
  if(node.kind==='battle'||node.kind==='elite'||node.kind==='boss')return launch(host,run,node.kind);
  if(node.kind==='story'&&node.stage)return launchStory(host,run,node.stage);
  if(node.kind==='fate')return showFate(host,run);
  if(node.kind==='tale'&&node.tale)return showTale(host,run,node.tale);
  visitNode(run,node);saveRun(run);showRun(host,run);
}

function showReward(host:RunHost,run:Run){
  const offer=run.offer??[];
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명의 원정 · ${run.floor}층 · 보상</div><h2>하나를 고른다</h2>${news(run)}${partyPanel(run)}
  <div class="run-choices">${offer.map((o,i)=>{const d=describeReward(o);return `<button data-reward="${i}"><strong>${esc(d.title)}</strong><small>${esc(d.detail)}${o.kind==='recruit'&&run.party.length>=PARTY_LIMIT?' · 부대가 가득 차 경험치로 바뀜':''}</small></button>`;}).join('')}</div>
  <div class="run-actions"><button id="run-skip">건너뛰기</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-reward]').forEach(b=>b.onclick=()=>{takeReward(run,Number(b.dataset.reward));saveRun(run);showRun(host,run);});
  document.getElementById('run-skip')!.onclick=()=>{skipReward(run);saveRun(run);showRun(host,run);};
}

function showEnd(host:RunHost,run:Run){
  const meta=loadMeta(),gain=settleRun(meta,run);saveMeta(meta);
  const won=run.status==='won',reached=won?RUN_FLOORS:run.floor;
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명의 원정 · ${won?'완주':'원정 종료'}</div><h2>${won?'천명을 거머쥐다':'원정이 끝났다'}</h2>${news(run)}
  ${won?(()=>{const e=endingFor(run.route);return `<div class="ending-card ${e.history?'history':'what-if'}"><div class="eyebrow">결말 · ${e.history?'정사':'가상'}</div><h3>${esc(e.title)}</h3>${e.lines.map(l=>`<p>${esc(l)}</p>`).join('')}</div>`;})():''}
  <p>${won?'세 편의 우두머리를 모두 꺾었다.':`${reached}층(${esc(regionFor(run,reached).arc)})에서 멈췄다.`} 최고 기록 ${meta.best}층 · 본 결말 ${meta.endings.length}/${ALL_ENDINGS.length}.</p>
  <div class="hub-stats"><span><b>+${gain||mandateEarned(run)}</b><small>얻은 천명</small></span><span><b>${meta.mandate}</b><small>쓸 수 있는 천명</small></span><span><b>${(run.storyDone?.length??0)+(run.talesDone?.length??0)}</b><small>이긴 연의·가상 전장</small></span><span><b>${run.bosses??0}</b><small>꺾은 우두머리</small></span></div>
  ${run.party.length?`<h3>끝까지 남은 부대</h3>${partyPanel(run)}`:''}
  ${run.fallen.length?`<h3>쓰러진 부대</h3><p class="muted">${run.fallen.map(esc).join(' · ')}</p>`:''}
  <div class="run-actions"><button id="run-new" class="primary">새 원정</button><button id="run-shop">천명 해금</button><button id="run-menu">← 본영</button></div></div>`,false);
  clearRun();
  document.getElementById('run-new')!.onclick=()=>showStart(host);
  document.getElementById('run-shop')!.onclick=()=>showShop(host);
  document.getElementById('run-menu')!.onclick=()=>showQuests(host);
}

/** 원정 전투가 끝났을 때 main.ts가 부른다. */
export function finishRunBattle(host:RunHost,state:BattleState,deployment:Deployment,earned:Record<string,number>={}){
  const ref=deployment.run!,run=loadRun();
  if(!run||run.floor!==ref.floor||run.status!=='map'||!run.active||run.active==='story'){host.toast('이 전투의 원정 기록을 찾을 수 없습니다.');return host.showMenu();}
  finishBattle(run,{kind:ref.kind,label:'',detail:'',...(ref.tale?{tale:ref.tale}:{})},state.outcome==='victory',survivorsOf(state,ref),earned);
  saveRun(run);showRun(host,run);
}

/** 연의 전장이 끝났을 때 main.ts가 부른다. 이기면 천명 기록에 바로 남긴다. */
export function finishRunStory(host:RunHost,state:BattleState,deployment:Deployment,earned:Record<string,number>={}){
  const ref=deployment.runStory!,run=loadRun();
  if(!run||run.floor!==ref.floor||run.status!=='map'||run.active!=='story'||run.activeStage!==ref.stage){host.toast('이 연의 전장의 원정 기록을 찾을 수 없습니다.');return host.showMenu();}
  const hero=state.find('sima_yi'),victory=state.outcome==='victory';
  finishStory(run,ref.stage,victory,hero?.alive?hero.hp/Math.max(1,hero.stats.maxHp):0,stageTitle(ref.stage),earned.sima_yi??0);
  if(victory){const meta=loadMeta();recordStory(meta,ref.stage);saveMeta(meta);}
  saveRun(run);showRun(host,run);
}
