import {romance,temperOf} from '../src/romance.ts';
import {describe,it,expect,vi} from 'vitest';
import {newDuel,duelRound,duelResponse,type DuelAction,duelDamage} from '../src/duel.ts';
import {Session,chapters} from '../src/session.ts';
import {freshCampaign,award,equipSlot,equippedItems,deployment,readCampaign,writeCampaign} from '../src/progression.ts';
import {availableStrategies,contestKindOf,martialPower} from '../src/officers.ts';
import {estimatePhysical,decide,CONTROLLABLE} from '../../core/src/index.ts';
import {dyeOfSide} from '../src/dye.ts';
const duel=(stat=60)=>newDuel('duel',{id:'a',name:'아군',stat},{id:'b',name:'적군',stat:60});
describe('five round duels and debates',()=>{
 it('requires energy, rejects invalid moves, and ends exactly on the fifth choice',()=>{const d=duel();expect(duelRound(d,'special')).toBe(false);expect(d.round).toBe(0);for(const a of ['rally','special','guard','attack','attack'] as DuelAction[])expect(duelRound(d,a)).toBe(true);expect(d.round).toBe(5);expect(d.result).toBeDefined();expect(duelRound(d,'attack')).toBe(false);expect(d.history).toHaveLength(5);});
 it('scales damage with stats and resolves five choices like rock-paper-scissors',()=>{const weak=duel(30),strong=duel(90);duelRound(weak,'attack');duelRound(strong,'attack');expect(strong.history[0]!.dealt).toBeGreaterThan(weak.history[0]!.dealt);expect(duelDamage(80,'attack','special')).toBeGreaterThan(duelDamage(80,'attack','guard'));expect(duelDamage(80,'feint','guard')).toBeGreaterThan(duelDamage(80,'feint','rally'));});
 it('replays and undoes mid-debate without losing choices',()=>{
   // 꿈속의 진궁(자부)은 사마의의 설전을 받는다.
   const s=new Session(4,'normal',215,'survival',4);let started=false;
   for(let i=0;i<5&&s.state.activeDialogue;i++){const n=s.battle.dialogue.node(s.state.activeDialogue);s.act({kind:'choose',nodeId:n.id,optionId:n.options[0]!.id});}
   for(let i=0;i<300&&!started&&s.state.outcome==='ongoing';i++){
     const st=s.state,u=st.living(st.currentSide).find(u=>!u.hasActed);
     if(!u||!['player','ally'].includes(st.currentSide)){s.tick();continue;}
     const challenge=()=>{const enemy=st.living('enemy').find(e=>Math.abs(e.pos.x-u.pos.x)+Math.abs(e.pos.y-u.pos.y)<=3);if(enemy&&!u.hasActed&&u.id==='sima_yi')started=s.act({kind:'item',unit:u.id,item:'debate',target:enemy.id}).ok;};
     challenge();if(started)break;
     // 사마의는 진궁 3칸 안까지 걸어간다(AI는 멀리서 책략을 쏘므로 설전 거리로 직접 붙인다).
     if(u.id==='sima_yi'&&!u.hasMoved){const foe=st.find('chen_gong');if(foe?.alive){const cells=[...st.map.reachable(u,st.occupancy()).keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x:x!,y:y!};});const near=cells.filter(c=>Math.abs(c.x-foe.pos.x)+Math.abs(c.y-foe.pos.y)<=3).sort((a,b)=>(Math.abs(a.x-foe.pos.x)+Math.abs(a.y-foe.pos.y))-(Math.abs(b.x-foe.pos.x)+Math.abs(b.y-foe.pos.y)))[0]??cells.sort((a,b)=>(Math.abs(a.x-foe.pos.x)+Math.abs(a.y-foe.pos.y))-(Math.abs(b.x-foe.pos.x)+Math.abs(b.y-foe.pos.y)))[0];if(near&&(near.x!==u.pos.x||near.y!==u.pos.y)){s.act({kind:'move',unit:u.id,to:near});challenge();if(started)break;}}}
     for(const cmd of decide(st,u)){if(cmd.kind==='move'&&cmd.to.x===u.pos.x&&cmd.to.y===u.pos.y)continue;s.act(cmd);challenge();if(started)break;}
     if(!started&&!u.hasActed)s.act({kind:'wait',unit:u.id});
   }
   expect(started).toBe(true);expect(s.act({kind:'endPhase'}).ok).toBe(false);expect(s.act({kind:'item',unit:'sima_yi',item:'duel-round:rally'}).ok).toBe(true);const loaded=Session.load(s.save());expect(loaded.activeDuel).toEqual(s.activeDuel);expect(loaded.undo()).toBe(true);expect(loaded.activeDuel?.round).toBe(0);
 });
 it.each(['duel','debate'] as const)('resolves %s into battle HP and one action',kind=>{const s=new Session(7,'normal',215,'survival',4),u=kind==='debate'?s.state.get('sima_yi'):s.state.living('player').find(x=>contestKindOf(x)==='duel')!,enemy=s.state.living('enemy')[0]!;enemy.pos={x:u.pos.x+1,y:u.pos.y};if(s.state.unitAt(enemy.pos)!==enemy)enemy.pos={x:u.pos.x-1,y:u.pos.y};(enemy as {name:string}).name=kind==='duel'?'여포':'진궁';if(kind==='debate'){enemy.stats.attack=1;enemy.stats.intellect=90;} /* 이름만 바꾼 병사라 능력치로 성향을 맞춘다 */expect(s.act({kind:'item',unit:u.id,item:kind,target:enemy.id}).ok).toBe(true);expect(s.activeDuel?.player.stat).toBe(kind==='debate'?romance.sima_yi!.int+u.level:martialPower(u));for(const action of ['rally','special','guard','attack','attack'])expect(s.act({kind:'item',unit:u.id,item:'duel-round:'+action}).ok).toBe(true);expect(s.activeDuel).toBeNull();expect(s.lastDuel?.round).toBe(5);expect(u.hasActed).toBe(true);expect(u.hp).toBeLessThan(u.stats.maxHp);expect(enemy.hp).toBeLessThan(enemy.stats.maxHp);});
});
describe('equipment, traits, spells and castle siege',()=>{
 it('preserves the paid escape beside the new Luoyang gate',()=>{const s=new Session(0,'normal',215,'survival',4),st=s.state;st.get('sima_yi').pos={x:6,y:10};st.get('sima_lang').pos={x:7,y:10};expect(s.act({kind:'wait',unit:'sima_yi'}).ok).toBe(true);if(st.activeDialogue==='bribe')expect(s.act({kind:'choose',nodeId:'bribe',optionId:'pay'}).ok).toBe(true);expect(st.activeDialogue).toBe('gate_payment');expect(s.act({kind:'choose',nodeId:'gate_payment',optionId:'pay_gate'}).ok).toBe(true);expect(st.outcome).toBe('victory');expect(s.funds).toBe(1000);});
 it('recovers MP on the next turn and increases Cao Zhen physical damage',()=>{const s=new Session(7,'normal',215,'survival',4),st=s.state,u=st.get('sima_yi'),cao=st.get('cao_zhen'),e=st.living('enemy')[0]!;u.mp=0;for(let i=0;i<4;i++)s.battle.endPhase();expect(u.mp).toBe(3);const enhanced=estimatePhysical(cao,e,st.map);cao.traits=cao.traits.filter(t=>t!=='caoVanguard');expect(enhanced).toBeGreaterThan(estimatePhysical(cao,e,st.map));});
 it('keeps three slots unique and persists them across reload',()=>{const c=freshCampaign();for(const stage of ['S1-01','S1-02'])award(c,stage,'normal',[],[1]);expect(equipSlot(c,'sima_yi','weapon','sevenstar')).toBe(true);expect(equipSlot(c,'sima_yi','armor','ironArmor')).toBe(true);expect(equipSlot(c,'sima_yi','accessory','taiping')).toBe(true);expect(equippedItems(c,'sima_yi')).toHaveLength(3);expect(equipSlot(c,'sima_yi','armor','sevenstar')).toBe(false);expect(equipSlot(c,'sima_lang','weapon','sevenstar')).toBe(true);expect(equippedItems(c,'sima_yi')).not.toContain('sevenstar');const memory=new Map<string,string>();vi.stubGlobal('localStorage',{setItem:(k:string,v:string)=>memory.set(k,v),getItem:(k:string)=>memory.get(k)??null});writeCampaign(c);expect(readCampaign().loadouts).toEqual(c.loadouts);vi.unstubAllGlobals();});
 it('applies all equipped stat bonuses and the general-specific trait',()=>{const c=freshCampaign();award(c,'S1-01','normal',[],[1]);award(c,'S1-02','normal',[],[1]);const base=new Session(0,'normal',215,'survival',4,deployment(c));equipSlot(c,'sima_yi','weapon','sevenstar');equipSlot(c,'sima_yi','armor','ironArmor');equipSlot(c,'sima_yi','accessory','taiping');const s=new Session(0,'normal',215,'survival',4,deployment(c)),a=s.state.get('sima_yi'),b=base.state.get('sima_yi');expect(a.stats.attack-b.stats.attack).toBe(4);expect(a.stats.defense-b.stats.defense).toBe(2);expect(a.stats.maxHp-b.stats.maxHp).toBe(12);expect(a.traits).toContain('simaPatience');expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());});
 it('unlocks the full spell list progressively',()=>{expect(availableStrategies(1)).toEqual(['fire']);expect(availableStrategies(5)).toEqual(['fire','windDragon','bind']);expect(availableStrategies(20)).toHaveLength(7);const d=deployment(freshCampaign());d.levels.sima_yi=10;expect(new Session(7,'normal',215,'survival',4,d).state.get('sima_yi').strategies).toEqual(availableStrategies(10));});
 it.each([1,6,15,26])('forces a controllable ram and HP structures when we assault a castle (chapter %i)',chapter=>{const s=new Session(chapter,'normal',215,'survival',4,deployment(freshCampaign()));expect(s.state.living('ally').some(u=>u.unitClass==='ram')).toBe(true);expect(s.state.living().some(u=>u.id.startsWith('gate_')&&u.hp>0)).toBe(true);expect(s.state.living().some(u=>u.id.startsWith('tower_')&&u.hp>0&&u.range[1]>1)).toBe(true);});
 it.each([0,2])('sends no siege engine when we defend or escape (chapter %i), but keeps the gate structures',chapter=>{const s=new Session(chapter,'normal',215,'survival',4,deployment(freshCampaign()));expect(s.state.find('siege_crew')).toBeUndefined();expect(s.state.living().some(u=>u.id.startsWith('gate_'))).toBe(true);});
 it('gives rams a real attack bonus against structures, not ordinary soldiers',()=>{const s=new Session(1,'normal',215,'survival',4),u=s.state.get('siege_crew'),gate=s.state.get('gate_33_12');u.pos={x:32,y:12};const enhanced=estimatePhysical(u,gate,s.state.map);u.traits=[];expect(enhanced).toBeGreaterThan(estimatePhysical(u,gate,s.state.map)*2);});
 it('lets an officer refuse by temper, always answers the historic duels, and ignores nameless soldiers',()=>{
  expect(duelResponse('duel',{name:'사마의',stat:70},{name:'조상',stat:50,temper:'timid',hp:1}).accept).toBe(false);
  expect(duelResponse('duel',{name:'허저',stat:99},{name:'마초',stat:99,temper:'brave',hp:.1})).toMatchObject({accept:true,reason:'historic'});
  expect(duelResponse('debate',{name:'사마의',stat:96},{name:'제갈량',stat:100,temper:'wise',hp:1}).reason).toBe('historic');
  expect(duelResponse('debate',{name:'사마의',stat:96},{name:'허저',stat:36,temper:'reckless',hp:1}).accept).toBe(true);
  expect(duelResponse('duel',{name:'관우',stat:97},{name:'조인',stat:86,temper:'cautious',hp:1}).accept).toBe(false);
  expect(duelResponse('duel',{name:'장료',stat:92},{name:'감녕',stat:94,temper:'brave',hp:.2}).accept).toBe(true);
  expect(duelResponse('duel',{name:'장비',stat:90},{name:'조운',stat:96,temper:'brave',hp:.2}).reason).toBe('wounded');
  expect(duelResponse('duel',{name:'사마의',stat:70},{name:'보병',stat:60,hp:1}).reason).toBe('nameless');
  expect(temperOf('여포')).toBe('reckless');expect(temperOf('사마의')).toBe('wise');expect(temperOf('보병')).toBeUndefined();
 });
 it('spends the challenger\'s action on a refusal: the challenger is rallied and the coward loses morale',()=>{
  const s=new Session(7,'normal',215,'survival',4),u=s.state.get('sima_yi'),enemy=s.state.living('enemy')[0]!;enemy.pos={x:u.pos.x+1,y:u.pos.y};(enemy as {name:string}).name='조희'; // 연의의 맞수(조상 등)는 붙으면 저절로 설전이 열리므로 짝이 아닌 소심한 장수로 시험한다
  enemy.stats.attack=1;enemy.stats.intellect=90; // 지력형으로: 지력형 사마의는 설전만 건다
  const morale=enemy.stats.morale;
  expect(s.act({kind:'item',unit:u.id,item:'debate',target:enemy.id}).ok).toBe(true);
  expect(s.activeDuel).toBeNull();expect(s.lastRefusal?.target).toBe(enemy.id);expect(u.hasActed).toBe(true);
  expect(s.state.hasStatus(u,'rally')).toBe(true);expect(enemy.stats.morale).toBe(morale-10);

 });
 it('refuses to let a general challenge a nameless soldier without spending the turn',()=>{
  const s=new Session(7,'normal',215,'survival',4),u=s.state.get('sima_yi'),enemy=s.state.living('enemy')[0]!;enemy.pos={x:u.pos.x+1,y:u.pos.y};(enemy as {name:string}).name='보병';
  const r=s.act({kind:'item',unit:u.id,item:'duel',target:enemy.id});expect(r.ok).toBe(false);expect(r.error).toContain('이름 없는');expect(u.hasActed).toBe(false);
 });
});
describe('duel damage is stat-centric',()=>{
 it('scales strongly with 무력/지력 and favours the stronger side',()=>{
  const hit=(a:number,b:number,kind:'duel'|'debate'='duel')=>{const d=newDuel(kind,{id:'a',name:'갑',stat:a},{id:'b',name:'을',stat:b});duelRound(d,'attack');return d.history[0]!;};
  // 능력치가 곧 피해: 일기토는 무력, 설전은 지력 그대로.
  expect(hit(100,60).dealt).toBe(100);expect(hit(60,100).dealt).toBe(60);
  expect(hit(96,70,'debate').dealt).toBe(96);expect(hit(70,96,'debate').dealt).toBe(70);
  expect(duelDamage(80,'special','attack')).toBe(42);expect(duelDamage(80,'attack','guard')).toBe(28);expect(duelDamage(80,'attack','attack',2)).toBe(96);
  // 큰 피해를 받아도 다섯 합을 모두 겨룬 뒤 승패를 정한다.
  const d=newDuel('duel',{id:'a',name:'갑',stat:100},{id:'b',name:'을',stat:30});d.enemy.stat=30;
  while(!d.result)duelRound(d,'attack');expect(d.result).toBe('win');expect(d.round).toBe(5);
 });
});
describe('사마의 starts as a strategist',()=>{
 it('is a 책사 in chapter 2 with a basic attack and level-1 strategy',()=>{
  const s=new Session(2,'normal',11,'survival',4),u=s.state.get('sima_yi');
  expect(u.unitClass).not.toBe('civilian');expect(u.range[1]).toBeGreaterThanOrEqual(1);expect(u.strategies).toContain('fire');
 });
});
describe('사마가 수비전 피난민',()=>{
 it('spawns both civilians as autonomous green NPC allies',()=>{
  const s=new Session(2,'normal',215,'survival',4),refugees=['refugee_a','refugee_b'].map(id=>s.state.get(id));
  for(const u of refugees){expect(u.side).toBe('allyAi');expect(CONTROLLABLE.has(u.side)).toBe(false);expect(u).toMatchObject({behavior:'escortee',goalRegion:'militia'});expect(dyeOfSide(u.side)).toBe('green');expect(decide(s.state,u).length).toBeGreaterThan(0);}
 });
});
