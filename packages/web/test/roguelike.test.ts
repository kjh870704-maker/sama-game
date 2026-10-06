import {describe,it,expect} from 'vitest';
import {newRun,floorChoices,runBattle,battleRef,grantXp,finishBattle,takeReward,visitNode,recruit,survivorsOf,ga,ro,eul,RUN_FLOORS,PARTY_LIMIT,RECRUITS,RUN_MAP_W,RUN_MAP_H,type Run} from '../src/roguelike.ts';
import {artClass,troopArt,troopRoles,evolutionLines} from '../src/troops.ts';
import {Session} from '../src/session.ts';
import {RUN_CHAPTER} from '../src/run-ui.ts';
import {validateStage,tierOf,nextEvolution,CONTROLLABLE,decide,key,type UnitClass} from '../../core/src/index.ts';
import type {Deployment} from '../src/progression.ts';

const start:UnitClass[]=['infantry','archer','cavalry'];
const fresh=()=>{const r=newRun(1234,start);r.route={1:'refuse'};return r;};
const deploy=(run:Run,kind:'battle'|'elite'|'boss'='battle'):Deployment=>({levels:{sima_yi:run.party[0]!.level,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:battleRef(run,kind)});
const battle=(run:Run,kind:'battle'|'elite'|'boss'='battle')=>new Session(RUN_CHAPTER,'normal',run.seed+run.floor,'survival',4,deploy(run,kind));

/** Both sides driven by the core AI until the battle ends. */
function autoplay(s:Session){
  for(let i=0;i<8000&&s.state.outcome==='ongoing';i++){
    const st=s.state;
    if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}
    const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.act({kind:'endPhase'});continue;}
    let ok=false;for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;if(s.act(cmd).ok)ok=true;}
    if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});void ok;
  }
  return s;
}

