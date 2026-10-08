import {describe,it,expect} from 'vitest';
import {newRun,startingOfficers,battleRef,finishBattle,visitNode,takeReward,chooseFate,grantXp,xpFromLog,completionXp,availableOfficers,departingOfficers,STARTING_OFFICERS,XP_PER_LEVEL,type Run} from '../src/roguelike.ts';
import {Session} from '../src/session.ts';
import {RUN_CHAPTER} from '../src/run-ui.ts';
import {romanceOf} from '../src/romance.ts';
import {computePhysical,tacticMultiplier,classTactics,makeUnit,loadMap,Rng,strategyBase,healAmount,CONTROLLABLE,decide,key,type LogEntry,type Unit} from '../../core/src/index.ts';
import type {Deployment} from '../src/progression.ts';

const fresh=(unlocks:string[]=[])=>{const r=newRun(4321,startingOfficers(unlocks),{unlocks});r.route={1:'refuse'};return r;};
const deploy=(run:Run):Deployment=>({levels:{sima_yi:run.party[0]!.level,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:battleRef(run,'battle')});
const battle=(run:Run)=>new Session(RUN_CHAPTER,'normal',run.seed+run.floor,'survival',4,deploy(run));
function autoplay(s:Session){
  for(let i=0;i<8000&&s.state.outcome==='ongoing';i++){
    const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}
    const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.act({kind:'endPhase'});continue;}
    for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;s.act(cmd);}
    if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});
  }
  return s;
}

describe('원정의 장수 편성',()=>{
 it('always departs with Sima Yi and the same named officers, never a chosen troop list',()=>{
  const run=fresh();
  expect(run.party.map(u=>u.name)).toEqual(['사마의',...STARTING_OFFICERS.map(o=>o.name)]);
  expect(run.party.slice(1).every(u=>u.officer&&/^of\d+$/.test(u.id))).toBe(true);
  expect(fresh(['wide_network']).party.map(u=>u.name)).toContain('사마사');
 });
 it('gives officers their Romance ratings in battle and keeps their names through evolution',()=>{
  const run=fresh(),s=battle(run),zhen=s.state.find(run.party.find(u=>u.name==='조진')!.id)!;
  expect(romanceOf(zhen)?.war).toBe(82);
  const plain=makeUnit({id:'x',unitClass:zhen.unitClass,level:zhen.level,side:'player',pos:{x:0,y:0}});
  expect(zhen.stats.attack).toBeGreaterThan(plain.stats.attack);
  const officer=run.party.find(u=>u.name==='장합')!;grantXp(run,400,[officer]);
  expect(officer.unitClass).toBe('lancer');expect(officer.name).toBe('장합');
 });
 it('offers named officers at the recruiting post and never one already in the party or fallen',()=>{
  const run=fresh();run.floor=2;visitNode(run,{kind:'recruit',label:'',detail:''});
  const officers=run.offer!.filter(o=>o.kind==='recruit'&&o.officer);
  expect(officers.length).toBe(2);
  const pick=run.offer!.indexOf(officers[0]!);const name=(officers[0] as {officer:string}).officer;
  takeReward(run,pick);expect(run.party.at(-1)!.name).toBe(name);expect(run.party.at(-1)!.officer).toBe(true);
  expect(availableOfficers(run).some(o=>o.name===name)).toBe(false);
 });
 it('lets an officer leave when the chosen path makes him an enemy',()=>{
  const run=newRun(9,startingOfficers());run.route={1:'yuan'};run.floor=7;
  expect(departingOfficers(run,'independent').map(u=>u.name)).toEqual(['장합']);
  expect(chooseFate(run,'independent')).toBe(true);
  expect(run.party.some(u=>u.name==='장합')).toBe(false);expect(run.news.join(' ')).toContain('장합');
  expect(availableOfficers(run).some(o=>['장합','고람','하후연','원담'].includes(o.name))).toBe(false);
 });
});

describe('전투 중 경험치',()=>{
 it('pays for hits, misses, counters, spells and defeats',()=>{
  const lv=()=>5,mine=(id:string)=>id.startsWith('a');
  const log:LogEntry[]=[
   {t:'attack',attacker:'a1',defender:'e1',damage:20,hit:true,critical:false},
   {t:'attack',attacker:'a2',defender:'e2',damage:0,hit:false,critical:false},
   {t:'counter',attacker:'a3',defender:'e3',damage:7,hit:true},
   {t:'attack',attacker:'a1',defender:'e1',damage:30,hit:true,critical:false},{t:'retreat',unit:'e1',side:'enemy'},
   {t:'retreat',unit:'e4',side:'enemy'},{t:'strategy',caster:'a4',strategy:'fire',targets:['e4','e5'],damage:[30,12]},
  ];
  const got=xpFromLog(log,mine,lv).map(x=>[x.gain.unit,x.gain.amount,x.gain.kills]);
  expect(got).toEqual([['a1',10,0],['a2',2,0],['a3',6,0],['a1',30,1],['a4',36,1]]);
 });
 it('earns experience during a run battle, levels up mid-battle and survives save and reload',()=>{
  const run=fresh();for(const u of run.party)u.xp=XP_PER_LEVEL-1;
  const s=autoplay(battle(run));
  const earned=Object.entries(s.xpEarned).filter(([,n])=>n>0);expect(earned.length).toBeGreaterThan(0);
  const [id]=earned[0]!,u=s.state.find(id)!,start=run.party.find(x=>x.id===id)!;
  if(u.alive)expect(u.level).toBeGreaterThan(start.level);
  const again=Session.load(s.save());expect(again.xpEarned).toEqual(s.xpEarned);expect(again.state.snapshot()).toEqual(s.state.snapshot());
 },30000);
 it('adds what each unit earned to the victory bonus',()=>{
  const run=fresh(),[a,b]=[run.party[1]!,run.party[2]!],survivors=Object.fromEntries(run.party.map(u=>[u.id,1]));
  finishBattle(run,{kind:'battle',label:'',detail:''},true,survivors,{[a.id]:60});
  expect(a.level*XP_PER_LEVEL+a.xp-(b.level*XP_PER_LEVEL+b.xp)).toBe(60);
  expect(b.xp).toBe(completionXp('battle'));
 });
});

