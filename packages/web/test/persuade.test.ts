import {describe,it,expect} from 'vitest';
import {startPersuasion,speak,FIT,APPROACHES,PERSUADE_GOAL,PERSUADE_ROUNDS,reaction} from '../src/persuade.ts';

describe('장수 설득',()=>{
 it('always offers a way to win: each round has an approach this temper takes to',()=>{
  for(const name of ['허저','장합','순욱','조상','위연','등애','장료','가규']){const p=startPersuasion(name,1234);
   expect(p.options).toHaveLength(PERSUADE_ROUNDS);for(const o of p.options){expect(new Set(o).size).toBe(3);expect(o.some(a=>FIT[p.temper][a]>=20)).toBe(true);}}
 });
 it('wins by speaking to the temper and loses by speaking past it',()=>{
  const best=startPersuasion('순욱',7);
  while(best.status==='talking'){const o=best.options[best.round]!;speak(best,[...o].sort((a,b)=>FIT[best.temper][b]-FIT[best.temper][a])[0]!);}
  expect(best.status).toBe('won');expect(best.heart).toBeGreaterThanOrEqual(PERSUADE_GOAL);
  const worst=startPersuasion('순욱',7);
  while(worst.status==='talking'){const o=worst.options[worst.round]!;speak(worst,[...o].sort((a,b)=>FIT[worst.temper][a]-FIT[worst.temper][b])[0]!);}
  expect(worst.status).toBe('lost');
 });
 it('gives old friends a warmer start, halves a repeated approach, and ignores approaches not on offer',()=>{
  expect(startPersuasion('사마사',1).heart).toBeGreaterThan(startPersuasion('위연',1).heart);
  const p=startPersuasion('허저',3),a=p.options[0]![0]!;const off=APPROACHES.find(x=>!p.options[0]!.includes(x))!;
  expect(speak(p,off)).toBe(0);expect(p.round).toBe(0);
  const first=speak(p,a);if(p.status==='talking'&&p.options[1]!.includes(a)&&first>0)expect(speak(p,a)).toBe(Math.round(first/2));
 });
 it('reacts in proportion to how far the heart moved',()=>{expect(reaction(30,0).emote).toBe('!');expect(reaction(10,0).emote).toBe('…');expect(reaction(-20,0).emote).toBe('분노');});
 it('is the same talk for the same seed',()=>{expect(startPersuasion('조진',99)).toEqual(startPersuasion('조진',99));});
});

import {checkCustom,checkFaction,registerCustoms,readCustoms,STAT_BUDGET,type CustomOfficer} from '../src/custom.ts';
import {romanceByName,temperOf} from '../src/romance.ts';
import {newScenarioRun as newRun,fateChoices as fates,scenarioPath as pathOf,scriptOf as script,currentStep as cur,finishStep as fin,recruitPool as pool} from '../src/scenario.ts';
import {ROUTES,routesFor,validRoute} from '../src/fate.ts';
describe('신장수·신세력',()=>{
 const hero:CustomOfficer={name:'강유린',epithet:'하내의 젊은 창',unitClass:'spearman',temper:'proud',war:80,int:60,lead:75,pol:60,cha:70};
 it('checks a new officer: name, budget, class, temper',()=>{
  expect(checkCustom(hero)).toBeUndefined();expect(checkCustom({...hero,name:'조운'})).toMatch(/이미/);expect(checkCustom({...hero,war:95,int:95,lead:95})).toMatch(String(STAT_BUDGET));
  expect(checkCustom({...hero,name:'abc'})).toMatch(/한글/);expect(readCustoms([hero,{...hero,war:200}])).toHaveLength(1);
 });
 it('puts a made officer into the roll so battles, persuasion and recruiting know him',()=>{
  registerCustoms([hero]);expect(romanceByName('강유린')!.war).toBe(80);expect(temperOf('강유린')).toBe('proud');
  const s=newRun(1,3,[],1);expect(pool(s).some(o=>o.name==='강유린')).toBe(true);registerCustoms([]);expect(romanceByName('강유린')).toBeUndefined();
 });
 it('starts a new faction with the made officers and opens its own road at the first crossroads',()=>{
  expect(checkFaction({name:'진',emblem:'晉',color:'#1f3f8a'})).toBeUndefined();expect(checkFaction({name:'',emblem:'晉',color:'#1f3f8a'})).toBeDefined();
  const s=newRun(1,3,[],1,{faction:{name:'진',emblem:'晉',color:'#1f3f8a'},customs:[hero]});
  expect(s.officers['강유린']).toBeDefined();expect(s.officers['조진']).toBeUndefined();expect(cur(s)!.id).toBe('S1-01');
  for(const id of ['S1-01','S1-02','S1-03','S1-04'])fin(s,id);
  expect(fates(s,'fate:1').map(r=>r.id)).toContain('np1');
  const plain=newRun(1,3,[],1);for(const id of ['S1-01','S1-02','S1-03','S1-04'])fin(plain,id);expect(fates(plain,'fate:1').map(r=>r.id)).not.toContain('np1');
  expect(routesFor(1).some(r=>r.custom)).toBe(false);
 });
 it('scripts every chapter of both new-faction roads to both endings, with the faction name in the text',()=>{
  for(const [r2,r3] of [['np_south','np_unify'],['np_south','np_kingdom'],['np_west','np_unify'],['np_west','np_kingdom']]){
   const s=newRun(1,3,[],1,{faction:{name:'진',emblem:'晉',color:'#1f3f8a'},customs:[hero]});s.route={1:'np1',2:r2,3:r3};expect(validRoute(s.route)).toBe(true);
   const steps=pathOf(s);expect(steps.at(-1)!.id).toBe(`ending:${r3}`);
   for(const st of steps.filter(x=>!x.id.startsWith('S1'))){const sc=script(st.id);expect(sc,st.id).toBeDefined();expect(sc!.history!.length,st.id).toBeGreaterThanOrEqual(2);
    if(st.kind==='tale'||st.kind==='boss'){expect(sc!.camp!.people.length).toBeGreaterThanOrEqual(2);}
    expect(JSON.stringify(sc)).not.toContain('{세력}');}
  }
  expect(ROUTES.filter(r=>r.custom)).toHaveLength(5);
 });
});

import {readPortrait,suggestPortrait,PORTRAIT_KEYS,PORTRAIT_PARTS} from '../src/portrait.ts';
describe('신장수 초상',()=>{
 it('suggests a fitting portrait from name, class and temper, and keeps it within the parts',()=>{
  const a=suggestPortrait('한철','cavalry','brave'),b=suggestPortrait('한철','cavalry','brave');expect(a).toEqual(b);
  expect(a.armor).toBeGreaterThan(0);expect(a.eyes).toBe(2);expect(suggestPortrait('백운','strategist','wise').armor).toBe(0);
  for(const k of PORTRAIT_KEYS)expect(a[k]).toBeLessThan(PORTRAIT_PARTS[k].length);
  expect(suggestPortrait('한철','cavalry','brave',1)).not.toEqual(a);
 });
 it('reads a saved portrait safely and keeps it with the officer',()=>{
  expect(readPortrait({face:9,skin:1})).toMatchObject({face:0,skin:1,hat:0});expect(readPortrait('x')).toBeUndefined();
  const o={name:'강유린',epithet:'',unitClass:'spearman' as const,temper:'proud' as const,war:70,int:70,lead:70,pol:70,cha:70,portrait:suggestPortrait('강유린','spearman','proud')};
  expect(readCustoms([o])[0]!.portrait).toEqual(o.portrait);
 });
});
