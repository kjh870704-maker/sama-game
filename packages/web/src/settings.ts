/** Player preferences that should survive a reload: volumes, mute and playback speed. */
export interface Settings {music:number;effects:number;sound:boolean;speed:1|2|3}
export const SETTINGS_KEY='sama-settings-v1';
export const DEFAULT_SETTINGS:Settings={music:.38,effects:.65,sound:true,speed:1};
const clamp=(v:unknown,d:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(1,v)):d;
/** Accepts anything a past version (or a hand edit) left behind and repairs it. */
export function parseSettings(raw:string|null):Settings{
  let v:Partial<Settings>={};try{v=raw?JSON.parse(raw) as Partial<Settings>:{};}catch{/* Corrupt value: fall back to defaults. */}
  return {music:clamp(v.music,DEFAULT_SETTINGS.music),effects:clamp(v.effects,DEFAULT_SETTINGS.effects),sound:typeof v.sound==='boolean'?v.sound:true,speed:v.speed===2||v.speed===3?v.speed:1};
}
export function loadSettings():Settings{try{return parseSettings(localStorage.getItem(SETTINGS_KEY));}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(s:Settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch{/* Private mode: settings last for this visit only. */}}
