/**
 * 책략 그림 아이콘 — 글자 대신 그림. 속성별 바탕(불·바람·물·번개·땅·술법·지원) 위에
 * 책략마다 고유한 그림을 얹고, 진화 단계에 따라 테두리(동→은→금)와 장식(기운 고리·빛살·별)이 붙는다.
 * 결과는 SVG 문자열 또는 data URL(img src)로 쓴다.
 */
import type {StrategyTier} from '../../core/src/index.ts';
import {allStrategies,type LearnedStrategy} from './officers.ts';

const O='stroke="#140c06" stroke-width="1.6" stroke-linejoin="round"';
type Pal=[string,string,string];
const PAL:Record<string,Pal>={fire:['#ffd27a','#d4421a','#3b0a02'],wind:['#c8f7dc','#2f9e6e','#0b2e22'],water:['#b8e0ff','#2563eb','#0a1a3d'],thunder:['#f1e4ff','#8b5cf6','#1e0b3d'],
  earth:['#ecdcae','#8a6a2a','#2a1c08'],curse:['#f6c8ff','#9b2fae','#2a0632'],heal:['#e2ffd0','#3f9a4a','#0c2a10'],buff:['#fff0c0','#c88a1a','#3a2204'],physical:['#f0e2d0','#a8452e','#2a0c06']};
export function paletteKey(s:Pick<LearnedStrategy,'element'|'support'>){if(s.support)return s.support==='heal'||s.support==='cleanse'||s.support==='mana'?'heal':'buff';return s.element==='support'?'curse':s.element;}

