import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {navalCrewRow,oarAngle,navalCrews} from '../src/naval-art.ts';
import {trialMap} from '../src/expedition-scenes.ts';
import {expeditions} from '../src/expeditions.ts';
import {CONTROLLABLE,decide,key,manhattan} from '../../core/src/index.ts';
import {structureKind} from '../src/campaign-rules.ts';
import {placeFor,classFamily,degree,placeThemes,familyMotifs} from '../src/music.ts';
import {supportOptions} from '../src/troops.ts';
import type {Coord} from '../../core/src/index.ts';
function fort(){const d=deployment(freshCampaign(),true);/* Q02: 성 안의 적이 절반 — 성을 치는 수련 */for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,3);d.mission={id:'Q02',runId:'siege',version:4,balance:1,supportClasses:['engineer','catapult']};return new Session(7,'normal',215,'survival',4,d);}
function allyPhase(s:Session){for(let i=0;i<40&&s.state.currentSide!=='ally';i++){const u=s.state.living(s.state.currentSide).find(x=>!x.hasActed);if(CONTROLLABLE.has(s.state.currentSide)&&u)s.act({kind:'wait',unit:u.id});else s.tick();}expect(s.state.currentSide).toBe('ally');}
function freeNeighbour(s:Session,at:Coord){return [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].map(d=>({x:at.x+d.x,y:at.y+d.y})).find(p=>s.state.map.inBounds(p)&&!s.state.unitAt(p)&&['plain','road'].includes(s.state.map.tileAt(p).terrain));}
function naval(seed=215){const d=deployment(freshCampaign(),true);for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,11);d.mission={id:'T07',runId:'naval-'+seed,version:4,balance:1,supportClasses:['crossbow','fengshui']};return new Session(7,'normal',seed,'survival',4,d);}
function play(s:Session){for(let i=0;i<1200&&s.state.outcome==='ongoing';i++){const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.tick();continue;}for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;s.act(cmd);if(st.outcome!=='ongoing')break;}if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});}}
describe('naval battles',()=>{
 it('launches two allied boats on the water against an enemy river fleet',()=>{
  const s=naval(),st=s.state,boats=st.living().filter(u=>u.unitClass==='navy');
  expect(boats.filter(u=>u.side==='ally')).toHaveLength(2);expect(boats.filter(u=>u.side==='enemy')).toHaveLength(3);
  for(const u of boats)expect(['water','rapids','marsh']).toContain(st.map.tileAt(u.pos).terrain);
  for(const u of st.living())expect(st.map.moveCost(u.unitClass,u.pos)).toBeLessThan(Infinity);
  const rows=trialMap('T07','장강 수군 조련').rows;expect(rows.some(r=>r.includes('r'))).toBe(true);expect(rows[0]).toMatch(/X/);
 });
 it('can be won with boats fighting on the river',()=>{for(const seed of [215,216]){const s=naval(seed);play(s);expect(s.state.outcome).toBe('victory');expect(s.state.log.some(e=>e.t==='attack'&&s.state.find(e.attacker)?.unitClass==='navy'&&s.state.find(e.attacker)?.side!=='enemy')).toBe(true);}});
 it('keeps a stable crew per boat and sweeps oars between poses',()=>{
  expect(navalCrewRow('granted_navy_0')).toBe(navalCrewRow('granted_navy_0'));expect(navalCrewRow('x','강안 궁병')).toBe(2);expect(navalCrewRow('x','지휘선')).toBe(3);
  expect(navalCrews.map(c=>c.sourceRow)).toEqual([0,1,2,4]);expect(new Set([0,1,2,3].map(oarAngle)).size).toBe(4);
 });
});
describe('siege works',()=>{
 it('lets engineers repair the siege ram and raise a limited number of barricades',()=>{
  const s=fort();allyPhase(s);const st=s.state,engineer=st.living('ally').find(u=>u.unitClass==='engineer')!,ram=st.get('siege_crew');
  expect(supportOptions).toContain('engineer');
  const spot=freeNeighbour(s,ram.pos)!;engineer.pos=spot;ram.hp=20;
  expect(s.act({kind:'item',unit:engineer.id,item:'repair',target:ram.id}).ok).toBe(true);expect(ram.hp).toBeGreaterThan(20);
  const enemy=st.living('enemy').find(u=>!structureKind(u.id))!;expect(s.act({kind:'item',unit:st.living('ally').find(u=>u.unitClass==='catapult')!.id,item:'repair',target:ram.id}).ok).toBe(false);
  expect(enemy).toBeDefined();
  const fresh=fort();allyPhase(fresh);const eng=fresh.state.living('ally').find(u=>u.unitClass==='engineer')!,cell=freeNeighbour(fresh,eng.pos)!;
  expect(fresh.act({kind:'item',unit:eng.id,item:'fortify',target:'99,99'}).ok).toBe(false);
  expect(fresh.act({kind:'item',unit:eng.id,item:'fortify',target:cell.x+','+cell.y}).ok).toBe(true);
  const work=fresh.state.unitAt(cell)!;expect(structureKind(work.id)).toBe('barricade');expect(work.side).toBe('allyAi');expect(work.stats.attack).toBe(0);expect(fresh.barricadesLeft(eng.id)).toBe(1);
  expect(Session.load(fresh.save()).state.snapshot()).toEqual(fresh.state.snapshot());
 });
 it('rallies the assault when the gate falls',()=>{
  const s=fort();allyPhase(s);const st=s.state,ram=st.get('siege_crew'),gate=st.living('enemy').find(u=>structureKind(u.id)==='gate')!;
  const spot=freeNeighbour(s,gate.pos)!;ram.pos=spot;gate.hp=1;
  expect(s.act({kind:'attack',unit:ram.id,target:gate.id}).ok).toBe(true);expect(gate.alive).toBe(false);
  expect(ram.statuses.some(x=>x.kind==='rally')).toBe(true);
  for(const u of st.living().filter(u=>u.side!=='enemy'&&manhattan(u.pos,gate.pos)>2))expect(u.statuses.some(x=>x.kind==='rally')).toBe(false);
 });
});
describe('procedural score',()=>{
 it('picks a place theme for every story stage, expedition landscape and raw map',()=>{
  expect(placeFor('S1-05')).toBe('river');expect(placeFor('S1-06')).toBe('fortress');expect(placeFor('S1-04')).toBe('court');
  expect(placeFor('T07')).toBe('naval');expect(placeFor('Q02')).toBe('fortress');expect(placeFor('T02')).toBe('forest');
  expect(placeFor('X',Array(10).fill('water'))).toBe('naval');expect(placeFor('X',['plain','gate','wall'])).toBe('fortress');expect(placeFor('X',['plain'])).toBe('field');
  for(const theme of Object.values(placeThemes)){expect(theme.mode).toHaveLength(5);expect(theme.phrase).toHaveLength(16);expect(degree(theme,5)).toBe(theme.root+12);expect(degree(theme,-1)).toBeLessThan(theme.root);}
 });
 it('gives each troop family its own motif',()=>{
  expect(classFamily('cavalry')).toBe('horse');expect(classFamily('horseArcher')).toBe('horse');expect(classFamily('crossbow')).toBe('bow');expect(classFamily('fengshui')).toBe('sage');
  expect(classFamily('ram')).toBe('siege');expect(classFamily('navy')).toBe('boat');expect(classFamily('monk')).toBe('foot');expect(classFamily(undefined)).toBeUndefined();
  expect(new Set(Object.values(familyMotifs).map(m=>m.name)).size).toBe(7);
 });
});
function carefulPlay(s:Session){for(let i=0;i<1500&&s.state.outcome==='ongoing';i++){
 const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.tick();continue;}
 if(u.hp<u.stats.maxHp*.5&&u.canUseItems&&s.medicine){s.act({kind:'item',unit:u.id,item:'medicine'});continue;}
 if(u.unitClass==='fengshui'&&u.mp>=8){const target=st.living().filter(t=>t.side!=='enemy'&&t.hp<t.stats.maxHp-20&&manhattan(t.pos,u.pos)<=3).sort((a,b)=>a.hp/a.stats.maxHp-b.hp/b.stats.maxHp)[0];if(target){s.act({kind:'item',unit:u.id,item:'heal',target:target.id});continue;}}
 if(u.id==='sima_yi'&&(u.mp<5||u.hp<u.stats.maxHp*.45)){const safe=[...st.map.reachable(u,st.occupancy()).keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};}).filter(p=>st.living('enemy').every(e=>manhattan(p,e.pos)>e.range[1]+1)).sort((a,b)=>manhattan(a,u.pos)-manhattan(b,u.pos))[0];if(safe&&key(safe)!==key(u.pos))s.act({kind:'move',unit:u.id,to:safe});s.act({kind:'wait',unit:u.id});continue;}
 for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;s.act(cmd);if(st.outcome!=='ongoing')break;}if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});
}}
describe('hand-drawn expedition maps',()=>{
 function v4(id:string,level:number,seed=215){const d=deployment(freshCampaign(),true);for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,level);d.mission={id,runId:'map-'+id,version:4,balance:1,supportClasses:['infantry','fengshui']};return new Session(7,'normal',seed,'survival',4,d);}
 // 도전 4단계부터는 권장 레벨보다 높게 단련한 부대로 넘도록 설계했다(이 봇은 보물·연구 없이 싸운다).
 it.each(expeditions.map(m=>[m.id,m.kind==='challenge'&&m.step!>3?m.level+(m.step!>=10?15:m.step!>=9?12:8):m.level] as const))('%s scatters starts and can be won in a straight fight',(id,level)=>{
  const s=v4(id,level),st=s.state,heroes=st.living('player'),enemies=st.living('enemy').filter(u=>!structureKind(u.id));
  // Starts are spread: the two support units do not stand in the heroes' column.
  const support=st.living('ally').filter(u=>u.id.startsWith('granted_')&&u.unitClass!=='navy');
  expect(support.some(u=>heroes.every(h=>manhattan(h.pos,u.pos)>1))).toBe(true);
  expect(new Set(enemies.map(e=>e.pos.x)).size).toBeGreaterThan(2);expect(new Set(enemies.map(e=>e.pos.y)).size).toBeGreaterThan(2);
  st.victory=[{type:'annihilate',side:'enemy'}];st.defeat=st.defeat.filter(c=>c.type==='retreat'&&['sima_yi','cao_zhen'].includes(c.unit??''));
  // Escort and rescue targets are protected objectives, not enemies to cut down here.
  for(const id of ['rescue_target','convoy_trial']){const u=st.find(id);if(u){u.side='ally';u.behavior='passive';}}
  carefulPlay(s);expect(s.state.outcome,JSON.stringify({id,turn:s.state.turn,failure:s.failure,lost:s.state.log.filter(e=>e.t==='retreat').map(e=>(e as {unit:string}).unit),left:s.state.living('enemy').map(u=>u.id+'@'+u.pos.x+','+u.pos.y),ours:s.state.living().filter(u=>u.side!=='enemy').map(u=>u.id+'@'+u.pos.x+','+u.pos.y)})).toBe('victory');
 });
 it('uses real terrain features: cliffs, plank roads, fords, reeds and rapids',()=>{
  const all=expeditions.map(m=>trialMap(m.id,m.name).rows.join('')).join('');
  for(const ch of ['X','p','~','m','r'])expect(all).toContain(ch);
  expect(trialMap('Q03','검각').rows.join('')).toMatch(/p{3,}/);
 });
});
