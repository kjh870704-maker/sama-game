import {describe,it,expect} from 'vitest';
import {PACKS,EXTRA_TALES,freshScenario,scenarioPath,currentStep,choose,finishStep,fateChoices,scriptOf,scenarioParty,rewardOfficers,routeTales,readScenario,floorFor,winOver,type ScenarioState} from '../src/scenario.ts';
import {modsOf} from '../src/scenario-ui.ts';
import {checkPack} from '../src/scenario-types.ts';
import {ROUTES,routeById} from '../src/fate.ts';
import {refBattle,taleById,RUN_MAP_H,type RunBattleRef} from '../src/roguelike.ts';
import {Session} from '../src/session.ts';
import {RUN_CHAPTER} from '../src/run-ui.ts';
import {allUnitClasses,validateStage} from '../../core/src/index.ts';
import type {Deployment} from '../src/progression.ts';

/** 모든 갈림길 조합(3 → 7 → 15). */
function allRoutes(){const out:Array<{1:string;2:string;3:string}>=[];
  // 신세력의 길(custom)은 플레이어가 지은 세력으로 그때그때 짓는 대본이라 따로 시험한다(persuade.test.ts).
  const written=ROUTES.filter(r=>!r.custom);
  for(const r3 of written.filter(r=>r.act===3))for(const r2 of written.filter(r=>r.act===2&&r3.after?.includes(r.id)))for(const r1 of written.filter(r=>r.act===1&&(r2.after?.includes(r.id)??r.id==='refuse')))out.push({1:r1.id,2:r2.id,3:r3.id});
  return out;}
const walk=(route:{1:string;2:string;3:string}):ScenarioState=>{const s=freshScenario();s.route={...route};return s;};

describe('시나리오 대본',()=>{
 it('passes the script checker for every pack',()=>{
  for(const p of PACKS)expect(checkPack(p,{unitClasses:allUnitClasses()})).toEqual([]);
 });
 it('has a script for every chapter of every one of the fifteen paths, ending included',()=>{
  const routes=allRoutes();expect(routes).toHaveLength(15);
  for(const r of routes){const path=scenarioPath(walk(r));
   expect(path.at(-1)!.id).toBe(`ending:${r[3]}`);
   for(const step of path)expect(scriptOf(step.id),`${r[1]}/${r[2]}/${r[3]} → ${step.id}`).toBeDefined();}
 });
 it('gives every battle chapter on every path a camp to walk and talk in, and keeps required officers few',()=>{
  const seen=new Set<string>();
  for(const r of allRoutes())for(const step of scenarioPath(walk(r))){if(step.kind==='fate'||step.kind==='ending'||seen.has(step.id))continue;seen.add(step.id);
   const sc=scriptOf(step.id)!;expect(sc.camp,step.id).toBeDefined();expect(sc.camp!.people.length,step.id).toBeGreaterThanOrEqual(2);
   expect(sc.camp!.people.every(p=>p.talk.some(st=>'say' in st)),step.id).toBe(true);
   if(sc.required){expect(sc.required.length,step.id).toBeLessThanOrEqual(3);expect(sc.required,step.id).not.toContain('사마의');}}
  for(const t of EXTRA_TALES)expect(scriptOf(t.id)!.camp,t.id).toBeDefined();
 });
 it('opens every chapter on every path with a narration of its historical and story background',()=>{
  for(const r of allRoutes())for(const step of scenarioPath(walk(r))){const h=scriptOf(step.id)!.history;expect(h?.length,step.id).toBeGreaterThanOrEqual(2);}
 });
 it('scripts every path-alternative tale and lets a choice in the route switch to it',()=>{
  for(const t of EXTRA_TALES){expect(scriptOf(t.id),t.id).toBeDefined();expect(routeById(t.route)!.tales.some(x=>x.id===t.replaces)).toBe(true);
   const opener=PACKS.flatMap(p=>p.chapters).some(c=>c.scenes.some(sc=>sc.steps.some(st=>'choice' in st&&st.options.some(o=>o.effects?.some(e=>e.kind==='path'&&e.tale===t.id)))));
   expect(opener,t.id).toBe(true);}
 });
});

