import {describe,it,expect} from 'vitest';
import {freshMeta} from '../src/meta.ts';
import {RESEARCH,buyResearch,nodeState,researchGrants,rankBand} from '../src/research.ts';
import {applyPerkGrants,validGrants} from '../src/perks.ts';
import {Session} from '../src/session.ts';

describe('잘게 쪼갠 연구(10단계·강화 구간·병종별)',()=>{
 it('has many ten-rank nodes with 기본·숙련·극의 bands and gated 강화',()=>{
  const deep=RESEARCH.filter(n=>n.rankGates);expect(deep.length).toBeGreaterThanOrEqual(45);
  const n=RESEARCH.find(x=>x.id==='c_inf_atk')!;expect(n.max).toBe(10);
  expect([1,5,6,8,9,10].map(r=>rankBand(n,r))).toEqual(['기본','기본','숙련','숙련','극의','극의']);
  const m=freshMeta();m.mandate=999;
  for(let i=0;i<5;i++)expect(buyResearch(m,'c_inf_atk')).toBe(true);
  expect(nodeState(m,n)).toBe('locked');expect(buyResearch(m,'c_inf_atk')).toBe(false);// 6단계: 연의 3승
  m.chronicle=['a','b','c'];expect(buyResearch(m,'c_inf_atk')).toBe(true);
  for(let i=0;i<2;i++)expect(buyResearch(m,'c_inf_atk')).toBe(true);
  expect(buyResearch(m,'c_inf_atk')).toBe(false);// 9단계: 3회차
  m.runs=3;expect(buyResearch(m,'c_inf_atk')).toBe(true);
 });
 it('applies family research only to that family, and stat research as percent',()=>{
  const m=freshMeta();m.research={c_inf_atk:4,s_hp:5,s_mastery:2,s_thrift:3};
  const g=researchGrants(m);expect(validGrants(g)).toBe(true);
  expect(g.byFamily?.infantry).toEqual([['physicalPower',4]]);
  const s=new Session(2,'normal',215,'survival',4,{levels:{sima_yi:6,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{}});
  const units=s.state.living('player'),inf=units.find(u=>u.unitClass==='infantry'),other=units.find(u=>u.unitClass!=='infantry')!;
  const hp=other.stats.maxHp;applyPerkGrants(s.state,g);
  expect(other.stats.maxHp).toBe(Math.round(hp*1.075));expect(other.traitParams.physicalPower??0).toBe(0);
  if(inf)expect(inf.traitParams.physicalPower).toBe(4);
  const sima=s.state.get('sima_yi');expect(sima.traitParams.strategyMastery).toBe(2);
  expect(s.state.strategyFor(sima,'fire')!.tier).toBe(2);// Lv.6 + 숙달 2 → 화계 숙련
 });
});

describe('천명의 시련(로그라이크 난이도)',()=>{
 it('hardens enemies in roguelike battles so research is what makes them easy',()=>{
  const base={levels:{sima_yi:6,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{}};
  const a=new Session(2,'normal',215,'survival',4,base),b=new Session(2,'normal',215,'survival',4,{...base,trial:1});
  const ea=a.state.living('enemy').find(u=>u.stats.movement>0)!,eb=b.state.get(ea.id);
  expect(eb.stats.maxHp).toBe(Math.round(ea.stats.maxHp*1.2));expect(eb.stats.attack).toBe(Math.round(ea.stats.attack*1.12));
  expect(Session.load(b.save()).state.snapshot()).toEqual(b.state.snapshot());
 });
});
