import {describe,it,expect} from 'vitest';
import {troopFacing,troopWalkPose} from '../src/troop-motion.ts';
describe('directional troop movement',()=>{
 it('faces front/back for vertical moves without mirroring',()=>{expect(troopFacing(0,48)).toEqual({pose:4,flip:1});expect(troopFacing(0,-48)).toEqual({pose:6,flip:1});});
 it('mirrors only horizontal motion',()=>{expect(troopFacing(-48,0)).toEqual({pose:0,flip:-1});expect(troopFacing(48,0)).toEqual({pose:0,flip:1});});
 it('uses a stable dominant direction on diagonals and a neutral stationary pose',()=>{expect(troopFacing(-48,-48).pose).toBe(6);expect(troopFacing(90,48).pose).toBe(0);expect(troopFacing(0,0).pose).toBe(0);});
 it('alternates within the chosen facing pair including reduced-motion completion',()=>{for(const base of [0,4,6]){expect(troopWalkPose(base,0)).toBe(base);expect(troopWalkPose(base,.2)).toBe(base+1);expect(troopWalkPose(base,1)).toBe(base);}});
});

import {troopReaction,troopReactionPose} from '../src/troop-motion.ts';
describe('damage reactions',()=>{
 it('does not flinch on misses, healing or status-only skills',()=>{expect(troopReaction(false,30)).toBe('none');expect(troopReaction(true,-30)).toBe('none');expect(troopReaction(true,0)).toBe('none');});
 it('distinguishes guarded damage and ordinary hits',()=>{expect(troopReaction(true,30)).toBe('hurt');expect(troopReaction(true,30,true)).toBe('guard');});
 it('uses separate guard and hurt frame pairs',()=>{expect(troopReactionPose('guard',0)).toBe(8);expect(troopReactionPose('guard',1)).toBe(9);expect(troopReactionPose('hurt',0)).toBe(10);expect(troopReactionPose('hurt',1)).toBe(11);});
});
