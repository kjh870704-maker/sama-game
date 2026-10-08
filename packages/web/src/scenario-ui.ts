/**
 * 시나리오 모드 화면: 장 선택 → 이야기 무대(선택) → 출진 전 정비(반드시) → 전투 → 전투 뒤 장면 → 다음 장.
 * 규칙은 scenario.ts, 무대 연출은 story-stage.ts. 연의 장의 정비·전투·보상은 main.ts의 기존 흐름을 쓴다.
 */
import {loadScenario,saveScenario,scenarioPath,winOver,currentStep,scriptOf,choose,undoChoice,finishStep,fateChoices,floorFor,scenarioParty,rewardOfficers,endingNotes,routeTales,COMPANIONS,
  ensureRun,newScenarioRun,inWhatIf,joinCaptive,pendingMarch,marchNodes,recruitOffer,relicOffer,recruitOfficer,healAll,finishMarch,marchFloor,afterFight,loseFight,runMandate,omenOffer,omenOf,chooseOmen,omenReward,addRunBonus,type ScenarioState,type ScenarioStep,type MarchNode} from './scenario.ts';
import {playScenes,playNarration,Stage} from './story-stage.ts';
import {startPersuasion,speak,reaction,PITCH,GREETING,AGREE,REFUSE,APPROACH_NAMES,PERSUADE_GOAL,type Approach} from './persuade.ts';
import {openCamp} from './story-camp.ts';
import {isoBackdrop} from './story-iso.ts';
import {routeById,fatePoint,endingFor,factionText,ALL_ENDINGS,type Route} from './fate.ts';
import {foundingOption} from './newpower.ts';
import {showFateMap} from './run-ui.ts';
import {pickFaction} from './custom-ui.ts';
import {setPlayerFlag} from './story-iso.ts';
import {chapters} from './session.ts';
import {encounterLevels} from './campaign-rules.ts';
import {treasures,type Deployment,type ScenarioDeployment} from './progression.ts';
import {romanceByName,romanceStats,temperOf} from './romance.ts';
import {temperNames} from './duel.ts';
import {playContest} from './duel-ui.ts';
import {cardFace} from './faces.ts';
import {portraitImage} from './portrait-images.ts';
import {taleSortieLimit,taleCostCap,unitCost} from './sortie.ts';
import {classNames} from './troops.ts';
import {classSprite} from './codex-ui.ts';
import {nextEvolutionText,XP_PER_LEVEL,RELICS,survivorsOf,type BattleMods,type RunBattleRef,type RunUnit} from './roguelike.ts';
import {loadMeta,saveMeta,recordStory,buyUnlock,UNLOCKS,recordOfficerLevels} from './meta.ts';
import {xpMult,restMult,mandateBonus,recruitBonus,heroLevelBonus} from './research.ts';
import {deploymentPerks} from './officer-perks.ts';
import {showResearch} from './research-ui.ts';
import {classTactics,evolvedClass,tierOf,familyOf,type BattleState,type UnitClass} from '../../core/src/index.ts';
import type {ChapterScript,ChoiceEffect,Look,Scene,Camp} from './scenario-types.ts';

export interface ScenarioHost {
  modal(html:string,closable?:boolean):void;
  /** 저장 칸(통째 저장·불러오기) */
  showSlots?():void;
  showMenu():void;
  toast(text:string):void;
  /** 연의 장의 출진 전 정비(장비·준비·난이도) → 전투 */
  storyBriefing(chapter:number,scenario:ScenarioDeployment):void;
  /** 가상 전장 출진 */
  startBattle(deployment:Deployment,seed:number,difficulty?:'normal'|'extreme'):void;
  /** 연의 진행의 사마의: 레벨과 다음 레벨까지 경험치(0~99로 환산) */
  hero():{level:number;xp:number};
  /** 사마의에게 경험치(연의 진행과 같은 기록)를 준다. 레벨이 오르면 소식 문장을 돌려준다. */
  addHeroXp(amount:number):string[];
  /** 사마의의 장비(가상 전장에도 들고 간다) */
  heroLoadout():Deployment['loadouts'];
  /** 새 회차: 연의 진행(사마의 레벨·보물·장비)을 처음으로 되돌린다. veteran이면 사마의 Lv.6에서. */
  resetCampaign(veteran:boolean):void;
}

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ACT_NAMES=['상편 · 살아남는 자','중편 · 맞서는 자','하편 · 거머쥐는 자'];
const chapterIndex=(stage:string)=>chapters.findIndex(c=>c.stage.id===stage);
const hashSeed=(id:string)=>{let h=7;for(const ch of id)h=(h*31+ch.charCodeAt(0))>>>0;return h%99991+11;};

/** 대본이 없을 때(혹은 짧은 장): 줄거리로 한 장면을 만든다. */
function fallbackScript(step:ScenarioStep,state:ScenarioState):ChapterScript{
  const title=stepTitle(step,state),synopsis=stepSynopsis(step,state);
  return {id:step.id,year:stepYear(step,state),title,synopsis,scenes:[{place:title,art:step.kind==='fate'?12:step.kind==='ending'?5:14,
    cast:[{name:'사마의',look:'strategist',at:[34,64],face:'right'}],steps:[{narrate:synopsis},{say:'사마의',line:step.kind==='fate'?'갈림길이다. 어느 길로 가든, 돌아올 수는 없다.':'때가 왔다. 가자.'}]}]};
}
export function stepTitle(step:ScenarioStep,state:ScenarioState){
  const s=scriptOf(step.id);if(s)return s.title;
  if(step.kind==='story')return chapters[chapterIndex(step.stage!)]?.stage.subtitle??step.id;
  if(step.kind==='fate')return fatePoint(step.act,state.route).title;
  if(step.kind==='tale')return step.tale!.title;
  if(step.kind==='boss')return `우두머리 · ${routeById(step.route)!.region.boss.name}`;
  return endingFor({...state.route,3:step.route??''}).title;
}
function stepYear(step:ScenarioStep,state:ScenarioState){return scriptOf(step.id)?.year??(step.kind==='story'?chapters[chapterIndex(step.stage!)]?.year??'':step.kind==='fate'?fatePoint(step.act,state.route).year:'');}
function stepSynopsis(step:ScenarioStep,state:ScenarioState){
  const s=scriptOf(step.id);if(s)return s.synopsis;
  if(step.kind==='story')return chapters[chapterIndex(step.stage!)]?.stage.synopsis??'';
  if(step.kind==='fate')return fatePoint(step.act,state.route).prompt;
  if(step.kind==='tale')return step.tale!.intro;
  if(step.kind==='boss'){const r=routeById(step.route)!;return `${r.region.name}의 주인 ${r.region.boss.name}. ${r.name}의 마지막 싸움이다.`;}
  return endingFor({...state.route,3:step.route??''}).lines.join(' ');
}
const kindTag:Record<ScenarioStep['kind'],string>={story:'연의',fate:'갈림길',tale:'가상',boss:'가상 · 우두머리',ending:'결말'};
function firstArt(step:ScenarioStep){return scriptOf(step.id)?.scenes[0]?.art??(step.kind==='fate'?12:step.kind==='ending'?5:14);}

