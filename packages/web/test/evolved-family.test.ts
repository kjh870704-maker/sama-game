import {describe,it,expect} from 'vitest';
import {newRun,battleRef,recruit} from '../src/roguelike.ts';
import {Session} from '../src/session.ts';
import {RUN_CHAPTER} from '../src/run-ui.ts';
import {cryFor} from '../src/emotes.ts';
import {classFamily} from '../src/music.ts';
import {deployment,freshCampaign,award,levelInfo} from '../src/progression.ts';
import {growthMilestones,officerEvolution} from '../src/growth-milestones.ts';
import {chapters,campaignOrder} from '../src/session.ts';
import {getTrait,makeUnit,VARIANTS,EVOLUTION,familyOf,tierOf,profileOf,evolvedClass,statsFor,type DamageContext,type UnitClass,currentClass} from '../../core/src/index.ts';
import {classNames,troopRoles,artClass,evolutionLines} from '../src/troops.ts';
import {adviceFor} from '../src/troop-tactics.ts';
import {RECRUITS} from '../src/roguelike.ts';

/** 병종 확장 2차: 2단계에서 끝나던 계통의 3단계와 새 기본 계통(투창병). */
const NEW_CLASSES:Array<[UnitClass,UnitClass,1|2|3]>=[
 ['ironPagoda','heavyCav',3],['elephantKing','heavyCav',3],['sharpshooter','archer',3],['wraith','bandit',3],
 ['wuguoRattan','infantry',3],['greenwoodKing','bandit',3],['arhat','monk',3],['demonKing','shaman',3],
 ['celestial','maiden',3],['thunderGod','taoist',3],['mountedMastermind','strategist',3],['pirateCaptain','navy',3],
 ['javelin','spearman',1],['eliteJavelin','spearman',2],['flyingSpear','spearman',3],['divineJavelin','spearman',4],
 ['qiang','cavalry',1],['qiangRider','cavalry',2],['qiangVeteran','cavalry',3],['qiangKingGuard','cavalry',4],
 ['sniper','crossbow',1],['eliteSniper','crossbow',2],['deadeye','crossbow',3],['divineSniper','crossbow',4],
];
const STATS=['hp','mp','attack','defense','intellect','spirit','agility'] as const;
describe('새 병종과 진화 계통',()=>{
 it('adds at least 12 classes, each with a name, role, family, tier and lineage art',()=>{
  expect(NEW_CLASSES.length).toBeGreaterThanOrEqual(12);
  for(const [c,family,tier] of NEW_CLASSES){
   expect(VARIANTS[c],c).toBeDefined();expect(familyOf(c),c).toBe(family);expect(tierOf(c),c).toBe(tier);
   expect(classNames[c],c).toBeTruthy();expect(troopRoles[c]?.role,c).toBeTruthy();
   expect(familyOf(troopRoles[c]!.base),c).toBe(family);expect(familyOf(artClass(c)),c).toBe(family);
   expect(adviceFor(c),c).toBeTruthy();
   if(tier>1){expect(VARIANTS[c]!.bloom?.name,c).toBeTruthy();expect(VARIANTS[c]!.bloom?.description,c).toBeTruthy();}
  }
 });
 it('gives every class name a distinct Korean name',()=>{
  const names=Object.values(classNames);expect(new Set(names).size).toBe(names.length);
 });
 it('places every new class on an evolution line with ascending levels',()=>{
  const lines=evolutionLines();
  const activeTargets=new Set(Object.values(EVOLUTION).map(([c])=>c));
  for(const [c] of NEW_CLASSES)if(activeTargets.has(c))expect(lines.some(l=>l.some(([x])=>x===c)),c).toBe(true);
  for(const line of lines){
   for(let i=1;i<line.length;i++){expect(line[i]![1],line.map(x=>x[0]).join('→')).toBeGreaterThan(line[i-1]![1]);expect(tierOf(line[i]![0])).toBeGreaterThan(tierOf(line[i-1]![0]));}
  }
  expect(evolvedClass('xiliang',11)).toBe('xiliang');expect(evolvedClass('xiliang',12)).toBe('xiliang');expect(evolvedClass('xiliang',20)).toBe('xiliang');
  expect(evolvedClass('heavyCav',20)).toBe('ironPagoda');expect(evolvedClass('elephant',21)).toBe('warElephant');expect(evolvedClass('elephant',22)).toBe('elephantKing');
 });
 it('evolves every lineage through exactly four tiers, siege and navy included',()=>{
  for(const line of evolutionLines()){const tiers=line.map(([c])=>tierOf(c));expect(tiers,line.map(x=>x[0]).join('→')).toEqual([1,2,3,4]);}
  for(const c of ['ram','navy','engineer','xiliang','siegeTower','transport','gaemaWarrior','crownPrince'] as const)expect(evolvedClass(c,30)).toBe(c);
  expect(evolvedClass('catapult',30)).toBe('divineCatapult');
  for(const line of evolutionLines())for(const [c] of line)expect(classNames[c],c).toMatch(/[가-힣]/);
 });
 it('makes each new tier 3 stronger than its tier 2 and keeps the tier 2 skills',()=>{
  for(const [c,,tier] of NEW_CLASSES){
   if(tier!==3)continue;
   const from=(Object.keys(EVOLUTION) as UnitClass[]).find(k=>EVOLUTION[k]![0]===c);
   if(!from)continue;
   expect(tierOf(from),c).toBe(2);
   const a=profileOf(from),b=profileOf(c);
   for(const k of STATS)expect(b[k],`${c} ${k}`).toBeGreaterThan(a[k]);
   const lv=EVOLUTION[from]![1],sa=statsFor(from,lv),sb=statsFor(c,lv);
   expect(sb.maxHp+sb.attack+sb.defense+sb.intellect+sb.spirit,c).toBeGreaterThan(sa.maxHp+sa.attack+sa.defense+sa.intellect+sa.spirit);
   const t2=VARIANTS[from]!.traits??{},t3=VARIANTS[c]!.traits??{};
   for(const t of Object.keys(t2)){expect(t3[t],`${c} keeps ${t}`).toBeDefined();if(t!=='fireWeakness')expect(t3[t]!,`${c} ${t}`).toBeGreaterThanOrEqual(t2[t]!);}
   expect(Object.keys(t3).length,c).toBeGreaterThanOrEqual(Object.keys(t2).length);
  }
 });
 it('removes the overlapping lines and reads their old saves as the nearest surviving class',()=>{
  for(const c of ['physician','axeman','mountaineer','qingzhou','jishi','shieldBow','drummer','riderSage','jiangdong','langzhong']){expect((VARIANTS as Record<string,unknown>)[c],c).toBeUndefined();expect(RECRUITS as string[]).not.toContain(c);expect(VARIANTS[currentClass(c)]??(['fengshui','spearman','bandit','infantry','crossbow'].includes(currentClass(c))||undefined),c).toBeTruthy();}
  expect(evolvedClass('javelin',30)).toBe('divineJavelin');
  expect(evolvedClass('qiang',30)).toBe('qiangKingGuard');
  expect(evolvedClass('sniper',30)).toBe('divineSniper');
  expect(evolvedClass('engineer',40)).toBe('engineer');expect(evolvedClass('catapult',40)).toBe('divineCatapult');
  expect(classFamily('arhat')).toBe(classFamily('monk'));
 });
});

