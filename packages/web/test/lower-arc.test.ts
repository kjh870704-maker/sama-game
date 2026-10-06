import {describe,it,expect} from 'vitest';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {stageRules} from '../src/stage-rules.ts';
import {CONTROLLABLE} from '../../core/src/index.ts';

const at=(id:string)=>chapters.findIndex(c=>c.stage.id===id);
const open=(id:string,d:'normal'|'extreme'='normal')=>new Session(at(id),d,215,'survival',4,deployment(freshCampaign(),true));
describe('하편 · 요수 전투',()=>{
 it('follows the middle arc in campaign order',()=>{expect(campaignOrder.indexOf(at('S3-01'))).toBe(campaignOrder.indexOf(at('S2-14'))+1);expect(open('S3-01').state.stage.arc).toBe('lower');});
 it('swings the Yan line south when the banners stand at the south ford, then collapses it on the north crossing',()=>{
  const s=open('S3-01');expect(s.phase).toContain('깃발대를 남쪽 여울로');
  s.state.get('feint_banner_0').pos={x:10,y:11};s.act({kind:'endPhase'});
  expect(s.state.firedEvents.has('liaoshui/feint')).toBe(true);expect(s.state.get('yan_line_0').behavior).toBe('race');expect(s.state.get('yan_line_0').goalRegion).toBe('south_guard');
  s.state.get('sima_yi').pos={x:13,y:3};s.act({kind:'endPhase'});
  expect(s.state.firedEvents.has('liaoshui/collapse')).toBe(true);expect(s.state.hasStatus(s.state.get('bi_yan'),'confusion')).toBe(true);
  expect(stageRules['S3-01']!.seals!({state:s.state,difficulty:'normal',journalLength:0})).toContain(2);
 });
 it('gives no collapse when the main body crosses north before the feint',()=>{
  const s=open('S3-01');s.state.get('sima_yi').pos={x:13,y:3};s.act({kind:'wait',unit:'sima_yi'});
  expect(s.phase).toContain('양동 없이 도하');
  s.state.get('feint_banner_0').pos={x:10,y:11};s.act({kind:'endPhase'});
  expect(s.state.firedEvents.has('liaoshui/collapse')).toBe(false);
 });
});
describe('하편 · 공손연 진압전',()=>{
 it('feeds the garrison while granaries stand, then sends out three identical banners',()=>{
  const s=open('S3-02');expect(s.phase).toContain('남은 군량고 2/2');
  for(const id of ['convoy_depot_a','convoy_depot_b'])s.state.retreat(s.state.get(id));s.act({kind:'endPhase'});
  const flags=s.state.living('enemy').filter(u=>u.name==='공손연');expect(flags).toHaveLength(3);
  expect(s.phase).toContain('성을 버릴 채비');expect(s.state.get('gongsun_yuan').behavior).not.toBe('flee');
 });
 it('reveals the decoys to a scout and fails if the real Gongsun Yuan leaves by a gate',()=>{
  const s=open('S3-02');for(const id of ['convoy_depot_a','convoy_depot_b'])s.state.retreat(s.state.get(id));s.act({kind:'endPhase'});
  const scout=s.state.living('ally').find(u=>!u.hasActed&&u.canUseItems!==false)??s.state.living('ally')[0]!;
  s.act({kind:'item',unit:scout.id,item:'scout'});
  expect(s.state.living('enemy').filter(u=>u.name==='공손연')).toHaveLength(1);expect(s.state.living('enemy').filter(u=>u.name==='미끼 깃발대')).toHaveLength(2);
  const gy=s.state.get('gongsun_yuan');gy.pos={x:17,y:1};s.act({kind:'endPhase'});
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('공손연');
 });
});
describe('하편 · 번성 구원전',()=>{
 it('rallies the units standing within two tiles of Sima Yi once a turn',()=>{
  const s=open('S3-03'),yi=s.state.get('sima_yi');
  const near=[...s.state.living('player'),...s.state.living('ally')].find(u=>u.id!=='sima_yi')!;near.pos={x:yi.pos.x+1,y:yi.pos.y};
  s.act({kind:'wait',unit:'sima_yi'});expect(s.state.hasStatus(near,'rally')).toBe(true);
  expect(s.phase).toContain('수비대 2/2');
 });
 it('fails when Wu takes the keep',()=>{
  const s=open('S3-03');s.state.captured.set('keep','enemy');s.act({kind:'endPhase'});
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('번성 본채');
 });
});
describe('하편 · 환성 점령전',()=>{
 it('builds the bridge after the engineer holds the site for two player turns',()=>{
  const s=open('S3-04');expect(s.state.get('shield_0').traits).toContain('guardian');expect(s.state.get('far_xbow_0').traits).toContain('penetrate');
  const eng=s.state.get('engineer');eng.stats.maxHp=eng.hp=999;eng.stats.defense=99;eng.pos={x:11,y:9};
  const yi=s.state.get('sima_yi');yi.stats.maxHp=yi.hp=999;yi.stats.defense=99;
  expect(s.state.map.tileAt({x:11,y:8}).terrain).toBe('water');
  for(let i=0;i<5000&&!s.state.firedEvents.has('huancheng/bridge')&&s.state.outcome==='ongoing'&&s.state.turn<5;i++){eng.pos={x:11,y:9};if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  expect(s.state.firedEvents.has('huancheng/bridge')).toBe(true);expect(s.state.map.tileAt({x:11,y:8}).terrain).toBe('bridge');
  expect(s.state.victory).toEqual([{type:'retreat',unit:'zhuge_ke'}]);
 });
 it('fails when the engineer is lost before the bridge stands',()=>{
  const s=open('S3-04');s.state.retreat(s.state.get('engineer'));s.act({kind:'endPhase'});
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('공병');
 });
});
describe('하편 · 낙곡대전',()=>{
 it('fields Sima Zhao without his father and walks Cao Shuang into the valley after the fort falls',()=>{
  const s=open('S3-05');expect(s.state.find('sima_yi')).toBeUndefined();expect(s.state.get('sima_zhao').side).toBe('player');
  for(const u of s.state.living('enemy'))s.state.retreat(u);
  const zh=s.state.get('sima_zhao');zh.stats.maxHp=zh.hp=999;zh.pos={x:11,y:7};
  expect(s.act({kind:'capture',unit:'sima_zhao',region:'shu_fort'}).ok).toBe(true);
  expect(s.state.outcome).toBe('ongoing');expect(s.state.get('cao_shuang').behavior).toBe('race');expect(s.phase).toContain('노란 칸');
  const cs=s.state.get('cao_shuang');cs.stats.maxHp=cs.hp=999;
  for(let i=0;i<5000&&!s.state.activeDialogue&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();
   if(s.state.firedEvents.has('luogu/clue')&&!s.state.firedEvents.has('luogu/ambush'))expect(s.state.telegraphs.some(t=>t.label==='벼랑 위 깃발'&&t.ratio===0)).toBe(true);}
  expect(s.state.activeDialogue).toBe('luogu_turn');expect(s.state.get('cao_shuang').behavior).toBe('escortee');
  s.act({kind:'choose',nodeId:'luogu_turn',optionId:'escort'});expect(s.state.victory).toEqual([{type:'reach',unit:'cao_shuang',target:'exit'}]);
 });
});
describe('하편 · 낙양 점령전',()=>{
 it('keeps the guard firm and reinforcing until the armory falls, then flips the battlefield',()=>{
  const s=open('S3-06');s.act({kind:'wait',unit:'sima_yi'});
  expect(s.state.living('enemy').every(u=>s.state.hasStatus(u,'guard'))).toBe(true);expect(s.phase).toContain('적 견고');
  for(const u of s.state.living('enemy'))if(u.id.startsWith('armory'))s.state.retreat(u);
  s.state.get('sima_shi').pos={x:19,y:8};expect(s.act({kind:'capture',unit:'sima_shi',region:'armory'}).ok).toBe(true);
  expect(s.state.living('enemy').some(u=>s.state.hasStatus(u,'guard'))).toBe(false);
  expect(s.state.find('sima_shi')).toBeUndefined();expect(s.state.find('sima_zhao')).toBeUndefined();expect(s.state.losses.player).toBe(0);
  expect(s.state.hasStatus(s.state.get('sima_yi'),'rally')).toBe(true);expect(s.phase).toContain('증원 중지');
  expect(s.state.telegraphs.some(t=>t.label==='불길 예고'&&t.ratio===0)).toBe(true);expect(s.state.outcome).toBe('ongoing');
  const waves=s.state.log.filter(e=>e.t==='event'&&e.id==='coup/reinforce').length;
  for(let i=0;i<5000&&s.state.turn<3&&s.state.outcome==='ongoing';i++){const yi=s.state.get('sima_yi');yi.hp=yi.stats.maxHp;if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  expect(s.state.log.filter(e=>e.t==='event'&&e.id==='coup/reinforce').length).toBe(waves);
  expect(s.state.map.tileAt({x:11,y:5}).hazard).toBe('fire');
  expect(stageRules['S3-06']!.seals!({state:s.state,difficulty:'normal',journalLength:0})).toContain(2);
 });
 it('does not win by walking into Yongning before the armory is taken',()=>{
  const s=open('S3-06');s.state.get('sima_yi').pos={x:11,y:2};s.act({kind:'wait',unit:'sima_yi'});expect(s.state.outcome).toBe('ongoing');
 });
});
describe('하편 · 왕릉 진압전',()=>{
 it('opens the water gate when a warship reaches the canal end, then the courtyard storm begins',()=>{
  const s=open('S3-07');const ships=s.state.living('ally').filter(u=>u.unitClass==='navy');expect(ships).toHaveLength(2);
  for(const b of ships)expect(s.state.map.tileAt(b.pos).terrain).toBe('water');
  expect(s.state.map.tileAt({x:12,y:8}).terrain).toBe('wall');expect(s.somber).toBe(true);
  ships[0]!.pos={x:11,y:8};s.act({kind:'wait',unit:'sima_yi'});
  expect(s.state.map.tileAt({x:12,y:8}).terrain).toBe('road');expect(s.state.victory).toEqual([{type:'retreat',unit:'wang_ling'}]);
  expect(s.phase).toContain('육상 진입');
 });
 it('is the last stage of the 32-stage campaign',()=>{expect(chapters).toHaveLength(32);expect(chapters[campaignOrder.at(-1)!]!.stage.id).toBe('S3-07');});
});
import {epilogueLines} from '../src/story.ts';
describe('에필로그',()=>{
 it('reflects saved lives and the use of deception in the closing recap',()=>{
  const kind=epilogueLines({'S1-01:normal':[1,2],'S3-01:extreme':[1,2],'S3-06:normal':[1,2]}),hard=epilogueLines({});
  expect(kind[0]).toContain('한 사람도 잃지 않았다');expect(kind.join()).toContain('기만을 처음으로');expect(kind.at(-1)).toContain('두 아들은 모두 살아서');
  expect(hard[0]).toContain('지킬 수 있는 것만');expect(hard).toHaveLength(8);
 });
});
