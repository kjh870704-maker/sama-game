import {describe,it,expect} from 'vitest';
import {isolateFrames,SPRITE_CELL} from '../src/sprite-atlas.ts';
import {storyBeats,storyLocations,storyBackdrop} from '../src/story.ts';

describe('story graphics regression',()=>{
  it('keeps a weapon crossing a nominal cell boundary with its owner',()=>{
    const width=100,height=60,data=new Uint8ClampedArray(width*height*4);
    const fill=(x:number,y:number,w:number,h:number,color:number)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*width+xx)*4;data[p]=color;data[p+3]=255;}};
    fill(10,25,22,25,80);fill(25,25,35,4,80); // Red body + long spear across x=50.
    fill(75,30,15,20,200); // Separate neighbor, below the spear.
    const out=isolateFrames({width,height,data},1,2);
    for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
      const p=(y*out.width+x)*4;if(!out.data[p+3])continue;
      expect(out.data[p]).toBe(x<SPRITE_CELL?80:200);
      expect(x%SPRITE_CELL).toBeGreaterThanOrEqual(14);
      expect(x%SPRITE_CELL).toBeLessThan(SPRITE_CELL-14);
    }
    expect(out.data.some((v,i)=>i%4===3&&v>0)).toBe(true);
  });
  it('reports missing silhouettes instead of silently showing the wrong frame',()=>{
    expect(()=>isolateFrames({width:10,height:10,data:new Uint8ClampedArray(400)},1)).toThrow('complete silhouettes');
  });
  it('gives every story beat a named, changing location and valid artwork',()=>{
    for(const [stage,beats] of Object.entries(storyBeats)){
      const locations=storyLocations[stage]!;expect(locations.length).toBe(beats.length);
      locations.forEach((location,i)=>{expect(location.name).toContain('·');expect(location.companion).toBeTruthy();expect(storyBackdrop(location.art)).toContain('background-size:');if(i)expect(location.art).not.toBe(locations[i-1]!.art);});
    }
  });
});
