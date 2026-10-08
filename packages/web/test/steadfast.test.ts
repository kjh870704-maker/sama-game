import {describe,it,expect} from 'vitest';
import {Session,STEADFAST_CAP,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import {capHit} from '../../core/src/index.ts';

describe('지켜야 할 대상은 한 방에 쓰러지지 않는다',()=>{
 it('피난민·필수 생존 장수에게 버팀(40%)을 건다',()=>{
  const ch=chapters.findIndex(c=>c.stage.id==='S1-02');const s=new Session(ch,'normal',215,'survival',5,deployment(freshCampaign(),true));
  const st=s.state,steady=st.living().filter(u=>u.traits.includes('steadfast'));
  expect(steady.map(u=>u.id)).toEqual(expect.arrayContaining(['sima_yi','sima_lang']));
  expect(steady.every(u=>u.side!=='enemy')).toBe(true);
  for(const u of st.living().filter(u=>u.unitClass==='civilian'&&u.side!=='enemy'))expect(u.traits).toContain('steadfast');
  const me=st.get('sima_yi');expect(me.traitParams.steadfast).toBe(STEADFAST_CAP);
  expect(capHit(me,99999)).toBe(Math.ceil(me.stats.maxHp*STEADFAST_CAP/100));
  expect(st.living('enemy').some(u=>u.traits.includes('steadfast'))).toBe(false);
 });
});
