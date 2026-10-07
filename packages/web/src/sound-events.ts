import {familyOf,type UnitClass} from '../../core/src/index.ts';
import {allStrategies} from './officers.ts';

/** Battle events the soundtrack reacts to. Pure mapping so it can be tested. */
export interface SoundEvent {
  kind:'select'|'strike'|'move'|'attack-start'|'impact'|'strategy-start'|'strategy'|'repair'|'retreat'|'breach'|'turn'|'battle-start'|'victory'|'somber'|'defeat'|'ui'|'ui-open'|'page'|'duel';
  unitClass?:string|undefined;
  target?:{id:string;unitClass:string}|undefined;
  strategy?:string|undefined;
  side?:string|undefined;
  hit?:boolean|undefined;
  critical?:boolean|undefined;
  guard?:boolean|undefined;
  heavy?:boolean|undefined;
  structure?:boolean|undefined;
  pan?:number|undefined;
}
export interface SoundShot {name:string;delay?:number;gain?:number;rate?:number;wet?:number;duck?:boolean;priority?:number}

const HORSE=['cavalry','heavyCav','horseArcher'],BOW=['archer','horseArcher'],SAGE=['strategist','fengshui','shaman','maiden','taoist'];
/** Recipe for a strategy: element first, then the kind of support. */
export function strategySound(id=''):string{
  if(id==='heal'||id==='calm')return 'heal';if(id==='repair')return 'repair';
  const s=allStrategies.find(x=>x.id===id);
  if(!s)return 'cast';
  if(s.support)return s.support==='heal'||s.support==='cleanse'?'heal':'buff';
  if(s.element==='support')return 'confuse';
  if(s.physical)return 'clash';
  if(id==='rockfall')return 'boulder-hit';
  return s.element;
}
const chance=(r:()=>number,p:number)=>r()<p;

