import {trialGoals,trialGoalText,trialProgress} from './expedition-objectives.ts';
import {DOCK_ICONS} from './dock-icons.ts';
import {navalAtlas} from './naval-art.ts';
import {evolutionChart,paintArmor,type EvoGroup} from './troop-evolution.ts';
import {troopAdvice,adviceFor,recommendExpeditionSupport,supportWarnings,physicalMatchup} from './troop-tactics.ts';
import {officerLooks,officerLook,officerPortrait,dialogueCaption,splitSpokenLine,storyActorStyle,customFace} from './officer-art.ts';
import {troopRoles,supportOptions,visualClass,troopArt,troopSheets,basicReactionArt,evolutionLines,classSheets,loadClassSheets} from './troops.ts';
import {growthMilestones} from './growth-milestones.ts';
import {trialStory,trialTactics,layoutName} from './expedition-scenes.ts';
import {expeditions,expeditionReward,canExpedition,storyWins,trainingXp,growthAdvice,type Expedition} from './expeditions.ts';
const KIND_LABEL:Record<Expedition['kind'],string>={training:'반복 수련',quest:'보물 인연',bounty:'보물 사냥',challenge:'도전 퀘스트'};
import {campMarkup} from './camp.ts';
import {officerFeatures,talentTree,strategyHint,martialPower,debatePower,STATUS_NAMES} from './officers.ts';
import {deploymentPerks} from './officer-perks.ts';
import {watchCssAtlases} from './css-atlas.ts';
import {actionNames,duelActionNames,duelLine,temperNames,type DuelAction} from './duel.ts';
import {spriteAtlas} from './sprite-atlas.ts';
import {paintedTroopArt} from './painted-troops.ts';
import {coachStep,COACH_KEY} from './tutorial.ts';
import {dueLines} from './battle-lines.ts';
import {loadSettings,saveSettings} from './settings.ts';
import {SLOT_COUNT,slotKey,readSlot,slotLabel,readFull,snapshotKeys,restoreKeys,agoText,type FullSlot} from './save-slots.ts';
import {encounterLevels,structureKind,structureFrame,raceGap} from './campaign-rules.ts';
import {readCampaign,freshCampaign,writeCampaign,deployment,levelInfo,award,equip,equipSlot,treasureInfo,type GearSlot,treasures,OFFICERS} from './progression.ts';
import {storyBeats,storyLocations,storyBackdrop,storyAftermath,acts,stories,epilogueLines} from './story.ts';
import {showHub,showQuests,finishRunBattle,finishRunStory,RUN_CHAPTER,type RunHost} from './run-ui.ts';
import {showScenario,campOf,finishIfBattle,finishStoryBattle,type ScenarioHost} from './scenario-ui.ts';
import {scriptOf} from './scenario.ts';
import {optionalOfficers,pickExtras,storySortieLimit,storyCostSheet,unitCost,storyClassAt} from './sortie.ts';
import {isoBackdrop,loadIsoArt,loadPaintedScenes} from './story-iso.ts';
import {loadFigures} from './story-figure.ts';
import {registerCustoms} from './custom.ts';
import {loadMeta as loadMetaForCustoms} from './meta.ts';
import {loadPortraitImages,portraitImage} from './portrait-images.ts';
import {cardFace} from './faces.ts';
import {renderHud,type CardOpts} from './unit-hud.ts';
import {inkChoice} from './ink-choice.ts';
import {duelSplash,duelArena,duelBackdrop,duelModel} from './duel-ui.ts';
// 플레이어가 만든 신장수를 장수록에 올린다(전투 능력·성격·무대 그림).
registerCustoms(loadMetaForCustoms().customOfficers??[]);
// 직접 넣은 초상 그림(저장소 public/portraits와 이 브라우저에 올린 것)을 먼저 읽어 둔다.
void loadPortraitImages('');
const scenarioYear=(id:string)=>scriptOf(id)?.year??'';
import type {ScenarioDeployment} from './progression.ts';
import {loadMeta,saveMeta,recordStory} from './meta.ts';
import {RUN_FLOORS,XP_PER_LEVEL,RELICS} from './roguelike.ts';
import {romance,romanceOf,temperOf} from './romance.ts';
import './style.css';
import catalogue from './campaign.json';
import { Session, chapters, campaignOrder, type Preparation } from './session.ts';
import { Battlefield, classNames, terrainNames, unitName } from './battlefield.ts';
import { Soundscape } from './audio.ts';
import {placeFor,bossNear} from './music.ts';
import { CONTROLLABLE, ignoresRough, awardedSeals, estimatePhysical, estimateStrategy, previewAttack, doubleAttackChance, criticalChance, manhattan, inReach, reachLabel, tierOf, familyOf, classTactics, STRATEGY_TIER_NAMES } from '../../core/src/index.ts';
import type { BattleState, Command, Coord, LogEntry, TerrainKind, Unit } from '../../core/src/index.ts';
import {strategyIconUrl} from './strategy-icons.ts';

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const SAVE_KEY='sama-battle-v2',PROGRESS_KEY='sama-seals-v2';
const sound=new Soundscape(), field=new Battlefield();
/** Developer shortcuts (straight into a late battle) only appear with ?dev in the address. */
const devMode=new URLSearchParams(location.search).has('dev');
/** 새 전투가 쓰는 규칙판: 5 = 조조전 병과 체계(등급 성장·지형 효율·명중/2회 공격/회심 비율). 예전 저장은 저장된 규칙판 그대로. */
const RULES=5 as const;
let session=new Session(),selected='sima_yi',mode='move',threat=false,speed=1,menuOpen=true,aiTimer:ReturnType<typeof setTimeout>|undefined,lastLog=0,resultShown=false;
let saveAvailable=false,hasStarted=false;
try{saveAvailable=!!localStorage.getItem(SAVE_KEY);}catch{/* Private browsing may disable storage. */}
const sideNames={player:'아군',ally:'편입 아군',enemy:'적군',allyAi:'우군'};

$('#app').innerHTML=`<header class="topbar"><button id="brand" class="brand" aria-label="본영"><span class="seal-logo">사</span><span>사마의전<small>사마의 연대기</small></span></button><div class="chapter-breadcrumb" id="arc-crumb">상편 <span>/</span> 살아남는 자</div><nav><button id="sound-toggle" title="전체 소리 켜기/끄기">♪ <span>소리 켜짐</span></button><button id="help">도움말 <kbd>?</kbd></button><button id="settings" aria-label="설정">⚙</button><button id="topbar-save" title="저장 · 불러오기">💾 저장</button><button id="menu">본영</button></nav></header>
<main class="layout"><aside class="left-panel" id="left-panel"><button id="left-close" class="left-close" aria-label="전황 닫기">닫기 ✕</button><div class="eyebrow" id="arc-eyebrow">제1편 <span>상편</span></div><h1 id="stage-title"></h1><p id="stage-subtitle" class="muted"></p><div class="rule"></div><section class="mission"><div class="section-label">전투 목표 <span>목표</span></div><div id="objectives"></div></section><section class="turn-card"><div class="turn-number"><span>차례</span><strong id="turn">01</strong><span id="turn-limit">/ 60</span></div><div id="phase" class="phase"></div><div class="phase-track"><i></i><i></i><i></i><i></i></div></section><section><div class="section-label">현재 차례 부대 <span id="unit-count"></span></div><div id="roster" class="roster"></div></section><p class="roster-note">파랑 · 아군(편입 아군 포함)<br>초록 · NPC 우군 &nbsp; 빨강 · 적군</p><div class="left-bottom"><span class="small-seal">인</span><p>칼을 거두고,<br>때를 기다린다.</p></div></aside>
<section class="battle-panel"><div class="battle-heading"><div><span class="eyebrow" id="year"></span><h2 id="map-name"></h2></div><span class="weather">☀ &nbsp; 맑음 <span>·</span> 바람 약함</span></div><p id="compact-objective"></p><div id="map" class="map"><div class="map-vignette"></div><button id="left-toggle" class="left-toggle" aria-expanded="false" aria-controls="left-panel">☰ 전황</button><div class="compass"><span>북</span><b>✧</b></div><div class="map-controls"><button id="zoom-out" aria-label="축소">−</button><button id="zoom-reset" aria-label="고른 장수에게로">⌖</button><button id="zoom-in" aria-label="확대">＋</button></div><div class="map-legend"><i class="dot teal"></i> 이동 가능 <i class="dot red"></i> 적 시야 / 사거리 <i class="dot gold"></i> 목표</div><div id="unit-hud" class="unit-hud"></div><div id="action-dock" class="action-dock" hidden></div><div id="tile-info">장수를 선택해 첫 수를 두세요.</div><div id="phase-banner" aria-live="polite"></div><div id="battle-line" class="battle-line" aria-live="polite" hidden></div><div id="battle-relics" class="battle-relics" hidden></div><div id="encounter" class="encounter" role="dialog" hidden></div><div id="coach" class="coach" role="status" hidden><p></p><button id="coach-close" aria-label="안내 닫기">닫기</button></div></div><div class="battle-toolbar"><button id="undo">↶ <span>무르기</span> <kbd>Z</kbd></button><button id="threat" aria-pressed="false">◎ <span>위험 범위</span></button><button id="speed">▷ <span>1× 속도</span></button><span id="save-status" role="status">자동 저장 준비</span><button id="end-phase" class="primary">아군 턴 종료 <span>→</span></button></div><div class="dispatch"><span>군보</span><p id="latest-log" aria-live="polite">전장을 살피고 명령을 내려 주십시오.</p><button id="log-button">전투 기록 ↗</button></div></section>
<aside class="right-panel"><div class="section-label">장수 정보 <span>장수</span></div><div id="unit-detail"></div><div class="section-label command-label">전술 명령 <span>명령</span></div><div id="commands" class="commands"></div><p id="command-hint" class="command-hint"></p><div class="tactic-note"><span>책</span><div><strong>전장을 읽는 법</strong><p id="tactical-tip"></p></div></div></aside></main><footer><span>삼국지 · 사마의전</span><span>상편·중편·하편 · 플레이 가능 전장 ${chapters.length}개</span><span>선택 → 이동 → 행동 → 턴 종료</span></footer>
<dialog id="modal"><div id="modal-content"></div></dialog><div id="toast" role="status"></div>`;

function toast(text:string){$('#toast').textContent=text;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
function modal(html:string,closable=true){
  const d=$<HTMLDialogElement>('#modal');$('#modal-content').innerHTML=(closable?'<button class="modal-close" data-close aria-label="닫기">×</button>':'')+html;
  if(!d.open)d.showModal();d.scrollTop=0;$('#modal-content [data-close]')?.addEventListener('click',closeModal);
  d.oncancel=e=>{if(!closable)e.preventDefault();else setTimeout(()=>pump(),0);};
}
function closeModal(){$<HTMLDialogElement>('#modal').close();pump();}
/**
 * 창 내용이 화면보다 길면 내용 전체를 줄여 한 화면에 보이게(가로 화면 PC·휴대폰 공통).
 * 글씨가 읽히지 않을 만큼 줄이지는 않는다(최소 80%). 목록·도감 화면은 줄이지 않고 창 안에서 스크롤한다.
 */
let fitQueued=false;
const SCROLL_SCREENS='.treasure-screen,.troop-evolution,.codex-screen,.fate-map-screen,.save-screen';
function fitModal(){fitQueued=false;const d=$<HTMLDialogElement>('#modal'),c=$('#modal-content');if(!d.open){c.style.zoom='';return;}
  c.style.zoom='';if(c.querySelector(SCROLL_SCREENS))return;
  // 연구: 칸을 고를 때마다 배율이 흔들리지 않게 화면 높이로만 정한다(넘치면 창 안에서 스크롤).
  if(c.querySelector('.research-screen')){if(d.clientHeight<900)c.style.zoom='0.8';return;}const avail=d.clientHeight;let need=d.scrollHeight;if(need<=avail+2)return;
  let z=Math.max(.8,avail/need);c.style.zoom=String(z);need=d.scrollHeight;if(need>avail+2){z=Math.max(.8,z*avail/need);c.style.zoom=String(z);}}
function queueFit(){if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>requestAnimationFrame(fitModal));}
{const c=document.querySelector('#modal-content');if(c){new MutationObserver(queueFit).observe(c,{childList:true,subtree:true,characterData:true});c.addEventListener('load',queueFit,true);addEventListener('resize',queueFit);document.fonts?.ready.then(queueFit);}}
function showEpilogue(){
  const p=progress(),total=campaignOrder.length*3;
  const got=campaignOrder.reduce((n,i)=>{const id=chapters[i]!.stage.id;return n+new Set([...(p[id+':normal']??[]),...(p[id+':extreme']??[])]).size;},0);
  modal(`<div class="briefing epilogue"><div class="eyebrow">에필로그 · 251년 가을</div><h2>칼을 감춘 사람</h2>${epilogueLines(p).map(l=>`<p>${l}</p>`).join('')}<p>그해 가을, 사마의는 낙양에서 숨을 거둔다. 열네 해 뒤 손자 사마염이 위의 선양을 받아 진을 세운다.</p><p class="muted">모은 인장 ${got} / ${total}</p><button id="epilogue-close" class="primary">연의 회상</button></div>`,false);
  $('#epilogue-close').onclick=showChronicle;
}
function progress():Record<string,number[]>{try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)??'{}') as Record<string,number[]>;}catch{return {};}}
/** 이긴 적이 있는가: 일반·극한 어느 쪽이든 승리 기록이 남았거나(인장 조건과 무관), 천명의 길·원정에서 이긴 연의 전장. */
function cleared(chapter:number){const id=chapters[chapter]!.stage.id,p=progress();return Array.isArray(p[`${id}:normal`])||Array.isArray(p[`${id}:extreme`])||loadMeta().chronicle.includes(id);}
function unlocked(chapter:number){const i=campaignOrder.indexOf(chapter);return cleared(chapter)||i===0||cleared(campaignOrder[i-1]!);}
let campaign=readCampaign();
// Old clear seals become one-time campaign rewards; old battles still replay their old rules.
for(const chapter of campaignOrder)for(const difficulty of ['normal','extreme'] as const){const id=chapters[chapter]!.stage.id;if(progress()[id+':'+difficulty]?.includes(1))award(campaign,id,difficulty,chapters[chapter]!.stage.deployment.forced,[1]);}
try{writeCampaign(campaign);}catch{/* Session remains playable without persistent storage. */}
const officerNames:Record<string,string>={sima_yi:'사마의',sima_lang:'사마랑',sima_fang:'사마방',cao_zhen:'조진'};
function growthText(){const l=levelInfo(campaign.xp.sima_yi??0);return '사마의 Lv.'+l.level+' · 경험치 '+l.xp+'/'+l.next;}
function saveCampaign(){try{writeCampaign(campaign);return true;}catch{toast('성장 기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');return false;}}
function storyScene(chapter:number,beat=0,fromArt?:number){
  if(!storyReady){menuOpen=true;modal(waitPanel('이야기 준비 중','인물과 배경 그림을 마저 받고 있습니다. 끝나면 바로 시작합니다.'),false);void storyArt.then(()=>storyScene(chapter,beat,fromArt));return;}
  menuOpen=true;clearTimeout(aiTimer);sound.scene=chapter===4?'dream':'camp';void sound.start().then(updateSound);
  const c=chapters[chapter]!,beats=storyBeats[c.stage.id]!,b=beats[beat]!;
  const location=storyLocations[c.stage.id]![beat]!;
  const previous=fromArt===undefined?undefined:{art:fromArt};
  const backdrop=(index:number,extra='')=>`<div class="story-backdrop ${extra}" style="${storyBackdrop(index)}"></div>`;
  const companion=location.actor??(b.actor===4?(chapter===1||chapter===5||chapter===6?3:0):b.actor);
  modal(`<div class="story-scene scene-${chapter}"><div class="eyebrow">${c.year} · 이야기 ${beat+1}/${beats.length}</div><h2>${stories[chapter]![0]}</h2>
  <div class="story-stage pose-${b.pose}" aria-label="${location.name} · 2D 장수 이야기 장면">
    ${previous?backdrop(previous.art,'outgoing'):''}${backdrop(location.art,'incoming')}
    <div class="story-light"></div><span class="story-location">${location.name}</span>
    <div class="story-actor hero ${b.actor===4?'speaking':''}" style="${storyActorStyle(chapter===2?'소년 사마의':'사마의',4)}" role="img" aria-label="${chapter===2?'소년 사마의':'사마의'}"></div>
    <div class="story-actor companion ${b.actor!==4?'speaking':''}" style="${storyActorStyle(location.companion,companion)}" role="img" aria-label="${location.companion}"></div>
  </div>${dialogueCaption(b.speaker,b.line)}
  <div class="modal-actions"><button id="story-back" ${beat===0?'disabled':''}>← 이전 장면</button><button id="story-skip">군의로 건너뛰기</button><button class="primary" id="story-next">${beat===beats.length-1?'출진 준비':'다음 이야기'} →</button></div></div>`,false);
  $('#story-back').onclick=()=>{if(beat>0)storyScene(chapter,beat-1,location.art);};
  $('#story-skip').onclick=()=>briefing(chapter);$('#story-next').onclick=()=>beat+1<beats.length?storyScene(chapter,beat+1,location.art):briefing(chapter);
}
let menuArc=1;
const resumeSaved=()=>{try{session=Session.load(JSON.parse(localStorage.getItem(SAVE_KEY)??'null'));activate();toast('저장한 전투를 불러왔습니다.');}catch{toast('현재 버전의 저장 기록을 읽지 못했습니다.');}};
const runHost:RunHost={modal:(html,closable)=>modal(html,closable),showMenu:()=>showMenu(),toast:t=>toast(t),startBattle:(dep,seed)=>{session=new Session(RUN_CHAPTER,'normal',seed,'survival',RULES,dep);activate();persist();},
  startStory:(chapter,dep,seed)=>{session=new Session(chapter,'normal',seed,'survival',RULES,dep);activate();persist();},
  showChronicle:()=>showChronicle(),showScenario:()=>showScenario(scenarioHost),showExpeditions:(tab?:Expedition['kind'])=>showExpeditions(tab),showTroops:()=>showTroopGallery(),showSlots:()=>showSlots(),
  get resumeSaved(){return saveAvailable&&!openRunSession()?resumeSaved:undefined;},
  liveRunBattle:()=>{const s=openRunSession();if(!s)return undefined;const d=s.deployment!;return d.run?{seed:d.run.seed,floor:d.run.floor,kind:d.run.kind}:{seed:d.runStory!.seed,floor:d.runStory!.floor,kind:'story'};},
  backToBattle:()=>{const s=openRunSession();if(s&&s!==session){session=s;activate();return;}menuOpen=false;closeModal();}};