// ── 그림 조각(64칸 기준)
const flame=(x:number,y:number,s=1,c1='#ffe27a',c2='#ff7a1a',c3='#c0200a')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 14 C-12 12 -14 0 -8 -8 C-7 -2 -3 -1 -3 -4 C-4 -12 2 -18 4 -22 C5 -14 14 -10 12 2 C11 9 6 14 0 14Z" fill="${c3}" ${O}/><path d="M0 12 C-8 10 -9 2 -5 -3 C-4 1 0 1 0 -3 C0 -9 3 -12 5 -15 C6 -8 10 -4 8 4 C7 9 4 12 0 12Z" fill="${c2}"/><path d="M0 11 C-4 10 -5 5 -2 2 C-1 5 2 4 2 1 C3 -2 4 -4 5 -6 C6 -1 6 5 4 8 C3 10 2 11 0 11Z" fill="${c1}"/></g>`;
const bolt=(x:number,y:number,s=1,c='#fff6a0')=>`<path transform="translate(${x} ${y}) scale(${s})" d="M4 -20 L-8 2 L-1 2 L-6 20 L9 -4 L2 -4 L8 -20Z" fill="${c}" ${O}/>`;
const cloud=(x:number,y:number,s=1,c='#6a5a8a',hi='#a89ac8')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 6 C-22 6 -22 -4 -15 -4 C-15 -12 -5 -14 -1 -8 C2 -14 13 -13 13 -5 C20 -6 22 6 15 6Z" fill="${c}" ${O}/><path d="M-12 -2 C-11 -7 -5 -9 -2 -5" stroke="${hi}" stroke-width="2" fill="none"/></g>`;
const swirl=(x:number,y:number,s=1,c='#e8fff4')=>`<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-linecap="round"><path d="M-18 -6 C-10 -14 10 -14 14 -4 C17 4 6 10 -2 6 C-8 3 -6 -4 0 -4" stroke="#140c06" stroke-width="6"/><path d="M-18 -6 C-10 -14 10 -14 14 -4 C17 4 6 10 -2 6 C-8 3 -6 -4 0 -4" stroke="${c}" stroke-width="3.4"/><path d="M-20 8 C-10 14 4 16 18 10" stroke="#140c06" stroke-width="5"/><path d="M-20 8 C-10 14 4 16 18 10" stroke="${c}" stroke-width="2.6"/></g>`;
const tornado=(x:number,y:number,s=1,c='#d8fff0')=>`<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-linecap="round">${[[-16,-16,16],[-12,-8,12],[-8,0,8],[-5,7,5],[-2,13,2]].map(([a,y,b])=>`<path d="M${a} ${y} C${a! / 2} ${y!+5} ${b! / 2} ${y!+5} ${b} ${y}" stroke="#140c06" stroke-width="5"/><path d="M${a} ${y} C${a! / 2} ${y!+5} ${b! / 2} ${y!+5} ${b} ${y}" stroke="${c}" stroke-width="2.6"/>`).join('')}</g>`;
const wave=(x:number,y:number,s=1,c='#7ac0ff',hi='#e8f6ff')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 12 C-18 -2 -8 -14 6 -12 C16 -10 18 0 10 2 C4 3 2 -4 6 -6 C-4 -6 -10 4 -8 12Z" fill="${c}" ${O}/><path d="M-22 12 H22 V16 H-22Z" fill="#1e4a9a" ${O}/><path d="M-14 4 C-10 -4 -4 -9 4 -9" stroke="${hi}" stroke-width="2" fill="none"/></g>`;
const drops=(x:number,y:number,s=1,c='#9ad4ff')=>`<g transform="translate(${x} ${y}) scale(${s})">${[[-8,-4],[6,-8],[0,6]].map(([a,b])=>`<path d="M${a} ${b!-7} C${a!+5} ${b!} ${a!+4} ${b!+5} ${a} ${b!+5} C${a!-4} ${b!+5} ${a!-5} ${b!} ${a} ${b!-7}Z" fill="${c}" ${O}/>`).join('')}</g>`;
const rock=(x:number,y:number,s=1,c='#9a8a6a')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12 8 L-14 -2 L-6 -10 L6 -10 L13 -2 L12 8Z" fill="${c}" ${O}/><path d="M-6 -10 L-2 -2 L13 -2 M-2 -2 L-4 8" stroke="#5a4a32" stroke-width="1.4" fill="none"/><path d="M-10 -3 L-5 -8" stroke="#e0d0a8" stroke-width="1.6"/></g>`;
const chain=(x:number,y:number,s=1,c='#b8c0c8')=>`<g transform="translate(${x} ${y}) scale(${s})">${[-14,-4,6,16].map((a,i)=>`<rect x="${a-6}" y="${i%2?-3:-6}" width="12" height="${i%2?6:12}" rx="4" fill="none" stroke="#140c06" stroke-width="5"/><rect x="${a-6}" y="${i%2?-3:-6}" width="12" height="${i%2?6:12}" rx="4" fill="none" stroke="${c}" stroke-width="2.6"/>`).join('')}</g>`;
const spiral=(x:number,y:number,s=1,c='#f6c8ff')=>`<g transform="translate(${x} ${y}) scale(${s})" fill="none"><path d="M0 0 C3 -1 4 3 1 5 C-4 7 -8 2 -6 -3 C-3 -10 8 -10 10 -2 C12 6 4 13 -4 12" stroke="#140c06" stroke-width="5" stroke-linecap="round"/><path d="M0 0 C3 -1 4 3 1 5 C-4 7 -8 2 -6 -3 C-3 -10 8 -10 10 -2 C12 6 4 13 -4 12" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/></g>`;
const skull=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-10 2 C-12 -10 12 -10 10 2 C10 6 6 7 6 10 H-6 C-6 7 -10 6 -10 2Z" fill="#efe6d0" ${O}/><circle cx="-4" cy="0" r="3" fill="#2a0632"/><circle cx="4" cy="0" r="3" fill="#2a0632"/><path d="M-3 10 V6 M0 10 V6 M3 10 V6" stroke="#140c06" stroke-width="1"/></g>`;
const shield=(x:number,y:number,s=1,c='#4a7ab8',rim='#e8d8a8')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -16 L14 -10 C14 4 8 12 0 16 C-8 12 -14 4 -14 -10Z" fill="${c}" ${O}/><path d="M0 -12 L10 -8 C10 2 6 8 0 11 C-6 8 -10 2 -10 -8Z" fill="none" stroke="${rim}" stroke-width="1.6"/><path d="M0 -8 V8 M-6 0 H6" stroke="${rim}" stroke-width="2"/></g>`;
const cross=(x:number,y:number,s=1,c='#f4fff0')=>`<path transform="translate(${x} ${y}) scale(${s})" d="M-4 -12 H4 V-4 H12 V4 H4 V12 H-4 V4 H-12 V-4 H-4Z" fill="${c}" ${O}/>`;
const leaf=(x:number,y:number,s=1,r=0,c='#6ac050')=>`<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 10 C-8 4 -8 -6 0 -12 C8 -6 8 4 0 10Z M0 10 V-10" fill="${c}" ${O}/>`;
const drum=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="8" rx="14" ry="5" fill="#7a2a14" ${O}/><path d="M-14 -4 V8 H14 V-4Z" fill="#a83a1c" ${O}/><ellipse cx="0" cy="-4" rx="14" ry="5" fill="#f0dcb0" ${O}/><path d="M-10 0 V8 M10 0 V8 M0 1 V10" stroke="#d8a838" stroke-width="1.6"/><path d="M6 -16 L-2 -6 M-10 -18 L-4 -7" stroke="#6a3a1a" stroke-width="2.6" stroke-linecap="round"/><circle cx="6" cy="-16" r="2.4" fill="#c0342a"/><circle cx="-10" cy="-18" r="2.4" fill="#c0342a"/></g>`;
const flag=(x:number,y:number,s=1,c='#c0342a',torn=false)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 -16 V16" stroke="#5a3a1a" stroke-width="2.6"/><path d="M-7 -15 H12 ${torn?'L8 -10 L12 -6 L6 -3 L9 0':'L8 -7 L12 1'} H-7Z" fill="${c}" ${O}/></g>`;
const spear=(x:number,y:number,s=1,r=0)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 18 V-10" stroke="#6a3a1a" stroke-width="2.6"/><path d="M0 -20 L4 -10 L0 -8 L-4 -10Z" fill="#d8e0e8" ${O}/><path d="M-3 -8 H3" stroke="#c0342a" stroke-width="2"/></g>`;
const eye=(x:number,y:number,s=1,c='#f6c8ff')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0 C-8 -9 8 -9 14 0 C8 9 -8 9 -14 0Z" fill="${c}" ${O}/><circle r="5" fill="#2a0632"/><circle cx="-1.6" cy="-1.6" r="1.6" fill="#fff"/></g>`;
const mouthSeal=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-12" y="-16" width="24" height="32" rx="2" fill="#f0dc98" ${O}/><path d="M-6 -10 H6 M0 -12 V10 M-6 -2 H6 M-5 6 C-2 9 2 9 5 6" stroke="#b8241a" stroke-width="2.2" fill="none"/></g>`;
const boot=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 -14 H4 V4 L14 8 V14 H-6Z" fill="#6a4a2a" ${O}/><path d="M-6 -6 H4" stroke="#d8a838" stroke-width="2"/><path d="M-18 -4 H-10 M-20 2 H-10 M-18 8 H-10" stroke="#e8fff4" stroke-width="2.4" stroke-linecap="round"/></g>`;
const sword=(x:number,y:number,s=1,r=0)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-2 10 V-16 L0 -20 L2 -16 V10Z" fill="#e0e8f0" ${O}/><path d="M-7 10 H7" stroke="#d8a838" stroke-width="3" stroke-linecap="round"/><path d="M0 11 V18" stroke="#6a3a1a" stroke-width="3"/></g>`;
const cup=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-9 -8 H9 L6 4 C4 7 -4 7 -6 4Z" fill="#d8a838" ${O}/><path d="M0 6 V12 M-6 12 H6" stroke="#140c06" stroke-width="2.6"/><path d="M-7 -6 H7" stroke="#8a1a14" stroke-width="2"/></g>`;
const boat=(x:number,y:number,s=1,burn=false)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 2 H20 L14 10 H-14Z" fill="#7a4a24" ${O}/><path d="M0 2 V-14" stroke="#5a3a1a" stroke-width="2.4"/><path d="M1 -13 L12 -2 H1Z" fill="#e8dcc0" ${O}/>${burn?flame(-8,-4,.5)+flame(10,-2,.45):''}<path d="M-22 12 C-16 9 -12 15 -6 12 C0 9 4 15 10 12 C16 9 20 15 24 12" stroke="#7ac0ff" stroke-width="2.4" fill="none"/></g>`;
const mountain=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 14 L-8 -10 L0 0 L8 -14 L22 14Z" fill="#6a7a5a" ${O}/><path d="M8 -14 L12 -6 L8 -8 L4 -4Z" fill="#f0f0e8"/></g>`;
const note=(x:number,y:number,s=1,c='#f6c8ff')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M2 6 V-12 L12 -14 V2" fill="none" stroke="#140c06" stroke-width="3.4"/><path d="M2 6 V-12 L12 -14 V2" fill="none" stroke="${c}" stroke-width="1.8"/><ellipse cx="-1" cy="6" rx="4" ry="3" fill="${c}" ${O}/><ellipse cx="9" cy="2" rx="4" ry="3" fill="${c}" ${O}/></g>`;
const gate=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-18 14 V-4 H18 V14Z" fill="#8a8478" ${O}/><path d="M-22 -4 L0 -16 L22 -4Z" fill="#3a3a4a" ${O}/><path d="M-6 14 V2 C-6 -4 6 -4 6 2 V14Z" fill="#1a1410" ${O}/></g>`;
const lotus=(x:number,y:number,s=1,c='#f8c8e0')=>`<g transform="translate(${x} ${y}) scale(${s})">${[-50,-25,0,25,50].map(r=>`<path transform="rotate(${r})" d="M0 6 C-5 0 -5 -8 0 -14 C5 -8 5 0 0 6Z" fill="${c}" ${O}/>`).join('')}<path d="M-14 8 C-6 12 6 12 14 8" stroke="#3f9a4a" stroke-width="3" fill="none"/></g>`;
const fist=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-10 -4 C-10 -12 10 -12 10 -4 V8 C10 12 -10 12 -10 8Z" fill="#e8b888" ${O}/><path d="M-5 -10 V-2 M0 -11 V-2 M5 -10 V-2" stroke="#8a5a3a" stroke-width="1.4"/><path d="M-10 0 C-14 0 -14 6 -10 6" fill="#e8b888" ${O}/></g>`;
const sparks=(x:number,y:number,s=1,c='#fff0a0')=>`<g transform="translate(${x} ${y}) scale(${s})" fill="${c}">${[[-12,-8,2.4],[10,-12,2],[14,4,2.6],[-14,8,1.8],[2,-16,1.6]].map(([a,b,r])=>`<circle cx="${a}" cy="${b}" r="${r}"/>`).join('')}</g>`;
const crack=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 6 H22 V16 H-22Z" fill="#8a6a34" ${O}/><path d="M-4 6 L0 10 L-3 13 L2 16 M10 6 L8 11" stroke="#140c06" stroke-width="2" fill="none"/></g>`;
const brokenWall=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-18 14 V-8 L-12 -12 L-8 -4 L-2 -10 L2 -2 V14Z" fill="#9a948a" ${O}/><path d="M-18 0 H2 M-10 0 V14 M-18 7 H2" stroke="#5a564e" stroke-width="1.2"/>${rock(12,8,.6)}</g>`;
const armorCrack=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12 -12 H12 L10 12 H-10Z" fill="#8a929c" ${O}/><path d="M-12 -4 H12 M-11 4 H11" stroke="#4a525c" stroke-width="1.4"/><path d="M2 -14 L-2 -4 L4 2 L-1 14" stroke="#ff6a3a" stroke-width="2.6" fill="none"/></g>`;
const mire=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="8" rx="20" ry="7" fill="#5a4a24" ${O}/><circle cx="-6" cy="6" r="2.6" fill="#8a7a44"/><circle cx="7" cy="9" r="2" fill="#8a7a44"/>${boot(4,-6,.6)}</g>`;
const miasma=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 10 C-22 2 -12 -6 -6 -2 C-6 -12 8 -14 10 -4 C18 -6 22 6 14 10Z" fill="#7ab040" opacity=".85" ${O}/>${skull(0,2,.6)}</g>`;
const poisonFlask=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 -14 H4 V-6 C12 -2 12 12 0 12 C-12 12 -12 -2 -4 -6Z" fill="#5ab040" ${O}/><path d="M-6 -16 H6" stroke="#6a3a1a" stroke-width="3"/><path d="M-6 2 C-3 0 3 4 6 2" stroke="#c8ff9a" stroke-width="1.6" fill="none"/>${skull(0,4,.4)}</g>`;
const mask=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 -8 C-14 -16 14 -16 14 -8 C14 6 6 14 0 14 C-6 14 -14 6 -14 -8Z" fill="#efe6d0" ${O}/><path d="M-9 -5 C-7 -8 -3 -8 -2 -4 M2 -4 C3 -8 7 -8 9 -5" stroke="#140c06" stroke-width="2.4" fill="none"/><path d="M-5 6 C-2 3 2 3 5 6" stroke="#c0342a" stroke-width="2.4" fill="none"/><path d="M-12 -2 C-10 0 -8 0 -7 -2 M12 -2 C10 0 8 0 7 -2" stroke="#c0342a" stroke-width="1.4" fill="none"/></g>`;
const talisman=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-16" width="16" height="32" fill="#f0dc58" ${O}/><path d="M-4 -10 H4 M0 -12 V12 M-4 -2 C0 2 4 -2 4 4 M-4 8 H4" stroke="#b8241a" stroke-width="2" fill="none"/></g>`;
const hourglass=(x:number,y:number,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-10 -14 H10 L2 0 L10 14 H-10 L-2 0Z" fill="#bfe6ff" ${O}/><path d="M-6 10 H6 L0 2Z" fill="#d8a838"/></g>`;
const ring=(x:number,y:number,s=1,c='#d8e0e8')=>`<g transform="translate(${x} ${y}) scale(${s})">${Array.from({length:8},(_,i)=>spear(Math.cos(i*Math.PI/4)*14,Math.sin(i*Math.PI/4)*14,.5,i*45-90)).join('')}</g>`;

/** 책략 id → 그림 */
const MOTIF:Record<string,()=>string>={
  // 불
  fire:()=>flame(32,34,1.25),embers:()=>flame(32,38,.75)+sparks(32,30,1),inferno:()=>flame(20,40,.9)+flame(44,40,.9)+flame(32,32,1.2),
  fireWall:()=>`<path d="M10 46 H54 V52 H10Z" fill="#8a3a1a" ${O}/>`+flame(18,38,.7)+flame(32,34,.85)+flame(46,38,.7),
  chainFire:()=>chain(32,46,.75,'#c8a058')+flame(18,30,.6)+flame(32,28,.7)+flame(46,30,.6),skyFire:()=>cloud(32,20,1,'#7a3a2a','#d88a6a')+flame(22,44,.5)+flame(34,48,.55)+flame(44,42,.45),
  // 바람
  windDragon:()=>`<path d="M14 44 C10 30 24 18 36 22 C46 25 50 36 42 40 C34 44 28 34 36 30" fill="none" stroke="#140c06" stroke-width="8" stroke-linecap="round"/><path d="M14 44 C10 30 24 18 36 22 C46 25 50 36 42 40 C34 44 28 34 36 30" fill="none" stroke="#9af0c8" stroke-width="4.6" stroke-linecap="round"/><path d="M36 22 L44 14 L46 22 M30 21 L32 12" stroke="#e8fff4" stroke-width="2.4" fill="none"/><circle cx="38" cy="25" r="1.8" fill="#c0342a"/>`,
  gust:()=>swirl(32,32,1),whirlwind:()=>tornado(32,34,1.1),tempest:()=>cloud(32,20,1.1,'#2a4a3a','#7ab89a')+tornado(32,42,.7),gale:()=>swirl(30,32,.9)+sword(42,34,.8,40),
  // 물
  flood:()=>wave(32,36,1.15),waterSurge:()=>wave(26,36,.9)+wave(40,40,.7),deluge:()=>`<path d="M12 44 C12 24 30 14 44 20 C52 24 50 34 42 34" fill="none" stroke="#140c06" stroke-width="9" stroke-linecap="round"/><path d="M12 44 C12 24 30 14 44 20 C52 24 50 34 42 34" fill="none" stroke="#7ac0ff" stroke-width="5.6" stroke-linecap="round"/><path d="M44 20 L52 14 M40 18 L42 10" stroke="#e8f6ff" stroke-width="2.4"/><circle cx="45" cy="23" r="1.8" fill="#fff"/>`+drops(30,46,.6),
  tidalLine:()=>`<path d="M8 40 H56" stroke="#140c06" stroke-width="10"/><path d="M8 40 H56" stroke="#7ac0ff" stroke-width="7"/><path d="M8 40 C16 34 22 46 30 40 C38 34 44 46 56 40" stroke="#e8f6ff" stroke-width="2" fill="none"/>`+rock(20,26,.6)+rock(42,26,.55),
  weiRiver:()=>`<path d="M6 30 H58 V50 H6Z" fill="#2a6ab8" ${O}/>`+`<path d="M24 30 V18 H40 V30" fill="#c8a058" ${O}/><path d="M24 24 H40" stroke="#7a5a20" stroke-width="1.6"/>`+wave(20,42,.5)+wave(40,42,.5),
  // 번개
  thunder:()=>cloud(32,18,.9)+bolt(32,40,1),lightningNet:()=>`<path d="M10 28 L22 40 L32 28 L42 40 L54 28 M10 44 L22 32 L32 44 L42 32 L54 44" stroke="#140c06" stroke-width="5" fill="none"/><path d="M10 28 L22 40 L32 28 L42 40 L54 28 M10 44 L22 32 L32 44 L42 32 L54 44" stroke="#fff6a0" stroke-width="2.4" fill="none"/>`,
  thunderbolt:()=>cloud(32,16,1.1,'#3a2a6a','#8a7ac8')+bolt(32,40,1.35),thunderCross:()=>bolt(32,22,.6)+bolt(32,46,.6)+bolt(18,34,.6)+bolt(46,34,.6)+`<circle cx="32" cy="34" r="5" fill="#fff6a0" ${O}/>`,
  // 땅
  bind:()=>chain(32,32,1.1),ambush:()=>`<path d="M8 50 C10 36 22 34 26 44 C30 32 46 34 48 50Z" fill="#3a6a2a" ${O}/>`+spear(20,30,.8,-10)+spear(32,26,.8)+spear(44,30,.8,10),
  rockfall:()=>mountain(24,40,.8)+rock(42,26,.8)+rock(48,42,.55),encircle:()=>ring(32,34,1)+`<circle cx="32" cy="34" r="4" fill="#c0342a" ${O}/>`,
  poison:()=>poisonFlask(32,34,1.1),mire:()=>mire(32,36,1),quake:()=>crack(32,34,1.1)+rock(22,24,.5)+rock(42,22,.45),
  breakArmor:()=>armorCrack(32,34,1.1),shatter:()=>brokenWall(30,34,1.1),tenAmbush:()=>ring(32,34,1.15)+`<path d="M22 44 C24 36 40 36 42 44Z" fill="#3a6a2a" ${O}/>`,
  // 술법(적 약화)
  confuse:()=>spiral(32,32,1.2),feint:()=>mask(32,34,1.1),demoralize:()=>flag(32,34,1.1,'#7a5a8a',true)+spiral(44,22,.5),
  grandFeint:()=>gate(32,38,1)+note(46,18,.6),silence:()=>mouthSeal(32,34,1),weakenCurse:()=>talisman(32,34,1.05),terror:()=>skull(32,32,1.4),
  plague:()=>miasma(32,34,1.1),rumor:()=>`<path d="M10 20 H40 V38 H24 L16 46 V38 H10Z" fill="#efe6d0" ${O}/>`+spiral(25,29,.4,'#9b2fae')+`<path d="M34 28 H54 V42 H48 L44 48 V42 H34Z" fill="#d8c8a0" ${O}/>`,
  chaos:()=>spiral(22,28,.7)+spiral(42,26,.6)+spiral(32,42,.75),hongmen:()=>cup(24,38,1)+sword(42,32,.9,25),fourSongs:()=>note(22,30,.8)+note(40,26,.7)+flag(46,44,.5,'#7a5a8a',true),
  // 지원
  mend:()=>cross(32,34,1.1,'#f4fff0'),greatMend:()=>cross(32,34,1.2)+leaf(16,24,.6,-30)+leaf(48,24,.6,30),sanctuary:()=>lotus(32,38,1.1)+`<circle cx="32" cy="20" r="6" fill="#fff8d0" ${O}/>`,
  purify:()=>drops(32,32,1.1,'#d8f4ff'),focus:()=>lotus(32,40,.9,'#c8e0ff')+`<circle cx="32" cy="22" r="7" fill="#9ad4ff" ${O}/><circle cx="32" cy="22" r="3" fill="#fff"/>`,
  fortify:()=>shield(32,34,1.2),ironWall:()=>shield(22,36,.9,'#6a7a8a')+shield(42,36,.9,'#6a7a8a')+shield(32,30,1,'#8a9aaa'),
  march:()=>boot(34,34,1.1),swiftWind:()=>boot(36,34,1)+swirl(22,22,.4),secretPath:()=>mountain(32,40,1)+`<path d="M14 50 C20 44 26 46 30 40 C34 34 40 34 44 28" stroke="#f0dc98" stroke-width="2.6" stroke-dasharray="3 3" fill="none"/>`,
  inspire:()=>drum(32,36,1),warCry:()=>fist(30,36,1.1)+`<path d="M44 22 L52 16 M46 30 H56 M44 38 L52 44" stroke="#fff0a0" stroke-width="2.6" stroke-linecap="round"/>`,
  grandDrum:()=>drum(32,38,1.15)+flag(50,24,.5),valor:()=>sword(32,34,1.25)+flame(32,46,.45),
  burnBoats:()=>boat(32,38,1,true),backWater:()=>`<path d="M6 44 H58 V54 H6Z" fill="#2a6ab8" ${O}/>`+flag(22,28,.8,'#c0342a')+flag(42,28,.8,'#c0342a')+sword(32,32,.7),
};
const fallback=(s:LearnedStrategy)=>{const k=paletteKey(s);return k==='fire'?flame(32,34):k==='wind'?swirl(32,32):k==='water'?wave(32,36):k==='thunder'?bolt(32,34):k==='earth'?rock(32,34,1.2):k==='curse'?spiral(32,32):k==='heal'?cross(32,34):drum(32,36);};

const FRAME:Record<StrategyTier,[string,string]>={1:['#8a6a3a','#d8b070'],2:['#9aa8b8','#eef4ff'],3:['#c88a10','#ffe48a']};
/** 책략 아이콘 SVG(64×64). tier가 오를수록 테두리·장식이 화려해진다. */
export function strategyIconSvg(id:string,tier:StrategyTier=1){
  const s=allStrategies.find(x=>x.id===id);const key=s?paletteKey(s):'buff',[l,m,d]=PAL[key]!;
  const motif=s?(MOTIF[id]??(()=>fallback(s)))():drum(32,36);const [fo,fi]=FRAME[tier];const uid=`${id}${tier}`;
  const rays=tier===3?`<g opacity=".38">${Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return `<path d="M32 34 L${32+Math.cos(a-.09)*44} ${34+Math.sin(a-.09)*44} L${32+Math.cos(a+.09)*44} ${34+Math.sin(a+.09)*44}Z" fill="${l}"/>`;}).join('')}</g>`:'';
  const aura=tier>=2?`<circle cx="32" cy="34" r="22" fill="none" stroke="${l}" stroke-width="${tier===3?2.4:1.6}" stroke-dasharray="${tier===3?'none':'4 3'}" opacity=".8"/>`:'';
  const stars=Array.from({length:tier},(_,i)=>{const x=32+(i-(tier-1)/2)*9;return `<path transform="translate(${x} 6.5)" d="M0 -4 L1.2 -1.2 L4 -1 L1.8 1 L2.4 4 L0 2.4 L-2.4 4 L-1.8 1 L-4 -1 L-1.2 -1.2Z" fill="${tier===3?'#ffe48a':tier===2?'#eef4ff':'#d8b070'}" stroke="#140c06" stroke-width=".8"/>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><radialGradient id="g${uid}" cx="50%" cy="58%" r="62%"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs>
<rect x="2" y="2" width="60" height="60" rx="10" fill="url(#g${uid})"/>${rays}${aura}${motif}
<rect x="2" y="2" width="60" height="60" rx="10" fill="none" stroke="${fo}" stroke-width="${tier===1?3:4}"/><rect x="${tier===1?5:6}" y="${tier===1?5:6}" width="${tier===1?54:52}" height="${tier===1?54:52}" rx="7" fill="none" stroke="${fi}" stroke-width="${tier===3?1.6:1}" opacity=".8"/>${tier>1?stars:''}</svg>`;
}
const urlCache=new Map<string,string>();
/** img src로 쓰는 data URL */
export function strategyIconUrl(id:string,tier:StrategyTier=1){const k=id+tier;let u=urlCache.get(k);if(!u){u='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(strategyIconSvg(id,tier));urlCache.set(k,u);}return u;}
