import {describe,it,expect} from 'vitest';
import {freshMeta,readMeta,recordOfficerLevels} from '../src/meta.ts';
import {RESEARCH,buyResearch,nodeState,researchGrants,xpMult,perkSlots,mandateBonus,nodeById} from '../src/research.ts';
import {perksFor,learnPerk,togglePerk,officerGrants,deploymentPerks,perkAt,officerTier} from '../src/officer-perks.ts';
import {applyRomance,skillParam} from '../src/romance.ts';
import {validGrants,grantPerk} from '../src/perks.ts';
import {allStrategies} from '../src/officers.ts';
import {troopRoles,recruitPool,classNames} from '../src/troops.ts';
import {OFFICER_RECRUITS} from '../src/roguelike.ts';
import {BIOS} from '../src/officer-bios.ts';
import {CHUHAN,CHUHAN_FACES,unlockLegacy,chooseHeir,heirGrants} from '../src/chuhan.ts';
import {PORTRAIT_PARTS} from '../src/portrait.ts';
import {RELICS} from '../src/roguelike.ts';
import {codexNames,codexClasses,biography,STRATEGY_TEXT,castCells,sideOf} from '../src/codex-ui.ts';
import {freshScenario,scenarioPath,choose,scenarioParty,floorFor} from '../src/scenario.ts';
import type {RunBattleRef} from '../src/roguelike.ts';
import {Session} from '../src/session.ts';
import {RUN_CHAPTER} from '../src/run-ui.ts';
import {strategyArea,makeUnit,profileOf,EVOLUTION,VARIANTS,estimatePhysical,allTraitIds,effectiveMovement} from '../../core/src/index.ts';

const rich=()=>{const m=freshMeta();m.mandate=500;m.runs=10;m.chronicle=['S1-01','S1-02','S1-03','S1-04','S1-05','S1-06','S1-07','S1-08','S1-09','S1-10','S1-11'];m.endings=['a'];m.officerBest={관우:30};return m;};

describe('연구 나무',()=>{
 it('has eight tabs, valid prerequisites and traits',()=>{
  expect(new Set(RESEARCH.map(n=>n.tab))).toEqual(new Set(['battle','domestic','formation','legend','drill','corps','arms','mind']));
  const traits=new Set(allTraitIds());
  for(const n of RESEARCH){for(const [id] of n.requires??[])expect(nodeById(id),n.id).toBeDefined();if(n.perk)expect(traits.has(n.perk.trait)||n.perk.trait.startsWith('stat:')||['strategyMastery','mpThrift'].includes(n.perk.trait),n.perk.trait).toBe(true);}
 });
 it('opens slowly: a fresh save sees only roots, gated nodes wait for runs',()=>{
  const m=freshMeta();m.mandate=100;
  expect(RESEARCH.filter(n=>['battle','domestic','formation','legend'].includes(n.tab)&&nodeState(m,n)==='open').map(n=>n.id).sort()).toEqual(['armor','drill','guard','medic','temper','training']);
  expect(buyResearch(m,'blade')).toBe(false);expect(buyResearch(m,'drill')).toBe(true);expect(buyResearch(m,'blade')).toBe(true);
  expect(buyResearch(m,'pierce')).toBe(false);// 연의 전장 2승 필요
  m.chronicle=['S1-01','S1-02'];expect(buyResearch(m,'pierce')).toBe(true);
  expect(m.mandate).toBe(100-2-3-4);
 });
 it('turns ranks into battle perks and rule numbers',()=>{
  const m=rich();for(let i=0;i<3;i++){buyResearch(m,'drill');buyResearch(m,'training');buyResearch(m,'guard');}buyResearch(m,'granary');
  const g=researchGrants(m);expect(g.all).toContainEqual(['physicalPower',9]);expect(g.byName['사마의']).toContainEqual(['defenseBoost',12]);
  expect(xpMult(m)).toBeCloseTo(1.3);expect(mandateBonus(m)).toBe(1);expect(perkSlots(m)).toBe(2);
 });
 it('cleans saved research and officer progress',()=>{
  const raw=JSON.stringify({...freshMeta(),research:{drill:9,bogus:2,blade:-1},officerPerks:{관우:{learned:['physicalPower','x'],equipped:['physicalPower','nope']}},officerBest:{관우:16,'':3}});
  const m=readMeta(raw);expect(m.research).toEqual({drill:3});expect(m.officerPerks!['관우']!.equipped).toEqual(['physicalPower']);expect(m.officerBest).toEqual({관우:16});
 });
});

