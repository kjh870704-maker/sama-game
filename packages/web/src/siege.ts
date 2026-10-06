import {makeUnit,manhattan,isHostile,familyOf} from '../../core/src/index.ts';
import type {BattleState,Coord,Unit} from '../../core/src/index.ts';
import {structureKind} from './campaign-rules.ts';

/** Engineers keep siege engines and works standing; a breached gate rallies the assault. */
export const BARRICADES_PER_ENGINEER=2;
const machines=['ram','catapult'];
export function isSiegeWork(u:Unit){return machines.includes(familyOf(u.unitClass))||!!structureKind(u.id)||u.id.startsWith('convoy_');}
export function repairAmount(engineer:Unit,target:Unit){return Math.min(target.stats.maxHp-target.hp,24+Math.floor(engineer.stats.intellect*.4));}
export function repairError(state:BattleState,engineer:Unit,target:Unit|undefined){
  if(familyOf(engineer.unitClass)!=='engineer')return '공병만 수리할 수 있습니다.';
  if(!target?.alive||isHostile(engineer.side,target.side)||!isSiegeWork(target))return '아군 충차·포차·방책·성문을 선택하세요.';
  if(manhattan(engineer.pos,target.pos)>1)return '인접한 대상만 수리할 수 있습니다.';
  if(target.hp>=target.stats.maxHp)return '이미 온전한 상태입니다.';
  return '';
}
export function parseCell(text:string|undefined):Coord|undefined{const m=/^(\d+),(\d+)$/.exec(text??'');return m?{x:Number(m[1]),y:Number(m[2])}:undefined;}
export function fortifyError(state:BattleState,engineer:Unit,at:Coord|undefined,built:number){
  if(familyOf(engineer.unitClass)!=='engineer')return '공병만 방책을 세울 수 있습니다.';
  if(built>=BARRICADES_PER_ENGINEER)return '이 공병은 이번 전투의 방책 자재를 모두 썼습니다.';
  if(!at||!state.map.inBounds(at)||manhattan(engineer.pos,at)!==1)return '인접한 빈 칸을 선택하세요.';
  if(state.unitAt(at)||!['plain','road','hill','fort','bridge'].includes(state.map.tileAt(at).terrain))return '평지·길·구릉·성채·다리의 빈 칸에만 세울 수 있습니다.';
  return '';
}
export function buildBarricade(state:BattleState,engineer:Unit,at:Coord){
  return placeBarricade(state,at,engineer.side==='enemy'?'enemy':'allyAi',engineer.level);
}
/** A stationary barricade: blocks the tile until it is broken. Stages also pre-place them. */
export function placeBarricade(state:BattleState,at:Coord,side:'enemy'|'allyAi',level:number){
  const unit=makeUnit({id:`barricade_${at.x}_${at.y}`,name:'방책',side,unitClass:'infantry',level,pos:at,behavior:'passive',statOverrides:{maxHp:70,attack:0,defense:14,movement:0,agility:0}});
  unit.range=[0,0];unit.canUseItems=false;state.add(unit);return unit;
}
/** Units within two tiles of a destroyed gate gain rally for two turns. */
export function breachRally(state:BattleState,gate:Unit){
  const rallied=state.living().filter(u=>isHostile(u.side,gate.side)&&u.side!=='allyAi'&&!structureKind(u.id)&&manhattan(u.pos,gate.pos)<=2);
  for(const u of rallied)state.applyStatus(u,{kind:'rally',turns:2,magnitude:1});
  return rallied;
}
