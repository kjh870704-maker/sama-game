/**
 * 오른쪽 아래 명령 단추 그림(글자 대신 한눈에 알아보는 모양).
 * 이동은 발자국, 공격은 칼, 책략은 백우선(깃털 부채), 대결은 엇갈린 두 칼, 도구는 주머니, 대기는 모래시계.
 */
const svg=(body:string)=>`<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
const OUT='stroke="#2a1a0c" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';

const foot=(x:number,y:number,r:number)=>`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 4c-4 0-6-4-5.5-9S-2-15 1-15s5 4 4.5 9S4 4 0 4z" fill="#f3ead2" ${OUT}/>`+
  [[-4.5,-18.5,1.6],[-1.5,-20,1.8],[1.8,-20,1.8],[4.6,-18.4,1.5]].map(([cx,cy,cr])=>`<circle cx="${cx}" cy="${cy}" r="${cr}" fill="#f3ead2" ${OUT}/>`).join('')+'</g>';

const blade=(flip:boolean)=>`<g ${flip?'transform="translate(48 0) scale(-1 1)"':''}>
  <path d="M36.5 7.5 L40.5 7.5 L40.5 11.5 L19 33 L15 29 Z" fill="#e8eef4" ${OUT}/>
  <path d="M38.5 9.5 L18 30.5" stroke="#9fb0c0" stroke-width="1.2"/>
  <path d="M11 27 L21 37" stroke="#d8a838" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M11 27 L21 37" stroke="#2a1a0c" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".5"/>
  <path d="M16 32 L9.5 38.5" stroke="#6a3a1a" stroke-width="4" stroke-linecap="round"/>
  <circle cx="8.3" cy="39.7" r="2.6" fill="#d8a838" ${OUT}/></g>`;

const fan=()=>{
  // 백우선: 아래가 좁고 위가 둥근 흰 깃털 부채(가운데 깃대, 양옆 깃결, 물결진 가장자리), 금빛 깃 고정쇠와 손잡이
  const edge=Array.from({length:9},(_,i)=>{const a=Math.PI*(1.08+i*.84/8),x=24+Math.cos(a)*17,y=21+Math.sin(a)*15;return [x,y] as [number,number];});
  const scallop=edge.map(([x,y],i)=>i?`Q${((x+edge[i-1]![0])/2+Math.cos(Math.PI*(1.08+(i-.5)*.84/8))*2.6).toFixed(1)} ${((y+edge[i-1]![1])/2+Math.sin(Math.PI*(1.08+(i-.5)*.84/8))*2.6).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`:'').join(' ');
  const veins=Array.from({length:7},(_,i)=>{const a=Math.PI*(1.16+i*.68/6);return `<path d="M24 33 Q${(24+Math.cos(a)*8).toFixed(1)} ${(26+Math.sin(a)*6).toFixed(1)} ${(24+Math.cos(a)*15).toFixed(1)} ${(21+Math.sin(a)*13).toFixed(1)}" stroke="#bdb39a" stroke-width="1" fill="none"/>`;}).join('');
  return `<path d="M24 34 C14 31 7 27 ${edge[0]![0].toFixed(1)} ${edge[0]![1].toFixed(1)} ${scallop} C41 27 34 31 24 34 Z" fill="#fbf7ea" ${OUT}/>`+veins+
    `<path d="M24 33 V7" stroke="#a89a78" stroke-width="1.3"/>`+
    `<path d="M18 31 Q24 28 30 31 L27.5 36 Q24 34.5 20.5 36 Z" fill="#d4a238" ${OUT}/>`+
    `<rect x="22" y="35.5" width="4" height="9" rx="1.6" fill="#7a4a22" ${OUT}/>`+
    `<path d="M24 44.5 q-3 1.5 -2.5 3.5 M24 44.5 q3 1.5 2.5 3.5" stroke="#c0342a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
};

const pouch=`<path d="M15 21 C9 31 11 43 24 43 C37 43 39 31 33 21 Z" fill="#b07a42" ${OUT}/>
  <path d="M17 26 C15 33 17 39 22 41" stroke="#d9a868" stroke-width="2" fill="none" opacity=".7"/>
  <path d="M18 21 L16 13 Q20 15 22 12 Q24 15 26 12 Q28 15 32 13 L30 21 Z" fill="#c48a4e" ${OUT}/>
  <path d="M15.5 20.5 Q24 24 32.5 20.5" stroke="#e0b048" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  <path d="M31 21 q5 3 4 9 M31 21 q2 6 -1 10" stroke="#e0b048" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="24" cy="32" r="3.2" fill="#e0b048" ${OUT}/>`;

const hourglass=`<path d="M13 7 H35 M13 41 H35" stroke="#d8a838" stroke-width="4" stroke-linecap="round"/>
  <path d="M15 9 C15 19 22 21 22 24 C22 27 15 29 15 39 H33 C33 29 26 27 26 24 C26 21 33 19 33 9 Z" fill="#dff0f4" fill-opacity=".85" ${OUT}/>
  <path d="M17.5 13 C18 18 22.5 20 24 22.5 C25.5 20 30 18 30.5 13 Z" fill="#e8c26a"/>
  <path d="M24 24 V34" stroke="#e8c26a" stroke-width="1.4"/>
  <path d="M17 39 C18 34 21 33 24 33 C27 33 30 34 31 39 Z" fill="#e8c26a"/>
  <path d="M13 7 V41 M35 7 V41" stroke="#6a3a1a" stroke-width="2"/>`;

const boot=`<path d="M4 18 H11 M2 25 H10 M5 32 H11" stroke="#f3ead2" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
  <path d="M17 6 H31 V27 Q31 29.5 33.5 30.5 L41 33.5 Q44.5 35 43.5 38.5 L43 40 H15 Q13 40 13 37.5 L15 27 Z" fill="#3a2a22" ${OUT}/>
  <path d="M17 6 H31 V11 H17 Z" fill="#efe6cc" ${OUT}/>
  <path d="M15 27 L31 27" stroke="#8a6a4a" stroke-width="1.4"/>
  <path d="M13 40 H43.5 V43 H13 Z" fill="#d8b878" ${OUT}/>
  <path d="M20 14 V24" stroke="#5a4636" stroke-width="1.6"/>`;

export const DOCK_ICONS:Record<string,string>={
  move:svg(boot),
  attack:svg(blade(false)),
  strat:svg(fan()),
  special:svg(blade(false)+blade(true)),
  tools:svg(pouch),
  wait:svg(hourglass),
};
