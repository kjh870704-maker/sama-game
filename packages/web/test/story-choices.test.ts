import {describe,it,expect} from 'vitest';
import {PACKS} from '../src/scenario.ts';

// 연의(상·중·하편)의 모든 장은 적어도 한 번 사마의가 고르는 순간이 있다.
describe('연의 장 선택지',()=>{
  const story=PACKS.slice(0,3).flatMap(p=>p.chapters).filter(c=>!c.id.startsWith('ending:'));
  it('모든 장에 선택지가 하나 이상 있다',()=>{
    const none=story.filter(c=>!c.scenes.some(s=>s.steps.some(x=>'choice' in x))).map(c=>c.id);
    expect(none).toEqual([]);
  });
  it('연의 선택지는 연의에서 남는 효과만 쓴다',()=>{
    const allowed=new Set(['rally','guard','insight','flag','duel','debate']);
    for(const c of story)for(const s of c.scenes)for(const x of s.steps)
      if('choice' in x)for(const o of x.options)for(const e of o.effects??[])expect(allowed.has(e.kind),`${c.id} ${o.id} ${e.kind}`).toBe(true);
  });
});
