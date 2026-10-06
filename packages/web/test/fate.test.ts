import {describe,it,expect} from 'vitest';
import {newRun,floorChoices,chooseFate,nextStory,nextTale,regionFor,runBattle,battleRef,finishBattle,mandateEarned,grantXp,recruit,RUN_FLOORS} from '../src/roguelike.ts';
import {ROUTES,routesFor,routeById,endingFor,ALL_ENDINGS,FATE_POINTS,type Route} from '../src/fate.ts';
import {freshMeta,settleRun,readMeta} from '../src/meta.ts';
import {romanceOf} from '../src/romance.ts';
import {Session} from '../src/session.ts';
import {RUN_CHAPTER} from '../src/run-ui.ts';
import {validateStage,CONTROLLABLE,decide,key} from '../../core/src/index.ts';

/** 이 길에 이르는 선택의 사슬(상편 → 중편 → 하편). */
function chain(r:Route):{1?:string;2?:string;3?:string}{
  if(r.act===1)return {1:r.id};
  const parent=routeById(r.after![0])!;return {...chain(parent),[r.act]:r.id};
}
const fresh=()=>newRun(91,['infantry','archer','cavalry']);
const at=(floor:number,route:{1?:string;2?:string;3?:string})=>{const r=fresh();r.floor=floor;r.route={...route};return r;};

