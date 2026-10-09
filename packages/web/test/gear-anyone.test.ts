import {describe,it,expect} from 'vitest';
import {Session,chapters} from '../src/session.ts';
import {deployment,freshCampaign,equipSlot,equippedItems,gearKey,treasureInfo} from '../src/progression.ts';

describe('얻은 보물은 누구든 단다',()=>{
 it('영입 장수(이름)도 보물을 달고, 전장에 서면 그 보물을 입는다',()=>{
  const c=freshCampaign();c.treasures.push('sevenstar');
  expect(equipSlot(c,'장합',treasureInfo('sevenstar').slot,'sevenstar')).toBe(true);
  expect(equippedItems(c,'장합')).toEqual(['sevenstar']);
  const ch=chapters.findIndex(x=>x.stage.id==='S1-05');
  const make=(withGear:boolean)=>{const d=deployment(c,true);if(!withGear)delete d.loadouts;
   d.scenario={chapter:'H1-S1-05',recruits:[{id:'rc_zhang',name:'장합',unitClass:'cavalry',level:6,xp:0,hp:1}]};
   return new Session(ch,'normal',215,'survival',6,d).state.find('rc_zhang')!;};
  const plain=make(false),geared=make(true);
  const total=(u:typeof plain)=>u.stats.attack+u.stats.defense+u.stats.intellect+u.stats.maxHp;
  expect(total(geared)).toBeGreaterThan(total(plain));
 });
 it('보물은 한 사람만 단다: 다른 사람이 달면 앞사람에게서 빠진다',()=>{
  const c=freshCampaign();c.treasures.push('sevenstar');const slot=treasureInfo('sevenstar').slot;
  equipSlot(c,'sima_lang',slot,'sevenstar');equipSlot(c,'곽회',slot,'sevenstar');
  expect(equippedItems(c,'sima_lang')).toEqual([]);expect(equippedItems(c,'곽회')).toEqual(['sevenstar']);
 });
 it('연의 장수는 이름으로 와도 같은 자리를 쓴다',()=>{expect(gearKey({id:'u7',name:'사마랑'})).toBe('sima_lang');expect(gearKey({id:'rc_x',name:'위연'})).toBe('위연');});
});