/** 이 장에서 치른 대결(일기토·설전)의 결과. */
export function contestOf(state:ScenarioState,step:ScenarioStep){const f=state.flags.find(x=>x.startsWith(`contest:${step.id}:`));if(!f)return undefined;const [, , kind,result]=f.split(':');return {kind:kind as 'duel'|'debate',result:result as 'win'|'lose'|'draw'};}
/** 이야기 선택·출진 전 조우에서 그 자리 대결. 무력(일기토)·지력(설전)에 레벨을 더해 겨룬다. */
async function runContest(host:ScenarioHost,state:ScenarioState,step:ScenarioStep,kind:'duel'|'debate',foe:string,by='사마의',line?:string){
  const hero=host.hero(),lvOf=(n:string)=>n==='사마의'?hero.level:state.officers[n]?.level??hero.level;
  const foeLv=step.kind==='story'?hero.level:enemyBase(state,hero.level,step);
  const stat=(n:string,lv:number)=>{const r=romanceByName(n);return (kind==='duel'?(r?.war??55):(r?.int??55))+lv;};
  const r=await playContest(kind,{name:by,stat:stat(by,lvOf(by))},{name:foe,stat:stat(foe,foeLv)},{...(line?{acceptLine:line}:{}),seed:step.id+foe,done:'돌아가기'});
  state.flags=state.flags.filter(f=>!f.startsWith(`contest:${step.id}:`));state.flags.push(`contest:${step.id}:${kind}:${r}`);
  if(r==='lose'&&by==='사마의'&&state.run)state.run.hp['사마의']=Math.min(state.run.hp['사마의']??1,.7);
  saveScenario(state);return r;
}
/** 선택으로 고른 효과 → 이번 전투의 효과. */
export function modsOf(state:ScenarioState,step:ScenarioStep):BattleMods{
  const picked=state.choices[step.id],script=scriptOf(step.id),out:BattleMods={};
  // 일기토·설전에서 이겼다: 사기 상승 + (일기토) 적의 기세가 꺾인다 / (설전) 책략 MP
  const om=omenOf(state,step.id);if(om?.mod)out[om.mod]=true;
  const c=contestOf(state,step);if(c?.result==='win'){out.rally=true;if(c.kind==='debate')out.insight=true;else if(step.kind==='story')out.guard=true;else out.ambush=true;}
  if(!picked||!script)return out;
  for(const scene of script.scenes)for(const st of scene.steps)if('choice' in st)for(const o of st.options)if(o.id===picked)for(const e of o.effects??[]){
    if(e.kind==='reinforce')(out.reinforce??=[]).push({name:e.name,unitClass:e.unitClass,side:e.side});
    else if(e.kind==='rally'||e.kind==='guard'||e.kind==='insight'||e.kind==='scout'||e.kind==='ambush'||e.kind==='bold')out[e.kind]=true;
  }
  if(step.kind==='story'){delete out.reinforce;delete out.scout;delete out.ambush;delete out.bold;}
  return out;
}
const MOD_TEXT:Record<string,string>={rally:'아군 2턴 사기 상승',guard:'아군 1턴 방어 태세',insight:'사마의 책략 MP +15',scout:'적 한 부대가 나오지 않는다',ambush:'적 전원 체력 80%로 시작',bold:'적 정예 한 부대 추가 · 경험치 1.5배'};
export function modsText(m:BattleMods){return [...Object.entries(m).filter(([k,v])=>k!=='reinforce'&&v).map(([k])=>MOD_TEXT[k]!),...(m.reinforce??[]).map(r=>`${r.name}(${classNames[r.unitClass]??r.unitClass})이 ${r.side==='npc'?'초록 깃발의 NPC로':'아군으로'} 합류`)];}

// ─────────────────────────────────────────────── 장 선택

