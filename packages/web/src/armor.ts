/**
 * 병종 진화 단계별 외형 — 같은 계열 그림 위에 단계마다 장비를 더 입힌다(색만 바꾸지 않는다).
 *  1단(기본): 원래 그림.
 *  2단(정예): 강철 광택 갑주 + 진영 색 망토 + 투구 붉은 술 + (기마) 말에 진영 색 마의(馬衣)와 금술.
 *  3단(최정예): 금빛 갑주 + 금테 두른 망토 + 등에 꽂은 두 깃발 + 투구 금 장식 + (기마) 말 전신 철갑(마갑).
 * 그림 한 칸(캔버스)을 받아 새 캔버스를 돌려준다. 전장 텍스처와 도감 그림이 함께 쓴다.
 */
import {DYE_HUE,type Dye} from './dye.ts';

export type ArmorTier=2|3;
const hsl2rgb=(h:number,s:number,l:number):[number,number,number]=>{const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return [(r+m)*255,(g+m)*255,(b+m)*255];};
const css=(h:number,s:number,l:number)=>`hsl(${h} ${s*100}% ${l*100}%)`;

export function armorFrame(src:CanvasImageSource,sx:number,sy:number,fw:number,fh:number,o:{tier:ArmorTier;mounted:boolean;dye:Dye;robe?:boolean;machine?:boolean}):HTMLCanvasElement{
  const sw=Math.round(fw),sh=Math.round(fh),c=document.createElement('canvas');c.width=sw;c.height=sh;const g=c.getContext('2d',{willReadFrequently:true})!;
  g.drawImage(src,sx,sy,fw,fh,0,0,sw,sh);
  const img=g.getImageData(0,0,sw,sh),d=img.data;
  // 그림이 차지한 상자
  // 이웃 칸에서 삐져나온 조각은 빼고, 몇 줄 이어지는 몸통부터 센다.
  const rows=new Array<number>(sh).fill(0);
  for(let y=0;y<sh;y++){let k=0;for(let x=0;x<sw;x++)if(d[(y*sw+x)*4+3]!>60)k++;rows[y]=k;}
  const solid=(y:number)=>{for(let j=0;j<8;j++)if((rows[y+j]??0)<3)return false;return true;};
  let y0=0;while(y0<sh-8&&!solid(y0))y0++;let y1=sh-1;while(y1>y0&&rows[y1]!<3)y1--;
  let x0=sw,x1=0;for(let y=y0;y<=y1;y++)for(let x=0;x<sw;x++)if(d[(y*sw+x)*4+3]!>60){if(x<x0)x0=x;if(x>x1)x1=x;}
  if(x1<=x0||y1<=y0)return c;
  const bw=x1-x0,bh=y1-y0,hue=DYE_HUE[o.dye];
  // 몸통 가운데(어깨 높이의 불투명 점 평균) — 망토·깃발을 등 뒤에 붙인다
  let sum=0,n=0;const sy0=Math.round(y0+bh*(o.mounted?.12:.18)),sy1=Math.round(y0+bh*(o.mounted?.32:.38));
  for(let y=sy0;y<sy1;y++)for(let x=x0;x<=x1;x++)if(d[(y*sw+x)*4+3]!>60){sum+=x;n++;}
  const cx=n?sum/n:(x0+x1)/2,horseTop=y0+bh*.48,horseBot=y0+bh*.74;
  // 말 몸통: 배 높이의 갈색·검은 털 점 가운데 — 마의·마갑은 이 타원 안만 덮는다(목·머리·다리는 그대로)
  let hx=0,hn=0;if(o.mounted)for(let y=Math.round(y0+bh*.56);y<y0+bh*.68;y++)for(let x=x0;x<=x1;x++){const i=(y*sw+x)*4;if(d[i+3]!<60)continue;const r=d[i]!,gg=d[i+1]!,b=d[i+2]!;if(r>=gg&&gg>=b&&r-b>25||Math.max(r,gg,b)<60){hx+=x;hn++;}}
  const hcx=hn?hx/hn:cx,hcy=y0+bh*.6,hrx=bw*.27,hry=bh*.13;
  const inHorse=(x:number,y:number)=>((x-hcx)/hrx)**2+((y-hcy)/hry)**2<=1;
  // 1) 갑주: 무채색 쇳빛 → 강철(2단) / 금(3단), 금빛은 더 밝게, 말 몸통은 마의(2단)·마갑(3단)
  const stripe=Math.max(3,Math.round(bh*.045));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=(y*sw+x)*4;if(d[i+3]!<40)continue;
    const r=d[i]!/255,gg=d[i+1]!/255,b=d[i+2]!/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),dl=mx-mn,l=(mx+mn)/2,s=dl===0?0:dl/(1-Math.abs(2*l-1));
    let h=dl===0?0:mx===r?((gg-b)/dl)%6:mx===gg?(b-r)/dl+2:(r-gg)/dl+4;h=(h*60+360)%360;
    const onHorse=o.mounted&&inHorse(x,y);
    let out:[number,number,number]|undefined;
    if(onHorse&&((h<=45||h>=340)&&s>.18&&l<.62||l<.2)){
      // 말: 갈색·검은 털
      // 2단: 진영 색 마의 + 아래 금술 / 3단: 미늘 철갑(비늘 줄마다 그늘, 세 줄마다 금테)
      if(o.tier===2){const edge=((x-hcx)/hrx)**2+((y+stripe*1.2-hcy)/hry)**2>1&&y>hcy;out=edge?((x>>2)%2?hsl2rgb(44,.85,.5+l*.25):hsl2rgb(44,.7,.3)):hsl2rgb(hue,.6,.2+l*.5);}
      else{const row=Math.floor((y-horseTop)/stripe),cell=Math.floor((x+(row%2)*stripe/2)/stripe),inRow=(y-horseTop)%stripe,inCell=(x+(row%2)*stripe/2)%stripe;
        const goldRow=row%3===2,shade=inRow>=stripe-1||inCell===0;void cell;
        out=goldRow&&!shade?hsl2rgb(44,.82,.42+l*.3):shade?hsl2rgb(214,.12,.16+l*.2):hsl2rgb(210,.1,.42+l*.4);}
    }else if(!o.robe&&s<.2&&l>.22&&l<.88){
      // 쇳빛(투구·미늘·칼은 빼지 않는다: 3단은 금빛으로 번쩍인다)
      out=o.tier===2?hsl2rgb(206,.24,Math.min(.95,l*1.15+.08)):hsl2rgb(43,.72,Math.min(.88,.28+l*.62));
    }else if(h>=28&&h<=58&&s>.3){
      out=o.tier===2?undefined:hsl2rgb(45,Math.min(1,s*1.1),Math.min(.9,l*1.12+.04));
    }
    if(out){d[i]=out[0];d[i+1]=out[1];d[i+2]=out[2];}
  }
  g.putImageData(img,0,0);
  const lw=Math.max(2,Math.round(bw*.018));
  // 2) 등 뒤(그림 아래층): 깃발(3단)과 망토
  g.save();g.globalCompositeOperation='destination-over';g.lineJoin='round';
  if(o.tier===3){
    for(const k of [0,1]){const px=cx-bw*(.1+k*.09),top=Math.max(2,y0-bh*(.16-k*.05)),base=y0+bh*(o.mounted?.3:.36);
      const fw=bw*.2,fh=bh*.17;
      g.fillStyle=css(hue,.7,.42);g.strokeStyle='#1a0e04';g.lineWidth=lw;
      g.beginPath();g.moveTo(px,top+2);g.lineTo(px-fw,top+fh*.1);g.lineTo(px-fw*.82,top+fh*.5);g.lineTo(px-fw,top+fh);g.lineTo(px,top+fh);g.closePath();g.fill();g.stroke();
      g.strokeStyle=css(44,.85,.55);g.lineWidth=Math.max(1,lw*.7);g.beginPath();g.moveTo(px-2,top+fh-lw);g.lineTo(px-fw+lw,top+fh-lw);g.stroke();
      g.fillStyle=css(44,.9,.6);g.beginPath();g.arc(px-fw*.45,top+fh*.5,Math.max(2,fh*.16),0,Math.PI*2);g.fill();
      g.strokeStyle='#1a0e04';g.lineWidth=lw*1.6;g.beginPath();g.moveTo(px,base);g.lineTo(px,top);g.stroke();
      g.strokeStyle='#8a5a28';g.lineWidth=lw*.8;g.beginPath();g.moveTo(px,base);g.lineTo(px,top);g.stroke();
      g.fillStyle=css(44,.9,.58);g.beginPath();g.arc(px,top,lw*1.2,0,Math.PI*2);g.fill();}
  }
  // 망토: 어깨에서 등 뒤(왼쪽)로 흘러내린다(수레·배는 없음)
  if(!o.machine){const shY=y0+bh*(o.mounted?.17:.2),endY=y0+bh*(o.mounted?.5:.8),back=cx-bw*(o.mounted?.3:.46);
    g.fillStyle=css(hue,.66,o.tier===3?.34:.4);g.strokeStyle='#120a04';g.lineWidth=lw;
    g.beginPath();g.moveTo(cx+bw*.04,shY);g.quadraticCurveTo(cx-bw*.1,shY+bh*.02,back,endY);
    g.quadraticCurveTo(back+bw*.12,endY+bh*.03,cx-bw*.02,endY-bh*.06);g.quadraticCurveTo(cx-bw*.02,shY+bh*.2,cx+bw*.04,shY);g.closePath();g.fill();g.stroke();
    if(o.tier===3){g.strokeStyle=css(44,.85,.55);g.lineWidth=Math.max(1.5,lw*.8);g.beginPath();g.moveTo(back+lw,endY-lw);g.quadraticCurveTo(back+bw*.12,endY+bh*.02,cx-bw*.03,endY-bh*.07);g.stroke();}}
  g.restore();
  // 3) 투구 술(위층) — 책사·술사(옷차림)는 3단에 머리 뒤 금빛 둥근 빛
  if(o.machine){/* 수레·배: 술 대신 깃발만 */}
  else if(o.robe){if(o.tier===3){let tx=cx;for(let x=x0;x<=x1;x++)if(d[(y0*sw+x)*4+3]!>60){tx=x;break;}const r=bw*.16;g.save();g.globalCompositeOperation='destination-over';g.strokeStyle=css(44,.9,.6);g.lineWidth=Math.max(2,lw*1.2);g.beginPath();g.arc(tx,y0+r*.9,r,0,Math.PI*2);g.stroke();g.fillStyle=css(48,.9,.7)+'';g.globalAlpha=.25;g.fill();g.restore();}}
  else {let tx=cx;{let a=-1,b=-1;for(let x=x0;x<=x1;x++)if(d[(y0*sw+x)*4+3]!>60){if(a<0)a=x;b=x;}if(a>=0)tx=(a+b)/2;}{
    const r=Math.max(3,bw*.035),ty=y0+r*.6;
    g.fillStyle=o.tier===3?css(44,.9,.56):'#c0242a';g.strokeStyle='#160804';g.lineWidth=Math.max(1,lw*.6);
    g.beginPath();g.ellipse(tx,ty,r*.8,r*1.4,-.35,0,Math.PI*2);g.fill();g.stroke();
    if(o.tier===3){g.fillStyle='#c0242a';g.beginPath();g.ellipse(tx-r*.6,ty+r*.9,r*.7,r*1.1,-.8,0,Math.PI*2);g.fill();g.stroke();}}}
  return c;
}

/** 말 탄 계열인가(말 갑옷을 입힌다). */
export const MOUNTED_FAMILIES=new Set(['cavalry','heavyCav','horseArcher']);
/** 갑옷 대신 옷차림이 진화하는 계열(책사·술사·의원). */
export const MACHINE_FAMILIES=new Set(['ram','catapult','navy']);
export const ROBE_FAMILIES=new Set(['strategist','fengshui','shaman','maiden','taoist','civilian']);
