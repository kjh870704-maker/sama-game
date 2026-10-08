import {describe,it,expect} from 'vitest';
import {treasures,treasureInfo} from '../src/progression.ts';
import {treasureIcon,formOf,UNIQUE_TREASURE_SHEETS} from '../src/treasure-art.ts';
import {treasurePowers} from '../../core/src/treasure-traits.ts';
import {treasureSource} from '../src/treasure-codex.ts';

const RTK14=['참사검','백벽도','의천검','청강검','칠성보도','청룡언월도','방천화극','사모','자웅일대검','고정도','철척사모','유성추',
 '적토마','적로','절영','조황비전','대완마','과하마','양주마','백곡','백마','사륜차',
 '손자병법','육도','삼략','사마법','오자','울료자','맹덕신서','춘추좌씨전','사기','한비자','관자','상군서','안자춘추','주서음부','사민월령','염철론',
 '노자','장자','논어','시경','서경','역경','예기','둔갑천서','태평요술서','태평청령도','산해경','서촉지형도','청낭서','옥새'];
describe('삼국지14 명품 이름의 보물',()=>{
 it('삼국지14 명품 이름을 그대로 쓰고, 이름은 겹치지 않는다',()=>{
  const names=treasures.map(t=>t.name);
  for(const n of RTK14)expect(names,n).toContain(n);
  expect(new Set(names).size).toBe(names.length);
 });
 it('새 보물은 보물 사냥에서 얻고, 효과·형태·그림이 있다',()=>{
  for(const id of UNIQUE_TREASURE_SHEETS.flat()){
   const t=treasures.find(x=>x.id===id)!;expect(t,id).toBeDefined();expect(t.quest).toMatch(/^R0[1-5]$/);
   expect(treasureSource(t.stage)).toContain('보물 사냥');
   expect(treasurePowers.some(p=>p.id===id)).toBe(true);
   expect(treasureIcon(id)).not.toContain('pending');
   expect(treasureIcon(id)).toContain('treasures-unique-');
   expect(formOf(id)==='book'||formOf(id)==='mount'||treasureInfo(id).slot==='weapon').toBe(true);
  }
  expect(UNIQUE_TREASURE_SHEETS.flat()).toHaveLength(26);
 });
});