export function showScenario(host:ScenarioHost,selected?:string){
  {let s0=loadScenario();const unlocks=loadMeta().unlocks;
    // 처음 여는 사람은 새 회차(연의 첫 장부터), 예전 기록은 그 자리에서 첫 회차로 이어 간다.
    if(!s0.run&&!s0.done.length)return startNewRun(host,1);
    else if(ensureRun(s0,newSeed(),unlocks,host.hero().level))saveScenario(s0);
    if(s0.run&&s0.run.status!=='alive')return showRunOver(host);}
  const state=loadScenario(),path=scenarioPath(state),cur=currentStep(state),done=new Set(state.done),run=state.run!,march=pendingMarch(state);
  flagOf(state);
  const sel=path.find(s=>s.id===selected)??cur??path.at(-1)!;
  const route=(act:1|2|3)=>routeById(state.route[act]);
  const track=[1,2,3].map(a=>{const r=route(a as 1|2|3);return `<span class="${r&&!r.history?'if':''} ${cur&&cur.act===a?'now':''}">${ACT_NAMES[a-1]!.split(' · ')[0]} · ${r?esc(ft(state,r.name)):'갈림길 전'}</span>`;}).join('');
  const hero=host.hero();
  const card=(s:ScenarioStep,i:number)=>{const st=done.has(s.id)?'done':s===cur?'now':'locked';
    return `<button class="sc-card ${st} kind-${s.kind}" data-step="${esc(s.id)}" aria-pressed="${s===sel}"><span class="sc-thumb" style="${isoBackdrop(firstArt(s))}"></span><span class="sc-card-text"><small>${String(i+1).padStart(2,'0')} · ${kindTag[s.kind]} · ${esc(stepYear(s,state))}</small><strong>${esc(stepTitle(s,state))}</strong></span><b>${st==='done'?'◆':st==='now'?'▶':'·'}</b></button>`;};
  const groups=[1,2,3].map(a=>{const items=path.map((s,i)=>({s,i})).filter(x=>x.s.act===a);return items.length?`<h3 class="sc-act">${ACT_NAMES[a-1]}</h3>${items.map(x=>card(x.s,x.i)).join('')}`:'';}).join('');
  const isCur=sel===cur,isDone=done.has(sel.id);
  host.modal(`<div class="scenario-screen"><div class="sc-top"><div><div class="eyebrow">삼국지 · 사마의전 · 시나리오</div><h2>천명의 길</h2></div>
    <div class="sc-route">${track}</div><p class="muted">사마의 Lv.${hero.level} · 함께하는 장수 ${Object.keys(state.officers).length}명 · 마친 장 ${state.done.length}</p>${runBar(state)}</div>
    <div class="sc-body"><nav class="sc-list" aria-label="장 목록">${groups}</nav>
    <section class="sc-detail"><div class="sc-banner" style="${isoBackdrop(firstArt(sel))}"><span class="sc-kind kind-${sel.kind}">${kindTag[sel.kind]}</span><div class="sc-banner-title"><small>${esc(stepYear(sel,state))}</small><h3>${esc(stepTitle(sel,state))}</h3></div></div>
      <p class="sc-synopsis">${esc(stepSynopsis(sel,state))}</p>${detailRows(sel,state,hero.level)}
      <div class="sc-actions">${isCur&&march?`<button class="primary" id="sc-march">행군로 ▶</button><span class="muted">다음 장 앞의 길목에서 세 갈래 중 하나를 고른다</span>`:isCur?`<button class="primary" id="sc-enter">${sel.kind==='fate'?'갈림길로 ▶':sel.kind==='ending'?'결말 보기 ▶':'이야기 시작 ▶'}</button>`:isDone?`<button id="sc-replay">이야기 다시 보기</button>`:'<button disabled>앞 장을 마치면 열린다</button>'}</div></section></div>
    <div class="sc-foot"><button id="sc-back">← 본영</button><button id="sc-fate">갈림길 지도 · 정사/가상</button>${host.showSlots?'<button id="sc-save">💾 저장 · 불러오기</button>':''}<button id="sc-reset" class="${state.done.length?'':'hidden'}">이번 회차를 끝낸다</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.onclick=()=>showScenario(host,b.dataset.step));
  document.getElementById('sc-enter')?.addEventListener('click',()=>void enter(host,sel));
  document.getElementById('sc-march')?.addEventListener('click',()=>showMarch(host));
  void run;
  document.getElementById('sc-replay')?.addEventListener('click',()=>void replay(host,sel));
  document.getElementById('sc-back')!.onclick=host.showMenu;
  document.getElementById('sc-fate')!.onclick=()=>showFateMap(host,()=>showScenario(host,selected));
  document.getElementById('sc-save')?.addEventListener('click',()=>host.showSlots!());
  const reset=document.getElementById('sc-reset')!;reset.onclick=()=>{if(reset.dataset.armed!=='1'){reset.dataset.armed='1';reset.textContent='정말 끝낼까? (천명을 정산하고 연의 첫 장부터 새 회차)';reset.classList.add('danger');return;}const st=loadScenario();st.run!.status='over';saveScenario(st);showRunOver(host);};
  document.querySelector('.sc-card[aria-pressed="true"]')?.scrollIntoView({block:'nearest'});
}
function detailRows(step:ScenarioStep,state:ScenarioState,heroLevel:number){
  const rows:Array<[string,string]>=[];
  if(step.kind==='story'){const i=chapterIndex(step.stage!),c=chapters[i];rows.push(['권장 레벨',`Lv.${encounterLevels[step.stage!]??'?'}`]);if(c)rows.push(['전장',`${c.label} · ${c.map.rows[0]!.length}×${c.map.rows.length}`]);
    const t=treasures.filter(x=>x.stage===step.stage);if(t.length)rows.push(['보물',t.map(x=>x.name).join(' · ')]);}
  if(step.kind==='tale'||step.kind==='boss'){const r=routeById(step.route)!,foe=step.kind==='boss'?r.region.boss:step.tale!.target;
    rows.push(['적장',`${foe.name} (${classNames[foe.unitClass]??foe.unitClass})${romanceStats(foe.name)?' · '+romanceStats(foe.name):''}`],['지역',r.region.name],['승리 조건',`${foe.name} 격퇴 · 사마의 생존`],['적 수준',`Lv.${enemyBase(state,heroLevel,step)} 안팎`]);}
  if(step.kind==='fate'){rows.push(['고를 수 있는 길',fateChoices(state,step.id).map(r=>`${r.history?'[정사]':r.custom?'[신세력]':'[가상]'} ${r.choice}${r.history?'':` (가상 전장 ${r.tales.length}장 + 우두머리)`}`).join(' / ')]);rows.push(['진행','정사를 고르면 연의 장이 이어지고, 가상을 고르면 그 편이 위에 적은 가상 전장과 우두머리 전투로 바뀐다. 한 번 가상으로 가면 정사로 돌아오지 않는다. 자세한 것은 아래 「갈림길 지도」.']);}
  if(step.kind==='ending')rows.push(['결말',endingFor({...state.route,3:step.route??''}).title]);
  const picked=state.choices[step.id];if(picked&&step.kind!=='fate'){const m=modsText(modsOf(state,step));if(m.length)rows.push(['선택의 효과',m.join(' · ')]);}
  return rows.length?`<dl class="sc-rows">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`:'';
}
function enemyBase(state:ScenarioState,heroLevel:number,step:ScenarioStep){
  const levels=[heroLevel,...Object.values(state.officers).map(o=>o.level)],avg=levels.reduce((a,b)=>a+b,0)/levels.length;
  return Math.max(1,Math.round(avg)+(step.kind==='boss'?1:0));
}

// ─────────────────────────────────────────────── 이야기 → 정비 → 전투

async function stage(host:ScenarioHost,state:ScenarioState,step:ScenarioStep,scenes:Scene[],heading:string,choosing:boolean,narration?:{year:string;title:string;lines:readonly string[]}){
  host.modal('<div class="ss-host"></div>',false);
  const root=document.querySelector<HTMLElement>('.ss-host')!;
  // 장을 여는 해설(역사·시나리오 배경)
  if(narration?.lines.length&&scenes[0])await playNarration(root,{heading,...narration,art:scenes[0].art,place:scenes[0].place});
  await playScenes(root,scenes,{heading,flags:()=>state.flags,onChoice:(o)=>{if(choosing){choose(state,step,o.id,o.effects??[],host.hero().level);saveScenario(state);}},onContest:e=>runContest(host,state,step,e.kind,e.foe,e.by,e.line)});
}
/** 지금 장에 들어간다: 이야기 장면부터. */
export async function enter(host:ScenarioHost,step:ScenarioStep){
  const state=loadScenario();let script=scriptOf(step.id)??fallbackScript(step,state);flagOf(state);
  // 신세력 회차: 첫 갈림길에 '스스로 기치를 든다'가 더해진다.
  if(step.id==='fate:1'&&state.run?.faction){script=structuredClone(script);for(const sc of script.scenes)for(const st of sc.steps)if('choice' in st&&!st.options.some(o=>o.id==='np1'))st.options.unshift(foundingOption());}
  // 이 장을 다시 시작하면 전에 고른 답의 효과를 먼저 걷어 낸다(다른 답을 골라도 효과가 겹치지 않게).
  undoChoice(state,step);saveScenario(state);
  await stage(host,state,step,script.scenes,`${kindTag[step.kind]} · ${script.title}`,true,script.history?{year:script.year,title:script.title,lines:script.history}:undefined);
  if(step.kind==='fate'){
    if(!state.route[step.act])return showFateFallback(host,state,step);
    return afterFate(host,state,step);
  }
  if(step.kind==='ending')return showEnding(host,state,step);
  showCampFor(host,step);
}
/** 장마다 진영에서 말을 건 사람(진영을 다시 열어도 유지). */
const talkedIn=new Map<string,Set<string>>();
/** 장 id로 출진 전 진영을 다시 연다(연의 장 정비 화면의 '진영으로'). */
export function campOf(host:ScenarioHost,id:string){const step=scenarioPath(loadScenario()).find(s=>s.id===id);if(step)showCampFor(host,step);else showScenario(host,id);}
/** 출진 전 진영: 사람들에게 말을 걸고 출진 정비로. 대본에 진영이 없으면 그 장의 출연진으로 꾸린다. */
export function showCampFor(host:ScenarioHost,step:ScenarioStep){
  const state=loadScenario(),script=scriptOf(step.id),camp=script?.camp??fallbackCamp(step,state);
  if(!camp.people.length)return prepare(host,step);
  host.modal('<div class="ss-host camp-host"></div>',false);
  const talked=talkedIn.get(step.id)??new Set<string>();talkedIn.set(step.id,talked);
  openCamp(document.querySelector<HTMLElement>('.ss-host')!,{camp,heading:`${kindTag[step.kind]} · ${stepTitle(step,state)}`,flags:()=>loadScenario().flags,talked,
    onReady:()=>prepare(host,step),onBack:()=>showScenario(host,step.id)});
}
function fallbackCamp(step:ScenarioStep,state:ScenarioState):Camp{
  const script=scriptOf(step.id),last=script?.scenes.at(-1);
  const people=(last?.cast??[]).filter(m=>m.name!=='사마의').slice(0,5).map((m,i)=>({name:m.name,look:m.look,at:[18+i*16,50+(i%2)*14] as [number,number],
    talk:[{say:m.name,line:'준비는 끝났습니다. 명만 내리십시오.'},{say:'사마의',line:'서두르지 마라. 판을 읽고 나서 움직인다.'}]}));
  return {place:last?.place??stepTitle(step,state),art:last?.art??14,people};
}
async function replay(host:ScenarioHost,step:ScenarioStep){
  const state=loadScenario(),script=scriptOf(step.id)??fallbackScript(step,state);
  await stage(host,state,step,[...script.scenes,...(script.after??[])],`다시 보기 · ${script.title}`,false);
  showScenario(host,step.id);
}
/** 출진 전 정비: 이야기가 끝나면 반드시 거친다. */
export function prepare(host:ScenarioHost,step:ScenarioStep){
  const state=loadScenario();
  if(state.run&&['story','tale','boss'].includes(step.kind)&&!omenOf(state,step.id)){
    const offer=omenOffer(state,step.id);
    return choiceScreen(host,`전황 · ${stepTitle(step,state)} — 싸우기 전에 하늘을 읽는다`,offer.map(o=>({title:(o.goal?'⚑ 도전 · ':'')+o.name,detail:o.text})),i=>{const st=loadScenario();chooseOmen(st,step.id,offer[i]!.id);saveScenario(st);prepare(host,step);},'천명의 길 · 전황 카드');
  }
  if(step.kind==='story'){const run=state.run,hp=run?.hp['사마의'],h=host.hero(),recruits=scenarioParty(state,h.level,h.xp).filter(u=>!u.hero).sort((a,b)=>b.level-a.level).slice(0,3).map(u=>({...u,id:'rc_'+u.id}));host.storyBriefing(chapterIndex(step.stage!),{chapter:step.id,mods:modsOf(state,step),...(run?.relics.length?{relics:[...run.relics]}:{}),...(hp!==undefined?{heroHp:hp}:{}),...(recruits.length?{recruits}:{})});return;}
  showIfPrep(host,state,step);
}
/** 대본에 갈림길 선택이 없을 때의 대비: 길 목록에서 고른다. */
function showFateFallback(host:ScenarioHost,state:ScenarioState,step:ScenarioStep){
  const p=fatePoint(step.act,state.route),routes=fateChoices(state,step.id);
  host.modal(`<div class="briefing run-screen fate-screen"><div class="eyebrow">${esc(p.year)} · 운명의 갈림길</div><h2>${esc(p.title)}</h2><blockquote>${esc(p.prompt)}</blockquote>
  <div class="run-choices">${routes.map(r=>`<button data-route="${r.id}" class="${r.history?'history':'what-if'}"><strong><span class="route-tag">${r.custom?'신세력':r.history?'정사':'가상'}</span>${esc(ft(state,r.choice))}</strong><small>${esc(ft(state,r.detail))}</small></button>`).join('')}</div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(b=>b.onclick=()=>{choose(state,step,b.dataset.route!,[],host.hero().level);saveScenario(state);afterFate(host,state,step);});
}
function afterFate(host:ScenarioHost,state:ScenarioState,step:ScenarioStep){
  finishStep(state,step.id);saveScenario(state);
  const r=routeById(state.route[step.act])!;
  const people=Object.values(state.officers).map(o=>o.name);
  host.modal(`<div class="briefing run-screen fate-screen"><div class="eyebrow">운명의 갈림길 · ${esc(fatePoint(step.act,step.act===1?{}:step.act===2?{1:state.route[1]??''}:{1:state.route[1]??'',2:state.route[2]??''}).title)}</div><h2>${esc(ft(state,r.choice))}</h2>
  <p class="route-result ${r.history?'history':'what-if'}"><b>${r.custom?'신세력':r.history?'정사':'가상'}</b> ${esc(ft(state,r.name))} — ${esc(ft(state,r.detail))}</p>
  ${!r.history?`<p class="muted">${r.region.name} · 우두머리 ${esc(r.region.boss.name)} · 가상 전장 ${routeTales(r,state).length}장</p><p>함께하는 장수: ${people.length?esc(people.join(' · ')):'없음'}</p>`:''}
  <div class="run-actions"><button class="primary" id="fate-next">다음 장 ▶</button><button id="fate-list">장 목록</button></div></div>`,false);
  document.getElementById('fate-next')!.onclick=()=>goNext(host);
  document.getElementById('fate-list')!.onclick=()=>showScenario(host);
}
function showEnding(host:ScenarioHost,state:ScenarioState,step:ScenarioStep){
  finishStep(state,step.id);if(state.run)state.run.status='complete';const gain=settleRun(state);saveScenario(state);
  const e0=endingFor(state.route),e={...e0,title:ft(state,e0.title),lines:e0.lines.map(l=>ft(state,l))},notes=endingNotes(state);
  const meta=loadMeta();if(!meta.endings.includes(e.id)){meta.endings.push(e.id);saveMeta(meta);}
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">결말 · ${e.history?'정사':'가상'}</div><div class="ending-card ${e.history?'history':'what-if'}"><h3>${esc(e.title)}</h3>${e.lines.map(l=>`<p>${esc(l)}</p>`).join('')}${notes.map(l=>`<p class="ending-note">${esc(l)}</p>`).join('')}</div>
  <p class="muted">본 결말 ${meta.endings.length}/${ALL_ENDINGS.length} · 이번 회차 천명 +${gain}. 새 회차를 시작해 다른 갈림길을 고르면 다른 이야기와 결말이 펼쳐진다.</p>
  <div class="run-actions"><button class="primary" id="end-list">회차 정산 ▶</button><button id="end-menu">← 본영</button></div></div>`,false);
  document.getElementById('end-list')!.onclick=()=>showRunOver(host);document.getElementById('end-menu')!.onclick=host.showMenu;
}

// ─────────────────────────────────────────────── 가상 전장의 출진 전 정비

const LOOK_OF:Partial<Record<string,Look>>={infantry:'infantry',spearman:'spear',archer:'archer',cavalry:'cavalry',heavyCav:'heavy',crossbow:'crossbow',strategist:'strategist',fengshui:'sage',monk:'monk',bandit:'bandit',horseArcher:'horseArcher',shaman:'shaman',maiden:'lady',taoist:'taoist',engineer:'engineer',slinger:'archer',assassin:'assassin',rattan:'infantry',elephant:'elephant'};
const lookOf=(c:UnitClass):Look=>LOOK_OF[c]??LOOK_OF[familyOf(c)]??'infantry';

export function showIfPrep(host:ScenarioHost,state:ScenarioState,step:ScenarioStep,picked?:string[],focus?:string,difficulty:'normal'|'extreme'='normal'){
  const hero=host.hero(),names=Object.keys(state.officers);
  // 필수 장수: 대본이 정한 사람 중 지금 부대에 있는 사람. 선택 장수: 난이도에 맞춘 인원 안에서.
  const required=(scriptOf(step.id)?.required??[]).filter(n=>state.officers[n]).slice(0,3);
  const optional=names.filter(n=>!required.includes(n)),limit=Math.min(6-required.length,taleSortieLimit(step.act,step.kind==='boss',difficulty));
  const unitAt=(name:string)=>name==='사마의'?{unitClass:evolvedClass('strategist',hero.level),level:hero.level}:state.officers[name]!;
  // 극한: 인원 대신 출진 코스트(필수 장수 + 고른 장수의 병종 코스트 합)가 상한을 넘지 않게 고른다.
  const ext=difficulty==='extreme',cap=taleCostCap(step.act,step.kind==='boss'),costOf=(name:string)=>{const u=unitAt(name);return unitCost(evolvedClass(u.unitClass,u.level));};
  const fitCost=(list:string[])=>{let used=['사마의',...required].reduce((n,x)=>n+costOf(x),0);return list.filter(n=>{if(!ext)return true;const c=costOf(n);if(used+c>cap)return false;used+=c;return true;});};
  const sel=fitCost((picked??optional.slice(0,limit)).filter(n=>optional.includes(n)).slice(0,limit)),route=routeById(step.route)!,foe=step.kind==='boss'?route.region.boss:step.tale!.target;
  const costUsed=['사마의',...required,...sel].reduce((n,x)=>n+costOf(x),0);
  const f=focus??'사마의',mods=modsOf(state,step),base=enemyBase(state,hero.level,step)+(difficulty==='extreme'?2:0);
  const unitOf=(name:string)=>name==='사마의'?{name,unitClass:evolvedClass('strategist',hero.level),level:hero.level,xp:hero.xp}:state.officers[name]!;
  const card=(name:string)=>{const u=unitOf(name),c=evolvedClass(u.unitClass,u.level),must=name==='사마의'||required.includes(name),on=must||sel.includes(name);
    return `<button class="prep-officer ${on?'on':''} ${must?'must':''} ${f===name?'focus':''}" data-officer="${esc(name)}">${portraitImage(name)?`<span class="prep-sprite prep-face">${cardFace(name)}</span>`:`<span class="prep-sprite prep-troop">${classSprite(c)}</span>`}<span><strong>${esc(name)}</strong><small>${esc(classNames[c]??c)} · Lv.${u.level} ${'◆'.repeat(tierOf(c))}${ext?` · 코스트 ${unitCost(c)}`:''}</small><i class="prep-xp"><i style="width:${Math.round(u.xp/XP_PER_LEVEL*100)}%"></i></i></span>${name==='사마의'?'<em>총대장</em>':must?'<em>🔒 필수</em>':`<label class="prep-toggle"><input type="checkbox" data-sortie="${esc(name)}" ${on?'checked':''}> 출진</label>`}</button>`;};
  const u=unitOf(f),c=evolvedClass(u.unitClass,u.level),r=romanceByName(f),temper=temperOf(f),t=classTactics(c);
  host.modal(`<div class="briefing prep-screen" style="--prep-art:url('story-backgrounds-2.webp')"><div class="prep-backdrop" style="${isoBackdrop(14)}"></div><div class="eyebrow">출진 전 정비 · ${esc(kindTag[step.kind])} · ${esc(stepTitle(step,state))}</div><h2>누구를 데리고 갈 것인가</h2>
  <p class="camp-mission">승리: ${esc(foe.name)} 격퇴 · 패배: 사마의 퇴각. 지역 ${esc(route.region.name)} · 적 수준 Lv.${base} 안팎.</p>
  <div class="prep-rules"><span>필수 ${1+required.length}명(사마의${required.length?' · '+esc(required.join(' · ')):''})</span><span>선택 ${sel.length}/${limit}명</span>${ext?`<span class="prep-cost${costUsed>cap?' over':''}">출진 코스트 ${costUsed}/${cap}</span>`:''}
  <span class="prep-diff"><label><input type="radio" name="if-diff" value="normal" ${difficulty==='normal'?'checked':''}> 일반</label><label><input type="radio" name="if-diff" value="extreme" ${difficulty==='extreme'?'checked':''}> 극한 · 적 +2레벨 · 출진 코스트 제한 · 경험치 ×1.3</label></span></div>
  ${state.run?.relics.length?`<div class="run-relic-strip"><b class="muted">회차 보물 · 전원 적용</b>${state.run.relics.map(id=>RELICS.find(r=>r.id===id)).filter(Boolean).map(r=>`<span class="run-relic-card"><b>${esc(r!.name)}</b><small>${esc(r!.effect)}</small></span>`).join('')}</div>`:''}
  ${romanceByName(foe.name)?(()=>{const c=contestOf(state,step),team=['사마의',...required,...sel],best=(k:'war'|'int')=>team.slice().sort((a,b)=>(romanceByName(b)?.[k]??0)-(romanceByName(a)?.[k]??0))[0]!;
    return `<div class="prep-contest"><span class="prep-contest-face">${cardFace(foe.name)}</span><div><b>적장 ${esc(foe.name)}과(와) 마주했다</b><small>${c?`${c.kind==='duel'?'일기토':'설전'} ${c.result==='win'?'승리 — 이번 전투 사기 상승'+(c.kind==='duel'?' · 적 기세 꺾임(체력 80%)':' · 책략 MP +15'):c.result==='lose'?'패배':'무승부'}`:'싸우기 전에 겨뤄 볼 수 있다. 이기면 이번 전투가 유리해진다(한 장에 한 번).'}</small></div>${c?'':`<button data-contest="duel" data-by="${esc(best('war'))}">⚔ 일기토 · ${esc(best('war'))}</button><button data-contest="debate" data-by="${esc(best('int'))}">✒ 설전 · ${esc(best('int'))}</button>`}</div>`;})():''}
  ${modsText(mods).length?`<p class="prep-mods"><b>대사 선택의 효과</b> ${esc(modsText(mods).join(' · '))}</p>`:''}
  <div class="prep-body"><div class="prep-list">${card('사마의')}${required.map(card).join('')}${optional.map(card).join('')}</div>
  <div class="prep-detail"><div class="prep-portrait">${portraitImage(f)?`<span class="prep-sprite big prep-face">${cardFace(f)}</span>`:`<span class="prep-sprite big prep-troop">${classSprite(c)}</span>`}<div><h3>${esc(f)}</h3><p>${esc(classNames[c]??c)} · Lv.${u.level} · 경험치 ${u.xp}/${XP_PER_LEVEL}</p>${r?`<p class="muted">${esc(r.epithet)}</p>`:''}</div></div>
    ${r?`<div class="romance-stats prep-stats">${([['무력',r.war],['지력',r.int],['통솔',r.lead],['정치',r.pol],['매력',r.cha]] as const).map(([k,v])=>`<span><small>${k}</small><b>${v}</b><i style="width:${v}%"></i></span>`).join('')}</div>`:''}
    ${temper?`<p>성격 <b>${temperNames[temper]}</b> — 일기토·설전에 응하는 방식</p>`:''}${r?.skill?`<p><b>${esc(r.skill.name)}</b> ${esc(r.skill.description)}</p>`:''}
    ${t.map(x=>`<p><b class="tactic-name">전법 「${esc(x.name)}」</b> ${esc(x.description)}</p>`).join('')}<p class="muted">${esc(nextEvolutionText(c))}</p></div></div>
  <div class="run-actions"><button class="primary" id="prep-go">출진 ▶</button>${host.showSlots?'<button id="prep-save">💾 저장</button>':''}<button id="prep-camp">← 진영으로</button><button id="prep-back">장 목록</button></div></div>`,false);
  const get=()=>[...document.querySelectorAll<HTMLInputElement>('[data-sortie]')].filter(x=>x.checked).map(x=>x.dataset.sortie!);
  document.querySelectorAll<HTMLButtonElement>('[data-officer]').forEach(b=>b.onclick=e=>{if((e.target as HTMLElement).closest('.prep-toggle'))return;showIfPrep(host,state,step,get(),b.dataset.officer!,difficulty);});
  document.querySelectorAll<HTMLInputElement>('[data-sortie]').forEach(x=>x.onchange=()=>{const now=get();if(now.length>limit){x.checked=false;host.toast(`이 장에는 필수 장수 밖으로 ${limit}명까지 데려갈 수 있습니다.`);return;}if(fitCost(now).length<now.length){x.checked=false;host.toast(`극한 출진 코스트 상한(${cap})을 넘어 더 데려갈 수 없습니다.`);return;}showIfPrep(host,state,step,now,f,difficulty);});
  document.querySelectorAll<HTMLInputElement>('[name=if-diff]').forEach(x=>x.onchange=()=>showIfPrep(host,state,step,get(),f,x.value==='extreme'?'extreme':'normal'));
  document.querySelectorAll<HTMLButtonElement>('[data-contest]').forEach(b=>b.onclick=async()=>{const kind=b.dataset.contest as 'duel'|'debate';await runContest(host,state,step,kind,foe.name,b.dataset.by);showIfPrep(host,loadScenario(),step,get(),f,difficulty);});
  document.getElementById('prep-back')!.onclick=()=>showScenario(host,step.id);
  document.getElementById('prep-save')?.addEventListener('click',()=>host.showSlots!());
  document.getElementById('prep-camp')!.onclick=()=>showCampFor(host,step);
  document.getElementById('prep-go')!.onclick=()=>launch(host,state,step,[...required,...fitCost(get())],difficulty);
}
/** 연구·장수 효과를 배치에 적는다(출진 순간의 값). */
function perksFor(party:ReadonlyArray<{name:string;unitClass:UnitClass}>){const p=deploymentPerks(loadMeta(),party.map(u=>({name:u.name,unitClass:u.unitClass})));return p?{perks:p}:{};}
/** 전투가 끝나면 장수들이 닿은 레벨을 남긴다(장수 효과의 필요 레벨). */
function noteLevels(party:ReadonlyArray<{name:string;level:number}>){const m=loadMeta();recordOfficerLevels(m,party);saveMeta(m);}
function launch(host:ScenarioHost,state:ScenarioState,step:ScenarioStep,picked:string[],difficulty:'normal'|'extreme'){
  const hero=host.hero(),party=scenarioParty(state,hero.level,hero.xp,picked),mods=modsOf(state,step);
  const ref:RunBattleRef={seed:runSeed(state,step.id),floor:floorFor(step,state),kind:step.kind==='boss'?'boss':'tale',party,relics:[...(state.run?.relics??[])],route:{...state.route},
    ...(step.kind==='tale'?{tale:step.id}:{}),...(Object.keys(mods).length?{mods}:{}),enemyBase:enemyBase(state,hero.level,step),scenario:step.id};
  const loadout=host.heroLoadout()?.sima_yi;
  const deployment:Deployment={levels:{sima_yi:hero.level,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},...(loadout?{loadouts:{sima_yi:loadout}}:{}),run:ref,trial:1,...perksFor(party),scenario:{chapter:step.id,...(difficulty==='extreme'?{difficulty:'extreme' as const}:{})}};
  host.startBattle(deployment,runSeed(state,step.id),difficulty);
}

// ─────────────────────────────────────────────── 전투가 끝난 뒤

/** 가상 전장 전투가 끝났을 때(main.ts가 부른다). */
export async function finishIfBattle(host:ScenarioHost,state:BattleState,deployment:Deployment,earned:Record<string,number>){
  const chapter=deployment.scenario?.chapter??'';
  if(chapter.startsWith('march:'))return finishMarchBattle(host,state,deployment,earned,chapter.slice(6));
  const sc=loadScenario(),step=scenarioPath(sc).find(s=>s.id===chapter);
  if(!step)return showScenario(host);
  const ref=deployment.run!,surv=survivorsByName(state,ref);
  if(state.outcome!=='victory')return defeat(host,sc,step);
  const mult=(ref.mods?.bold?1.5:1)*(deployment.scenario?.difficulty==='extreme'?1.3:1),bonus=step.kind==='boss'?90:70;
  const lost=afterFight(sc,ref.party.filter(u=>surv[u.name]!==undefined||!u.hero),surv,stepTitle(step,sc));
  const news=rewardOfficers(sc,ref.party.filter(u=>surv[u.name]!==undefined),earned,bonus,mult*xpMult(loadMeta()));
  if(lost.length)news.unshift(`중상: ${lost.join(' · ')} — 물러나 치료받고 체력 25%로 다시 나선다.`);
  if(step.kind==='boss')healAll(sc,1);
  news.push(...host.addHeroXp(Math.round((140+(earned.sima_yi??0))*mult)));
  const back=winOver(sc,step,Math.max(1,(ref.party[0]?.level??2)-1));if(back)news.push(`${back} 귀순 — 다시 사마의의 부대에 합류했다.`);
  finishStep(sc,step.id);saveScenario(sc);noteLevels([...Object.values(sc.officers),{name:'사마의',level:host.hero().level}]);
  // 가상 시나리오: 꺾은 적장이 붙잡혔다. 설득하면 부대에 들어온다.
  const foe=step.tale?.target;
  if(step.kind==='tale'&&foe&&!back&&!sc.officers[foe.name]&&Object.keys(sc.officers).length<8){
    const level=Math.max(1,Math.round(ref.party.reduce((a,u)=>a+u.level,0)/Math.max(1,ref.party.length))-1);
    const tryIt=await captiveChoice(host,foe.name,foe.unitClass);
    if(tryIt){const ok=await persuadeOfficer(host,foe.name,foe.unitClass,runSeed(sc,step.id+'#captive'));const st=loadScenario();
      if(ok&&joinCaptive(st,foe.name,foe.unitClass,level)){saveScenario(st);news.push(`${foe.name}이(가) 설득에 응해 사마의의 부대에 들어왔다.`);}else news.push(`${foe.name}은(는) 끝내 고개를 숙이지 않았다. 사마의는 그를 놓아 보냈다.`);}
    else news.push(`${foe.name}을(를) 놓아 보냈다.`);
  }
  news.push(...await battleSpoils(host,step,state));
  await afterVictory(host,sc,step,news);
}
/** 연의 장 전투가 끝났을 때(main.ts가 보상 처리 뒤에 부른다). */
export async function finishStoryBattle(host:ScenarioHost,chapterId:string,victory:boolean,news:string[],heroHp?:number,battle?:BattleState,recruits?:RunUnit[],earned:Record<string,number>={}){
  const sc=loadScenario(),step=scenarioPath(sc).find(s=>s.id===chapterId);
  if(!step)return showScenario(host);
  if(!victory)return defeat(host,sc,step);
  if(sc.run&&heroHp!==undefined){if(heroHp>=0.999)delete sc.run.hp['사마의'];else sc.run.hp['사마의']=Math.max(.05,heroHp);}
  // 함께 나선 영입 장수: 체력(쓰러졌으면 중상)과 경험치를 회차에 남긴다.
  if(battle&&recruits?.length){const surv:Record<string,number>={};for(const r of recruits){const u=battle.find(r.id);if(u?.alive)surv[r.name]=Math.max(.05,u.hp/u.stats.maxHp);}
    const lost=afterFight(sc,recruits,surv,stepTitle(step,sc));news.push(...rewardOfficers(sc,recruits.filter(r=>surv[r.name]!==undefined),earned,50,xpMult(loadMeta())));
    if(lost.length)news.push(`중상: ${lost.join(' · ')} — 다음 싸움엔 체력 25%로 나선다.`);}
  finishStep(sc,step.id);saveScenario(sc);
  if(battle)news.push(...await battleSpoils(host,step,battle));
  await afterVictory(host,sc,step,news);
}
/** 붙잡은 적장을 설득할지 묻는다. */
function captiveChoice(host:ScenarioHost,name:string,unitClass:UnitClass){
  const r=romanceByName(name),t=temperOf(name);
  return new Promise<boolean>(done=>{host.modal(`<div class="briefing run-screen"><div class="eyebrow">가상 시나리오 · 붙잡은 적장</div><h2>${esc(name)}이(가) 붙잡혔다</h2>
    <p>${r?esc(r.epithet)+' · ':''}${esc(classNames[unitClass]??unitClass)}${r?` · ${esc(romanceStats(name))}`:''}${t?` · 성격 ${temperNames[t]}`:''}</p>
    <p class="muted">설득하면 사마의의 부대에 들어온다. 마음이 움직이지 않으면 놓아 보낸다.</p>
    <div class="run-actions"><button class="primary" id="cap-talk">설득한다 ▶</button><button id="cap-free">놓아 보낸다</button></div></div>`,false);
    document.getElementById('cap-talk')!.onclick=()=>done(true);document.getElementById('cap-free')!.onclick=()=>done(false);});
}
async function afterVictory(host:ScenarioHost,sc:ScenarioState,step:ScenarioStep,news:string[]){
  const script=scriptOf(step.id);
  if(script?.after?.length)await stage(host,sc,step,script.after,`전투 뒤 · ${script.title}`,false);
  const next=currentStep(loadScenario());
  host.modal(`<div class="result scenario-result"><div class="result-character">승</div><h2>${esc(stepTitle(step,sc))}</h2><p>${kindTag[step.kind]} · ${esc(stepYear(step,sc))}</p>
  ${news.length?`<div class="run-news">${news.map(n=>`<p${n.startsWith('진화!')?' class="evo"':''}>${esc(n)}</p>`).join('')}</div>`:''}
  ${next?`<p class="muted">다음 장 · ${esc(kindTag[next.kind])} · ${esc(stepTitle(next,loadScenario()))}</p>`:''}
  <div class="modal-actions"><button id="res-list">장 목록</button>${next?`<button class="primary" id="res-next">${pendingMarch(loadScenario())?'행군로 ▶':'다음 장 ▶'}</button>`:''}</div></div>`,false);
  document.getElementById('res-list')!.onclick=()=>showScenario(host,next?.id);
  document.getElementById('res-next')?.addEventListener('click',()=>goNext(host));
}
function showDefeat(host:ScenarioHost,step:ScenarioStep){
  host.modal(`<div class="result scenario-result"><div class="result-character">패</div><h2>천명의 가호</h2><p>${esc(stepTitle(step,loadScenario()))} — 졌지만 하늘이 한 번 사마의를 지켰다. 체력 30%로 물러났다. 가호는 회차마다 한 번뿐이다.</p>
  <div class="modal-actions"><button id="def-list">장 목록</button><button class="primary" id="def-retry">출진 전 정비로</button></div></div>`,false);
  document.getElementById('def-list')!.onclick=()=>showScenario(host,step.id);
  document.getElementById('def-retry')!.onclick=()=>prepare(host,step);
}
// ─────────────────────────────────────────────── 로그라이크 회차

const newSeed=()=>Math.floor(Math.random()*2147483646)+1;
const runSeed=(state:ScenarioState,id:string)=>((state.run?.seed??7)^hashSeed(id))%2147483646+1;
function survivorsByName(state:BattleState,ref:RunBattleRef){const byId=survivorsOf(state,ref),out:Record<string,number>={};for(const u of ref.party)if(byId[u.id]!==undefined)out[u.name]=byId[u.id]!;return out;}
/** 회차 정보 한 줄: 회차·보물·쓰러진 장수·가호. */
function runBar(state:ScenarioState){
  const run=state.run;if(!run)return '';
  const relics=run.relics.map(id=>RELICS.find(r=>r.id===id)).filter(Boolean).map(r=>`<span class="run-relic" title="${esc(r!.effect)}">${esc(r!.name)}</span>`).join('');
  const hurt=Object.entries(run.hp).filter(([,v])=>v<1).map(([k,v])=>`${esc(k)} ${Math.round(v*100)}%`).join(' · ');
  return `<p class="sc-runbar"><b>천명의 길 제${run.no}회차</b>${run.faction?` · <span class="sc-faction" style="--fc:${run.faction.color}">${esc(run.faction.emblem)}</span> ${esc(run.faction.name)}`:''} · 행군 ${run.nodes} · 천명의 가호 ${run.guard?'있음':'없음'}${hurt?` · 다친 사람 ${hurt}`:''}</p>${relics?`<p class="run-relics">${relics}</p>`:''}`;
}
/** 다음으로: 행군로가 남았으면 행군로, 아니면 다음 장. */
function goNext(host:ScenarioHost):void{const st=loadScenario();if(pendingMarch(st))return showMarch(host);const n=currentStep(st);if(n)void enter(host,n);else showScenario(host);}
/** 행군로: 장과 장 사이의 세 갈래. */
export function showMarch(host:ScenarioHost):void{
  const state=loadScenario(),after=pendingMarch(state);if(!after)return goNext(host);
  const run=state.run!,meta=loadMeta(),nodes=marchNodes(state,after,meta.unlocks.includes('scout_map')?4:3),next=currentStep(state)!;
  if(run.march)return launchMarch(host,state,after,run.march);
  host.modal(`<div class="briefing run-screen march-screen"><div class="eyebrow">천명의 길 제${run.no}회차 · 행군로</div><h2>다음 장 「${esc(stepTitle(next,state))}」으로 가는 길</h2>
  <p class="muted">세 갈래 중 하나를 고른다. 같은 회차에서는 같은 길이 나온다.</p>${runBar(state)}
  <div class="run-choices">${nodes.map((n,i)=>`<button data-march="${i}" class="march-${n.kind}"><strong>${esc(n.label)}</strong><small>${esc(n.detail)}</small></button>`).join('')}</div>
  <div class="run-actions"><button id="march-list">장 목록</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-march]').forEach(b=>b.onclick=()=>pickMarch(host,after,nodes[Number(b.dataset.march)]!));
  document.getElementById('march-list')!.onclick=()=>showScenario(host);
}
function pickMarch(host:ScenarioHost,after:string,node:MarchNode){
  const state=loadScenario(),run=state.run!,meta=loadMeta(),hero=host.hero();
  const done=(news:string[])=>{finishMarch(state,after);saveScenario(state);marchResult(host,node.label,news);};
  if(node.kind==='rest'){healAll(state,Math.min(1,(meta.unlocks.includes('field_medic')?1:.6)*restMult(meta)));return done(['의원에서 사마의와 장수들이 기운을 되찾았다.']);}
  if(node.kind==='training'){const party=scenarioParty(state,hero.level,hero.xp),news=rewardOfficers(state,party,{},100);news.push(...host.addHeroXp(80));return done(news);}
  if(node.kind==='recruit'){const offer=recruitOffer(state,after);if(!offer.length)return done(['맞아들일 사람이 없었다.']);
    return choiceScreen(host,inWhatIf(state)?'모병소 · 누구를 설득할까 (가상 시나리오 — 설득해야 합류)':'모병소 · 누구를 맞아들일까',offer.map(o=>({title:`${o.name} (${classNames[o.unitClass]??o.unitClass})`,detail:`${romanceStats(o.name)??''}${temperOf(o.name)?` · 성격 ${temperNames[temperOf(o.name)!]}`:''}`})),i=>{const o=offer[i]!;
      if(!inWhatIf(state)){recruitOfficer(state,o.name,hero.level+recruitBonus(meta),meta.unlocks.includes('elite_recruits'));return done([`${o.name}이(가) 사마의의 부대에 들어왔다.`]);}
      void persuadeOfficer(host,o.name,o.unitClass,run.seed^hashSeed(after)).then(ok=>{if(ok){recruitOfficer(state,o.name,hero.level+recruitBonus(meta),meta.unlocks.includes('elite_recruits'));done([`${o.name}이(가) 설득에 응해 사마의의 부대에 들어왔다.`]);}else done([`${o.name}은(는) 이번엔 거절하고 떠났다. 다른 길목에서 다시 만날 수 있다.`]);});});}
  if(node.kind==='treasure'){const offer=relicOffer(state,after);if(!offer.length)return done(['보물고는 비어 있었다.']);
    return choiceScreen(host,'보물고 · 무엇을 들고 갈까',offer.map(r=>({title:r.name,detail:r.effect})),i=>{run.relics.push(offer[i]!.id);done([`보물 「${offer[i]!.name}」을 얻었다.`]);});}
  run.march=node.kind;saveScenario(state);launchMarch(host,state,after,node.kind);
}
/** 이긴 뒤: 전황 도전의 결과를 정산하고, 전공 보상 셋 중 하나를 고른다(천명·보물·치료/수련). */
function battleSpoils(host:ScenarioHost,step:ScenarioStep,battle:BattleState):Promise<string[]>{
  const sc=loadScenario(),out:string[]=[];if(!sc.run)return Promise.resolve(out);
  const om=omenOf(sc,step.id),got=omenReward(om,{turn:battle.turn,lost:battle.losses.player});
  if(om?.goal){if(got){addRunBonus(sc,got);out.push(`전황 「${om.name}」 달성 — 천명 +${got}`);}else out.push(`전황 「${om.name}」을(를) 이루지 못했다.`);}
  saveScenario(sc);
  const relic=relicOffer(sc,step.id+'#spoils',1)[0],wounded=Object.values(sc.run.hp).some(v=>v<1),h=host.hero();
  const items:Array<{title:string;detail:string;take:(st:ScenarioState)=>string}>=[
    {title:'천명 +3',detail:'공을 하늘에 돌린다 · 회차가 끝날 때 연구에 쓸 천명으로 받는다',take:st=>{addRunBonus(st,3);return '전공 보상 — 천명 +3';}},
    ...(relic?[{title:`보물 · ${relic.name}`,detail:relic.effect+' · 이번 회차 내내 전원에게',take:(st:ScenarioState)=>{st.run!.relics.push(relic.id);return `전공 보상 — 보물 「${relic.name}」`;}}]:[]),
    wounded?{title:'군의 치료',detail:'다친 장수 모두 체력을 회복한다',take:st=>{healAll(st,1);return '전공 보상 — 모든 장수가 회복했다';}}
      :{title:'장수 수련',detail:'함께 싸우는 장수들 경험치 +60',take:st=>{const lines=rewardOfficers(st,scenarioParty(st,h.level,h.xp).filter(u=>!u.hero),{},60);return ['전공 보상 — 장수 수련',...lines].join(' · ');}},
  ];
  return new Promise(done=>choiceScreen(host,'전공 보상 · 무엇을 받을까',items,i=>{const st=loadScenario();out.push(items[i]!.take(st));saveScenario(st);done(out);},'전공 보상'));
}
function choiceScreen(host:ScenarioHost,title:string,items:Array<{title:string;detail:string}>,pick:(i:number)=>void,eyebrow='행군로'){
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2><div class="run-choices">${items.map((it,i)=>`<button data-pick="${i}"><strong>${esc(it.title)}</strong><small>${esc(it.detail)}</small></button>`).join('')}</div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(b=>b.onclick=()=>pick(Number(b.dataset.pick)));
}
function marchResult(host:ScenarioHost,label:string,news:string[]){
  const next=currentStep(loadScenario());
  host.modal(`<div class="result scenario-result"><div class="result-character">길</div><h2>${esc(label)}</h2>${news.length?`<div class="run-news">${news.map(n=>`<p${n.startsWith('진화!')?' class="evo"':''}>${esc(n)}</p>`).join('')}</div>`:''}
  ${next?`<p class="muted">다음 장 · ${esc(kindTag[next.kind])} · ${esc(stepTitle(next,loadScenario()))}</p>`:''}
  <div class="modal-actions"><button id="mr-list">장 목록</button><button class="primary" id="mr-next">다음 장 ▶</button></div></div>`,false);
  document.getElementById('mr-list')!.onclick=()=>showScenario(host);document.getElementById('mr-next')!.onclick=()=>goNext(host);
}
function launchMarch(host:ScenarioHost,state:ScenarioState,after:string,kind:'battle'|'elite'|string){
  const hero=host.hero(),next=currentStep(state)!,party=scenarioParty(state,hero.level,hero.xp);
  const levels=party.map(u=>u.level),base=Math.max(1,Math.round(levels.reduce((a,b)=>a+b,0)/levels.length)+(kind==='elite'?1:0));
  const ref:RunBattleRef={seed:runSeed(state,'march:'+after),floor:marchFloor(state,next.act),kind:kind==='elite'?'elite':'battle',party,relics:[...state.run!.relics],route:{...state.route},enemyBase:base,scenario:'march:'+after};
  const loadout=host.heroLoadout()?.sima_yi;
  const deployment:Deployment={levels:{sima_yi:hero.level,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},...(loadout?{loadouts:{sima_yi:loadout}}:{}),run:ref,trial:1,...perksFor(party),scenario:{chapter:'march:'+after}};
  host.startBattle(deployment,ref.seed);
}
async function finishMarchBattle(host:ScenarioHost,battle:BattleState,deployment:Deployment,earned:Record<string,number>,after:string){
  const state=loadScenario(),ref=deployment.run!,surv=survivorsByName(battle,ref),kind=ref.kind;
  if(battle.outcome!=='victory'){
    if(loseFight(state)){finishMarch(state,after);saveScenario(state);return marchResult(host,'천명의 가호',['길목의 싸움에서 졌지만 하늘이 한 번 사마의를 지켰다. 체력 30%로 물러났다. (가호는 회차마다 한 번)']);}
    saveScenario(state);return showRunOver(host);}
  const lost=afterFight(state,ref.party,surv,`행군 · ${kind==='elite'?'정예 전투':'전투'}`);
  const news=rewardOfficers(state,ref.party.filter(u=>surv[u.name]!==undefined),earned,kind==='elite'?70:50,xpMult(loadMeta()));news.push(...host.addHeroXp(80+(earned.sima_yi??0)));noteLevels([...Object.values(state.officers),{name:'사마의',level:host.hero().level}]);
  if(lost.length)news.unshift(`중상: ${lost.join(' · ')} — 물러나 치료받고 체력 25%로 다시 나선다.`);
  delete state.run!.march;saveScenario(state);
  const relics=relicOffer(state,after+'#win',kind==='elite'?3:1),recruits=kind==='elite'?[]:recruitOffer(state,after+'#win',1);
  const items=[...relics.map(r=>({title:`보물 · ${r.name}`,detail:r.effect,take:()=>{state.run!.relics.push(r.id);return `보물 「${r.name}」을 얻었다.`;}})),
    ...recruits.map(o=>({title:`${inWhatIf(state)?'장수 설득':'장수 영입'} · ${o.name} (${classNames[o.unitClass]??o.unitClass})`,detail:`${romanceStats(o.name)??''}${inWhatIf(state)?' · 설득에 성공하면 합류':''}`,take:async()=>{const ok=!inWhatIf(state)||await persuadeOfficer(host,o.name,o.unitClass,state.run!.seed^hashSeed(after+'#win'));if(!ok)return `${o.name}은(는) 이번엔 거절하고 떠났다.`;recruitOfficer(state,o.name,host.hero().level+recruitBonus(loadMeta()),loadMeta().unlocks.includes('elite_recruits'));return `${o.name}이(가) 부대에 들어왔다.`;}})),
    ...(kind==='elite'?[]:[{title:'휴식',detail:'사마의와 장수들의 체력 40% 회복',take:()=>{healAll(state,.4*restMult(loadMeta()));return '잠시 쉬며 숨을 골랐다.';}}])];
  if(!items.length){finishMarch(state,after);saveScenario(state);return marchResult(host,'행군 전투 승리',news);}
  choiceScreen(host,`행군 전투 승리 · 보상 하나`,items,i=>{void Promise.resolve(items[i]!.take()).then(line=>{news.push(line);finishMarch(state,after);saveScenario(state);marchResult(host,'행군 전투 승리',news);});});
}
/**
 * 장수 설득: 군막에 마주 서서 사마의가 세 번 말을 건넨다. 상대의 마음이 70에 닿으면 합류(true), 아니면 거절(false).
 * 본편의 모병소·전투 보상, 천명의 원정의 장수 영입이 모두 이 과정을 거친다.
 */
