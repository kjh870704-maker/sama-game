import type {LogEntry} from '../../core/src/index.ts';
/** Strategy damage is logged after its per-target retreats by the engine. */
export function playbackEvents(logs:LogEntry[]):LogEntry[]{
 const delayed=new Map<number,LogEntry[]>(),out:LogEntry[]=[];
 for(let i=0;i<logs.length;i++){
  const e=logs[i]!;
  if(e.t==='retreat'){
   let after=-1;
   for(let j=i+1;j<logs.length;j++){const next=logs[j]!;
    if(next.t==='strategy'){if(next.targets.includes(e.unit))after=j;break;}
    if(['attack','counter','move','turnStart','outcome'].includes(next.t))break;
   }
   if(after>=0){delayed.set(after,[...(delayed.get(after)??[]),e]);continue;}
  }
  if(['move','attack','counter','strategy','guard','retreat','strike'].includes(e.t))out.push(e);
  out.push(...(delayed.get(i)??[]));
 }
 return out;
}
