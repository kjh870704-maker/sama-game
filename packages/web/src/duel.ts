export type DuelAction='attack'|'guard'|'rally'|'feint'|'special';
export type DuelKind='duel'|'debate';
export interface DuelFighter {id:string;name:string;stat:number;hp:number;maxHp:number;energy:number}
export interface DuelRound {round:number;action:DuelAction;enemyAction:DuelAction;dealt:number;taken:number}
export interface DuelState {kind:DuelKind;round:number;player:DuelFighter;enemy:DuelFighter;history:DuelRound[];result?:'win'|'lose'|'draw';/** 연의의 맞수가 붙어 저절로 열린 대결 */auto?:boolean}
/** 대결에서 진 쪽에 거는 술법 디버프(2턴). */
export const DUEL_LOSS_DEBUFF:Record<DuelKind,readonly ('weaken'|'slow'|'confusion'|'seal')[]>={duel:['weaken','slow'],debate:['confusion','seal']};
export const actionNames={attack:'공격',guard:'방어',rally:'기합',feint:'간파',special:'필살기'};
export const debateNames={attack:'논박',guard:'반론',rally:'숙고',feint:'유도',special:'논파'};
export function duelActionNames(kind:DuelKind){return kind==='debate'?debateNames:actionNames;}
export function duelLine(kind:DuelKind,action:DuelAction){return (kind==='debate'?{
 attack:'그 주장은 앞뒤가 맞지 않소.',guard:'근거부터 차근차근 살펴봅시다.',rally:'논점을 정리할 시간이 필요하오.',feint:'그 말부터 유도한 것이오.',special:'이 증거로 결론을 내리겠소!',
 }:{attack:'빈틈을 보였구나!',guard:'그 일격, 받아내겠다.',rally:'아직 승부는 끝나지 않았다!',feint:'수는 이미 읽었다!',special:'이 일격에 승부를 건다!'} as Record<DuelAction,string>)[action];}

/** 오행 상성: 방어 > 공격 > 필살 > 기합 > 간파 > 방어. */
const COUNTER:Record<DuelAction,DuelAction>={guard:'attack',attack:'special',special:'rally',rally:'feint',feint:'guard'};
export function duelAdvantage(move:DuelAction,other:DuelAction){return COUNTER[move]===other?1:COUNTER[other]===move?-1:0;}
export function duelExchangeLine(kind:DuelKind,move:DuelAction,other:DuelAction){
  const edge=duelAdvantage(move,other);
  if(edge>0)return kind==='duel'?({attack:'필살의 틈을 베었다!',guard:'공격을 완전히 읽었다!',rally:'기세로 간파를 눌렀다!',feint:'방어가 비었다!',special:'기합째 베어 가른다!'} as Record<DuelAction,string>)[move]
    :({attack:'결론의 허점을 찔렀소!',guard:'그 논박은 이미 예상했소!',rally:'얕은 유도에 흔들리지 않소!',feint:'반론을 유도한 것이오!',special:'숙고할 틈은 끝났소!'} as Record<DuelAction,string>)[move];
  if(edge<0)return kind==='duel'?'이 수를 읽혔나…!':'내 논리를 역이용했군…!';
  return duelLine(kind,move);
}
export function newDuel(kind:DuelKind,a:{id:string;name:string;stat:number},b:{id:string;name:string;stat:number}):DuelState{
  const fighter=(u:typeof a):DuelFighter=>({...u,hp:DUEL_HP,maxHp:DUEL_HP,energy:0});
  return {kind,round:0,player:fighter(a),enemy:fighter(b),history:[]};
}
/** 대결 체력: 능력치 100짜리가 세 번 제대로 치면 쓰러진다. */
export const DUEL_HP=300;
/**
 * 한 합의 피해. 능력치가 곧 피해다 — 일기토는 무력, 설전은 지력(레벨 포함)을 그대로 준다.
 * 필살기(논파)는 ×1.5, 기합(논거)이 쌓일수록 +10%씩, 상대가 막으면(반론) 35%만 들어간다.
 */