describe('천명의 원정 · 규칙',()=>{
 it('starts with Sima Yi and three troops, and walks three acts of six floors with a boss closing each',()=>{
  const run=fresh();expect(run.party).toHaveLength(4);expect(run.party[0]!.hero).toBe(true);
  expect(floorChoices(run)).toHaveLength(3);expect(floorChoices(run).some(n=>n.kind==='battle')).toBe(true);
  expect(floorChoices(run)).toEqual(floorChoices(fresh()));expect(RUN_FLOORS).toBe(18);
  expect(floorChoices(newRun(1234,start)).map(n=>n.kind)).toEqual(['fate']);
  run.route={1:'refuse',2:'wei',3:'patience'};
  for(const f of [6,12,18]){run.floor=f;expect(floorChoices(run).map(n=>n.kind)).toEqual(['boss']);}
  expect([6,12,18].map(f=>{run.floor=f;return floorChoices(run)[0]!.label;})).toEqual(['우두머리 · 마초','우두머리 · 제갈량','우두머리 · 공손연']);
 });
 it('levels units with experience and evolves them at the lineage thresholds',()=>{
  const run=fresh(),foot=run.party.find(u=>u.unitClass==='infantry')!;
  grantXp(run,400,[foot]);expect(foot.level).toBe(8);expect(foot.unitClass).toBe('shieldGuard');expect(foot.name).toBe('방패병');
  expect(run.news.some(n=>n.includes('진화'))).toBe(true);
  grantXp(run,800,[foot]);expect(foot.unitClass).toBe('royalGuard');expect(tierOf(foot.unitClass)).toBe(3);
  const hero=run.party[0]!;grantXp(run,400,[hero]);expect(hero.unitClass).toBe('tactician');expect(hero.name).toBe('사마의');
 });
 it('recruits arrive already evolved when their level is past a threshold, up to the party limit',()=>{
  const run=fresh();expect(recruit(run,'archer',9)).toBe(true);expect(run.party.at(-1)!.unitClass).toBe('longbow');
  while(run.party.length<PARTY_LIMIT)recruit(run,'spearman',2);expect(recruit(run,'spearman',2)).toBe(false);
 });
 it('brings fallen units back badly wounded instead of losing them, carries wounds, and offers a reward after a win',()=>{
  const run=fresh(),lost=run.party[1]!.id;
  const survivors:Record<string,number>={};for(const u of run.party)if(u.id!==lost)survivors[u.id]=.5;
  finishBattle(run,{kind:'battle',label:'',detail:''},true,survivors);
  expect(run.party.find(u=>u.id===lost)!.hp).toBe(.25);expect(run.fallen).toHaveLength(0);
  expect(run.party.filter(u=>u.id!==lost).every(u=>u.hp===.5)).toBe(true);expect(run.status).toBe('reward');expect(run.offer).toHaveLength(3);
  takeReward(run,1);expect(run.party.filter(u=>u.id!==lost).every(u=>u.hp===.9)).toBe(true);expect(run.floor).toBe(2);expect(run.status).toBe('map');
 });
 it('ends the run when Sima Yi falls, and heals fully after a boss',()=>{
  const lost=fresh();finishBattle(lost,{kind:'battle',label:'',detail:''},false,{});expect(lost.status).toBe('lost');
  const boss=fresh();boss.floor=4;const sv:Record<string,number>={};for(const u of boss.party)sv[u.id]=.2;
  finishBattle(boss,{kind:'boss',label:'',detail:''},true,sv);expect(boss.party.every(u=>u.hp===1)).toBe(true);
  boss.floor=18;boss.status='map';finishBattle(boss,{kind:'boss',label:'',detail:''},true,sv);expect(boss.status).toBe('won');expect(boss.bosses).toBe(2);
 });
 it('writes natural Korean and tells same-class troops apart',()=>{
  expect([ga('보병'),ga('사마의'),ro('궁병'),ro('귀모'),ro('신궁'),ro('호표기'),eul('안량'),eul('마초')]).toEqual(['보병이','사마의가','궁병으로','귀모로','신궁으로','호표기로','안량을','마초를']);
  const run=fresh();recruit(run,'infantry',4);recruit(run,'infantry',4);
  expect(run.party.filter(u=>u.unitClass==='infantry').map(u=>u.name)).toEqual(['보병','보병 을','보병 병']);
  grantXp(run,400);expect(new Set(run.party.map(u=>u.name)).size).toBe(run.party.length);
  expect(run.news.filter(n=>n.startsWith('레벨 상승'))).toHaveLength(1);
 });
 it('gives every recruitable troop an evolution, drawn with its own lineage art',()=>{
  for(const c of [...RECRUITS,'strategist' as const])expect(nextEvolution(c),c).toBeDefined();
  for(const line of evolutionLines())for(const [c] of line){expect(troopRoles[c]??(['infantry','spearman','cavalry','heavyCav','archer','crossbow','strategist','fengshui','engineer','catapult','ram','navy'].includes(c)?{}:undefined),c).toBeDefined();}
  for(const [c,base] of [['stormSage','taoist'],['warlock','shaman'],['warriorMonk','monk'],['outlaw','bandit'],['songstress','maiden'],['priestess','maiden']] as const){expect(artClass(c)).toBe(base);expect(troopArt[base]).toBeDefined();}
 });
 it('locks the run to the battle in progress and says why a run ended',()=>{
  const run=fresh();run.active='battle';finishBattle(run,{kind:'battle',label:'',detail:''},true,Object.fromEntries(run.party.map(u=>[u.id,1])));
  expect(run.active).toBeUndefined();
  const lost=fresh();lost.active='elite';finishBattle(lost,{kind:'elite',label:'',detail:''},false,{});
  expect(lost.active).toBeUndefined();expect(lost.news.join()).toContain('사마의가 1층에서 쓰러졌다');
 });
 it('resolves rest and training on the spot',()=>{
  const run=fresh();for(const u of run.party)u.hp=.3;visitNode(run,{kind:'rest',label:'',detail:''});
  expect(run.party.every(u=>u.hp>.89)).toBe(true);expect(run.floor).toBe(2);
 });
});

