/**
 * 목표 임무(호위·구출·방어·점령)를 실제로 깰 수 있는지 — 버전 4 지도·목표·균형 규칙 그대로.
 * 예전 시험은 목표 없는 옛 지도(버전 2)로만 돌아서, 호위·구출이 막혀도 잡아내지 못했다.
 * 시험 봇은 사람이 하듯 움직인다: 호위 대상은 적을 먼저 치운 뒤 최단 경로로 걷고, 아군은 그 길과 출구를 비켜 서며,
 * 구출은 장수가 인질 곁으로 간 뒤 인질을 안전지대로 데려간다.
 */
import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {expeditions,challengePlan} from '../src/expeditions.ts';
import {trialGoals} from '../src/expedition-objectives.ts';
import {CONTROLLABLE,decide,key,manhattan,type Unit} from '../../core/src/index.ts';

type C={x:number;y:number};
const goalOf=(id:string)=>id==='convoy_trial'?'trial_goal':'trial_safe';
const parse=(k:string):C=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};};
/** 목적지까지의 실제 이동 비용(지형 반영) — 직선 거리로 고르면 강·여울 앞에서 멈춘다. */
function costField(s:Session,u:Unit,goal:C[]){const f=new Map<string,number>();for(const g of goal){for(const [k,v] of s.state.map.reachable({...u,pos:g,stats:{...u.stats,movement:999}},new Map()))f.set(k,Math.min(f.get(k)??1e9,v));f.set(key(g),0);}return f;}
function pathCells(s:Session,vip:Unit){const goal=s.state.map.regionCoords(goalOf(vip.id)),f=costField(s,vip,goal),path=new Set(goal.map(key));let cur=vip.pos;
 for(let i=0;i<80;i++){const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:cur.x+dx!,y:cur.y+dy!})).filter(c=>f.has(key(c))).sort((a,b)=>f.get(key(a))!-f.get(key(b))!)[0];if(!nb||f.get(key(nb))!>=(f.get(key(cur))??1e9))break;path.add(key(nb));cur=nb;}return path;}
function step(s:Session){
 const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();return;}
 const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.tick();return;}
 const act=(c:Parameters<Session['act']>[0])=>s.act(c);
 const wait=()=>{if(!u.hasActed&&st.outcome==='ongoing')act({kind:'wait',unit:u.id});};
 if(u.id==='convoy_trial'||u.id==='rescue_target'){
  // 호위는 길목의 적을 먼저 치운다(사람이 하듯) — 20턴이 지나면 그대로 출발한다.
  if(u.id==='convoy_trial'&&st.living('enemy').length>1&&st.turn<20)return wait();
  const f=costField(s,u,st.map.regionCoords(goalOf(u.id))),best=[...st.map.reachable(u,st.occupancy()).keys(),key(u.pos)].sort((a,b)=>(f.get(a)??1e9)-(f.get(b)??1e9))[0]!;
  if(best!==key(u.pos))act({kind:'move',unit:u.id,to:parse(best)});return wait();
 }
 const hostage=st.find('rescue_target');
 if(hostage?.side==='enemy'&&(u.id==='sima_yi'||u.id==='cao_zhen')&&manhattan(u.pos,hostage.pos)>1){
  const adj=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:hostage.pos.x+dx!,y:hostage.pos.y+dy!}));
  const to=[...st.map.reachable(u,st.occupancy()).keys(),key(u.pos)].map(parse).sort((a,b)=>Math.min(...adj.map(t=>manhattan(a,t)))-Math.min(...adj.map(t=>manhattan(b,t))))[0]!;
  if(key(to)!==key(u.pos))act({kind:'move',unit:u.id,to});
  const foe=st.living('enemy').find(e=>e.id!=='rescue_target'&&manhattan(e.pos,u.pos)>=u.range[0]&&manhattan(e.pos,u.pos)<=u.range[1]);
  if(foe&&!u.hasActed)act({kind:'attack',unit:u.id,target:foe.id});return wait();
 }
 // 구출 대상 곁은 사마의·조진의 자리다: 지원 부대가 그 칸을 막고 있으면 비켜 선다(사람이 하듯).
 if(hostage?.side==='enemy'&&u.id!=='sima_yi'&&u.id!=='cao_zhen'&&manhattan(u.pos,hostage.pos)===1){const off=[...st.map.reachable(u,st.occupancy()).keys()].map(parse).filter(c=>manhattan(c,hostage.pos)>1).sort((a,b)=>manhattan(a,u.pos)-manhattan(b,u.pos))[0];if(off){act({kind:'move',unit:u.id,to:off});return wait();}}
 const vip=st.find('convoy_trial')??(hostage?.side==='ally'?hostage:undefined);
 if(vip&&vip.side!=='enemy'){const path=pathCells(s,vip);if(path.has(key(u.pos))){const off=[...st.map.reachable(u,st.occupancy()).keys()].filter(k=>!path.has(k)).map(parse).sort((a,b)=>manhattan(a,u.pos)-manhattan(b,u.pos))[0];if(off){act({kind:'move',unit:u.id,to:off});return wait();}}}
 if(u.hp<u.stats.maxHp*.5&&u.canUseItems&&s.medicine){act({kind:'item',unit:u.id,item:'medicine'});return;}
 if(u.unitClass==='fengshui'&&u.mp>=8){const t=st.living().filter(t=>t.side!=='enemy'&&t.hp<t.stats.maxHp-20&&manhattan(t.pos,u.pos)<=3).sort((a,b)=>a.hp/a.stats.maxHp-b.hp/b.stats.maxHp)[0];if(t){act({kind:'item',unit:u.id,item:'heal',target:t.id});return;}}
 for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;if(cmd.kind==='attack'&&cmd.target==='rescue_target')continue;if(!act(cmd).ok||st.outcome!=='ongoing')break;}
 wait();
}
function mission(id:string,level:number,seed:number,revision=4){const d=deployment(freshCampaign(),true);for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,level);
 d.mission={id,runId:'objective-'+id,version:4,balance:1,supportClasses:['infantry','fengshui']};return new Session(7,'normal',seed,'survival',revision as 4|6,d);}
