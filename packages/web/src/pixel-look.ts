/** Ground art is 24 dots per tile drawn twice as large. When a dot covers a whole
 * number of device pixels every dot is the same size; otherwise neighbours alternate
 * between two widths and the dithering shimmers. Zoom steps snap to those sizes. */
export const ART_SCALE=2;
export function crispZoom(z:number,resolution=1,direction=0,max=1.8){
  const unit=ART_SCALE*resolution,k=z*unit;
  if(k<2)return z;
  const n=direction>0?Math.ceil(k-1e-6):direction<0?Math.floor(k+1e-6):Math.round(k);
  return Math.max(2,Math.min(n,Math.floor(max*unit+1e-6)))/unit;
}
/** Nearest keeps dots hard only at whole-pixel sizes; in between, smooth is steadier. */
export function groundScaleMode(zoom:number,resolution=1):'nearest'|'linear'{
  const k=ART_SCALE*zoom*resolution;return k>=1&&Math.abs(k-Math.round(k))<.02?'nearest':'linear';
}

const multiply=(a:number,b:number)=>[16,8,0].reduce((out,s)=>out|(Math.round(((a>>s)&255)*((b>>s)&255)/255)<<s),0);
/** Side tint stays light so armour detail survives; units that already acted turn grey
 * like the classic games instead of fading into the ground. */
export function unitTint(u:{id:string;side:string;hasActed:boolean}){
  // 진영 색은 옷을 물들여 나타낸다(dye.ts). 틴트는 행동을 마친 부대를 회색으로만.
  const side=u.id==='rescue_target'&&u.side==='enemy'?0xfff0c8:0xffffff;
  return u.hasActed?multiply(side,0xa0a0a0):side;
}
