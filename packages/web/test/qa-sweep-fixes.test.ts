import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {을를,으로} from '../src/josa.ts';
import {factionText} from '../src/fate.ts';
import {romanceByName} from '../src/romance.ts';
import {makeUnit} from '../../core/src/index.ts';
import {applyOfficerEffect,syncTroopEffect,unitEffectNotes,FAMED_OFFICERS} from '../../core/src/troop-effects.ts';

// 2026-10-09 전수 점검에서 나온 오류들이 다시 생기지 않게 한다.
describe('전수 점검 수정',()=>{
 it('조사는 받침을 따른다(보물·장 제목·신세력 이름)',()=>{
  expect(을를('「태평청령서」')).toBe('「태평청령서」를');
  expect(을를('「옥새」')).toBe('「옥새」를');
  expect(을를('「손자병법」')).toBe('「손자병법」을');
  expect(으로('「길을 고르는 자」')).toBe('「길을 고르는 자」로');
  expect(으로('「피난의 연속」')).toBe('「피난의 연속」으로');
  expect(으로('「길」')).toBe('「길」로');
  expect(factionText('{세력}을 세운다 · {세력}은 · {세력}이 · {세력}으로','위나라')).toBe('위나라를 세운다 · 위나라는 · 위나라가 · 위나라로');
  expect(factionText('{세력}을 · {세력}으로','진')).toBe('진을 · 진으로');
 });

 it('직접 건 일기토가 끝나자마자 같은 맞수와 자동 대결이 또 열리지 않는다',()=>{
  const ch=chapters.findIndex(c=>c.stage.id==='S2-05');
  const s=new Session(ch,'normal',215,'survival',7,deployment(freshCampaign(),true)),st=s.state;
  for(let k=0;k<8&&st.activeDialogue;k++){const d=st.activeDialogue;const node=(st.stage.dialogues??[]).find(x=>x.id===d);s.act({kind:'choose',nodeId:d,optionId:node?.options?.[0]?.id??''});}
  const me=st.get('sima_yi'),foe=st.get('meng_da');
  me.pos={x:foe.pos.x-1,y:foe.pos.y};if(st.unitAt(me.pos)!==me){me.pos={x:foe.pos.x+1,y:foe.pos.y};}
  me.hasMoved=false;me.hasActed=false;s.challengeAnswer=()=>({accept:true,line:'좋다.'});
  expect(s.act({kind:'item',unit:'sima_yi',item:'duel',target:'meng_da'}).ok).toBe(true);
  for(let i=0;i<5;i++)expect(s.act({kind:'item',unit:'sima_yi',item:'duel-round:attack'}).ok).toBe(true);
  expect(s.activeDuel).toBeNull();
 });

 it('부대효과와 같은 종류·조건의 장수 특성은 겹치지 않는다',()=>{
  const cav=makeUnit({id:'c',side:'player',unitClass:'heavyCav',level:20,pos:{x:1,y:1}});
  syncTroopEffect(cav);applyOfficerEffect(cav,'lead',1);
  expect(unitEffectNotes(cav).find(n=>n.kind==='officer')!.text).toContain('겹치지 않는다');
  const inf=makeUnit({id:'i',side:'player',unitClass:'infantry',level:20,pos:{x:1,y:1}});
  syncTroopEffect(inf);applyOfficerEffect(inf,'lead',1);
  expect(unitEffectNotes(inf).find(n=>n.kind==='officer')!.text).not.toContain('겹치지 않는다');
 });

 it('이름난 장수는 모두 연의 능력치가 있다',()=>{
  for(const n of FAMED_OFFICERS)expect(romanceByName(n),n).toBeDefined();
 });

 it('S1-01 전투 연도는 이야기와 같은 189년이다',()=>{
  expect(chapters.find(c=>c.stage.id==='S1-01')!.year).toContain('189');
 });
});
