/**
 * 승리·패배 조건을 말로 — 스테이지의 실제 판정 조건(victory·defeat)과 웹 규칙(지켜야 할 대상·기한)에서
 * 그대로 만들어, 출진 전 정비와 전투 화면이 같은 문장을 보인다.
 *
 * 판정 규칙(core/conditions.ts): order가 없는 조건은 하나만 충족해도 되고(또는),
 * order가 있는 조건은 낮은 단계부터 차례로 모두 충족해야 한다(→).
 */
import type {BattleState,StageDef,VictoryCondition} from '../../core/src/index.ts';
import {evaluate} from '../../core/src/index.ts';
import {stageRules,subject} from './stage-rules.ts';
import {classNames} from './battlefield.ts';

/** 목표 지역의 이름(규칙표 라벨이 없을 때). */
const REGION_NAMES:Record<string,string>={
  exit:'탈출 지점',rally:'집결지',south_gate:'남문',east_pass:'동쪽 관문',escort_goal:'호송 목적지',central_fort:'중앙 성채',citadel:'본성',
  camp:'적 본진',warehouse:'군량 창고',militia:'민병 거점',emperor_approach:'황제의 길목',breakthrough:'돌파 지점',xiangyang:'양양성',
  join:'합류 지점',north_camp:'북쪽 진영',keep:'본채',bridge_site:'교량 부지',shu_fort:'촉군 요새',armory:'무기고',yongning:'영녕',landing:'상륙 지점',
  // 전투 중 바뀌는 목표(change_victory)에 쓰는 지점.
  ravine_exit:'골짜기 출구',south_exit:'남쪽 출구',retreat_exit:'회군로',east_exit:'동쪽 출구',
};
/** 끝내야 하는 대화·사건의 이름. */
const DIALOGUE_NAMES:Record<string,string>={
  gate_payment:'남문 통행료 협상(사마의·사마랑이 함께 남문에 서면 열림 · 1,000전)',mountain_choice:'산길 선택(전투 시작 때 고름)',dream_3:'마지막 꿈을 깨는 대화(주유의 환영을 물리치면 열림)',accord:'맹약 체결(설전)',envoy:'사신 응대(성고 성채를 점령하면 옴)',
  mumen_turn:'목문도 반격(합류 뒤 적 차례에 벌어짐)',hulu_rain:'호로곡 비(호로곡에서 7턴 버티면 내림)',banner:'군기 사건(적 4부대를 물리치거나 6턴이 되면 일어남)',luogu_turn:'낙곡 반전(흥세 앞 요새를 점령하고 3턴쯤 지나면 벌어짐)',
};
/** 전투 중에 나타나는 장수(시작할 때는 맵에 없다). */
const LATE_NAMES:Record<string,string>={lu_bu:'여포의 환영',zhou_yu:'주유의 환영',chen_gong:'진궁의 환영'};
const SIDE_NAMES:Record<string,string>={player:'아군',ally:'편입 아군',allyAi:'우군',enemy:'적',npc:'우군'};

