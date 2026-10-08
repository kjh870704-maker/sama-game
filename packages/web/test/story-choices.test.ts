import {describe,it,expect} from 'vitest';
import {PACKS,freshScenario,endingNotes,ENDING_NOTES_PER_ACT} from '../src/scenario.ts';

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

describe('결말 회고',()=>{
  const set=new Set(PACKS.flatMap(p=>p.chapters).flatMap(c=>c.scenes).flatMap(s=>s.steps)
    .flatMap(x=>'choice' in x?x.options.flatMap(o=>(o.effects??[]).flatMap(e=>e.kind==='flag'?[e.flag]:[])):[]));
  it('덧말의 표식은 모두 어떤 선택지가 남긴다',()=>{
    const notes=PACKS.flatMap(p=>p.endingNotes??[]);
    expect(notes.filter(n=>!set.has(n.flag)).map(n=>n.flag)).toEqual([]);
    expect(PACKS[0]!.endingNotes!.length).toBeGreaterThan(5);
    expect(PACKS[1]!.endingNotes!.length).toBeGreaterThan(5);
  });
  it('상·중편의 선택이 하편 덧말 앞에, 편마다 두 줄까지 회고된다',()=>{
    const flags=[...PACKS[0]!.endingNotes!,...PACKS[1]!.endingNotes!,...PACKS[2]!.endingNotes!].map(n=>n.flag);
    const state=freshScenario();state.flags.push(...flags);
    const lines=endingNotes(state);
    expect(lines.length).toBe(2*ENDING_NOTES_PER_ACT+PACKS[2]!.endingNotes!.length);
    expect(lines[0]).toBe(PACKS[0]!.endingNotes![0]!.line);
    expect(lines.at(-1)).toBe(PACKS[2]!.endingNotes!.at(-1)!.line);
  });
});

describe('가상 상·중편 회고',()=>{
  it('가상 상·중편(if-a)의 선택도 두 줄까지 회고된다',()=>{
    const ifA=PACKS[3]!.endingNotes!;expect(ifA.length).toBeGreaterThan(20);
    const state=freshScenario();state.flags.push(...ifA.map(n=>n.flag));
    expect(endingNotes(state)).toEqual(ifA.slice(0,ENDING_NOTES_PER_ACT).map(n=>n.line));
  });
});
