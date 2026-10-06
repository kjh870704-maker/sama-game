/**
 * 장수 설득 — 장수는 그냥 들어오지 않는다. 사마의가 마주 앉아 세 번 말을 건네고,
 * 상대의 마음(0~100)이 70에 닿으면 합류한다. 닿지 못하면 이번엔 거절하고 떠난다(다음 기회에 다시 만날 수 있다).
 *
 * 말하는 방식은 다섯 — 대의(명분)·대우(벼슬과 재물)·정(존중과 인연)·위세(힘)·형세(판을 읽어 줌).
 * 무엇이 통하는지는 상대의 성격(romance.ts temperOf: 무모·용맹·자부·침착·신중·지혜·소심)이 정한다.
 * 같은 방식을 되풀이하면 반만 통한다. 오래 알던 사람(사마 가문·옛 동료)은 처음부터 마음이 조금 열려 있다.
 * 순수 규칙만 둔다. 무대 연출은 scenario-ui.ts의 persuadeOfficer.
 */
import {Rng} from '../../core/src/index.ts';
import {temperOf} from './romance.ts';
import type {Temper} from './duel.ts';

export type Approach='cause'|'reward'|'bond'|'might'|'wit';
export const APPROACHES:Approach[]=['cause','reward','bond','might','wit'];
export const APPROACH_NAMES:Record<Approach,string>={cause:'대의',reward:'대우',bond:'정',might:'위세',wit:'형세'};
/** 성격마다 방식이 마음에 닿는 정도. */
export const FIT:Record<Temper,Record<Approach,number>>={
  reckless:{cause:-5,reward:15,bond:0,might:30,wit:-10},
  brave:{cause:25,reward:-10,bond:10,might:20,wit:0},
  proud:{cause:10,reward:10,bond:30,might:-20,wit:0},
  calm:{cause:20,reward:0,bond:10,might:-5,wit:25},
  cautious:{cause:0,reward:25,bond:10,might:-10,wit:15},
  wise:{cause:15,reward:-15,bond:0,might:-10,wit:35},
  timid:{cause:-5,reward:20,bond:10,might:20,wit:0},
};
export const PERSUADE_GOAL=70;
export const PERSUADE_ROUNDS=3;
/** 오래 알던 사람: 처음부터 마음이 조금 열려 있다. */
const OLD_FRIENDS=new Set(['사마랑','사마방','사마부','사마사','사마소','조진','장합','곽회','등애','진태','손례','왕기','가규','호준']);