describe('운명의 갈림길 · 시나리오 나무',()=>{
 it('opens every act with a fate point, staged by what came before',()=>{
  expect(floorChoices(fresh())[0]!.label).toBe('운명의 갈림길 · 조조의 출사 요청');
  expect(floorChoices(at(7,{1:'refuse'}))[0]!.detail).toBe(FATE_POINTS[2].prompt);
  expect(floorChoices(at(7,{1:'serve'}))[0]!.label).toBe('운명의 갈림길 · 적벽 전야');
  expect(floorChoices(at(7,{1:'yuan'}))[0]!.label).toBe('운명의 갈림길 · 원소의 죽음');
  expect(floorChoices(at(13,{1:'refuse',2:'shu'}))[0]!.label).toBe('운명의 갈림길 · 출사표');
  expect(floorChoices(at(13,{1:'refuse',2:'wei'}))[0]!.detail).toBe(FATE_POINTS[3].prompt);
 });
 it('never leads a what-if back to history: once off history, every later choice is a what-if',()=>{
  for(const r of ROUTES.filter(x=>!x.history)){
   const next=r.act<3?routesFor((r.act+1) as 2|3,chain(r),!!r.custom):[];
   if(r.act<3)expect(next.length,r.id).toBeGreaterThanOrEqual(2);
   for(const n of next)expect(n.history,`${r.id} → ${n.id}`).toBe(false);
  }
  expect(routesFor(2,{1:'refuse'}).map(r=>r.id)).toEqual(['wei','cao_zhi','shu']);
  expect(routesFor(3,{1:'refuse',2:'wei'}).map(r=>r.id)).toEqual(['patience','coup','unify']);
  const run=at(7,{1:'serve'});expect(chooseFate(run,'wei')).toBe(false);expect(chooseFate(run,'cao_zhi')).toBe(false);expect(chooseFate(run,'chibi')).toBe(true);
  run.floor=13;expect(chooseFate(run,'patience')).toBe(false);expect(chooseFate(run,'chibi_shu')).toBe(true);
  expect(run.route).toEqual({1:'serve',2:'chibi',3:'chibi_shu'});
 });
 it('gives every what-if route its own region, boss and tales, and keeps history on the story battles',()=>{
  expect(nextStory(at(8,{1:'refuse',2:'wei'}))).toBe('S2-01');expect(nextStory(at(14,{1:'refuse',2:'wei',3:'patience'}))).toBe('S3-01');
  for(const r of ROUTES.filter(x=>!x.history)){
   const run=at((r.act-1)*6+2,chain(r));
   expect(nextStory(run),r.id).toBeUndefined();expect(nextTale(run)?.id,r.id).toBe(r.tales[0]!.id);
   expect(regionFor(run,run.floor).boss.name).toBe(r.region.boss.name);
   expect(r.tales.length,r.id).toBeGreaterThanOrEqual(2);
   for(const t of r.tales)expect(romanceOf({id:'target',name:t.target.name}),`${r.id}:${t.target.name}`).toBeDefined();
   expect(romanceOf({id:'boss',name:r.region.boss.name}),`${r.id} boss ${r.region.boss.name}`).toBeDefined();
  }
  expect(new Set(ROUTES.flatMap(r=>r.tales.map(t=>t.id))).size).toBe(ROUTES.reduce((n,r)=>n+r.tales.length,0));
 });
 it('fights a what-if tale against its named general and saves exactly; a broken route chain is refused',()=>{
  for(const r of ROUTES.filter(x=>x.tales.length))for(const t of r.tales){
   const run=at((r.act-1)*6+3,chain(r)),b=runBattle(run,'tale',t.id);
   expect(validateStage(b.stage),t.id).toEqual([]);expect(b.stage.victory).toEqual([{type:'retreat',unit:'target'}]);
  }
  const run=at(9,{1:'refuse',2:'cao_zhi'}),ref=battleRef(run,'tale','IF2-zhi-1');
  const s=new Session(RUN_CHAPTER,'normal',3,'survival',4,{levels:{sima_yi:9,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:ref});
  expect(s.state.find('target')!.name).toBe('허저');
  s.act({kind:'endPhase'});expect(Session.load(JSON.parse(JSON.stringify(s.save()))).state.snapshot()).toEqual(s.state.snapshot());
  const bad=s.save();bad.deployment!.run!.route={1:'serve',2:'cao_zhi'};expect(()=>Session.load(bad)).toThrow('잘못된 원정 기록');
  finishBattle(run,{kind:'tale',label:'',detail:'',tale:'IF2-zhi-1'},true,Object.fromEntries(run.party.map(u=>[u.id,1])));
  expect(run.talesDone).toEqual(['IF2-zhi-1']);expect(nextTale({...run,floor:10})!.id).toBe('IF2-zhi-2');
 });
 it('ends in one of seventeen endings (fifteen written + two of the new faction), history only when all three choices follow history, and records it',()=>{
  expect(ALL_ENDINGS).toHaveLength(17);expect(new Set(ALL_ENDINGS.map(id=>endingFor({3:id}).title)).size).toBe(17);
  expect(endingFor({1:'refuse',2:'wei',3:'patience'}).history).toBe(true);
  expect(ALL_ENDINGS.filter(id=>endingFor(chain(routeById(id)!)).history)).toEqual(['patience']);
  const run=at(RUN_FLOORS,{1:'yuan',2:'hebei',3:'hebei_throne'});run.status='won';run.talesDone=['IF2-hb-1','IF3-ht-1'];
  expect(mandateEarned(run)).toBe(RUN_FLOORS+4+10);
  const m=freshMeta();settleRun(m,run);expect(m.endings).toEqual(['hebei_throne']);expect(endingFor(run.route).title).toBe('원씨를 넘어선 자');
  expect(readMeta(JSON.stringify({...m,endings:['hebei_throne','wei/coup'],tales:['IF2-hb-1','bad']}))).toMatchObject({endings:['hebei_throne'],tales:['IF2-hb-1']});
 });
});

describe('가상 전장 난이도',()=>{
 it('keeps every what-if tale winnable by the plain AI with a party grown along the way',()=>{
  const hold=(s:Session)=>{for(let i=0;i<12000&&s.state.outcome==='ongoing';i++){const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}
   const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.act({kind:'endPhase'});continue;}
   for(const cmd of decide(st,u)){if(cmd.kind==='move'&&(key(cmd.to)===key(u.pos)||u.id==='sima_yi'))continue;s.act(cmd);}
   if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});}return s;};
  for(const route of ROUTES.filter(r=>r.tales.length))route.tales.forEach((t,ti)=>{
   const floor=(route.act-1)*6+2+ti;let wins=0;
   for(let seed=1;seed<=4&&!wins;seed++){const run=newRun(seed*37,['infantry','archer','cavalry']);
    for(let k=0;k<Math.floor(floor/4);k++)recruit(run,(['spearman','crossbow','fengshui','cavalry'] as const)[k]!,4);
    run.floor=floor;run.route=chain(route);grantXp(run,(floor-1)*110);
    if(hold(new Session(RUN_CHAPTER,'normal',seed,'survival',4,{levels:{sima_yi:Math.min(40,run.party[0]!.level),sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:battleRef(run,'tale',t.id)})).state.outcome==='victory')wins++;}
   expect(wins,`${t.id} ${t.target.name}`).toBeGreaterThan(0);
  });
 },120000);
});