export function soundsFor(e:SoundEvent,r:()=>number=Math.random):SoundShot[]{
  // Extended classes sound like their lineage (a 호표기 still gallops).
  const c=e.unitClass?familyOf(e.unitClass as UnitClass):'',shots:SoundShot[]=[];
  switch(e.kind){
    case 'select':
      shots.push({name:'ui-open',gain:.5});
      if(HORSE.includes(c)&&chance(r,.45))shots.push({name:'neigh',gain:.35,delay:.05});
      else if(SAGE.includes(c))shots.push({name:'robe',gain:.5});
      else if(c==='navy')shots.push({name:'oars',gain:.35});
      else if(c==='ram'||c==='catapult')shots.push({name:'wheels',gain:.4});
      else shots.push({name:'march',gain:.25});
      break;
    case 'move':
      shots.push({name:HORSE.includes(c)?'gallop':c==='navy'?'oars':c==='ram'||c==='catapult'?'wheels':SAGE.includes(c)?'robe':'march',gain:.7});
      if(SAGE.includes(c))shots.push({name:'march',gain:.25,delay:.05});
      break;
    case 'attack-start':
      if(BOW.includes(c)){shots.push({name:'bow-release'});if(c==='horseArcher')shots.push({name:'gallop',gain:.4});}
      else if(c==='crossbow')shots.push({name:'crossbow-release'});
      else if(c==='catapult')shots.push({name:'catapult-launch'});
      else if(c==='ram')shots.push({name:'wheels',gain:.8});
      else if(c==='navy')shots.push({name:'oars',gain:.6},{name:'shout',gain:.55,delay:.1});
      else{
        shots.push({name:'swing',delay:.18});
        if(HORSE.includes(c)){shots.push({name:'gallop',gain:.6});if(chance(r,.3))shots.push({name:'neigh',gain:.4,delay:.05});}
        if(chance(r,.55))shots.push({name:'shout',gain:.6,delay:.05,rate:c==='civilian'?1.3:1});
      }
      break;
    case 'impact':{
      if(e.hit===false){shots.push({name:'evade',gain:.8});break;}
      if(e.guard)shots.push({name:'guard'});
      const struct=e.structure||/^(gate|tower|barricade)_/.test(e.target?.id??'');
      if(BOW.includes(c)||c==='crossbow')shots.push({name:'arrow-hit'});
      else if(c==='catapult')shots.push({name:'boulder-hit',duck:true});
      else if(c==='ram')shots.push({name:'ram-hit',duck:true});
      else if(HORSE.includes(c))shots.push({name:'heavy-hit'},{name:'clash',gain:.5,delay:.02});
      else if(c==='spearman')shots.push({name:'stab'});
      else if(c==='navy')shots.push({name:'clash'},{name:'water',gain:.3});
      else shots.push({name:chance(r,.5)?'clash':'armor-hit'});
      if(struct&&c!=='ram'&&c!=='catapult')shots.push({name:'crumble',gain:.35,rate:1.4});
      if(e.critical)shots.push({name:'heavy-hit',gain:.9,delay:.03,duck:true,priority:2},{name:'clash',gain:.6,rate:.85,delay:.05});
      if(!struct&&(e.heavy||e.critical)&&chance(r,.7))shots.push({name:'pain',gain:.55,delay:.12});
      break;
    }
    case 'strategy-start':shots.push({name:'cast',gain:.7});if(chance(r,.4))shots.push({name:'shout',gain:.4,rate:1.1,delay:.05});break;
    case 'strategy':{const name=strategySound(e.strategy);shots.push({name,wet:.3,duck:['fire','thunder','water','earth','boulder-hit'].includes(name)});break;}
    case 'repair':shots.push({name:'repair'});break;
    case 'strike':shots.push({name:'thunder',duck:true,priority:2},{name:'boulder-hit',gain:.6,delay:.08});break;
    case 'retreat':
      if(e.structure){shots.push({name:'crumble',duck:true,priority:2});break;}
      if(c==='ram'||c==='catapult'){shots.push({name:'crumble',gain:.6,rate:1.3},{name:'wheels',gain:.4});break;}
      shots.push({name:'death',gain:.75},{name:'armor-hit',gain:.4,rate:.8,delay:.35});
      if(HORSE.includes(c))shots.push({name:'neigh',gain:.5,rate:.9,delay:.1});
      break;
    case 'breach':shots.push({name:'gong',priority:2},{name:'crumble',duck:true},{name:'battle-cry',delay:.4,gain:.8});break;
    case 'turn':
      if(e.side==='enemy')shots.push({name:'enemy-drum',priority:2});
      else if(e.side==='player')shots.push({name:'war-drum',priority:2},{name:'horn',gain:.45,delay:.5});
      else shots.push({name:'taiko-small',gain:.7},{name:'taiko-small',gain:.6,delay:.22});
      break;
    case 'battle-start':shots.push({name:'horn',priority:2},{name:'war-drum',delay:.6},{name:'battle-cry',delay:1.1,gain:.85,duck:true});break;
    case 'victory':shots.push({name:'fanfare',priority:2,duck:true},{name:'cheer',delay:.6,gain:.7},{name:'gong',delay:.9,gain:.6});break;
    // A costly win: no fanfare or cheering, only the gong and a low lament.
    case 'somber':shots.push({name:'gong',priority:2,duck:true,rate:.85},{name:'lament',delay:.8,gain:.45});break;
    case 'defeat':shots.push({name:'lament',priority:2,duck:true},{name:'gong',rate:.75,gain:.6,delay:1.2});break;
    case 'duel':shots.push({name:'clash',priority:2},{name:'shout',gain:.6,delay:.04});if(e.critical)shots.push({name:'cheer',gain:.5,delay:.3});break;
    case 'ui':shots.push({name:'ui-click',gain:.6,priority:2});break;
    case 'ui-open':shots.push({name:'ui-open',gain:.6,priority:2});break;
    case 'page':shots.push({name:'page',gain:.6,priority:2});break;
  }
  return shots;
}
