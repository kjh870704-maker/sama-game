import {describe,it,expect} from 'vitest';
import {classCries,reactions,cryFor,isCrisis} from '../src/emotes.ts';
import {materialOf,biomeFor,noiseField,blendWeights,MATERIALS,smooth} from '../src/terrain-paint.ts';
import {supportOptions} from '../src/troops.ts';
describe('troop emotes',()=>{
 it('gives every playable class its own battle cry',()=>{
  for(const cls of [...supportOptions,'navy','civilian'])expect(classCries[cls],cls).toBeDefined();
  expect(new Set(Object.values(classCries).map(e=>e.text)).size).toBe(Object.keys(classCries).length);
  for(const e of [...Object.values(classCries),...Object.values(reactions)])expect(e.text,'한자 없이 한글로').not.toMatch(/[\u4e00-\u9fff]/);
  expect(cryFor('cavalry').shape).toBe('burst');expect(cryFor('archer').text).toContain('사격');
  expect(cryFor('fengshui',true,'heal')).toBe(reactions.heal);expect(cryFor('engineer',true,'repair')).toBe(reactions.repair);
  expect(cryFor('infantry',true,'fire')).toBe(classCries.strategist);expect(cryFor('unknown')).toBe(classCries.infantry);
 });
 it('covers every status a unit can gain and flags crises',()=>{
  for(const kind of ['confusion','immobile','bound','bleed','burn','shock','seal','guard','haste','rally'])expect(reactions[kind],kind).toBeDefined();
  expect(isCrisis(20,90,40)).toBe(true);expect(isCrisis(0,90,90)).toBe(false);expect(isCrisis(60,90,10)).toBe(false);
 });
});
describe('painted terrain',()=>{
 it('maps every terrain to a material and picks stage biomes',()=>{
  for(const t of ['plain','road','forest','mountain','hill','water','rapids','bridge','fort','gate','wall'] as const)expect(MATERIALS).toContain(materialOf(t));
  expect(biomeFor('S1-06').name).toContain('황토');expect(biomeFor('T07').name).toContain('장강');expect(biomeFor('S1-04').tint).toBeDefined();
 });
 it('blends tile materials into normalized, sharpened weights',()=>{
  const n=noiseField(5);expect(Math.min(...n)).toBeGreaterThanOrEqual(0);expect(Math.max(...n)).toBeLessThanOrEqual(1);
  const mats=Uint8Array.from([0,3,0,3]),w=new Float32Array(MATERIALS.length),raw=new Float32Array(MATERIALS.length);
  blendWeights(mats,2,2,0,0,w,raw);expect(w[0]).toBeCloseTo(1);
  blendWeights(mats,2,2,.5,.5,w,raw);expect(w[0]!+w[3]!).toBeCloseTo(1);expect(w[0]).toBeCloseTo(.5);
  blendWeights(mats,2,2,.3,.5,w,raw);expect(w[0]!).toBeGreaterThan(raw[0]!);
  expect(smooth(0,1,.5)).toBeCloseTo(.5);
 });
});
import {crispZoom,groundScaleMode,unitTint} from '../src/pixel-look.ts';
import {outlineFrames} from '../src/sprite-atlas.ts';
describe('dot clarity',()=>{
 it('snaps zoom so every ground dot covers whole pixels',()=>{
  for(const res of [1,1.5,2,3])for(const z of [.7,.78,.9,1,1.25,1.5,1.8]){
   if(z*2*res<2)continue;
   const s=crispZoom(z,res),k=s*2*res;expect(k).toBeCloseTo(Math.round(k));expect(groundScaleMode(s,res)).toBe('nearest');expect(s).toBeLessThanOrEqual(1.8);
  }
  expect(crispZoom(1.1,1,1)).toBeCloseTo(1.5);expect(crispZoom(1.4,1,-1)).toBe(1);expect(crispZoom(1,2,1)).toBe(1);expect(crispZoom(.8,3)).toBeCloseTo(5/6);
  expect(crispZoom(.7,1)).toBe(.7);expect(groundScaleMode(.7,1)).toBe('linear');
 });
 it('draws a round dark rim around silhouettes without touching the body',()=>{
  const w=21,data=new Uint8ClampedArray(w*w*4);
  for(let y=8;y<13;y++)for(let x=8;x<13;x++)data.set([250,240,230,255],(y*w+x)*4);
  const out=outlineFrames({width:w,height:w,data},3).data,at=(x:number,y:number)=>[...out.subarray((y*w+x)*4,(y*w+x)*4+4)];
  expect(at(10,10)).toEqual([250,240,230,255]);
  expect(at(7,10)[3]).toBe(255);expect(at(7,10)[0]).toBeLessThan(40);
  expect(at(6,10)[3]).toBe(255);expect(at(5,10)[3]).toBeGreaterThan(64);expect(at(5,10)[3]).toBeLessThan(255);expect(at(3,10)[3]).toBe(0);expect(at(5,5)[3]).toBe(0);
 });
 it('keeps side tints light and greys out units that already acted',()=>{
  const enemy=unitTint({id:'e',side:'enemy',hasActed:false}),done=unitTint({id:'e',side:'enemy',hasActed:true});
  expect(enemy>>16).toBe(255);expect(enemy&255).toBeGreaterThan(0xc0);
  expect(done>>16).toBeLessThan(0xb0);expect(unitTint({id:'p',side:'player',hasActed:false})).toBe(0xffffff);
 });
});
import {coachStep} from '../src/tutorial.ts';
describe('first battle coach',()=>{
 it('walks through select, move, act and end turn',()=>{
  const u=(id:string,hasMoved=false,hasActed=false)=>({id,hasMoved,hasActed});
  expect(coachStep(1,true,[u('a'),u('b')],'a')).toContain('①');
  expect(coachStep(1,true,[u('a',true),u('b')],'a')).toContain('②');
  expect(coachStep(1,true,[u('a',true,true),u('b')],'b')).toContain('③');
  expect(coachStep(1,true,[u('a',true,true),u('b',false,true)],'b')).toContain('④');
  expect(coachStep(2,true,[u('a')],'a')).toBeUndefined();expect(coachStep(1,false,[u('a')],'a')).toBeUndefined();
 });
});
import {parseSettings,DEFAULT_SETTINGS} from '../src/settings.ts';
describe('saved settings',()=>{
 it('restores volumes, mute and speed and repairs bad values',()=>{
  expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings(JSON.stringify({music:.1,effects:2,sound:false,speed:3}))).toEqual({music:.1,effects:1,sound:false,speed:3});
  expect(parseSettings(JSON.stringify({speed:7,music:'x'})).speed).toBe(1);
 });
});
import {readSlot,slotLabel} from '../src/save-slots.ts';
describe('save slots',()=>{
 it('labels filled slots and ignores broken ones',()=>{
  const r={meta:{title:'장강 퇴각전',turn:4,difficulty:'extreme',at:0},save:{version:2}};
  expect(slotLabel(readSlot(JSON.stringify(r)),5*60000)).toBe('장강 퇴각전 · 4턴 · 극한 · 5분 전');
  expect(readSlot('{bad')).toBeUndefined();expect(readSlot(JSON.stringify({meta:{}}))).toBeUndefined();expect(slotLabel(undefined)).toBe('비어 있음');
 });
});
import {officerPortrait,troopFaceRow} from '../src/officer-art.ts';
describe('portraits without painted art',()=>{
 it('fall back to troop art for named commanders and keep painted faces',()=>{
  expect(officerPortrait('양앙')).toContain('troop-face');expect(troopFaceRow('전초 노병')).toBe(2);expect(troopFaceRow('추격 기병')).toBe(3);
  expect(officerPortrait('사마의')).toContain('data-officer="sima_yi"');expect(officerPortrait('꿈속의 목소리')).toContain('<span>꿈</span>');
 });
});
import {raceGap} from '../src/campaign-rules.ts';
import {Session} from '../src/session.ts';
import {freshCampaign,deployment} from '../src/progression.ts';
describe('S1-08 race readout',()=>{
 it('reports how far the competing ally and Sima Yi are from the fort',()=>{
  const s=new Session(1,'normal',215,'survival',4,deployment(freshCampaign(),true)),g=raceGap(s.state)!;
  expect(g.ally).toBeGreaterThan(0);expect(g.hero).toBeGreaterThan(0);
 });
});
import {dueLines,battleLines} from '../src/battle-lines.ts';
describe('battle chatter',()=>{
 it('fires opening lines once and has lines for the quiet stages',()=>{
  for(const id of ['S1-01','S1-07','S1-08'])expect(battleLines[id]!.length).toBeGreaterThanOrEqual(5);
  const s=new Session(7,'normal',215,'survival',4,deployment(freshCampaign(),true)),first=dueLines(s.state.stage.id,s.state,new Set());
  expect(first.map(l=>l.id)).toEqual(['open-1','open-2']);
  expect(dueLines(s.state.stage.id,s.state,new Set(first.map(l=>l.id)))).toEqual([]);
 });
});
import {storyAftermath} from '../src/story.ts';
import {chapters} from '../src/session.ts';
describe('aftermath scenes',()=>{
 it('every playable main battle has a scene after victory, in Korean',()=>{
  for(const c of chapters){const a=storyAftermath[c.stage.id];expect(a,c.stage.id).toBeDefined();expect(a!.beats.length).toBeGreaterThanOrEqual(2);for(const b of a!.beats)expect(b.line).not.toMatch(/[一-鿿]/);}
 });
});