/** 시나리오 모드(본편)가 쓰는 연결: 연의 장의 정비·전투와 가상 전장 출진, 사마의의 성장 기록. */
const scenarioHost:ScenarioHost={modal:(html,closable)=>{menuOpen=true;clearTimeout(aiTimer);sound.scene='camp';modal(html,closable);},showSlots:()=>showSlots(()=>showScenario(scenarioHost)),showMenu:()=>showMenu(),toast:t=>toast(t),
  storyBriefing:(chapter,sc)=>briefing(chapter,undefined,sc),
  startBattle:(dep,seed,difficulty='normal')=>{session=new Session(RUN_CHAPTER,difficulty,seed,'survival',RULES,dep);activate();persist();},
  hero:()=>{const l=levelInfo(campaign.xp.sima_yi??0);return {level:l.level,xp:l.next?Math.min(99,Math.floor(l.xp/l.next*100)):0};},
  addHeroXp:n=>{const before=levelInfo(campaign.xp.sima_yi??0).level;campaign.xp.sima_yi=(campaign.xp.sima_yi??0)+Math.max(0,n);saveCampaign();const after=levelInfo(campaign.xp.sima_yi).level;return [`사마의 경험치 +${n}`,...(after>before?[`레벨 상승 · 사마의 Lv.${after}`]:[])];},
  heroLoadout:()=>campaign.loadouts,
  // 로그라이크 새 회차: 연의 진행(사마의 레벨·보물·장비)을 처음으로. 해금 '노련한 출발'이면 사마의 Lv.6.
  resetCampaign:veteran=>{campaign=freshCampaign();if(veteran)while(levelInfo(campaign.xp.sima_yi??0).level<6)campaign.xp.sima_yi=(campaign.xp.sima_yi??0)+10;saveCampaign();}};/** 끝나지 않은 원정 전투: 지금 화면의 것, 없으면 자동 저장된 것. */
function openRunSession(){
  const inRun=(s:Session)=>!!(s.deployment?.run||s.deployment?.runStory)&&s.state.outcome==='ongoing';
  if(hasStarted&&inRun(session))return session;
  try{const s=Session.load(JSON.parse(localStorage.getItem(SAVE_KEY)??'null'));return inRun(s)?s:undefined;}catch{return undefined;}
}
/** 첫 화면: 천명의 원정 본영. 게임의 중심은 원정이다. */
function showMenu(){menuOpen=true;clearTimeout(aiTimer);sound.scene='title';sound.combat=false;showHub(runHost);}
/** 연의 회상: 원정에서 이긴 연의 전장(또는 예전 연의 진행에서 깬 전장)을 다시 치른다. */
function replayable(chapter:number){return cleared(chapter)||loadMeta().chronicle.includes(chapters[chapter]!.stage.id);}
function showChronicle(){
  menuOpen=true;clearTimeout(aiTimer);sound.scene='title';sound.combat=false;
  const p=progress(),names=['살아남는 자','맞서는 자','거머쥐는 자'];
  modal(`<div class="campaign"><div class="campaign-art"><img src="sima-portrait-v2.webp" alt="부채를 든 사마의 창작 초상"><div class="art-caption">사 마 의 <span>인내 끝에, 천하를 읽다</span></div></div><div class="campaign-copy"><div class="eyebrow">삼국지 · 전략 연대기</div><p class="chapter-pretitle">연의 회상 · 원정에서 이긴 전장을 다시 치른다</p><h2>사마의전</h2><p class="tagline">칼을 거두고, 때를 기다린다.</p><p class="growth-summary">${growthText()} · 보물 ${campaign.treasures.length}점</p><div class="arc-tabs" role="tablist" aria-label="연의 편 선택">${['상편','중편','하편'].map((n,i)=>`<button role="tab" aria-selected="${menuArc===i+1}" data-arc="${i+1}">${n}<small>${[11,14,7][i]} 전장</small></button>`).join('')}</div><div class="section-label">${names[menuArc-1]} <span>${`${[11,14,7][menuArc-1]}전장 · 전체 ${chapters.length}개 플레이 가능`}</span></div><div class="campaign-path">${catalogue.filter(c=>c.id.startsWith(`S${menuArc}-`)).map(c=>{
    const i=chapters.findIndex(x=>x.stage.id===c.id),ready=i>=0,open=ready&&(replayable(i)||unlocked(i)),won=ready&&cleared(i);
    const act=acts.find(a=>a.arc===menuArc&&a.from===Number(c.id.slice(-2)));
    return `${act?'<h3 class="act-title">'+act.title+'</h3>':''}<button class="journey-node ${won?'cleared':''}" data-chapter="${i}" ${open?'':'disabled'}><span class="chapter-no">${c.id.slice(-2)}</span><span><strong>${c.name}</strong><small>${ready?won?'완료 · 일반 / 극한 재도전':open?'출진 가능 · 권장 Lv.'+encounterLevels[c.id]+' · '+chapters[i]!.label:'앞 장을 이기면 열린다':'제작 예정'}</small></span><b>${won?'◆':open?'→':'·'}</b></button>`;
  }).join('')}</div><div class="menu-actions"><button id="run-open" class="primary">← 원정 본영</button>${saveAvailable?'<button id="resume" class="primary">전투 이어하기 →</button>':''}${hasStarted?'<button id="back-battle">현재 전장</button>':''}${devMode?'<button id="art-preview">개발 · 한중 바로 체험</button>':''}<button id="save-slots">저장 칸</button><button id="expeditions">수련 · 보물 인연</button><button id="troop-gallery">병종 도감</button><button id="chronicle">연의 기록</button></div><p class="prototype-note">${['상편 11전장: 하내의 밤부터 동오 설득까지, 살아남는 법을 배운다.','중편 14전장: 무위 반란부터 오장원까지, 제갈량과 맞선다.','하편 7전장: 요동 원정부터 고평릉의 변과 마지막 출정까지, 권력을 거머쥔다.'][menuArc-1]??''}<br>기록은 이 브라우저에 저장됩니다.</p></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(b=>b.onclick=()=>storyScene(Number(b.dataset.chapter)));
  document.querySelectorAll<HTMLButtonElement>('[data-arc]').forEach(b=>b.onclick=()=>{menuArc=Number(b.dataset.arc);showChronicle();});
  $('#expeditions').onclick=()=>showExpeditions();
  $('#run-open').onclick=showMenu;
  $('#troop-gallery').onclick=()=>showTroopGallery();
  $('#art-preview')?.addEventListener('click',()=>{session=new Session(1,'normal',215,'survival',RULES,deployment(campaign,true));activate();});
  $('#chronicle').onclick=()=>{modal(`<div class="briefing"><div class="eyebrow">연의 기록</div><h2>지나온 전장</h2>${campaignOrder.map(i=>`<p>${chapters[i]!.stage.subtitle} · ${cleared(i)?'일반 완료':'미완료'} · 인장 ${(p[chapters[i]!.stage.id+':normal']??[]).length}/3</p>`).join('')}<p>동료는 이야기에 따라 합류합니다. 패배해도 다음 출진의 기본 보급은 줄어들지 않습니다.</p><button id="record-back">← 연의 회상</button></div>`,false);$('#record-back').onclick=showChronicle;};
  $('#resume')?.addEventListener('click',()=>{try{session=Session.load(JSON.parse(localStorage.getItem(SAVE_KEY)??'null'));activate();toast('저장한 전투를 불러왔습니다.');}catch{toast('현재 버전의 저장 기록을 읽지 못했습니다.');}});
  $('#back-battle')?.addEventListener('click',()=>{menuOpen=false;closeModal();});
  $('#save-slots').onclick=()=>showSlots();
}
function readStore(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function showSlots(back:()=>void=showMenu){
  const battle=hasStarted&&session.state.outcome==='ongoing';
  const where=()=>{if(battle){const c=chapters[session.chapter]!;return `전투 중 · ${session.deployment?.run?`원정 ${session.deployment.run.floor}층`:c.stage.subtitle??c.stage.title} · ${session.state.turn}턴`;}
    try{const sc=JSON.parse(localStorage.getItem('sama-scenario-v1')??'null') as {run?:{no:number};done?:string[]}|null;if(sc?.done?.length)return `천명의 길${sc.run?` 제${sc.run.no}회차`:''} · 마친 장 ${sc.done.length}`;}catch{/* 없음 */}return '본영';};
  const rows=Array.from({length:SLOT_COUNT},(_,i)=>{const raw=readStore(slotKey(i+1)),full=readFull(raw),old=full?undefined:readSlot(raw);
    const label=full?`<b>${full.meta.where}</b><small>${agoText(full.meta.at)}${full.meta.hero?` · 사마의 Lv.${full.meta.hero}`:''}${full.meta.mandate!==undefined?` · 천명 ${full.meta.mandate}`:''} · 진행 전체</small>`:old?`<b>${old.meta.title}</b><small>${slotLabel(old)} · 전투만</small>`:'<small>비어 있음</small>';
    return `<div class="slot-row"><div><strong>${i+1}번 칸</strong>${label}</div><div class="slot-actions"><button data-slot-save="${i+1}" class="${full||old?'':'primary'}">여기에 저장</button>${full||old?`<button data-slot-load="${i+1}" class="primary">불러오기</button><button data-slot-clear="${i+1}" aria-label="${i+1}번 칸 지우기">지우기</button>`:''}</div></div>`;}).join('');
  modal(`<div class="briefing save-screen"><div class="eyebrow">기록 · 저장과 불러오기</div><h2>저장 칸</h2>
    <ul class="save-help"><li><b>자동 저장</b> 전투는 행동마다, 천명의 길은 장을 마칠 때마다 저절로 저장된다. 본영의 「이어하기」가 그것을 연다.</li>
    <li><b>저장 칸</b> 지금 이 순간의 <em>전체</em>(천명의 길 진행·연구·천명·보물·장수 성장·진행 중 전투)를 통째로 담는다. 갈림길 앞에서 저장해 두고, 일이 틀어지면 불러온다.</li>
    <li>지금: <b>${where()}</b></li></ul>${rows}<div class="modal-actions"><button id="slots-back">← 돌아가기</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-slot-save]').forEach(b=>b.onclick=()=>{
    if(battle)persist();
    const m=loadMeta(),rec:FullSlot={full:1,meta:{title:where(),where:where(),at:Date.now(),hero:levelInfo(campaign.xp.sima_yi??0).level,mandate:m.mandate},keys:snapshotKeys()};
    try{localStorage.setItem(slotKey(Number(b.dataset.slotSave)),JSON.stringify(rec));toast(`${b.dataset.slotSave}번 칸에 저장했습니다.`);}catch{toast('이 브라우저에서는 저장할 수 없습니다(저장 공간 부족).');}
    showSlots(back);});
  document.querySelectorAll<HTMLButtonElement>('[data-slot-load]').forEach(b=>b.onclick=()=>{
    const raw=readStore(slotKey(Number(b.dataset.slotLoad))),full=readFull(raw);
    if(full){try{restoreKeys(full.keys);toast(`${b.dataset.slotLoad}번 칸을 불러옵니다…`);setTimeout(()=>location.reload(),400);}catch{toast('불러오지 못했습니다.');}return;}
    const r=readSlot(raw);try{session=Session.load(r!.save as Parameters<typeof Session.load>[0]);activate();toast(`${b.dataset.slotLoad}번 칸을 불러왔습니다.`);}catch{toast('이 칸은 현재 버전에서 읽을 수 없습니다.');}});
  document.querySelectorAll<HTMLButtonElement>('[data-slot-clear]').forEach(b=>b.onclick=()=>{try{localStorage.removeItem(slotKey(Number(b.dataset.slotClear)));}catch{/* nothing to clear */}showSlots(back);});
  $('#slots-back').onclick=()=>{if(battle){$<HTMLDialogElement>('#modal').close();menuOpen=false;render();pump();}else back();};
}

