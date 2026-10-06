import {describe,it,expect} from 'vitest';
import {officerLooks,officerLook,officerPortrait,dialogueCaption,splitSpokenLine,storyActorStyle,troopFaceRow} from '../src/officer-art.ts';
import {storyBeats} from '../src/story.ts';
describe('officer identity in dialogue',()=>{
 it('gives all named speakers in current main scenes a dedicated portrait',()=>{for(const beats of Object.values(storyBeats))for(const b of beats)if(b.speaker!=='꿈속의 목소리')expect(officerLook(b.speaker)??troopFaceRow(b.speaker),b.speaker).toBeDefined();});
 it('keeps the boy and adult distinct and resolves IDs and names consistently',()=>{expect(officerLook('소년 사마의')!.slot).not.toBe(officerLook('사마의')!.slot);for(const p of officerLooks)expect(officerLook(p.id)).toBe(officerLook(p.name));});
 it('puts portrait before the dialogue text and escapes unknown text',()=>{const html=dialogueCaption('조진','<돌격>');expect(html.indexOf('officer-face')).toBeLessThan(html.indexOf('dialogue-copy'));expect(html).toContain('&lt;돌격&gt;');expect(officerPortrait('<낯선 인물>')).toContain('&lt;낯선 인물&gt;');expect(officerPortrait('교관')).toContain('병종 초상');expect(officerPortrait('해설')).toContain('미등록');});
 it('parses expedition speakers without inventing a speaker for narration',()=>{expect(splitSpokenLine('조진: 정찰하라.')).toEqual({speaker:'조진',line:'정찰하라.'});expect(splitSpokenLine('군막에 밤이 내렸다.').speaker).toBe('해설');});
 it('uses only available story figures and keeps a fallback for other people',()=>{expect(storyActorStyle('사마방')).toContain('officer-story-atlas');expect(storyActorStyle('마초',3)).toBe('--row:60%');});
});
