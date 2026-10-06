import {expect,it} from 'vitest';
import {playbackEvents} from '../src/battle-playback.ts';
import {retreatMotion} from '../src/troop-motion.ts';
it('shows lethal strategy before all affected retreats',()=>{expect(playbackEvents([{t:'retreat',unit:'a',side:'enemy'},{t:'retreat',unit:'b',side:'enemy'},{t:'strategy',caster:'c',strategy:'fire',targets:['a','b'],damage:[30,30]}]).map(e=>e.t)).toEqual(['strategy','retreat','retreat']);});
it('keeps physical attack and standalone retreat ordering',()=>{expect(playbackEvents([{t:'attack',attacker:'a',defender:'b',hit:true,damage:20,critical:false},{t:'retreat',unit:'b',side:'enemy'},{t:'move',unit:'a',from:{x:0,y:0},to:{x:1,y:0}}]).map(e=>e.t)).toEqual(['attack','retreat','move']);});
it('retreat fades to zero and mechanical units never fall sideways',()=>{expect(retreatMotion(0).alpha).toBe(1);expect(retreatMotion(1).alpha).toBe(0);expect(retreatMotion(1).rotation).toBe(.95);expect(Math.abs(retreatMotion(.5,true).rotation)).toBeLessThan(.05);});
