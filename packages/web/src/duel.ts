export type DuelAction='attack'|'guard'|'rally'|'special';
export type DuelKind='duel'|'debate';
export interface DuelFighter {id:string;name:string;stat:number;hp:number;maxHp:number;energy:number}
export interface DuelRound {round:number;action:DuelAction;enemyAction:DuelAction;dealt:number;taken:number}
export interface DuelState {kind:DuelKind;round:number;player:DuelFighter;enemy:DuelFighter;history:DuelRound[];result?:'win'|'lose'|'draw'}
export const actionNames={attack:'공격',guard:'방어',rally:'기합',special:'필살기'};
export const debateNames={attack:'논박',guard:'반론',rally:'숙고',special:'논파'};
export function duelActionNames(kind:DuelKind){return kind==='debate'?debateNames:actionNames;}
export function duelLine(kind:DuelKind,action:DuelAction){return (kind==='debate'?{
 attack:'그 주장은 앞뒤가 맞지 않소.',guard:'근거부터 차근차근 살펴봅시다.',rally:'논점을 정리할 시간이 필요하오.',special:'이 증거로 결론을 내리겠소!',
 }:{attack:'빈틈을 보였구나!',guard:'그 일격, 받아내겠다.',rally:'아직 승부는 끝나지 않았다!',special:'이 일격에 승부를 건다!'} as Record<DuelAction,string>)[action];}
export function newDuel(kind:DuelKind,a:{id:string;name:string;stat:number},b:{id:string;name:string;stat:number}):DuelState{
  const fighter=(u:typeof a):DuelFighter=>({...u,hp:160,maxHp:160,energy:0});
  return {kind,round:0,player:fighter(a),enemy:fighter(b),history:[]};
}
export function duelRound(s:DuelState,action:DuelAction){
  if(s.result||s.round>=5)return false;
  if(!Object.hasOwn(actionNames,action)||action==='special'&&s.player.energy<2)return false;
  const enemyAction:DuelAction=s.enemy.energy>=2?'special':(['attack','rally','guard','attack','attack'] as const)[(s.round+s.enemy.stat%3)%5]!;
  const damage=(a:DuelFighter,b:DuelFighter,move:DuelAction,defend:DuelAction)=>{
    if(move==='guard'||move==='rally'||a.hp<=0)return 0;
    // 능력치 중심: 일기토는 무력, 설전은 지력이 곧 피해다. 같은 능력이면 한 합에 능력의 ¼쯤,
    // 상대보다 높을수록 (비율^0.9)만큼 더 세진다 — 무력 100이 60을 치면 약 39, 60이 100을 치면 약 9.
    const ratio=Math.max(.35,Math.min(2.6,a.stat/Math.max(1,b.stat)));
    const base=Math.max(4,a.stat*.25*ratio**.9);
    return Math.round(base*(move==='special'?1.8:1)*(1+a.energy*.12)*(defend==='guard'?.35:1));
  };
  const dealt=damage(s.player,s.enemy,action,enemyAction),taken=damage(s.enemy,s.player,enemyAction,action);
  s.player.hp=Math.max(0,s.player.hp-taken);s.enemy.hp=Math.max(0,s.enemy.hp-dealt);
  for(const [u,move] of [[s.player,action],[s.enemy,enemyAction]] as const){if(move==='rally')u.energy=Math.min(3,u.energy+2);else if(move==='special')u.energy-=2;else if(move==='guard')u.energy=Math.min(3,u.energy+1);}
  s.round++;s.history.push({round:s.round,action,enemyAction,dealt,taken});
  if(s.round===5)s.result=s.player.hp>s.enemy.hp?'win':s.player.hp<s.enemy.hp?'lose':'draw';
  return true;
}

// ─────────────────────────────────────────────── 도전에 응하는가

/**
 * 장수의 성격. 일기토·설전 도전에 응할지를 정한다.
 * reckless 무모: 무엇이든 받는다 · brave 용맹: 일기토는 받고, 설전은 지력이 앞설 때만 ·
 * proud 자부: 상대가 크게 앞서지 않으면 받는다 · calm 침착: 자기가 앞설 때만 ·
 * cautious 신중: 확실히 앞설 때만 · wise 지혜: 설전은 받되 일기토는 확실히 앞설 때만 · timid 소심: 거의 받지 않는다.
 */
export type Temper='reckless'|'brave'|'proud'|'calm'|'cautious'|'wise'|'timid';
export const temperNames:Record<Temper,string>={reckless:'무모',brave:'용맹',proud:'자부',calm:'침착',cautious:'신중',wise:'지혜',timid:'소심'};
export interface DuelResponse {accept:boolean;reason:'historic'|'temper'|'weak'|'wounded'|'nameless';line:string}

