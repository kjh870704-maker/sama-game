/** Screen-space direction; diagonals use the dominant axis (ties face vertically). */
export function troopFacing(dx:number,dy:number){
 if(dx===0&&dy===0)return {pose:0,flip:1};
 return Math.abs(dy)>=Math.abs(dx)?{pose:dy<0?6:4,flip:1}:{pose:0,flip:dx<0?-1:1};
}
export function troopWalkPose(base:number,progress:number){return base+(Math.floor(Math.max(0,Math.min(1,progress))*6)%2);}

/** Only actual positive damage triggers a physical reaction. */
export function troopReaction(hit:boolean,damage:number,guarded=false):'none'|'hurt'|'guard'{
 return !hit||damage<=0?'none':guarded?'guard':'hurt';
}
export function troopReactionPose(kind:'hurt'|'guard',progress:number){
 return (kind==='guard'?8:10)+(progress>=.5?1:0);
}

export function retreatMotion(progress:number,mechanical=false){
 const p=Math.max(0,Math.min(1,progress));
 return {alpha:1-Math.max(0,(p-.4)/.6),rotation:mechanical?Math.sin(p*Math.PI*6)*.04:Math.min(1,p/.55)*.95,drop:Math.min(1,p/.55)*(mechanical?6:14)};
}

type Pt={x:number;y:number};
/**
 * 전장에서 한 칸씩 걷는 길. 이동 기록은 출발·도착만 남기므로, 그리는 쪽에서 지형 비용을 따라 다시 찾는다
 * (벽·물을 가로질러 미끄러지지 않게). 꺾임이 적은 길을 고르고(조조전처럼 한 축을 먼저), 막히면 막힘을 무시하고,
 * 그래도 없으면 ㄱ자로 간다. 돌려주는 칸에 출발 칸은 없고 도착 칸은 있다.
 */
export function battlePath(from:Pt,to:Pt,cost:(c:Pt)=>number,blocked:(c:Pt)=>boolean=()=>false):Pt[]{
  if(from.x===to.x&&from.y===to.y)return [];
  const find=(avoid:boolean)=>{
    const k=(c:Pt)=>c.x+','+c.y,best=new Map<string,number>([[k(from)+':-1',0]]),prev=new Map<string,string>();
    const open:Array<{c:Pt;d:number;dir:number;s:string}>=[{c:from,d:0,dir:-1,s:k(from)+':-1'}];
    const lim=Math.abs(to.x-from.x)+Math.abs(to.y-from.y)+8;
    while(open.length){
      open.sort((a,b)=>a.d-b.d);const cur=open.shift()!;
      if(cur.c.x===to.x&&cur.c.y===to.y){const out:Pt[]=[];let s:string|undefined=cur.s;while(s&&!s.startsWith(k(from)+':')){const [xy]=s.split(':');const [x,y]=xy!.split(',').map(Number);out.unshift({x:x!,y:y!});s=prev.get(s);}return out;}
      if(cur.d>(best.get(cur.s)??Infinity))continue;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy],dir)=>{
        const n={x:cur.c.x+dx!,y:cur.c.y+dy!};
        if(Math.abs(n.x-from.x)+Math.abs(n.y-from.y)>lim)return;
        const isGoal=n.x===to.x&&n.y===to.y,c=cost(n);if(!Number.isFinite(c)&&!isGoal)return;
        if(avoid&&!isGoal&&blocked(n))return;
        const nd=cur.d+(Number.isFinite(c)?c:1)+(cur.dir>=0&&cur.dir!==dir?0.35:0),s=k(n)+':'+dir;
        if(nd<(best.get(s)??Infinity)){best.set(s,nd);prev.set(s,cur.s);open.push({c:n,d:nd,dir,s});}
      });
    }
    return null;
  };
  const p=find(true)??find(false);if(p)return p;
  const out:Pt[]=[];let {x,y}=from;while(x!==to.x){x+=Math.sign(to.x-x);out.push({x,y});}while(y!==to.y){y+=Math.sign(to.y-y);out.push({x,y});}return out;
}
/** 걷는 그림: 칸마다 두 걸음(왼발·오른발). 걷는 그림이 따로 있는 병종은 그 그림, 없는 병종은 같은 자세의 두 그림(0·3)을 번갈아. */
export function stepPose(hasWalkArt:boolean,facingPose:number,step:number,half:boolean){
  const foot=(step*2+(half?1:0))%2;
  return hasWalkArt?facingPose+foot:(foot?3:0);
}