describe('시나리오 진행',()=>{
 it('runs the four opening romance chapters, then stops at the first crossroads',()=>{
  const s=freshScenario();expect(scenarioPath(s).map(x=>x.id)).toEqual(['S1-01','S1-02','S1-03','S1-04','fate:1']);
  expect(currentStep(s)!.id).toBe('S1-01');
  for(const id of ['S1-01','S1-02','S1-03','S1-04'])finishStep(s,id);expect(currentStep(s)!.kind).toBe('fate');
 });
 it('follows history to the romance chapters, or a what-if route into its own tales, and never returns',()=>{
  const h=freshScenario();const f1=scenarioPath(h).at(-1)!;choose(h,f1,'refuse');
  expect(scenarioPath(h).map(x=>x.id)).toContain('S1-11');expect(scenarioPath(h).at(-1)!.id).toBe('fate:2:refuse');
  const w=freshScenario();choose(w,scenarioPath(w).at(-1)!,'serve',[],5);
  const path=scenarioPath(w);expect(path.some(x=>x.id==='S1-05')).toBe(false);expect(path.filter(x=>x.kind==='tale')).toHaveLength(3);
  expect(path.at(-2)!.id).toBe('serve:boss');expect(path.at(-1)!.id).toBe('fate:2:serve');
  expect(fateChoices(w,'fate:2:serve').every(r=>!r.history)).toBe(true);
 });
 it('gathers companions when a what-if road begins, without anyone that road makes an enemy',()=>{
  const s=freshScenario();choose(s,scenarioPath(s).at(-1)!,'serve',[],6);
  expect(Object.keys(s.officers).sort()).toEqual(['곽회','사마랑','장합','조진']);expect(s.officers['조진']!.level).toBe(5);
  const y=freshScenario();choose(y,scenarioPath(y).at(-1)!,'yuan',[],6);
  expect(y.officers['조진']).toBeUndefined();expect(y.officers['문추']).toBeDefined();
 });
 it('applies a choice: flags, recruits and a switched tale',()=>{
  const s=freshScenario();choose(s,scenarioPath(s).at(-1)!,'serve',[],6);
  const alt=EXTRA_TALES.find(t=>t.route==='serve')!,step=scenarioPath(s).find(x=>x.kind==='tale')!;
  choose(s,step,'x',[{kind:'flag',flag:'f1'},{kind:'recruit',name:'견초',unitClass:'cavalry'},{kind:'path',tale:alt.id},{kind:'recruit',name:'채모',unitClass:'navy'}],6);
  expect(s.flags).toContain('f1');expect(s.officers['견초']!.level).toBe(5);expect(s.officers['채모']!.unitClass).toBe('crossbow');
  expect(routeTales(routeById('serve')!,s).map(t=>t.id)).toContain(alt.id);expect(scenarioPath(s).some(x=>x.id===alt.id)).toBe(true);
 });
 it('brings a companion back when the what-if road beats him (장합 on the independent road)',()=>{
  const s=freshScenario();s.route={1:'yuan',2:'independent'};
  const step=scenarioPath(s).find(x=>x.kind==='tale'&&x.tale?.target.name==='장합');
  expect(step).toBeDefined();expect(winOver(s,step!,7)).toBe('장합');expect(s.officers['장합']!.level).toBe(7);expect(winOver(s,step!,7)).toBeUndefined();
  const other=scenarioPath(s).find(x=>x.kind==='tale'&&x.tale?.target.name!=='장합')!;expect(winOver(s,other,7)).toBeUndefined();
 });
 it('keeps a sanitised save',()=>{
  const s=freshScenario();choose(s,scenarioPath(s).at(-1)!,'serve',[],3);finishStep(s,'fate:1');
  expect(readScenario(JSON.stringify(s))).toEqual(s);
  expect(readScenario(JSON.stringify({...s,route:{1:'serve',2:'wei'}})).route).toEqual({});
  expect(readScenario('{"version":1,"officers":{"x":{"unitClass":"infantry","level":99,"xp":0}}}').officers).toEqual({});
  expect(readScenario('nonsense')).toEqual(freshScenario());
 });
});

