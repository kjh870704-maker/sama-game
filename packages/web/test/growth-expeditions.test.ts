import {growthMilestones} from '../src/growth-milestones.ts';
import {trialMap,trialStory} from '../src/expedition-scenes.ts';
import {describe,it,expect,vi} from 'vitest';
import {Session} from '../src/session.ts';
import {freshCampaign,deployment,award,treasures,readCampaign,writeCampaign,levelInfo} from '../src/progression.ts';
import {expeditions,expeditionReward,canExpedition,challengePlan,expeditionBattle} from '../src/expeditions.ts';
import {allStrategies,talentTree} from '../src/officers.ts';
import {duelActionNames} from '../src/duel.ts';
import {CONTROLLABLE,decide,key,estimatePhysical,manhattan} from '../../core/src/index.ts';
function campaign(){const c=freshCampaign();for(let i=1;i<=8;i++)award(c,'S1-'+String(i).padStart(2,'0'),'normal',['sima_yi','cao_zhen'],[1]);return c;}
function trial(id:string,level=1){const c=freshCampaign(),d=deployment(c,true);for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,level);d.mission={id,runId:'test-'+id,version:2};return new Session(7,'normal',215,'survival',4,d);}
function play(s:Session){for(let i=0;i<900&&s.state.outcome==='ongoing';i++){
 const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.tick();continue;}
 if(u.hp<u.stats.maxHp*.5&&u.canUseItems&&s.medicine){s.act({kind:'item',unit:u.id,item:'medicine'});continue;}
 if(u.unitClass==='fengshui'&&u.mp>=8){const target=st.living().filter(t=>t.side!=='enemy'&&t.hp<t.stats.maxHp-20&&manhattan(t.pos,u.pos)<=3).sort((a,b)=>a.hp/a.stats.maxHp-b.hp/b.stats.maxHp)[0];if(target){s.act({kind:'item',unit:u.id,item:'heal',target:target.id});continue;}}
 if(u.id==='sima_yi'&&u.mp<5){const safe=[...st.map.reachable(u,st.occupancy()).keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};}).filter(p=>st.living('enemy').every(e=>manhattan(p,e.pos)>e.range[1]+1)).sort((a,b)=>manhattan(a,u.pos)-manhattan(b,u.pos))[0];if(safe&&key(safe)!==key(u.pos))s.act({kind:'move',unit:u.id,to:safe});s.act({kind:'wait',unit:u.id});continue;}
 for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;const r=s.act(cmd);expect(r.ok,r.error).toBe(true);if(st.outcome!=='ongoing')break;}if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});
}}
describe('treasure stories and repeatable growth',()=>{
 it('has 116 unique usable treasures, 11 four-item stories and two per training ground',()=>{expect(treasures).toHaveLength(116);expect(new Set(treasures.map(t=>t.id)).size).toBe(116);for(const m of expeditions.filter(m=>m.kind==='training'))expect(treasures.filter(t=>t.quest===m.id)).toHaveLength(2);expect(treasures.some(t=>/모사품|모조품|재현품/.test(t.name+t.description))).toBe(false);for(const m of expeditions.filter(m=>m.kind==='quest'))expect(treasures.filter(t=>t.quest===m.id)).toHaveLength(4);});
 it('gates quests by story progress, not an unfulfillable payment',()=>{const c=freshCampaign();expect(canExpedition(c,'T01')).toBe(true);expect(canExpedition(c,'Q01')).toBe(false);expect(expeditionReward(c,'Q01','locked',true).xp).toBe(0);award(c,'S1-01','normal',[],[1]);expect(canExpedition(c,'Q01')).toBe(true);});
 it('grants training XP for new wins but never for defeat, reload or undo of a claimed run',()=>{const c=freshCampaign(),xp=c.xp.sima_yi!;expect(expeditionReward(c,'T01','one',false).xp).toBe(0);expect(expeditionReward(c,'T01','one',true).xp).toBe(52);expect(expeditionReward(c,'T01','one',true).xp).toBe(0);expect(expeditionReward(c,'T01','two',true).xp).toBe(52);expect(c.xp.sima_yi).toBe(xp+104);expect(c.trainingWins).toBe(2);expect(c.rewards).toEqual([]);});
 it('unlocks all quest treasures once and never re-awards quest XP',()=>{const c=campaign();for(const m of expeditions.filter(m=>m.kind==='quest')){expect(expeditionReward(c,m.id,'run-'+m.id,true).items).toHaveLength(4);expect(expeditionReward(c,m.id,'again-'+m.id,true).xp).toBe(0);}expect(c.treasures).toHaveLength(60);expect(c.quests).toHaveLength(11);});
 it('preserves repeat claims, story completion and earned treasures on reload',()=>{const c=campaign();expeditionReward(c,'T01','saved-run',true);expeditionReward(c,'Q01','quest-run',true);const memory=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k),setItem:(k:string,v:string)=>memory.set(k,v)});writeCampaign(c);const loaded=readCampaign();expect(loaded.completedRuns).toEqual(c.completedRuns);expect(loaded.quests).toEqual(c.quests);expect(loaded.treasures).toEqual(c.treasures);expect(expeditionReward(loaded,'T01','saved-run',true).xp).toBe(0);vi.unstubAllGlobals();});
 it.each(expeditions.filter(m=>m.kind!=='challenge'||m.step!<=3).map(m=>[m.id,m.level] as const))('can clear %s at its recommended level and replay the result',(id,level)=>{const s=trial(id,level);play(s);expect(s.state.outcome,JSON.stringify({id,turn:s.state.turn,failure:s.failure})).toBe('victory');expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());expect(s.undo()).toBe(true);expect(s.state.outcome).toBe('ongoing');});
});
describe('progressive talents and tactical variety',()=>{
 it('uses debate vocabulary while retaining martial choices',()=>{expect(Object.values(duelActionNames('debate'))).toEqual(['논박','반론','숙고','논파']);expect(duelActionNames('duel').attack).toBe('공격');});
 it('unlocks talents one at a time from levels AND accomplishments',()=>{const g={storyWins:0,trainingWins:0,questWins:0};expect(talentTree('sima_yi',40,g).every(t=>!t.ready)).toBe(true);g.storyWins=1;expect(talentTree('sima_yi',3,g).filter(t=>t.ready)).toHaveLength(1);g.trainingWins=3;expect(talentTree('sima_yi',6,g).filter(t=>t.ready)).toHaveLength(2);g.questWins=3;expect(talentTree('sima_yi',10,g).filter(t=>t.ready)).toHaveLength(3);const s=trial('T01');expect(s.state.get('sima_yi').traits).not.toContain('simaPatience');});
 it('has 128 distinct spells with enemy and friendly applications',()=>{expect(allStrategies).toHaveLength(128);expect(new Set(allStrategies.map(s=>s.id)).size).toBe(128);expect(allStrategies.filter(s=>s.support)).toHaveLength(34);expect(allStrategies.filter(s=>s.physical)).toHaveLength(28);});
 it('heals allies, spends MP and rejects enemy or unlearned support targets',()=>{const s=trial('T01',6),u=s.state.get('sima_yi'),friend=s.state.get('cao_zhen');friend.hp-=30;const mp=u.mp;expect(s.act({kind:'strategy',unit:u.id,strategy:'greatMend',at:friend.pos}).ok).toBe(false);expect(s.act({kind:'strategy',unit:u.id,strategy:'mend',at:friend.pos}).ok).toBe(true);expect(friend.hp).toBe(friend.stats.maxHp);expect(u.mp).toBe(mp-6);expect(u.hasActed).toBe(true);});
 it('applies genuine guard and rally modifiers and a movable haste status',()=>{const s=trial('T01',10),st=s.state,u=st.get('sima_yi'),friend=st.get('cao_zhen'),enemy=st.living('enemy')[0]!;const before=estimatePhysical(enemy,friend,st.map);expect(s.act({kind:'strategy',unit:u.id,strategy:'fortify',at:friend.pos}).ok).toBe(true);expect(estimatePhysical(enemy,friend,st.map)).toBeLessThan(before);const baseline=estimatePhysical(friend,enemy,st.map);st.applyStatus(friend,{kind:'rally',turns:3,magnitude:1});expect(estimatePhysical(friend,enemy,st.map)).toBeGreaterThan(baseline);});
});

