import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
import {historicDuel,historicPair,DUEL_LOSS_DEBUFF} from '../src/duel.ts';

function trial(id:string,level=10){const c=freshCampaign(),d=deployment(c,true);for(const who of Object.keys(d.levels))d.levels[who]=Math.max(d.levels[who]!,level);d.mission={id,runId:'test-'+id,version:2};return new Session(7,'normal',215,'survival',4,d);}

describe('연의 맞수의 자동 일기토·설전',()=>{
 it('연의의 짝을 알아본다(순서 무관)',()=>{expect(historicPair('제갈량','사마의')?.kind).toBe('debate');expect(historicPair('마초','허저')?.kind).toBe('duel');expect(historicPair('사마의','허저')).toBeUndefined();});
 it('왕평·위연·맹염에게 실제 출전 가능한 맞수가 있다',()=>{
  expect(historicDuel('debate','왕평','사마의')).toBeDefined();
  expect(historicDuel('debate','위연','사마의')).toBeDefined();
  expect(historicDuel('duel','맹염','사마사')).toBeDefined();
 });
 it('8방(대각선 포함)으로 붙으면 저절로 설전이 열리고, 행동을 쓰지 않으며, 진 쪽에 디버프가 걸린다',()=>{
  const s=trial('T01'),st=s.state,me=st.get('sima_yi'),foe=st.living('enemy')[0]!,other=st.living('player').find(u=>u.id!=='sima_yi')!;
  (foe as {name:string}).name='하안';foe.pos={x:me.pos.x+1,y:me.pos.y+1};if(st.unitAt(foe.pos)!==foe)throw new Error('칸이 막힘');
  expect(s.act({kind:'wait',unit:other.id}).ok).toBe(true);
  expect(s.activeDuel?.kind).toBe('debate');expect(s.activeDuel?.auto).toBe(true);
  expect(s.act({kind:'move',unit:me.id,to:{x:me.pos.x,y:me.pos.y+1}}).ok).toBe(false);
  for(let i=0;i<5&&s.activeDuel;i++)expect(s.act({kind:'item',unit:me.id,item:'duel-round:attack'}).ok).toBe(true);
  expect(s.activeDuel).toBeNull();expect(me.hasActed).toBe(false);
  const d=s.lastDuel!;if(d.result!=='draw'){const loser=d.result==='win'?foe:me;for(const k of DUEL_LOSS_DEBUFF.debate)expect(loser.statuses.some(x=>x.kind===k),k).toBe(true);}
  // 같은 짝은 다시 열리지 않는다(다른 아군이 다른 맞수 짝이면 그쪽은 열릴 수 있다)
  expect(s.act({kind:'wait',unit:me.id}).ok).toBe(true);expect(s.activeDuel?.player.id===me.id&&s.activeDuel?.enemy.id===foe.id).toBeFalsy();
 });
 it('붙지 않으면(2칸) 열리지 않는다',()=>{
  const s=trial('T01'),st=s.state,me=st.get('sima_yi'),foe=st.living('enemy')[0]!,other=st.living('player').find(u=>u.id!=='sima_yi')!;
  (foe as {name:string}).name='하안';foe.pos={x:me.pos.x+2,y:me.pos.y};
  s.act({kind:'wait',unit:other.id});expect(s.activeDuel).toBeNull();
 });
});