/** 진화 병종은 계열의 기능(치유 명령·외침·음악·보물 조건)을 그대로 이어받는다. */
describe('진화 병종의 계열 기능',()=>{
 it('lets an evolved feng shui master still use 치유',()=>{
  const run=newRun(77,['infantry','archer','cavalry']);recruit(run,'fengshui',12);
  const sage=run.party.at(-1)!;expect(sage.unitClass).toBe('sage');
  run.party[1]!.hp=.3;
  const s=new Session(RUN_CHAPTER,'normal',5,'survival',4,{levels:{sima_yi:4,sima_lang:1,sima_fang:1,cao_zhen:1},equipped:{},run:battleRef(run,'battle')});
  const healer=s.state.get(sage.id),hurt=s.state.get(run.party[1]!.id);
  hurt.pos={x:healer.pos.x,y:healer.pos.y+1};
  const before=hurt.hp;expect(s.act({kind:'item',unit:healer.id,item:'heal',target:hurt.id} as never).ok).toBe(true);
  expect(hurt.hp).toBeGreaterThan(before);
 });
 it('gives evolved troops their lineage battle cry and music family',()=>{
  expect(cryFor('tigerRider')).toEqual(cryFor('cavalry'));expect(cryFor('sharpshooter')).toEqual(cryFor('archer'));
  expect(cryFor('mastermind',true)).toEqual(cryFor('strategist',true));
  expect(classFamily('lancer')).toBe('horse');expect(classFamily('greatBow')).toBe('bow');expect(classFamily('immortal')).toBe('sage');
 });
 it('applies treasure conditions (mounted, caster, armored) to evolved troops too',()=>{
  const me=makeUnit({id:'a',unitClass:'infantry',level:10,side:'player',pos:{x:0,y:0}});
  const boost=(trait:string,foe:UnitClass)=>{const ctx={attacker:me,defender:makeUnit({id:'b',unitClass:foe,level:10,side:'enemy',pos:{x:1,y:0}}),kind:'physical',distance:1,attackMul:1,reduction:0,accuracyMod:0,defenseIgnore:0,critChance:0,evasionMod:0} as unknown as DamageContext;
   getTrait('treasure:'+trait).hooks.onAttack!(ctx,me);return ctx.attackMul;};
  expect(boost('greenDragon','tigerRider')).toBeCloseTo(boost('greenDragon','cavalry'));expect(boost('greenDragon','tigerRider')).toBeGreaterThan(1);
  expect(boost('greenDragon','warElephant')).toBeGreaterThan(1);
  expect(boost('ironAxe','royalGuard')).toBeGreaterThan(1);
 });
 it('evolves story officers by level and keeps what they learned',()=>{
  const d=deployment(freshCampaign(),true);d.levels.sima_yi=16;d.levels.cao_zhen=12;d.levels.sima_fang=3;
  const chapter=campaignOrder.find((c:number)=>chapters[c]!.stage.id==='S1-09')!;
  const s=new Session(chapter,'normal',215,'strategy',4,d),hero=s.state.get('sima_yi');
  expect(hero.unitClass).toBe('mastermind');expect(hero.traits).toContain('alwaysHit');expect(hero.strategies).toContain('windDragon');
  expect(hero.hp).toBe(hero.stats.maxHp);expect(s.state.get('cao_zhen').unitClass).toBe('ironCav');
  const low=deployment(freshCampaign(),true);low.levels.sima_yi=7;
  expect(new Session(chapter,'normal',215,'strategy',4,low).state.get('sima_yi').unitClass).toBe('strategist');
 });
 it('announces an officer evolution on the result screen',()=>{
  expect(officerEvolution('sima_yi',7,8)).toMatchObject({from:'책사',to:'군사',bloom:{name:'군략'}});expect(officerEvolution('sima_yi',8,9)).toBeUndefined();
  const before=freshCampaign();before.xp.sima_yi=1100;const after=structuredClone(before);
  award(after,'S1-03','normal',['sima_yi'],[1]);
  expect(levelInfo(after.xp.sima_yi!).level).toBeGreaterThanOrEqual(8);
  expect(growthMilestones(before,after).find(x=>x.id==='sima_yi')?.evolution?.to).toBe('군사');
 });
});