export async function persuadeOfficer(host:Pick<ScenarioHost,'modal'>,name:string,unitClass:UnitClass,seed:number):Promise<boolean>{
  const p=startPersuasion(name,seed),r=romanceByName(name);
  host.modal(`<div class="ss-host"><div class="ss-root"><div class="ss-head"><span class="eyebrow">장수 설득 · ${esc(name)}${r?` · ${esc(r.epithet)}`:''}</span></div>
    <div class="persuade-gauge"><span>${esc(name)}의 마음 · 성격 <b>${temperNames[p.temper]}</b></span><i class="pg-bar"><i class="pg-fill" style="width:${p.heart}%"></i><i class="pg-goal" style="left:${PERSUADE_GOAL}%"></i></i><b class="pg-num">${p.heart}</b></div>
    <div class="ss-frame"></div><div class="ss-controls"><span class="muted">세 번 말을 건넨다. 마음이 ${PERSUADE_GOAL}에 닿으면 합류한다.</span><button type="button" class="primary ss-next">다음 ▶</button></div></div></div>`,false);
  const frame=document.querySelector<HTMLElement>('.ss-host .ss-frame')!,gauge=document.querySelector<HTMLElement>('.persuade-gauge')!;
  const stage=new Stage(frame,14,'군막 · 설득',[{name:'사마의',look:'strategist',at:[38,66],face:'right'},{name,look:lookOf(unitClass)}]);
  document.querySelector<HTMLButtonElement>('.ss-host .ss-next')!.onclick=()=>stage.next();
  const show=(delta?:number)=>{gauge.querySelector<HTMLElement>('.pg-fill')!.style.width=p.heart+'%';gauge.querySelector('.pg-num')!.textContent=String(p.heart)+(delta!==undefined?` (${delta>=0?'+':''}${delta})`:'');gauge.classList.toggle('pg-ok',p.heart>=PERSUADE_GOAL);};
  await stage.run([{enter:name,at:[60,58],from:'right'},{say:name,line:GREETING[p.temper],to:'사마의'},{say:'사마의',line:'그대를 청하러 왔소. 내 말을 들어 주시오.',to:name}],{flags:()=>[]});
  while(p.status==='talking'){
    const round=p.round,opts=p.options[round]!;let chosen:Approach|undefined;
    await stage.run([{choice:'사마의',options:opts.map(a=>({id:a,text:PITCH[a][round]!,note:`${APPROACH_NAMES[a]}${p.picked.includes(a)?' · 이미 쓴 방식(반만 통한다)':''}`,reply:PITCH[a][round]!}))}],{flags:()=>[],onChoice:o=>{chosen=o.id as Approach;}});
    const d=speak(p,chosen!);show(d);const rx=reaction(d,round);
    await stage.run([{emote:name,text:rx.emote},{say:name,line:rx.line,to:'사마의'}],{flags:()=>[]});
  }
  const won=p.status==='won';
  await stage.run(won?[{emote:name,text:'♪'},{say:name,line:AGREE[p.round%AGREE.length]!,to:'사마의'},{say:'사마의',line:'고맙소. 함께 천하를 읽읍시다.',to:name}]
    :[{emote:name,text:'…'},{say:name,line:REFUSE,to:'사마의'},{say:'사마의',line:'때는 다시 오지. 기다리겠소.',to:name},{exit:name,to:'right'}],{flags:()=>[]});
  return won;
}

