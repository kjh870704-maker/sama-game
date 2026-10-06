import type {MapFile,UnitClass,Coord} from '../../core/src/index.ts';

/** Hand-drawn expedition maps modelled on real Three Kingdoms terrain. Each map
 * keeps terrain and markings in two aligned grids: terrain letters go to the
 * legend, marks become regions (starts, enemy posts, goals and reinforcements). */
export interface TrialLayout {key:string;name:string;place:string;tactics:string;templates:UnitClass[];names:string[];terrain:string[];marks:string[]}
export const TRIAL_LEGEND:MapFile['legend']={'.':'plain',',':'road',':':'plain',f:'forest',h:'hill','^':'mountain',X:'cliff',w:'water',r:'rapids',b:'bridge',m:'marsh',p:'plank','~':'ford',F:'fort','#':'wall',g:'gate'};
export const trialLayouts:Record<string,TrialLayout>={
 field:{key:'field',name:'관도 들판',place:'관도 · 오소 들판',tactics:'관도 들판은 개울이 남북으로 갈라 놓습니다. 여울목(이동 3)은 느리니 남쪽 나무다리로 기병을 우회시키고, 언덕 위 궁병은 숲을 끼고 접근하십시오.',templates:["spearman", "archer", "infantry", "cavalry"],names:["나루 창병대", "언덕 궁병대", "마을 수비대", "남쪽 유격 기병"],
  terrain:["^^hh..ff...w..ff.^","^h....fff..w.hhh.^","h...,,,,f..m.hhh..","...,,..,,..w..,,,.","..,,....,,.w.,,..f",",,,......,,~,,...f","......::..mw....ff","..ff..::...w..,,,.",".fff.......w.,,...","..f...,,,,,b,,..hh","....,,,...mw....h^","^^.,,.....mw..ff^^"],
  marks:["..................","..............b...","..................",".S..............GR","................KR",".1D.........a.....",".1D...........J...",".C...............R",".............c...R","..................","....22.........d..",".................."]},
 forest:{key:'forest',name:'박망파 갈대숲',place:'박망파 · 갈대와 숲길',tactics:'박망파는 갈대늪(은폐 회피 +15)과 빽빽한 숲길이 얽힌 곳입니다. 중기병과 공성 병기는 갈대에 들어갈 수 없으니 숲길로 산적·궁병을 몰아내십시오.',templates:["bandit", "archer", "spearman", "infantry"],names:["숲속 복병", "갈대숲 궁병", "숲길 창병", "보급로 수비대"],
  terrain:["ffffff^^ffffffffff","ff..ffff^fff..ffff","f....ff..,,,,..fff","..mm..,,,..f.,,.ff",",,,mm,,.ffff..,,,.","..mmm..fffffff..,,","..mm..fff...ff...,",".....fff..m..ff..,","ff..ffff.mmm..ff..","ff..fff..mm...fff.","fff.ff..mm..fffff.","ffffff^^ffffffffff"],
  marks:["..................","..2...............",".2.......b........","..................","1.............a.GR","1D...........J..KR",".D................",".S......c........R","..................","..C........d......","..................",".................."]},
 river:{key:'river',name:'장판교',place:'장판파 · 다리 하나를 지키는 강',tactics:'장판교는 다리 두 개만 강을 건넙니다. 동쪽 벼랑(절벽, 통행 불가) 위 노병을 조심하고, 다리목을 막는 창병부터 무너뜨리십시오.',templates:["spearman", "crossbow", "infantry", "cavalry"],names:["교두보 창병", "벼랑 위 노병", "강변 수비대", "장판 기병"],
  terrain:["..hh.....mwwXX^^^^",".hhh....mwwXXX.^^^","..h..,,,,bb,,,,..^","...,,...mwwXX.,,..","..,,..ff.ww~XX..,,",",,,..fff.ww~..,,..",".....ff..wwXX,,...","...::....mwX,,..hh","...::...mwwX,...hh","..,,,,,,,bb,,,,,,,","..f.....mwwXX^^...",".ff....mmwwXX^^^.."],
  marks:[".2................","2.................","............a.....","................GR","...............K..","1D................","1D...........b....",".S.C..............","............c.J...","..................","................dR",".................R"]},
 ford:{key:'ford',name:'한수 여울',place:'한수 · 모래톱과 여울목',tactics:'한수는 모래톱 사이 여울목(이동 3)으로만 건널 수 있습니다. 기병은 여울을 빨리 건너니(이동 2) 상류 기병을 견제하고, 보병은 북쪽 여울목에 모으십시오.',templates:["infantry", "archer", "spearman", "cavalry"],names:["여울목 수비대", "모래톱 궁병", "강안 창병", "상류 기병"],
  terrain:["..ff..mwwwwwwm..hh",".ff..mww..wwwm..h.","....mwww..wwwmm...",",,,,~~~~,,~~~~,,,,","...mwwwww.wwwwm...","..mwwwhhwwwwwwm.ff","..mwwwhhwww~~~,,ff","..mwwwwwwwwwwm.,..","...mww..wwww~~,,..",",,,~~~..~~~~m...hh","...mwwwwwwwwm...hh","..mmwwwwwwwwmm..^^"],
  marks:["..................","..................",".2...........J....","1...............GR","1D.............aK.",".D................",".S..........b.....",".C................","..................","2.............c..R","................d.",".................."]},
 pass:{key:'pass',name:'양평관 산길',place:'양평관 · 굽이진 관문 산길',tactics:'양평관 산길은 산지가 겹겹이 막혀 굽이진 길로만 지납니다. 중기병은 산지에 들어갈 수 없고 기병도 산지 한 칸이 한계이니 길을 따라 관문으로 오르십시오.',templates:["spearman", "archer", "infantry", "cavalry"],names:["관문 창병", "능선 궁병", "산길 수비대", "골짜기 기병"],
  terrain:["^^^^^^^hhh^^^^^^^^","^^..hh^^h,,,hh^^^^","^..,,,hhh,.,,hhh^^","..,,.,,h^^..,,.hh^",".,,..^^,^^^..,,..^",",,..^^^,,^^^^.,,,,","..^^^..,.^^...hh,.",".^^...,,..^..hhh,.","^^..,,..,,..^^..,.","^..,,..^^,,..^^.,.","^^,,..^^^^,,,,,,,.","^^^^^^^^^^^^^^^^^^"],
  marks:["..................","...............J..","...........b......","..................","..................","1D..............GR","1D..........a...K.",".S................",".C2.....c.........",".2................","................dR",".................."]},
 gorge:{key:'gorge',name:'검각 잔도',place:'검각 · 벼랑 사이 잔도 협곡',tactics:'검각은 양쪽이 절벽인 협곡입니다. 위아래 잔도(이동 2, 노출 회피 −10)와 가운데 협곡길 셋뿐이니 좁은 길목에 방패를 세우고 벼랑 노병을 먼저 치십시오.',templates:["spearman", "crossbow", "infantry", "bandit"],names:["잔도 창병", "벼랑 노병", "협곡 수비대", "산채 산적"],
  terrain:["XXXXXXXXXXXXXXXXXX","XX....XXXX^^hhXXXX","X..,,,,ppppp,,.XXX","..,,XX.XXXXXX,,.XX",",,,XXX.XXXXXXX,,.X","..XXXX.,,,,,,,,,,,","..XXX..XXXXXX.XXX.",".,,XX.XXXXXXX..XX.","..,.,,,,,ppppp,,..",".....XXXXXXXXX..hh","..hh.XXXXXXXXX.hhh","XXXXXXXXXXXXXXXXXX"],
  marks:["..................","..2...............",".2........b.......","..................","..................","1D..........a...GR","1D...............K","..............J...",".S......c.........",".C................","...............d.R",".................."]},
 court:{key:'court',name:'허창 궁궐 앞뜰',place:'허창 · 궁궐 회랑과 연못',tactics:'허창 궁궐 앞뜰은 연못과 회랑이 길을 나눕니다. 가운데 어도는 넓지만 노출되니 연못 다리 양쪽으로 갈라 들어가십시오.',templates:["infantry", "spearman", "archer", "cavalry"],names:["회랑 수비대", "궁문 창병", "누각 궁병", "어림 기병"],
  terrain:["ffff..FFFFFF..ffff","f..,,,FFFFFF,,,..f","..,,..F,,,,F..,,..",".,,.ww..,,..ww.,,.",",,..wwbb,,bbww..,,",",,,,,,,,,,,,,,,,,,","....ww..,,..ww....",".ff.ww..,,..ww.ff.",".ff....FFFFF...ff.","...,,,,FFFFF,,,,..","ff.,..........,.ff","ffff..........ffff"],
  marks:["..................","...........b......","..................","..2...............","2.................","1D.........a....GR","1D..............K.",".S................",".C.......c....J...","..................","..............d..R",".................."]},
 fort:{key:'fort',name:'신성 군수고',place:'신성 · 해자와 군수고 성채',tactics:'신성 군수고는 해자와 성벽으로 둘러싸였습니다. 해자 다리 앞 성문을 충차로 부수고, 북쪽 성벽 감시탑은 포차로 견제하십시오.',templates:["infantry", "spearman", "archer", "cavalry"],names:["성 앞 수비대", "해자 창병", "성벽 궁병", "성내 기병"],
  terrain:["..hh....wwwwwwwwww",".hhh...w##########","..h...ww#FFFFFFFF#",",,,,..w.#FF,,,FFF#","..,,,,b,g,,,,,,,F#","..f...w.#,,,,,,FF#",".ff...w.#FF,,FFFF#","..f...ww#FFFFFFFF#","...,,..w##########","..,,....wwwwwwwwww",",,,..ff...........","....ff....hh...hh."],
  marks:["..................","..................","..................","..................","1D.....a........G.","1D...........c..K.",".S..............J.",".C.......d........","..................","..................",".22..........b.RRR",".................R"]},
 naval:{key:'naval',name:'적벽',place:'적벽 · 붉은 벼랑과 삼협 급류',tactics:'적벽 북안은 붉은 절벽이라 상륙할 수 없습니다. 서쪽 삼협 급류(수군 이동 3)는 피하고 갈대 여울로 돌아 적선을 치며, 육군은 동쪽 갈대밭을 따라 강안 궁병에게 가십시오.',templates:["navy", "navy", "archer", "navy"],names:["적 몽충", "적 투함", "벼랑 궁병", "적 주가"],
  terrain:["XXXXXXXX^^XXXXhhhh","rrrrwwwwXXwwwwww,,","rrrwwwwwwwwwwwww,,","rrwwwwwwwwwwwwwwF.","mmwwwwwmmwwwwwww,.","mmwwwww..wwwwwwwmm","..mwwww..wwwwwwwmm","..mmwwwwwwwwwwww..","....mwwwwwwwwwwm..",".,,..mmwwwwwmmm...",",,..ff..mmwwm..ff.","...ff........,,,ff"],
  marks:["..................","..................","..........a.....c.",".................K","...........b......","..................",".....3...........d","....3.............","1D................","1D..........J...GR","2S...............R","2C..............RR"]},
};

const MARK_REGIONS:Record<string,string>={S:'trial_safe',D:'trial_defense',R:'trial_reinforcements',G:'trial_goal',K:'camp',J:'rescue',C:'convoy'};
/** Build the map file: heroes ('1') are placed first, then supports ('2'), then boats ('3'). */
export function layoutMap(layout:TrialLayout,id:string,name:string):{map:MapFile;enemies:Coord[]}{
  const regions:Record<string,Coord[]>={},cells=(c:string)=>{const out:Coord[]=[];layout.marks.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch===c)out.push({x,y});}));return out;};
  regions.player_start=[...cells('1'),...cells('2'),...cells('3')];regions.ally_start=cells('2');
  for(const [mark,region] of Object.entries(MARK_REGIONS)){const at=cells(mark);if(at.length)regions[region]=at;}
  const fields=cells(':');layout.terrain.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch===':')fields.push({x,y});}));if(fields.length)regions.fields=fields;
  const enemies=['a','b','c','d'].map(k=>cells(k)[0]!);
  return {map:{id:'trial-'+id,name,legend:TRIAL_LEGEND,rows:[...layout.terrain],regions},enemies};
}
