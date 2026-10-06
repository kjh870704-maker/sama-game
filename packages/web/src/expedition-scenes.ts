import type {MapFile} from '../../core/src/index.ts';
import {trialLayouts,layoutMap,type TrialLayout} from './expedition-maps-data.ts';

export type TrialLandscape='field'|'forest'|'river'|'pass'|'court'|'fort'|'naval';
const landscapes:Record<string,TrialLandscape>={T01:'field',T02:'forest',T03:'court',T04:'river',T05:'pass',T06:'court',Q01:'river',Q02:'fort',Q03:'pass',Q04:'forest',Q05:'court',Q06:'pass',Q07:'field',Q08:'river',Q09:'forest',Q10:'court',Q11:'pass',T07:'naval',R01:'pass',R02:'field',R03:'court',R04:'pass',R05:'forest',C01:'field',C02:'forest',C03:'river',C04:'pass',C05:'fort',C06:'court',C07:'pass',C08:'river',C09:'forest',C10:'fort'};
export const landscapeNames:Record<TrialLandscape,string>={field:'연무 들판',forest:'숲속 보급로',river:'강변 교량',pass:'산악 협로',court:'사당 앞뜰',fort:'군수고 성문',naval:'장강 수채'};
export function expeditionLandscape(id:string){return landscapes[id]??'field';}
/** Which hand-drawn map an expedition uses from mission version 4 on. */
const layoutKeys:Record<string,string>={T01:'field',Q07:'field',T02:'forest',Q04:'forest',Q09:'forest',T04:'river',Q01:'river',Q08:'ford',T05:'pass',Q06:'pass',Q03:'gorge',Q11:'gorge',T03:'court',T06:'court',Q05:'court',Q10:'court',Q02:'fort',T07:'naval',R01:'gorge',R02:'field',R03:'court',R04:'pass',R05:'forest',C01:'field',C02:'forest',C03:'river',C04:'pass',C05:'fort',C06:'court',C07:'gorge',C08:'ford',C09:'forest',C10:'fort'};
export function trialLayout(id:string):TrialLayout{return trialLayouts[layoutKeys[id]??'field']!;}
export function layoutName(id:string){return trialLayout(id).name;}
export function trialMap(id:string,name:string,version=4):MapFile{
 if(version>=4)return layoutMap(trialLayout(id),id,name).map;
 return legacyTrialMap(id,name);
}
/** Mission versions 2–3 keep their original straight maps so saved battles replay. */
export function legacyTrialMap(id:string,name:string):MapFile{
 const kind=expeditionLandscape(id);if(kind==='naval')return navalMap(id,name);
 const width=kind==='pass'?18:kind==='field'?12:16,height=kind==='field'?10:12;
 const rows=Array.from({length:height},()=>Array<string>(width).fill('.'));
 for(let x=0;x<width;x++){rows[4]![x]=',';rows[5]![x]=',';}
 for(let y=1;y<height-1;y++)for(let x=4;x<width-3;x++){
  if(y===4||y===5)continue;
  if(kind==='forest'&&(x+y)%4!==0)rows[y]![x]='f';
  if(kind==='pass'&&(y<3||y>7))rows[y]![x]='h';
  if(kind==='court'&&x>6&&y>2&&y<9)rows[y]![x]='F';
 }
 if(kind==='river')for(let y=0;y<height;y++)for(const x of [6,7])rows[y]![x]=y===4||y===5?'b':'w';
 if(kind==='fort')for(let y=0;y<height;y++)rows[y]![width-5]=y===4||y===5?'g':'#';
 return {id:'trial-'+id,name,legend:{'.':'plain',',':'road',f:'forest',h:'hill',F:'fort',w:'water',b:'bridge','#':'wall',g:'gate'},rows:rows.map(r=>r.join('')),regions:{player_start:[{x:1,y:4},{x:1,y:5},{x:2,y:3},{x:2,y:6},{x:1,y:6},{x:1,y:3}],ally_start:[{x:2,y:3},{x:2,y:6},{x:1,y:6},{x:1,y:3}],camp:[{x:width-2,y:5}]}};
}
export function trialTactics(id:string){return trialLayout(id).tactics;}
export function legacyTrialTactics(id:string){return ({field:'넓은 길에서 보병과 기병을 함께 전진시키십시오.',forest:'숲을 엄폐물로 삼아 궁병의 사격에 접근하십시오.',river:'두 칸의 다리를 확보하고 후열 책사를 보호하십시오.',pass:'중앙 협로에 방패를 세우고 구릉에서 측면을 지원하십시오.',court:'사당 앞뜰의 수비대를 교란하고 회복 책략으로 전열을 유지하십시오.',fort:'충차로 성문과 감시탑을 파괴한 뒤 군수고 수비대를 격퇴하십시오.',naval:'수군 두 척으로 강 위의 적선을 묶고, 육군은 남쪽 부교를 건너 강안 궁병을 치십시오.'} as const)[expeditionLandscape(id)];}
export function trialStory(id:string,name:string,art:number,lines:string[]){const kind=expeditionLandscape(id);return [
 {place:'군의 · 의뢰를 받다',art,line:lines[0]!},
 {place:layoutName(id)+' · 정찰',art:kind==='river'||kind==='naval'?3:kind==='forest'||kind==='pass'?11:kind==='fort'?2:6,line:'조진: '+trialTactics(id)},
 {place:name+' · 출진의 결의',art:17,line:lines[1]!},
 ];}
/** River-fortress battle: two water lanes split by islands, a pontoon bridge in the
 * south for the land army, and the enemy shore camp on the east bank. */
export function navalMap(id:string,name:string):MapFile{
 const width=18,height=12,rows=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x):string=>x<=2||x>=15?(y===4||y===5?',':'.'):'w'));
 for(let x=3;x<=14;x++)rows[10]![x]='b';
 for(const [x,y] of [[7,2],[8,2],[7,3],[8,3]] as const)rows[y]![x]='f';
 for(const [x,y] of [[10,6],[11,6],[10,7]] as const)rows[y]![x]='h';
 for(const [x,y] of [[12,0],[13,0],[12,1],[13,1]] as const)rows[y]![x]='r';
 rows[4]![16]='F';rows[5]![16]='F';
 return {id:'trial-'+id,name,legend:{'.':'plain',',':'road',f:'forest',h:'hill',F:'fort',w:'water',r:'rapids',b:'bridge'},rows:rows.map(r=>r.join('')),
  regions:{player_start:[{x:1,y:4},{x:1,y:5},{x:2,y:3},{x:2,y:6},{x:3,y:4},{x:3,y:5},{x:3,y:3},{x:3,y:6}],ally_start:[{x:2,y:3},{x:2,y:6},{x:1,y:6},{x:1,y:3}],camp:[{x:width-2,y:5}],naval_lane:[{x:4,y:4},{x:4,y:5}]}};
}
export const navalEnemies=[
 {template:'navy',name:'적 몽충',at:{x:13,y:3}},
 {template:'navy',name:'적 투함',at:{x:13,y:6}},
 {template:'archer',name:'강안 궁병',at:{x:15,y:2}},
 {template:'navy',name:'적 주가',at:{x:12,y:8}},
] as const;
