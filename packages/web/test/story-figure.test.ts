import {describe,expect,it} from 'vitest';
import {figArtFor} from '../src/story-figure.ts';

describe('이야기 무대 인물은 기존 그림을 쓴다',()=>{
  it('전신 일러스트가 있는 장수는 그 그림',()=>{
    expect(figArtFor('사마의','strategist')).toEqual({kind:'fig',slot:0,tint:0});
    expect(figArtFor('허저','heavy')).toEqual({kind:'fig',slot:7,tint:0});
  });
  it('황제는 관을 쓴 군주 그림',()=>{
    expect(figArtFor('헌제','civil')).toMatchObject({kind:'fig',slot:5});
  });
  it('이름 없는 병사·백성은 병종 그림, 말 탄 병종은 말에서 내린다',()=>{
    expect(figArtFor('창병','spear')).toEqual({kind:'sheet',look:'spear'});
    expect(figArtFor('기마 척후','cavalry')).toEqual({kind:'sheet',look:'infantry'});
    expect(figArtFor('의원','physician')).toEqual({kind:'sheet',look:'physician'});
  });
});

import {battlePath,stepPose} from '../src/troop-motion.ts';
describe('전장 이동은 길을 따라 한 칸씩',()=>{
  it('막힌 칸을 돌아간다',()=>{
    const wall=new Set(['1,0','1,1']);
    const path=battlePath({x:0,y:0},{x:2,y:0},c=>wall.has(c.x+','+c.y)||c.x<0||c.y<0||c.x>3||c.y>3?Infinity:1);
    expect(path.at(-1)).toEqual({x:2,y:0});
    for(const c of path)expect(wall.has(c.x+','+c.y)).toBe(false);
    // 칸마다 한 걸음(대각선으로 건너뛰지 않음)
    let prev={x:0,y:0};for(const c of path){expect(Math.abs(c.x-prev.x)+Math.abs(c.y-prev.y)).toBe(1);prev=c;}
  });
  it('꺾임이 적은 길을 고른다',()=>{
    const path=battlePath({x:0,y:0},{x:3,y:3},()=>1);
    let turns=0;for(let i=2;i<path.length;i++){const a=path[i-2]!,b=path[i-1]!,c=path[i]!;if((b.x-a.x)!==(c.x-b.x))turns++;}
    expect(path.length).toBe(6);expect(turns).toBeLessThanOrEqual(1);
  });
  it('걸음마다 왼발·오른발이 번갈아',()=>{
    expect([stepPose(true,4,0,false),stepPose(true,4,0,true),stepPose(true,4,1,false)]).toEqual([4,5,4]);
    expect([stepPose(false,0,0,false),stepPose(false,0,0,true)]).toEqual([0,3]);
  });
});
