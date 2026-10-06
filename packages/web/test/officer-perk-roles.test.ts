import {describe,it,expect} from 'vitest';
import {perksFor,perkRole,officerClass,perkState,learnPerk,officerGrants} from '../src/officer-perks.ts';
import {romance} from '../src/romance.ts';
import {freshMeta} from '../src/meta.ts';
import {OFFICER_RECRUITS} from '../src/roguelike.ts';

// 갈래마다 아무 쓸모가 없는 효과: 책략에는 회심·관통·물리 강화가 없고, 책사·원거리는 반격을 거의 하지 않는다.
const USELESS:Record<string,string[]>={
  caster:['counterBoost','physicalPower','critical','penetrate','chargePower','meleePower','rangedPower','healPower'],
  healer:['counterBoost','physicalPower','critical','penetrate','chargePower','meleePower','rangedPower'],
  ranged:['counterBoost','meleePower','chargePower','strategyPower','manaRegen','mpThrift','healPower'],
  mounted:['rangedPower','meleePower','strategyPower','manaRegen','mpThrift','healPower'],
  melee:['rangedPower','chargePower','strategyPower','manaRegen','mpThrift','healPower'],
};
const names=[...new Set([...Object.values(romance).map(r=>r.name),...OFFICER_RECRUITS.map(r=>r.name),'사마의','사마랑','사마방','조진'])];

describe('장수 효과는 병종 갈래에 맞는다',()=>{
  it('어느 장수도 자기 병종에 쓸모없는 효과를 받지 않는다',()=>{
    for(const n of names){const role=perkRole(officerClass(n)),list=perksFor(n);
      expect(list).toHaveLength(5);
      for(const p of list)expect(USELESS[role],`${n}(${role}) ${p.name}`).not.toContain(p.trait);}
  });
  it('책사 사마의는 반격 대신 책략 효과를 받는다',()=>{
    const t=perksFor('사마의').map(p=>p.trait);
    expect(t).not.toContain('counterBoost');expect(t).toContain('strategyPower');
  });
  it('연의 고유능력도 그 장수의 병종에서 쓸모가 있다',()=>{
    for(const r of Object.values(romance)){if(!r.skill)continue;const role=perkRole(officerClass(r.name));
      expect(USELESS[role],`${r.name} ${r.skill.name}`).not.toContain(r.skill.trait);}
  });
  it('옛 규칙으로 배운 효과는 같은 자리의 새 효과로 옮겨져 천명을 잃지 않는다',()=>{
    const m=freshMeta();m.officerPerks={사마의:{learned:['counterBoost'],equipped:['counterBoost']}};
    const st=perkState(m,'사마의'),first=perksFor('사마의')[0]!;
    expect(st.learned).toEqual([first.id]);expect(st.equipped).toEqual([first.id]);
    expect(officerGrants(m,['사마의'])['사마의']?.[0]?.[0]).toBe(first.trait);
    // 옮겨진 효과는 다시 배울 수 없다(이미 배움)
    m.mandate=99;(m.officerBest??={})['사마의']=40;expect(learnPerk(m,'사마의',first.id)).toBe(false);
  });
});
