import {describe,expect,it} from 'vitest';
import {completeTroopSheets} from '../src/complete-troops.ts';

// 병종 몸집은 그림 폭이 아니라 계통으로 정한다: 4단계 병사가 넓어져도 보병은 보병 키로 남는다.
describe('troop sheet body size', () => {
  const body=(id:string)=>completeTroopSheets.find(s=>s.id===id)?.body;
  it('keeps foot lines at foot height', () => {
    for(const id of ['four-stage-infantry','four-stage-crossbow','four-stage-fengshui','four-stage-commander','four-stage-javelin','four-stage-sniper','four-stage-cavalry','single-stage-xiliang'])expect(body(id)).toBe('foot');
  });
  it('gives heavy cavalry, elephants, chariots and siege engines the large body', () => {
    for(const id of ['four-stage-heavy-cavalry','four-stage-elephant','four-stage-chariot','four-stage-catapult','single-stage-ram'])expect(body(id)).toBe('large');
  });
  it('sets a body on every troop sheet', () => {
    for(const s of completeTroopSheets)expect(['foot','large']).toContain(s.body);
  });
});