describe('complete growth journey',()=>{
 it('does not skip early talent accomplishments',()=>{expect(talentTree('sima_yi',30,{storyWins:0,trainingWins:3,questWins:3}).filter(t=>t.ready)).toHaveLength(0);expect(talentTree('sima_yi',30,{storyWins:8,trainingWins:0,questWins:3}).filter(t=>t.ready)).toHaveLength(1);});
 it('announces spells and talents only when the reward crosses their gates',()=>{const c=freshCampaign();c.xp.sima_yi=210;c.rewards=['S1-01:normal'];const old=structuredClone(c);expeditionReward(c,'T01','milestone',true);const m=growthMilestones(old,c).find(x=>x.id==='sima_yi')!;expect(m.to).toBe(3);expect(m.strategies).toContain('풍룡');expect(m.talents).toContain('은인자중');expect(growthMilestones(c,c)).toEqual([]);});
 it('offers distinct terrain and a three-scene briefing for each story',()=>{expect(new Set(expeditions.map(m=>JSON.stringify(trialMap(m.id,m.name).rows))).size).toBeGreaterThanOrEqual(6);for(const m of expeditions){const scenes=trialStory(m.id,m.name,m.art,m.lines);expect(scenes).toHaveLength(3);expect(new Set(scenes.map(s=>s.art)).size).toBeGreaterThan(1);}});
 it('gives castle expeditions a destructible gate, attacking tower and ram',()=>{const s=trial('Q02',3);expect(s.state.living().some(u=>u.unitClass==='ram')).toBe(true);expect(s.state.living('enemy').filter(u=>u.id.startsWith('gate_')).every(u=>u.hp>0)).toBe(true);expect(s.state.living('enemy').some(u=>u.id.startsWith('tower_')&&u.stats.attack>0)).toBe(true);});
 it('restores old expedition maps without changing their command replay',()=>{const d=deployment(freshCampaign(),true);d.mission={id:'Q02',runId:'legacy'};const s=new Session(7,'normal',215,'survival',4,d);expect(s.state.map.width).toBe(12);expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());});
});

