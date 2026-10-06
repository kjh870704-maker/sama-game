import {OFFICERS,deployment,levelInfo,type Campaign} from './progression.ts';
import {allStrategies,talentTree} from './officers.ts';
import {evolvedClass,VARIANTS,type UnitClass} from '../../core/src/index.ts';
import {classNames} from './troops.ts';

/** 장수의 기본 병종. 레벨이 기준에 닿으면 전투에서 진화한 병종으로 나선다. */
export const officerBaseClass:Record<string,UnitClass>={sima_yi:'strategist',sima_lang:'infantry',sima_fang:'spearman',cao_zhen:'heavyCav'};
/** 이번 레벨 상승으로 바뀐 병종(없으면 undefined). */
export function officerEvolution(id:string,from:number,to:number){const base=officerBaseClass[id];if(!base)return undefined;const a=evolvedClass(base,from),b=evolvedClass(base,to);return a===b?undefined:{from:classNames[a]??a,to:classNames[b]??b,bloom:VARIANTS[b]?.bloom};}

/** Compare campaign state before and after a reward, so reloads never announce it twice. */
export function growthMilestones(before:Campaign,after:Campaign){
 const old=deployment(before,true),next=deployment(after,true);
 return OFFICERS.map(id=>{
  const from=levelInfo(before.xp[id]??0).level,to=levelInfo(after.xp[id]??0).level;
  const previous=talentTree(id,from,old.growth!);
  return {id,from,to,evolution:officerEvolution(id,from,to),talents:talentTree(id,to,next.growth!).filter(t=>t.ready&&!previous.some(p=>p.trait===t.trait&&p.ready)).map(t=>t.name),strategies:id==='sima_yi'?allStrategies.filter(s=>s.level>from&&s.level<=to).map(s=>s.name):[]};
 }).filter(x=>x.to>x.from||x.talents.length||x.strategies.length||x.evolution);
}
