/**
 * 얼굴 고르기 — 장수의 초상을 한곳에서 정한다.
 *
 * 우선순위: 직접 넣은 그림(portrait-images.ts) → 전용 원화(officer-art.ts) → 신장수 초상 → 초상 생성기로 지은 얼굴.
 * 카드(인물열전·목록)는 족자 같은 네모 초상, 대화창은 바탕 없이 사람만 떼어 낸 큰 흉상을 쓴다
 * (조조전 리메이크 대화창처럼 흉상이 대사 상자 위로 걸친다).
 * 이름 옆의 자도 여기서 붙인다 — 「유비 현덕」, 「조조 맹덕」.
 */
import {officerLook,officerPortrait} from './officer-art.ts';
import {portraitImage} from './portrait-images.ts';
import {suggestPortrait,portraitURL,type PortraitSpec} from './portrait.ts';
import {romanceByName,temperOf} from './romance.ts';
import {customNames,customList,portraitOf} from './custom.ts';
import {CHUHAN_FACES} from './chuhan.ts';
import {officerClass} from './officer-perks.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export {COURTESY,displayName} from './courtesy.ts';

const WOMEN=new Set(['축융','우희']);
/** 이름난 장수(연의 장수록)의 초상 값: 이름·병종·성격으로 짓고, 전승의 모습이 있으면 덮는다. */
export function specFor(name:string):PortraitSpec|undefined{
  const c=customList().find(o=>o.name===name);if(c)return portraitOf(c);
  if(!romanceByName(name))return undefined;
  const s={...suggestPortrait(name,officerClass(name),temperOf(name)??'calm'),...CHUHAN_FACES[name]};if(WOMEN.has(name)){s.hat=5;s.beard=0;}return s;
}
/** 카드 초상(네모, 족자 바탕·제첨·낙관). */
export function cardFace(name:string){
  if(portraitImage(name)||officerLook(name)||customNames().includes(name))return officerPortrait(name);
  const spec=specFor(name),url=spec?portraitURL(spec,name):'';
  return url?`<div class="officer-face custom-face" role="img" aria-label="${esc(name)} 초상" style="background-image:url(${url});background-size:cover;background-position:center"></div>`:officerPortrait(name);
}
/**
 * 대화창 흉상. 넣은 그림·원화는 아래쪽을 흐리게 지워 상자에 녹이고, 지은 초상은 바탕 없는 흉상으로 그린다.
 * 알려지지 않은 인물(척후·병사)은 undefined — 부르는 쪽이 무대 그림으로 대신한다.
 */
export function bustFace(name:string):string|undefined{
  const img=portraitImage(name);
  if(img)return `<div class="talk-bust image" role="img" aria-label="${esc(name)} 초상" style="background-image:url('${img}')"></div>`;
  if(officerLook(name))return `<div class="talk-bust painted">${officerPortrait(name)}</div>`;
  const spec=specFor(name);if(!spec)return undefined;
  const url=portraitURL(spec,undefined,{bare:true});
  return url?`<div class="talk-bust drawn" role="img" aria-label="${esc(name)} 초상" style="background-image:url(${url})"></div>`:undefined;
}
