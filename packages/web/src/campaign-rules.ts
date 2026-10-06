import {makeUnit,isHostile} from '../../core/src/index.ts';
import type {BattleState,StageDef} from '../../core/src/index.ts';

// Fixed encounter bands: enemies never level up in response to equipment or replay.
export const encounterLevels:Record<string,number>={'S1-01':1,'S1-02':2,'S1-03':3,'S1-04':4,'S1-05':5,'S1-06':6,'S1-07':6,'S1-08':7,'S1-09':7,'S1-10':8,'S1-11':9,'S2-01':8,'S2-02':8,'S2-03':9,'S2-04':9,'S2-05':9,'S2-06':10,'S2-07':11,'S2-08':11,'S2-09':12,'S2-10':12,'S2-11':13,'S2-12':14,'S2-13':15,'S2-14':15,'S3-01':16,'S3-02':16,'S3-03':17,'S3-04':18,'S3-05':19,'S3-06':20,'S3-07':21};
export function campaignStage(source:StageDef):StageDef{
  const s=structuredClone(source),base=encounterLevels[s.id]??1,old=s.difficulty.normal.recommendedLevel;
  const adjust=(n:number|undefined)=>Math.max(1,base+Math.max(-1,Math.min(1,(n??old)-old)));
  for(const tier of ['normal','extreme'] as const)s.difficulty[tier]={...s.difficulty[tier],recommendedLevel:base,minEnemyLevel:base+(tier==='extreme'?2:0)};
  for(const group of [...s.deployment.grantedUnits??[],...s.deployment.allyAi??[]])group.level=adjust(group.level);
  for(const event of s.events??[])for(const action of event.actions)for(const unit of action.units??[])unit.level=adjust(unit.level);
  if(s.id==='S1-08'){
    // Eight support units retain their roles, with three additional silhouettes/classes.
    const granted=s.deployment.grantedUnits!;
    granted[2]!.count=1;granted.push({type:'fengshui',count:1,level:base,countsTowardAllyLoss:true});
    granted[3]!.count=1;granted.push({type:'crossbow',count:1,level:base,countsTowardAllyLoss:true});
    s.perf={tier:'C',maxSimultaneousUnits:80};
  }
  return s;
}
export function structureKind(id:string){return /^gate_\d+_\d+$/.test(id)?'gate':/^tower_\d+_\d+$/.test(id)?'tower':/^barricade_\d+_\d+$/.test(id)?'barricade':undefined;}
/** Frame in the 4×2 scenery sheet: gate, watchtower, and the wall segment reused as a barricade. */
export function structureFrame(kind:'gate'|'tower'|'barricade'){return kind==='gate'?2:kind==='tower'?3:7;}
export function addFortifications(state:BattleState){
  // Castle stages: the two original sieges, plus any later stage whose map marks watchtowers.
  if(!['S1-08','S1-06'].includes(state.stage.id)&&!(state.stage.order>11&&state.map.regions.has('watchtowers')))return;
  const level=(state.stage.id==='S1-06'?6:state.stage.id==='S1-08'?5:encounterLevels[state.stage.id]??5)+(state.difficulty==='extreme'?2:0);
  for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){
    if(state.map.tileAt({x,y}).terrain!=='gate')continue;
    const guard=state.unitAt({x,y});if(guard){const candidates=[{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}];const free=candidates.find(p=>state.map.inBounds(p)&&!state.unitAt(p)&&!['wall','gate','water','mountain'].includes(state.map.tileAt(p).terrain));if(!free)throw new Error('성문 수비대 배치 공간이 없습니다.');guard.pos=free;}
    const unit=makeUnit({id:`gate_${x}_${y}`,name:'성문 방벽',side:'enemy',unitClass:'infantry',level,pos:{x,y},behavior:'passive',statOverrides:{maxHp:95,defense:10,attack:0,movement:0,agility:0}});
    unit.range=[0,0];state.add(unit);
  }
  const towers=state.map.regions.get('watchtowers')??[{x:33,y:5},{x:44,y:5},{x:33,y:16},{x:44,y:16}];
  for(const {x,y} of towers){
    if(state.unitAt({x,y}))continue;
    const unit=makeUnit({id:`tower_${x}_${y}`,name:'감시탑',side:'enemy',unitClass:'crossbow',level,pos:{x,y},behavior:'hold',traits:['alwaysHit'],statOverrides:{maxHp:110,defense:12,attack:33,movement:0}});
    unit.range=[1,5];state.add(unit);
  }
}

