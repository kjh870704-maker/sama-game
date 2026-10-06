import type {BattleState} from '../../core/src/index.ts';
import {raceGap} from './campaign-rules.ts';

/** Non-blocking battle chatter: short lines with a portrait that float over the map
 * when the board reaches a moment, the way the classic games keep the story moving
 * mid-battle without stopping play. */
export type LineWhen=
  |{turn:number}
  |{retreat:string}
  |{firstEnemyDown:true}
  |{enemiesBelow:number}
  |{reach:{unit:string;region:string}}
  |{allyAhead:true}
  |{lockedBy:string};
export interface BattleLine {id:string;when:LineWhen;speaker:string;text:string}

export const battleLines:Record<string,BattleLine[]>={
  'S3-07':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'수군은 수로를 따라 수문 앞까지. 육군은 강둑 길에서 기다린다. 포격이 떨어질 물길을 피하라.'},
    {id:'open-2',when:{turn:2},speaker:'왕릉',text:'중달, 너도 늙었구나. 이 성벽과 하늘이 너를 막을 것이다.'},
    {id:'gate',when:{lockedBy:'shouchun/gate'},speaker:'사마소',text:'수문이 열렸습니다! 육군, 성 안으로!'},
    {id:'storm',when:{lockedBy:'shouchun/gate'},speaker:'사마사',text:'성 안마당에 먹구름이 낍니다. 낙뢰가 떨어질 칸을 피하십시오.'},
    {id:'wang',when:{retreat:'wang_ling'},speaker:'사마의',text:'왕릉… 우리는 같은 시대를 너무 오래 살았다.'},
  ],
  'S3-06':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'무기고가 저들 손에 있는 동안 금군은 견고하고, 증원은 끊이지 않는다. 사야, 소야, 무기고를 먼저 쥐어라.'},
    {id:'open-2',when:{turn:2},speaker:'사마소',text:'형님, 무기고 수비병은 셋입니다. 동쪽 담을 따라 붙겠습니다.'},
    {id:'armory',when:{lockedBy:'coup/armory'},speaker:'사마사',text:'무기고를 쥐었습니다! 금군의 견고가 풀리고 증원이 멈춥니다. 저희는 성문을 닫으러 갑니다!'},
    {id:'fire',when:{lockedBy:'coup/armory'},speaker:'사마의',text:'영녕궁 앞길에 불을 지르려 한다. 다음 턴이면 불길이다. 돌아서라도 들어간다.'},
  ],
  'S3-05':[
    {id:'open-1',when:{turn:1},speaker:'사마소',text:'먼저 흥세 앞 요새를 차지한다. 그 다음은 조상 대장군을 지켜봐야 한다.'},
    {id:'push',when:{lockedBy:'luogu/taken'},speaker:'조상',text:'요새를 얻었다! 더 들어간다, 북서쪽 끝까지 밀어붙여라!'},
    {id:'clue',when:{lockedBy:'luogu/clue'},speaker:'사마소',text:'벼랑 위에 깃발이 보입니다. 다음 턴이면 복병이 내려옵니다!'},
    {id:'turn',when:{lockedBy:'luogu/ambush'},speaker:'사마소',text:'대장군을 모시고 동남쪽 출구로 물러납니다! 친위는 대장군 곁을 떠나지 마라!'},
  ],
  'S3-04':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'공병은 가교 터로. 방패 호위병은 상하좌우로 붙어라. 대각선은 지키지 못한다.'},
    {id:'open-2',when:{turn:1},speaker:'사마소',text:'건너편 노병의 관통 사격은 방패를 무시합니다. 먼저 쏘아 떨어뜨려야 합니다.'},
    {id:'boat',when:{turn:3},speaker:'사마사',text:'강 동쪽에서 오군 기습선이 옵니다!'},
    {id:'bridge',when:{lockedBy:'huancheng/bridge'},speaker:'공병',text:'다리가 놓였습니다! 건너십시오!'},
  ],
  'S3-03':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'들판은 빠르고 숲길은 안전하다. 내 곁을 떠나지 말라, 곁에 있으면 사기가 오른다.'},
    {id:'open-2',when:{turn:2},speaker:'주연',text:'사마의가 왔다고? 성이 떨어지기 전에 밀어붙여라!'},
    {id:'wave',when:{turn:4},speaker:'사마사',text:'강 쪽에서 오군이 상륙합니다!'},
    {id:'zhu',when:{retreat:'zhu_ran'},speaker:'사마의',text:'주연이 물러났다. 포위는 끝났다.'},
  ],
  'S3-02':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'포차로 성 안 군량고를 노려라. 군량고가 남아 있는 동안 연군은 기운을 되찾는다.'},
    {id:'open-2',when:{turn:2},speaker:'공손연',text:'성은 높고 군량은 넉넉하다. 사마의는 늙었다, 오래 버티지 못한다.'},
    {id:'flight',when:{lockedBy:'xiangping/flight'},speaker:'사마사',text:'공손연의 깃발이 셋입니다! 어느 것이 진짜인지 살펴야 합니다!'},
    {id:'reveal',when:{lockedBy:'xiangping/revealed'},speaker:'사마의',text:'살펴보니 둘은 깃발만 든 미끼다. 진짜를 쫓아라.'},
  ],
  'S3-01':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'양동 깃발대는 남쪽 여울로. 본대는 깃발이 선 뒤에 북쪽 여울을 건넌다.'},
    {id:'open-2',when:{turn:1},speaker:'비연',text:'사마의가 어디로 오든 이 전열은 뚫리지 않는다.'},
    {id:'feint',when:{lockedBy:'liaoshui/feint'},speaker:'비연',text:'남쪽이다! 위군의 깃발이 남쪽 여울에 섰다! 전열을 남쪽으로!'},
    {id:'collapse',when:{lockedBy:'liaoshui/collapse'},speaker:'사마사',text:'북쪽이 비었습니다! 연군의 진형이 무너집니다!'},
    {id:'reserve',when:{turn:5},speaker:'사마사',text:'동쪽에서 양평의 원군이 옵니다!'},
  ],
  'S2-14':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'물러나는 촉군을 쫓는다. 너무 깊이 들어가지는 마라.'},
    {id:'open-2',when:{turn:2},speaker:'곽회',text:'서쪽 길 끝이 촉의 퇴로입니다. 빠져나가기 전에 붙잡아야 합니다.'},
    {id:'banner',when:{lockedBy:'wuzhang/banner'},speaker:'강유',text:'승상께서 여기 계시다! 위군은 물러가라!'},
    {id:'calm',when:{lockedBy:'wuzhang/banner'},speaker:'곽회',text:'병사들이 흩어집니다! 구급약으로 진정시키며 동쪽으로 물러나십시오!'},
  ],
  'S2-13':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'골짜기 가운데에서 사와 합류한다. 합류한 뒤 7턴을 버티면 길이 열린다. 포격 표식이 뜨면 바위 그늘로 숨어라.'},
    {id:'open-2',when:{turn:1},speaker:'사마사',text:'아버님, 북쪽 길도 막혔습니다! 가운데로 가겠습니다!'},
    {id:'joined',when:{lockedBy:'hulu/joined'},speaker:'사마의',text:'모였다. 이제 버틴다. 바위 그늘을 잃지 마라.'},
    {id:'rain',when:{lockedBy:'hulu/rain'},speaker:'사마소',text:'비입니다! 아버님, 비가 옵니다! 서쪽 목책의 불이 꺼졌습니다!'},
  ],
  'S2-12':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'가운데 여울부터 온다. 측면 증원은 예고가 뜨면 예비대를 보내라.'},
    {id:'open-2',when:{turn:1},speaker:'맹염',text:'위수만 건너면 사마의의 진영이다! 밀어붙여라!'},
    {id:'west',when:{turn:3},speaker:'곽회',text:'서쪽 여울 너머에 먼지가 입니다. 두 턴 뒤 도착합니다!'},
    {id:'east',when:{turn:6},speaker:'사마의',text:'이번에는 동쪽이다. 기병을 동쪽 여울로 돌려라.'},
    {id:'meng',when:{retreat:'meng_yan'},speaker:'곽회',text:'맹염이 물러갑니다! 가운데 여울이 비었습니다!'},
  ],
  'S2-11':[
    {id:'open-1',when:{turn:1},speaker:'장합',text:'선봉은 내가 맡겠소. 본대는 너무 떨어지지 마시오.'},
    {id:'open-2',when:{turn:2},speaker:'사마의',text:'장 장군과 떨어지면 고립된다. 본대도 서둘러라.'},
    {id:'halt',when:{lockedBy:'mumen/vanguard-halts'},speaker:'장합',text:'골짜기 어귀다. 여기서 본대를 기다리겠소. 이 골짜기, 너무 조용하오.'},
    {id:'nests',when:{lockedBy:'mumen/joined'},speaker:'곽회',text:'벼랑 위에 쇠뇌수가 있습니다! 장 장군, 피하십시오!'},
    {id:'fall',when:{lockedBy:'mumen/fall'},speaker:'사마의',text:'장합… 군을 돌려라. 동쪽으로 회군한다. 남은 병사를 지켜라.'},
  ],
  'S2-10':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'밭이 타고 있다. 불길을 뚫을지, 돌아갈지 정하라. 남쪽 골짜기는 먼저 살펴라.'},
    {id:'open-2',when:{turn:2},speaker:'고상',text:'수레를 서쪽으로! 불이 꺼지기 전에 골짜기를 빠져나간다!'},
    {id:'fire2',when:{turn:3},speaker:'곽회',text:'밭 서쪽에도 불을 질렀습니다! 길이 또 막힙니다!'},
    {id:'ambush',when:{turn:4},speaker:'곽회',text:'골짜기와 북쪽 길에서 복병이 나옵니다!'},
    {id:'down',when:{retreat:'gao_xiang'},speaker:'사마의',text:'고상이 쓰러졌다. 수레를 거두어라.'},
  ],
  'S2-09':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'강은 불어 건널 수 없다. 북쪽 산길로 돌아 성고를 친다.'},
    {id:'open-2',when:{turn:1},speaker:'대릉',text:'투석기가 쉬지 않습니다! 오래는 못 버팁니다!'},
    {id:'ambush',when:{turn:3},speaker:'곽회',text:'산길 옆 숲에서 복병이 나옵니다!'},
    {id:'relief',when:{turn:7},speaker:'대릉',text:'성고 쪽에서 촉의 기병이 내려옵니다!'},
    {id:'taken',when:{lockedBy:'chenggu/taken'},speaker:'곽회',text:'성고를 되찾았습니다! 강 건너 촉군이 흔들립니다!'},
  ],
  'S2-08':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'나는 이 능선에서 움직이지 않는다. 목책과 비탈의 궁수는 책략으로 친다.'},
    {id:'open-2',when:{turn:1},speaker:'사마사',text:'소야, 목책이 열리면 곧장 달린다. 조휴 장군의 진영까지!'},
    {id:'wave',when:{turn:5},speaker:'조휴',text:'남쪽에서 오군이 또 몰려온다! 서둘러 주시오!'},
    {id:'raid',when:{turn:5},speaker:'사마소',text:'아버님, 북쪽 능선으로 기병이 올라갑니다!'},
    {id:'lu',when:{retreat:'lu_xun'},speaker:'사마의',text:'육손이 물러났다. 길이 열렸다.'},
  ],
  'S2-07':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'위연이 관으로 빠지기 전에 잡는다. 곽 장군의 진영도 오래 버티지 못한다.'},
    {id:'open-2',when:{turn:2},speaker:'위연',text:'사마의가 왔다고? 진영은 됐다, 관으로 돌아갈 채비를 해라!'},
    {id:'guo',when:{turn:3},speaker:'곽회',text:'도독! 진영의 목책이 무너지고 있습니다!'},
    {id:'flee',when:{lockedBy:'yangping/flee'},speaker:'위연',text:'물러난다! 양평관으로!'},
    {id:'gone',when:{lockedBy:'yangping/escaped'},speaker:'사마의',text:'위연이 관을 빠져나갔다. 남은 적을 쳐서 이 싸움을 매듭짓는다.'},
    {id:'down',when:{retreat:'wei_yan'},speaker:'곽회',text:'위연이 꺾였습니다! 진영이 살았습니다!'},
  ],
  'S2-06':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'북쪽 샘 두 칸을 지키면 물이 줄어듭니다. 물이 다 떨어지면 촉군이 무너집니다.'},
    {id:'open-2',when:{turn:1},speaker:'마속',text:'높은 곳에 진을 치면 내려다보며 깨뜨린다. 병법에 그렇게 쓰여 있다!'},
    {id:'wang',when:{turn:3},speaker:'왕평',text:'장군, 물이 끊기면 끝입니다! 산을 내려가 길목을 지키십시오!'},
    {id:'water',when:{turn:4},speaker:'장합',text:'서쪽 길로 급수대가 올라온다! 샘을 내주지 마시오!'},
    {id:'collapse',when:{lockedBy:'jieting/collapse'},speaker:'장합',text:'남산의 진이 무너진다! 남쪽 출구를 막아라, 한 놈도 놓치지 마라!'},
    {id:'ma-su',when:{retreat:'ma_su'},speaker:'사마의',text:'마속이 쓰러졌다. 남은 무리를 정리하라.'},
  ],
  'S2-05':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'성문을 부숴야 맹달에게 닿는다. 충차를 앞세우고, 성벽 위 감시탑을 조심하라.'},
    {id:'open-2',when:{turn:2},speaker:'맹달',text:'사마의가 벌써 왔다고? 표가 낙양에 닿기도 전에?'},
    {id:'relief',when:{turn:4},speaker:'사마소',text:'아버님, 서쪽에서 깃발이 보입니다! 촉의 원군입니다!'},
    {id:'gate',when:{enemiesBelow:4},speaker:'사마사',text:'성 안으로 들어갑니다! 맹달을 놓치지 마십시오!'},
    {id:'meng-down',when:{retreat:'meng_da'},speaker:'사마의',text:'맹달이 꺾였다. 이제 조정에 표를 올려라.'},
  ],
  'S2-04':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'성문 앞 두 칸을 내주면 끝입니다. 여덟 턴만 버티십시오.'},
    {id:'open-2',when:{turn:1},speaker:'조진',text:'강변 상륙대는 책략을 잘 견딘다! 창과 활로 상대하라.'},
    {id:'east',when:{turn:3},speaker:'장패',text:'양양 성문은 내가 연다! 기병은 큰길로 달려라!'},
    {id:'zhang-ba',when:{turn:4},speaker:'사마의',text:'장패는 창칼에 단단합니다. 책략으로 상대하십시오.'},
    {id:'south',when:{turn:5},speaker:'조진',text:'남쪽 숲에서 셋째 물결이다! 성문 남쪽을 비우지 마라.'},
    {id:'zhuge',when:{turn:6},speaker:'제갈근',text:'양양을 얻으면 형주가 온전해진다. 끝까지 밀어붙여라.'},
  ],
  'S2-03':[
    {id:'open-1',when:{turn:1},speaker:'조진',text:'고수를 먼저 꺾는다! 의원은 다친 자를 고치고, 궁병은 결사대를 끊어라.'},
    {id:'open-2',when:{turn:1},speaker:'고수',text:'위의 황제가 여기 있다! 수레 덮개라도 베어 와라!'},
    {id:'snipe',when:{turn:2},speaker:'조진',text:'강노가 폐하를 노린다! 붉은 칸에서 모두 비켜라!'},
    {id:'ice',when:{turn:3},speaker:'조진',text:'얼음 위로 남쪽 결사대가 건너온다! 강가를 비우지 마라.'},
    {id:'gao-down',when:{retreat:'gao_shou'},speaker:'조진',text:'고수가 물러났다! 폐하, 북쪽 길로 오르십시오!'},
    {id:'sun-shao',when:{turn:5},speaker:'손소',text:'얼음 위라도 강노는 빗나가지 않는다. 다시 쏴라!'},
  ],
  'S2-02':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'붉게 표시된 칸에 번개가 떨어집니다. 다음 턴 전에 비우십시오.'},
    {id:'open-2',when:{turn:1},speaker:'조진',text:'폐하는 북서쪽 출구로! 함선은 강 위에서 적선을 막아라.'},
    {id:'landing',when:{turn:3},speaker:'여범',text:'위의 황제가 도망친다! 상륙대는 북쪽 길목을 막아라!'},
    {id:'block',when:{turn:4},speaker:'사마의',text:'상륙대가 출구를 막았습니다. 폐하보다 한 걸음 앞서 길을 여십시오.'},
    {id:'lu-fan',when:{retreat:'lu_fan'},speaker:'조진',text:'여범의 기함이 물러났다! 강 위가 조용해졌다.'},
  ],
  'S1-01':[
    {id:'open-1',when:{turn:1},speaker:'사마방',text:'창고를 내주면 마을이 굶는다. 랑아, 의를 잘 지켜라.'},
    {id:'open-2',when:{turn:1},speaker:'사마의',text:'아버님, 습격대는 세 갈래입니다. 가까운 무리부터 끊으면 나머지는 머뭇거릴 겁니다.'},
    {id:'first',when:{firstEnemyDown:true},speaker:'사마랑',text:'하나 물러났다! 의야, 피난민 쪽을 놓치지 마라.'},
    {id:'turn3',when:{turn:3},speaker:'사마방',text:'서두르지 마라. 한 칸 물러서는 것도 싸움이다.'},
    {id:'cleared',when:{enemiesBelow:1},speaker:'사마의',text:'습격대는 흩어졌다. 이제 창고와 민병을 수습하자.'},
    {id:'warehouse',when:{reach:{unit:'sima_yi',region:'warehouse'}},speaker:'사마의',text:'곡식은 지켰다… 하지만 난세는 이제 막 시작이다.'},
  ],
  'S1-07':[
    {id:'open-1',when:{turn:1},speaker:'조진',text:'중달, 양평관 앞 산길이 좁다. 기병은 큰길로, 보병은 숲길로 나눠야겠지.'},
    {id:'open-2',when:{turn:1},speaker:'사마의',text:'숲에는 오두미도의 제주가 있습니다. 주문에 홀리기 전에 책략으로 먼저 치겠습니다.'},
    {id:'yang',when:{turn:2},speaker:'양앙',text:'위군이 산을 넘었다고? 이 관문은 한 발짝도 못 넘는다!'},
    {id:'taoist',when:{retreat:'vanguard_bow'},speaker:'조진',text:'제주가 물러났다! 숲길이 열렸다.'},
    {id:'camp',when:{enemiesBelow:4},speaker:'사마의',text:'전초 진지만 남았습니다. 양앙을 끌어내면 수비망은 무너집니다.'},
    {id:'yang-down',when:{retreat:'yang_ang'},speaker:'조진',text:'양앙이 꺾였다! 남은 무리를 정리하자.'},
  ],
  'S1-08':[
    {id:'open-1',when:{turn:1},speaker:'조진',text:'우군 장수들이 먼저 성채를 차지하려 서두른다. 공을 빼앗기면 위에서 말이 많아질 걸세.'},
    {id:'open-2',when:{turn:1},speaker:'사마의',text:'공보다 길이 먼저입니다. 수비대장을 먼저 꺾어야 성채가 우리 것이 됩니다.'},
    {id:'guard',when:{turn:3},speaker:'성채 수비대장',text:'성문을 굳게 닫아라! 다가오는 놈은 반격으로 하나씩 꺾어라!'},
    {id:'ahead',when:{allyAhead:true},speaker:'조진',text:'우군이 앞서 간다! 서둘러야 하네, 중달.'},
    {id:'reinforce',when:{turn:6},speaker:'사마의',text:'북문으로 증원이 옵니다. 다리를 막고 성채로 곧장 가십시오.'},
    {id:'chief-down',when:{retreat:'zhang_lu'},speaker:'사마의',text:'수비대장이 물러났다. 지금이다, 성채로!'},
  ],
  'S2-01':[
    {id:'open-1',when:{turn:1},speaker:'조진',text:'성채 한가운데를 내주면 끝이다. 문 네 개를 나눠 지키게.'},
    {id:'open-2',when:{turn:1},speaker:'사마의',text:'무당에게는 책략을 쓰지 마십시오. 그 힘이 그대로 돌아옵니다. 궁병과 창병이 맡을 상대입니다.'},
    {id:'shaman',when:{turn:2},speaker:'반란군 무당',text:'하늘의 벌이 너희 술수를 너희에게 돌려주리라!'},
    {id:'wave',when:{turn:4},speaker:'조진',text:'동쪽에서 두 무리가 더 온다! 동문을 비우지 마라.'},
    {id:'shaman-down',when:{retreat:'rebel_shaman'},speaker:'사마의',text:'무당이 쓰러졌다. 이제 책략을 마음껏 쓰셔도 됩니다.'},
  ],
  'S1-10':[
    {id:'open-1',when:{turn:1},speaker:'사마의',text:'조운의 앞·뒤·좌·우를 모두 막아야 합니다. 강물과 바위도 벽이 됩니다.'},
    {id:'open-2',when:{turn:1},speaker:'조운',text:'상산의 조자룡이 여기 있다! 조조의 목을 내놓아라!'},
    {id:'rise',when:{turn:3},speaker:'조진',text:'강물이 둑을 넘었다! 남쪽 들판이 여울이 되어 발이 묶인다.'},
    {id:'rise-2',when:{turn:5},speaker:'사마의',text:'물이 더 차오릅니다. 들판 한가운데로는 가지 마십시오.'},
    {id:'lock',when:{lockedBy:'flood/lock'},speaker:'조진',text:'조운이 묶였다! 승상, 지금 고개로 오르십시오!'},
    {id:'exit',when:{reach:{unit:'cao_cao',region:'exit'}},speaker:'사마의',text:'승상께서 고개를 넘으셨다. 물러나라, 강물이 길을 덮는다.'},
  ],
  'S1-09':[
    {id:'open-1',when:{turn:1},speaker:'조진',text:'강변 두 칸을 두 턴 동안 지키면 부교가 선다. 공병을 앞세우게.'},
    {id:'open-2',when:{turn:1},speaker:'사마의',text:'승상은 다리가 놓일 때까지 강가에서 기다리실 겁니다. 뒤쪽 추격 기병을 먼저 막겠습니다.'},
    {id:'pursuit',when:{turn:3},speaker:'사마의',text:'남서쪽에서 추격대가 옵니다. 승상의 뒤를 비우지 마십시오.'},
    {id:'bridge',when:{reach:{unit:'cao_cao',region:'bridge_span'}},speaker:'조진',text:'부교가 섰다! 승상께서 건너신다, 길을 열어라!'},
    {id:'huang',when:{turn:5},speaker:'황충',text:'늙었다고 얕보지 마라. 이 활은 아직 정군산의 피를 기억한다!'},
    {id:'huang-down',when:{retreat:'huang_zhong'},speaker:'조진',text:'황충이 물러났다! 야곡 출구가 열렸다.'},
  ],
};