export function duelDamage(stat:number,move:DuelAction,defend:DuelAction,energy=0){
  if(move==='guard'||move==='rally')return 0;
  const edge=duelAdvantage(move,defend),base=move==='special'?1.5:move==='feint'?0.8:1;
  return Math.max(1,Math.round(stat*base*(1+energy*.1)*(edge>0?1.25:edge<0?.35:1)));
}
export function duelRound(s:DuelState,action:DuelAction){
  if(s.result||s.round>=5)return false;
  if(!Object.hasOwn(actionNames,action)||action==='special'&&s.player.energy<2)return false;
  const deck=(['attack','guard','rally','feint','attack'] as DuelAction[]),pick=deck[s.round%deck.length]!;
  const enemyAction:DuelAction=s.enemy.energy>=2&&(s.round+s.enemy.stat)%3===0?'special':pick;
  const dealt=duelDamage(s.player.stat,action,enemyAction,s.player.energy),taken=duelDamage(s.enemy.stat,enemyAction,action,s.enemy.energy);
  const playerHp=s.player.hp-taken,enemyHp=s.enemy.hp-dealt;
  // 반드시 다섯 합을 모두 겨룬다. 마지막 합 전에는 쓰러질 피해를 받아도 1로 버틴다.
  s.player.hp=s.round<4?Math.max(1,playerHp):Math.max(0,playerHp);s.enemy.hp=s.round<4?Math.max(1,enemyHp):Math.max(0,enemyHp);
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
  {a:'조운',b:'문추',kind:'duel',note:'반하에서 맞붙은 상산의 젊은 장수'},
  {a:'관우',b:'문추',kind:'duel',note:'연진에서 문추를 베다'},
  {a:'황충',b:'장합',kind:'duel',note:'정군산 아래서'},
  {a:'관평',b:'서황',kind:'duel',note:'번성 구원전'},
  {a:'위연',b:'장합',kind:'duel',note:'기산의 접전'},
  {a:'강유',b:'곽회',kind:'duel',note:'강유의 화살이 곽회를 노리다'},
  {a:'서황',b:'맹달',kind:'duel',note:'신성 성벽 아래'},
  {a:'마초',b:'조조',kind:'duel',note:'동관에서 수염을 자르고 달아나다'},
  {a:'허저',b:'조운',kind:'duel',note:'장판의 혼전'},
  {a:'장료',b:'태사자',kind:'duel',note:'합비의 맞수'},
  {a:'하후돈',b:'관우',kind:'duel',note:'오관의 길목'},
  {a:'마대',b:'위연',kind:'duel',note:'남정의 함성'},
  {a:'사마의',b:'공손연',kind:'debate',note:'양평성의 항복 사절'},
  {a:'사마의',b:'맹달',kind:'debate',note:'신성으로 보낸 편지'},
  {a:'사마의',b:'하안',kind:'debate',note:'조상 일파의 문답'},
  {a:'제갈량',b:'장소',kind:'debate',note:'강동 선비들과의 설전'},
  {a:'제갈량',b:'주유',kind:'debate',note:'적벽 전야의 지략 겨루기'},
  {a:'진궁',b:'조조',kind:'debate',note:'백문루의 마지막 꾸짖음'},
  {a:'양수',b:'조조',kind:'debate',note:'계륵'},
  // ── 본편 전장에서 마주치는 맞수(연의·정사)
  {a:'장합',b:'마초',kind:'duel',note:'동관에서 서량의 금마초와 맞붙다'},
  {a:'장합',b:'왕평',kind:'duel',note:'가정에서 왕평의 북소리에 막히다'},
  {a:'장합',b:'마속',kind:'duel',note:'가정에서 물길을 끊다'},
  {a:'대릉',b:'위연',kind:'duel',note:'노성의 접전'},
  {a:'대릉',b:'고상',kind:'duel',note:'노성에서 고상과 부딪치다'},
  {a:'곽회',b:'고상',kind:'duel',note:'열류성을 치다'},
  {a:'조휴',b:'여범',kind:'duel',note:'동구에서 여범의 수군과 맞서다'},
  {a:'조휴',b:'손소',kind:'duel',note:'동구의 강변 싸움'},
  {a:'조진',b:'주연',kind:'duel',note:'강릉성을 둘러싸고'},
  {a:'조상',b:'왕평',kind:'duel',note:'흥세에서 길이 막히다'},
  {a:'조진',b:'제갈량',kind:'debate',note:'제갈량의 편지에 분을 이기지 못하다'},
  {a:'조조',b:'손권',kind:'debate',note:'유수구에서 마주하다 — 아들을 낳으려면 손중모 같아야'},
  {a:'조비',b:'손권',kind:'debate',note:'오왕 책봉을 둘러싼 문답'},
  {a:'사마의',b:'마속',kind:'debate',note:'가정의 산 위에 친 진'},
  {a:'사마사',b:'제갈각',kind:'debate',note:'합비신성의 공방'},
  {a:'사마소',b:'제갈각',kind:'debate',note:'동흥 제방의 싸움'},
  {a:'조휴',b:'육손',kind:'debate',note:'석정의 거짓 항복'},
  // ── 본편 각 장의 전장에서 실제로 마주치는 맞수
  {a:'조진',b:'양앙',kind:'duel',note:'양평관의 공방'},
  {a:'조진',b:'황충',kind:'duel',note:'한중을 둘러싼 공방'},
  {a:'조조',b:'조운',kind:'debate',note:'한수의 빈 영채 — 조운의 공성계'},
  {a:'조진',b:'여범',kind:'duel',note:'동구의 폭풍 속에서'},
  {a:'조비',b:'손소',kind:'debate',note:'광릉의 강변 — 손소의 야습'},
  {a:'조진',b:'고수',kind:'duel',note:'광릉에서 고수의 야습을 맞받다'},
  {a:'곽회',b:'위연',kind:'duel',note:'양계에서 위연에게 꺾이다'},
  {a:'사마의',b:'고상',kind:'debate',note:'노성의 싸움'},
  {a:'곽회',b:'맹염',kind:'duel',note:'무공수 건너편의 외딴 진'},
  {a:'사마의',b:'왕평',kind:'debate',note:'가정에서 길목과 물길을 두고 맞서다'},
  {a:'사마의',b:'위연',kind:'debate',note:'젖은 잔도와 양평관의 퇴로를 두고 맞서다'},
  {a:'사마사',b:'맹염',kind:'duel',note:'위수의 가운데 여울에서 예비대와 맞붙다'},
  {a:'사마의',b:'비연',kind:'debate',note:'요수에서 양동으로 비연을 따돌리다'},
  {a:'사마의',b:'주연',kind:'debate',note:'번성의 포위를 풀다'},
  {a:'사마의',b:'제갈각',kind:'debate',note:'환성 — 제갈각이 둔전을 불태우고 물러나다'},
  // ── 연의의 이름난 대결(외전·원정에서 만나면)
  {a:'관우',b:'황충',kind:'duel',note:'장사에서 백 합을 겨루다'},
  {a:'장비',b:'마초',kind:'duel',note:'가맹관의 밤 횃불 아래'},
  {a:'여포',b:'관우',kind:'duel',note:'호뢰관 삼영전'},
  {a:'여포',b:'장비',kind:'duel',note:'호뢰관에서 장팔사모와 방천화극'},
  {a:'강유',b:'조운',kind:'duel',note:'천수에서 늙은 상산의 조자룡과'},
  {a:'장비',b:'장합',kind:'duel',note:'탕거의 산길'},
  {a:'손책',b:'태사자',kind:'duel',note:'신정에서 투구와 짧은 창을 빼앗다'},
  {a:'장료',b:'관우',kind:'debate',note:'토산에서 세 가지 약속'},
  {a:'노숙',b:'관우',kind:'debate',note:'단도회 — 칼 한 자루로 연회에 가다'},
  {a:'감택',b:'조조',kind:'debate',note:'거짓 항복서를 들고'},
  {a:'장송',b:'양수',kind:'debate',note:'맹덕신서를 한 번 읽고 외우다'},
  {a:'제갈근',b:'제갈량',kind:'debate',note:'형제가 서로를 설득하다'},
  {a:'등지',b:'손권',kind:'debate',note:'기름 솥 앞에서'},
];
/** 연의의 맞수 짝(일기토·설전 어느 쪽이든). 붙으면 자동으로 대결이 열린다. */
export function historicPair(a:string,b:string){return HISTORIC_DUELS.find(h=>(h.a===a&&h.b===b)||(h.a===b&&h.b===a));}
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
