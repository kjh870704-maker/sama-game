import {describe,expect,it} from 'vitest';
import {isolateFrames,SPRITE_CELL} from '../src/sprite-atlas.ts';
import {officerModelSheets} from '../src/officer-models.ts';

/** 칸마다 사각형 하나(대기 자세는 좁고, 공격 자세는 창을 내지른 듯 가로로 긴) 4칸×1줄 시트. */
function sheet(){
  const cw=280,ch=224,width=cw*4,height=ch,data=new Uint8ClampedArray(width*height*4);
  const rect=(c:number,w:number,h:number)=>{const x0=c*cw+Math.floor((cw-w)/2),y0=ch-20-h;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)data.set([200,120,60,255],(y*width+x)*4);};
  rect(0,70,120);rect(1,70,120);rect(2,260,120);rect(3,70,120);
  return {width,height,data};
}
const idleHeight=(p:{width:number;height:number;data:Uint8ClampedArray},cellW:number)=>{let top=1e9,bottom=-1;for(let y=0;y<p.height;y++)for(let x=0;x<cellW;x++)if(p.data[(y*p.width+x)*4+3]!>24){top=Math.min(top,y);bottom=Math.max(bottom,y);}return bottom-top+1;};

describe('장수 시트 몸집 맞춤',()=>{
  it('fit이 없으면 긴 공격 자세 때문에 몸 전체가 줄어든다',()=>{
    const out=isolateFrames(sheet(),1,4,false,8,true);
    expect(out.width).toBe(SPRITE_CELL*4);
    expect(idleHeight(out,SPRITE_CELL)).toBeLessThan(SPRITE_CELL*.6-10);
  });
  it('fit을 주면 칸을 넓혀 대기 자세 키를 병사와 같게 맞춘다',()=>{
    const out=isolateFrames(sheet(),1,4,false,8,true,{height:.6,aspect:1.5});
    expect(out.width).toBe(SPRITE_CELL*1.5*4);
    expect(Math.abs(idleHeight(out,SPRITE_CELL*1.5)-SPRITE_CELL*.6)).toBeLessThanOrEqual(2);
  });
  it('장수 전투 시트는 모두 병종에 맞는 fit을 가진다',()=>{
    const generated=officerModelSheets.filter(s=>s.id.startsWith('officers/')) as Array<{id:string;fit?:{height:number;aspect:number}}>;
    expect(generated.length).toBeGreaterThan(40);
    // 창을 위로 세워 든 기병 장수는 창끝까지 키로 재므로 말 몸통을 맞추려고 더 크게 잡는다.
    const raised=['meng_yan','bi_yan','zhang_ba','cao_xiu','cao_shuang'].map(id=>`officers/${id}-battle-cavalry-`);
    for(const s of generated){expect(s.fit,s.id).toBeDefined();expect(s.fit!.height,s.id).toBe(s.id.includes('-heavyCav-')?.69:s.id.includes('-cart-')?.7:raised.some(p=>s.id.startsWith(p))?.72:.6);}
  });
});
