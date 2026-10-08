export const SPRITE_CELL=256;
/** 완성 병종 원화의 몸집(칸 높이 대비): 걷는 병종 대기 자세 키 · 말·수레·배처럼 옆으로 넓은 병종의 키. */
export const FOOT_HEIGHT=.6,MOUNT_HEIGHT=.72;
export interface AtlasPixels {width:number;height:number;data:Uint8ClampedArray}
/** 장수 시트처럼 병종 병사와 몸집을 맞춰야 하는 시트: height=대기 자세 키(칸 높이 대비), aspect=칸 가로÷세로.
 * 칸을 가로로 넓히면 창·칼을 길게 내지른 공격 자세 때문에 몸 전체가 줄어들지 않는다(전장은 칸 비율대로 그린다). */
export interface AtlasFit {height:number;aspect:number}

/** Generated sheets have uneven gutters. Find connected silhouettes before assigning
 * frames, so a spear crossing a nominal cell boundary stays with its owner. */
/** union=true: 같은 칸에 든 실루엣 조각(투석기와 병사, 떠도는 부적)을 한 프레임으로 합친다. 기본은 칸마다 가장 큰 조각만 쓴다. */
export function isolateFrames(source:AtlasPixels,rows:number,columns=4,union=false,alphaCutoff=8,strictGrid=false,fit?:AtlasFit):AtlasPixels {
  const {width,height,data}=source,labels=new Int32Array(width*height);
  if(strictGrid){
    type Box={left:number;top:number;right:number;bottom:number};
    const edgeRadius=3,solid=(p:number)=>data[p*4+3]!>=alphaCutoff;
    // 생성 시트는 행·열 간격이 고르지 않다(06번은 행 높이가 120~160px로 제각각).
    // 불투명 픽셀이 적은 줄을 지나면서 칸 간격이 평균에서 크게 벗어나지 않는 경계선 묶음을 한꺼번에 고른다.
    const cut=(proj:Uint32Array,n:number,parts:number)=>{
      const avg=n/parts,pen=(d:number)=>d<avg*.6?Infinity:200*(d/avg-1)**2;
      const cost=(i:number)=>{let v=0;for(let d=-2;d<=2;d++)v+=proj[Math.min(n-1,Math.max(0,i+d))]!;return v;};
      let cand=[0],acc=[0];const from:number[][]=[],at:number[][]=[];
      for(let k=1;k<parts;k++){
        const lo=Math.max(1,Math.round((k-.5)*avg)),hi=Math.min(n-2,Math.round((k+.5)*avg)),next:number[]=[],nacc:number[]=[],back:number[]=[];
        for(let i=lo;i<=hi;i++){
          let best=Infinity,arg=0;
          cand.forEach((j,t)=>{const v=acc[t]!+pen(i-j);if(v<best){best=v;arg=t;}});
          next.push(i);nacc.push(best+cost(i));back.push(arg);
        }
        from.push(back);at.push(next);cand=next;acc=nacc;
      }
      let t=0,best=Infinity;cand.forEach((j,u)=>{const v=acc[u]!+pen(n-j);if(v<best){best=v;t=u;}});
      const lines=[n];
      for(let k=parts-1;k>=1;k--){lines.unshift(at[k-1]![t]!);t=from[k-1]![t]!;}
      lines.unshift(0);return lines;
    };
    const rowProj=new Uint32Array(height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(solid(y*width+x))rowProj[y]!++;
    const rowLines=cut(rowProj,height,rows),rowOf=new Int16Array(height),colOf:Int16Array[]=[];
    for(let r=0;r<rows;r++){
      for(let y=rowLines[r]!;y<rowLines[r+1]!;y++)rowOf[y]=r;
      const colProj=new Uint32Array(width);
      for(let y=rowLines[r]!;y<rowLines[r+1]!;y++)for(let x=0;x<width;x++)if(solid(y*width+x))colProj[x]!++;
      const colLines=cut(colProj,width,columns),of=new Int16Array(width);
      for(let c=0;c<columns;c++)for(let x=colLines[c]!;x<colLines[c+1]!;x++)of[x]=c;
      colOf.push(of);
    }
    const cellAt=(x:number,y:number)=>rowOf[y]!*columns+colOf[rowOf[y]!]![x]!;
    // 실루엣(연결 덩어리)은 무게중심이 든 칸에 통째로 준다: 이웃 행의 발끝·창끝이 남의 칸에 끼지 않는다.
    // 칸을 크게 넘게 걸친 덩어리(붙어 버린 두 병사)만 경계선으로 자른다. 먼지 같은 아주 작은 조각은 버린다.
    const queue=new Int32Array(width*height),compCell=[-1],compArea=[0];
    let id=0;
    for(let start=0;start<labels.length;start++){
      if(labels[start]||!solid(start))continue;
      id++;let head=0,tail=1,sx=0,sy=0,l=width,t=height,r=0,b=0;queue[0]=start;labels[start]=id;
      while(head<tail){
        const p=queue[head++]!,x=p%width,y=(p-x)/width;sx+=x;sy+=y;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
          const q=ny*width+nx;if(labels[q]||!solid(q))continue;labels[q]=id;queue[tail++]=q;
        }
      }
      const cx=Math.round(sx/tail),cy=Math.round(sy/tail),row=rowOf[cy]!;
      const bandH=rowLines[row+1]!-rowLines[row]!,colW=width/columns;
      // 가로는 1.5칸까지 한 덩어리로 본다: 긴 창을 내지른 병사(1.26칸)가 경계선에서 잘려 창 뒤쪽이 옆 칸으로 가던 문제. 붙어 버린 두 병사는 2칸 가까이 된다.
      compCell.push(tail<16?-2:(b-t+1)<=bandH*1.25&&(r-l+1)<=colW*1.5?cellAt(cx,cy):-1);compArea.push(tail);
    }
    // 떨어져 나온 조각(창대·창끝·날아가는 돌)은 무게중심이 아니라 가장 가까운 몸통의 칸으로 보낸다.
    // 경계를 넘는 긴 창은 무게중심이 이웃 칸에 떨어져 공격 동작의 창이 사라지고 옆 칸에 창만 떠 있었다.
    const anchor=new Int32Array(rows*columns);
    for(let c=1;c<=id;c++){const cell=compCell[c]!;if(cell>=0&&compArea[c]!>compArea[anchor[cell]!]!)anchor[cell]=c;}
    const anchorCell=new Int16Array(id+1).fill(-1);
    anchor.forEach((c,cell)=>{if(c)anchorCell[c]=cell;});
    const near=new Int16Array(width*height).fill(-1),dist=new Int32Array(width*height);
    let head=0,tail=0;
    for(let p=0;p<labels.length;p++){const c=anchorCell[labels[p]!]!;if(labels[p]&&c>=0){near[p]=c;queue[tail++]=p;}}
    while(head<tail){
      const p=queue[head++]!,x=p%width;
      // 행 경계는 넘지 않는다: 아래 행의 돌이 위 행 투석기에 붙지 않게.
      for(const q of [x>0?p-1:-1,x<width-1?p+1:-1,p-width,p+width]){if(q<0||q>=near.length||near[q]!>=0||rowOf[(q-q%width)/width]!==rowOf[(p-x)/width])continue;near[q]=near[p]!;dist[q]=dist[p]!+1;queue[tail++]=q;}
    }
    const best=new Int32Array(id+1).fill(-1);
    for(let p=0;p<labels.length;p++){
      const c=labels[p]!;if(!c||compCell[c]!<0||anchorCell[c]!>=0)continue;
      if(best[c]!<0||dist[p]!<dist[best[c]!]!)best[c]=p;
    }
    for(let c=1;c<=id;c++)if(best[c]!>=0&&near[best[c]!]!>=0)compCell[c]=near[best[c]!]!;
    const cellOf=new Int16Array(width*height).fill(-1);
    for(let p=0;p<labels.length;p++){
      const c=labels[p]?compCell[labels[p]!]!:-2;if(c===-2)continue;
      cellOf[p]=c>=0?c:cellAt(p%width,Math.floor(p/width));
    }
    // 높은 알파의 몸체를 씨앗으로 삼고 가까운 원래 픽셀만 되살린다.
    // 따라서 배경 안개는 버리되 머리술·무기 끝·옷자락의 반투명 안티앨리어싱은 보존된다.
    for(let pass=0;pass<edgeRadius;pass++){
      const next=new Int16Array(cellOf);
      for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
        const p=y*width+x;if(cellOf[p]!>=0||data[p*4+3]!<8)continue;
        for(let dy=-1;dy<=1&&next[p]!<0;dy++)for(let dx=-1;dx<=1;dx++){const c=cellOf[p+dy*width+dx]!;if(c>=0){next[p]=c;break;}}
      }
      cellOf.set(next);
    }
    const boxes:Box[]=Array.from({length:rows*columns},()=>({left:width,top:height,right:-1,bottom:-1}));
    for(let p=0;p<cellOf.length;p++){
      const c=cellOf[p]!;if(c<0)continue;const b=boxes[c]!,x=p%width,y=(p-x)/width;
      b.left=Math.min(b.left,x);b.right=Math.max(b.right,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y);
    }
    boxes.forEach((b,slot)=>{if(b.right<0)throw new Error(`Sprite atlas: empty strict-grid cell ${Math.floor(slot/columns)},${slot%columns}`);});
    const cellW=Math.round(SPRITE_CELL*(fit?.aspect??1)),outWidth=cellW*columns,outHeight=SPRITE_CELL*rows,out=new Uint8ClampedArray(outWidth*outHeight*4);
    // 병종(행)마다 축척을 따로 정해 모든 병종의 몸집을 맞춘다: 걷는 병종은 대기 자세 키가 FOOT_HEIGHT,
    // 말·수레·배·코끼리처럼 옆으로 넓은 병종은 MOUNT_HEIGHT. 한 행의 네 동작은 같은 축척이라 자세가 바뀌어도 몸집이 같다.
    const rowScale=Array.from({length:rows},(_,row)=>{
      const cells=boxes.slice(row*columns,(row+1)*columns),bw=(b:Box)=>b.right-b.left+1,bh=(b:Box)=>b.bottom-b.top+1;
      const idle=cells[0]!,wide=bw(idle)/bh(idle)>1.2,target=(fit?fit.height:wide?MOUNT_HEIGHT:FOOT_HEIGHT)*SPRITE_CELL;
      return Math.min(target/bh(idle),(cellW-8)/Math.max(...cells.map(bw)),(SPRITE_CELL-16)/Math.max(...cells.map(bh)));
    });
    boxes.forEach((b,slot)=>{
      const scale=rowScale[Math.floor(slot/columns)]!,w=Math.round((b.right-b.left+1)*scale),h=Math.round((b.bottom-b.top+1)*scale);
      const ox=(slot%columns)*cellW+Math.floor((cellW-w)/2),oy=Math.floor(slot/columns)*SPRITE_CELL+SPRITE_CELL-14-h;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const sx=b.left+Math.min(b.right-b.left,Math.floor(x/scale)),sy=b.top+Math.min(b.bottom-b.top,Math.floor(y/scale)),p=sy*width+sx;
        if(cellOf[p]!==slot)continue;
        out.set(data.subarray(p*4,p*4+4),((oy+y)*outWidth+ox+x)*4);
      }
    });
    return {width:outWidth,height:outHeight,data:out};
  }
  const queue=new Int32Array(width*height);
  const groups:Array<{id:number;size:number;left:number;top:number;right:number;bottom:number}>=[];
  let id=0;
  for(let start=0;start<labels.length;start++){
    if(labels[start]||data[start*4+3]!<alphaCutoff)continue;
    id++;let head=0,tail=1;queue[0]=start;labels[start]=id;
    let left=width,top=height,right=0,bottom=0;
    while(head<tail){
      const p=queue[head++]!,x=p%width,y=Math.floor(p/width);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const n of [x>0?p-1:-1,x+1<width?p+1:-1,y>0?p-width:-1,y+1<height?p+width:-1]){
        if(n>=0&&!labels[n]&&data[n*4+3]!>=alphaCutoff){labels[n]=id;queue[tail++]=n;}
      }
    }
    if(tail>=100)groups.push({id,size:tail,left,top,right,bottom});
  }
  type Frame={ids:Set<number>;size:number;left:number;top:number;right:number;bottom:number};
  const frames=new Map<number,Frame>();
  for(const g of groups){
    const col=Math.min(columns-1,Math.floor((g.left+g.right)/2/(width/columns)));
    const row=Math.min(rows-1,Math.floor((g.top+g.bottom)/2/(height/rows)));
    const slot=row*columns+col,cur=frames.get(slot);
    if(!cur)frames.set(slot,{ids:new Set([g.id]),size:g.size,left:g.left,top:g.top,right:g.right,bottom:g.bottom});
    else if(union){cur.ids.add(g.id);cur.size+=g.size;cur.left=Math.min(cur.left,g.left);cur.top=Math.min(cur.top,g.top);cur.right=Math.max(cur.right,g.right);cur.bottom=Math.max(cur.bottom,g.bottom);}
    else if(cur.size<g.size)frames.set(slot,{ids:new Set([g.id]),size:g.size,left:g.left,top:g.top,right:g.right,bottom:g.bottom});
  }
  if(frames.size!==rows*columns)throw new Error(`Sprite atlas: expected ${rows*columns} complete silhouettes, found ${frames.size}`);
  const outWidth=SPRITE_CELL*columns,outHeight=SPRITE_CELL*rows;
  const out=new Uint8ClampedArray(outWidth*outHeight*4);
  // One scale for the whole sheet preserves body size between attack poses.
  const scale=Math.min(...[...frames.values()].map(g=>(SPRITE_CELL-28)/Math.max(g.right-g.left+1,g.bottom-g.top+1)));
  for(const [slot,g] of frames){
    const w=Math.round((g.right-g.left+1)*scale),h=Math.round((g.bottom-g.top+1)*scale);
    const ox=(slot%columns)*SPRITE_CELL+Math.floor((SPRITE_CELL-w)/2),oy=Math.floor(slot/columns)*SPRITE_CELL+SPRITE_CELL-14-h;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const sx=g.left+Math.min(g.right-g.left,Math.floor(x/scale)),sy=g.top+Math.min(g.bottom-g.top,Math.floor(y/scale)),p=sy*width+sx;
      if(!g.ids.has(labels[p]!))continue;
      const dest=((oy+y)*outWidth+ox+x)*4;out.set(data.subarray(p*4,p*4+4),dest);
    }
  }
  return {width:outWidth,height:outHeight,data:out};
}