export interface Persuasion {
  name:string;temper:Temper;heart:number;round:number;
  /** 라운드마다 고를 수 있는 세 방식 */
  options:Approach[][];
  picked:Approach[];
  status:'talking'|'won'|'lost';
}
const hashId=(id:string)=>{let h=2166136261;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
export function startPersuasion(name:string,seed:number):Persuasion{
  const temper=temperOf(name)??'calm',r=new Rng((seed^hashId(name))>>>0||1),fit=FIT[temper];
  // 라운드마다 세 방식. 적어도 하나는 잘 통하는 것(20 이상)을 넣어 언제나 이길 길이 있게 한다.
  const good=APPROACHES.filter(a=>fit[a]>=20),options:Approach[][]=[];
  for(let i=0;i<PERSUADE_ROUNDS;i++){const pool=[...APPROACHES],pick:Approach[]=[];
    const g=good[r.int(0,good.length-1)]!;pick.push(g);pool.splice(pool.indexOf(g),1);
    while(pick.length<3){pick.push(pool.splice(r.int(0,pool.length-1),1)[0]!);}
    for(let k=pick.length-1;k>0;k--){const j=r.int(0,k);[pick[k],pick[j]]=[pick[j]!,pick[k]!];}
    options.push(pick);}
  return {name,temper,heart:30+(OLD_FRIENDS.has(name)?15:0),round:0,options,picked:[],status:'talking'};
}
/** 한 마디: 마음이 얼마나 움직였는지 돌려준다. 같은 방식을 되풀이하면 반만. */
export function speak(p:Persuasion,a:Approach){
  if(p.status!=='talking'||!p.options[p.round]?.includes(a))return 0;
  let d=FIT[p.temper][a];if(p.picked.includes(a)&&d>0)d=Math.round(d/2);
  p.picked.push(a);p.heart=Math.max(0,Math.min(100,p.heart+d));p.round++;
  if(p.heart>=PERSUADE_GOAL)p.status='won';else if(p.round>=PERSUADE_ROUNDS)p.status='lost';
  return d;
}

// ─────────────────────────────────────────────── 대사

export const PITCH:Record<Approach,string[]>={
  cause:['한실은 기울었소. 이 난세를 끝낼 사람과 함께 서지 않겠소?','칼은 사람을 베지만 뜻은 천하를 세우오. 그대의 칼을 뜻 있는 곳에 쓰시오.','백성이 굶고 성이 불타오. 그대가 서야 할 곳은 어디요?'],
  reward:['내 곁에 서면 그대의 공은 반드시 벼슬과 봉록으로 돌아갈 것이오.','그대의 부하들까지 굶기지 않겠소. 군량과 땅을 약속하오.','그대의 이름이 조정에 오르도록 내가 직접 천거하겠소.'],
  bond:['그대의 이름은 오래전부터 들어 왔소. 존경하는 마음으로 찾아왔소.','그대를 부하로 부르러 온 것이 아니오. 벗으로 청하러 왔소.','지난 일은 묻지 않겠소. 나는 그대를 믿소.'],
  might:['내 군은 이미 이 땅을 쥐었소. 적으로 서겠소, 곁에 서겠소?','그대가 거절해도 판은 이미 기울었소. 이긴 편에서 칼을 드시오.','나와 맞선 자들이 어찌 되었는지 들었을 것이오.'],
  wit:['이 땅의 형세를 보시오. 북은 막혔고 남은 물이오. 살 길은 내 쪽에 있소.','적은 서두르고 있소. 서두르는 자는 반드시 무너지오. 기다릴 줄 아는 편에 서시오.','그대라면 이 판을 어떻게 읽겠소? 내 읽음과 같다면 우리는 같은 편이오.'],
};
export const GREETING:Record<Temper,string>={
  reckless:'말이 길면 칼이 녹슬지. 용건만 말하시오.',
  brave:'사마의 공이오? 그대의 뜻이 무엇인지부터 들읍시다.',
  proud:'나를 부르러 왔소? 사람을 고를 줄은 아는구려.',
  calm:'말씀하시오. 끝까지 듣겠소.',
  cautious:'쉽게 정할 일은 아니오. 신중히 듣겠소.',
  wise:'사마중달이로군. 그대의 속을 먼저 듣고 싶소.',
  timid:'저, 저를 찾으셨습니까…?',
};
/** 마음이 움직인 만큼의 반응(감정 표시·대사). */
export function reaction(delta:number,round:number):{emote:string;line:string}{
  const i=round%3;
  if(delta>=20)return {emote:['!','♪','!'][i]!,line:['…그 말, 가슴에 닿는구려.','허, 제법이오. 마음이 움직이오.','그대라면 따를 만하겠소.'][i]!};
  if(delta>=5)return {emote:'…',line:['흠… 아직은 모르겠소.','들을 만은 하오. 더 말해 보시오.','틀린 말은 아니나, 그것만으로는.'][i]!};
  return {emote:delta<=-10?'분노':'땀',line:['그런 말로 날 움직일 수 있다 여겼소?','실망이오.','그 말은 내게 통하지 않소.'][i]!};
}
export const AGREE=['좋소. 오늘부터 이 칼을 그대에게 맡기겠소.','알겠소. 그대의 길에 함께하겠소.','…졌소. 그대 곁에 서겠소.'];
export const REFUSE='미안하오. 아직은 그대를 따를 때가 아니오.';