function briefing(chapter:number,expeditionId?:string,scenario?:ScenarioDeployment){
  const expedition=expeditions.find(m=>m.id===expeditionId);
  // 시나리오 모드의 연의 장은 이야기 다음에 반드시 이 정비를 거친다(회상 잠금과 무관).
  if(!scenario&&(expedition?!canExpedition(campaign,expedition.id):!(replayable(chapter)||unlocked(chapter))))return;
  const c=expedition?{...chapters[7]!,year:'외전 · 권장 Lv.'+expedition.level,stage:{...chapters[7]!.stage,subtitle:expedition.name}}:chapters[chapter]!,intro=chapter===2,escape=chapter===0;
  let supports=[...supportOptions.slice(0,2)];
  const recommendation=expedition?recommendExpeditionSupport(expedition.id):undefined;
  let extras:string[]=[];
  const dispatch=(preview=false)=>{const d=deployment(campaign,true);if(!expedition)d.wide=1;if(scenario)d.trial=1;if(scenario)d.scenario=structuredClone(scenario);
    // 연구(로그라이크의 영구 강화)는 연의·회상·수련 어디서든 함께 간다.
    if(!preview){const m=loadMeta(),p=deploymentPerks(m,['사마의',...Object.keys(m.officerPerks??{})]);if(p)d.perks=p;}if(!expedition&&extras.length)d.extraOfficers=pickExtras(c.stage,c.map,extras,difficulty,d.levels);if(expedition)d.mission={id:expedition.id,runId:preview?'preview':crypto.randomUUID(),version:4,balance:1,supportClasses:[...supports]};return d;};
  const mission=chapter===7?'사마의와 조진을 생존시키고 양앙을 포함한 전초 수비대 7부대를 모두 격퇴하십시오. 수비대장만 쓰러뜨려서는 끝나지 않습니다.':chapter===6?'조조를 보호하며 마초를 격퇴한 뒤, 사마의 또는 조진으로 관문 안 금빛 구역을 점령하십시오. 조조·사마의·조진 퇴각 시 패배합니다.':chapter===5?'수송대 두 부대 중 최소 한 부대를 선택한 동쪽 출구로 호위하십시오. 두 수송대가 모두 소실되거나 사마의·조진이 퇴각하면 실패합니다.':chapter===4?'진궁·여포·주유를 차례로 격파한 다음, 전차의 방해를 뚫고 황제 옆 금빛 칸에 도달하십시오.':chapter===3?'길잡이와 대화해 탈출로를 정하고, 추격 압박이 한계에 닿기 전에 형제 모두 선택한 출구에 도착하십시오.':intro?'사마의로 창고에 도달한 뒤 민중에게 인접해 무장시키고 습격대를 격퇴하십시오.':escape?'두 형제 모두 남문에 도착하고 통행료 1,000전을 지불하십시오.':'수비대장을 격퇴한 뒤 본대로 중앙 성채를 점령하십시오. 경쟁 우군 선점 시 패배합니다.';
  const rule=chapter===7?'26×20 산길 전장. 굽은 큰길은 기병이, 숲길은 보병이 접근하기 좋습니다. 본대 2명 뒤 편입 아군 4부대를 직접 지휘합니다. 노병은 2~3칸에서 사격하고 풍수사는 3칸 안의 아군을 치유합니다. 일반 18턴 / 극한 16턴 안에 완료하면 신속 인장을 얻습니다.':chapter===6?'28×20 관문 전장. 허저를 전방 또는 후방에 배치합니다. 3턴 적 차례에 서쪽 복병 2기가 출현합니다. 성문 HP 95, 감시탑 HP 110 / 사거리 1~5. 포차로 문을 열고 풍수사의 치유로 호위 병력을 유지하십시오. 마초 격퇴 시 감시탑이 철수하고 관문 수비대가 2턴 혼란에 빠집니다.':chapter===5?'24×18 강변 전장. 수송대는 우군 차례에 최대 3칸 자동 이동하며 공격하지 않습니다. 교량길은 짧지만 사격대가 지키고, 남쪽 길은 길지만 전방을 우회합니다. 3턴 적 차례에 후방 기병 2부대가 나타납니다. 노병과 방패병으로 길을 열고 후방을 지키십시오.':chapter===4?'대결을 넘길 때 체력·책략·상태이상을 회복하고 시작 지점으로 돌아옵니다. 구급약은 보충되지 않습니다. 마지막 구간은 전멸전이 아닙니다. 무르기와 목표 전환 직전 복원이 가능합니다.':chapter===3?'일반 압박 한계 12, 극한 9. 매 턴 압박이 1씩 오릅니다. 거짓 군령 강행은 압박 +2와 궁병 매복을 부릅니다. 3턴 적 차례에 추격 기병 2부대가 서쪽에서 등장합니다.':intro?'소년 사마의와 민중은 공격할 수 없습니다. 사마의가 창고를 열면 인접한 민중이 보병으로 전환됩니다. 사마방·형제의 생존이 필수이며, 민중 전멸도 패배입니다.':escape?'지참금 3,000전. 첫 매수 1,000전, 이후 1,500전. 살피기는 행동 1회를 소비해 순찰 경로를 공개합니다.':'48×36 전장. 성문 각 칸 HP 95 · 감시탑 HP 110 / 사거리 1~5. 문을 파괴하면 통로가 열립니다. 중앙 석교와 남쪽 목교로 진격하며, 미니맵 클릭으로 먼 지점을 확인합니다. 본대 다음 편입 아군 8기를 직접 지휘합니다. 편입 아군도 손실에 포함됩니다. 경쟁 우군은 지시를 받지 않습니다.';
  let officer=c.stage.deployment.forced[0]!,filter='weapon',inspect=campaign.treasures[0]??treasures[0]!.id,prep:Preparation='survival',difficulty:'normal'|'extreme'='normal';
  /** 출진 장수: 필수(잠김) + 선택(난이도별 인원 제한). */
  const sortieMarkup=()=>{const {allowed,capacity}=optionalOfficers(c.stage,c.map),limit=Math.min(capacity,storySortieLimit(difficulty));
    const lv=deployment(campaign,true).levels,ext=difficulty==='extreme',sheet=ext?storyCostSheet(c.stage,pickExtras(c.stage,c.map,extras,difficulty,lv),lv):undefined;
    const costOf=(id:string)=>{const r=sheet?.rows.find(x=>x.id===id);return r?r.cost:unitCost(storyClassAt(id,lv[id]??1));};
    const tag=(id:string)=>{if(!ext)return '';const r=sheet?.rows.find(x=>x.id===id);return ` · 코스트 ${costOf(id)}${r&&r.unitClass!==r.natural?` (${classNames[r.unitClass]??r.unitClass}로 낮춰 출진)`:''}`;};
    return `<fieldset class="sortie-picker"><legend>출진 장수 · 필수 ${c.stage.deployment.forced.length}명${allowed.length?` + 선택 최대 ${limit}명`:''}${ext?` · 극한 출진 코스트 <b class="${sheet!.used>sheet!.cap?'over':''}">${sheet!.used}/${sheet!.cap}</b>`:''}</legend>
    ${c.stage.deployment.forced.map(id=>`<span class="sortie-chip forced">🔒 ${officerNames[id]??id}${tag(id)}</span>`).join('')}
    ${allowed.map(id=>`<label class="sortie-chip"><input type="checkbox" data-extra="${id}" ${extras.includes(id)?'checked':''}> ${officerNames[id]??id} · Lv.${levelInfo(campaign.xp[id]??0).level}${ext?` · 코스트 ${costOf(id)}`:''}</label>`).join('')}
    ${ext?'<small>극한은 출진 코스트 합이 상한을 넘으면 더 데려갈 수 없다. 병종 코스트: 1단 2 · 2단 3 · 3단 4 · 4단 6, 기마·코끼리 +1. 필수 장수만으로 넘으면 한 단계 낮은 병종으로 나선다.</small>':''}
    ${allowed.length?'':'<small>이 장은 이야기상 정해진 장수만 출진한다.</small>'}</fieldset>`;};
  const draw=()=>{
    const previousScroll=$('#modal-content .camp-screen')?$<HTMLDialogElement>('#modal').scrollTop:0;
    const preview=new Session(chapter,difficulty,215,prep,RULES,dispatch(true));
    const units=preview.state.living().filter(u=>u.side==='player'||u.side==='ally');
    modal(`<div class="briefing camp-screen"><div class="prep-backdrop" style="${isoBackdrop(expedition?6:16)}"></div><div class="eyebrow">${c.year} · 출진 전 정비</div><h2>${c.stage.subtitle}</h2><p class="camp-mission">${expedition?trialGoalText(expedition.id):mission}</p>${expedition?`<fieldset class="support-picker"><legend>지원 병종 편성 · 두 부대 선택</legend>${supports.map((kind,i)=>`<label>지원 ${i+1}<select data-support="${i}">${supportOptions.map(k=>`<option value="${k}" ${kind===k?'selected':''}>${classNames[k]}</option>`).join('')}</select><small>${troopAdvice[kind]}</small></label>`).join('')}<div class="support-recommendation"><b>목표·지형에 맞는 편성</b><p>${recommendation!.classes.map(k=>classNames[k]).join(' + ')} · ${recommendation!.reason}</p><button id="recommend-support" type="button">추천 병종으로 편성</button><small>추천은 선택 사항입니다. 병종은 전투마다 다시 고를 수 있습니다.</small></div>${supportWarnings(units).map(t=>`<p class="composition-note">${t}</p>`).join('')}</fieldset>`:''}${expedition?`<p class="trial-objective">${growthAdvice(campaign,expedition.level)}<br>지원 부대는 권장 레벨과 사마의 레벨 +1 중 낮은 레벨로 출진합니다.</p>`:''}${expedition?'':sortieMarkup()}${campMarkup(campaign,units,officer,filter,inspect,faceFor,scenario?.relics)}<details><summary>작전·지형 정보</summary><p>${expedition?trialTactics(expedition.id)+' '+trialGoalText(expedition.id)+' · 사마의·조진 생존 필수. 수련은 반복 경험치, 보물 외전은 첫 승리 보상을 지급합니다.':rule}</p></details><div class="preparations">${[['survival','생존','체력 +25'],['strategy','책략','MP +18'],['command','지휘','이동 +1']].map(([id,name,desc])=>`<label><input type="radio" name="preparation" value="${id}" ${prep===id?'checked':''}>${name} · ${desc}</label>`).join('')}</div><div class="difficulty"><label><input type="radio" name="difficulty" value="normal" ${difficulty==='normal'?'checked':''}> 일반</label><label><input type="radio" name="difficulty" value="extreme" ${difficulty==='extreme'?'checked':''} ${!expedition&&cleared(chapter)?'':'disabled'}> 극한 · 일반 완료 후</label></div><div class="modal-actions"><button id="brief-back">← ${scenario?'장 목록':expedition?'수련 · 보물 인연':'연의 회상'}</button>${scenario?'<button id="brief-camp">← 진영으로</button>':''}<span>구급약 2 · ${growthText()}</span><button id="deploy" class="primary">출진한다 →</button></div></div>`,false);
    document.querySelectorAll<HTMLButtonElement>('[data-officer]').forEach(b=>b.onclick=()=>{officer=b.dataset.officer!;draw();});
    document.querySelectorAll<HTMLButtonElement>('[data-gear-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.gearFilter!;draw();});
    document.querySelectorAll<HTMLButtonElement>('[data-treasure]').forEach(b=>b.onclick=()=>{inspect=b.dataset.treasure!;draw();});
    $('#equip-treasure')?.addEventListener('click',()=>{if(equipSlot(campaign,officer,treasureInfo(inspect).slot,inspect)){saveCampaign();draw();}});
    document.querySelectorAll<HTMLButtonElement>('[data-equip-id]').forEach(b=>b.onclick=()=>{const id=b.dataset.equipId!;inspect=id;if(equipSlot(campaign,officer,treasureInfo(id).slot,id)){saveCampaign();toast(`${treasures.find(t=>t.id===id)?.name??'보물'} 장착`);}draw();});
    document.querySelectorAll<HTMLButtonElement>('[data-unequip]').forEach(b=>b.onclick=()=>{if(equipSlot(campaign,officer,b.dataset.unequip as GearSlot,'')){saveCampaign();draw();}});
    document.querySelectorAll<HTMLInputElement>('[name=preparation]').forEach(el=>el.onchange=()=>{prep=el.value as Preparation;draw();});
    document.querySelectorAll<HTMLInputElement>('[name=difficulty]').forEach(el=>el.onchange=()=>{difficulty=el.value as 'normal'|'extreme';extras=pickExtras(c.stage,c.map,extras,difficulty,deployment(campaign,true).levels);draw();});
    document.querySelectorAll<HTMLInputElement>('[data-extra]').forEach(el=>el.onchange=()=>{const id=el.dataset.extra!;const next=el.checked?[...extras,id]:extras.filter(x=>x!==id);const ok=pickExtras(c.stage,c.map,next,difficulty,deployment(campaign,true).levels);if(el.checked&&!ok.includes(id)){el.checked=false;toast(difficulty==='extreme'?'극한 출진 코스트 상한을 넘어 더 데려갈 수 없습니다.':`이 장에는 ${storySortieLimit(difficulty)}명까지(남은 출진 칸 ${optionalOfficers(c.stage,c.map).capacity})만 더 데려갈 수 있습니다.`);return;}extras=ok;draw();});
    $('#brief-back').onclick=scenario?()=>showScenario(scenarioHost,scenario.chapter):expedition?()=>showExpeditions(expedition.kind):showChronicle;
    if(scenario)$('#brief-camp').onclick=()=>campOf(scenarioHost,scenario.chapter);
    document.querySelectorAll<HTMLSelectElement>('[data-support]').forEach(el=>el.onchange=()=>{const k=supportOptions.find(k=>k===el.value);if(k){supports[Number(el.dataset.support)]=k;draw();}});
    $('#recommend-support')?.addEventListener('click',()=>{if(recommendation){supports=[...recommendation.classes];draw();}});
    $('#deploy').onclick=()=>{session=new Session(chapter,difficulty,expedition?Date.now()%100000:215,prep,RULES,dispatch());activate();persist();};
    $<HTMLDialogElement>('#modal').scrollTop=previousScroll;
  };draw();
}

let duelPresented=false;
/** 장수 열전: 얼굴을 고르면 그 장수의 무력·능력과 고유특성만 보인다(전체 표는 두지 않는다). */
function showTroopGallery(group:EvoGroup='all'){
 menuOpen=true;clearTimeout(aiTimer);
 modal(`<div class="briefing troop-evolution"><div class="eyebrow">병종 · 진화표</div><h2>병종은 이렇게 강해진다</h2><p class="muted">레벨이 오르면 진화하고, 공격 범위가 넓어진다.</p>${evolutionChart(group)}<div class="modal-actions"><button id="troop-back">← 본영</button></div></div>`,false);
 document.querySelectorAll<HTMLButtonElement>('[data-evo-group]').forEach(b=>b.onclick=()=>showTroopGallery(b.dataset.evoGroup as EvoGroup));
 void paintArmor();$('#troop-back').onclick=showMenu;
}
function showExpeditions(tab:Expedition['kind']='challenge'){
 menuOpen=true;clearTimeout(aiTimer);
 const done=(m:Expedition)=>m.kind==='quest'?(campaign.quests??[]).includes(m.id):m.kind==='challenge'?(campaign.challenges??[]).includes(m.id):false;
 const left=(m:Expedition)=>treasures.filter(t=>t.quest===m.id&&!campaign.treasures.includes(t.id)).length;
 const reward=(m:Expedition)=>m.kind==='training'?'승리 경험치 +'+trainingXp(campaign,m):m.kind==='bounty'?(left(m)?'승리마다 보물 1점 · 남은 보물 '+left(m):'보물을 모두 모음 · 경험치만'):done(m)?(m.kind==='challenge'?'돌파 완료':'인연 완료'):m.kind==='challenge'?'첫 돌파 보물 '+treasures.filter(t=>t.quest===m.id).map(t=>t.name).join('·'):'보물 4종';
 const lock=(m:Expedition)=>m.kind==='challenge'&&m.step!>1&&!(campaign.challenges??[]).includes('C'+String(m.step!-1).padStart(2,'0'))?(m.step!-1)+'단계를 먼저 넘으세요':'본편 '+m.requires+'승 필요 ('+storyWins(campaign)+'/'+m.requires+')';
 const card=(m:Expedition)=>`<button data-expedition="${m.id}" class="${m.kind}${done(m)?' done':''}" ${canExpedition(campaign,m.id)?'':'disabled'}><strong>${m.kind==='challenge'?`<em class="step">${m.step}</em>${m.name}`:`${m.name} · ${trialGoals[m.id]!.name}`}</strong><small>권장 Lv.${m.level} · ${reward(m)} · ${layoutName(m.id)}<br>${canExpedition(campaign,m.id)?'도전 가능':lock(m)}</small></button>`;
 const cleared=(campaign.challenges??[]).length;
 const sections:Array<[Expedition['kind'],string,string]>=[
  ['challenge','도전 퀘스트 · 10단계',`앞 단계를 넘어야 다음 단계가 열립니다. 단계마다 적이 늘고 강해지며 증원이 몰려옵니다. 5·10단계에는 수문장이 기다립니다. 돌파 ${cleared}/10`],
  ['bounty','반복 퀘스트 · 보물 사냥','이길 때마다 그 사냥터의 보물 중 아직 없는 것 하나를 얻습니다. 몇 번이든 다시 할 수 있습니다.'],
  ['quest','보물 인연 · 첫 승리마다 보물 4종',''],
  ['training','반복 수련','승리마다 경험치를 얻고, 수련장마다 첫 승리에 보물 2종을 줍니다.'],
 ];
 const [,title,note]=sections.find(x=>x[0]===tab)!;
 modal(`<div class="briefing expedition-hub"><div class="eyebrow">연무장 · 반복·도전 퀘스트</div><h2>다음 승리를 준비하다</h2><p>${growthText()} · 도전 ${cleared}/10 · 보물 사냥 ${campaign.bountyWins??0}승 · 보물 외전 ${campaign.quests?.length??0}/11 · 수련 ${campaign.trainingWins??0}승</p><div class="expedition-tabs" role="tablist">${sections.map(([kind,label])=>`<button role="tab" data-exp-tab="${kind}" class="${kind===tab?'on':''}" aria-selected="${kind===tab}">${label.split(' · ')[0]}</button>`).join('')}</div><h3>${title}</h3>${note?`<p class="muted">${note}</p>`:''}<div class="expedition-grid${tab==='challenge'?' challenge-ladder':''}">${expeditions.filter(m=>m.kind===tab).map(card).join('')}</div><p class="muted">권장 레벨보다 4레벨 이상 높으면 수련 경험치가 단계적으로 줄어듭니다. 보물 외전과 도전의 경험치·보물은 첫 승리 보상입니다.</p><button id="expedition-back">← 반복 퀘스트</button></div>`,false);
 document.querySelectorAll<HTMLButtonElement>('[data-exp-tab]').forEach(el=>el.onclick=()=>showExpeditions(el.dataset.expTab as Expedition['kind']));
 document.querySelectorAll<HTMLButtonElement>('[data-expedition]').forEach(el=>el.onclick=()=>expeditionStory(el.dataset.expedition!));$('#expedition-back').onclick=()=>showQuests(runHost);
}
function expeditionStory(id:string,beat=0){const m=expeditions.find(x=>x.id===id);if(!m||!canExpedition(campaign,id))return;const scenes=trialStory(m.id,m.name,m.art,m.lines),scene=scenes[beat]!,spoken=splitSpokenLine(scene.line),heroSpeaking=spoken.speaker==='사마의',other=heroSpeaking?'조진':spoken.speaker;
 modal(`<div class="story-scene"><div class="eyebrow">${KIND_LABEL[m.kind]} · ${beat+1}/${scenes.length} · ${scene.place}</div><h2>${m.name}</h2><p class="trial-objective">${trialGoalText(id)}</p><div class="story-stage"><div class="story-backdrop incoming" style="${storyBackdrop(scene.art)}"></div><div class="story-actor hero ${heroSpeaking?'speaking':''}" style="${storyActorStyle('사마의',4)}"></div><div class="story-actor companion ${!heroSpeaking?'speaking':''}" style="${storyActorStyle(other,0)}"></div></div>${dialogueCaption(spoken.speaker,spoken.line)}<div class="modal-actions"><button id="expedition-cancel">의뢰 목록</button><button id="expedition-next" class="primary">${beat<scenes.length-1?'다음 이야기':'출진 정비'} →</button></div></div>`,false);
 $('#expedition-cancel').onclick=()=>showExpeditions(m.kind);$('#expedition-next').onclick=()=>beat<scenes.length-1?expeditionStory(id,beat+1):briefing(7,id);
}
/** 연의 장수록: 별호 · 다섯 능력 · 고유능력. 연의에 없는 졸병은 표시하지 않는다. */
function romanceCard(u:Unit){
  const r=romanceOf(u);if(!r||u.name.endsWith('환영'))return '';
  const bars=([['무력',r.war],['지력',r.int],['통솔',r.lead],['정치',r.pol],['매력',r.cha]] as const).map(([k,v])=>`<span><small>${k}</small><b>${v}</b><i style="width:${v}%"></i></span>`).join('');
  const temper=temperOf(r.name);
  return `<div class="romance-card"><div class="romance-epithet">${r.epithet}${temper?` <span class="temper-tag" title="일기토·설전에 응하는 방식">성격 · ${temperNames[temper]}</span>`:''}</div><div class="romance-stats">${bars}</div>${(()=>{const sk=r.skill??officerFeatures[u.id];return sk?`<p><b>${sk.name}</b> ${sk.description}</p>`:'';})()}</div>`;
}
function milestoneMarkup(items:ReturnType<typeof growthMilestones>){return items.map(x=>`<div class="growth-summary"><b>${officerNames[x.id]}${x.to>x.from?' · Lv.'+x.from+' → '+x.to:''}</b>${x.evolution?`<p class="evo-news">병종 진화: ${x.evolution.from} → <b>${x.evolution.to}</b>${x.evolution.bloom?` · 개화 「${x.evolution.bloom.name}」 ${x.evolution.bloom.description}`:''}</p>`:''}${x.strategies.length?'<p>새 책략: '+x.strategies.join(' · ')+'</p>':''}${x.talents.length?'<p>고유특성 해금: '+x.talents.join(' · ')+'</p>':''}</div>`).join('');}
function showExpeditionResult(){if(resultShown)return;resultShown=true;const run=session.deployment!.mission!,m=expeditions.find(x=>x.id===run.id)!,win=session.state.outcome==='victory';const before=structuredClone(campaign);
 const reward=expeditionReward(campaign,m.id,run.runId,win);saveCampaign();
 const milestones=growthMilestones(before,campaign);
 modal(`<div class="result"><div class="result-character">${win?'승':'련'}</div><h2>${win?'성장의 한 걸음':'다시 준비할 시간'}</h2><p>${m.name} · ${session.state.turn}턴</p>${win?`<div class="story-stage reward-scene"><div class="story-backdrop incoming" style="${storyBackdrop(m.art)}"></div><div class="story-actor hero speaking" style="${storyActorStyle('사마의',4)}"></div><div class="story-actor companion" style="${storyActorStyle('조진',0)}"></div></div>`:''}${win?dialogueCaption(splitSpokenLine(m.lines[2]!).speaker,splitSpokenLine(m.lines[2]!).line):`<p class="battle-aftermath">${esc(session.failure)}<br>패배해도 경험치와 보물은 잃지 않습니다. 정비 후 다시 도전하세요.</p>`}<p>${win&&!reward.xp?'이미 보상을 받은 전투입니다. · ':'경험치 +'+reward.xp+' · '}${growthText()}</p>${reward.items.length?`<p class="treasure-reward">보물 해금: ${reward.items.map(id=>treasures.find(t=>t.id===id)!.name).join(' · ')}</p>`:''}${milestoneMarkup(milestones)}<div class="modal-actions"><button id="expedition-again">${m.kind==='training'?'다시 수련':'다시 도전'}</button>${m.kind==='challenge'&&win&&m.step!<10?'<button id="expedition-next-step" class="primary">다음 단계 →</button>':''}<button id="expedition-list">연무장 목록</button><button id="expedition-menu">연의 회상</button></div></div>`,false);
 $('#expedition-again').onclick=()=>briefing(7,m.id);const nextStep=document.getElementById('expedition-next-step');if(nextStep)nextStep.onclick=()=>expeditionStory('C'+String(m.step!+1).padStart(2,'0'));$('#expedition-list').onclick=()=>showExpeditions(m.kind);$('#expedition-menu').onclick=showChronicle;
}
function activate(){
  // 전장 그림이 아직이면 기다렸다가 시작한다(첫 화면을 빨리 띄우느라 그림은 뒤에서 준비한다).
  if(!fieldReady){startRest();modal(waitPanel('전장 준비 중','전장 그림을 마저 받고 있습니다. 끝나면 바로 시작합니다.'),false);void fieldInit?.then(activate,error=>{console.error(error);modal(`<div class="briefing"><h2>전장 그래픽 오류</h2><p class="render-error">전장 그래픽을 준비하지 못했습니다. 브라우저를 최신으로 올리거나, 다른 탭을 닫고 다시 시도해 주세요.</p><p class="muted">원인: ${String((error as Error)?.message??error).replace(/[<>&]/g,'').slice(0,160)}</p><div class="modal-actions"><button class="primary" id="field-retry">다시 시도</button></div></div>`,false);$('#field-retry').onclick=()=>location.reload();});return;}
  hasStarted=true;menuOpen=false;resultShown=false;duelPresented=false;mode='move';
  selected=session.state.living(session.state.currentSide).find(u=>!u.hasActed)?.id??'sima_yi';
  lastLog=session.state.log.length;field.load(session.state);const u=session.state.find(selected);if(u)field.focusUnit(u.pos);
  const m=session.state.map,terrain:TerrainKind[]=[];for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)terrain.push(m.tileAt({x,y}).terrain);
  sound.scene='battle';sound.place=placeFor(session.state.stage.id,terrain);sound.focus=undefined;sound.combat=session.chapter!==0;void sound.start().then(()=>{updateSound();if(!session.journal.length)sound.event({kind:'battle-start'});});
  // A resumed battle should not replay every line whose moment has already passed.
  lineSeen=new Set(session.journal.length?dueLines(session.state.stage.id,session.state,new Set()).map(l=>l.id):[]);lineQueue=[];
  $<HTMLDialogElement>('#modal').close();render();pump();
}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(session.save()));saveAvailable=true;$('#save-status').textContent='✓ 자동 저장됨';}catch{$('#save-status').textContent='저장 공간 사용 불가';}}
function describe(e:LogEntry){const name=(id:string)=>session.state.find(id)?.name??id;switch(e.t){case 'telegraph':return e.warning?`⚠ ${e.label??'적 증원'} 예고 · ${e.turns}턴 뒤 노란 칸으로 적이 들어옵니다. 미리 대비하세요.`:`⚠ ${e.label??'광역 공격'} 예고 · ${e.turns}턴 뒤 붉은 칸에 떨어집니다. 칸을 비우세요.`;case 'strike':return `${e.hits.length?e.hits.map(h=>name(h.unit)+' −'+h.damage).join(', '):'아무도 맞지 않았습니다'} · 예고된 공격이 떨어졌습니다.`;
  case 'turnStart':return `${e.turn}턴 · ${sideNames[e.side]}의 차례입니다.`;
  case 'move':return `${name(e.unit)} 이동 · ${terrainNames[session.state.map.tileAt(e.to).terrain]}`;
  case 'attack':case 'counter':return `${name(e.attacker)}${e.t==='counter'?' 반격':' 공격'} → ${name(e.defender)} · ${e.hit?e.damage+' 피해':'회피'}`;
  case 'strategy':return `${name(e.caster)} · ${e.strategy==='heal'?'치유':e.strategy==='calm'?'진정':e.strategy==='repair'?'수리':session.state.strategies.get(e.strategy)?.name??e.strategy} · ${Math.abs(e.damage.reduce((a,b)=>a+b,0))}${e.damage.some(d=>d<0)?' 회복':e.damage.every(d=>d===0)?' 지원':' 피해'}`;
  case 'retreat':return structureKind(e.unit)==='gate'?`${name(e.unit)} 파괴 · 성문 돌파! 주변 아군 사기 상승`:`${name(e.unit)} ${structureKind(e.unit)?'파괴':'퇴각'}`;
  case 'spawn':return e.units.some(id=>structureKind(id)==='barricade')?'공병이 방책을 세웠습니다.':'';
  case 'outcome':return e.outcome==='victory'?'작전 성공.':'작전 실패.';
  case 'choice':return '선택에 따라 전장의 흐름이 바뀝니다.';
  default:return '';
}}
function consumeLog(){const logs=session.state.log.slice(lastLog);lastLog=session.state.log.length;if(logs.some(e=>e.t==='terrain'))field.repaintTerrain();field.play(logs);hudFight(logs);for(const e of logs){const line=describe(e);if(line)$('#latest-log').textContent=line;if(e.t==='turnStart'){const banner=$('#phase-banner');banner.textContent=`${sideNames[e.side]}의 차례`;banner.classList.add('show');setTimeout(()=>banner.classList.remove('show'),1300);sound.event({kind:'turn',side:e.side});if(e.side!=='player')sound.focus=undefined;}}}
function portraitFor(u:Unit,reaction=false):string{
  const painted=paintedTroopArt[u.unitClass];
  if(painted)return `<span class="battle-model" role="img" aria-label="${unitName(u)}" style="background-image:var(--${painted.sheet}-atlas);background-size:400% ${painted.rows*100}%;background-position:${reaction?100:0}% ${painted.row/(painted.rows-1)*100}%"></span>`;
  // 신장수: 직접 만든 초상
  {const url=customFace(u.name);if(url&&u.side==='player')return `<span class="battle-model custom-portrait" role="img" aria-label="${unitName(u)}" style="background-image:url(${url});background-size:cover"></span>`;}
  const art=troopArt[u.unitClass];if(art)return `<span class="battle-model" role="img" aria-label="${unitName(u)}" style="background-image:var(--${art.sheet}${reaction?'-reaction':''}-atlas);background-size:400% ${art.rows*100}%;background-position:${reaction?33.333333:0}% ${art.row/(art.rows-1)*100}%"></span>`;
  const role=troopRoles[u.unitClass];if(role)return `<span class="troop-portrait" style="filter:sepia(.18)">${portraitFor({...u,unitClass:visualClass(u.unitClass)})}<b style="color:#${role.tint.toString(16)}">${role.name}</b></span>`;
  if(familyOf(u.unitClass)==='ram')return '<span class="battle-model" role="img" aria-label="충차" style="background-image:var(--ram-atlas);background-size:200% 200%;background-position:0 0"></span>';
  if(u.id.startsWith('convoy_'))return `<span class="battle-model" role="img" aria-label="수송대" style="background-image:url(convoys-v1.webp);background-size:400% 200%;background-position:0 ${u.id==='convoy_b'?100:0}%"></span>`;
  const structure=structureKind(u.id);if(structure){const f=structureFrame(structure);return `<span class="battle-model" role="img" aria-label="${unitName(u)}" style="background-image:url(scenery-v3.webp);background-size:400% 200%;background-position:${f%4/3*100}% ${Math.floor(f/4)*100}%"></span>`;}
  const extra=['crossbow','heavyCav','engineer','fengshui'].indexOf(u.unitClass),row=extra>=0?extra:['strategist','civilian'].includes(u.unitClass)?4:u.unitClass==='spearman'?1:u.unitClass==='archer'?2:u.unitClass==='cavalry'?3:u.unitClass==='catapult'?5:0;
  return `<span class="battle-model" role="img" aria-label="${unitName(u)}" style="background-image:var(--${extra>=0?'extra':'base'}-atlas);background-size:400% ${extra>=0?400:600}%;background-position:0 ${row/(extra>=0?3:5)*100}%"></span>`;
}
/** 장수 카드의 얼굴: 넣은 초상이 있는 이름난 장수는 초상, 아니면 병종 그림. */
function faceFor(u:Unit):string{
  const name=romanceOf(u)?.name??(u.id==='sima_yi'?'사마의':u.name);
  if(!u.name.endsWith('환영')&&(portraitImage(name)||officerLook(name)))return `<span class="battle-model officer-photo">${officerPortrait(name)}</span>`;
  return portraitFor(u);
}
function raceLabel(s:BattleState){const g=raceGap(s);if(!g||g.ally===undefined)return '우군 선점 저지';return `경쟁 우군 성채까지 ${g.ally}칸 · 사마의 ${g.hero??'-'}칸${g.hero!==undefined&&g.ally<g.hero?' ⚠ 우군이 앞섬':''}`;}
const ARCS:Record<string,[string,string,string]>={upper:['Ⅰ','상편','살아남는 자'],middle:['Ⅱ','중편','맞서는 자'],lower:['Ⅲ','하편','거머쥐는 자']};
/** 하단 정보창: 고른 장수(왼쪽)와 가리킨 상대(오른쪽). 싸움 연출 중에는 그 싸움을 보여 준다. */
let hudLock=false,hudAt:Coord|undefined;
function hudHover(at:Coord|undefined){
  hudAt=at;if(hudLock)return;const s=session.state,u=s.find(selected),t=at?s.unitAt(at):undefined;
  let left:{u:Unit;o?:CardOpts}|undefined=u?.alive?{u}:undefined,right:{u:Unit;o?:CardOpts}|undefined=t&&t!==u?{u:t}:undefined;
  if(!left&&t){left={u:t};right=undefined;}
  if(u&&t&&right&&t.side==='enemy'){const d=manhattan(u.pos,t.pos),def=s.strategyFor(u,mode);
    if(def&&d<=def.range){const dmg=estimateStrategy(u,t,def,s.map);right.o={preview:dmg,note:`${def.name??mode} · 예상 피해 ${dmg}`};}
    else if(mode==='attack'&&inReach(u,u.pos,t.pos)){const v=previewAttack(u,t,s.map,session.battle.wouldCounter(t,u));right.o={preview:v.hit>0?v.damage:0,note:`명중 ${v.hit}% · 피해 ${v.damage}${criticalChance(u,t)>=3?` · 회심 ${criticalChance(u,t)}%`:''}${doubleAttackChance(u,t)>1?` · 연속 ${Math.round(doubleAttackChance(u,t))}%`:''}${v.lethal?' · 격파':''}`};if(v.counter)left={u,o:{preview:v.counter.damage,note:`반격 ${v.counter.damage} · 명중 ${v.counter.hit}%`}};}}
  renderHud($('#unit-hud'),s,left,right);
}
/** 싸움이 일어나면: 친 쪽과 맞은 쪽 카드를 띄우고 체력 막대를 싸우기 전에서 뒤로 줄인다. */
function hudFight(logs:readonly LogEntry[]){
  const s=session.state,clampHp=(u:Unit,v:number)=>Math.max(0,Math.min(u.stats.maxHp,v));
  const atk=logs.find(e=>e.t==='attack'||e.t==='strategy');if(!atk)return;
  if(atk.t==='attack'){const a=s.find(atk.attacker),d=s.find(atk.defender);if(!a||!d)return;
    const back=logs.find((e):e is Extract<LogEntry,{t:'counter'}>=>e.t==='counter'&&e.attacker===d.id&&e.defender===a.id);
    renderHud($('#unit-hud'),s,{u:a,o:{hpFrom:clampHp(a,a.hp+(back?.hit?back.damage:0))}},{u:d,o:{hpFrom:clampHp(d,d.hp+(atk.hit?atk.damage:0)),note:atk.hit?`${atk.critical?'회심! ':''}피해 ${atk.damage}`:'빗나감'}});}
  else{const a=s.find(atk.caster),d=s.find(atk.targets[0]??'');if(!a)return;
    renderHud($('#unit-hud'),s,{u:a},d?{u:d,o:{hpFrom:clampHp(d,d.hp+(atk.damage[0]??0)),note:`책략 ${atk.damage[0]??0}`}}:undefined);}
  hudLock=true;
}
function render(){
  queueMicrotask(()=>hudHover(hudAt));queueMicrotask(encounterCheck);
  // 지금 실려 있는 회차 보물: 얻자마자 전장에서도 보인다.
  {const d=session.deployment,ids=d?.run?.relics??d?.runStory?.relics??d?.scenario?.relics??[],el=$('#battle-relics');el.innerHTML=(d?.trial?'<span class="trial" title="로그라이크 난이도: 적 체력 +20% · 공격 +12% · 방어 +10%. 연구로 이겨낸다.">⚠ 천명의 시련</span>':'')+ids.map(id=>RELICS.find(r=>r.id===id)).filter(Boolean).map(r=>`<span title="${r!.effect}">◈ ${r!.name}</span>`).join('');el.hidden=!ids.length&&!d?.trial;}
  {const [no,arc,name]=session.deployment?.run?['∞','원정','천명의 길']:ARCS[(session.state.stage as {arc?:string}).arc??'upper']??ARCS.upper!;$('#arc-crumb').innerHTML=`${arc} <span>/</span> ${name}`;$('#arc-eyebrow').innerHTML=`제${({'Ⅰ':1,'Ⅱ':2,'Ⅲ':3} as Record<string,number>)[no]??''}편 <span>${arc}</span>`;}
  const s=session.state,c=session.deployment?.run?{...chapters[session.chapter]!,stage:s.stage,year:session.deployment.scenario?`시나리오 · ${scenarioYear(session.deployment.scenario.chapter)}`:`천명의 원정 · ${session.deployment.run.floor}층`}:session.deployment?.mission?{...chapters[session.chapter]!,stage:s.stage,year:'외전 · 수련과 인연'}:chapters[session.chapter]!;
  $('#stage-title').textContent=c.stage.title;$('#stage-subtitle').textContent=session.deployment?.scenario?(session.deployment.run?'시나리오 · 가상 전장':`시나리오 · 연의 · ${s.difficulty==='normal'?'일반':'극한'}`):session.deployment?.run?`천명의 원정 · ${session.deployment.run.floor}/${RUN_FLOORS}층`:session.deployment?.runStory?`천명의 원정 · ${session.deployment.runStory.floor}/${RUN_FLOORS}층 · 연의 전장`:`제 ${c.stage.order}장 · ${s.difficulty==='normal'?'일반':'극한'}`;
  $('#map-name').textContent=c.stage.subtitle??c.stage.title;$('#year').textContent=`${c.year} · ${s.map.width}×${s.map.height}`;
  document.body.classList.toggle('nightmare',session.chapter===4);
  $('.weather').textContent=session.weather;
  const objective=(session.deployment?.mission?.version??1)>=3?trialProgress(s):session.chapter===6?`${session.phase} · 조조 HP ${s.find('cao_cao')?.hp??0}/180 · 3턴 후방 복병`:session.chapter===5?`${session.phase} · 수송대 ${s.living('allyAi').length}/2 생존`:session.chapter===3?`${session.phase} · 추격 압박 ${session.pressure}/${session.pressureLimit}`:session.chapter===0?`${session.phase} · 지참금 ${session.funds}전`:session.chapter===1?`${session.phase} · ${raceLabel(s)}`:`${session.phase} · 남은 적 ${s.living('enemy').length}부대`;
  $('#compact-objective').textContent=objective;
  $('#objectives').innerHTML=`<p><b>◇</b> ${objective}</p><small>${[...new Set(s.defeat.filter(d=>d.type==='retreat'&&d.unit).map(d=>s.find(d.unit!)?.name??officerNames[d.unit!]??d.unit!))].join(' · ')||c.stage.deployment.forced.map(id=>officerNames[id]).join(' · ')} 생존 필수</small><div class="resource-strip">구급약 ${session.medicine} · ${session.scouted?'정찰 완료':'살피기로 경로 확인'}</div>`;
  $('#turn').textContent=String(s.turn).padStart(2,'0');$('#turn-limit').textContent=`/ ${session.deadline??60}`;$('#phase').textContent=`${sideNames[s.currentSide]}의 차례`;
  document.querySelectorAll('.phase-track i').forEach((el,i)=>el.classList.toggle('active',i===s.phaseIndex));
  const roster=s.living(s.currentSide).sort((a,b)=>Number(a.hasActed)-Number(b.hasActed));$('#unit-count').textContent=`${roster.length}부대`;
  $('#roster').innerHTML=roster.map(u=>`<button data-unit="${u.id}" class="roster-unit ${u.id===selected?'selected':''} ${u.hasActed?'spent':''}"><span class="unit-symbol ${u.side}">${u.id==='sima_yi'?'사':u.id==='cao_zhen'?'조':classNames[u.unitClass]?.slice(0,1)}</span><span><strong>${unitName(u)}</strong><small>${classNames[u.unitClass]} · Lv.${u.level}${xpOf(u)?` · 경험 ${xpOf(u)!.now}`:''}</small><i class="mini-hp"><i style="width:${u.hp/u.stats.maxHp*100}%"></i></i></span><span>${u.hasActed?'✓':'●'}</span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-unit]').forEach(b=>b.onclick=()=>select(b.dataset.unit!));
  renderUnit(s.find(selected));
  $<HTMLButtonElement>('#end-phase').disabled=!CONTROLLABLE.has(s.currentSide)||s.outcome!=='ongoing'||field.busy||!!session.activeDuel;
  $<HTMLButtonElement>('#undo').disabled=!session.checkpoints.length||field.busy;
  $('#tactical-tip').textContent=session.revision>=4&&session.chapter===4?'여포는 물리 공격이 강합니다. 무력보다 지력 차이를 활용해 설전 승리와 혼란을 노리세요. 각 대결이 끝나면 체력·MP가 회복됩니다.':session.revision>=4?'일기토는 인접한 적, 설전은 3칸 이내 적을 선택합니다. 충차는 성문·감시탑에 피해 3배. 풍수사는 MP 8로 3칸 이내 아군을 치유합니다.':'목표와 승리 조건을 확인하세요. 본대 다음 편입 아군을 직접 지휘합니다.';
  sound.scene=s.outcome!=='ongoing'?'result':session.chapter===4?'dream':s.living('player').some(u=>u.hp<u.stats.maxHp*.35)?'crisis':bossNear(s.living())?'boss':'battle';
  renderCoach();queueLines();
  if(fieldReady){consumeLog();field.render(s,selected,mode,threat,session.scouted);}checkModal();
}
let lineSeen=new Set<string>(),lineQueue:{speaker:string;text:string}[]=[],lineTimer:ReturnType<typeof setTimeout>|undefined;
function queueLines(){
  if(session.deployment?.mission||session.state.outcome!=='ongoing')return;
  for(const l of dueLines(session.state.stage.id,session.state,lineSeen)){lineSeen.add(l.id);lineQueue.push(l);}
  if(!lineTimer)showNextLine();
}
function showNextLine(){
  const el=$('#battle-line'),next=lineQueue.shift();
  if(!next){el.hidden=true;lineTimer=undefined;return;}
  el.innerHTML=dialogueCaption(next.speaker,next.text);el.hidden=false;$('#latest-log').textContent=`${next.speaker}: ${next.text}`;
  lineTimer=setTimeout(showNextLine,Math.min(6500,2600+next.text.length*45));
}
function coachDone(){try{return localStorage.getItem(COACH_KEY)==='1';}catch{return false;}}
function finishCoach(){try{localStorage.setItem(COACH_KEY,'1');}catch{/* Storage may be blocked; the coach simply shows again. */}$('#coach').hidden=true;}
function renderCoach(){
  const s=session.state,el=$('#coach');
  if(s.stage.id!=='S1-01'||session.deployment?.mission||coachDone()){el.hidden=true;return;}
  if(s.turn>1||s.outcome!=='ongoing'){finishCoach();return;}
  const text=coachStep(s.turn,s.currentSide==='player',s.living('player').map(u=>({id:u.id,hasMoved:u.hasMoved,hasActed:u.hasActed})),selected);
  el.hidden=!text;if(text)el.querySelector('p')!.textContent=text;
}
/** 원정 전투: 다음 레벨까지의 경험치(이번 전투에서 번 만큼 포함). */
function xpOf(u:Unit){const b=session.xpBase()?.[u.id];if(!b)return undefined;const total=b.xp+(session.xpEarned[u.id]??0);return {now:total%XP_PER_LEVEL,gained:session.xpEarned[u.id]??0};}
function xpBar(u:Unit):Array<[string,string,number,number]>{const x=xpOf(u);return x?[['xp',`경험치 · 이번 전투 +${x.gained}`,x.now,XP_PER_LEVEL]]:[];}
function renderUnit(u:Unit|undefined){
  if(!u)return;const s=session.state,can=u.alive&&!u.hasActed&&u.side===s.currentSide&&CONTROLLABLE.has(u.side)&&s.outcome==='ongoing';
  const feature=session.revision>=4?officerFeatures[u.id]:undefined;const talents=session.deployment?.growth?talentTree(u.id,u.level,session.deployment.growth):[];
  // 한 화면 장수 카드: 초상·이름·체력/책략/경험 막대·능력치 8칸·성격·특성(이름만)·책략(눌러서 선택)·상태
  const r=romanceOf(u),temper=r?temperOf(r.name):undefined,sk=r?.skill??feature;
  const ab=u.ccRules?u.ability:undefined;
  // 조조전 규칙 전투: 장수 능력 다섯(무력·지력·통솔·민첩·운)과 부대 공격·방어·이동. 순발력·사기는 칸에 마우스를 올리면 보인다.
  const statCells=ab?[['무력',ab.war],['지력',ab.int],['통솔',ab.lead],['민첩',ab.agi],['운',ab.luck],['공격',u.stats.attack],['방어',u.stats.defense],['이동',u.stats.movement]] as Array<[string,number]>:[...(r&&!u.name.endsWith('환영')?[['무력',r.war],['지력',r.int],['통솔',r.lead],['정치',r.pol],['매력',r.cha]]:[['무력',martialPower(u)],['지력',u.stats.intellect]]),['공격',u.stats.attack],['방어',u.stats.defense],['이동',u.stats.movement]] as Array<[string,number]>;
  const strategyChips=u.strategies.map(id=>{const d=s.strategyFor(u,id)!,tier=d.tier??1;const off=!can||u.mp<d.mpCost||s.hasStatus(u,'seal');return `<button class="uc-strat t${tier}${mode===id?' active':''}" data-uc-strat="${id}" ${off?'disabled':''} title="${d.name} · ${STRATEGY_TIER_NAMES[tier]} · 위력 ${d.power} · ${strategyHint(id)}"><img src="${strategyIconUrl(id,tier)}" alt=""><b>${d.name}</b><small>${d.mpCost}</small></button>`;}).join('');
  const traits=[...(sk?[{n:sk.name,d:sk.description,on:true}]:[]),...talents.map(t=>({n:t.name,d:t.ready?t.description:t.requirement,on:t.ready}))].filter((t,i,a)=>a.findIndex(x=>x.n===t.n)===i);
  $('#unit-detail').innerHTML=`<div class="uc"><div class="uc-head"><div class="portrait uc-face"><div>${faceFor(u)}</div><span class="portrait-tag">${sideNames[u.side]}</span></div><div class="uc-id"><h2>${unitName(u)}</h2><small>${classNames[u.unitClass]} · Lv.${u.level}${r?.epithet?` · ${r.epithet}`:''}</small>${[['hp','체력',u.hp,u.stats.maxHp],['mp','책략',u.mp,u.stats.maxMp],...xpBar(u).map(([k,,v,m])=>[k,'경험',v,m] as [string,string,number,number])].map(([kind,name,value,max])=>`<div class="uc-bar ${kind}"><span>${name}</span><i><i style="width:${Number(value)/Math.max(1,Number(max))*100}%"></i></i><b>${value}<small>/${max}</small></b></div>`).join('')}</div></div>
    <div class="uc-stats"${ab?` title="순발력 ${u.stats.agility} · 사기 ${u.stats.morale} · 정신력 ${u.stats.spirit}"`:''}>${statCells.map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    ${temper||traits.length?`<div class="uc-traits">${temper?`<span class="uc-chip temper" title="일기토·설전에 응하는 방식">성격 · ${temperNames[temper]}</span>`:''}${traits.map(t=>`<span class="uc-chip${t.on?'':' locked'}" title="${t.d.replace(/"/g,'&quot;')}">${t.on?'◆':'◇'} ${t.n}</span>`).join('')}</div>`:''}
    ${u.strategies.length?`<div class="uc-strats"><div class="uc-label">책략</div><div class="uc-strat-list">${strategyChips}</div></div>`:''}
    <p class="uc-tip">${classTactics(u.unitClass).map(t=>`전법 「${t.name}」`).join(' · ')}${classTactics(u.unitClass).length?' · ':''}일반 공격 사거리 ${u.range[0]}~${u.range[1]} · ${reachLabel(u.unitClass)}${u.statuses.length?` · <b>${u.statuses.map(x=>(STATUS_NAMES[x.kind]??x.kind)+' '+x.turns+'턴').join(' · ')}</b>`:''}</p></div>`;
  const buttons=[{id:'move',name:'이동',icon:'➶',meta:'1',disabled:u.hasMoved},{id:'attack',name:'공격',icon:'⚔',meta:'2',disabled:u.unitClass==='civilian'},...u.strategies.map(id=>{const d=s.strategyFor(u,id)!;return {id,name:d.name,icon:`<img src="${strategyIconUrl(id,d.tier??1)}" alt="">`,meta:d.mpCost+' MP',disabled:u.mp<d.mpCost||s.hasStatus(u,'seal')};}),{id:'wait',name:'대기',icon:'◷',meta:'W',disabled:false}];
  if(session.deployment&&familyOf(u.unitClass)==='fengshui')buttons.push({id:'heal',name:'치유',icon:'치',meta:'8 MP',disabled:u.mp<8||s.hasStatus(u,'seal')});
  if(familyOf(u.unitClass)==='engineer')buttons.push({id:'repair',name:'수리',icon:'수',meta:'인접',disabled:false},{id:'fortify',name:'방책',icon:'책',meta:session.barricadesLeft(u.id)+'회',disabled:session.barricadesLeft(u.id)<=0});
  if(session.revision>=4&&!['civilian','ram','catapult'].includes(familyOf(u.unitClass))&&!structureKind(u.id))buttons.push({id:'duel',name:'일기토',icon:'겨',meta:'5합',disabled:false},{id:'debate',name:'설전',icon:'논',meta:'5합',disabled:false});
  if(session.canCalm)buttons.push({id:'calm',name:'진정',icon:'진',meta:String(session.medicine),disabled:!session.medicine});
  buttons.push({id:'scout',name:'살피기',icon:'살',meta:'행동',disabled:session.scouted},{id:'medicine',name:'구급약',icon:'약',meta:String(session.medicine),disabled:!u.canUseItems||u.unitClass==='civilian'||!session.medicine||u.hp===u.stats.maxHp});
  const region=[...s.map.regions].find(([name,coords])=>s.victory.some(v=>v.type==='capture'&&v.target===name)&&coords.some(c=>c.x===u.pos.x&&c.y===u.pos.y));
  if(region&&u.side==='player')buttons.push({id:'capture',name:'거점 확보',icon:'⚑',meta:'',disabled:session.chapter===6&&!!s.find('ma_chao')?.alive});
  $('#commands').innerHTML=buttons.map(b=>`<button title="${strategyHint(b.id)}" data-command="${b.id}" class="${mode===b.id?'active':''}" ${!can||b.disabled||field.busy?'disabled':''}><span>${b.icon}</span>${b.name}<small>${b.meta}</small></button>`).join('');
  const runCmd=(id:string)=>{dockOpen='';if(id==='wait')act({kind:'wait',unit:u.id});else if(id==='capture'&&region)act({kind:'capture',unit:u.id,region:region[0]});else if(['scout','medicine'].includes(id)){if(id==='scout')threat=true;act({kind:'item',unit:u.id,item:id});}else{mode=id;render();}};
  document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(b=>b.onclick=()=>runCmd(b.dataset.command!));
  document.querySelectorAll<HTMLButtonElement>('[data-uc-strat]').forEach(b=>b.onclick=()=>runCmd(b.dataset.ucStrat!));
  renderDock(buttons,can&&!field.busy,runCmd);
  $('#command-hint').textContent=!can?'해당 부대의 차례에 조작할 수 있습니다.':mode==='move'?'푸른 칸을 선택해 이동하세요.':mode==='heal'?'3칸 이내 부상당한 아군을 선택하세요.':mode==='calm'?'2칸 이내에서 혼란에 빠진 아군을 선택하세요. 구급약 1개를 씁니다.':mode==='repair'?'인접한 아군 충차·포차·방책·성문을 선택해 수리하세요.':mode==='fortify'?'인접한 빈 칸을 선택해 방책을 세우세요.':s.strategies.get(mode)?.targetSides.includes('player')?'사거리 안의 아군을 선택해 지원하세요.':mode==='duel'?'인접한 적을 선택하세요. 무력으로 5합을 겨룹니다.':mode==='debate'?'3칸 이내 적을 선택하세요. 지력으로 5합을 겨룹니다.':'사거리 안의 적을 선택하세요.';
}
/**
 * 지도 오른쪽 아래의 둥근 명령 단추(조조전 온라인처럼): 이동·공격·책략·특수(일기토·설전)·도구·대기.
 * 책략·특수·도구는 눌렀을 때 위로 목록이 펼쳐진다.
 */
let dockOpen='';
type DockBtn={id:string;name:string;icon:string;meta:string;disabled:boolean};
function renderDock(buttons:DockBtn[],can:boolean,run:(id:string)=>void){
  const dock=$('#action-dock');if(!can){dock.hidden=true;document.body.classList.remove('dock-on');return;}
  const by=(ids:string[])=>buttons.filter(b=>ids.includes(b.id)),known=new Set(['move','attack','wait','duel','debate','scout','medicine','calm','capture']);
  const strat=buttons.filter(b=>!known.has(b.id)),special=by(['duel','debate']),tools=by(['medicine','scout','calm','capture']);
  const groups:Array<{key:string;label:string;items?:DockBtn[]|undefined;one?:DockBtn|undefined;tone:string}>=[
    {key:'move',label:'이동',one:buttons.find(b=>b.id==='move'),tone:'jade'},
    {key:'attack',label:'공격',one:buttons.find(b=>b.id==='attack'),tone:'red'},
    ...(strat.length?[{key:'strat',label:'책략',items:strat,tone:'blue'}]:[]),
    ...(special.length?[{key:'special',label:'대결',items:special,tone:'gold'}]:[]),
    ...(tools.length?[{key:'tools',label:'도구',items:tools,tone:'brown'}]:[]),
    {key:'wait',label:'대기',one:buttons.find(b=>b.id==='wait'),tone:'grey'},
  ];
  const open=groups.find(g=>g.key===dockOpen&&g.items);
  dock.innerHTML=`${open?`<div class="dock-pop" role="menu">${open.items!.map(b=>`<button role="menuitem" data-dock-cmd="${b.id}" class="${mode===b.id?'active':''}" ${b.disabled?'disabled':''}><i>${b.icon}</i><b>${b.name}</b><small>${b.meta}</small></button>`).join('')}</div>`:''}
    <div class="dock-row">${groups.map(g=>{const active=g.one?mode===g.one.id:!!g.items?.some(b=>b.id===mode),off=g.one?g.one.disabled:g.items!.every(b=>b.disabled);
      return `<button class="dock-btn tone-${g.tone}${active?' active':''}${dockOpen===g.key?' open':''}" data-dock="${g.key}" ${off?'disabled':''} aria-label="${g.label}"><i class="dock-ico">${DOCK_ICONS[g.key]??''}</i><b>${g.label}</b></button>`;}).join('')}</div>`;
  dock.hidden=false;document.body.classList.add('dock-on');
  requestAnimationFrame(()=>{const row=dock.querySelector<HTMLElement>('.dock-row');if(row)document.body.style.setProperty('--dock-w',row.offsetWidth+'px');});
  dock.querySelectorAll<HTMLButtonElement>('[data-dock]').forEach(b=>b.onclick=e=>{e.stopPropagation();const g=groups.find(x=>x.key===b.dataset.dock)!;
    if(g.one)run(g.one.id);else{dockOpen=dockOpen===g.key?'':g.key;render();}});
  dock.querySelectorAll<HTMLButtonElement>('[data-dock-cmd]').forEach(b=>b.onclick=e=>{e.stopPropagation();run(b.dataset.dockCmd!);});
}
function select(id:string){selected=id;const u=session.state.find(id);if(u)field.focusUnit(u.pos);mode=u?.hasMoved?'attack':'move';sound.select(u?.unitClass);render();}
function act(command:Command){
  if(field.busy){toast('동작이 끝나면 명령할 수 있습니다.');return;}
  if(menuOpen||$<HTMLDialogElement>('#modal').open&&command.kind!=='choose'&&!(command.kind==='item'&&command.item.startsWith('duel-round:')))return;
  const prev=session.state.currentSide,r=session.act(command);if(!r.ok){toast(r.error??'명령 실패');return;}
  if(command.kind==='item'&&['duel','debate'].includes(command.item)){duelPresented=false;if(session.lastRefusal){showRefusal();return;}}
  if(prev!==session.state.currentSide){const next=session.state.living(session.state.currentSide).find(u=>!u.hasActed);if(next){selected=next.id;field.focusUnit(next.pos);mode='move';}}
  if(command.kind==='move')mode=session.state.find(selected)?.strategies[0]??'attack';
  persist();render();pump();
}
/** AI pacing: a unit that does something gets its beat; one that only holds its ground
 * leaves no log entry, and the next unit follows at once instead of an empty pause. */
let quietTick=false;
function pump(){clearTimeout(aiTimer);if(menuOpen||field.busy||$<HTMLDialogElement>('#modal').open||session.state.outcome!=='ongoing'||session.activeDuel)return;aiTimer=setTimeout(()=>{const side=session.state.currentSide,logged=session.state.log.length;if(session.tick()){quietTick=session.state.log.length===logged&&side===session.state.currentSide;if(side!==session.state.currentSide){const next=session.state.living(session.state.currentSide).find(u=>!u.hasActed);if(next){selected=next.id;mode='move';field.focusUnit(next.pos);}}persist();render();pump();}},quietTick?30:450/speed);}
function undo(){if(field.busy)return;if(session.undo()){activate();persist();toast('직전 명령을 되돌렸습니다.');}}
/** 도전을 거절당했을 때: 상대의 대답과 그 효과. */
function showRefusal(){
  const r=session.lastRefusal;if(!r)return;session.lastRefusal=null;clearTimeout(aiTimer);
  const who=session.state.find(r.target),me=session.state.find(r.challenger);if(!who||!me)return;
  modal(`<div class="dialogue refusal"><div class="eyebrow">${r.kind==='duel'?'일기토':'설전'} · 도전 거절</div>${dialogueCaption(who.name.replace(/의?\s*환영$/,''),r.line)}
  <p class="refusal-effect">${unitName(me)}의 기세가 오른다(2턴 사기 상승) · ${unitName(who)}의 사기가 꺾였다(사기 −10).</p>
  <div class="modal-actions"><button class="primary" id="refusal-ok">전장으로</button></div></div>`,false);
  $('#refusal-ok').onclick=()=>{$<HTMLDialogElement>('#modal').close();persist();render();pump();};
}
/**
 * 전투 중 조우: 이름 있는 우리 장수가 이름난 적장과 3칸 안에서 처음 마주치면(내 차례) 일기토·설전을 제안한다.
 * 일기토는 붙어 있어야(1칸), 설전은 3칸 안. 한 쌍에 한 번만 묻는다.
 */
let met=new Set<string>(),metFor:object|undefined;
function encounterCheck(){
  const el=$('#encounter');if(metFor!==session){metFor=session;met=new Set();el.hidden=true;}
  if(!el.hidden||menuOpen||field.busy||$<HTMLDialogElement>('#modal').open||session.activeDuel||session.revision<4)return;
  const s=session.state;if(s.outcome!=='ongoing'||!CONTROLLABLE.has(s.currentSide))return;
  const fighter=(u:Unit)=>!['civilian','ram','catapult'].includes(familyOf(u.unitClass))&&!/^(gate|tower)_/.test(u.id);
  for(const u of s.living(s.currentSide)){if(u.hasActed||!CONTROLLABLE.has(u.side)||!fighter(u)||!(romanceOf(u)||u.id==='sima_yi'))continue;
    for(const e of s.living('enemy')){if(!fighter(e)||!romanceOf(e))continue;const d=manhattan(u.pos,e.pos),k=u.id+':'+e.id;if(d>3||met.has(k))continue;
      met.add(k);showEncounter(u,e,d);return;}}
}
function showEncounter(u:Unit,e:Unit,d:number){
  const el=$('#encounter'),s=session.state;
  el.innerHTML=`<div class="enc-faces"><span>${faceFor(u)}</span><b>VS</b><span>${faceFor(e)}</span></div><p><b>${unitName(e)}</b>와(과) 마주쳤다!<small>${unitName(u)} · 무력 ${martialPower(u)} 지력 ${debatePower(u)} ↔ ${unitName(e)} · 무력 ${martialPower(e)} 지력 ${debatePower(e)}</small></p>
    <div class="enc-acts"><button data-enc="duel" ${d>1?'disabled title="붙어 서야 일기토를 청할 수 있다"':''}>⚔ 일기토${d>1?' (붙어서)':''}</button><button data-enc="debate">✒ 설전</button><button data-enc="pass">지나간다</button></div>`;
  el.hidden=false;sound.event({kind:'duel',critical:false});
  el.querySelectorAll<HTMLButtonElement>('[data-enc]').forEach(b=>b.onclick=()=>{el.hidden=true;const k=b.dataset.enc!;if(k==='pass'){render();return;}
    selected=u.id;act({kind:'item',unit:u.id,item:k,target:e.id});});
  void s;
}
let duelSplashSeen:object|undefined;
function showDuel(){
  const d=session.activeDuel??session.lastDuel;if(!d)return;clearTimeout(aiTimer);
  const a=session.state.get(d.player.id),b=session.state.get(d.enemy.id);
  // 겨루기는 초상 카드가 아니라 실제 병종 전신 모델을 1:1로 맞세운다.
  const nameOf=(u:Unit)=>romanceOf(u)?.name??(u.id==='sima_yi'?'사마의':u.name.replace(/의?\s*환영$/,''));
  const models={player:duelModel(portraitFor(a),'player',nameOf(a)),enemy:duelModel(portraitFor(b),'enemy',nameOf(b))};
  if(d.round===0&&!d.history.length&&duelSplashSeen!==d){
    modal(duelSplash(d,session.lastAccept?.line,!!session.lastAccept?.historic),false);
    document.querySelectorAll<HTMLElement>('[data-vs-model]').forEach(el=>el.innerHTML=el.dataset.vsModel==='enemy'?models.enemy:models.player);
    sound.event({kind:'duel',critical:true,debate:d.kind==='debate'});
    const go=()=>{if(duelSplashSeen===d)return;duelSplashSeen=d;showDuel();};
    $('.vs-go').addEventListener('click',go);setTimeout(go,2600);return;
  }
  const indoor=session.state.map.tileAt(a.pos).terrain==='fort'||/궁|부$|청|막/.test(session.state.stage.subtitle??'');
  modal(duelArena(d,{models,backdrop:duelBackdrop(d.kind,session.state.stage.id+d.enemy.id,indoor),...(session.lastAccept?.line?{openingLine:session.lastAccept.line}:{})}),false);
  document.querySelectorAll<HTMLButtonElement>('[data-duel-action]').forEach(el=>el.onclick=()=>{sound.event({kind:'duel',critical:el.dataset.duelAction==='special',debate:d.kind==='debate'});act({kind:'item',unit:d.player.id,item:'duel-round:'+el.dataset.duelAction});});
  $('#duel-return')?.addEventListener('click',()=>{duelPresented=true;$<HTMLDialogElement>('#modal').close();render();pump();});
}
function checkModal(){
  if(menuOpen||field.busy)return;const s=session.state;
  if(session.activeDuel||session.lastDuel&&!duelPresented){showDuel();return;}
  if(s.outcome!=='ongoing'&&session.deployment?.mission){showExpeditionResult();return;}
  if(s.outcome!=='ongoing'&&session.deployment?.run&&session.deployment.scenario){
    // 시나리오 모드의 가상 전장: 장수 성장·다음 장으로.
    if(resultShown)return;resultShown=true;sound.sfx(s.outcome==='victory'?'victory':'defeat');
    const dep=session.deployment,xp={...session.xpEarned};setTimeout(()=>{menuOpen=true;void finishIfBattle(scenarioHost,s,dep,xp);},900);return;
  }
  if(s.outcome!=='ongoing'&&session.deployment?.run){
    // 원정 전투: 연의 보상 대신 원정 기록에 결과를 넘긴다.
    if(resultShown)return;resultShown=true;sound.sfx(s.outcome==='victory'?'victory':'defeat');
    const dep=session.deployment;{const xp={...session.xpEarned};setTimeout(()=>finishRunBattle(runHost,s,dep,xp),900);};return;
  }
  if(s.outcome!=='ongoing'&&session.deployment?.runStory){
    // 원정의 연의 전장: 이기면 천명 기록에 남고, 지면 원정이 끝난다(천명의 가호가 있으면 한 번 견딘다).
    if(resultShown)return;resultShown=true;sound.sfx(s.outcome==='victory'?(session.somber?'somber':'victory'):'defeat');
    const dep=session.deployment;{const xp={...session.xpEarned};setTimeout(()=>finishRunStory(runHost,s,dep,xp),900);};return;
  }
  if(s.outcome!=='ongoing'){
    if(resultShown)return;resultShown=true;const win=s.outcome==='victory',seals=session.seals;
    const before=structuredClone(campaign);
    const reward=win?award(campaign,s.stage.id,s.difficulty,[...s.units.keys()],seals):null;
    if(reward?.xp)saveCampaign();
    if(win)try{const p=progress(),k=s.stage.id+':'+s.difficulty;p[k]=[...new Set([...(p[k]??[]),...seals])];localStorage.setItem(PROGRESS_KEY,JSON.stringify(p));}catch{/* optional persistence */}
    // 이긴 연의 전장은 어느 길에서 이겼든 기록한다(다음 장 해금 · 연구의 '이긴 연의 전장' 조건).
    let mandateGain=0;
    if(win&&chapters.some(c=>c.stage.id===s.stage.id)){const m=loadMeta();if(!m.chronicle.includes(s.stage.id))recordStory(m,s.stage.id);
      // 연의 회상·수련 전투(천명의 길 밖)도 천명을 조금 준다: 연구가 로그라이크의 성장이다.
      if(!session.deployment?.scenario&&!session.deployment?.mission){mandateGain=s.difficulty==='extreme'?2:1;m.mandate+=mandateGain;m.earned+=mandateGain;}saveMeta(m);}
    sound.sfx(win?(session.somber?'somber':'victory'):'defeat');
    if(session.deployment?.scenario){
      // 시나리오 모드의 연의 장: 보상은 같고, 전투 뒤 장면과 다음 장은 시나리오 흐름이 맡는다.
      const news=[...(mandateGain?[`천명 +${mandateGain} (연구에 쓴다)`]:[]),...(reward?.xp?[`경험치 +${reward.xp}`]:[]),...(reward?.treasure?[`보물 「${reward.treasure.name}」을 얻었다`]:[]),...growthMilestones(before,campaign).filter(x=>x.to>x.from||x.evolution).map(x=>`${officerNames[x.id]} Lv.${x.from} → ${x.to}${x.evolution?` · 병종 진화 ${x.evolution.from} → ${x.evolution.to}`:''}`)];
      const chapterId=session.deployment.scenario.chapter,hero=s.find('sima_yi'),heroHp=hero?.alive?Math.max(.05,hero.hp/hero.stats.maxHp):undefined;const rc=session.deployment.scenario.recruits,xp={...session.xpEarned};setTimeout(()=>{menuOpen=true;void finishStoryBattle(scenarioHost,chapterId,win,news,heroHp,s,rc,xp);},900);return;
    }
    const after=win?storyAftermath[s.stage.id]:undefined;
    modal(`<div class="result">${after?`<div class="aftermath"><div class="aftermath-stage" style="${storyBackdrop(after.art)}"><span class="story-location">${after.name}</span></div><div id="aftermath-line">${dialogueCaption(after.beats[0]!.speaker,after.beats[0]!.line)}</div>${after.beats.length>1?'<button id="aftermath-next">다음 장면 →</button>':''}</div>`:''}<div class="result-character">${win?'승':'패'}</div><h2>${win?'판을 읽었다.':'아직, 끝이 아니다.'}</h2><p>${s.stage.subtitle} · ${s.turn}턴</p>${reward?.xp?`<p class="growth-summary">경험치 +${reward.xp} · ${growthText()}</p>${treasures.some(t=>t.stage===s.stage.id)?`<p class="treasure-reward">보물: ${treasures.filter(t=>t.stage===s.stage.id).map(t=>t.name).join(' · ')}</p>`:''}`:''}${milestoneMarkup(growthMilestones(before,campaign))}<div class="seals">${session.sealNames.map((name,i)=>`<div class="${seals.includes(i+1)?'earned':''}"><b>◆</b><span>${name}</span></div>`).join('')}</div><p>${win?'전투 기록과 인장이 저장되었습니다.':esc(session.failure)}</p><div class="modal-actions"><button id="result-undo">↶ 마지막 수 무르기</button>${session.phaseCheckpoint!==null?'<button id="phase-restore">목표 전환 직전으로</button>':''}<button id="retry">다시 도전</button><button id="result-menu">연의 회상</button>${win&&session.chapter===campaignOrder.at(-1)?'<button id="epilogue" class="primary">에필로그 →</button>':''}${win&&campaignOrder.indexOf(session.chapter)<campaignOrder.length-1&&replayable(campaignOrder[campaignOrder.indexOf(session.chapter)+1]!)?'<button id="next-chapter" class="primary">다음 전장 →</button>':''}</div></div>`,false);
    if(after){let k=0;$('#aftermath-next')?.addEventListener('click',e=>{k=(k+1)%after.beats.length;const b=after.beats[k]!;$('#aftermath-line').innerHTML=dialogueCaption(b.speaker,b.line);(e.currentTarget as HTMLButtonElement).textContent=k===after.beats.length-1?'↺ 처음 장면':'다음 장면 →';});}
    $('#result-undo').onclick=undo;$('#result-menu').onclick=showChronicle;
    $('#phase-restore')?.addEventListener('click',()=>{if(session.restorePhase()){activate();persist();}});
    $('#retry').onclick=()=>{session=new Session(session.chapter,session.difficulty,215,session.preparation,session.revision,session.deployment?{...deployment(campaign,true),...(session.wide?{wide:1 as const}:{})}:undefined);activate();persist();};
    $('#epilogue')?.addEventListener('click',showEpilogue);
    $('#next-chapter')?.addEventListener('click',()=>storyScene(campaignOrder[campaignOrder.indexOf(session.chapter)+1]!));return;
  }
  if(s.activeDialogue){const node=session.battle.dialogue.node(s.activeDialogue);{const who=node.speaker?s.find(node.speaker)?.name??node.speaker:'사마의',extra=`${session.chapter===0?`<p class="ink-extra">지참금 ${session.funds}전 · 남문 통행료 1,000전 확보</p>`:''}${session.chapter===10?'<p class="ink-extra">틀리면 신뢰가 깎이고 같은 물음을 다시 받습니다</p>':'<button id="dialogue-undo" class="ink-undo">직전 선택 무르기</button>'}`;
    modal(`<div class="dialogue ink-mode"><div class="eyebrow">${session.chapter===10?'설전 · 건업 궁정':'전장의 갈림길'}</div>${inkChoice(who,node.text,node.options.map(o=>({text:o.text,id:o.id})),{attr:'data-choice',extra,...(session.chapter===10?{gauge:{label:'신뢰',value:session.trust/Math.max(1,session.trustLimit)}}:{})})}</div>`,false);}$('#dialogue-undo')?.addEventListener('click',undo);document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b=>b.onclick=()=>{$<HTMLDialogElement>('#modal').close();act({kind:'choose',nodeId:node.id,optionId:b.dataset.choice!});const last=[...session.state.log].reverse().find(e=>e.t==='choice');if(last&&last.t==='choice'&&last.correct===false)toast(session.chapter===10?`설득이 먹히지 않았습니다. 신뢰 ${session.trust}/${session.trustLimit}`:'선택의 대가를 치렀습니다.');});}
}
field.onSound=e=>sound.event(e);field.xpFor=e=>session.xpGains.get(e);field.onAnimationEnd=()=>{render();pump();setTimeout(()=>{hudLock=false;hudHover(hudAt);},900);};
field.onCell=at=>{
  if(field.busy||menuOpen)return;const s=session.state,u=s.find(selected),target=s.unitAt(at);
  if(u?.alive&&u.side===s.currentSide&&CONTROLLABLE.has(u.side)&&!u.hasActed){
    if(mode==='heal'&&target){act({kind:'item',unit:u.id,item:'heal',target:target.id});return;}
    if(mode==='calm'&&target){act({kind:'item',unit:u.id,item:'calm',target:target.id});return;}
    if(mode==='repair'&&target&&target.side!=='enemy'){act({kind:'item',unit:u.id,item:'repair',target:target.id});return;}
    if(mode==='fortify'&&!target){act({kind:'item',unit:u.id,item:'fortify',target:at.x+','+at.y});return;}
    if(target?.side==='enemy'&&(mode==='duel'||mode==='debate')){act({kind:'item',unit:u.id,item:mode,target:target.id});return;}
    if(target?.side==='enemy'&&mode==='attack'){act({kind:'attack',unit:u.id,target:target.id});return;}
    if(s.strategies.has(mode)){act({kind:'strategy',unit:u.id,strategy:mode,at});return;}
    if(!target&&mode==='move'){act({kind:'move',unit:u.id,to:at});return;}
  }if(target)select(target.id);
};
field.onHover=at=>{hudHover(at);if(!at){$('#tile-info').textContent='끌어서 전장을 살피고, 미니맵을 눌러 옮긴다 · ⌖ 고른 장수에게로';return;}const s=session.state,u=s.find(selected),target=s.unitAt(at);const hz=s.map.tileAt(at).hazard;let line=`${terrainNames[s.map.tileAt(at).terrain]}${hz==='fire'?' · 불길(화상)':hz==='trap'&&session.scouted?' · 함정(최대 체력 25% 피해)':''} · (${at.x+1}, ${at.y+1}) · 회피 +${s.map.evasionBonus(at)}%`;if(target)line+=` · ${unitName(target)} ${target.hp} HP`;if(u&&target?.side==='enemy'&&(mode==='duel'||mode==='debate')&&session.revision>=4){const a=session.challengeAnswer(u,target,mode);line+=a.reason==='nameless'?' · 이름 없는 병사는 응하지 않는다':a.accept?` · ${a.reason==='historic'?'연의의 대결 — 반드시 응한다':'응할 것 같다'}`:` · 거절할 것 같다(${a.reason==='wounded'?'부상':'성격'})`;}if(u&&target?.side==='enemy'){const d=s.strategies.get(mode);if(d&&manhattan(u.pos,at)<=d.range)line+=` · 예상 피해 ≈${estimateStrategy(u,target,d,s.map)}`;else if(mode==='attack'&&manhattan(u.pos,at)<=u.range[1]&&manhattan(u.pos,at)>=u.range[0]){const v=previewAttack(u,target,s.map,session.battle.wouldCounter(target,u));line+=` · 명중 ${v.hit}% · 피해 ${v.damage}${v.lethal?' (격파)':''}${v.counter?` · 반격 ${v.counter.damage} (명중 ${v.counter.hit}%)`:' · 반격 없음'}`;}}if(u&&mode==='move'){const cost=s.map.moveCost(u.unitClass,at,ignoresRough(u));line+=' · 이동 비용 '+(Number.isFinite(cost)?cost:'진입 불가')+' · 지형 위력 ×'+s.map.terrainAffinity(u.unitClass,at).toFixed(2);}if(u&&target?.side==='enemy'&&mode==='attack'&&!structureKind(target.id))line+=' · '+physicalMatchup(u.unitClass,target.unitClass);$('#tile-info').textContent=line;};
function updateSound(){$('#sound-toggle').innerHTML=`♪ <span>${sound.enabled?'소리 켜짐':'음소거'}</span>`;}
$('#sound-toggle').onclick=()=>{sound.enabled=!sound.enabled;storeSettings();void sound.start().then(updateSound);};
$('#menu').onclick=showMenu;$('#brand').onclick=showMenu;$('#undo').onclick=undo;
$('#end-phase').onclick=()=>act({kind:'endPhase'});
$('#coach-close').onclick=finishCoach;
$('#zoom-in').onclick=()=>field.zoomBy(.2);$('#zoom-out').onclick=()=>field.zoomBy(-.2);$('#zoom-reset').onclick=()=>field.reset();
// 가로 모드 전용: 세로로 들면 회전 안내를 덮는다. 전체 화면을 지원하는 기기는 버튼 한 번으로 가로 고정.
{const gate=document.createElement('div');gate.id='rotate-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-label','가로 화면 안내');
  gate.innerHTML='<div class="rg-phone" aria-hidden="true"></div><b>가로로 돌려 주세요</b><p>사마의전은 가로 화면으로 진행합니다.<br>휴대폰을 옆으로 눕히면 바로 이어집니다.</p>'+(document.fullscreenEnabled?'<button type="button" class="primary" id="rg-full">전체 화면 · 가로로 시작</button>':'');
  document.body.appendChild(gate);
  gate.querySelector<HTMLButtonElement>('#rg-full')?.addEventListener('click',async()=>{try{await document.documentElement.requestFullscreen({navigationUI:'hide'});await (screen.orientation as ScreenOrientation&{lock?:(o:string)=>Promise<void>}).lock?.('landscape');}catch{/* 지원하지 않는 기기는 직접 돌린다 */}});}
$('#left-toggle').onclick=()=>{const open=document.body.classList.toggle('left-open');$('#left-toggle').setAttribute('aria-expanded',String(open));};
$('#left-close').onclick=()=>{document.body.classList.remove('left-open');$('#left-toggle').setAttribute('aria-expanded','false');};
// 휴대폰: 장수 상세는 '장수 정보' 머리를 눌러 여닫는 덧창(지도·명령이 한 화면에 들어오게)
/* 위 막대 높이를 재어 전장·패널이 화면 높이를 꼭 채우게(스크롤 없이) */
{const bar=document.querySelector<HTMLElement>('.topbar');const fit=()=>{if(bar)document.documentElement.style.setProperty('--topbar-h',bar.offsetHeight+'px');};fit();addEventListener('resize',fit);if(bar)new ResizeObserver(fit).observe(bar);}
{const head=document.querySelector<HTMLElement>('.right-panel>.section-label');if(head){head.setAttribute('role','button');head.tabIndex=0;const flip=()=>document.body.classList.toggle('unit-open');head.onclick=flip;head.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}};$('#unit-detail').addEventListener('click',()=>{if(matchMedia('(max-width:700px),(orientation:landscape) and (max-height:520px)').matches)document.body.classList.remove('unit-open');});}}
$('#threat').onclick=()=>{threat=!threat;$('#threat').setAttribute('aria-pressed',String(threat));render();};
function applySpeed(){field.playbackRate=speed;$('#speed').innerHTML=`▷ ${speed}× 속도`;}
$('#speed').onclick=()=>{speed=speed===1?2:speed===2?3:1;applySpeed();storeSettings();};
function storeSettings(){saveSettings({music:sound.musicVolume,effects:sound.effectsVolume,sound:sound.enabled,speed:speed as 1|2|3});}
{const saved=loadSettings();sound.musicVolume=saved.music;sound.effectsVolume=saved.effects;sound.enabled=saved.sound;speed=saved.speed;applySpeed();updateSound();}
$('#help').onclick=()=>modal('<div class="dialogue"><h2>전장의 길잡이</h2><p><b>천명의 원정</b> · 게임은 3편 18층 원정으로 진행됩니다. 원정은 사마의를 따르는 장수들(조진·장합·곽회·사마랑)과 함께 떠나고, 새 장수는 모병소와 전투 보상에서 영입합니다. 장수는 공격·격파·책략마다 경험치를 얻어 전투 중에도 레벨이 오릅니다. 병종마다 전법(경기병 돌격, 창병 창벽, 궁병 선제 사격 등)이 있어 조건이 맞으면 피해가 조금 더 들어갑니다. 층마다 갈림길을 고르고, 쓰러진 장수는 돌아오지 않으며, 사마의가 쓰러지면 원정이 끝납니다. 연의 전장을 이기면 영구 기록에 남고, 원정이 끝나면 천명을 얻어 본영의 천명 해금에 씁니다.</p><p>부대 선택 → 이동 → 공격·책략·대기 → 턴 종료. 본대 다음 편입 아군을 직접 조작합니다.</p><p>1 이동 · 2 공격 · 3 첫 책략 · W 대기 · Z 무르기 · E 턴 종료 · N 다음 부대 · Esc 명령 취소. 전장은 고정되어 한눈에 보입니다. 큰 전장은 +/− 버튼으로 확대하고 드래그·미니맵으로 살피세요.</p><p>일기토(무력)는 인접, 설전(지력)은 3칸 이내. 일기토는 공격·방어·기합·필살기, 설전은 논박·반론·숙고·논파를 선택합니다.</p></div>');
$('#topbar-save').onclick=()=>{menuOpen=true;clearTimeout(aiTimer);showSlots();};
$('#settings').onclick=()=>{modal(`<div class="dialogue"><h2>소리 설정</h2><label>배경음 <input id="music-volume" type="range" min="0" max="1" step=".01" value="${sound.musicVolume}"></label><label>효과음 <input id="effects-volume" type="range" min="0" max="1" step=".01" value="${sound.effectsVolume}"></label></div>`);$<HTMLInputElement>('#music-volume').oninput=e=>{sound.musicVolume=Number((e.target as HTMLInputElement).value);sound.update();storeSettings();};$<HTMLInputElement>('#effects-volume').oninput=e=>{sound.effectsVolume=Number((e.target as HTMLInputElement).value);sound.update();storeSettings();};};
$('#log-button').onclick=()=>modal(`<div class="dialogue"><h2>전투 기록</h2>${session.state.log.map(describe).filter(Boolean).slice(-60).map(t=>`<p>${esc(t)}</p>`).join('')}</div>`);
document.addEventListener('visibilitychange',()=>void sound.visibility(document.hidden));
// Every button answers with a soft wood-block click.
document.addEventListener('pointerdown',e=>{if((e.target as HTMLElement|null)?.closest?.('button'))sound.event({kind:'ui'});},true);
document.addEventListener('keydown',e=>{if($<HTMLDialogElement>('#modal').open||menuOpen||['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement).tagName))return;const key=e.key.toLowerCase();
  if(key==='z')undo();else if(e.key==='?')$('#help').click();
  else if(key==='e'){const end=$<HTMLButtonElement>('#end-phase');if(!end.disabled)end.click();}
  else if(e.key==='Escape'){if(mode!=='move'){mode='move';render();}}
  else if(key==='n'){
    // Cycle through units that can still act this phase.
    const ready=session.state.living(session.state.currentSide).filter(u=>!u.hasActed);
    if(ready.length&&CONTROLLABLE.has(session.state.currentSide)){e.preventDefault();const i=ready.findIndex(u=>u.id===selected);select(ready[(i+1)%ready.length]!.id);}
  }
  else{const id=({1:'move',2:'attack',3:session.state.find(selected)?.strategies[0],w:'wait'} as Record<string,string|undefined>)[e.key.toLowerCase()];if(id)document.querySelector<HTMLButtonElement>(`[data-command="${id}"]`)?.click();}});
// Story and gallery art reads the cut sheets through CSS; a blob URL avoids encoding megapixels into a string.
const atlasUrl=(canvas:HTMLCanvasElement)=>new Promise<string>(resolve=>canvas.toBlob(blob=>resolve(blob?URL.createObjectURL(blob):canvas.toDataURL())));
/**
 * 그림 준비: 시트를 모두 자르기까지 몇 초~수십 초(모바일)가 걸린다. 본영은 바로 띄우고,
 * 그림은 뒤에서 준비한다. 시트 하나가 실패해도 게임 전체가 멈추지 않게 하나씩 따로 받는다.
 * 준비가 끝나기 전에 누른 단추는 기다렸다가 이어서 실행한다(전투·이야기 장면은 그림이 있어야 한다).
 */
let fieldReady=false,fieldInit:Promise<void>|undefined;
// 이야기 장면에 필요한 그림(인물·배경)만 따로 기다린다. 본영·도감 단추는 그림 준비 중에도 바로 열린다.
let storyReady=false,storyArt:Promise<unknown>=new Promise(()=>{});
let artCount='';
function artProgress(done:number,total:number){
  let bar=document.getElementById('art-loading');
  if(!bar){bar=document.createElement('div');bar.id='art-loading';bar.setAttribute('role','status');document.body.appendChild(bar);}
  artCount=Math.round(done/total*100)+'%';
  bar.innerHTML=`<b>그림 준비 중</b><i><i style="width:${artCount}"></i></i><small>${done}/${total}</small>`;
  document.querySelectorAll('.art-wait-count').forEach(e=>e.textContent=artCount);
}
const waitPanel=(title:string,line:string)=>`<div class="briefing art-wait"><h2>${title}</h2><p>${line}</p><p class="art-wait-line">그림 받는 중 <b class="art-wait-count">${artCount}</b></p></div>`;
// 느린 회선·느린 PC: 그림 하나가 끝나지 않아도 게임 전체가 멈추지 않게 시간을 둔다.
const within=<T,>(p:Promise<T>,ms:number)=>Promise.race([p,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('timed out')),ms))]);
// 그림 받기 순서: 이야기 그림(인물·배경)을 먼저 받고, 전장·도감 그림은 그다음에 받는다.
// 회선이 느려도 첫 이야기가 빨리 열리게 하려는 것이다. 전투를 먼저 고르면 전장 그림을 바로 받기 시작한다.
let startRest:()=>void=()=>{};
async function boot(){
  // 병종 그림(CSS)은 화면에 나타날 때만 자른다(css-atlas.ts).
  watchCssAtlases();
  const soft=<T,>(p:Promise<T>,what:string)=>within(p,180000).catch(error=>{console.warn(what+' 그림을 읽지 못해 대신 그림을 씁니다.',error);});
  const cssAtlas=async(name:string,url:string,rows:number,columns=4,union=false,alphaCutoff=8,strictGrid=false)=>{const atlas=await spriteAtlas(url,rows,columns,union,alphaCutoff,strictGrid);document.documentElement.style.setProperty('--'+name+'-atlas','url('+await atlasUrl(atlas)+')');};
  const storyJobs=[soft(cssAtlas('officer-story','officer-story-v1.webp',2),'officer-story'),soft(loadFigures(),'인물'),soft(loadIsoArt(),'조형물'),soft(loadPaintedScenes(),'이야기 배경')];
  const total=storyJobs.length+5;let done=0;const tick=(j:Promise<unknown>)=>void j.then(()=>artProgress(++done,total));
  storyJobs.forEach(tick);artProgress(0,total);
  storyArt=Promise.all(storyJobs).then(()=>{storyReady=true;});
  let rest:Promise<unknown>|undefined;
  startRest=()=>{if(rest)return;
    field.onArtReady=()=>{if(fieldReady&&!menuOpen&&!field.busy)render();};
    fieldInit=field.init($('#map')).then(()=>{fieldReady=true;field.load(session.state);});
    const jobs:Promise<unknown>[]=[fieldInit.catch(()=>undefined),
      ...([['base','units-v3.webp',6],['extra','units-extra-v1.webp',4],['ram','ram-v1.webp',2,2]] as const).map(([name,url,rows,columns])=>soft(cssAtlas(name,url,rows,columns),name)),
      soft(navalAtlas().then(async c=>document.documentElement.style.setProperty('--naval-atlas','url('+await atlasUrl(c)+')')),'수군'),
      ];
    jobs.forEach(tick);rest=Promise.all(jobs);};
  void storyArt.then(()=>startRest());
  render();showMenu();
  await storyArt;startRest();await rest;
  if(!fieldReady){$('#map').innerHTML='<p class="render-error">전장 그래픽을 초기화하지 못했습니다. 새로고침해 주세요.</p>';await fieldInit?.catch(error=>console.error(error));}
  document.getElementById('art-loading')?.remove();
  // 그림이 늦게 들어온 본영을 다시 그린다(열린 화면이 본영일 때만).
  if(menuOpen&&document.getElementById('hub-quests'))showMenu();
}
// ?dev only: a handle for QA scripts to inspect or nudge the running battle.
if(devMode)Object.assign(window,{__sama:{get session(){return session;},get field(){return field;},render,start(chapter:number){session=new Session(chapter,'normal',215,'survival',RULES,{...deployment(campaign,true),wide:1});activate();},story(chapter:number){storyScene(chapter);},act(cmd:Command){act(cmd);}}});
void boot();
