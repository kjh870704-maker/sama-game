import {encounterLevels} from '../src/campaign-rules.ts';
import {describe,it,expect} from 'vitest';
import {freshCampaign,award,deployment,levelInfo,equip} from '../src/progression.ts';
import {Session,campaignOrder,chapters} from '../src/session.ts';
import {decide} from '../../core/src/index.ts';

describe('persistent campaign growth and siege',()=>{
 it('grows gradually and prevents repeat, failed and undo reward farming',()=>{
  const c=freshCampaign(),levels=[1];
  for(const chapter of campaignOrder){const id=chapters[chapter]!.stage.id;expect(award(c,id,'normal',[],[]).xp).toBe(0);expect(award(c,id,'normal',['sima_lang'],[1]).xp).toBe(140);levels.push(levelInfo(c.xp.sima_yi!).level);expect(award(c,id,'normal',[],[1]).xp).toBe(0);}
  expect(levels.slice(0,9)).toEqual([1,2,3,4,5,6,6,7,8]);levels.forEach((l,i)=>{if(i)expect(l-levels[i-1]!).toBeGreaterThanOrEqual(0);if(i)expect(l-levels[i-1]!).toBeLessThanOrEqual(1);});expect(c.treasures).toHaveLength(16);
 });
 it('keeps equipment unique and stores deployment separately from later growth',()=>{
  const c=freshCampaign();award(c,'S1-01','normal',[],[1]);expect(equip(c,'sima_yi','taiping')).toBe(true);expect(equip(c,'sima_lang','taiping')).toBe(true);expect(c.equipped.sima_yi).toBeUndefined();expect(equip(c,'sima_yi','qinggang')).toBe(false);
  const s=new Session(0,'normal',215,'survival',3,deployment(c));const before=s.state.snapshot();award(c,'S1-02','normal',[],[1]);expect(Session.load(JSON.parse(JSON.stringify(s.save()))).state.snapshot()).toEqual(before);expect(s.state.get('sima_yi').level).toBe(2);
 });
 it('keeps scenario sizes distinct and all campaign enemies in early level bands',()=>{
  const c=freshCampaign();for(const chapter of campaignOrder){const s=new Session(chapter,'normal',215,'survival',3,deployment(c));expect(s.state.map.width).toBeLessThanOrEqual(48);expect(s.state.map.height).toBeLessThanOrEqual(36);expect(s.state.living('enemy').every(u=>u.level<=(encounterLevels[s.state.stage.id]??7)+1)).toBe(true);award(c,s.state.stage.id,'normal',[],[1]);}
 });
 it('blocks gate movement until destroyed, and towers attack without moving',()=>{
  const s=new Session(1,'normal',215,'survival',3,deployment(freshCampaign())),st=s.state,gate=st.get('gate_33_12'),hero=st.get('cao_zhen');
  hero.pos={x:32,y:12};expect(st.map.reachable(hero,st.occupancy()).has('33,12')).toBe(false);
  gate.hp=1;hero.traits.push('alwaysHit');expect(s.act({kind:'attack',unit:hero.id,target:gate.id}).ok).toBe(true);expect(gate.alive).toBe(false);expect(st.unitAt(gate.pos)).toBeUndefined();expect(st.map.reachable(hero,st.occupancy()).has('33,12')).toBe(true);
  const tower=st.get('tower_33_16');hero.pos={x:32,y:16};const hp=hero.hp;s.battle.endPhase();s.battle.endPhase();const commands=decide(st,tower);expect(commands.some(c=>c.kind==='move')).toBe(false);for(const cmd of commands)s.battle.execute(cmd);expect(hero.hp).toBeLessThan(hp);
 });
 it('replays new fortifications and new support types deterministically',()=>{
  const s=new Session(1,'normal',215,'survival',3,deployment(freshCampaign()));expect(s.state.living('ally').map(u=>u.unitClass)).toContain('crossbow');expect(s.state.living('ally').map(u=>u.unitClass)).toContain('fengshui');s.act({kind:'endPhase'});s.act({kind:'endPhase'});s.tick();expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());
 });
});
