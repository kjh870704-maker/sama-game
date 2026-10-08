import {describe,it,expect} from 'vitest';
import {newPowerScript,setFactionContext} from '../src/newpower.ts';
import {NP_DETAIL,NP_TEMPER} from '../src/newpower-detail.ts';
import {ROUTES} from '../src/fate.ts';
import {checkPack} from '../src/scenario-types.ts';
import {allUnitClasses} from '../../core/src/index.ts';

// 신세력 장은 장마다 다른 글과 선택지를 갖고, 그 선택이 결말에서 세력의 성격으로 회고된다.
describe('신세력 대본',()=>{
  setFactionContext({name:'청룡',emblem:'청',companions:[{name:'유진',look:'cavalry'},{name:'한결',look:'strategist'}]});
  const ids=ROUTES.filter(r=>r.custom).flatMap(r=>[...r.tales.map(t=>t.id),`${r.id}:boss`]);
  it('가상 전장·우두머리 장마다 고유한 글과 세 갈래 선택지가 있다',()=>{
    expect(ids).toHaveLength(20);
    for(const id of ids){expect(NP_DETAIL[id],id).toBeDefined();expect(NP_DETAIL[id]!.options).toHaveLength(3);}
    const after=new Set(ids.map(id=>NP_DETAIL[id]!.after));expect(after.size).toBe(ids.length);
  });
  it('대본 검사를 통과하고 세력 이름이 들어간다',()=>{
    const chapters=ids.map(id=>newPowerScript(id)!);
    expect(checkPack({chapters},{unitClasses:allUnitClasses()})).toEqual([]);
    const text=JSON.stringify(chapters);expect(text).not.toContain('{세력}');expect(text).toContain('청룡');
    for(const c of chapters)expect(c.scenes[0]!.steps.some(s=>'choice' in s),c.id).toBe(true);
  });
  it('결말이 고른 성격을 회고한다',()=>{
    const flags=new Set(Object.values(NP_DETAIL).flatMap(d=>d.options.flatMap(o=>o.effects.flatMap(e=>e.kind==='flag'?[e.flag]:[]))));
    expect([...flags].sort()).toEqual(NP_TEMPER.map(n=>n.flag).sort());
    const end=ROUTES.filter(r=>r.custom&&r.ending).map(r=>newPowerScript(`ending:${r.id}`)!);
    expect(end.length).toBeGreaterThan(0);
    for(const e of end)for(const n of NP_TEMPER)expect(e.scenes[0]!.steps.some(s=>'when' in s&&s.when===n.flag),e.id).toBe(true);
  });
});