/** 『삼국지연의』에 실제로 있었던 일기토·설전: 이 짝은 언제나 응한다(이름 순서 무관). */
export const HISTORIC_DUELS:Array<{a:string;b:string;kind:DuelKind;note:string}>=[
  {a:'허저',b:'마초',kind:'duel',note:'위수에서 웃통을 벗고 이백여 합'},
  {a:'관우',b:'안량',kind:'duel',note:'백마에서 단칼에'},
  {a:'관우',b:'서황',kind:'duel',note:'번성에서 옛 벗과 맞서다'},
  {a:'관우',b:'하후돈',kind:'duel',note:'오관을 지나며'},
  {a:'장료',b:'감녕',kind:'duel',note:'합비에서'},
  {a:'조운',b:'장합',kind:'duel',note:'장판에서'},
  {a:'하후연',b:'황충',kind:'duel',note:'정군산에서'},
  {a:'강유',b:'등애',kind:'duel',note:'단곡의 맞수'},
  {a:'사마의',b:'제갈량',kind:'debate',note:'위수의 진법 겨루기'},
  {a:'사마의',b:'조상',kind:'debate',note:'고평릉의 변'},
  {a:'사마의',b:'왕릉',kind:'debate',note:'수춘의 문답'},
  {a:'제갈량',b:'왕랑',kind:'debate',note:'기산의 설전'},
];
export function historicDuel(kind:DuelKind,a:string,b:string){return HISTORIC_DUELS.find(h=>h.kind===kind&&((h.a===a&&h.b===b)||(h.a===b&&h.b===a)));}

/**
 * 도전받은 쪽의 대답. 연의의 실제 대결은 언제나 응하고, 그 밖에는 성격·능력 차·부상으로 정해진다(무작위 없음).
 * mine/theirs: 일기토는 무력, 설전은 지력. hp: 도전받은 쪽 체력 비율.
 */
export function duelResponse(kind:DuelKind,challenger:{name:string;stat:number},target:{name:string;stat:number;temper?:Temper;hp:number}):DuelResponse{
  const h=historicDuel(kind,challenger.name,target.name);
  if(h)return {accept:true,reason:'historic',line:kind==='duel'?`${challenger.name}! 오늘이야말로 결판을 내자!`:`좋소. ${challenger.name}, 그대의 말을 들어 보리다.`};
  if(!target.temper)return {accept:false,reason:'nameless',line:kind==='duel'?'(이름 없는 병사들은 장수의 도전에 응하지 않고 진형을 지킨다.)':'(이름 없는 병사들은 말싸움에 응하지 않는다.)'};
  const t=target.temper,gap=target.stat-challenger.stat;
  if(t!=='reckless'&&target.hp<.35)return {accept:false,reason:'wounded',line:'상처를 입은 몸으로 응할 수는 없다. 물러나라!'};
  const ok=kind==='duel'
    ?({reckless:true,brave:true,proud:gap>=-15,calm:gap>=0,cautious:gap>=10,wise:gap>=10,timid:gap>=20} as Record<Temper,boolean>)[t]
    :({reckless:true,brave:gap>=0,proud:gap>=-20,calm:gap>=0,cautious:gap>=5,wise:gap>=-10,timid:gap>=20} as Record<Temper,boolean>)[t];
  if(ok)return {accept:true,reason:'temper',line:kind==='duel'
    ?({reckless:'하하, 덤벼라!',brave:'좋다, 받아 주마!',proud:'나에게 도전하다니, 그 배짱은 사 주지.',calm:'좋소. 한 번 겨뤄 봅시다.',cautious:'…이길 수 있는 싸움이라면 피할 이유가 없지.',wise:'칼로 답하라면 그리하겠소.',timid:'…좋, 좋다!'} as Record<Temper,string>)[t]
    :({reckless:'말싸움이라도 지지 않는다!',brave:'말로도 지지 않겠다.',proud:'내 앞에서 이치를 따지겠다고?',calm:'좋소. 이치로 겨룹시다.',cautious:'근거가 있다면 들어 보겠소.',wise:'좋소. 천하의 이치를 논해 봅시다.',timid:'…그, 그러시오.'} as Record<Temper,string>)[t]};
  return {accept:false,reason:'weak',line:kind==='duel'
    ?({reckless:'',brave:'',proud:'네 따위가 감히… 오늘은 상대하지 않겠다.',calm:'승산 없는 싸움은 하지 않소.',cautious:'그 꾀에 넘어가지 않는다. 진을 지켜라!',wise:'칼끝으로 다툴 일이 아니오.',timid:'(진 뒤로 숨어 버렸다.)'} as Record<Temper,string>)[t]
    :({reckless:'',brave:'말장난은 질색이다! 칼로 오라!',proud:'입씨름은 아랫사람이나 하는 것.',calm:'지금은 말을 섞을 때가 아니오.',cautious:'대꾸할 필요가 없소.',wise:'때가 아니오.',timid:'(귀를 막고 물러났다.)'} as Record<Temper,string>)[t]};
}
