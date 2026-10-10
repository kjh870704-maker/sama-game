/**
 * 승리·패배 조건을 말로 — 스테이지의 실제 판정 조건(victory·defeat)과 웹 규칙(지켜야 할 대상·기한)에서
 * 그대로 만들어, 출진 전 정비와 전투 화면이 같은 문장을 보인다.
 *
 * 판정 규칙(core/conditions.ts): order가 없는 조건은 하나만 충족해도 되고(또는),
 * order가 있는 조건은 낮은 단계부터 차례로 모두 충족해야 한다(→).
 */
import type {BattleState,Coord,StageDef,VictoryCondition} from '../../core/src/index.ts';
import {evaluate} from '../../core/src/index.ts';
import {stageRules,subject} from './stage-rules.ts';
import {classNames} from './troops.ts';
import {isEscapeRegion} from './stretch.ts';

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
  gate_payment:'남문 통행료 협상 대화(둘이 함께 남문에 서면 바로 나옴 · 1,000전)',mountain_choice:'산길 고르기(전투 시작 대화에서 고르면 그 길이 새 목표가 됨)',dream_3:'꿈을 깨는 대화(주유의 환영을 물리치면 바로 나옴)',accord:'손권 설득(대화에서 맞는 논거를 골라 맹약을 받아내기)',envoy:'사신 응대 대화(성고 성채를 점령하면 사신이 옴)',
  mumen_turn:'목문도 반격(합류한 뒤 적 차례에 벌어짐 · 그 뒤 회군로 탈출이 새 목표)',hulu_rain:'호로곡 비(둘이 합류한 뒤 7턴 버티면 내림 · 그 뒤 서쪽 출구 탈출이 새 목표)',banner:'군기 사건(적 4부대를 물리치거나 6턴이 되면 일어남 · 그 뒤 동쪽 철수로 탈출이 새 목표)',luogu_turn:'낙곡 반전(흥세 앞 요새를 점령하고 3턴쯤 지나면 벌어짐 · 그 뒤 조상 탈출이 새 목표)',
};
/** 전투 중에 나타나는 장수(시작할 때는 맵에 없다). */
const LATE_NAMES:Record<string,string>={lu_bu:'여포의 환영',zhou_yu:'주유의 환영',chen_gong:'진궁의 환영'};
const SIDE_NAMES:Record<string,string>={player:'아군',ally:'편입 아군',allyAi:'우군',enemy:'적',npc:'우군'};

/** 전장마다 다른 출구 이름(지도에 쓰인 이름과 같게). */
const STAGE_REGION_NAMES:Record<string,Record<string,string>>={
  'S1-09':{exit:'야곡 출구'},'S1-10':{exit:'북쪽 고개'},'S2-13':{exit:'서쪽 출구'},'S3-05':{exit:'동남쪽 출구'},
};
function regionName(stage:StageDef,id:string|undefined){
  if(!id)return '목표 지점';
  return STAGE_REGION_NAMES[stage.id]?.[id]??stageRules[stage.id]?.labels?.find(l=>l.region===id)?.text??REGION_NAMES[id]??'목표 지점';
}
function line(state:BattleState,c:VictoryCondition,lose:boolean){
  // 병종 id로 적힌 조건(예: navy)은 그 병종의 아무 부대나.
  const name=(id?:string)=>{if(!id)return '';const u=state.find(id);if(u)return classNames[u.name]?`${classNames[u.name]} 부대`:u.name;return LATE_NAMES[id]??(classNames[id]?`${classNames[id]} 아무 부대`:id);};
  switch(c.type){
    case 'annihilate':return lose?`${SIDE_NAMES[c.side??'player']} 전멸`:`${SIDE_NAMES[c.side??'enemy']} 전멸`;
    case 'reach':return isEscapeRegion(c.target??'')?`${subject(name(c.unit))} ${regionName(state.stage,c.target)}까지 탈출`:`${subject(name(c.unit))} ${regionName(state.stage,c.target)}에 도달`;
    case 'capture':return c.by&&c.by!=='player'?`${subject(SIDE_NAMES[c.by]??'적')} ${regionName(state.stage,c.target)} 점령`:`${regionName(state.stage,c.target)} 점령(아군을 그 칸에 세우고 '거점 확보' 명령)`;
    case 'retreat':return lose?`${name(c.unit)} 퇴각`:`${name(c.unit)} 격퇴`;
    case 'survive_turns':return `${c.n??0}턴 동안 버티기`;
    case 'enemy_retreat_count':return `적 ${c.n??0}부대 격퇴`;
    case 'ally_loss_limit':return `편입 아군 ${c.n??0}부대 이상 잃음`;
    case 'dialogue_complete':return `${DIALOGUE_NAMES[c.target??'']??'작전 대화'} 마치기`;
    case 'turn_limit':return `${c.n??0}턴 넘김`;
    case 'escort_survive':return `${name(c.unit)} 생존`;
  }
}
export type GoalMark={target:string;cells:Coord[];kind:'escape'|'reach'|'capture';label:string;/** 그곳에 가야 하는 장수(아직 닿지 않은) */who:string[]};
/**
 * 지도에서 깜박여 알려 줄 목표 지점: 아직 이루지 못한 도달(탈출·도착)과 아군 점령 지역.
 * 차례 목표(order)는 지금 단계의 것만 보인다.
 */