describe('장수 효과',()=>{
 it('gives every officer five distinct, deterministic effects from stats, class and temper',()=>{
  for(const name of codexNames()){const a=perksFor(name);expect(a,name).toHaveLength(5);expect(new Set(a.map(p=>p.trait)).size).toBe(5);expect(perksFor(name)).toEqual(a);expect(a.map(p=>p.level)).toEqual([5,10,15,20,28]);}
  expect(perksFor('관우').map(p=>p.trait)).not.toEqual(perksFor('제갈량').map(p=>p.trait));
  expect(perksFor('제갈량').some(p=>p.trait==='strategyPower')).toBe(true);
 });
 it('needs the level and mandate to learn, and slots to equip',()=>{
  const m=rich(),list=perksFor('관우');m.officerBest={관우:12};
  expect(learnPerk(m,'관우',list[2]!.id)).toBe(false);// Lv.15 필요
  expect(learnPerk(m,'관우',list[0]!.id)).toBe(true);expect(learnPerk(m,'관우',list[1]!.id)).toBe(true);
  m.officerBest={관우:30};expect(learnPerk(m,'관우',list[2]!.id)).toBe(true);
  expect(m.officerPerks!['관우']!.equipped).toHaveLength(2);
  expect(togglePerk(m,'관우',list[2]!.id)).toBe(false);// 칸이 가득
  expect(togglePerk(m,'관우',list[0]!.id)).toBe(true);expect(togglePerk(m,'관우',list[2]!.id)).toBe(true);
  const t=officerTier(m,'관우');expect(officerGrants(m,['관우'])['관우']).toEqual([[list[1]!.trait,perkAt(list[1]!,t).param],[list[2]!.trait,perkAt(list[2]!,t).param]]);
 });
 it('grows stronger as the officer evolves (Ⅰ → Ⅱ → Ⅲ → Ⅳ)',()=>{
  const m=rich(),list=perksFor('장합');m.officerBest={장합:30};learnPerk(m,'장합',list[0]!.id);
  const p=list[0]!,at=(c:'spearman'|'pikeman'|'halberdier'|'divineSpear')=>officerGrants(m,[{name:'장합',unitClass:c}])['장합']![0]![1];
  expect(at('spearman')).toBe(p.param);expect(at('pikeman')).toBe(Math.round(p.param*1.5));expect(at('halberdier')).toBe(p.param*2);expect(at('divineSpear')).toBe(Math.round(p.param*2.5));
  expect(perkAt(p,3).name).toContain('극의');expect(perkAt(p,4).name).toContain('전설');expect(officerTier(m,'장합')).toBe(4);m.officerBest={장합:3};expect(officerTier(m,'장합')).toBe(1);
  // 고유능력도 진화 단계를 따라 강해진다
  const u1=makeUnit({id:'zh1',unitClass:'spearman',level:5,side:'player',pos:{x:0,y:0}}),u3=makeUnit({id:'zh3',unitClass:'halberdier',level:20,side:'player',pos:{x:0,y:0}});
  (u1 as {name:string}).name='장합';(u3 as {name:string}).name='장합';applyRomance(u1);applyRomance(u3);
  expect(u3.traitParams.counterBoost!-(VARIANTS.halberdier?.traits?.counterBoost??0)).toBeGreaterThanOrEqual(0);expect(skillParam(20,1)).toBe(20);expect(skillParam(20,3)).toBe(30);expect(skillParam(20,4)).toBe(35);
 });
 it('records the best level each officer reached',()=>{const m=freshMeta();recordOfficerLevels(m,[{name:'장합',level:7}]);recordOfficerLevels(m,[{name:'장합',level:5}]);expect(m.officerBest).toEqual({장합:7});});
 it('adds up the same trait from two sources',()=>{const u=makeUnit({id:'a',unitClass:'longbow',level:5,side:'player',pos:{x:0,y:0}});const c=u.traitParams.critical!;grantPerk(u,'critical',5);expect(u.traitParams.critical).toBe(c+5);expect(u.traits.filter(t=>t==='critical')).toHaveLength(1);});
});

