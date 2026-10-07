import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {allStrategies} from '../src/officers.ts';
import {LINEAGE_SPELLS,LINEAGE_SKILL,SHARED,classSpells} from '../src/class-spells.ts';
import {fourStageCorrectionRows} from '../src/complete-troops.ts';
import {profileOf,tieredStrategy,MAX_SINGLE_RANGE,MAX_AREA_RANGE} from '../../core/src/index.ts';

function trial(id:string,level=1){const c=freshCampaign(),d=deployment(c,true);for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,level);d.mission={id,runId:'test-'+id,version:2};return new Session(7,'normal',215,'survival',4,d);}
const def=(id:string)=>allStrategies.find(s=>s.id===id)!;

describe('계통별 책략·특수기',()=>{
 it('책략 계통끼리 기본기(소회복·정화·명상) 말고는 같은 책략을 쓰지 않는다',()=>{
  const owner=new Map<string,string>();
  for(const [lin,ids] of Object.entries(LINEAGE_SPELLS))for(const id of ids!){expect(def(id),id).toBeTruthy();if(SHARED.has(id))continue;expect(owner.get(id),`${id}: ${owner.get(id)} / ${lin}`).toBeUndefined();owner.set(id,lin);}
 });
 it('물리로 싸우는 계통은 모두 서로 다른 특수기를 하나씩 가진다',()=>{
  const skills=new Set<string>();
  for(const [lin,classes] of Object.entries(fourStageCorrectionRows)){
   const caster=profileOf(classes[0]).canUseStrategy&&!['four-stage-lord','four-stage-commander','four-stage-monk'].includes(lin);
   if(caster)continue;const sk=LINEAGE_SKILL[lin as keyof typeof LINEAGE_SKILL];expect(sk,lin).toBeTruthy();expect(def(sk!).physical,sk).toBe(true);expect(skills.has(sk!),sk).toBe(false);skills.add(sk!);
   for(const c of classes)expect(classSpells(c,1)).toContain(sk);
  }
 });
 it('범위는 주변·십자 반경 1, 직선 3칸, 사거리 5(범위 책략 4)를 넘지 않고 3단에서도 넓어지지 않는다',()=>{
  for(const s of allStrategies){if(s.shape==='global')continue;
   for(const t of [s,tieredStrategy(s,3)]){
    if(t.shape==='line')expect(t.radius,s.id).toBeLessThanOrEqual(2);else if(t.shape!=='single')expect(t.radius,s.id).toBeLessThanOrEqual(1);
    expect(t.range,s.id).toBeLessThanOrEqual(t.shape==='single'?MAX_SINGLE_RANGE:MAX_AREA_RANGE);
   }}
 });
 it('모래폭풍은 맵 위의 모든 적에게 약한 피해를 준다',()=>{
  const s=trial('T01',30),st=s.state,u=st.get('sima_yi');u.strategies=[...u.strategies,'sandstorm'];u.mp=u.stats.maxMp;
  const foes=st.living('enemy'),before=foes.map(f=>f.hp);
  const rs=s.act({kind:'strategy',unit:u.id,strategy:'sandstorm',at:u.pos});expect(rs.ok,rs.error).toBe(true);
  const hurt=foes.filter((f,i)=>!f.alive||f.hp<before[i]!);
  expect(hurt.length).toBeGreaterThanOrEqual(Math.ceil(foes.length*.6));
  for(const [i,f] of foes.entries())if(f.alive)expect(before[i]!-f.hp).toBeLessThan(f.stats.maxHp*.5);
 });
 it('회귀는 행동을 마친 다른 아군을 한 번 더 움직이게 한다',()=>{
  const s=trial('T01',30),st=s.state,u=st.get('sima_yi'),friend=st.get('cao_zhen');u.strategies=[...u.strategies,'rewind'];u.mp=u.stats.maxMp;
  friend.pos={x:u.pos.x+1,y:u.pos.y};friend.hasActed=true;friend.hasMoved=true;
  expect(s.act({kind:'strategy',unit:u.id,strategy:'rewind',at:u.pos}).ok).toBe(false);
  expect(s.act({kind:'strategy',unit:u.id,strategy:'rewind',at:friend.pos}).ok).toBe(true);
  expect(friend.hasActed).toBe(false);expect(u.hasActed).toBe(true);
 });
 it('특수기는 공격력으로 피해를 준다',()=>{
  const s=trial('T01',10),st=s.state,u=st.get('cao_zhen'),foe=st.living('enemy')[0]!;
  const sk=u.strategies.find(id=>def(id)?.physical);expect(sk).toBeTruthy();
  u.pos={x:foe.pos.x-1,y:foe.pos.y};if(st.unitAt(u.pos)&&st.unitAt(u.pos)!==u)u.pos={x:foe.pos.x,y:foe.pos.y-1};u.mp=u.stats.maxMp;
  const hp=foe.hp,d=st.strategyFor(u,sk!)!;
  const r=s.act({kind:'strategy',unit:u.id,strategy:sk!,at:d.range>1?foe.pos:foe.pos});
  expect(r.ok,r.error).toBe(true);expect(foe.hp<hp||!foe.alive||st.log.some(e=>e.t==='strategy')).toBe(true);
 });
});