function regionName(stage:StageDef,id:string|undefined){
  if(!id)return '목표 지점';
  return stageRules[stage.id]?.labels?.find(l=>l.region===id)?.text??REGION_NAMES[id]??'목표 지점';
}
function line(state:BattleState,c:VictoryCondition,lose:boolean){
  // 병종 id로 적힌 조건(예: navy)은 그 병종의 아무 부대나.
  const name=(id?:string)=>{if(!id)return '';const u=state.find(id);if(u)return classNames[u.name]?`${classNames[u.name]} 부대`:u.name;return LATE_NAMES[id]??(classNames[id]?`${classNames[id]} 아무 부대`:id);};
  switch(c.type){
    case 'annihilate':return lose?`${SIDE_NAMES[c.side??'player']} 전멸`:`${SIDE_NAMES[c.side??'enemy']} 전멸`;
    case 'reach':return `${subject(name(c.unit))} ${regionName(state.stage,c.target)}에 도달`;
    case 'capture':return c.by&&c.by!=='player'?`${subject(SIDE_NAMES[c.by]??'적')} ${regionName(state.stage,c.target)} 점령`:`${regionName(state.stage,c.target)} 점령(아군이 그 칸에 서서 '거점 확보')`;
    case 'retreat':return lose?`${name(c.unit)} 퇴각`:`${name(c.unit)} 격퇴`;
    case 'survive_turns':return `${c.n??0}턴 동안 버티기`;
    case 'enemy_retreat_count':return `적 ${c.n??0}부대 격퇴`;
    case 'ally_loss_limit':return `편입 아군 ${c.n??0}부대 이상 잃음`;
    case 'dialogue_complete':return `${DIALOGUE_NAMES[c.target??'']??'작전 대화'} 마치기`;
    case 'turn_limit':return `${c.n??0}턴 넘김`;
    case 'escort_survive':return `${name(c.unit)} 생존`;
  }
}
/** 승리 조건 옆에 붙는 진행: 채운 조건은 ✓, 수를 세는 조건은 지금 몇인지. */
function progress(state:BattleState,c:VictoryCondition){
  if(evaluate(state,c))return ' ✓';
  if(c.type==='enemy_retreat_count')return ` (${state.losses.enemy}/${c.n??0})`;
  if(c.type==='annihilate')return ` (남은 ${state.living(c.side??'enemy').length})`;
  if(c.type==='survive_turns'){const start=state.survivalClocks.get(c.target??'default');return start===undefined?'':` (${Math.max(0,state.turn-start)}/${c.n??0}턴)`;}
  return '';
}
const winLine=(state:BattleState,c:VictoryCondition)=>line(state,c,false)+progress(state,c);
/** 조건 묶음을 문장들로: 아무거나 하나(또는) / 차례로 모두(→). 승리 조건에는 진행(✓·수)을 붙인다. */
function group(state:BattleState,conds:readonly VictoryCondition[],lose:boolean):string[]{
  // 이야기대로 전장을 떠난 장수(dismiss_units)의 퇴각은 더는 패배가 될 수 없으니 빼고 보인다.
  if(lose)conds=conds.filter(c=>!((c.type==='retreat'||c.type==='escort_survive')&&c.unit&&!state.find(c.unit)&&!LATE_NAMES[c.unit]&&!classNames[c.unit]));
  const say=(c:VictoryCondition)=>lose?line(state,c,true):winLine(state,c);
  const any=conds.filter(c=>c.order===undefined).map(say);
  // 차례 목표를 붙잡아 두는 규칙(stickyGoals)이면 이룬 단계에는 그때 상태와 상관없이 ✓를 붙인다.
  const steps=[...new Set(conds.filter(c=>c.order!==undefined).map(c=>c.order!))].sort((a,b)=>a-b)
    .map((o,i)=>{const t=conds.filter(c=>c.order===o).map(say).join(' 또는 ');return !lose&&state.stickyGoals&&conds===state.victory&&i<state.goalProgress&&!t.endsWith(' ✓')?t.replace(/ \(\d+\/\d+[^)]*\)$/,'')+' ✓':t;});
  const seq=steps.length<2?steps:[lose?`${steps.join('·')} 모두`:`${steps.join(' → ')} (차례로)`];
  return [...any,...seq];
}

export interface BattleConditions {win:string[];lose:string[]}
/**
 * 지금 전장의 승리·패배 조건.
 * extraLose: 규칙표 실패 조건처럼 스테이지 데이터 밖에 있는 패배(지켜야 할 장수 등) — 이름 목록.
 */
export function battleConditions(state:BattleState,o:{guarded?:readonly string[];deadline?:number;maxTurns?:number}={}):BattleConditions{
  // 지금 걸린 조건(state.victory)으로 만든다: 전투 중 목표가 바뀌는 장(change_victory)에서 처음 목표가 남아 있으면 안 된다.
  const win=group(state,state.victory,false);
  const lose=group(state,state.defeat,true);
  for(const n of o.guarded??[]){const t=`${n} 퇴각`;if(!lose.includes(t))lose.push(t);}
  const limit=o.deadline??o.maxTurns;
  if(limit)lose.push(`${limit}턴 안에 끝내지 못함`);
  // 패배 조건의 '모두'는 이름만 모아 짧게: '동문 피난민 퇴각·북문 피난민 퇴각 모두' → '동문 피난민·북문 피난민 모두 퇴각'
  for(let i=0;i<lose.length;i++){const m=/^(.+) 모두$/.exec(lose[i]!);if(m&&m[1]!.split('·').every(x=>x.endsWith(' 퇴각')))lose[i]=`${m[1]!.split('·').map(x=>x.slice(0,-3)).join('·')} 모두 퇴각`;}
  // 피난민·민중을 지키는 장: 데려갈 곳이 승리 조건에 없으면 "지키기만 하면 된다"고 밝힌다.
  const civ=state.living().filter(u=>u.unitClass==='civilian'&&u.side!=='enemy');
  if(civ.length&&!state.victory.some(c=>civ.some(u=>u.id===c.unit))){const i=lose.findIndex(l=>civ.some(u=>l.includes(u.name)));if(i>=0)lose[i]+=' (피난민은 데려갈 곳 없이 지키기만 하면 된다)';}
  return {win:win.length?win:['적 전멸'],lose};
}
/** 화면용 한 덩어리 HTML(이스케이프는 부르는 쪽이 이미 안전한 이름만 넣는다는 전제로 최소 처리). */
export function conditionsHtml(c:BattleConditions){
  const esc=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
  return `<div class="battle-conditions"><p class="cond-win"><b>승리</b> ${c.win.map(esc).join(' · ')}</p><p class="cond-lose"><b>패배</b> ${c.lose.map(esc).join(' · ')}</p></div>`;
}
