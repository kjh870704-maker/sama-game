import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {optionalOfficers,pickExtras,storySortieLimit,taleSortieLimit} from '../src/sortie.ts';
import {freshCampaign,deployment} from '../src/progression.ts';

const withRoom=chapters.map((c,i)=>({c,i,...optionalOfficers(c.stage,c.map)})).filter(x=>x.allowed.length&&x.capacity>0);

describe('출진 편성',()=>{
 it('keeps the lone chapters to their forced officers and opens room elsewhere',()=>{
  for(const id of ['S1-04','S1-11']){const c=chapters.find(x=>x.stage.id===id);if(c)expect(optionalOfficers(c.stage,c.map).allowed).toEqual([]);}
  expect(withRoom.length).toBeGreaterThan(0);
  for(const x of withRoom)for(const id of x.allowed)expect(x.c.stage.deployment.forced).not.toContain(id);
 });
 it('caps the optional officers by difficulty and free start cells, never duplicating',()=>{
  expect(storySortieLimit('normal')).toBe(2);expect(storySortieLimit('extreme')).toBe(2);// 극한은 인원 대신 출진 코스트로 제한(sortie-cost.test.ts)
  const x=withRoom[0]!,want=[...x.allowed,...x.allowed,'nobody'];
  const normal=pickExtras(x.c.stage,x.c.map,want,'normal'),extreme=pickExtras(x.c.stage,x.c.map,want,'extreme');
  expect(normal.length).toBe(Math.min(2,x.capacity,x.allowed.length));expect(new Set(normal).size).toBe(normal.length);
  expect(extreme.length).toBe(normal.length);// 레벨을 모르면 코스트를 따지지 않는다expect(normal).not.toContain('nobody');
 });
 it('fields the forced officers plus the chosen ones and reloads the same battle',()=>{
  const x=withRoom[0]!,d=deployment(freshCampaign(),true);d.extraOfficers=[x.allowed[0]!];
  const plain=new Session(x.i,'normal',215,'survival',4,deployment(freshCampaign(),true)),more=new Session(x.i,'normal',215,'survival',4,d);
  expect(more.state.living('player').length).toBe(plain.state.living('player').length+1);
  expect(Session.load(more.save()).state.snapshot()).toEqual(more.state.snapshot());
 });
 it('lets deeper what-if acts take more companions (extreme limits by cost instead)',()=>{
  expect(taleSortieLimit(1,false,'normal')).toBe(3);expect(taleSortieLimit(2,false,'normal')).toBe(4);expect(taleSortieLimit(3,true,'normal')).toBe(6);
  expect(taleSortieLimit(1,false,'extreme')).toBe(3);expect(taleSortieLimit(1,false,'extreme')).toBeGreaterThanOrEqual(1);
 });
});
