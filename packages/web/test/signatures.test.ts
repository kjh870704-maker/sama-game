import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import {romanceOf,romanceByName,signatureSkill} from '../src/romance.ts';
import {SIGNATURE_NAMES} from '../../core/src/index.ts';

describe('규칙판 8: 이름있는 장수는 고유특성, 목록 밖 인물은 병종', () => {
  it('고유특성이 있는 장수는 모두 게임 장수록에 있는 인물이다', () => {
    for(const n of SIGNATURE_NAMES)expect(romanceByName(n),n).toBeDefined();
  });
  it('본편 전장 전체: 이름있는 장수는 고유특성 하나, 목록 밖 인물은 장수 특성·고유능력이 없다', () => {
    let named=0,plain=0;
    for(let c=1;c<chapters.length;c++){
      const s=new Session(c,'normal',215,'survival',8,deployment(freshCampaign(),true));
      for(const u of s.state.units.values()){
        const r=romanceOf(u);if(!r||u.name.endsWith('환영'))continue;
        const sig=u.traits.filter(t=>t.startsWith('sig:'));
        expect(u.traits.some(t=>t.startsWith('officer:')),u.name).toBe(false);
        if(signatureSkill(r.name)){if(sig.length){named++;expect(sig).toEqual(['sig:'+r.name]);}}
        else{plain++;expect(sig,u.name).toEqual([]);}
      }
    }
    expect(named).toBeGreaterThan(20);
    expect(plain).toBeGreaterThan(5);
  });
  it('규칙판 8 저장은 다시 불러올 수 있다(이어하기)', () => {
    const s=new Session(chapters.findIndex(c=>c.stage.id==='S1-06'),'normal',215,'survival',8,deployment(freshCampaign(),true));
    const sigs=(x:Session)=>[...x.state.units.values()].flatMap(u=>u.traits.filter(t=>t.startsWith('sig:'))).sort();
    expect(sigs(s)).toContain('sig:마초');
    const back=Session.load(JSON.parse(JSON.stringify(s.save())));
    expect(back.revision).toBe(8);
    expect(sigs(back)).toEqual(sigs(s));
  });
});
