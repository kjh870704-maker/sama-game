import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import {stageOfficerNames} from '../src/roguelike.ts';

describe('같은 장수가 한 전장에 둘 서지 않는다',()=>{
 it('시나리오 연의 장: 전장이 세우는 사마랑·조진을 영입 장수로 또 세우지 않는다',()=>{
  for(const id of ['S1-01','S1-02','S1-05']){
   const ch=chapters.findIndex(c=>c.stage.id===id),d=deployment(freshCampaign(),true);
   d.scenario={chapter:'H1-'+id,recruits:[{id:'rc_lang',name:'사마랑',unitClass:'fengshui',level:5,xp:0,hp:1},{id:'rc_zhen',name:'조진',unitClass:'cavalry',level:5,xp:0,hp:1},{id:'rc_guo',name:'곽회',unitClass:'archer',level:5,xp:0,hp:1}]};
   const s=new Session(ch,'normal',215,'survival',5,d);
   const names=s.state.living().filter(u=>u.side==='player').map(u=>u.name);
   expect(names.filter(n=>n==='사마랑').length,id).toBeLessThanOrEqual(1);
   expect(names.filter(n=>n==='조진').length,id).toBeLessThanOrEqual(1);
   expect(s.state.find('rc_guo'),id).toBeDefined();
  }
 });
 it('전장이 세우는 장수 이름을 모은다',()=>{
  const st=chapters.find(c=>c.stage.id==='S1-02')!.stage;
  expect([...stageOfficerNames(st)]).toEqual(expect.arrayContaining(['사마의','사마랑']));
 });
});