const cache=new Map<string,Promise<HTMLCanvasElement>>();
function toCanvas(p:AtlasPixels){
  const canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.height;
  const g=canvas.getContext('2d',{willReadFrequently:true})!,img=g.createImageData(p.width,p.height);img.data.set(p.data);g.putImageData(img,0,0);return canvas;
}
/** Small worker pool: every sheet is cut in parallel, away from the main thread. */
type Job={url:string;blob:Blob;rows:number;columns:number;union:boolean;alphaCutoff:number;strictGrid:boolean;fit?:AtlasFit;resolve:(c:HTMLCanvasElement)=>void;reject:(e:unknown)=>void};
const queue:Job[]=[],idle:Worker[]=[],pending=new Map<number,Job>(),running=new Map<Worker,number>();let workers=0,jobs=0;
/** 작업자 파일을 못 불러오면(배포 누락·차단) 다시 쓰지 않고 메인 스레드에서 자른다. 대기가 끝나지 않아 화면이 멈추는 일을 막는다. */
let workerBroken=false;
const JOB_TIMEOUT=45000;
async function download(url:string){const r=await fetch(url);if(!r.ok)throw new Error('sheet '+r.status+' '+url);return r.blob();}
const poolSize=()=>Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1));
function failAll(reason:string){
  workerBroken=true;
  for(const job of pending.values())job.reject(new Error(reason));pending.clear();running.clear();
  for(const job of queue.splice(0))job.reject(new Error(reason));
}
function dispatch(){
  while(queue.length){
    if(workerBroken){failAll('atlas worker unavailable');return;}
    let w=idle.pop();
    if(!w){if(workers>=poolSize())return;workers++;
      try{w=new Worker(new URL('./atlas-worker.ts',import.meta.url),{type:'module'});}catch{failAll('atlas worker could not start');return;}
      const worker=w;
      worker.onerror=()=>{worker.terminate();failAll('atlas worker failed to load');};
      worker.onmessage=(e:MessageEvent<{id:number;width:number;height:number;plain:ArrayBuffer;rim:ArrayBuffer;error?:string}>)=>{
        const d=e.data,job=pending.get(d.id);pending.delete(d.id);running.delete(worker);idle.push(worker);
        if(job){if(d.error)job.reject(new Error(d.error));else{const plain=toCanvas({width:d.width,height:d.height,data:new Uint8ClampedArray(d.plain)});rims.set(plain,toCanvas({width:d.width,height:d.height,data:new Uint8ClampedArray(d.rim)}));job.resolve(plain);}}
        dispatch();};}
    const job=queue.shift()!,id=++jobs;pending.set(id,job);running.set(w,id);
    // 답이 오지 않는 작업은 메인 스레드로 넘긴다(작업자가 조용히 죽은 경우). 시간은 자르기만 잰다.
    setTimeout(()=>{const j=pending.get(id);if(j){pending.delete(id);j.reject(new Error('atlas worker timed out'));}},JOB_TIMEOUT);
    w.postMessage({id,url:new URL(job.url,location.href).href,blob:job.blob,rows:job.rows,columns:job.columns,union:job.union,alphaCutoff:job.alphaCutoff,strictGrid:job.strictGrid,fit:job.fit});
  }
}
async function onMainThread(url:string,rows:number,columns:number,union=false,alphaCutoff=8,strictGrid=false,fit?:AtlasFit){
  const img=new Image();img.src=url;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(img,0,0);
  return toCanvas(isolateFrames(context.getImageData(0,0,canvas.width,canvas.height),rows,columns,union,alphaCutoff,strictGrid,fit));
}
export function spriteAtlas(url:string,rows:number,columns=4,union=false,alphaCutoff=8,strictGrid=false,fit?:AtlasFit){
  // 문서 기준 상대 경로를 완전한 주소로: 워커는 자기 스크립트 위치를 기준으로 경로를 풀기 때문이다.
  url=typeof document!=='undefined'?new URL(url,document.baseURI).href:url;
  const key=url+':'+rows+':'+columns+(union?':u':'')+':a'+alphaCutoff+(strictGrid?':g':'')+(fit?`:f${fit.height}x${fit.aspect}`:'');
  if(!cache.has(key))cache.set(key,workerBroken||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'?onMainThread(url,rows,columns,union,alphaCutoff,strictGrid,fit):
    // 받기는 메인 스레드가 브라우저에 맡기고(느린 회선에서도 시간 제한에 걸리지 않게), 자르기만 작업자에게 넘긴다.
    download(url).then(blob=>new Promise<HTMLCanvasElement>((resolve,reject)=>{queue.push({url,blob,rows,columns,union,alphaCutoff,strictGrid,...(fit?{fit}:{}),resolve,reject});dispatch();})).catch(()=>onMainThread(url,rows,columns,union,alphaCutoff,strictGrid,fit)));
  return cache.get(key)!;
}