const BLOCK=new Set(['wall','gate','water','rapids','cliff']);
/** 공격 공성전인가: 사마의 자리에서 성벽·성문·물·벼랑을 지나지 않고는 닿지 못하는(성 안의) 적이 30% 이상이면 성을 쳐야 하는 싸움이다. */
export function isAssault(state:BattleState,from:{x:number;y:number}){
  const seen=new Set<string>([from.x+','+from.y]),q=[from];
  while(q.length){const c=q.shift()!;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const){const n={x:c.x+dx,y:c.y+dy},k=n.x+','+n.y;
    if(seen.has(k)||!state.map.inBounds(n)||BLOCK.has(state.map.tileAt(n).terrain))continue;seen.add(k);q.push(n);}}
  const foes=state.living('enemy').filter(u=>!/^(gate|tower)_/.test(u.id));if(!foes.length)return false;
  const near=(u:{pos:{x:number;y:number}})=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((u.pos.x+dx!)+','+(u.pos.y+dy!)));
  return foes.length-foes.filter(near).length>=Math.max(1,foes.length*.3);
}
/** Castle maps where we assault the walls receive a controllable siege crew in new-rules battles. */
export function addSiegeCompany(state:BattleState){
  if(state.stage.id==='S1-04')return;
  const cells=[];for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++)cells.push({x,y});
  // Only castles with a gate to breach: a defended citadel (no gate) needs no rams.
  if(!cells.some(p=>state.map.tileAt(p).terrain==='wall')||!cells.some(p=>state.map.tileAt(p).terrain==='gate'))return;
  const hero=state.get('sima_yi');
  // 우리가 성을 치는 싸움에만 공성병기를 붙인다: 성문·성벽을 넘지 않고 적 대부분에 닿을 수 있으면(야전·수성) 필요 없다.
  const assault=isAssault(state,hero.pos);
  const free=cells.filter(p=>!state.unitAt(p)&&['plain','road','fort'].includes(state.map.tileAt(p).terrain)).sort((a,b)=>(Math.abs(a.x-hero.pos.x)+Math.abs(a.y-hero.pos.y))-(Math.abs(b.x-hero.pos.x)+Math.abs(b.y-hero.pos.y)));
  if(assault&&!free[0])throw new Error('충차 배치 공간이 없습니다.');
  if(assault)state.add(makeUnit({id:'siege_crew',name:'공성대장',side:'ally',unitClass:'ram',level:hero.level,pos:free[0]!,traits:['siegeRam','noCounterAttack'],canUseItems:false}));
  if(['S1-06','S1-08'].includes(state.stage.id))return;
  // Estate fortifications defend the family; Luoyang's gate remains a paid exit.
  const side=state.stage.id==='S1-01'?'allyAi':'enemy';
  const gates=cells.filter(p=>state.map.tileAt(p).terrain==='gate');
  for(const p of gates){if(state.unitAt(p))continue;const u=makeUnit({id:`gate_${p.x}_${p.y}`,name:'성문 방벽',side,unitClass:'infantry',level:hero.level,pos:p,behavior:'passive',statOverrides:{maxHp:95,attack:0,defense:10,movement:0}});u.range=[0,0];state.add(u);}
  for(const gate of gates.filter((_,i)=>i%2===0)){
    const at=[{x:gate.x-1,y:gate.y},{x:gate.x,y:gate.y-1}].find(p=>state.map.inBounds(p)&&state.map.tileAt(p).terrain==='wall'&&!state.unitAt(p));if(!at)continue;
    const tower=makeUnit({id:`tower_${at.x}_${at.y}`,name:'감시탑',side,unitClass:'crossbow',level:hero.level,pos:at,behavior:state.stage.id==='S1-02'?'passive':'hold',traits:['alwaysHit'],statOverrides:{maxHp:110,attack:26,defense:12,movement:0}});tower.range=[1,4];state.add(tower);
  }
}

/** S1-08 race: tiles left for the competing ally and for Sima Yi to reach the central fort. */
export function raceGap(state:BattleState){
  const fort=state.map.regionCoords('central_fort');if(!fort.length)return undefined;
  const dist=(p:{x:number;y:number})=>Math.min(...fort.map(f=>Math.abs(f.x-p.x)+Math.abs(f.y-p.y)));
  const racers=state.living('allyAi').filter(u=>u.behavior==='race');
  const hero=state.find('sima_yi');
  return {ally:racers.length?Math.min(...racers.map(u=>dist(u.pos))):undefined,hero:hero?.alive?dist(hero.pos):undefined};
}

/** How many of a unit's four sides are shut: by impassable ground, the map edge or a foe. */
export function encircled(state:BattleState,id:string){
  const u=state.find(id);if(!u?.alive)return 0;
  return [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d=>{
    const c={x:u.pos.x+d.x,y:u.pos.y+d.y};if(!state.map.inBounds(c)||!Number.isFinite(state.map.moveCost(u.unitClass,c)))return true;
    const b=state.unitAt(c);return !!b&&isHostile(u.side,b.side);
  }).length;
}