/** 졌다: 가호가 있으면 한 번 견디고, 없으면 회차가 끝난다. */
function defeat(host:ScenarioHost,state:ScenarioState,step:ScenarioStep){
  if(loseFight(state)){saveScenario(state);return showDefeat(host,step);}
  saveScenario(state);showRunOver(host);
}
/** 회차 정산: 천명을 한 번만 준다. 이긴 연의 전장·가상 전장은 천명 기록에 남는다. */
function settleRun(state:ScenarioState){
  const run=state.run;if(!run||run.settled)return 0;
  const meta=loadMeta(),gain=runMandate(state)+mandateBonus(meta),done=new Set(state.done);
  meta.mandate+=gain;meta.earned+=gain;meta.runs++;if(run.status==='complete')meta.wins++;
  for(const st of scenarioPath(state))if(done.has(st.id)){if(st.kind==='story'&&st.stage)recordStory(meta,st.stage);}
  saveMeta(meta);run.settled=true;return gain;
}
/** 회차가 끝났다(패배·결말·포기): 정산하고 해금을 사서 새 회차로. */
export function showRunOver(host:ScenarioHost){
  const state=loadScenario(),run=state.run!;settleRun(state);saveScenario(state);
  const meta=loadMeta(),gain=runMandate(state)+mandateBonus(meta),done=new Set(state.done),cleared=scenarioPath(state).filter(x=>done.has(x.id)&&x.kind!=='fate'&&x.kind!=='ending').length;
  const won=run.status==='complete';
  const unlocks=UNLOCKS.map(u=>`<button data-unlock="${u.id}" ${meta.unlocks.includes(u.id)||meta.mandate<u.cost?'disabled':''}><strong>${esc(u.name)} ${meta.unlocks.includes(u.id)?'✓':`· 천명 ${u.cost}`}</strong><small>${esc(u.effect)}</small></button>`).join('');
  host.modal(`<div class="briefing run-screen"><div class="eyebrow">천명의 길 제${run.no}회차 · ${won?'완주':'끝'}</div><h2>${won?'한 생을 끝까지 걸었다':'천명이 다했다'}</h2>
  <p>${won?'결말까지 이르렀다.':'사마의는 여기서 쓰러졌다. 그러나 남긴 것은 다음 생으로 이어진다.'} 마친 장 ${cleared} · 행군 ${run.nodes}</p>
  <p class="route-result history"><b>천명 +${gain}</b> 지금 천명 ${meta.mandate} · 누적 ${meta.earned} · 회차 ${meta.runs}</p>
  <h3>천명 해금 — 다음 회차부터</h3><div class="run-choices unlock-list">${unlocks}</div>
  <p class="muted">천명은 아래 해금 말고도 <b>연구</b>(전투·내정·편성 나무)와 <b>장수 효과</b>(인물열전)에 쓸 수 있다.</p><div class="run-actions"><button class="primary" id="run-new">새 회차 · 연의 첫 장부터 ▶</button><button id="run-research">연구 ▸</button><button id="run-menu">← 본영</button></div></div>`,false);
  document.querySelectorAll<HTMLButtonElement>('[data-unlock]').forEach(b=>b.onclick=()=>{const m=loadMeta();if(buyUnlock(m,b.dataset.unlock!)){saveMeta(m);host.toast('해금했다. 다음 회차부터 적용된다.');}showRunOver(host);});
  document.getElementById('run-new')!.onclick=()=>startNewRun(host,run.no+1);
  document.getElementById('run-research')!.onclick=()=>showResearch({modal:host.modal,toast:host.toast,back:()=>showRunOver(host)});
  document.getElementById('run-menu')!.onclick=host.showMenu;
}
/** 새 회차: 연의 진행을 되돌리고 연의 첫 장부터. */
export function startNewRun(host:ScenarioHost,no?:number){
  const number=no??(loadScenario().run?.no??0)+1;
  pickFaction(host,(faction,companions)=>{
    const meta=loadMeta();if(number>1||loadScenario().done.length){host.resetCampaign(meta.unlocks.includes('veteran_start'));
      // 연구 '단련': 새 회차의 사마의가 몇 레벨 높게 시작한다.
      for(let i=0;i<heroLevelBonus(meta);i++)host.addHeroXp(100+(host.hero().level-1)*20);}
    talkedIn.clear();
    const state=newScenarioRun(number,newSeed(),meta.unlocks,host.hero().level,{...(faction?{faction}:{}),...(companions?{customs:companions}:{})});saveScenario(state);
    const first=currentStep(state);if(first)void enter(host,first);else showScenario(host);
  },()=>host.showMenu());
}
/** 신세력의 글('{세력}')을 이 회차의 세력 이름으로. */
const ft=(state:ScenarioState,text:string)=>factionText(text,state.run?.faction?.name);
/** 무대 깃발: 신세력이면 그 문장·색, 아니면 위. */
function flagOf(state:ScenarioState){const f=state.run?.faction;setPlayerFlag(f?.emblem??'위',f?.color??'#1f3f8a');}

/** 본영 카드에 쓰는 요약. */
export function scenarioSummary(){const s=loadScenario(),cur=currentStep(s);return {state:s,current:cur,title:cur?stepTitle(cur,s):'결말까지 보았다',tag:cur?kindTag[cur.kind]:'완결'};}
export {COMPANIONS};
export type {Route,ChoiceEffect};
