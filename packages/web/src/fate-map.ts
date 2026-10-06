/**
 * 갈림길 지도 — 연의(천명의 길)에서 가상 시나리오로 어디서, 어떻게 들어가는지 한 화면에.
 *
 * 세 갈림길: ① 201년 조조의 출사 요청(상편 4장 뒤) ② 220년 조조의 죽음(중편 첫머리) ③ 234년 이후(하편 첫머리).
 * 갈림길마다 정사 한 길과 가상 두세 길. 정사를 고르면 연의 장이 이어지고, 가상을 고르면
 * 가상 전장 3장 → 우두머리 1장 → 다음 갈림길(또는 결말)로 간다. 한 번 가상으로 가면 정사로 돌아오지 않는다.
 */
import {ROUTES,FATE_POINTS,fatePoint,factionText,ALL_ENDINGS,type Route} from './fate.ts';
import {STORY_ORDER} from './roguelike.ts';
import {loadMeta} from './meta.ts';
import {loadScenario,routeTales,type ScenarioState} from './scenario.ts';
import {chapters} from './session.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const title=(id:string)=>chapters.find(c=>c.stage.id===id)?.stage.subtitle??id;
const ACT=['상편 · 살아남는 자','중편 · 맞서는 자','하편 · 거머쥐는 자'];

