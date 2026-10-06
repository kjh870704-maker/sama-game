import {describe,it,expect} from 'vitest';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';

const at=(id:string)=>chapters.findIndex(c=>c.stage.id===id);
const open=(id:string,d:'normal'|'extreme'='normal')=>new Session(at(id),d,215,'survival',4,deployment(freshCampaign(),true));
describe('중편 · 무위 반란 진압전',()=>{
 it('follows the upper arc in campaign order',()=>{expect(campaignOrder.indexOf(at('S2-01'))).toBe(campaignOrder.indexOf(at('S1-11'))+1);});
 it('holds the citadel with a warden and sends no siege rams to a defence',()=>{
  const s=open('S2-01');expect(s.state.get('citadel_warden').pos).toEqual({x:5,y:7});
  expect([...s.state.units.values()].some(u=>u.unitClass==='ram')).toBe(false);
  expect(s.state.get('rebel_shaman').traits).toContain('strategyReflect');
  expect(s.sealNames[0]).toBe('반란 진압');
 });
});
describe('중편 · 동구 전투',()=>{
 it('launches the granted ships on the river, not the bank',()=>{
  const s=open('S2-02'),ships=s.state.living('ally').filter(u=>u.unitClass==='navy');
  expect(ships).toHaveLength(2);for(const b of ships)expect(s.state.map.tileAt(b.pos).terrain).toBe('water');
 });
 it('warns of the first lightning on turn one so it can be dodged',()=>{
  const s=open('S2-02');expect(s.state.telegraphs).toHaveLength(1);expect(s.state.telegraphs[0]!.at).toBe(2);expect(s.state.telegraphs[0]!.label).toBe('낙뢰');
 });
});
describe('중편 · 광릉 전투',()=>{
 it('fields Cao Zhen without Sima Yi and requires Gao Shou before the escape',()=>{
  const s=open('S2-03');expect(s.state.find('sima_yi')).toBeUndefined();expect(s.state.get('cao_zhen').side).toBe('player');
  expect(s.state.victory.map(v=>v.type)).toEqual(['retreat','reach']);expect(s.state.get('cao_pi').range).toEqual([0,0]);
 });
});
describe('중편 · 양양 전투',()=>{
 it('starts the eight-turn hold on its own and shows the turns left',()=>{
  const s=open('S2-04');expect(s.state.survivalClocks.get('xiangyang')).toBe(1);expect(s.phase).toContain('8턴 남음');
  expect(s.state.get('gate_captain').pos).toEqual({x:4,y:6});
  for(const u of s.state.living('player'))expect(s.state.map.tileAt(u.pos).terrain).not.toBe('wall');
 });
});
import {subject,stageRules} from '../src/stage-rules.ts';
import {CONTROLLABLE} from '../../core/src/index.ts';
describe('중편 · 맹달 차단전',()=>{
 it('trades fatigue against relief armies at the march choice',()=>{
  const forced=open('S2-05');expect(forced.state.activeDialogue).toBe('march');
  const hero=forced.state.get('sima_yi'),full=hero.hp;forced.act({kind:'choose',nodeId:'march',optionId:'forced'});
  expect(hero.hp).toBeLessThan(full);expect(forced.state.find('shu_relief')).toBeUndefined();
  const steady=open('S2-05');steady.act({kind:'choose',nodeId:'march',optionId:'steady'});
  expect(steady.state.get('sima_yi').hp).toBe(steady.state.get('sima_yi').stats.maxHp);expect(steady.state.get('shu_relief').alive).toBe(true);
 });
 it('walls Xincheng with a breakable gate, towers and a ram for the sons',()=>{
  const s=open('S2-05'),units=[...s.state.units.values()];
  expect(units.some(u=>u.id.startsWith('gate_'))).toBe(true);expect(units.some(u=>u.id.startsWith('tower_'))).toBe(true);expect(units.some(u=>u.unitClass==='ram')).toBe(true);
  expect(s.state.get('sima_shi').side).toBe('ally');
 });
 it('fails after the fourteenth turn and names the fallen with the right particle',()=>{
  expect(subject('사마소')).toBe('사마소가');expect(subject('맹달')).toBe('맹달이');
 });
});
const toPlayer=(s:Session)=>{for(let i=0;i<3000&&s.state.currentSide!=='player'&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}};
describe('중편 · 가정 전투',()=>{
 it('makes the hill camp sturdy until the spring is cut, then breaks it toward the south exit',()=>{
  const s=open('S2-06'),ma=s.state.get('ma_su'),def=ma.stats.defense,hp=ma.stats.maxHp;
  expect(s.phase).toContain('물 잔량 4/4');
  s.state.survivalClocks.set('water_cut',4);s.act({kind:'endPhase'});
  expect(s.state.firedEvents.has('jieting/collapse')).toBe(true);expect(s.phase).toContain('도주 저지');
  expect(ma.stats.defense).toBe(def-3);expect(ma.stats.maxHp).toBe(Math.round(hp/1.5));expect(ma.behavior).toBe('escortee');
 });
 it('counts the units that slip through the south exit and fails past the limit',()=>{
  const s=open('S2-06');s.state.survivalClocks.set('water_cut',4);s.act({kind:'endPhase'});
  toPlayer(s);
  const runners=['hill_spear','hill_bow','hill_foot_a'].map(id=>s.state.get(id));
  runners[0]!.pos={x:9,y:15};runners[1]!.pos={x:10,y:15};s.act({kind:'endPhase'});
  expect(s.state.survivalClocks.get('escaped')).toBe(2);expect(s.seals).not.toContain(2);expect(s.state.outcome).not.toBe('defeat');
  toPlayer(s);
  if(s.state.outcome==='ongoing'){runners[2]!.pos={x:9,y:15};s.act({kind:'endPhase'});}
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('남쪽 출구');
 });
});
describe('중편 · 양평관 추격전',()=>{
 it('asks for the route first and names its risks',()=>{
  const s=open('S2-07');expect(s.state.activeDialogue).toBe('route');
  s.act({kind:'choose',nodeId:'route',optionId:'valley'});expect(s.state.find('ambush_0')?.alive).toBe(true);
  const p=open('S2-07');p.act({kind:'choose',nodeId:'route',optionId:'plank'});expect(p.state.find('ambush_0')).toBeUndefined();expect(p.state.scenarioPhase).toBe('잔도 · 낙석 주의');
 });
 it('lets Wei Yan run for the pass alone and still leaves enough foes to win by count',()=>{
  const s=open('S2-07');s.act({kind:'choose',nodeId:'route',optionId:'valley'});
  for(let i=0;i<3000&&s.state.turn<6&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  expect(s.state.outcome).toBe('ongoing');
  const wei=s.state.get('wei_yan');expect(wei.behavior).toBe('flee');expect(s.state.find('wei_guard_0')?.behavior).toBe('hold');
  wei.pos={x:0,y:9};toPlayer(s);wei.pos={x:0,y:7};s.act({kind:'endPhase'});
  expect(s.state.find('wei_yan')).toBeUndefined();expect(s.phase).toContain('위연 탈출');
  expect(s.state.living('enemy').length+s.state.losses.enemy).toBeGreaterThanOrEqual(7);
 });
});
describe('중편 · 석정 전투',()=>{
 it('anchors Sima Yi on the ridge and walls the gorge with barricades',()=>{
  const s=open('S2-08'),yi=s.state.get('sima_yi');
  expect(yi.pos).toEqual({x:11,y:4});expect(yi.stats.movement).toBe(0);
  for(const id of ['barricade_9_6','barricade_9_7','barricade_9_8'])expect(s.state.get(id).side).toBe('enemy');
  expect(s.state.get('sima_shi').side).toBe('ally');expect(s.state.get('sima_zhao').side).toBe('ally');
  expect(s.phase).toContain('진영 도착 0/2');expect(s.phase).toContain('버팀 14턴');
 });
 it('wins when both sons stand in the camp, not just one',()=>{
  const s=open('S2-08');s.state.get('sima_shi').pos={x:20,y:8};s.act({kind:'endPhase'});expect(s.state.outcome).toBe('ongoing');
  toPlayer(s);s.state.get('sima_shi').pos={x:20,y:8};s.state.get('sima_zhao').pos={x:22,y:8};s.act({kind:'endPhase'});expect(s.state.outcome).toBe('victory');
 });
});
describe('중편 · 성고 전투',()=>{
 it('marks the flooded river as impassable and points to the mountain road',()=>{
  const s=open('S2-09');expect(s.state.map.tileAt({x:9,y:13}).terrain).toBe('water');
  expect(stageRules['S2-09']!.labels!.map(l=>l.text).join()).toContain('도하 불가');expect(stageRules['S2-09']!.labels!.map(l=>l.text).join()).toContain('북쪽 산길');
  expect(s.state.get('shu_catapult').stats.movement).toBe(0);expect(s.phase).toContain('대릉 체력 100%');
 });
 it('opens the envoy talk once the citadel is taken and rewards reading the letter',()=>{
  const s=open('S2-09');
  for(const id of ['citadel_captain','citadel_bow','citadel_xbow'])s.state.retreat(s.state.get(id));
  const yi=s.state.get('sima_yi');yi.pos={x:20,y:3};
  expect(s.act({kind:'capture',unit:'sima_yi',region:'citadel'}).ok).toBe(true);
  expect(s.state.activeDialogue).toBe('envoy');expect(s.state.hasStatus(s.state.get('shu_catapult'),'confusion')).toBe(true);
  s.act({kind:'choose',nodeId:'envoy',optionId:'letter'});
  expect(s.state.outcome).toBe('victory');expect(s.seals).toContain(3);
 });
});
describe('중편 · 상규 전투',()=>{
 it('opens with a burning field and hidden ravine traps',()=>{
  const s=open('S2-10');expect(s.state.map.tileAt({x:14,y:7}).hazard).toBe('fire');expect(s.state.map.tileAt({x:16,y:12}).hazard).toBe('trap');
  expect(s.phase).toContain('고상과 출구 사이 11칸');
 });
 it('fails when Gao Xiang reaches the western exit with the wheat',()=>{
  const s=open('S2-10');
  for(let i=0;i<3000&&s.state.turn<4&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  toPlayer(s);s.act({kind:'endPhase'});const gao=s.state.get('gao_xiang');expect(gao.behavior).toBe('flee');expect(gao.stats.movement).toBe(3);
  gao.pos={x:0,y:7};toPlayer(s);if(s.state.outcome==='ongoing')s.act({kind:'endPhase'});
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('서쪽 골짜기');
 });
});
describe('중편 · 목둔 골짜기 전투',()=>{
 it('fails if the vanguard falls before the main body joins',()=>{
  const s=open('S2-11');expect(s.phase).toContain('장합과 본대 사이');
  s.state.retreat(s.state.get('zhang_he'));s.act({kind:'endPhase'});
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('고립');
 });
 it('lets Zhang He fall as a story event, not a loss, then turns the army home',()=>{
  const s=open('S2-11');s.state.get('zhang_he').pos={x:7,y:7};s.act({kind:'endPhase'});toPlayer(s);
  expect(s.state.scenarioPhase).toBe('본대 합류');
  s.state.get('sima_yi').pos={x:10,y:7};s.act({kind:'endPhase'});expect(s.state.scenarioPhase).toBe('목문도');
  for(let i=0;i<3000&&!s.state.activeDialogue&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  expect(s.state.activeDialogue).toBe('mumen_turn');expect(s.state.find('zhang_he')).toBeUndefined();
  expect(s.state.losses.ally+s.state.losses.player+s.state.losses.allyAi).toBe(0);
  s.act({kind:'choose',nodeId:'mumen_turn',optionId:'withdraw'});expect(s.state.outcome).toBe('ongoing');
  expect(s.state.victory).toEqual([{type:'reach',unit:'sima_yi',target:'retreat_exit'}]);
 });
});
describe('중편 · 위수 수비전',()=>{
 it('warns of each flank crossing two turns ahead without striking anyone',()=>{
  const s=open('S2-12');expect(s.phase).toContain('격퇴 0/7');
  for(let i=0;i<3000&&s.state.turn<3&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  const warn=s.state.telegraphs.find(t=>t.label==='서쪽 여울 증원');expect(warn?.ratio).toBe(0);expect(warn?.at).toBe(5);
  expect(s.phase).toContain('서쪽 여울 예고');
 });
 it('fails if Shu takes the north-bank camp',()=>{
  const s=open('S2-12');s.state.captured.set('north_camp','enemy');s.act({kind:'endPhase'});
  expect(s.state.outcome).toBe('defeat');expect(s.failure).toContain('북안 진영');
 });
});
describe('중편 · 호로곡 탈출전',()=>{
 it('announces the hold before the join and keeps rock shelter out of the bombardment',()=>{
  const s=open('S2-13');expect(s.phase).toContain('합류 뒤 7턴 버티기');
  const yi=s.state.get('sima_yi');yi.pos={x:11,y:6};yi.stats.maxHp=yi.hp=999;yi.stats.defense=99;
  for(let i=0;i<3000&&s.state.turn<2&&s.state.outcome==='ongoing';i++){if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  const fire=s.state.telegraphs.find(t=>t.label==='화공 포격');expect(fire).toBeDefined();
  expect(fire!.cells.some(c=>c.x===11&&c.y===5)).toBe(false);expect(fire!.cells.some(c=>c.x===11&&c.y===6)).toBe(true);
 });
 it('starts the seven-turn hold on joining, then the rain opens the west gate',()=>{
  const s=open('S2-13');expect(s.state.map.tileAt({x:0,y:7}).terrain).toBe('cliff');
  s.state.get('sima_yi').pos={x:11,y:7};s.state.get('sima_shi').pos={x:12,y:7};s.act({kind:'endPhase'});
  expect(s.state.scenarioPhase).toBe('버티기');expect(s.phase).toContain('비까지 7턴');
  for(let i=0;i<20000&&!s.state.activeDialogue&&s.state.outcome==='ongoing';i++){
   for(const id of ['sima_yi','sima_shi','sima_zhao']){const u=s.state.find(id);if(u?.alive)u.hp=u.stats.maxHp;}
   if(CONTROLLABLE.has(s.state.currentSide))s.act({kind:'endPhase'});else s.tick();}
  expect(s.state.activeDialogue).toBe('hulu_rain');expect(s.state.map.tileAt({x:0,y:7}).terrain).toBe('road');
  s.act({kind:'choose',nodeId:'hulu_rain',optionId:'run'});expect(s.state.victory).toEqual([{type:'reach',unit:'sima_yi',target:'exit'}]);
 });
});
describe('중편 · 오장원 추격전',()=>{
 it('ends the chase the moment the banner turns, panicking all but Sima Yi',()=>{
  const s=open('S2-14');expect(s.phase).toContain('저지 0/4');expect(s.medicine).toBe(3);
  for(const id of ['column_0','column_1','column_2','column_3'])s.state.retreat(s.state.get(id));
  s.act({kind:'endPhase'});
  expect(s.state.firedEvents.has('wuzhang/banner')).toBe(true);expect(s.state.activeDialogue).toBe('banner');
  expect(s.state.living('enemy').some(u=>u.behavior==='flee')).toBe(false);expect(s.state.find('jiang_wei')?.alive).toBe(true);
  expect(s.state.hasStatus(s.state.get('sima_yi'),'confusion')).toBe(false);
  const others=[...s.state.living('player'),...s.state.living('ally')].filter(u=>u.id!=='sima_yi');expect(others.length).toBeGreaterThan(0);expect(others.every(u=>s.state.hasStatus(u,'confusion'))).toBe(true);
  s.act({kind:'choose',nodeId:'banner',optionId:'withdraw'});expect(s.state.victory).toEqual([{type:'reach',unit:'sima_yi',target:'east_exit'}]);
  expect(s.somber).toBe(true);
 });
 it('lets first aid calm a confused ally within two tiles',()=>{
  const s=open('S2-14');for(const u of [...s.state.living('player'),...s.state.living('ally')]){u.stats.maxHp=u.hp=999;u.stats.defense=99;}
  s.state.turn=6;s.act({kind:'endPhase'});s.act({kind:'choose',nodeId:'banner',optionId:'withdraw'});
  toPlayer(s);
  const yi=s.state.get('sima_yi'),near=[...s.state.living('player'),...s.state.living('ally')].find(u=>u.id!=='sima_yi'&&Math.abs(u.pos.x-yi.pos.x)+Math.abs(u.pos.y-yi.pos.y)<=2&&s.state.hasStatus(u,'confusion'));
  expect(near).toBeDefined();const before=s.medicine;
  expect(s.act({kind:'item',unit:'sima_yi',item:'calm',target:near!.id}).ok).toBe(true);
  expect(s.state.hasStatus(near!,'confusion')).toBe(false);expect(s.medicine).toBe(before-1);
 });
});