describe('천명의 원정 · 전장',()=>{
 it('generates valid, deterministic battlefields for every floor and node kind',()=>{
  const run=fresh();
  for(let f=1;f<=RUN_FLOORS;f++){run.floor=f;for(const kind of ['battle','elite','boss'] as const){
   const a=runBattle(run,kind),b=runBattle(run,kind);expect(a).toEqual(b);
   expect(validateStage(a.stage)).toEqual([]);expect(a.map.rows).toHaveLength(RUN_MAP_H);expect(a.map.rows[0]).toHaveLength(RUN_MAP_W);
  }}
 });
 it('fields the party with its classes, wounds and relics, and later floors bring evolved enemies',()=>{
  const run=fresh();run.party[1]!.hp=.5;run.relics.push('whetstone');
  const s=battle(run),foot=s.state.get(run.party[1]!.id);
  expect(foot.unitClass).toBe(run.party[1]!.unitClass);expect(Math.abs(foot.hp/foot.stats.maxHp-.5)).toBeLessThan(.05);
  expect(s.state.living('player')).toHaveLength(4);expect(s.state.living('enemy').length).toBeGreaterThanOrEqual(3);
  run.floor=18;const late=battle(run,'boss');
  expect(late.state.living('enemy').some(u=>tierOf(u.unitClass)>=2)).toBe(true);expect(late.state.find('boss')?.alive).toBe(true);
  run.party[0]!.unitClass='mastermind';run.party[0]!.level=17;
  for(const kind of ['battle','elite','boss'] as const){const st=battle(run,kind).state;
   for(const u of st.living())for(const id of u.strategies)expect(st.strategies.has(id),`${u.id}:${id}`).toBe(true);}
 });
 it('keeps the boss in plain view near the middle of the enemy line',()=>{
  const run=fresh();for(const f of [6,12,18]){run.floor=f;const boss=battle(run,'boss').state.find('boss')!;
   expect(boss.pos.x).toBeGreaterThanOrEqual(RUN_MAP_W-4);expect(Math.abs(boss.pos.y-RUN_MAP_H/2)).toBeLessThanOrEqual(1);}
 });
 it('saves and reloads a run battle exactly',()=>{
  const s=battle(fresh());s.act({kind:'endPhase'});
  expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());
  const bad=s.save();bad.deployment!.run!.floor=99;expect(()=>Session.load(bad)).toThrow('잘못된 원정 기록');
 });
 it('can be won by the plain AI on the early floors and reports survivors',()=>{
  let wins=0;
  for(let seed=1;seed<=6;seed++){const run=newRun(seed*101,start);const s=autoplay(battle(run));
   if(s.state.outcome==='victory'){wins++;const sv=survivorsOf(s.state,s.deployment!.run!);expect(sv.sima_yi).toBeGreaterThan(0);}}
  expect(wins).toBeGreaterThanOrEqual(3);
 });
 it('keeps boss floors beatable by the plain AI with a party grown along the way',()=>{
  // 사마의는 제자리(사람은 영웅을 앞세우지 않는다), 층에 맞게 경험치·영입을 준 부대.
  const hold=(s:Session)=>{for(let i=0;i<12000&&s.state.outcome==='ongoing';i++){const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}
   const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.act({kind:'endPhase'});continue;}
   for(const cmd of decide(st,u)){if(cmd.kind==='move'&&(key(cmd.to)===key(u.pos)||u.id==='sima_yi'))continue;s.act(cmd);}
   if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});}return s;};
  for(const [floor,xp] of [[6,450],[12,1100]] as const){let wins=0;
   for(let seed=1;seed<=6;seed++){const run=newRun(seed*37,start);run.floor=floor;
    for(const cls of (['spearman','crossbow'] as const).slice(0,Math.floor(floor/3)))recruit(run,cls,4);grantXp(run,xp);
    if(hold(new Session(RUN_CHAPTER,'normal',seed,'survival',4,deploy(run,'boss'))).state.outcome==='victory')wins++;}
   expect(wins,`floor ${floor}`).toBeGreaterThanOrEqual(2);}
 },30000);
});
