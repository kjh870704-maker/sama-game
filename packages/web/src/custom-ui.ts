/**
 * 신장수 만들기 · 신세력 세우기 화면.
 * - 신장수: 이름·별호·병종·성격·능력치(합계 350 안에서 배분). 천명 기록에 영구 저장되고 장수록에 오른다.
 * - 신세력: 새 회차를 시작할 때 '정통(연의대로)'과 '신세력' 가운데 고른다. 신세력은 이름·문장·깃발 색,
 *   처음부터 함께할 신장수(최대 넷)를 정하고, 첫 갈림길에서 스스로 기치를 드는 길이 열린다.
 */
import {loadMeta,saveMeta} from './meta.ts';
import {portraitOf,checkCustom,checkFaction,registerCustoms,statTotal,STAT_KEYS,STAT_NAMES,STAT_MIN,STAT_MAX,STAT_BUDGET,CUSTOM_LIMIT,CUSTOM_CLASSES,TEMPERS,FACTION_COLORS,type CustomOfficer,type Faction} from './custom.ts';
import {temperNames} from './duel.ts';
import {showFateMap} from './run-ui.ts';
import {classNames} from './troops.ts';
import {spriteStyle} from './story-stage.ts';
import type {Look} from './scenario-types.ts';
import {setPortraitImage,portraitImage,removePortraitImage,isUploaded,PRESET_PORTRAITS,presetPortraitURL,type PresetPortrait} from './portrait-images.ts';
import {PORTRAIT_PARTS,PORTRAIT_KEYS,portraitURL,suggestPortrait,type PortraitSpec} from './portrait.ts';
const PART_NAMES:Record<string,string>={face:'얼굴형',skin:'피부',eyes:'눈매',brows:'눈썹',mouth:'입',beard:'수염',hair:'머리색',hat:'머리·관모',robe:'옷 색',armor:'갑옷',item:'소품',bg:'배경',age:'나이',mark:'흉터'};

export interface CustomHost {modal(html:string,closable?:boolean):void;toast(text:string):void}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const LOOK:Record<string,Look>={infantry:'infantry',spearman:'spear',archer:'archer',cavalry:'cavalry',heavyCav:'heavy',crossbow:'crossbow',strategist:'strategist',horseArcher:'horseArcher',bandit:'bandit',monk:'monk',taoist:'taoist',fengshui:'sage',slinger:'archer',assassin:'assassin'};
const TEMPER_HINT:Record<string,string>={reckless:'싸움을 마다하지 않는다',brave:'명분과 용기를 따른다',proud:'존중받기를 바란다',calm:'판을 읽고 움직인다',cautious:'손익을 따진다',wise:'형세를 꿰뚫는다',timid:'힘 있는 쪽에 기댄다'};

export function customs(){return loadMeta().customOfficers??[];}
function saveCustoms(list:CustomOfficer[]){const m=loadMeta();m.customOfficers=list;saveMeta(m);registerCustoms(list);}