export function goalMarks(state:BattleState):GoalMark[]{
  const steps=[...new Set(state.victory.filter(c=>c.order!==undefined).map(c=>c.order!))].sort((a,b)=>a-b),step=steps[state.goalProgress];
  const out:GoalMark[]=[];
  for(const c of state.victory){
    if(c.type!=='reach'&&c.type!=='capture'||!c.target||out.some(o=>o.target===c.target))continue;
    if(c.type==='capture'&&c.by&&c.by!=='player')continue;
    if(c.order!==undefined&&c.order!==step)continue;
    if(evaluate(state,c))continue;
    const cells=state.map.regionCoords(c.target);if(!cells.length)continue;
    const kind=c.type==='capture'?'capture':isEscapeRegion(c.target)?'escape':'reach';
    const word=kind==='capture'?'점령':kind==='escape'?'탈출':'도착',name=regionName(state.stage,c.target);
    // 누가 가야 하는지: 이 지점을 목표로 둔 도달 조건 중 아직 닿지 않은 장수 전부(뒤 단계 포함).
    const who=kind==='capture'?[]:state.victory.filter(v=>v.type==='reach'&&v.target===c.target&&(v.order===undefined||step===undefined||v.order>=step)&&!evaluate(state,v)).map(v=>v.unit!).filter((id,i,a)=>id&&a.indexOf(id)===i);
    const names=who.map(id=>{const u=state.find(id);return u?(classNames[u.name]??u.name):classNames[id]?`${classNames[id]} 아무 부대`:id;});
    const place=name.includes(word)?name:`${word} · ${name}`;
    out.push({target:c.target,cells:[...cells],kind,label:names.length?`${names.join('·')} ${word}\n${name}`:place,who:who.filter(id=>!!state.find(id))});
  }
  return out;
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
  const orders=[...new Set(conds.filter(c=>c.order!==undefined).map(c=>c.order!))].sort((a,b)=>a-b);
  const done=(i:number)=>!lose&&!!state.stickyGoals&&conds===state.victory&&i<state.goalProgress;
  const tick=(t:string,i:number)=>done(i)&&!t.endsWith(' ✓')?t.replace(/ \(\d+\/\d+[^)]*\)$/,'')+' ✓':t;
  // 같은 곳에 닿는 단계는 한 문장으로: 'A가 남문에 도달 → B가 남문에 도달' → 'A·B가 모두 남문에 도달',
  // 한 단계 안의 '또는'은 'A·B·C 중 한 명이 합류 지점에 도달'.
  const reachAll=(cs:readonly VictoryCondition[])=>cs.length>0&&cs.every(c=>c.type==='reach'&&c.target===cs[0]!.target&&state.find(c.unit??''));
  const who=(cs:readonly VictoryCondition[])=>cs.map(c=>state.find(c.unit!)!.name).join('·');
  const steps:string[]=[];
  for(let i=0;i<orders.length;i++){
    const cs=conds.filter(c=>c.order===orders[i]);
    if(!lose&&cs.length===1&&reachAll(cs)){let j=i;const run=[cs[0]!];
      while(j+1<orders.length){const next=conds.filter(c=>c.order===orders[j+1]);if(next.length!==1||!reachAll([...run,next[0]!]))break;run.push(next[0]!);j++;}
      if(run.length>1){const all=run.every((c,k)=>done(i+k)||evaluate(state,c));steps.push(`${subject(who(run))} 모두 ${regionName(state.stage,run[0]!.target)}${isEscapeRegion(run[0]!.target??'')?'까지 탈출':'에 도달'}${all?' ✓':''}`);i=j;continue;}}
    if(!lose&&cs.length>1&&reachAll(cs)){steps.push(tick(`${who(cs)} 중 한 명이 ${regionName(state.stage,cs[0]!.target)}${isEscapeRegion(cs[0]!.target??'')?'까지 탈출':'에 도달'}${cs.some(c=>evaluate(state,c))?' ✓':''}`,i));continue;}
    steps.push(tick(cs.map(say).join(' 또는 '),i));
  }
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
/** 승리 조건 여러 줄은 아무거나 하나만 이루면 된다(또는). */
export const winText=(c:BattleConditions)=>c.win.join(' 또는 ');
/** 화면용 한 덩어리 HTML(이스케이프는 부르는 쪽이 이미 안전한 이름만 넣는다는 전제로 최소 처리). */
export function conditionsHtml(c:BattleConditions){
  const esc=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
  return `<div class="battle-conditions"><p class="cond-win"><b>승리</b> ${c.win.map(esc).join(' <i>또는</i> ')}</p><p class="cond-lose"><b>패배</b> ${c.lose.map(esc).join(' · ')}</p></div>`;
}