describe('출진 보정이 전장에 실린다',()=>{
 const setup=()=>{const s=freshScenario();choose(s,scenarioPath(s).at(-1)!,'serve',[],8);const step=scenarioPath(s).find(x=>x.id==='IF1-srv-1')!;
  const ref:RunBattleRef={seed:77,floor:floorFor(step,s),kind:'tale',party:scenarioParty(s,8,0),relics:[],route:{...s.route},tale:'IF1-srv-1',enemyBase:8,scenario:'IF1-srv-1'};return ref;};
 it('applies research to everyone and officer effects by name, and survives a save round trip',()=>{
  const m=rich();buyResearch(m,'drill');m.officerBest={장합:30};const list=perksFor('장합');learnPerk(m,'장합',list[0]!.id);
  const perks=deploymentPerks(m,['사마의','장합'])!;expect(validGrants(perks)).toBe(true);
  const ref=setup(),dep={levels:{sima_yi:8,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:ref,scenario:{chapter:'IF1-srv-1'},perks};
  const ses=new Session(RUN_CHAPTER,'normal',77,'survival',4,dep);
  for(const u of ses.state.living('player'))expect(u.traits).toContain('physicalPower');
  const zhang=ses.state.living('player').find(u=>u.name==='장합')!;expect(zhang.traits).toContain(list[0]!.trait);
  expect(ses.state.living('enemy').every(u=>!u.traits.includes('physicalPower')||u.traitParams.physicalPower!==3)).toBe(true);
  expect(validGrants({all:[['nope',3]],byName:{}})).toBe(false);
 });
 it('heals allies with support spells in story-mode battles instead of hurting them',()=>{
  const ref=setup(),ses=new Session(RUN_CHAPTER,'normal',77,'survival',4,{levels:{sima_yi:8,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:ref,scenario:{chapter:'IF1-srv-1'}});
  const healer=ses.state.living('player').find(u=>u.strategies.includes('mend'))!,mate=ses.state.living('player').find(u=>u!==healer)!;
  mate.hp-=30;const before=mate.hp;healer.pos={x:mate.pos.x+1,y:mate.pos.y};
  expect(ses.act({kind:'strategy',unit:healer.id,strategy:'mend',at:mate.pos}).ok).toBe(true);expect(mate.hp).toBeGreaterThan(before);
 });
});

describe('병종과 책략',()=>{
 it('adds the named-unit lines, recruitable and with officers to lead them',()=>{
  for(const c of ['xiliang'] as const){expect(recruitPool).toContain(c);expect(EVOLUTION[c]).toBeUndefined();expect(troopRoles[c]).toBeDefined();}
  for(const c of ['feixiong','liangzhouIron'] as const)expect(classNames[c]).toBeTruthy();
  // 겹치던 명부대 계통은 지우고, 그 장수들은 이어받는 병종을 이끈다.
  for(const c of ['axeman','mountaineer','qingzhou','jishi','shieldBow','drummer','riderSage'])expect(recruitPool as string[]).not.toContain(c);
  expect(OFFICER_RECRUITS.find(o=>o.name==='학소')?.unitClass).toBe('crossbow');expect(OFFICER_RECRUITS.find(o=>o.name==='가후')?.unitClass).toBe('wheelSage');
  expect(profileOf('wheelSage').canUseStrategy).toBe(true);
  for(const r of Object.values(troopRoles))for(const sp of r!.spells)expect(allStrategies.some(s=>s.id===sp),sp).toBe(true);
 });
 it('shapes: cross arms, a line away from the caster',()=>{
  expect(strategyArea({shape:'cross',radius:2},{x:5,y:5})).toHaveLength(9);
  expect(strategyArea({shape:'line',radius:3},{x:5,y:5},{x:5,y:2})).toEqual([{x:5,y:5},{x:5,y:6},{x:5,y:7},{x:5,y:8}]);
  expect(castCells(3)).toHaveLength(25);
 });
 it('weaken lowers damage dealt, breach raises damage taken, slow cuts movement',()=>{
  const s=freshScenario();choose(s,scenarioPath(s).at(-1)!,'serve',[],8);const step=scenarioPath(s).find(x=>x.id==='IF1-srv-1')!;
  const ses=new Session(RUN_CHAPTER,'normal',77,'survival',4,{levels:{sima_yi:8,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:{seed:77,floor:floorFor(step,s),kind:'tale',party:scenarioParty(s,8,0),relics:[],route:{...s.route},tale:'IF1-srv-1',enemyBase:8,scenario:'IF1-srv-1'},scenario:{chapter:'IF1-srv-1'}});
  const st=ses.state,a=st.living('player').find(u=>u.name==='장합')!,d=st.living('enemy')[0]!;
  const base=estimatePhysical(a,d,st.map);a.statuses.push({kind:'weaken',turns:2,magnitude:1});expect(estimatePhysical(a,d,st.map)).toBeLessThan(base);
  a.statuses=[];d.statuses.push({kind:'breach',turns:2,magnitude:1});expect(estimatePhysical(a,d,st.map)).toBeGreaterThan(base);
  const mv=effectiveMovement(a);a.statuses.push({kind:'slow',turns:2,magnitude:1});expect(effectiveMovement(a)).toBe(Math.max(0,mv-2));
 });
 it('lists every strategy with a description and every class in the codex',()=>{
  for(const s of allStrategies)expect(STRATEGY_TEXT[s.id],s.id).toBeTruthy();
  expect(codexClasses().length).toBeGreaterThan(80);
 });
});

describe('인물열전',()=>{
 it('has a written biography for every officer in the roster',()=>{
  const missing=codexNames().filter(n=>!BIOS[n]);expect(missing).toEqual([]);
  for(const n of codexNames())expect(biography(n).length).toBeGreaterThan(40);
 });
});

describe('초한의 선대 영웅',()=>{
 it('are in the codex with biographies, own sides and recorded portraits',()=>{
  for(const n of CHUHAN){expect(codexNames()).toContain(n);expect(BIOS[n],n).toBeTruthy();}
  expect(sideOf('항우')).toBe('chu');expect(sideOf('유방')).toBe('han');expect(CHUHAN_FACES['항우']!.hat).toBe(2);expect(CHUHAN_FACES['유방']!.hat).toBe(7);
  expect(PORTRAIT_PARTS.hat[7]).toContain('유씨관');
 });
 it('leave legacies: unlock by gate and mandate, pick one heir, and it rides into battle',()=>{
  const m=freshMeta();m.mandate=40;
  expect(unlockLegacy(m,'항우')).toBe(false);// 회차 2번 필요
  m.runs=2;expect(unlockLegacy(m,'항우')).toBe(true);expect(m.heir).toBe('항우');expect(m.mandate).toBe(28);
  m.runs=3;m.chronicle=['S1-01','S1-02','S1-03'];expect(unlockLegacy(m,'장량')).toBe(true);expect(m.heir).toBe('항우');
  expect(chooseHeir(m,'장량')).toBe(true);expect(heirGrants(m)).toContainEqual(['strategyPower',10]);
  expect(deploymentPerks(m,['사마의'])!.all).toContainEqual(['strategyPower',10]);
  expect(chooseHeir(m,'유방')).toBe(false);
  const back=readMeta(JSON.stringify({...m,legacies:[...m.legacies!,'가짜'],heir:'장량'}));expect(back.legacies).toEqual(['항우','장량']);expect(back.heir).toBe('장량');
  expect(readMeta(JSON.stringify({...m,heir:'유방'})).heir).toBeUndefined();
 });
 it('adds legend research that opens only after several lives',()=>{
  const m=freshMeta();m.mandate=200;expect(buyResearch(m,'jiangdong')).toBe(false);m.runs=3;expect(buyResearch(m,'jiangdong')).toBe(true);
  expect(buyResearch(m,'unify')).toBe(false);
 });
 it('adds the legendary strategies, units and relics',()=>{
  for(const id of ['hongmen','secretPath','burnBoats','backWater','fourSongs','weiRiver','tenAmbush'])expect(allStrategies.find(s=>s.id===id),id).toBeDefined();
  expect(allStrategies.find(s=>s.id==='fourSongs')!.inflicts).toEqual(['confusion','weaken']);
  expect((EVOLUTION as Record<string,unknown>).jiangdong).toBeUndefined();expect((EVOLUTION as Record<string,unknown>).langzhong).toBeUndefined();
  for(const id of ['bawangJi','huangshi','xiaoheLedger','yuJade'])expect(RELICS.some(r=>r.id===id)).toBe(true);
 });
});
