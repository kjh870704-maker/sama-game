/**
 * 운명의 갈림길 — 사마의의 선택으로 갈라지는 정사·가상 시나리오.
 *
 * 원정의 상편·중편·하편 첫 층에서 사마의가 선택한다. 정사를 고르면 연의 전장(스토리 32전장)이 이어지고,
 * 가상을 고르면 그 편의 지역·적·우두머리가 바뀌고 '가상 전장'(서사와 이름난 적장이 있는 전투)이 나온다.
 * 선택지는 나무처럼 갈라진다: 앞에서 고른 길에 따라 다음 갈림길의 상황과 선택지가 달라지고,
 * 한 번 가상으로 들어선 길은 끝까지 가상으로 이어진다(정사로 되돌아가지 않는다). 결말은 하편의 길마다 하나(신세력 결말 둘을 더해 ALL_ENDINGS).
 * 가상 시나리오는 이 게임의 창작이다.
 */
import type {UnitClass} from '../../core/src/index.ts';

export interface Tale {
  id:string;title:string;
  /** 출진 전 서사 */
  intro:string;
  /** 쓰러뜨려야 할 이름난 적장 */
  target:{name:string;unitClass:UnitClass};
}
export interface RouteRegion {name:string;arc:string;terrain:0|1|2;boss:{name:string;unitClass:UnitClass};pool:UnitClass[]}
export interface Route {
  id:string;act:1|2|3;history:boolean;
  /** 선택지에 쓰는 말 */
  choice:string;detail:string;
  /** 루트 이름(진행 표시·결말에 쓴다) */
  name:string;
  region:RouteRegion;
  /** 가상 전장(정사 루트는 연의 전장을 쓴다) */
  tales:Tale[];
  /** 이 길이 나오는 앞선 선택(없으면 상편의 첫 갈림길) */
  after?:string[];
  /** 하편의 길: 이 길로 완주했을 때의 결말 */
  ending?:{title:string;lines:string[]};
  /** 신세력의 길: 신세력으로 시작한 본편 회차에서만 나온다(원정에는 나오지 않는다). 글의 '{세력}'은 세력 이름으로 바뀐다. */
  custom?:true;
}
export interface FatePoint {act:1|2|3;year:string;title:string;prompt:string}

export const FATE_POINTS:Record<1|2|3,FatePoint>={
  1:{act:1,year:'201년 · 하내 온현',title:'조조의 출사 요청',prompt:'사공 조조의 사자가 하내의 사마씨 집 문을 두드렸다. 스물셋의 사마의를 막부로 부른다는 명이다. 한실은 기울었고, 북쪽에는 아직 원소가 버티고 있다. 이 부름에 어떻게 답하는가.'},
  2:{act:2,year:'220년 · 낙양',title:'조조의 죽음',prompt:'조조가 낙양에서 숨을 거두었다. 세자 조비가 위왕을 잇지만, 업성에는 조식을 따르는 문사들이 모이고 서쪽에서는 유비가 한중왕을 칭했다. 천하가 숨을 죽인 이 밤, 사마의는 어디에 서는가.'},
  3:{act:3,year:'234년 이후 · 낙양',title:'오래 기다린 자의 선택',prompt:'긴 싸움이 끝났다. 조정에서는 대장군 조상이 병권을 쥐고 노신을 밀어낸다. 몸은 늙었고 남은 날은 많지 않다. 은인자중의 끝에서, 사마의는 남은 생을 어디에 거는가.'},
};