/** 갈림길 하나의 설명: 어디 뒤에 오는지, 고를 수 있는 길과 각 길의 진행. */
function fateBlock(act:1|2|3,state:ScenarioState,custom:boolean){
  const chosen=state.route[act],parent=act>1?state.route[(act-1) as 1|2]:undefined;
  const ft=(t:string)=>factionText(t,state.run?.faction?.name);
  const point=fatePoint(act,state.route);
  // 이 갈림길에 나올 수 있는 모든 길(앞 선택이 아직 없으면 정사 쪽 앞 선택을 기준으로 보여 주고, 다른 앞 선택의 길도 적는다)
  const routes=ROUTES.filter(r=>r.act===act&&(custom||!r.custom));
  const visible=routes.filter(r=>act===1||(parent?r.after?.includes(parent):true));
  const before=act===1?`연의 ${STORY_ORDER[1].slice(0,4).map(title).join(' → ')} 네 장을 마친 뒤`:act===2?'상편의 마지막 장(정사면 연의 11장, 가상이면 우두머리 전투)을 마친 뒤':'중편의 마지막 장을 마친 뒤';
  const done=state.done.includes(act===1?'fate:1':`fate:${act}:${parent??''}`);
  const row=(r:Route)=>{const tales=routeTales(r,state);const mine=chosen===r.id;
    const how=r.history?`연의 장이 이어진다 · ${act===1?STORY_ORDER[1].length-4:STORY_ORDER[act].length}장`:`가상 전장 ${tales.length}장 → 우두머리 「${esc(r.region.boss.name)}」 → ${act<3?'다음 갈림길':'결말'}`;
    const where=`${esc(r.region.name)}${r.after?.length&&act>1?` · 앞 선택 ${r.after.map(a=>esc(ft(ROUTES.find(x=>x.id===a)?.choice??a))).join('/')} 뒤`:''}`;
    return `<li class="fm-route ${r.custom?'custom':r.history?'history':'what-if'} ${mine?'mine':''}"><span class="route-tag">${r.custom?'신세력':r.history?'정사':'가상'}</span><b>${esc(ft(r.choice))}</b>${mine?'<em>← 이번 회차의 선택</em>':''}<small>${esc(ft(r.detail))}</small><small class="fm-how">${how} · ${where}${r.ending?` · 결말 「${esc(ft(r.ending.title))}」`:''}</small>
      ${!r.history&&tales.length?`<ol class="fm-tales">${tales.map(t=>`<li>${esc(t.title)} <i>vs ${esc(t.target.name)}</i></li>`).join('')}<li>우두머리 · ${esc(r.region.boss.name)}</li></ol>`:''}</li>`;};
  // 앞 선택이 정해졌으면 그 길만, 아니면 앞 선택별로 묶어 보여 준다(어느 길이 어느 길로 이어지는지).
  const groups:Array<[string,Route[]]>=act===1||parent?[['',visible]]:[...new Set(routes.map(r=>r.after?.[0]??''))].map(a=>[a,routes.filter(r=>(r.after?.[0]??'')===a)]);
  const label=(a:string)=>{const pr=ROUTES.find(x=>x.id===a);return pr?`앞 갈림길에서 「${esc(ft(pr.choice))}」(${pr.history?'정사':pr.custom?'신세력':'가상'})을 골랐을 때`:'';};
  return `<section class="fm-fate ${done?'done':''}"><h3><span class="fm-no">${act}</span>${esc(point.year)} · ${esc(point.title)}<small>${ACT[act-1]}</small></h3>
    <p class="fm-when">언제 · ${before}. ${done?'이번 회차에서는 이미 골랐다.':parent||act===1?'이 갈림길에 닿으면 아래 길 가운데 하나를 고른다.':'앞 갈림길의 선택에 따라 여기서 고를 수 있는 길이 달라진다.'}</p>
    ${groups.map(([a,rs])=>`${a?`<h4 class="fm-group">${label(a)}</h4>`:''}<ul class="fm-routes">${rs.map(row).join('')}</ul>`).join('')}</section>`;
}
/** 갈림길 지도 화면 본문 */
export function fateMap(){
  const state=loadScenario(),meta=loadMeta(),custom=!!state.run?.faction;
  const chosen=[1,2,3].map(a=>state.route[a as 1|2|3]).filter(Boolean).map(id=>ROUTES.find(r=>r.id===id)!);
  const now=chosen.length?chosen.map(r=>`${r.history?'정사':r.custom?'신세력':'가상'} ${esc(factionText(r.name,state.run?.faction?.name))}`).join(' → '):'아직 첫 갈림길 전';
  return `<div class="fate-map">
  <p class="fm-lead">천명의 길은 『삼국지연의』의 사마의 이야기(연의 32장)를 따라가다 <b>세 번</b> 갈림길을 만난다. 갈림길마다 <span class="route-tag history">정사</span> 한 길과 <span class="route-tag what-if">가상</span> 두세 길이 있다. 정사를 고르면 연의 장이 이어지고, 가상을 고르면 그 편이 <b>가상 전장 3장 + 우두머리 1장</b>으로 바뀐다. 한 번 가상으로 들어서면 정사로 돌아오지 않고, 하편의 길마다 결말이 다르다(결말 ${ALL_ENDINGS.length}종 · 본 것 ${meta.endings.length}).</p>
  <div class="fm-track"><span>이번 회차 · ${now}</span><span>장과 장 사이 행군로(전투·정예·모병·의원·보물고·수련)는 정사·가상 모두 같다</span></div>
  ${([1,2,3] as const).map(a=>fateBlock(a,state,custom)).join('')}
  <section class="fm-fate"><h3><span class="fm-no">?</span>가상 시나리오는 이렇게 진행된다</h3><ul class="fm-rules">
    <li><b>장수</b> · 가상으로 들어서면 사마랑·조진·장합·곽회가 따라온다(원소 쪽 길에는 조진이 없다). 가상 전장에서 꺾은 이름난 적장은 본래 사마의의 동료라면 귀순하고, 그 밖의 적장은 <b>설득</b>해서 들일 수 있다. 설득은 가상 시나리오에서만 한다.</li>
    <li><b>전투</b> · 가상 전장은 그 길의 지역(평원·산악·물가)과 적 구성으로 열리고, 전장마다 쓰러뜨릴 적장이 정해져 있다. 출진 전 정비에서 함께 싸울 장수(최대 6)와 장비를 고른다.</li>
    <li><b>난이도</b> · 가상 전장의 적 레벨은 편에 따라 상편 2~6, 중편 8~12, 하편 14~18이다. 연의 장과 같은 천명의 시련 배율이 붙고, 연구로 낮춘다.</li>
    <li><b>신세력</b> · 신세력으로 회차를 시작했을 때만 첫 갈림길에 '스스로 기치를 든다'가 나온다. 이 길은 형주·관중을 거쳐 천하 통일 또는 네 번째 나라의 결말로 간다.</li>
    <li><b>다른 길을 보려면</b> · 회차가 끝난 뒤 새 회차를 시작해 갈림길에서 다른 길을 고른다. 결말을 볼 때마다 천명을 얻고, 본 결말은 본영의 '본 결말'에 쌓인다.</li></ul></section></div>`;
}
export {FATE_POINTS};
