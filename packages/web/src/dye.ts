/**
 * 진영 색 물들이기 — 조조전처럼 아군은 파랑, 적군은 빨강, NPC(자동 우군)는 초록 옷을 입는다.
 *
 * 병사 그림은 시트마다 옷 색이 하나로 정해져 있다(기본 병사 파랑, 추가 병사 청록, 술사·특수병 빨강).
 * 그 옷 색 띠(색상 범위)에 드는 선명한 점만 진영 색으로 돌리고, 피부·갑옷의 금박·나무·말은 그대로 둔다.
 */
export type Dye='blue'|'red'|'green';
export const DYE_HUE:Record<Dye,number>={blue:218,red:358,green:128};

/** 진영 → 옷 색. 직접 지휘하는 편입 아군도 우리 편(파랑). */
export function dyeOfSide(side:string):Dye{return side==='enemy'?'red':side==='allyAi'?'green':'blue';}

/** 시트의 옷 색 띠 [시작, 끝] (도). 끝이 시작보다 작으면 0도를 넘어 감긴다. */
export function clothBand(sheet:string):[number,number]{
  if(sheet.startsWith('base'))return [185,258];
  if(sheet.startsWith('extra'))return [140,200];
  if(sheet.startsWith('officers/'))return [200,235];
  return [338,16];
}
const inBand=(h:number,[a,b]:[number,number])=>a<=b?h>=a&&h<=b:h>=a||h<=b;

/** RGBA 점들에서 옷 색 띠의 선명한 점을 목표 색상으로 돌린다(채도·밝기는 유지, 초록은 조금 어둡게).
 * 채색 원화 시트는 천 색이 탁해(채도 0.1~0.2) minSat를 낮추고 boost로 채도를 조금 올려 부른다. */
export function dyePixels(data:Uint8ClampedArray,band:[number,number],dye:Dye,minSat=.22,boost=1){
  const target=DYE_HUE[dye];
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]!<8)continue;
    const r=data[i]!/255,g=data[i+1]!/255,b=data[i+2]!/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
    if(d<.06)continue;
    const l=(mx+mn)/2,s=d/(1-Math.abs(2*l-1));
    if(s<minSat||l<.06||l>.94)continue;
    let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;
    if(!inBand(h,band))continue;
    // 띠 끝자락은 덜 돌려 경계가 번지지 않게 한다.
    const L=dye==='green'?l*.92:dye==='red'?Math.min(.9,l*1.04):l;
    const [nr,ng,nb]=hsl(target,Math.min(1,s*(dye==='blue'?1:1.05)*boost),L);
    data[i]=Math.round(nr*255);data[i+1]=Math.round(ng*255);data[i+2]=Math.round(nb*255);
  }
  return data;
}
function hsl(h:number,s:number,l:number):[number,number,number]{
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return [r+m,g+m,b+m];
}
/** 같은 색으로 이미 물든 시트인가(파랑 시트를 파랑으로 물들일 필요는 없다). */
export function needsDye(sheet:string,dye:Dye){const [a,b]=clothBand(sheet),mid=a<=b?(a+b)/2:((a+b+360)/2)%360,t=DYE_HUE[dye];return Math.min(Math.abs(mid-t),360-Math.abs(mid-t))>25;}