describe('시나리오의 가상 전장',()=>{
 const deploy=(ref:RunBattleRef):Deployment=>({levels:{sima_yi:ref.party[0]!.level,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:ref,scenario:{chapter:ref.scenario!}});
 const setup=()=>{const s=freshScenario();choose(s,scenarioPath(s).at(-1)!,'serve',[],8);return s;};
 const refFor=(s:ScenarioState,id:string,mods={}):RunBattleRef=>{const step=scenarioPath(s).find(x=>x.id===id)!;
  return {seed:77,floor:floorFor(step,s),kind:step.kind==='boss'?'boss':'tale',party:scenarioParty(s,8,0),relics:[],route:{...s.route},...(step.kind==='tale'?{tale:id}:{}),mods,enemyBase:8,scenario:id};};
 it('fields Sima Yi with the chosen officers on a large map and is a valid stage',()=>{
  const s=setup(),ref=refFor(s,'IF1-srv-1'),b=refBattle(ref);
  expect(validateStage(b.stage)).toEqual([]);expect(b.map.rows).toHaveLength(RUN_MAP_H);
  const session=new Session(RUN_CHAPTER,'normal',77,'survival',4,deploy(ref));
  expect(session.state.living('player').map(u=>u.name).sort()).toEqual(['곽회','사마랑','사마의','장합','조진'].sort());
  expect(session.state.find('target')?.name).toBe('고간');
 });
 it('turns dialogue choices into the battle: reinforcements in green, fewer foes, ambush, rally',()=>{
  const s=setup(),plain=new Session(RUN_CHAPTER,'normal',77,'survival',4,deploy(refFor(s,'IF1-srv-1')));
  const m={reinforce:[{name:'의병',unitClass:'infantry' as const,side:'npc' as const},{name:'견초',unitClass:'cavalry' as const,side:'ally' as const}],scout:true,ambush:true,rally:true};
  const mod=new Session(RUN_CHAPTER,'normal',77,'survival',4,deploy(refFor(s,'IF1-srv-1',m)));
  expect(mod.state.living('allyAi').map(u=>u.name)).toEqual(['의병']);expect(mod.state.living('ally').map(u=>u.name)).toEqual(['견초']);
  expect(mod.state.living('enemy').length).toBe(plain.state.living('enemy').length-1);
  expect(mod.state.living('enemy').every(e=>e.hp<e.stats.maxHp)).toBe(true);
  expect(mod.state.living('player').every(u=>mod.state.hasStatus(u,'rally'))).toBe(true);
  expect(Session.load(mod.save()).state.snapshot()).toEqual(mod.state.snapshot());
 });
 it('fights a switched (extra) tale and reloads it from a save',()=>{
  const s=setup(),alt=EXTRA_TALES.find(t=>t.route==='serve')!;choose(s,scenarioPath(s).find(x=>x.kind==='tale')!,'p',[{kind:'path',tale:alt.id}],8);
  expect(taleById(alt.id)?.target.name).toBe(alt.target.name);
  const session=new Session(RUN_CHAPTER,'normal',77,'survival',4,deploy(refFor(s,alt.id)));
  expect(session.state.find('target')?.name).toBe(alt.target.name);expect(Session.load(session.save()).state.snapshot()).toEqual(session.state.snapshot());
 });
 it('reads a chapter choice back as battle modifiers',()=>{
  const s=setup(),step=scenarioPath(s).find(x=>x.id==='IF1-srv-1')!,script=scriptOf(step.id)!;
  const opt=script.scenes.flatMap(sc=>sc.steps).find(st=>'choice' in st) as Extract<typeof script.scenes[number]['steps'][number],{choice:string}>;
  const withMods=opt.options.find(o=>o.effects?.some(e=>['reinforce','rally','guard','insight','scout','ambush','bold'].includes(e.kind)))!;
  choose(s,step,withMods.id,withMods.effects??[],8);expect(Object.keys(modsOf(s,step)).length).toBeGreaterThan(0);
 });
 it('turns a won duel or debate into battle modifiers (once per chapter)',()=>{
  const s=setup(),step=scenarioPath(s).find(x=>x.id==='IF1-srv-1')!;expect(modsOf(s,step).rally).toBeUndefined();
  s.flags.push('contest:IF1-srv-1:duel:win');expect(modsOf(s,step)).toMatchObject({rally:true,ambush:true});
  s.flags=['contest:IF1-srv-1:debate:win'];expect(modsOf(s,step)).toMatchObject({rally:true,insight:true});
  s.flags=['contest:IF1-srv-1:duel:lose'];expect(modsOf(s,step).rally).toBeUndefined();
 });
 it('grows officers by what they earned plus the victory bonus, evolving at the threshold',()=>{
  const s=setup();s.officers['조진']!.level=7;s.officers['조진']!.xp=50;
  const party=scenarioParty(s,8,0),zhen=party.find(u=>u.name==='조진')!;
  const news=rewardOfficers(s,party,{[zhen.id]:30},70);
  expect(s.officers['조진']!.level).toBe(8);expect(s.officers['조진']!.unitClass).toBe('lancer');expect(news.join(' ')).toContain('진화');
 });
});

import {newScenarioRun,ensureRun,pendingMarch,marchNodes,recruitPool,recruitOfficer,afterFight,loseFight,runMandate,finishMarch,healAll,relicOffer} from '../src/scenario.ts';
describe('본편은 로그라이크: 회차·행군로·영구 이탈·천명',()=>{
 it('starts every run at the first romance chapter with Sima Lang and Cao Zhen, unlocks adding Sima Shi, a relic and the guard',()=>{
  const s=newScenarioRun(1,12345,[],1);expect(currentStep(s)!.id).toBe('S1-01');expect(Object.keys(s.officers).sort()).toEqual(['사마랑','조진']);expect(s.run!.guard).toBe(false);
  const t=newScenarioRun(2,12345,['wide_network','heirloom','second_chance'],6);expect(t.officers['사마사']).toBeDefined();expect(t.run!.relics).toHaveLength(1);expect(t.run!.guard).toBe(true);
 });
 it('continues an old save as the first run without wiping progress',()=>{
  const s=freshScenario();finishStep(s,'S1-01');expect(ensureRun(s,99)).toBe(true);expect(s.done).toEqual(['S1-01']);expect(s.run!.no).toBe(1);expect(ensureRun(s,99)).toBe(false);
 });
 it('asks for a march between chapters (never before the first or the ending), seeded and always with a battle',()=>{
  const s=newScenarioRun(1,777,[],1);expect(pendingMarch(s)).toBeUndefined();
  finishStep(s,'S1-01');expect(pendingMarch(s)).toBe('S1-01');
  const a=marchNodes(s,'S1-01'),b=marchNodes(s,'S1-01');expect(a).toEqual(b);expect(a).toHaveLength(3);expect(a.some(n=>n.kind==='battle')).toBe(true);
  expect(new Set(a.map(n=>n.kind)).size).toBe(3);
  finishMarch(s,'S1-01');expect(pendingMarch(s)).toBeUndefined();expect(s.run!.nodes).toBe(1);
 });
 it('brings fallen officers back badly wounded (never lost) and keeps the wounded wounded',()=>{
  const s=newScenarioRun(1,5,[],3);const party=[{id:'sima_yi',name:'사마의',unitClass:'strategist' as const,level:3,xp:0,hp:1,hero:true as const},{id:'of1',name:'조진',unitClass:'cavalry' as const,level:2,xp:0,hp:1,officer:true as const},{id:'of2',name:'사마랑',unitClass:'physician' as const,level:2,xp:0,hp:1,officer:true as const}];
  const lost=afterFight(s,party,{사마의:.5,사마랑:1},'시험');expect(lost).toEqual(['조진']);expect(s.officers['조진']).toBeDefined();expect(s.run!.hp['조진']).toBe(.25);expect(s.run!.hp['사마의']).toBe(.5);
  healAll(s,1);expect(s.run!.hp['사마의']).toBeUndefined();expect(s.run!.hp['조진']).toBeUndefined();
 });

 it('ends the run on defeat unless the guard is left, and pays mandate for chapters, bosses, marches and the ending',()=>{
  const s=newScenarioRun(1,5,['second_chance'],1);expect(loseFight(s)).toBe(true);expect(s.run!.hp['사마의']).toBe(.3);expect(loseFight(s)).toBe(false);expect(s.run!.status).toBe('over');
  const t=newScenarioRun(1,5,[],1);for(const id of ['S1-01','S1-02'])finishStep(t,id);finishMarch(t,'S1-01');expect(runMandate(t)).toBe(2*2+1);
 });
 it('offers relics not yet carried',()=>{const s=newScenarioRun(1,9,['heirloom'],1);const offer=relicOffer(s,'x');expect(offer.length).toBe(3);for(const r of offer)expect(s.run!.relics).not.toContain(r.id);});
});

import {omenOffer,omenOf,chooseOmen,omenReward,addRunBonus,OMENS} from '../src/scenario.ts';
describe('연의의 로그라이크 · 전황 카드와 전공',()=>{
 it('offers three seeded omens, applies their battle mods, and pays off challenges into the run mandate',()=>{
  const s=freshScenario();s.run={seed:42,no:1,hp:{},relics:[],fallen:[],marched:[],guard:false,nodes:0,status:'alive'};
  const step=scenarioPath(s).find(x=>x.kind==='story')!;
  const offer=omenOffer(s,step.id);expect(offer).toHaveLength(3);expect(new Set(offer.map(o=>o.id)).size).toBe(3);
  expect(omenOffer(s,step.id).map(o=>o.id)).toEqual(offer.map(o=>o.id));
  expect(chooseOmen(s,step.id,'clear')).toBe(true);expect(omenOf(s,step.id)?.id).toBe('clear');expect(modsOf(s,step).rally).toBe(true);
  chooseOmen(s,step.id,'gamble');expect(s.run.hp['사마의']).toBe(.7);
  const swift=OMENS.find(o=>o.id==='swift')!,intact=OMENS.find(o=>o.id==='intact')!;
  expect(omenReward(swift,{turn:10,lost:0})).toBe(4);expect(omenReward(swift,{turn:20,lost:0})).toBe(0);expect(omenReward(intact,{turn:20,lost:1})).toBe(0);
  const before=runMandate(s);addRunBonus(s,7);expect(runMandate(s)).toBe(before+7);
  expect(readScenario(JSON.stringify(s)).run?.bonus).toBe(7);
 });
});