/** Dark rim around every silhouette so troops read against busy ground. A chamfer
 * distance keeps the rim round; soft edge pixels are laid over it, not replaced. */
export function outlineFrames(source:AtlasPixels,radius=4,rgb:[number,number,number]=[24,18,14]):AtlasPixels {
  const {width,height,data}=source,n=width*height,dist=new Float32Array(n),out=new Uint8ClampedArray(data);
  for(let i=0;i<n;i++)dist[i]=data[i*4+3]!>=96?0:1e9;
  const relax=(i:number,j:number,c:number)=>{if(dist[j]!+c<dist[i]!)dist[i]=dist[j]!+c;};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;
    if(x>0)relax(i,i-1,1);if(y>0){relax(i,i-width,1);if(x>0)relax(i,i-width-1,1.4);if(x+1<width)relax(i,i-width+1,1.4);}}
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;
    if(x+1<width)relax(i,i+1,1);if(y+1<height){relax(i,i+width,1);if(x+1<width)relax(i,i+width+1,1.4);if(x>0)relax(i,i+width-1,1.4);}}
  for(let i=0;i<n;i++){
    const d=dist[i]!;if(d===0||d>radius)continue;
    const a=data[i*4+3]!/255,rim=Math.min(1,radius+.5-d);
    for(let k=0;k<3;k++)out[i*4+k]=Math.round(data[i*4+k]!*a+rgb[k]!*(1-a));
    out[i*4+3]=Math.round(255*Math.max(a,rim));
  }
  return {width,height,data:out};
}

const rims=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
/** Outlined copy of an atlas canvas for the battlefield; story art keeps its plain edges. */
export function outlinedCanvas(canvas:HTMLCanvasElement,radius=4){
  const old=rims.get(canvas);if(old)return old;
  const g=canvas.getContext('2d',{willReadFrequently:true})!,pixels=outlineFrames(g.getImageData(0,0,canvas.width,canvas.height),radius);
  const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;
  const o=out.getContext('2d')!,img=o.createImageData(out.width,out.height);img.data.set(pixels.data);o.putImageData(img,0,0);
  rims.set(canvas,out);return out;
}
