import {describe,it,expect} from 'vitest';
import {romance,romanceOf,applyRomance} from '../src/romance.ts';
import {martialPower} from '../src/officers.ts';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {makeUnit} from '../../core/src/index.ts';

const unit=(id:string,name:string)=>makeUnit({id,name,unitClass:'infantry',level:10,side:'enemy',pos:{x:0,y:0}});
const sessionFor=(stage:string)=>new Session(campaignOrder.find((c:number)=>chapters[c]!.stage.id===stage)!,'normal',215,'strategy',4);

describe('연의 장수록',()=>{
 it('rates every officer on five 1-100 scales with an epithet',()=>{
  for(const [id,r] of Object.entries(romance)){expect(r.epithet,id).toBeTruthy();for(const v of [r.war,r.int,r.lead,r.pol,r.cha])expect(v,id).toBeGreaterThanOrEqual(1),expect(v,id).toBeLessThanOrEqual(100);}
  // 기준점: 무력 100은 여포 한 사람, 지력 100은 제갈량 한 사람.
  expect(romance.lu_bu!.war).toBe(100);expect(romance.wooden_zhuge!.int).toBe(100);
  for(const [id,r] of Object.entries(romance)){if(id!=='lu_bu')expect(r.war,id).toBeLessThan(100);if(id!=='wooden_zhuge')expect(r.int,id).toBeLessThan(100);}
  expect(romance.sima_yi!.int).toBeLessThan(romance.wooden_zhuge!.int);expect(romance.ma_chao!.war).toBeLessThan(romance.lu_bu!.war);
 });
 it('turns ratings into stats: a mighty general hits harder, a wise one thinks sharper',()=>{
  const plain=unit('nobody','졸병'),lu=unit('lu_bu','여포'),zhang=unit('zhang_zhao','장소');
  expect(applyRomance(plain)).toBe(false);applyRomance(lu);applyRomance(zhang);
  expect(lu.stats.attack).toBeGreaterThan(plain.stats.attack);expect(zhang.stats.attack).toBeLessThan(plain.stats.attack);
  expect(zhang.stats.intellect).toBeGreaterThan(plain.stats.intellect);expect(lu.traits).toContain('flyingGeneral');
  expect(lu.hp).toBe(lu.stats.maxHp);
 });
 it('uses the romance war rating in duels, and leaves decoys and dream phantoms alone',()=>{
  const zhao=unit('zhao_yun','조운');expect(martialPower(zhao)).toBe(96+10);
  expect(romanceOf({id:'decoy',name:'공손연'})).toBeUndefined();expect(romanceOf({id:'boss',name:'안량'})?.war).toBe(93);
  const dream=sessionFor('S1-04');const ghost=dream.state.find('lu_bu');
  if(ghost)expect(ghost.traits.includes('flyingGeneral')&&ghost.stats.morale!==50).toBe(false);
 });
 it('gives named officers their trait once, even when they arrive mid-battle, and replays identically',()=>{
  const s=sessionFor('S1-06'),ma=s.state.find('ma_chao');
  if(ma){expect(ma.traits.filter(t=>t==='westernValor')).toHaveLength(1);}
  s.act({kind:'endPhase'});expect(Session.load(JSON.parse(JSON.stringify(s.save()))).state.snapshot()).toEqual(s.state.snapshot());
 });
});