const WEI_POOL:UnitClass[]=['infantry','spearman','cavalry','crossbow','archer','heavyCav'];
export const ROUTES:Route[]=[
  // ── 분기 ⓪ 조조의 출사 요청
  {id:'refuse',act:1,history:true,choice:'병을 핑계로 거절한다',detail:'풍비(마비)를 칭하고 일곱 해를 버틴다. 정사대로 늦게 조조의 막하에 들어가 관중에서 마초를 막는다. 연의 전장이 이어진다.',name:'정사 · 기다리는 자',
    region:{name:'관중 평원',arc:'상편',terrain:0,boss:{name:'마초',unitClass:'cavalry'},pool:['infantry','spearman','cavalry','archer','crossbow','pirate','horseArcher']},tales:[]},
  {id:'serve',act:1,history:false,choice:'즉시 출사한다',detail:'부름에 곧장 응해 조조의 참모가 된다. 원소가 죽은 뒤 갈라진 하북을 평정하는 싸움에 앞장선다.',name:'가상 · 조조의 젊은 참모',
    region:{name:'하북 평원',arc:'상편',terrain:0,boss:{name:'원상',unitClass:'cavalry'},pool:['infantry','spearman','cavalry','archer','crossbow','heavyCav']},
    tales:[
      {id:'IF1-srv-1',title:'여양 공방',intro:'원소가 죽자 아들들이 서로 칼을 겨눈다. 젊은 사마의가 조조에게 아뢴다. "형제가 다툴 때를 기다리십시오." 그러나 여양의 길목은 원소의 조카 고간이 막고 있다.',target:{name:'고간',unitClass:'infantry'}},
      {id:'IF1-srv-2',title:'업성 수공',intro:'원상의 충신 심배가 업성을 지킨다. 장수를 끌어 성을 잠기게 하자는 계책이 사마의의 붓끝에서 나왔다. 물이 차오르기 전에 심배의 수비대를 꺾어야 한다.',target:{name:'심배',unitClass:'strategist'}},
      {id:'IF1-srv-3',title:'백랑산 원정',intro:'원상은 오환으로 달아났다. 사막을 건너는 강행군 끝에, 오환의 선우 답돈이 백랑산 아래 기병을 펼쳤다.',target:{name:'답돈',unitClass:'horseArcher'}},
    ]},
  {id:'yuan',act:1,history:false,choice:'원소에게 간다',detail:'조조의 부름을 물리치고 하북의 원소에게 몸을 맡긴다. 관도의 승부를 뒤집으려 한다.',name:'가상 · 하북의 책사',
    region:{name:'관도 평원',arc:'상편',terrain:0,boss:{name:'조조',unitClass:'infantry'},pool:WEI_POOL},
    tales:[
      {id:'IF1-yuan-1',title:'백마 구원',intro:'원소의 대장 안량이 백마에서 쓰러졌다. 그를 벤 붉은 얼굴의 장수 관우가 아직 전장에 있다. 저 자를 막지 못하면 하북군의 기세가 꺾인다.',target:{name:'관우',unitClass:'cavalry'}},
      {id:'IF1-yuan-2',title:'오소 수비',intro:'사마의는 원소에게 오소의 군량을 지키라 간언했고, 이번에는 원소가 들었다. 밤을 틈타 조조의 기병이 온다. 선두에 선 자는 장료다.',target:{name:'장료',unitClass:'cavalry'}},
      {id:'IF1-yuan-3',title:'관도 결전',intro:'관도의 진채가 마주 섰다. 조조의 본진 앞을 웃통 벗은 장사 허저가 막아선다. 그를 넘으면 조조가 보인다.',target:{name:'허저',unitClass:'infantry'}},
    ]},
  // ── 분기 ① 조조의 죽음
  {id:'wei',act:2,history:true,after:['refuse'],choice:'조비를 받든다',detail:'정사대로 위를 지키며 기산에서 제갈량의 북벌을 막는다. 연의 전장이 이어진다.',name:'정사 · 위의 방패',
    region:{name:'기산 산악',arc:'중편',terrain:1,boss:{name:'제갈량',unitClass:'strategist'},pool:['infantry','spearman','bandit','assassin','archer','crossbow','taoist','strategist','heavyCav']},tales:[]},
  {id:'cao_zhi',act:2,history:false,after:['refuse'],choice:'조식을 옹립한다',detail:'업성의 문사들과 손잡고 조식을 위왕으로 세운다. 위가 둘로 갈라지고, 조비의 친위대가 몰려온다.',name:'가상 · 업성의 왕',
    region:{name:'업성 내란',arc:'중편',terrain:0,boss:{name:'조비',unitClass:'strategist'},pool:WEI_POOL},
    tales:[
      {id:'IF2-zhi-1',title:'업성 봉기',intro:'"칠보시를 짓던 공자가 왕이 되면, 천하는 시로 다스려지겠소?" 조식의 웃음 뒤로 업성의 성문이 닫힌다. 조비의 호위 대장 허저가 성 밖에 진을 쳤다. 허저를 물리쳐야 봉기가 산다.',target:{name:'허저',unitClass:'infantry'}},
      {id:'IF2-zhi-2',title:'허창 탈취',intro:'천자가 있는 허창을 쥐는 자가 명분을 쥔다. 조씨 종실의 대들보 조진이 허창을 지킨다. 한때 함께 싸운 벗과 칼을 맞댈 차례다.',target:{name:'조진',unitClass:'heavyCav'}},
      {id:'IF2-zhi-3',title:'종친의 반격',intro:'천리구라 불린 조휴가 동쪽 군을 이끌고 업성으로 내달린다. 그를 막지 못하면 조식의 왕위는 사흘을 넘기지 못한다.',target:{name:'조휴',unitClass:'cavalry'}},
    ]},
  {id:'shu',act:2,history:false,after:['refuse'],choice:'유비에게 간다',detail:'조조 없는 위를 버리고 한중왕 유비에게 몸을 맡긴다. 와룡과 총이 한 깃발 아래 서서 북쪽을 친다.',name:'가상 · 촉의 사마의',
    region:{name:'형주 강릉',arc:'중편',terrain:2,boss:{name:'조인',unitClass:'heavyCav'},pool:WEI_POOL},
    tales:[
      {id:'IF2-shu-1',title:'양양 공략',intro:'제갈량이 부채를 거두며 말한다. "중달, 북쪽의 문은 양양이오." 위의 명장 서황이 양양을 굳게 지킨다.',target:{name:'서황',unitClass:'heavyCav'}},
      {id:'IF2-shu-2',title:'번성 포위',intro:'한수가 불어 번성이 물에 잠겼다. 성을 구하러 온 우금의 칠군이 물가에 갇혔다. 지금이 칠군을 꺾을 때다.',target:{name:'우금',unitClass:'spearman'}},
      {id:'IF2-shu-3',title:'완성 진격',intro:'번성을 지나면 완성, 완성을 지나면 허창이다. 가정에서 마속을 꺾었어야 할 장합이 이번에는 촉의 길을 막는다.',target:{name:'장합',unitClass:'cavalry'}},
    ]},
  // ── 분기 ② 오래 기다린 자의 선택
  {id:'patience',act:3,history:true,after:['wei'],choice:'병을 칭하고 때를 기다린다',detail:'정사대로 물러나 앉아 요동을 정벌하고, 때가 오면 고평릉에서 움직인다. 연의 전장이 이어진다.',name:'정사 · 은인자중',
    region:{name:'요동 요수',arc:'하편',terrain:2,boss:{name:'공손연',unitClass:'infantry'},pool:['infantry','spearman','cavalry','horseArcher','crossbow','archer','heavyCav','bandit','rattan']},tales:[],
    ending:{title:'진의 기틀',lines:['위의 방패로 제갈량을 막아 낸 노신은 끝내 서두르지 않았다. 그가 쌓은 기다림 위에서 손자 사마염이 진을 연다.','정사의 결말이다. 천하는 결국 사마씨에게로 흘러갔다.']}},
  {id:'coup',act:3,history:false,after:['wei'],ending:{title:'낙양의 주인',lines:['사마의는 기다림을 버리고 칼을 뽑았다. 낙양은 하룻밤 사이 사마씨의 것이 되었다.','역사는 그를 찬탈자이자 구원자로 함께 기록했다.']},choice:'지금 조상을 친다',detail:'기다리지 않는다. 아직 힘이 남았을 때 군을 일으켜 낙양을 장악한다. 조상의 금군이 막아선다.',name:'가상 · 이른 정변',
    region:{name:'낙양 정변',arc:'하편',terrain:0,boss:{name:'조상',unitClass:'cavalry'},pool:['infantry','spearman','crossbow','cavalry','archer']},
    tales:[
      {id:'IF3-coup-1',title:'무기고 장악',intro:'"지낭"이라 불린 환범이 조상에게 달려가기 전에 무기고를 쥐어야 한다. 사마사가 사병 삼천을 이끌고 어둠 속에 섰다.',target:{name:'환범',unitClass:'strategist'}},
      {id:'IF3-coup-2',title:'낙수 부교',intro:'조상의 아우 조희가 낙수 부교를 끊으려 한다. 다리가 끊기면 황제를 모신 조상의 본대가 낙양으로 돌아온다.',target:{name:'조희',unitClass:'cavalry'}},
      {id:'IF3-coup-3',title:'사마문의 기병',intro:'조상이 돌아오기 전, 그의 심복 문흠이 여강 기병을 몰고 사마문으로 달려온다. 성문을 빼앗기면 조상은 싸우지 않고 낙양에 들어온다.',target:{name:'문흠',unitClass:'cavalry'}},
    ]},
  {id:'unify',act:3,history:false,after:['wei'],ending:{title:'천하통일',lines:['위의 노신은 남은 생을 강동에 걸었다. 건업이 무너진 날, 백 년 만에 천하가 한 사람의 이름 아래 모였다.','제갈량을 막아 낸 손으로 손권을 꺾은 사람 — 그가 사마의였다.']},choice:'천하통일에 건다',detail:'조정 다툼은 아들들에게 맡기고, 남은 생을 오를 치는 데 쓴다. 강동의 물길이 마지막 전장이다.',name:'가상 · 천하통일',
    region:{name:'강동 수향',arc:'하편',terrain:2,boss:{name:'육손',unitClass:'strategist'},pool:['infantry','spearman','rattan','crossbow','taoist','shaman','elephant','cavalry']},
    tales:[
      {id:'IF3-uni-1',title:'합비 돌파',intro:'합비를 넘어 장강으로. 주연이 지키는 강가 요새가 첫 관문이다.',target:{name:'주연',unitClass:'infantry'}},
      {id:'IF3-uni-2',title:'유수구 결전',intro:'재주가 넘치는 제갈각이 유수구에 수군을 모았다. 이 물길을 넘으면 건업이 보인다.',target:{name:'제갈각',unitClass:'strategist'}},
      {id:'IF3-uni-3',title:'건업 포위',intro:'벽안자염의 손권이 건업 성벽 위에 섰다. 강동의 주인과 마주할 날이 왔다.',target:{name:'손권',unitClass:'strategist'}},
    ]},
  // ── 상편에서 즉시 출사한 길: 적벽 전야
  {id:'chibi',act:2,history:false,after:['serve'],choice:'적벽의 화공을 간파한다',detail:'조조에게 연환계와 고육계를 간파해 아뢴다. 적벽의 불은 일어나지 않고, 대군이 장강을 건넌다.',name:'가상 · 적벽을 넘은 위',
    region:{name:'적벽 장강',arc:'중편',terrain:2,boss:{name:'주유',unitClass:'strategist'},pool:['rattan','crossbow','taoist','infantry','spearman','cavalry','archer']},
    tales:[
      {id:'IF2-cb-1',title:'연환의 사슬',intro:'배를 사슬로 묶으라는 방통의 계책. 젊은 사마의는 그 사슬이 불을 기다리는 사슬임을 알아보았다. 방통을 꺾어 계책을 끊어라.',target:{name:'방통',unitClass:'strategist'}},
      {id:'IF2-cb-2',title:'고육계',intro:'노장 황개가 매를 맞고 투항해 왔다. 등의 상처가 진짜라 해도, 그가 끌고 온 배에는 기름과 마른 풀이 실려 있다.',target:{name:'황개',unitClass:'infantry'}},
      {id:'IF2-cb-3',title:'장강 도하',intro:'강을 건너는 선봉을 오의 감녕이 백 명의 결사대로 막아선다. 그를 넘으면 강동이다.',target:{name:'감녕',unitClass:'cavalry'}},
    ]},
  {id:'heir',act:2,history:false,after:['serve'],choice:'조비를 세자로 굳힌다',detail:'조식 대신 조비를 세자로 세우는 데 앞장서 세자의 스승이 된다. 그 공으로 한중을 맡아 유비와 맞선다.',name:'가상 · 세자의 스승',
    region:{name:'한중 정군산',arc:'중편',terrain:1,boss:{name:'유비',unitClass:'infantry'},pool:['infantry','spearman','archer','crossbow','cavalry','bandit']},
    tales:[
      {id:'IF2-hr-1',title:'정군산',intro:'정군산 꼭대기에 노장 황충이 올랐다. 하후연이 쓰러졌어야 할 그 산을, 이번에는 사마의가 먼저 오른다.',target:{name:'황충',unitClass:'archer'}},
      {id:'IF2-hr-2',title:'한수의 빈 진채',intro:'한수 가에 조운이 진채의 문을 활짝 열어 두었다. 공성계인가, 함정인가. 사마의는 문 안으로 군을 들인다.',target:{name:'조운',unitClass:'heavyCav'}},
      {id:'IF2-hr-3',title:'양평관',intro:'한중의 관문 양평관을 위연이 지킨다. 관을 넘으면 유비의 본진이다.',target:{name:'위연',unitClass:'infantry'}},
    ]},
  // ── 상편에서 원소에게 간 길: 원소의 죽음
  {id:'hebei',act:2,history:false,after:['yuan'],choice:'원씨의 천하를 세운다',detail:'관도의 승리를 발판으로 원상을 후계로 세워 하북을 하나로 묶고, 남쪽 허창으로 내려간다.',name:'가상 · 원씨의 천하',
    region:{name:'허창 평원',arc:'중편',terrain:0,boss:{name:'순욱',unitClass:'strategist'},pool:WEI_POOL},
    tales:[
      {id:'IF2-hb-1',title:'허창 외곽',intro:'외눈의 하후돈이 허창 앞에 마지막 방벽을 쳤다. 조조가 쌓은 도읍의 문이 눈앞이다.',target:{name:'하후돈',unitClass:'cavalry'}},
      {id:'IF2-hb-2',title:'완성 공략',intro:'남쪽 완성은 조인이 지킨다. 허창으로 가는 원군을 끊으려면 완성을 먼저 꺾어야 한다.',target:{name:'조인',unitClass:'heavyCav'}},
      {id:'IF2-hb-3',title:'신야의 객장',intro:'형주 유표에게 몸을 의탁한 유비가 신야에서 남쪽 길을 막는다. 하북의 대군 앞에 선 객장이다.',target:{name:'유비',unitClass:'infantry'}},
    ]},
  {id:'independent',act:2,history:false,after:['yuan'],choice:'하내에서 자립한다',detail:'원소가 죽자 원씨 형제를 버리고 고향 하내에서 사마씨의 깃발을 세운다. 원씨와 조조 사이의 제3의 세력이 된다.',name:'가상 · 사마씨의 나라',
    region:{name:'하내 산지',arc:'중편',terrain:1,boss:{name:'원담',unitClass:'infantry'},pool:['infantry','spearman','cavalry','archer','crossbow','heavyCav']},
    tales:[
      {id:'IF2-in-1',title:'온현 수비',intro:'원씨의 장수 고람이 배신자를 벌하러 온현으로 온다. 고향의 성벽이 첫 시험대다.',target:{name:'고람',unitClass:'spearman'}},
      {id:'IF2-in-2',title:'장합의 귀순',intro:'원씨를 떠난 장합이 갈 곳을 찾는다. 칼로 꺾어야 그가 따른다.',target:{name:'장합',unitClass:'cavalry'}},
      {id:'IF2-in-3',title:'태항산 길',intro:'조조의 하후연이 태항산을 넘어 하내를 노린다. 산길에서 그를 막아야 한다.',target:{name:'하후연',unitClass:'cavalry'}},
    ]},
  // ── 하편: 조식의 위
  {id:'zhi_unify',act:3,history:false,after:['cao_zhi'],choice:'조식의 재상으로 천하를 하나로',detail:'시를 사랑하는 왕은 정사를 그대에게 맡겼다. 그 손으로 강동을 쳐 천하를 하나로 묶는다.',name:'가상 · 시인의 천하',
    ending:{title:'시인의 천하',lines:['조식의 재상 사마의가 건업을 함락시켰다. 시를 짓던 왕 아래 천하가 하나 되었다.','칠보시의 공자는 성군으로, 그 곁의 재상은 천하를 다스린 손으로 기억되었다.']},
    region:{name:'강동 수향',arc:'하편',terrain:2,boss:{name:'육손',unitClass:'strategist'},pool:['rattan','crossbow','taoist','infantry','spearman','cavalry','archer']},
    tales:[
      {id:'IF3-zu-1',title:'합비의 문',intro:'조식의 재상 사마의가 합비를 넘는다. 강가 요새는 주연이 지킨다.',target:{name:'주연',unitClass:'infantry'}},
      {id:'IF3-zu-2',title:'건업 앞바다',intro:'건업 앞바다에 손권이 몸소 함대를 이끌고 나왔다. 강동의 주인과 마주할 때다.',target:{name:'손권',unitClass:'strategist'}},
      {id:'IF3-zu-3',title:'석두성',intro:'손권이 성 안으로 물러나자 전종이 건업 서쪽 강가의 돌 성, 석두성에 올랐다. 육손이 진을 칠 시간을 벌려는 것이다.',target:{name:'전종',unitClass:'infantry'}},
    ]},
  {id:'zhi_throne',act:3,history:false,after:['cao_zhi'],choice:'조식에게서 선양받는다',detail:'정사를 모두 쥔 지 오래다. 왕은 시를 짓고, 천하는 사마씨를 본다. 이제 그 자리를 넘겨받는다.',name:'가상 · 선양의 날',
    ending:{title:'선양의 날',lines:['조식은 웃으며 옥새를 내려놓았다. "그대가 더 잘 다스릴 것이오." 사마씨의 나라가 열렸다.','역사보다 한 세대 이른 진 — 시인 왕의 양보로 시작된 왕조였다.']},
    region:{name:'낙양 궁정',arc:'하편',terrain:0,boss:{name:'조식',unitClass:'strategist'},pool:['infantry','spearman','crossbow','cavalry','archer']},
    tales:[
      {id:'IF3-zt-1',title:'종친의 반발',intro:'선양의 소문에 조씨 종친 조휴가 군을 일으켰다. 낙양으로 오는 길목을 끊어라.',target:{name:'조휴',unitClass:'cavalry'}},
      {id:'IF3-zt-2',title:'금군의 칼끝',intro:'금군을 쥔 조진이 궁문을 닫았다. 한때의 벗이 마지막 벽이다.',target:{name:'조진',unitClass:'heavyCav'}},
      {id:'IF3-zt-3',title:'조홍의 사병',intro:'조씨 가문에서 가장 부유한 조홍이 곳간을 털어 모은 사병을 이끌고 낙양 동문에 섰다.',target:{name:'조홍',unitClass:'cavalry'}},
    ]},
  // ── 하편: 촉의 사마의
  {id:'shu_north',act:3,history:false,after:['shu'],choice:'북벌을 완수한다',detail:'제갈량과 함께 기산을 넘는다. 이번에는 위의 지략을 아는 자가 촉에 있다.',name:'가상 · 한실 부흥',
    ending:{title:'한실 부흥',lines:['와룡과 총이 함께 낙양에 들어섰다. 한의 깃발이 다시 도성 위에 올랐다.','위를 버린 사마의가 한실을 되살렸다 — 누구도 쓰지 못한 출사표의 끝이었다.']},
    region:{name:'낙양 진격',arc:'하편',terrain:0,boss:{name:'조예',unitClass:'strategist'},pool:WEI_POOL},
    tales:[
      {id:'IF3-sn-1',title:'진창',intro:'진창성을 학소가 지킨다. 제갈량을 스무 날 붙잡았던 성을, 사마의는 사흘 안에 넘으려 한다.',target:{name:'학소',unitClass:'spearman'}},
      {id:'IF3-sn-2',title:'가정 너머',intro:'가정을 지나 장안으로. 위의 명장 장합이 마지막 길을 막는다.',target:{name:'장합',unitClass:'cavalry'}},
      {id:'IF3-sn-3',title:'동관의 활',intro:'장안을 잃은 위는 동관에 마지막 둑을 쌓았다. 곽회가 관문 위에 활을 세웠다.',target:{name:'곽회',unitClass:'crossbow'}},
    ]},
  {id:'shu_south',act:3,history:false,after:['shu'],choice:'남중을 평정하고 촉의 승상이 된다',detail:'제갈량의 뒤를 이어 남중의 맹획을 꺾고, 촉의 안쪽부터 다진다.',name:'가상 · 촉의 승상',
    ending:{title:'촉의 승상',lines:['남중의 맹획이 일곱 번째로 머리를 숙였다. 사마의는 제갈량의 뒤를 이어 촉의 승상이 되었다.','위에서 태어나 촉에서 늙은 책사 — 그는 끝내 고향 하내로 돌아가지 않았다.']},
    region:{name:'남중 밀림',arc:'하편',terrain:1,boss:{name:'맹획',unitClass:'elephant'},pool:['elephant','rattan','bandit','shaman','infantry','spearman']},
    tales:[
      {id:'IF3-ss-1',title:'등갑병의 숲',intro:'기름 먹인 등갑을 두른 올돌골의 군대가 숲을 메웠다. 칼도 화살도 듣지 않는다 — 불만이 답이다.',target:{name:'올돌골',unitClass:'rattan'}},
      {id:'IF3-ss-2',title:'독룡동',intro:'맹획의 아내 축융이 독룡동 앞에서 비도를 겨눈다.',target:{name:'축융',unitClass:'assassin'}},
      {id:'IF3-ss-3',title:'목록대왕의 맹수',intro:'은갱동으로 가는 길목, 팔납동의 목록대왕이 범과 표범을 몰고 나왔다. 바람을 부르고 맹수를 부리는 남만의 술사다.',target:{name:'목록대왕',unitClass:'shaman'}},
    ]},
  // ── 하편: 적벽을 넘은 위
  {id:'chibi_shu',act:3,history:false,after:['chibi'],choice:'익주를 쳐 천하통일',detail:'강동을 얻은 위군이 서쪽 익주로 향한다. 남은 것은 유비와 제갈량뿐이다.',name:'가상 · 이른 통일',
    ending:{title:'이른 통일',lines:['적벽에서 불이 일지 않은 세계 — 천하는 삼국으로 갈라지기도 전에 하나가 되었다.','그 통일의 설계도를 그린 이는 조조 곁의 젊은 참모, 사마의였다.']},
    region:{name:'검각 잔도',arc:'하편',terrain:1,boss:{name:'제갈량',unitClass:'strategist'},pool:['infantry','spearman','archer','crossbow','cavalry','bandit']},
    tales:[
      {id:'IF3-cs-1',title:'검각',intro:'검각의 잔도를 강유가 지킨다. 한 사람이 관을 막으면 만 명도 넘지 못한다는 곳이다.',target:{name:'강유',unitClass:'cavalry'}},
      {id:'IF3-cs-2',title:'성도의 문',intro:'성도 앞에 늙은 조운이 홀로 창을 세웠다.',target:{name:'조운',unitClass:'heavyCav'}},
      {id:'IF3-cs-3',title:'서량의 마지막 기병',intro:'제갈량이 팔진을 펴는 동안 마대가 서량 기병을 이끌고 성도 북쪽 들판을 휘젓는다.',target:{name:'마대',unitClass:'cavalry'}},
    ]},
  {id:'chibi_throne',act:3,history:false,after:['chibi'],choice:'조씨에게서 천하를 넘겨받는다',detail:'천하의 둘을 얻은 조씨는 이제 그대의 지모 없이는 서지 못한다. 늙은 조조가 숨을 거두는 날, 움직인다.',name:'가상 · 조조의 그늘을 넘어',
    ending:{title:'조조의 그늘을 넘어',lines:['조조를 도와 천하의 둘을 얻은 손이, 그 천하를 조씨에게서 거두었다.','간웅의 참모는 간웅이 되었다. 역사는 이 왕조를 사마씨의 위라 불렀다.']},
    region:{name:'낙양 궁정',arc:'하편',terrain:0,boss:{name:'조비',unitClass:'strategist'},pool:['infantry','spearman','crossbow','cavalry','archer']},
    tales:[
      {id:'IF3-ct-1',title:'업성의 호위',intro:'조조의 호위 대장 허저가 업성 궁문을 지킨다.',target:{name:'허저',unitClass:'infantry'}},
      {id:'IF3-ct-2',title:'종실의 대들보',intro:'조씨 종실의 조진이 마지막까지 조비 곁에 섰다.',target:{name:'조진',unitClass:'heavyCav'}},
      {id:'IF3-ct-3',title:'외눈의 나루지기',intro:'낙양으로 가는 맹진 나루를 하후돈이 막았다. 조조와 평생을 함께한 외눈의 장수가 마지막으로 조비를 위해 섰다.',target:{name:'하후돈',unitClass:'cavalry'}},
    ]},
  // ── 하편: 세자의 스승
  {id:'heir_wu',act:3,history:false,after:['heir'],choice:'오를 쳐 천하통일',detail:'황제가 된 제자를 위해 남은 강동을 친다.',name:'가상 · 대장군의 천하',
    ending:{title:'대장군의 천하',lines:['세자의 스승은 황제의 대장군이 되어 강동까지 평정했다.','충신으로 남은 사마의 — 그의 이름은 찬탈자가 아닌 건국 공신으로 기록되었다.']},
    region:{name:'강동 수향',arc:'하편',terrain:2,boss:{name:'육손',unitClass:'strategist'},pool:['rattan','crossbow','taoist','infantry','spearman','cavalry','archer']},
    tales:[
      {id:'IF3-hw-1',title:'합비의 밤',intro:'감녕이 백 기로 위의 진영을 기습해 온다. 이번에는 사마의가 그 밤을 기다리고 있었다.',target:{name:'감녕',unitClass:'cavalry'}},
      {id:'IF3-hw-2',title:'백의도강',intro:'상인으로 변장한 여몽의 군이 강을 건넌다. 이번에는 속지 않는다.',target:{name:'여몽',unitClass:'cavalry'}},
      {id:'IF3-hw-3',title:'눈 속의 단병',intro:'강을 건넌 위군 앞에 정봉이 갑옷을 벗은 결사대를 이끌고 눈 내린 둑에 섰다.',target:{name:'정봉',unitClass:'infantry'}},
    ]},
  {id:'heir_regent',act:3,history:false,after:['heir'],choice:'어린 황제의 섭정이 된다',detail:'병약한 황제가 세상을 떠나고 어린 황제가 섰다. 조정을 쥐려는 종친과 맞서 섭정이 된다.',name:'가상 · 섭정의 시대',
    ending:{title:'섭정의 시대',lines:['어린 황제의 손을 잡은 노신이 천하를 다스렸다.','칼을 들지 않고 권력을 쥔 섭정 — 사마의는 찬탈 대신 섭정을 택했다.']},
    region:{name:'낙양 궁정',arc:'하편',terrain:0,boss:{name:'조예',unitClass:'strategist'},pool:['infantry','spearman','crossbow','cavalry','archer']},
    tales:[
      {id:'IF3-hrg-1',title:'종친의 견제',intro:'조진이 종친의 이름으로 섭정을 막아선다.',target:{name:'조진',unitClass:'heavyCav'}},
      {id:'IF3-hrg-2',title:'조상의 칼',intro:'젊은 조상이 금군을 이끌고 궁을 에워쌌다. 정사보다 이십 년 이른 고평릉이다.',target:{name:'조상',unitClass:'cavalry'}},
      {id:'IF3-hrg-3',title:'지낭의 조서',intro:'조상의 책사 환범이 남궁 문을 닫고 거짓 조서를 내걸었다. 조서가 퍼지기 전에 남궁을 열어야 한다.',target:{name:'환범',unitClass:'strategist'}},
    ]},
  // ── 하편: 원씨의 천하
  {id:'hebei_south',act:3,history:false,after:['hebei'],choice:'강동까지 남정한다',detail:'허창을 얻은 원씨의 승상으로, 남쪽 끝 강동까지 군을 몬다.',name:'가상 · 하북의 천하',
    ending:{title:'하북의 천하',lines:['관도에서 이긴 원씨가 천하를 얻었다. 그 승상은 하내의 사마의였다.','조조가 없는 삼국지 — 천하는 원씨의 이름으로, 사마의의 손으로 하나 되었다.']},
    region:{name:'강동 수향',arc:'하편',terrain:2,boss:{name:'주유',unitClass:'strategist'},pool:['rattan','crossbow','taoist','infantry','spearman','cavalry','archer']},
    tales:[
      {id:'IF3-hs-1',title:'노숙의 맹약',intro:'노숙이 유비와 맺은 맹약으로 강동의 문을 막는다.',target:{name:'노숙',unitClass:'strategist'}},
      {id:'IF3-hs-2',title:'파양호 수군',intro:'파양호의 수군을 감녕이 이끈다.',target:{name:'감녕',unitClass:'cavalry'}},
      {id:'IF3-hs-3',title:'오하의 아몽',intro:'시상으로 들어가는 강어귀를 젊은 여몽이 막았다. 글을 몰라 놀림받던 장수가 이제는 주유의 병법으로 진을 쳤다.',target:{name:'여몽',unitClass:'infantry'}},
    ]},
  {id:'hebei_throne',act:3,history:false,after:['hebei'],choice:'원상을 폐하고 즉위한다',detail:'원상은 그릇이 아니다. 하북의 신하들은 이미 그대를 본다.',name:'가상 · 원씨를 넘어선 자',
    ending:{title:'원씨를 넘어선 자',lines:['원씨의 책사가 원씨의 옥좌에 앉았다. 하북에서 사마씨의 나라가 일어났다.','관도를 뒤집은 지략은 끝내 주인을 삼켰다.']},
    region:{name:'업성 궁정',arc:'하편',terrain:0,boss:{name:'원상',unitClass:'cavalry'},pool:['infantry','spearman','cavalry','archer','crossbow','heavyCav']},
    tales:[
      {id:'IF3-ht-1',title:'봉기의 간언',intro:'원씨의 충신 봉기가 업성 백관을 모아 그대를 탄핵한다.',target:{name:'봉기',unitClass:'strategist'}},
      {id:'IF3-ht-2',title:'업성 금위',intro:'심배가 업성 금위를 이끌고 마지막 충성을 바친다.',target:{name:'심배',unitClass:'strategist'}},
      {id:'IF3-ht-3',title:'저수의 마지막 간언',intro:'관도에서 원씨를 이기게 한 책사 저수가 업성 서쪽 성채에 원상의 마지막 병사를 모았다.',target:{name:'저수',unitClass:'strategist'}},
    ]},
  // ── 하편: 사마씨의 나라
  {id:'ind_alliance',act:3,history:false,after:['independent'],choice:'조조와 손잡고 원씨를 멸한다',detail:'남쪽의 조조와 동맹을 맺고 북쪽의 원씨부터 친다. 하북을 사마씨의 것으로 만든다.',name:'가상 · 하북의 주인',
    ending:{title:'하북의 주인',lines:['조조와 천하를 반으로 나눈 사마씨 — 남쪽엔 위가, 북쪽엔 사마씨의 나라가 섰다.','두 영웅이 마주 선 이남북조의 시대가 열렸다.']},
    region:{name:'업성 궁정',arc:'하편',terrain:0,boss:{name:'원상',unitClass:'cavalry'},pool:['infantry','spearman','cavalry','archer','crossbow','heavyCav']},
    tales:[
      {id:'IF3-ia-1',title:'업성 포위',intro:'원상의 충신 심배가 업성을 지킨다.',target:{name:'심배',unitClass:'strategist'}},
      {id:'IF3-ia-2',title:'원씨의 친위',intro:'원소의 조카 고간이 원상을 지키러 병주에서 내려왔다.',target:{name:'고간',unitClass:'infantry'}},
      {id:'IF3-ia-3',title:'하북의 철기',intro:'원상의 마지막 진 앞에 문추가 하북 철기를 이끌고 나왔다. 안량과 함께 하북의 두 기둥이라 불린 장수다.',target:{name:'문추',unitClass:'cavalry'}},
    ]},
  {id:'ind_empire',act:3,history:false,after:['independent'],choice:'하내에서 제업을 연다',detail:'원씨와 조조 모두를 친다. 하내의 깃발로 중원을 차지한다.',name:'가상 · 하내의 제국',
    ending:{title:'하내의 제국',lines:['조조마저 꺾은 하내의 사마씨가 중원의 주인이 되었다.','원소도 조조도 아닌 제3의 영웅 — 그것이 사마의였다.']},
    region:{name:'중원 평원',arc:'하편',terrain:0,boss:{name:'조조',unitClass:'infantry'},pool:WEI_POOL},
    tales:[
      {id:'IF3-ie-1',title:'허창 북문',intro:'외눈의 하후돈이 허창 북문을 지킨다.',target:{name:'하후돈',unitClass:'cavalry'}},
      {id:'IF3-ie-2',title:'호치',intro:'허저가 웃통을 벗고 조조의 본진 앞을 막았다.',target:{name:'허저',unitClass:'infantry'}},
      {id:'IF3-ie-3',title:'팔문금쇄',intro:'조조가 몸소 나오기 전, 조인이 허창 앞 평원에 팔문금쇄진을 펼쳤다. 살아 나오는 문은 하나뿐이다.',target:{name:'조인',unitClass:'infantry'}},
    ]},
  // ── 신세력: 사마의가 스스로 새 깃발을 든다(신세력으로 시작한 회차에서만)
  {id:'np1',act:1,history:false,custom:true,choice:'스스로 기치를 든다 — {세력}을 세운다',detail:'누구의 신하도 되지 않는다. 하내에서 {세력}의 깃발을 올리고, 조조와 원소 사이에서 살아남는다.',name:'신세력 · {세력}의 깃발',
    region:{name:'하내 · 황하 나루',arc:'상편',terrain:0,boss:{name:'조조',unitClass:'infantry'},pool:WEI_POOL},
    tales:[
      {id:'NP1-1',title:'하내 거병',intro:'하내에 낯선 깃발이 올랐다는 소식에 조조가 토벌군을 보냈다. 선봉은 엄격하기로 이름난 우금이다. 첫 싸움에서 지면 {세력}은 이름도 남기지 못한다.',target:{name:'우금',unitClass:'spearman'}},
      {id:'NP1-2',title:'황하 나루',intro:'원소도 황하 남쪽의 새 깃발을 가만두지 않는다. 하북의 맹장 문추가 기병을 몰아 나루를 건넌다.',target:{name:'문추',unitClass:'cavalry'}},
      {id:'NP1-3',title:'허창 앞마당',intro:'두 번 이긴 {세력}을 조조가 직접 상대하기로 했다. 허창으로 가는 길목을 외눈의 하후돈이 막아선다.',target:{name:'하후돈',unitClass:'cavalry'}},
    ]},
  {id:'np_south',act:2,history:false,custom:true,after:['np1'],choice:'남쪽 형주로 내려간다',detail:'중원의 두 거인을 피해 형주의 기름진 땅을 노린다. 조인과 관우가 기다린다.',name:'신세력 · 형주의 {세력}',
    region:{name:'형양 · 완성',arc:'중편',terrain:2,boss:{name:'유비',unitClass:'infantry'},pool:['infantry','spearman','cavalry','archer','crossbow','bandit']},
    tales:[
      {id:'NP2-s1',title:'완성 공략',intro:'형주로 가는 첫 문은 완성이다. 조조의 종제 조인이 성을 쇠처럼 지킨다.',target:{name:'조인',unitClass:'heavyCav'}},
      {id:'NP2-s2',title:'양양 수채',intro:'강동의 금범적 감녕이 형주를 노리고 강을 거슬러 올라왔다. 강가의 수채를 먼저 쥐는 쪽이 형주를 얻는다.',target:{name:'감녕',unitClass:'bandit'}},
      {id:'NP2-s3',title:'맥성 앞',intro:'형주의 주인 관우가 청룡언월도를 들고 나섰다. 그를 넘으면 형주는 {세력}의 것이다.',target:{name:'관우',unitClass:'cavalry'}},
    ]},
  {id:'np_west',act:2,history:false,custom:true,after:['np1'],choice:'서쪽 관중으로 나아간다',detail:'장안을 얻어 서쪽의 말과 군사를 쥔다. 하후연과 서량의 기병이 기다린다.',name:'신세력 · 관중의 {세력}',
    region:{name:'관중 · 장안',arc:'중편',terrain:0,boss:{name:'마초',unitClass:'cavalry'},pool:['cavalry','horseArcher','spearman','infantry','archer','heavyCav']},
    tales:[
      {id:'NP2-w1',title:'동관 돌파',intro:'관중의 관문 동관을 질풍 같은 하후연이 지킨다. 사흘에 오백 리를 달린다는 그의 기병보다 빨라야 한다.',target:{name:'하후연',unitClass:'horseArcher'}},
      {id:'NP2-w2',title:'위수의 다리',intro:'서량의 마대가 위수의 다리를 끊으려 한다. 다리가 끊기면 장안은 멀어진다.',target:{name:'마대',unitClass:'cavalry'}},
      {id:'NP2-w3',title:'장안 성문',intro:'장안 성문 앞에 큰 도끼를 든 서황이 버티고 섰다. 그를 꺾으면 옛 도읍이 {세력}의 손에 들어온다.',target:{name:'서황',unitClass:'heavyCav'}},
    ]},
  {id:'np_unify',act:3,history:false,custom:true,after:['np_south','np_west'],choice:'천하를 하나로 묶는다',detail:'세 나라를 모두 꺾고 {세력}의 이름으로 천하를 하나로 만든다. 마지막 적은 와룡 제갈량이다.',name:'신세력 · {세력}의 천하',
    region:{name:'장강 · 건업',arc:'하편',terrain:2,boss:{name:'제갈량',unitClass:'strategist'},pool:['infantry','spearman','cavalry','crossbow','archer','strategist','rattan']},
    tales:[
      {id:'NP3-u1',title:'장판의 재현',intro:'익주로 가는 길, 단기필마로 이름난 조운이 다리를 막았다. 이번에는 아이가 아니라 나라를 지키려는 창이다.',target:{name:'조운',unitClass:'cavalry'}},
      {id:'NP3-u2',title:'합비 설욕',intro:'합비의 장료가 칠백 기병으로 {세력}의 대군을 노린다. 요래요래의 이름을 이번엔 꺾어야 한다.',target:{name:'장료',unitClass:'cavalry'}},
      {id:'NP3-u3',title:'이릉의 불',intro:'서생 대도독 육손이 장강 위에 불을 준비했다. 바람을 먼저 읽는 쪽이 이긴다.',target:{name:'육손',unitClass:'strategist'}},
    ],ending:{title:'새 하늘',lines:['{세력}의 깃발이 장강을 건넜다. 위도 촉도 오도 아닌, 아무도 예언하지 못한 나라가 천하를 하나로 묶었다.','사마의는 끝내 누구의 신하도 되지 않았다. 사람들은 그를 기다린 자가 아니라 처음부터 일어선 자로 기억했다.']}},
  {id:'np_kingdom',act:3,history:false,custom:true,after:['np_south','np_west'],choice:'얻은 땅을 지켜 네 번째 나라가 된다',detail:'천하를 다 삼키려다 무너진 자들을 보았다. 얻은 땅을 굳게 지켜 {세력}을 네 번째 나라로 남긴다. 위가 마지막 대군을 보낸다.',name:'신세력 · 네 번째 나라',
    region:{name:'하내 · 낙양',arc:'하편',terrain:0,boss:{name:'조비',unitClass:'strategist'},pool:WEI_POOL},
    tales:[
      {id:'NP3-k1',title:'맹진 방어',intro:'위의 맹장 하후돈이 다시 왔다. 이번에는 맹진 나루를 넘어 {세력}의 심장을 노린다.',target:{name:'하후돈',unitClass:'cavalry'}},
      {id:'NP3-k2',title:'천리구',intro:'조씨 종실의 천리구 조휴가 동쪽에서 기병을 몰아온다.',target:{name:'조휴',unitClass:'cavalry'}},
      {id:'NP3-k3',title:'옛 벗',intro:'위의 대장군이 되어 돌아온 조진이 군을 이끌고 왔다. 한때 함께 웃던 벗과 칼을 맞댈 차례다.',target:{name:'조진',unitClass:'heavyCav'}},
    ],ending:{title:'네 번째 나라',lines:['위·촉·오에 이어 {세력}이 천하의 넷째 자리를 지켰다. 사가들은 이 시대를 삼국이 아니라 사국이라 적었다.','사마의는 끝까지 서두르지 않았다. 얻은 것을 지키는 것 또한 천하를 읽는 일이었다.']}},
];
export const routeById=(id:string|undefined)=>ROUTES.find(r=>r.id===id);
/** 이 편의 갈림길에 나오는 길: 앞선 선택에 이어지는 것만. */
export function routesFor(act:1|2|3,route?:{1?:string;2?:string;3?:string},custom=false):Route[]{
  const mine=(r:Route)=>custom||!r.custom;
  if(act===1)return ROUTES.filter(r=>r.act===1&&mine(r));
  const parent=route?.[(act-1) as 1|2];
  return ROUTES.filter(r=>r.act===act&&mine(r)&&(parent?r.after?.includes(parent):r.after?.includes(act===2?'refuse':'wei')));
}
/** 신세력의 글: '{세력}'을 세력 이름으로. */
export const factionText=(text:string,faction='신세력')=>text.replaceAll('{세력}',faction);

