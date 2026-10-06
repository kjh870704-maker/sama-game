import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {CONTROLLABLE,decide,key,familyOf} from '../../core/src/index.ts';

const wide=()=>({...deployment(freshCampaign(),true),wide:1 as const});
describe('넓은 전장(연의 지도 1.5배 · 이동 +2)',()=>{
 it.each(chapters.map((c,i)=>[i,c.stage.id] as const))('builds chapter %i (%s) wide with every unit on standable ground',(i)=>{
  const narrow=new Session(i,'normal',215,'survival',4,deployment(freshCampaign(),true)),s=new Session(i,'normal',215,'survival',4,wide());
  const m=s.state.map;
  if(s.wide){expect(m.width).toBe(Math.ceil(narrow.state.map.width*1.5));expect(m.moveBonus).toBe(2);}
  for(const u of s.state.living()){expect(m.inBounds(u.pos),u.id).toBe(true);
    const t=m.tileAt(u.pos).terrain;if(!/^(gate|tower|wall)_/.test(u.id)&&familyOf(u.unitClass)!=='navy')expect(['wall','water','cliff'].includes(t),`${u.id}@${key(u.pos)} ${t}`).toBe(false);}
  expect(Session.load(s.save()).state.snapshot()).toEqual(s.state.snapshot());
 });
 it('lets units walk farther on the wide field and plays a few turns cleanly',()=>{
  const s=new Session(2,'normal',215,'survival',4,wide());expect(s.wide).toBe(true);
  for(let i=0;i<200&&s.state.outcome==='ongoing'&&s.state.turn<4;i++){const st=s.state;if(!CONTROLLABLE.has(st.currentSide)){s.tick();continue;}
   const u=st.living(st.currentSide).find(x=>!x.hasActed);if(!u){s.tick();continue;}
   for(const cmd of decide(st,u)){if(cmd.kind==='move'&&key(cmd.to)===key(u.pos))continue;s.act(cmd);if(st.outcome!=='ongoing')break;}if(!u.hasActed&&st.outcome==='ongoing')s.act({kind:'wait',unit:u.id});}
  expect(s.state.turn).toBeGreaterThanOrEqual(2);
 });
});
