import {describe,it,expect} from 'vitest';
import {newRun,floorChoices,nextStory,finishStory,finishBattle,mandateEarned,startingOffers,visitNode,recruit,STORY_ORDER,RUN_FLOORS} from '../src/roguelike.ts';
import {readMeta,freshMeta,buyUnlock,settleRun,recordStory,UNLOCKS} from '../src/meta.ts';
import {storyDeployment} from '../src/run-ui.ts';
import {Session,chapters} from '../src/session.ts';

const start=['infantry','archer','cavalry'] as const;
const fresh=(opts={})=>{const r=newRun(77,[...start],opts);r.route={1:'refuse'};return r;};

describe('전체 로그라이크 · 연의 전장',()=>{
 it('covers all 32 story battles across the three acts, in story order',()=>{
  const all=[...STORY_ORDER[1],...STORY_ORDER[2],...STORY_ORDER[3]];
  expect(all).toHaveLength(32);for(const id of all)expect(chapters.some(c=>c.stage.id===id),id).toBe(true);
 });
 it('offers the next untold story battle on every floor but the first of an act, then repeats',()=>{
  const run=fresh();expect(floorChoices(run).some(n=>n.kind==='story')).toBe(false);
  run.floor=2;const node=floorChoices(run).find(n=>n.kind==='story')!;expect(node.stage).toBe('S1-01');
  run.chronicle=['S1-01','S1-02'];expect(nextStory(run)).toBe('S1-03');
  run.chronicle=[...STORY_ORDER[1]];run.storyDone=['S1-01'];expect(nextStory(run)).toBe('S1-02');
  run.floor=8;run.chronicle=[];expect(nextStory(run)).toBe('S2-01');run.floor=14;expect(nextStory(run)).toBe('S3-01');
 });
 it('records a won story battle, carries Sima Yi wounds, and pays experience and a relic',()=>{
  const run=fresh();run.floor=2;run.active='story';run.activeStage='S1-01';
  finishStory(run,'S1-01',true,.4,'하내의 밤');
  expect(run.chronicle).toContain('S1-01');expect(run.storyDone).toEqual(['S1-01']);expect(run.party[0]!.hp).toBeCloseTo(.4);
  expect(run.status).toBe('reward');expect(run.offer!.length).toBeGreaterThan(0);expect(run.active).toBeUndefined();
  expect(nextStory({...run,floor:3})).toBe('S1-02');
  const lost=fresh();finishStory(lost,'S1-01',false,0);expect(lost.status).toBe('lost');
 });
 it('opens a story battle as the real stage with the run hero, levels from the story so far, wounds and relics',()=>{
  const run=fresh();run.floor=3;run.party[0]!.hp=.5;run.party[0]!.level=9;run.relics=['whetstone'];
  const {chapter,deployment}=storyDeployment(run,'S1-06');
  expect(chapters[chapter]!.stage.id).toBe('S1-06');expect(deployment.levels.sima_yi).toBeGreaterThanOrEqual(9);expect(deployment.levels.cao_zhen).toBeGreaterThan(1);
  const s=new Session(chapter,'normal',5,'survival',4,deployment),hero=s.state.get('sima_yi');
  expect(hero.hp/hero.stats.maxHp).toBeCloseTo(.5,1);
  const plain=new Session(chapter,'normal',5,'survival',4,{...deployment,runStory:{...deployment.runStory!,relics:[]}}).state.get('sima_yi');
  expect(hero.stats.attack-plain.stats.attack).toBe(3);
  s.act({kind:'endPhase'});expect(Session.load(JSON.parse(JSON.stringify(s.save()))).state.snapshot()).toEqual(s.state.snapshot());
  const bad=s.save();bad.deployment!.runStory!.stage='S9-99';expect(()=>Session.load(bad)).toThrow('잘못된 원정 기록');
 });
});

describe('전체 로그라이크 · 천명(영구 진행)',()=>{
 it('pays mandate for floors, bosses, story wins and a full clear, exactly once',()=>{
  const run=fresh();run.floor=9;run.bosses=1;run.storyDone=['S1-01','S1-02'];run.status='lost';
  expect(mandateEarned(run)).toBe(8+3+4);
  const m=freshMeta();expect(settleRun(m,run)).toBe(15);expect(settleRun(m,run)).toBe(0);
  expect(m.mandate).toBe(15);expect(m.runs).toBe(1);expect(m.best).toBe(9);expect(m.chronicle).toEqual(['S1-01','S1-02']);
  const won=fresh();won.status='won';won.bosses=3;expect(mandateEarned(won)).toBe(RUN_FLOORS+9+10);
 });
 it('buys unlocks with mandate and sanitizes a stored record',()=>{
  const m=freshMeta();m.mandate=7;expect(buyUnlock(m,'heirloom')).toBe(false);expect(buyUnlock(m,'veteran_start')).toBe(true);
  expect(m.mandate).toBe(1);expect(buyUnlock(m,'veteran_start')).toBe(false);
  recordStory(m,'S2-03');recordStory(m,'S2-03');expect(m.chronicle).toEqual(['S2-03']);
  const r=readMeta(JSON.stringify({version:1,mandate:-5,unlocks:['veteran_start','hack'],chronicle:['S1-01','<x>'],best:999}));
  expect(r).toMatchObject({mandate:0,unlocks:['veteran_start'],chronicle:['S1-01'],best:RUN_FLOORS});
  expect(readMeta('{broken')).toEqual(freshMeta());expect(UNLOCKS.every(u=>u.cost>0)).toBe(true);
 });
 it('applies unlocks: veteran start, wide network, field medic, elite recruits, scouting, heirloom and the second chance',()=>{
  const all=UNLOCKS.map(u=>u.id),run=fresh({unlocks:all,relic:'lamellar'});
  expect(run.party.every(u=>u.level===6)).toBe(true);expect(run.relics).toEqual(['lamellar']);expect(run.secondChance).toBe(true);
  expect(startingOffers(1,all).every(o=>o.length===4)).toBe(true);expect(startingOffers(1,all)).toHaveLength(4);
  run.floor=2;expect(floorChoices(run)).toHaveLength(4);
  for(const u of run.party)u.hp=.1;visitNode(run,{kind:'rest',label:'',detail:''});expect(run.party.every(u=>u.hp===1)).toBe(true);
  run.floor=2;visitNode(run,{kind:'recruit',label:'',detail:''});expect(run.offer![0]!.kind==='recruit'&&run.offer![0]!.level).toBe(8);
  const graced=fresh({unlocks:['second_chance']});graced.floor=3;
  finishBattle(graced,{kind:'battle',label:'',detail:''},false,{});
  expect(graced.status).toBe('map');expect(graced.floor).toBe(4);expect(graced.party[0]!.hp).toBeCloseTo(.3);expect(graced.secondChance).toBe(false);
  finishBattle(graced,{kind:'battle',label:'',detail:''},false,{});expect(graced.status).toBe('lost');
  void recruit;
 });
});