/** 신장수 목록과 만들기·고치기·지우기. */
export function showCustomEditor(host:CustomHost,back:()=>void,editing?:number,draft?:CustomOfficer){
  const list=customs(),cur:CustomOfficer=draft??(editing!==undefined&&list[editing]?{...list[editing]!}:{name:'',epithet:'',unitClass:'cavalry',temper:'brave',war:70,int:70,lead:70,pol:70,cha:70});
  const face:PortraitSpec={...portraitOf({...cur,name:cur.name||'신장수'})};
  const cards=list.map((o,i)=>`<button class="prep-officer ${i===editing?'focus':''}" data-edit="${i}"><span class="prep-sprite cu-thumb" style="background-image:url(${portraitImage(o.name)??portraitURL(portraitOf(o),o.name)})"></span><span><strong>${esc(o.name)}</strong><small>${esc(classNames[o.unitClass]??o.unitClass)} · ${temperNames[o.temper]} · 합 ${statTotal(o)}</small></span></button>`).join('');
  host.modal(`<div class="briefing run-screen custom-screen"><div class="eyebrow">신장수 · 연의 장수록에 오른다</div><h2>신장수 만들기 <small class="muted">${list.length}/${CUSTOM_LIMIT}</small></h2>
  <div class="custom-body"><div class="prep-list">${cards||'<p class="muted">아직 만든 신장수가 없다.</p>'}<button id="cu-new">+ 새 신장수</button></div>
  <form class="custom-form" id="cu-form">
    <div class="cu-portrait"><div class="cu-face"><img id="cu-face" alt="초상 미리보기" src="${(cur.name&&portraitImage(cur.name))||(cur.art&&presetPortraitURL(cur.art))||portraitURL(face,cur.name||undefined)}"><button type="button" id="cu-rand">🎲 무작위 초상</button>
      <div class="cu-presets" role="group" aria-label="기본 초상">${PRESET_PORTRAITS.map(p=>`<button type="button" class="cu-preset ${cur.art===p.id?'on':''}" data-art="${p.id}" title="${p.label}" aria-label="기본 초상: ${p.label}"><img src="${presetPortraitURL(p.id)}" alt=""></button>`).join('')}</div><label class="cx-upload cu-upload">🖼 그림 파일로 초상 넣기<input type="file" accept="image/*" id="cu-img" hidden></label></div>
      <div class="cu-parts">${PORTRAIT_KEYS.map(k=>`<label>${PART_NAMES[k]} <select data-part="${k}">${PORTRAIT_PARTS[k].map((t,i)=>`<option value="${i}" ${face[k]===i?'selected':''}>${t}</option>`).join('')}</select></label>`).join('')}</div></div>
    <label>이름 <input name="name" maxlength="4" value="${esc(cur.name)}" placeholder="한글 1~4자" required></label>
    <label>별호 <input name="epithet" maxlength="24" value="${esc(cur.epithet)}" placeholder="예: 하내의 젊은 창"></label>
    <label>병종 <select name="unitClass">${CUSTOM_CLASSES.map(c=>`<option value="${c}" ${c===cur.unitClass?'selected':''}>${esc(classNames[c]??c)}</option>`).join('')}</select></label>
    <label>성격 <select name="temper">${TEMPERS.map(t=>`<option value="${t}" ${t===cur.temper?'selected':''}>${temperNames[t]} — ${TEMPER_HINT[t]}</option>`).join('')}</select></label>
    <div class="cu-stats">${STAT_KEYS.map(k=>`<label>${STAT_NAMES[k]} <input type="range" name="${k}" min="${STAT_MIN}" max="${STAT_MAX}" value="${cur[k]}"><b data-v="${k}">${cur[k]}</b></label>`).join('')}</div>
    <p class="cu-total">능력치 합계 <b id="cu-sum">${statTotal(cur)}</b> / ${STAT_BUDGET}</p><p class="cu-error" id="cu-err"></p>
    <div class="run-actions"><button class="primary" type="submit">${editing!==undefined?'고쳐 저장':'만든다'}</button>${editing!==undefined?'<button type="button" id="cu-del" class="danger">지운다</button>':''}<button type="button" id="cu-back">← 돌아가기</button></div>
  </form></div></div>`,false);
  const form=document.getElementById('cu-form') as HTMLFormElement,err=document.getElementById('cu-err')!;
  const readFace=():PortraitSpec=>Object.fromEntries(PORTRAIT_KEYS.map(k=>[k,Number(form.querySelector<HTMLSelectElement>(`[data-part="${k}"]`)!.value)])) as PortraitSpec;
  const read=():CustomOfficer=>{const f=new FormData(form);return {name:String(f.get('name')??'').trim(),epithet:String(f.get('epithet')??'').trim(),unitClass:String(f.get('unitClass')) as CustomOfficer['unitClass'],temper:String(f.get('temper')) as CustomOfficer['temper'],
    war:Number(f.get('war')),int:Number(f.get('int')),lead:Number(f.get('lead')),pol:Number(f.get('pol')),cha:Number(f.get('cha')),portrait:readFace(),...(art?{art}:{})};};
  const faceImg=document.getElementById('cu-face') as HTMLImageElement;
  // 기본 초상을 고르면 그린 초상 대신 그 그림을 쓴다. 얼굴 부위를 바꾸거나 무작위를 누르면 그린 초상으로 돌아간다.
  let art:PresetPortrait|undefined=cur.art;
  const markArt=()=>document.querySelectorAll<HTMLButtonElement>('[data-art]').forEach(b=>b.classList.toggle('on',b.dataset.art===art));
  document.querySelectorAll<HTMLButtonElement>('[data-art]').forEach(b=>b.onclick=()=>{art=b.dataset.art as PresetPortrait;markArt();faceImg.src=presetPortraitURL(art);
    const n=read().name;if(n&&isUploaded(n))void removePortraitImage(n);});
  form.querySelectorAll<HTMLSelectElement>('[data-part]').forEach(x=>x.addEventListener('change',()=>{art=undefined;markArt();faceImg.src=portraitURL(readFace());}));
  document.getElementById('cu-img')!.addEventListener('change',e=>{const f=(e.target as HTMLInputElement).files?.[0],o=read();if(!f)return;if(!o.name.trim()){host.toast('먼저 이름을 적어 주세요. 그림은 이름에 붙습니다.');return;}
    void setPortraitImage(o.name.trim(),f).then(url=>{art=undefined;markArt();faceImg.src=url;host.toast(`${o.name}의 초상으로 그림을 넣었다.`);},()=>host.toast('그림을 읽지 못했다.'));});
  let salt=0;document.getElementById('cu-rand')!.onclick=()=>{const o=read(),r=suggestPortrait(o.name||'신장수',o.unitClass,o.temper,++salt);for(const k of PORTRAIT_KEYS)form.querySelector<HTMLSelectElement>(`[data-part="${k}"]`)!.value=String(r[k]);art=undefined;markArt();faceImg.src=portraitURL(r);};
  form.addEventListener('input',()=>{const o=read();for(const k of STAT_KEYS)document.querySelector(`[data-v="${k}"]`)!.textContent=String(o[k]);const sum=statTotal(o),el=document.getElementById('cu-sum')!;el.textContent=String(sum);el.classList.toggle('over',sum>STAT_BUDGET);});
  form.addEventListener('submit',e=>{e.preventDefault();const o=read(),others=list.filter((_,i)=>i!==editing).map(x=>x.name);
    if(editing===undefined&&list.length>=CUSTOM_LIMIT){err.textContent=`신장수는 ${CUSTOM_LIMIT}명까지`;return;}
    // 다시 저장할 때 자기 이름이 장수록에 있는 것은 괜찮다: 잠시 내려 두고 검사한다.
    registerCustoms(list.filter((_,i)=>i!==editing));const bad=checkCustom(o,others);registerCustoms(list);
    if(bad){err.textContent=bad;return;}
    const next=[...list];if(editing!==undefined)next[editing]=o;else next.push(o);saveCustoms(next);host.toast(`신장수 ${o.name}을(를) ${editing!==undefined?'고쳤다':'만들었다'}.`);showCustomEditor(host,back);});
  document.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b=>b.onclick=()=>showCustomEditor(host,back,Number(b.dataset.edit)));
  document.getElementById('cu-new')!.onclick=()=>showCustomEditor(host,back);
  document.getElementById('cu-back')!.onclick=back;
  document.getElementById('cu-del')?.addEventListener('click',e=>{const b=e.currentTarget as HTMLButtonElement;if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='정말 지운다';return;}saveCustoms(list.filter((_,i)=>i!==editing));showCustomEditor(host,back);});
}

