import type {StageDef,MapFile,BattleState} from '../../core/src/index.ts';
export type TrialObjective='annihilate'|'capture'|'escort'|'rescue'|'defend';
export interface TrialGoal {kind:TrialObjective;name:string;targetName?:string;turns?:number}
export const trialGoals:Record<string,TrialGoal>={
 T01:{kind:'annihilate',name:'기초 섬멸'},T02:{kind:'rescue',name:'보급대 구출',targetName:'고립된 보급병'},T03:{kind:'defend',name:'본영 방어',turns:5},T04:{kind:'escort',name:'교량 수송',targetName:'교량 수송대'},T05:{kind:'capture',name:'진형 돌파'},T06:{kind:'defend',name:'파상 공세 방어',turns:7},T07:{kind:'annihilate',name:'수채 소탕'},
 Q01:{kind:'escort',name:'무구 수레 호위',targetName:'무구 수레'},Q02:{kind:'capture',name:'군수고 점령'},Q03:{kind:'rescue',name:'장인 구출',targetName:'붙잡힌 장인'},Q04:{kind:'capture',name:'사격 진지 확보'},Q05:{kind:'defend',name:'병서 보관소 방어',turns:6},Q06:{kind:'rescue',name:'군마 회수',targetName:'군마 관리인'},Q07:{kind:'annihilate',name:'부대 연계 시험'},Q08:{kind:'escort',name:'상인 호위',targetName:'피난 상인'},Q09:{kind:'rescue',name:'의원 구출',targetName:'억류된 의원'},Q10:{kind:'capture',name:'팔진 중심 점령'},Q11:{kind:'defend',name:'기록 보관소 방어',turns:7},
 R01:{kind:'annihilate',name:'소굴 소탕'},R02:{kind:'escort',name:'군량 수레 호위',targetName:'군량 수레'},R03:{kind:'defend',name:'봉화대 수비',turns:5},R04:{kind:'capture',name:'기병 진지 점령'},R05:{kind:'rescue',name:'길잡이 구출',targetName:'붙잡힌 길잡이'},
 ...Object.fromEntries(Array.from({length:10},(_,i)=>['C'+String(i+1).padStart(2,'0'),{kind:'annihilate' as const,name:'도전 '+(i+1)+'단계'+(i===4||i===9?' · 수문장':'')}])),
};
export function trialGoalText(id:string){const g=trialGoals[id];if(!g)return '적 전멸';switch(g.kind){
 case 'annihilate':return '적 전멸 · 사마의와 조진 생존';
 case 'capture':return '사마의 또는 조진이 동쪽 금빛 거점에서 거점 확보 명령 · 적 전멸 불필요';
 case 'escort':return g.targetName+'를 편입 아군 차례에 직접 조작해 동쪽 출구까지 호위 · 대상 퇴각 시 실패';
 case 'rescue':return '사마의 또는 조진을 '+g.targetName+' 옆에 이동해 구출 → 편입 아군 차례에 서쪽 안전지대로 이동 · 구출 대상 공격 금지';
 case 'defend':return g.turns+'턴 동안 서쪽 거점 방어 · 적 1부대라도 거점 도달 시 실패 · 3·5턴 증원';
}}
export function configureTrialGoal(stage:StageDef,map:MapFile,level:number){
 const g=trialGoals[stage.id]!;const w=map.rows[0]!.length;map.regions??={};stage.events??=[];
 // Hand-drawn maps carry their own goal, safe zone, defence line and entry points.
 map.regions.trial_goal??=[{x:w-2,y:4}];map.regions.trial_safe??=[{x:1,y:4},{x:1,y:5}];map.regions.trial_defense??=[{x:3,y:4},{x:3,y:5}];
 map.regions.trial_reinforcements??=[{x:w-2,y:4},{x:w-2,y:5},{x:w-3,y:4},{x:w-3,y:5}];
 const first=(name:string,fallback:{x:number;y:number})=>{const r=map.regions?.[name];return Array.isArray(r)&&r[0]?r[0]:fallback;};
 stage.synopsis=trialGoalText(stage.id)!;stage.victory=[{type:'annihilate',side:'enemy'}];
 stage.defeat=[{type:'retreat',unit:'sima_yi'},{type:'retreat',unit:'cao_zhen'}];
 stage.seals=[{slot:1,normal:'clear',extreme:'clear'},{slot:2,normal:'no_player_losses',extreme:'no_player_losses'},{slot:3,normal:'turn_limit:20',extreme:'turn_limit:18'}];
 const actions=stage.events[0]!.actions;actions.find(a=>a.type==='set_phase')!.phase=g.name;
 if(g.kind==='capture')stage.victory=[{type:'capture',target:'trial_goal',by:'player'}];
 if(g.kind==='escort'||g.kind==='rescue'){
  const rescue=g.kind==='rescue',id=rescue?'rescue_target':'convoy_trial';
  actions.push({type:'spawn_units',side:rescue?'enemy':'ally',units:[{id,name:g.targetName!,template:'civilian',level,at:rescue?first('rescue',{x:w-4,y:7}):first('convoy',{x:3,y:5}),behavior:'passive'}]});
  stage.victory=[{type:'reach',unit:id,target:rescue?'trial_safe':'trial_goal'}];stage.defeat.push({type:'retreat',unit:id});
  if(rescue)for(const hero of ['sima_yi','cao_zhen'])stage.events.push({id:stage.id+'/rescue/'+hero,phase:g.name,trigger:{type:'units_adjacent',unitA:hero,unitB:id},actions:[{type:'grant_control',targets:[id]},{type:'recover_units',targets:[id]},{type:'set_phase',phase:g.targetName+' 구출 · 서쪽 안전지대로'}]});
 }
 if(g.kind==='defend'){
  stage.victory=[{type:'survive_turns',target:'trial_defense',n:g.turns!}];
  const initial=actions.find(a=>a.type==='spawn_units')!.units!;
  for(const u of initial){u.behavior='advance';u.goalRegion='trial_defense';stage.defeat.push({type:'reach',unit:u.id!,target:'trial_defense'});}
  for(const turn of [3,5]){const id='trial_wave_'+turn;stage.defeat.push({type:'reach',unit:id,target:'trial_defense'});stage.events.push({id:stage.id+'/wave/'+turn,trigger:{type:'turn_start',turn,side:'enemy'},actions:[{type:'spawn_units',side:'enemy',units:[{id,name:'거점 돌격대',template:turn===3?'infantry':'cavalry',level,region:'trial_reinforcements',behavior:'advance',goalRegion:'trial_defense'}]}]});}
 }
}
export function trialProgress(state:BattleState){const g=trialGoals[state.stage.id];if(!g)return '';if(g.kind==='defend')return '방어 '+Math.min(state.turn-1,g.turns!)+'/'+g.turns+'턴 · 적의 서쪽 거점 진입 저지';if(g.kind==='rescue')return state.find('rescue_target')?.side==='ally'?'구출 완료 · 대상 부대를 서쪽 안전지대로 이동':'사마의·조진을 구출 대상 옆으로 이동 · 대상 공격 금지';if(g.kind==='escort')return '수송 대상 HP '+(state.find('convoy_trial')?.hp??0)+' · 직접 조작해 동쪽 출구로';return g.kind==='capture'?'사마의·조진으로 동쪽 거점 확보':'남은 적 '+state.living('enemy').length+'부대';}