const winsAt=(id:string,level:number,revision=4)=>[215,7].some(seed=>{const s=mission(id,level,seed,revision);for(let i=0;i<5000&&s.state.outcome==='ongoing';i++)step(s);return s.state.outcome==='victory';});

describe('목표 임무는 실제로 깰 수 있다(버전 4 목표·지도)',()=>{
 // 수련·보물 인연·보물 사냥: 권장 레벨 +3 안에서 이긴다(시험 봇은 보물·연구 없이 사람보다 서툴다).
 it.each(expeditions.filter(m=>m.kind!=='challenge'&&trialGoals[m.id]!.kind!=='annihilate').map(m=>[m.id,trialGoals[m.id]!.kind,m.level] as const))('%s (%s) Lv.%i',(id,_kind,level)=>{
  expect(winsAt(id,level)||winsAt(id,level+3),id).toBe(true);
 });
});

describe('도전 사다리에 절벽이 없다',()=>{
 // 9·10단계 물결이 철기·저격병 여섯으로 사마의만 노려 레벨 +20이 필요하던 절벽의 재발 방지.
 // 시험 봇 기준: 보통 단계는 권장 +6, 수문장 단계(5·10)는 +12 안에서 깬다.
 it.each(expeditions.filter(m=>m.kind==='challenge').map(m=>[m.id,m.level,m.step!] as const))('%s Lv.%i',(id,level,step)=>{
  expect(winsAt(id,level+(challengePlan(step).boss?12:6)),id).toBe(true);
 });
});

describe('규칙판 6(비율 피해)에서도 모든 외전을 권장 레벨에서 깬다',()=>{
 // 보물·연구 없이 권장 레벨 그대로. 도전 단계와 약한 외전은 missionEdges6으로 맞췄다(시험 봇 20판 기준 수련·퀘스트·사냥 90%, 도전 80% 이상).
 it.each(expeditions.map(m=>[m.id,m.kind,m.level] as const))('%s (%s) Lv.%i',(id,_kind,level)=>{
  expect(winsAt(id,level,6),id).toBe(true);
 });
});