/** 새 회차의 세력 고르기: 정통(연의대로) 또는 신세력(이름·문장·색·함께할 신장수). */
export function pickFaction(host:CustomHost,onPick:(faction?:Faction,companions?:CustomOfficer[])=>void,onCancel:()=>void,draft?:{faction:Faction;picked:string[]}){
  const list=customs(),f=draft?.faction??{name:'',emblem:'',color:FACTION_COLORS[0]!},picked=new Set(draft?.picked??list.slice(0,4).map(o=>o.name));
  host.modal(`<div class="briefing run-screen faction-screen"><div class="eyebrow">새 회차 · 어느 깃발 아래서 시작하는가</div><h2>세력 고르기</h2>
  <div class="run-choices"><button id="fa-history" class="history"><strong><span class="route-tag">정통</span>연의대로 — 위의 신하로</strong><small>사마랑·조진과 함께 연의의 길을 따른다. 상편 4장 뒤(201년)·중편 첫머리(220년)·하편 첫머리(234년) 세 갈림길에서 정사·가상을 고를 수 있다.</small></button></div>
  <p class="muted">어느 장에서 가상으로 갈라지고 그 뒤가 어떻게 이어지는지는 <button type="button" id="fa-map" class="link">갈림길 지도</button>에서 미리 볼 수 있다.</p>
  <form id="fa-form" class="custom-form faction-form"><h3>신세력 — 사마의가 새 깃발을 든다</h3>
    <p class="muted">첫 갈림길(201년)에서 '스스로 기치를 든다'를 고르면 신세력의 길(형주·관중 → 천하 통일 또는 네 번째 나라)로 간다. 가상 시나리오라 장수는 설득해서 들인다.</p>
    <label>세력 이름 <input name="name" maxlength="4" value="${esc(f.name)}" placeholder="예: 진, 하내" required></label>
    <label>문장(한 글자) <input name="emblem" maxlength="2" value="${esc(f.emblem)}" placeholder="예: 진"></label>
    <div class="fa-colors">${FACTION_COLORS.map(c=>`<label class="fa-color" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c===f.color?'checked':''}><span></span></label>`).join('')}</div>
    <fieldset><legend>처음부터 함께할 신장수(최대 넷) · 사마랑은 늘 함께</legend>${list.length?list.map(o=>`<label><input type="checkbox" name="mate" value="${esc(o.name)}" ${picked.has(o.name)?'checked':''}> ${esc(o.name)} · ${esc(classNames[o.unitClass]??o.unitClass)} · ${temperNames[o.temper]}</label>`).join(''):'<p class="muted">만든 신장수가 없다. 먼저 신장수를 만들면 함께 떠날 수 있다.</p>'}
      <button type="button" id="fa-custom">신장수 만들기 ▶</button></fieldset>
    <p class="cu-error" id="fa-err"></p>
    <div class="run-actions"><button class="primary" type="submit">신세력으로 시작 ▶</button><button type="button" id="fa-cancel">← 돌아가기</button></div></form></div>`,false);
  const form=document.getElementById('fa-form') as HTMLFormElement,err=document.getElementById('fa-err')!;
  const read=()=>{const d=new FormData(form),name=String(d.get('name')??'').trim(),emblem=[...String(d.get('emblem')??'').trim()][0]??[...name][0]??'';
    return {faction:{name,emblem,color:String(d.get('color')??FACTION_COLORS[0])} as Faction,picked:d.getAll('mate').map(String)};};
  document.getElementById('fa-history')!.onclick=()=>onPick();
  document.getElementById('fa-map')!.onclick=()=>showFateMap(host,()=>pickFaction(host,onPick,onCancel,read()));
  document.getElementById('fa-cancel')!.onclick=onCancel;
  document.getElementById('fa-custom')!.onclick=()=>{const d=read();showCustomEditor(host,()=>pickFaction(host,onPick,onCancel,d));};
  form.addEventListener('submit',e=>{e.preventDefault();const d=read(),bad=checkFaction(d.faction);if(bad){err.textContent=bad;return;}
    if(d.picked.length>4){err.textContent='함께할 신장수는 넷까지';return;}
    onPick(d.faction,list.filter(o=>d.picked.includes(o.name)));});
}