function met(state:BattleState,w:LineWhen){
  if('turn' in w)return state.turn>=w.turn&&state.currentSide==='player';
  if('retreat' in w){const u=state.find(w.retreat);return !!u&&!u.alive;}
  if('firstEnemyDown' in w)return [...state.units.values()].some(u=>u.side==='enemy'&&!u.alive);
  if('enemiesBelow' in w)return state.living('enemy').length<w.enemiesBelow&&state.turn>1;
  if('reach' in w){const u=state.find(w.reach.unit);return !!u?.alive&&state.map.regionCoords(w.reach.region).some(c=>c.x===u.pos.x&&c.y===u.pos.y);}
  if('lockedBy' in w)return state.firedEvents.has(w.lockedBy);
  const g=raceGap(state);return !!g&&g.ally!==undefined&&g.hero!==undefined&&g.ally<g.hero;
}
/** 천명의 원정: 편마다 첫 턴 한마디, 우두머리·적장 퇴각 한마디. */
const RUN_OPENING=[
  ['사마의','서두르지 마라. 가까운 적부터 하나씩 끊어 내면 된다.'],
  ['사마의','적의 머리를 노려라. 우두머리가 무너지면 나머지는 흩어진다.'],
  ['사마의','늙은 몸이라도 판은 아직 읽는다. 진형을 흐트러뜨리지 마라.'],
] as const;
for(let f=1;f<=18;f++){const [speaker,text]=RUN_OPENING[Math.min(2,Math.floor((f-1)/6))]!;
  battleLines[`R-${String(f).padStart(2,'0')}`]=[
    {id:'open',when:{turn:1},speaker,text},
    {id:'boss-down',when:{retreat:'boss'},speaker:'사마의',text:'우두머리가 물러났다. 이 길은 우리 것이다.'},
    {id:'target-down',when:{retreat:'target'},speaker:'사마의',text:'적장이 물러났다. 역사는 이제 다른 길로 흐른다.'},
  ];}
/** Lines whose moment has come and that have not been shown yet, in script order. */
export function dueLines(stageId:string,state:BattleState,seen:ReadonlySet<string>){
  return (battleLines[stageId]??[]).filter(l=>!seen.has(l.id)&&met(state,l.when));
}
