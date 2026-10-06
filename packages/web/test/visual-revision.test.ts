import {describe,it,expect} from 'vitest';
import {Session} from '../src/session.ts';
import {key,adjacent} from '../../core/src/index.ts';

describe('expanded battlefield revision',()=>{
  it('keeps pre-expansion command saves on the legacy map',()=>{
    const legacy=new Session(1,'normal',215,'survival',2);
    const result=legacy.act({kind:'move',unit:'sima_yi',to:{x:3,y:4}});
    expect(result.ok).toBe(true);
    const raw=legacy.save();delete raw.revision;
    const loaded=Session.load(raw);
    expect(loaded.state.map.width).toBe(22);
    expect(loaded.state.snapshot()).toEqual(legacy.state.snapshot());
    expect(loaded.undo()).toBe(true);
    expect(new Session(1).state.map.width).toBe(48);
  });
  it('has two separately traversable river crossings and a reachable fort',()=>{
    const state=new Session(1).state,map=state.map;
    expect([map.width,map.height]).toEqual([48,36]);
    for(const bridge of ['stone_bridge','wood_bridge']){
      const blocked=bridge==='stone_bridge'?'wood_bridge':'stone_bridge';
      const avoid=new Set(map.regionCoords(blocked).map(key));
      const seen=new Set<string>(),queue=[state.get('sima_yi').pos];
      while(queue.length){const p=queue.shift()!;if(seen.has(key(p)))continue;seen.add(key(p));for(const n of adjacent(p))if(map.inBounds(n)&&!seen.has(key(n))&&!avoid.has(key(n))&&Number.isFinite(map.moveCost('infantry',n)))queue.push(n);}
      expect(map.regionCoords(bridge).every(p=>seen.has(key(p)))).toBe(true);
      expect(map.regionCoords('central_fort').some(p=>seen.has(key(p)))).toBe(true);
    }
    for(const u of state.living())expect(Number.isFinite(map.moveCost(u.unitClass,u.pos)),u.id).toBe(true);
  });
});
