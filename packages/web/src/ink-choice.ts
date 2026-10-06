/**
 * 선택 분기 — 먹 붓을 크게 휘두른 검은 바탕 위에, 왼쪽에 고민하는 사람의 흉상,
 * 위에 양피지 말풍선(물음), 그 아래 어두운 띠 모양의 선택지들. 필요하면 맨 위에 저울 게이지(예: 신뢰)를 단다.
 */
import {bustFace,displayName} from './faces.ts';
import {officerPortrait} from './officer-art.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export interface InkOption {text:string;note?:string;id?:string}
/** 맨 위 저울 게이지: 왼쪽(붉음)·오른쪽(푸름) 비율 0~1. */
export interface InkGauge {label:string;value:number}
export function inkChoice(speaker:string,question:string,options:readonly InkOption[],o:{gauge?:InkGauge;attr?:string;extra?:string;asker?:string}={}){
  const face=bustFace(speaker)??`<div class="talk-bust sprite">${officerPortrait(speaker)}</div>`;
  const gauge=o.gauge?`<div class="ink-gauge"><span class="ink-gauge-label">${esc(o.gauge.label)}</span><i class="bird l">◆</i><div class="ink-gauge-bar"><b style="width:${(Math.max(0,Math.min(1,o.gauge.value))*100).toFixed(1)}%"></b></div><i class="bird r">◆</i></div>`:'';
  return `${gauge}<div class="ink-choice" role="group" aria-label="${esc(displayName(speaker))}의 선택">
    <div class="ink-blot" aria-hidden="true"></div>
    <div class="ink-face">${face}</div>
    <div class="ink-main">
      <div class="ink-bubble"><b>${esc(displayName(o.asker??speaker))}</b><p>${esc(question)}</p></div>
      <div class="ink-options">${options.map((op,k)=>`<button type="button" class="ink-option" data-k="${k}" ${o.attr?`${o.attr}="${esc(op.id??String(k))}"`:''}><span class="ink-no">${k+1}</span><strong>${esc(op.text)}</strong>${op.note?`<small>${esc(op.note)}</small>`:''}</button>`).join('')}</div>
      ${o.extra??''}
    </div></div>`;
}
