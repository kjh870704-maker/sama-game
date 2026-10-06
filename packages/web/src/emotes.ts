/** Speech-balloon emotes shown above units, written in Korean only: each troop
 * class has its own battle cry, and reactions (critical, evade, guard, crisis,
 * status) share a set. */
import {familyOf,type UnitClass} from '../../core/src/index.ts';
export type EmoteShape='balloon'|'burst';
export interface Emote {text:string;color:number;shape:EmoteShape}

const RED=0xd8463a,GOLD=0xd9a43a,BLUE=0x3f7fd0,GREEN=0x3d9a63,PURPLE=0x8a5ad0,GREY=0x7d8a86,BROWN=0x9a6a3a;
export const classCries:Record<string,Emote>={
  infantry:{text:'베기!',color:RED,shape:'balloon'},
  spearman:{text:'창진 찌르기!',color:RED,shape:'balloon'},
  cavalry:{text:'돌격!',color:RED,shape:'burst'},
  heavyCav:{text:'철기 돌진!',color:RED,shape:'burst'},
  horseArcher:{text:'기사 사격!',color:GOLD,shape:'balloon'},
  archer:{text:'일제 사격!',color:GOLD,shape:'balloon'},
  crossbow:{text:'연노 발사!',color:GOLD,shape:'balloon'},
  catapult:{text:'투석!',color:BROWN,shape:'burst'},
  ram:{text:'충차 돌입!',color:BROWN,shape:'burst'},
  navy:{text:'접현!',color:BLUE,shape:'balloon'},
  engineer:{text:'공병 돌격!',color:BROWN,shape:'balloon'},
  strategist:{text:'계책!',color:PURPLE,shape:'balloon'},
  fengshui:{text:'풍수!',color:GREEN,shape:'balloon'},
  shaman:{text:'저주!',color:PURPLE,shape:'balloon'},
  maiden:{text:'기원!',color:GREEN,shape:'balloon'},
  taoist:{text:'도술!',color:BLUE,shape:'balloon'},
  monk:{text:'권격!',color:RED,shape:'balloon'},
  bandit:{text:'급습!',color:BROWN,shape:'balloon'},
  civilian:{text:'으악!',color:GREY,shape:'balloon'},
};
export const reactions:Record<string,Emote>={
  counter:{text:'반격!',color:RED,shape:'balloon'},
  critical:{text:'치명타!!',color:RED,shape:'burst'},
  evade:{text:'회피',color:GREY,shape:'balloon'},
  guard:{text:'방어!',color:BLUE,shape:'balloon'},
  crisis:{text:'위기!',color:GOLD,shape:'balloon'},
  retreat:{text:'퇴각…',color:GREY,shape:'balloon'},
  heal:{text:'회복',color:GREEN,shape:'balloon'},
  repair:{text:'수리',color:BROWN,shape:'balloon'},
  rally:{text:'사기 상승',color:GOLD,shape:'balloon'},
  haste:{text:'신속',color:GREEN,shape:'balloon'},
  confusion:{text:'혼란?',color:PURPLE,shape:'balloon'},
  burn:{text:'화상',color:RED,shape:'balloon'},
  bleed:{text:'출혈',color:RED,shape:'balloon'},
  shock:{text:'감전',color:GOLD,shape:'balloon'},
  bound:{text:'포박',color:PURPLE,shape:'balloon'},
  seal:{text:'봉인',color:PURPLE,shape:'balloon'},
  immobile:{text:'속박',color:PURPLE,shape:'balloon'},
  breach:{text:'성문 돌파!',color:GOLD,shape:'burst'},
};
export function cryFor(kind:string,isStrategy=false,strategy=''){
  // 진화 병종은 계열의 외침을 쓴다.
  const unitClass:string=familyOf(kind as UnitClass);
  if(strategy==='heal'||strategy==='calm'||strategy==='mend'||strategy==='greatMend')return reactions.heal!;
  if(strategy==='repair')return reactions.repair!;
  const cry=classCries[unitClass];
  if(isStrategy&&cry&&!['strategist','fengshui','shaman','maiden','taoist','monk'].includes(unitClass))return classCries.strategist!;
  return cry??classCries.infantry!;
}
/** Heavy hits that leave a unit standing below a third of its strength. */
export function isCrisis(hpAfter:number,maxHp:number,damage:number){return hpAfter>0&&damage>0&&hpAfter<=maxHp/3;}
