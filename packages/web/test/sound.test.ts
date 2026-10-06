import {describe,it,expect} from 'vitest';
import {recipeNames,recipes,renderVariants,zhengNote,SR,pluck,rng} from '../src/sound-bank.ts';
import {soundsFor,strategySound,type SoundEvent} from '../src/sound-events.ts';
import {supportOptions} from '../src/troops.ts';
const stats=(b:Float32Array)=>{let pk=0,s=0;for(const x of b){expect(Number.isFinite(x)).toBe(true);pk=Math.max(pk,Math.abs(x));s+=x*x;}return {pk,rms:Math.sqrt(s/b.length)};};
describe('synthesized sound bank',()=>{
 it.each(recipeNames)('%s renders audible, unclipped, varied takes',name=>{
  const [a,b]=renderVariants(name,2);const sa=stats(a!);
  expect(sa.pk).toBeGreaterThan(.3);expect(sa.pk).toBeLessThanOrEqual(1);expect(sa.rms).toBeGreaterThan(.01);
  expect(a!.length/SR).toBeLessThan(4.5);
  let diff=0;for(let i=0;i<Math.min(a!.length,b!.length);i++)diff+=Math.abs(a![i]!-b![i]!);expect(diff/a!.length).toBeGreaterThan(.001);
 });
 it('is deterministic per seed so saved replays sound the same',()=>{expect(renderVariants('clash',1,5)[0]).toEqual(renderVariants('clash',1,5)[0]);});
 it('plucks a string at the requested pitch',()=>{
  // Autocorrelation peak: the period of the strongest repetition is the pitch.
  const b=pluck(220,.5,rng(3),.5),start=Math.floor(SR*.05);let best=0,lag=0;
  for(let l=60;l<400;l++){let c=0;for(let i=start;i<start+2000;i++)c+=b[i]!*b[i+l]!;if(c>best){best=c;lag=l;}}
  expect(SR/lag).toBeGreaterThan(205);expect(SR/lag).toBeLessThan(235);
  expect(stats(zhengNote(62)).pk).toBeGreaterThan(.5);
 });
});
describe('battle sound events',()=>{
 const known=(shots:{name:string}[])=>shots.every(s=>recipes[s.name]);
 it('gives every troop class an attack, impact, move and selection sound',()=>{
  for(const c of [...supportOptions,'navy','civilian','engineer']){
   for(const kind of ['attack-start','impact','move','select'] as const){const shots=soundsFor({kind,unitClass:c,hit:true},()=>.1);expect(shots.length,c+' '+kind).toBeGreaterThan(0);expect(known(shots)).toBe(true);}
  }
 });
 it('voices each strategy element differently',()=>{
  expect(strategySound('fire')).toBe('fire');expect(strategySound('windDragon')).toBe('wind');expect(strategySound('flood')).toBe('water');
  expect(strategySound('thunder')).toBe('thunder');expect(strategySound('bind')).toBe('earth');expect(strategySound('confuse')).toBe('confuse');
  expect(strategySound('mend')).toBe('heal');expect(strategySound('fortify')).toBe('buff');expect(strategySound('rockfall')).toBe('boulder-hit');expect(strategySound('heal')).toBe('heal');
 });
 it('separates misses, guards, criticals and the ceremony around a battle',()=>{
  expect(soundsFor({kind:'impact',unitClass:'infantry',hit:false})[0]!.name).toBe('evade');
  expect(soundsFor({kind:'impact',unitClass:'infantry',hit:true,guard:true}).some(s=>s.name==='guard')).toBe(true);
  expect(soundsFor({kind:'impact',unitClass:'infantry',hit:true,critical:true}).some(s=>s.duck)).toBe(true);
  expect(soundsFor({kind:'turn',side:'player'}).map(s=>s.name)).toContain('war-drum');expect(soundsFor({kind:'turn',side:'enemy'}).map(s=>s.name)).toContain('enemy-drum');
  for(const kind of ['battle-start','victory','defeat','breach','retreat','repair','duel','ui','page','strategy-start'] as SoundEvent['kind'][])expect(known(soundsFor({kind,unitClass:'infantry'}))).toBe(true);
 });
});
import {SAMPLE_GROUPS,SAMPLE_LAYERS,SAMPLE_ORIGINS} from '../src/sound-samples.ts';
import {existsSync,readFileSync} from 'node:fs';
describe('recorded CC0 samples',()=>{
 it('ships every listed take as a small MP3',()=>{
  for(const [group,{files,midi}] of Object.entries(SAMPLE_GROUPS)){
   expect(files.length,group).toBeGreaterThan(0);if(midi)expect(midi).toHaveLength(files.length);
   for(const f of files){const path=new URL('../public/sfx/'+f,import.meta.url);expect(existsSync(path),f).toBe(true);const b=readFileSync(path);expect(b[0]===0xff&&(b[1]!&0xe0)===0xe0||b.toString('ascii',0,3)==='ID3',f+' is MP3').toBe(true);expect(b.length,f).toBeLessThan(120_000);}
   expect(SAMPLE_ORIGINS[group]!.length).toBeGreaterThan(0);
  }
 });
 it('builds layered sounds only from shipped groups and known synth recipes',()=>{
  for(const [name,layers] of Object.entries(SAMPLE_LAYERS)){
   expect(layers.length).toBeGreaterThan(0);
   for(const l of layers){if(l.synth)expect(recipes[name],name).toBeDefined();else expect(SAMPLE_GROUPS[l.group!],name+' → '+l.group).toBeDefined();}
  }
  const zheng=SAMPLE_GROUPS.zheng!.midi!;expect(Math.min(...zheng)).toBeLessThan(50);expect(Math.max(...zheng)).toBeGreaterThan(78);
 });
 it('keeps origins inside CC0 packs',()=>{
  for(const origins of Object.values(SAMPLE_ORIGINS))for(const o of origins)expect(o).toMatch(/^(VCSL\/|cc0sounds\/(kenney_|80-CC0|75-cc0|100-CC0|40-cc0|25-CC0|Micro Pack - |warfork-cc0\/sounds))/);
 });
});

import {leadIn} from '../src/sound-samples.ts';
describe('mp3 lead-in trim',()=>{
 it('skips encoder silence but keeps the attack',()=>{
  const rate=32000,d=new Float32Array(rate/2);for(let i=1120;i<d.length;i++)d[i]=Math.sin(i/5)*.5;
  expect(leadIn(d,rate)).toBe(1120-64);expect(leadIn(new Float32Array(rate),rate)).toBe(0);
  const loud=new Float32Array(100).fill(.4);expect(leadIn(loud,rate)).toBe(0);
 });
});
import {bossNear,placeThemes} from '../src/music.ts';
describe('menu and boss music',()=>{
 it('has a title theme and switches to boss music when a named commander is close',()=>{
  expect(placeThemes.title.name).toBe('연의 서곡');
  const u=(id:string,side:string,x:number,alive=true)=>({id,side,alive,pos:{x,y:0}});
  expect(bossNear([u('sima_yi','player',0),u('ma_chao','enemy',4)])).toBe(true);
  expect(bossNear([u('sima_yi','player',0),u('ma_chao','enemy',9)])).toBe(false);
  expect(bossNear([u('sima_yi','player',0),u('raider','enemy',1)])).toBe(false);
  expect(bossNear([u('sima_yi','player',0),u('lu_bu','enemy',1,false)])).toBe(false);
 });
});
