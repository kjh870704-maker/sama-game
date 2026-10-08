import {describe,it,expect} from 'vitest';
import {officerLooks,officerLook,officerPortrait,dialogueCaption,splitSpokenLine,storyActorStyle,troopFaceRow} from '../src/officer-art.ts';
import {storyBeats} from '../src/story.ts';
describe('officer identity in dialogue',()=>{
 it('gives all named speakers in current main scenes a dedicated portrait',()=>{for(const beats of Object.values(storyBeats))for(const b of beats)if(b.speaker!=='꿈속의 목소리')expect(officerLook(b.speaker)??troopFaceRow(b.speaker),b.speaker).toBeDefined();});
 it('keeps the boy and adult distinct and resolves IDs and names consistently',()=>{expect(officerLook('소년 사마의')!.slot).not.toBe(officerLook('사마의')!.slot);for(const p of officerLooks)expect(officerLook(p.id)).toBe(officerLook(p.name));});
 it('puts the painted bust before the dialogue text and escapes unknown text',()=>{const html=dialogueCaption('조진','<돌격>');expect(html.indexOf('story-caption-bust')).toBeLessThan(html.indexOf('dialogue-copy'));expect(html).toContain('officers/cao_zhen-bust-v1.webp');expect(html).toContain('&lt;돌격&gt;');expect(officerPortrait('<낯선 인물>')).toContain('&lt;낯선 인물&gt;');expect(officerPortrait('교관')).toContain('병종 초상');expect(officerPortrait('해설')).toContain('미등록');});
 it('parses expedition speakers without inventing a speaker for narration',()=>{expect(splitSpokenLine('조진: 정찰하라.')).toEqual({speaker:'조진',line:'정찰하라.'});expect(splitSpokenLine('군막에 밤이 내렸다.').speaker).toBe('해설');});
 it('uses each officer story sheet and keeps a fallback for other people',()=>{expect(storyActorStyle('사마방')).toContain('officers/sima_fang-story-v1.webp');expect(storyActorStyle('마초')).toContain('officers/ma_chao-story-v1.webp');expect(storyActorStyle('무명',3)).toBe('--row:60%');});
 it('links every shipped story SD and bust to a speaker',()=>{
  const fs=require('node:fs') as typeof import('node:fs'),path=require('node:path') as typeof import('node:path');
  const dir=path.resolve(__dirname,'../public/officers'),ids=new Set(fs.readdirSync(dir).map(f=>f.match(/^(.+)-(story|bust)-v1\.webp$/)?.[1]).filter((x):x is string=>!!x));
  for(const id of ids)expect(officerLook(id),id).toBeDefined();
  expect(dialogueCaption('사마소','강을 건너자')).toContain('officers/sima_zhao-bust-v1.webp');
  expect(storyActorStyle('사마사')).toContain('officers/sima_shi-story-v1.webp');
  // 옛 초상 묶음 그림(4×3칸) 밖을 가리키지 않는다.
  for(const p of officerLooks){const html=officerPortrait(p.name),m=html.match(/background-position:([\d.]+)% ([\d.]+)%/);if(m&&!html.includes('troop-face'))expect(Number(m[2])).toBeLessThanOrEqual(100);}
 });
});