/** 저장된 선택의 사슬이 실제로 갈 수 있는 길인지: 각 편의 길이 그 편 것이고, 앞선 선택에 이어지는가. */
export function validRoute(route:Record<string,unknown>):boolean{
  for(const [key,id] of Object.entries(route)){
    const act=Number(key),r=routeById(typeof id==='string'?id:undefined);
    if(!r||r.act!==act)return false;
    if(act>1&&!routesFor(act as 2|3,route as {1?:string;2?:string},true).includes(r))return false;
  }
  return true;
}

/** 앞선 선택에 따라 갈림길의 때·이름·상황이 달라진다. */
const FATE_BY_PARENT:Record<string,FatePoint>={
  serve:{act:2,year:'208년 · 장강',title:'적벽 전야',prompt:'조조의 대군이 형주를 삼키고 장강에 이르렀다. 그대는 조조 곁의 젊은 참모. 남쪽에는 손권과 유비의 연합군, 안쪽에는 세자 자리를 두고 다투는 조비와 조식. 어디에 힘을 쏟겠는가.'},
  yuan:{act:2,year:'202년 · 업성',title:'원소의 죽음',prompt:'관도를 이긴 원소도 병을 이기지 못했다. 원담과 원상 형제가 후계를 두고 칼을 겨누고, 조조는 허창에서 재기를 노린다. 그대는 원씨의 책사로 남겠는가, 사마씨의 가장으로 서겠는가.'},
  cao_zhi:{act:3,year:'226년 · 낙양',title:'왕의 재상',prompt:'조식이 위왕이 된 지 여러 해. 시를 사랑하는 왕은 정사를 그대에게 맡겼다. 천하는 아직 셋으로 나뉘어 있고, 조정은 그대의 손 안에 있다.'},
  shu:{act:3,year:'227년 · 한중',title:'출사표',prompt:'제갈량이 출사표를 올렸다. "중달, 이번에는 그대가 선봉이오." 북쪽에는 위의 대군이, 남쪽에는 아직 복종하지 않은 남중이 있다.'},
  chibi:{act:3,year:'215년 · 건업',title:'강동을 얻은 뒤',prompt:'적벽을 넘은 위군이 건업을 차지했다. 천하의 셋 가운데 둘이 조씨의 것이다. 서쪽 익주의 유비만 남았고, 조조는 늙었다.'},
  heir:{act:3,year:'220년 · 낙양',title:'세자의 스승',prompt:'그대가 가르친 조비가 황제가 되었다. 한중을 지킨 공으로 그대는 대장군이다. 남쪽 강동은 아직 굴복하지 않았고, 황제는 병약하다.'},
  hebei:{act:3,year:'210년 · 허창',title:'원씨의 승상',prompt:'허창이 무너지고 조조는 서량으로 달아났다. 원상은 황제를 끼고 승상인 그대에게 모든 일을 맡겼다. 강동의 손권은 아직 고개를 숙이지 않는다.'},
  np1:{act:2,year:'208년 · 하내',title:'두 거인 사이에서',prompt:'{세력}은 조조와 원소의 틈에서 살아남았다. 중원은 아직 두 거인의 것이다. 남쪽 형주의 기름진 땅인가, 서쪽 관중의 말과 옛 도읍인가.'},
  np_south:{act:3,year:'219년 · 양양',title:'네 번째 깃발',prompt:'형주를 얻은 {세력}은 이제 위·촉·오와 어깨를 나란히 한다. 천하를 다 삼키러 갈 것인가, 얻은 땅을 굳게 지킬 것인가.'},
  np_west:{act:3,year:'219년 · 장안',title:'네 번째 깃발',prompt:'장안을 얻은 {세력}은 이제 위·촉·오와 어깨를 나란히 한다. 천하를 다 삼키러 갈 것인가, 얻은 땅을 굳게 지킬 것인가.'},
  independent:{act:3,year:'215년 · 하내',title:'제3의 깃발',prompt:'하내의 사마씨 깃발 아래 장합과 고람이 모였다. 북쪽의 원씨는 기울었고, 남쪽의 조조는 강성하다. 어느 쪽을 먼저 칠 것인가.'},
};
export function fatePoint(act:1|2|3,route?:{1?:string;2?:string}):FatePoint{
  const parent=act>1?route?.[(act-1) as 1|2]:undefined;
  return (parent&&FATE_BY_PARENT[parent]?.act===act?FATE_BY_PARENT[parent]:undefined)??FATE_POINTS[act];
}
export function fatePrompt(act:1|2|3,route?:{1?:string;2?:string}){return fatePoint(act,route).prompt;}

/** 결말: 하편의 길마다 하나. 세 번 모두 정사일 때만 정사 결말. */
export interface Ending {id:string;title:string;lines:string[];history:boolean}
export function endingFor(route?:{1?:string;2?:string;3?:string}):Ending{
  const r=routeById(route?.[3])??routeById('patience')!;
  const history=r.id==='patience'&&(route?.[2]??'wei')==='wei'&&(route?.[1]??'refuse')==='refuse';
  return {id:r.id,title:r.ending!.title,lines:r.ending!.lines,history};
}
export const ALL_ENDINGS=ROUTES.filter(r=>r.act===3).map(r=>r.id);

/** 가상 길 한 편의 가상 전장 수 범위(우두머리 제외). 안내 문구에 쓴다(지금은 모든 길이 3장). */
export function whatIfTaleRange(){const n=ROUTES.filter(r=>!r.history&&r.tales.length).map(r=>r.tales.length);return {min:Math.min(...n),max:Math.max(...n)};}
export const taleRangeText=()=>{const {min,max}=whatIfTaleRange();return min===max?`${min}장`:`${min}~${max}장`;};
