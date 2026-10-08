/**
 * 승리·패배 조건을 말로 — 스테이지의 실제 판정 조건(victory·defeat)과 웹 규칙(지켜야 할 대상·기한)에서
 * 그대로 만들어, 출진 전 정비와 전투 화면이 같은 문장을 보인다.
 *
 * 판정 규칙(core/conditions.ts): order가 없는 조건은 하나만 충족해도 되고(또는),
 * order가 있는 조건은 낮은 단계부터 차례로 모두 충족해야 한다(→).
 */
import type {BattleState,StageDef,VictoryCondition} from '../../core/src/index.ts';
import {stageRules,subject} from './stage-rules.ts';
import {classNames} from './battlefield.ts';

/** 목표 지역의 이름(규칙표 라벨이 없을 때). */
const REGION_NAMES:Record<string,string>={
  exit:'탈출 지점',rally:'집결지',south_gate:'남문',east_pass:'동쪽 관문',escort_goal:'호송 목적지',central_fort:'중앙 성채',citadel:'본성',
  camp:'적 본진',warehouse:'군량 창고',militia:'민병 거점',emperor_approach:'황제의 길목',breakthrough:'돌파 지점',xiangyang:'양양성',
  join:'합류 지점',north_camp:'북쪽 진영',keep:'본채',bridge_site:'교량 부지',shu_fort:'촉군 요새',armory:'무기고',yongning:'영녕',landing:'상륙 지점',
};
/** 끝내야 하는 대화·사건의 이름. */
const DIALOGUE_NAMES:Record<string,string>={
  gate_payment:'남문 통행료 협상',mountain_choice:'산길 선택',dream_3:'마지막 꿈을 깨는 대화',accord:'맹약 체결',envoy:'사신 응대',
  mumen_turn:'목문도 반격',hulu_rain:'호로곡 비',banner:'군기 세우기',luogu_turn:'낙곡 반전',
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
  const name=(id?:string)=>{if(!id)return '';const u=state.find(id);if(u)return classNames[u.name]?`${classNames[u.name]} 부대`:u.name;return LATE_NAMES[id]??(classNames[id]?`${classNames[id]} 부대`:id);};
  switch(c.type){
    case 'annihilate':return lose?`${SIDE_NAMES[c.side??'player']} 전멸`:`${SIDE_NAMES[c.side??'enemy']} 전멸`;
    case 'reach':return `${subject(name(c.unit))} ${regionName(state.stage,c.target)}에 도달`;
    case 'capture':return c.by&&c.by!=='player'?`${subject(SIDE_NAMES[c.by]??'적')} ${regionName(state.stage,c.target)} 점령`:`${regionName(state.stage,c.target)} 점령`;
    case 'retreat':return lose?`${name(c.unit)} 퇴각`:`${name(c.unit)} 격퇴`;
    case 'survive_turns':return `${c.n??0}턴 동안 버티기`;
    case 'enemy_retreat_count':return `적 ${c.n??0}부대 격퇴`;
    case 'ally_loss_limit':return `편입 아군 ${c.n??0}부대 이상 잃음`;
    case 'dialogue_complete':return `${DIALOGUE_NAMES[c.target??'']??'작전 대화'} 마치기`;
    case 'turn_limit':return `${c.n??0}턴 넘김`;
    case 'escort_survive':return `${name(c.unit)} 생존`;
  }
}
/** 조건 묶음을 문장들로: 아무거나 하나(또는) / 차례로 모두(→). */
function group(state:BattleState,conds:readonly VictoryCondition[],lose:boolean):string[]{
  const any=conds.filter(c=>c.order===undefined).map(c=>line(state,c,lose));
  const steps=[...new Set(conds.filter(c=>c.order!==undefined).map(c=>c.order!))].sort((a,b)=>a-b)
    .map(o=>conds.filter(c=>c.order===o).map(c=>line(state,c,lose)).join(' 또는 '));
  const seq=steps.length<2?steps:[lose?`${steps.join('·')} 모두`:`${steps.join(' → ')} (차례로)`];
  return [...any,...seq];
}

export interface BattleConditions {win:string[];lose:string[]}
/**
 * 지금 전장의 승리·패배 조건.
 * extraLose: 규칙표 실패 조건처럼 스테이지 데이터 밖에 있는 패배(지켜야 할 장수 등) — 이름 목록.
 */
export function battleConditions(state:BattleState,o:{guarded?:readonly string[];deadline?:number;maxTurns?:number}={}):BattleConditions{
  const win=group(state,state.stage.victory,false);
  const lose=group(state,state.stage.defeat,true);
  for(const n of o.guarded??[]){const t=`${n} 퇴각`;if(!lose.includes(t))lose.push(t);}
  const limit=o.deadline??o.maxTurns;
  if(limit)lose.push(`${limit}턴 안에 끝내지 못함`);
  // 패배 조건의 '모두'는 이름만 모아 짧게: '동문 피난민 퇴각·북문 피난민 퇴각 모두' → '동문 피난민·북문 피난민 모두 퇴각'
  for(let i=0;i<lose.length;i++){const m=/^(.+) 모두$/.exec(lose[i]!);if(m&&m[1]!.split('·').every(x=>x.endsWith(' 퇴각')))lose[i]=`${m[1]!.split('·').map(x=>x.slice(0,-3)).join('·')} 모두 퇴각`;}
  return {win:win.length?win:['적 전멸'],lose};
}
/** 화면용 한 덩어리 HTML(이스케이프는 부르는 쪽이 이미 안전한 이름만 넣는다는 전제로 최소 처리). */
export function conditionsHtml(c:BattleConditions){
  const esc=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
  return `<div class="battle-conditions"><p class="cond-win"><b>승리</b> ${c.win.map(esc).join(' · ')}</p><p class="cond-lose"><b>패배</b> ${c.lose.map(esc).join(' · ')}</p></div>`;
}