describe('병종 전법',()=>{
 const map=loadMap({id:'t',name:'t',legend:{'.':'plain',f:'forest'},rows:['.........','....f....','.........']});
 const unit=(id:string,unitClass:Unit['unitClass'],x:number,y=0):Unit=>({...makeUnit({id,unitClass,level:10,side:id.startsWith('e')?'enemy':'player',pos:{x,y}}),classTactics:true});
 it('charges only after a long run, never on a counter, and stays off in old-rule battles',()=>{
  const cav=unit('p','cavalry',3),foe=unit('e','archer',4);
  expect(tacticMultiplier(cav,foe,map,false).mul).toBe(1);
  cav.movedThisTurn=true;cav.movedSteps=3;expect(tacticMultiplier(cav,foe,map,false)).toEqual({mul:1.2,name:'돌격'});
  expect(tacticMultiplier(cav,foe,map,true).mul).toBe(1);
  cav.classTactics=false;expect(tacticMultiplier(cav,foe,map,false).mul).toBe(1);
 });
 it('makes the charge hit harder than a plain attack while a plain attack stays plain',()=>{
  const plain=unit('p','cavalry',3),charging=unit('q','cavalry',3),foe=unit('e','infantry',4);charging.movedThisTurn=true;charging.movedSteps=4;foe.movedThisTurn=true;
  const a=computePhysical(plain,foe,map,new Rng(5)),b=computePhysical(charging,foe,map,new Rng(5));
  expect(a.tactic).toBeUndefined();expect(b.tactic).toBe('돌격');expect(b.damage).toBeGreaterThan(a.damage);expect(b.damage).toBeLessThanOrEqual(Math.ceil(a.damage*1.2)+1);
 });
 it('gives spearmen their counter, archers the opening volley, bandits the ambush and resting infantry the square',()=>{
  const spear=unit('p','pikeman',3),cav=unit('e','cavalry',4);expect(tacticMultiplier(spear,cav,map,true).name).toBe('창벽');
  const bow=unit('p','archer',2),fresh2=unit('e','infantry',4);fresh2.movedThisTurn=true;expect(tacticMultiplier(bow,fresh2,map,false).name).toBe('선제 사격');
  fresh2.hp-=1;expect(tacticMultiplier(bow,fresh2,map,false).mul).toBe(1);
  const bandit=unit('p','bandit',4,1);expect(tacticMultiplier(bandit,unit('e','archer',5,1),map,false).name).toBe('매복');
  const guard=unit('e','infantry',4);expect(tacticMultiplier(unit('p','spearman',3),guard,map,false).mul).toBe(.9);
  expect(classTactics('lancer').map(t=>t.name)).toEqual(['돌격']);expect(classTactics('strategist')).toEqual([]);
 });
});

describe('책략·회복은 지력을 따른다',()=>{
 const fire={id:'fire',name:'화계',element:'fire' as const,shape:'single' as const,range:3,radius:0,mpCost:6,power:100,targetSides:['enemy' as const]};
 const mk=(int:number,spirit:number,modern=true)=>{const a=makeUnit({id:'a',unitClass:'strategist',level:10,side:'player',pos:{x:0,y:0}}),d=makeUnit({id:'d',unitClass:'infantry',level:10,side:'enemy',pos:{x:1,y:0}});a.stats.intellect=int;d.stats.spirit=spirit;a.classTactics=modern;return {a,d};};
 it('grows steadily with intellect and never collapses to the minimum against high spirit',()=>{
  const lo=mk(40,40),mid=mk(70,40),hi=mk(100,40),wall=mk(40,120);
  expect(strategyBase(mid.a,mid.d,fire)).toBeGreaterThan(strategyBase(lo.a,lo.d,fire));
  expect(strategyBase(hi.a,hi.d,fire)).toBeGreaterThan(strategyBase(mid.a,mid.d,fire));
  expect(strategyBase(lo.a,lo.d,fire)).toBeCloseTo(40*.6,5);
  expect(strategyBase(wall.a,wall.d,fire)).toBeGreaterThan(10);
  // 옛 규칙 전투는 예전 빼기식 그대로(저장 재생 보존).
  const old=mk(40,120,false);expect(strategyBase(old.a,old.d,fire)).toBe(1);
 });
 it('heals more with more intellect and the heal-power trait',()=>{
  expect(healAmount(25,40)).toBe(Math.round(12.5+24));expect(healAmount(25,100)).toBeGreaterThan(healAmount(25,40));
  expect(healAmount(25,60,40)).toBe(Math.round((12.5+36)*1.4));
 });
});

