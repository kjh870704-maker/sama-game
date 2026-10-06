import {describe,it,expect} from 'vitest';
import {isolateFrames} from '../src/sprite-atlas.ts';
// 칸 안의 떨어진 조각(투석기 옆 병사처럼): union이면 한 프레임에 함께 담겨 프레임이 넓어지고, 아니면 가장 큰 조각만 남는다.
function sheet(){
  const width=400,height=100,data=new Uint8ClampedArray(width*height*4);
  const put=(x:number,y:number)=>{const i=(y*width+x)*4;data[i]=200;data[i+3]=255;};
  for(let c=0;c<4;c++)for(let y=20;y<90;y++)for(let x=c*100+20;x<c*100+50;x++)put(x,y);
  for(let y=10;y<40;y++)for(let x=60;x<90;x++)put(x,y); // 0칸의 두 번째 조각
  return {width,height,data};
}
function cell0Aspect(img:{width:number;height:number;data:Uint8ClampedArray}){
  const cw=img.width/4;let l=cw,r=0,t=img.height,b=0;
  for(let y=0;y<img.height;y++)for(let x=0;x<cw;x++)if(img.data[(y*img.width+x)*4+3]!>0){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  return (r-l+1)/(b-t+1);
}
describe('isolateFrames union',()=>{
  it('keeps every piece of a cell together when union is on',()=>{
    const plain=cell0Aspect(isolateFrames(sheet(),1,4,false)),merged=cell0Aspect(isolateFrames(sheet(),1,4,true));
    expect(plain).toBeLessThan(0.5);   // 몸통만: 30×70
    expect(merged).toBeGreaterThan(0.8); // 몸통+조각: 70×80
  });

  it('cuts regular generated grids cell-by-cell and removes translucent background haze',()=>{
    const width=400,height=200,data=new Uint8ClampedArray(width*height*4);
    for(let p=0;p<width*height;p++){data[p*4]=40;data[p*4+1]=30;data[p*4+2]=20;data[p*4+3]=30;}
    for(let row=0;row<2;row++)for(let col=0;col<4;col++)for(let y=row*100+18;y<row*100+82;y++)for(let x=col*100+23;x<col*100+77;x++){
      const p=(y*width+x)*4;data[p]=30;data[p+1]=90;data[p+2]=180;data[p+3]=120;
    }
    for(let row=0;row<2;row++)for(let col=0;col<4;col++)for(let y=row*100+20;y<row*100+80;y++)for(let x=col*100+25;x<col*100+75;x++){
      const p=(y*width+x)*4;data[p]=30;data[p+1]=90;data[p+2]=180;data[p+3]=255;
    }
    expect(()=>isolateFrames({width,height,data},2,4,true,8)).toThrow('complete silhouettes');
    const clean=isolateFrames({width,height,data},2,4,true,240,true),alphas=[] as number[];
    for(let p=0;p<clean.width*clean.height;p++)alphas.push(clean.data[p*4+3]!);
    expect(clean.width).toBe(1024);expect(clean.height).toBe(512);
    expect(alphas).toContain(255);expect(alphas).toContain(120);
    expect(clean.data[3]).toBe(0); // 먼 배경 안개는 남지 않는다.
  });

  // 실제 4단계 시트에서 나온 두 오류의 재현: 경계를 넘어 내지른 창, 경계 근처를 날아가는 돌.
  const strictSheet=(paint:(put:(x:number,y:number,rgb:[number,number,number])=>void)=>void)=>{
    const width=400,height=100,data=new Uint8ClampedArray(width*height*4);
    const put=(x:number,y:number,[r,g,b]:[number,number,number])=>{const i=(y*width+x)*4;data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;};
    const body=(x0:number,x1:number)=>{for(let y=40;y<90;y++)for(let x=x0;x<=x1;x++)put(x,y,[40,60,180]);};
    body(30,80);body(330,380);paint(put);
    return isolateFrames({width,height,data},1,4,false,240,true);
  };
  const redIn=(img:{width:number;height:number;data:Uint8ClampedArray},cell:number)=>{
    const cw=img.width/4;let n=0;
    for(let y=0;y<img.height;y++)for(let x=cell*cw;x<(cell+1)*cw;x++){const i=(y*img.width+x)*4;if(img.data[i+3]!>200&&img.data[i]!>150&&img.data[i+2]!<100)n++;}
    return n;
  };
  it('keeps a spear that reaches past the cell line with the soldier holding it',()=>{
    const img=strictSheet(put=>{
      for(let y=40;y<90;y++)for(let x=125;x<=175;x++)put(x,y,[40,60,180]);
      for(let y=60;y<63;y++)for(let x=150;x<=255;x++)put(x,y,[220,40,40]); // 1.3칸 너비가 되는 창
      for(let y=40;y<90;y++)for(let x=262;x<=300;x++)put(x,y,[40,60,180]);
    });
    expect(redIn(img,1)).toBeGreaterThan(0);
    expect(redIn(img,2)).toBe(0);
  });
  it('gives a detached projectile to the nearest body, not the cell holding its centre',()=>{
    const img=strictSheet(put=>{
      for(let y=40;y<90;y++)for(let x=130;x<=185;x++)put(x,y,[40,60,180]);
      for(let y=10;y<21;y++)for(let x=205;x<=221;x++)put(x,y,[220,40,40]); // 경계 너머에 무게중심이 있는 돌
      for(let y=40;y<90;y++)for(let x=262;x<=300;x++)put(x,y,[40,60,180]);
    });
    expect(redIn(img,1)).toBeGreaterThan(0);
    expect(redIn(img,2)).toBe(0);
  });
});