describe('반복 퀘스트(보물 사냥)와 도전 퀘스트(10단계)',()=>{
 it('opens challenge steps one by one and pays the first clear only',()=>{
  const c=campaign();expect(canExpedition(c,'C01')).toBe(true);expect(canExpedition(c,'C02')).toBe(false);
  const first=expeditionReward(c,'C01','c1',true);expect(first.items).toEqual(['initiateBadge']);expect(first.xp).toBeGreaterThan(0);
  expect(canExpedition(c,'C02')).toBe(true);expect(expeditionReward(c,'C01','c1-again',true)).toEqual({xp:0,items:[]});
  for(let i=2;i<=10;i++)expeditionReward(c,'C'+String(i).padStart(2,'0'),'c'+i,true);
  expect(c.challenges).toHaveLength(10);expect(c.treasures).toEqual(expect.arrayContaining(['gatekeeperHalberd','gatekeeperArmor','peerlessSword','overlordArmor']));
 });
 it('gives one new treasure from the bounty pool per win until the pool is empty, then XP only',()=>{
  const c=campaign(),pool=treasures.filter(t=>t.quest==='R01').map(t=>t.id),got:string[]=[];
  expect(pool).toHaveLength(6);
  for(let i=0;i<6;i++){const r=expeditionReward(c,'R01','b'+i,true);expect(r.items).toHaveLength(1);got.push(r.items[0]!);}
  expect(new Set(got)).toEqual(new Set(pool));const after=expeditionReward(c,'R01','b6',true);expect(after.items).toEqual([]);expect(after.xp).toBeGreaterThan(0);expect(c.bountyWins).toBe(7);
  expect(expeditionReward(c,'R01','b6',true).xp).toBe(0);
 });
 it('raises enemy count, waves and strength with every challenge step, with gatekeepers at 5 and 10',()=>{
  const enemies=(step:number)=>{const {stage}=expeditionBattle('C'+String(step).padStart(2,'0'),215,4);return stage.events!.flatMap(e=>e.actions).filter(a=>a.type==='spawn_units'&&a.side==='enemy').reduce((n,a)=>n+a.units!.filter(u=>u.id!=='challenge_boss').length,0);};
  for(let step=2;step<=10;step++){expect(enemies(step)).toBeGreaterThanOrEqual(enemies(step-1));expect(challengePlan(step).attack).toBeGreaterThan(challengePlan(step-1).attack);}
  expect(enemies(10)).toBeGreaterThan(enemies(1)*2);
  expect([1,2,3,4,5,6,7,8,9,10].filter(s=>challengePlan(s).boss)).toEqual([5,10]);
  expect(expeditionBattle('C05',215,4).stage.events![0]!.actions.flatMap(a=>a.units??[]).some(u=>u.id==='challenge_boss')).toBe(true);
 });
 it('keeps cleared challenge steps and bounty wins on reload',()=>{
  const c=campaign();expeditionReward(c,'C01','x',true);expeditionReward(c,'R01','y',true);
  const memory=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k),setItem:(k:string,v:string)=>memory.set(k,v)});writeCampaign(c);const loaded=readCampaign();
  expect(loaded.challenges).toEqual(['C01']);expect(loaded.bountyWins).toBe(1);vi.unstubAllGlobals();
 });
});

