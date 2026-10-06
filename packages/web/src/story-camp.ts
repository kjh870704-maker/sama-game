/**
 * 출진 전 진영 — 조조전의 거점처럼, 이야기가 끝나면 진영에서 사람들이 제자리 근처를 서성인다.
 * 사람을 누르면 사마의가 걸어가 말을 걸고, 그 장에서만 들을 수 있는 이야기(전투의 실마리·사람들의 속마음)를 듣는다.
 * 말을 다 걸지 않아도 출진 정비로 넘어갈 수 있다. 대본은 ChapterScript.camp.
 */
import {Stage} from './story-stage.ts';
import type {Camp,CampPerson,At} from './scenario-types.ts';

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export interface CampOptions {
  camp:Camp;heading:string;
  flags():readonly string[];
  /** 이미 말을 건 사람(같은 장 안에서 진영을 다시 열어도 유지) */
  talked:Set<string>;
  onReady():void;
  onBack():void;
}

/** host 안에 진영을 그린다. */
export function openCamp(host:HTMLElement,o:CampOptions){
  const flags=o.flags(),people=o.camp.people.filter(p=>(!p.when||flags.includes(p.when))&&(!p.unless||!flags.includes(p.unless)));
  host.innerHTML=`<div class="ss-root camp-root"><div class="ss-head"><span class="eyebrow">${esc(o.heading)} · 출진 전 진영</span><span class="camp-hint">사람을 눌러 말을 걸어 보자 · <b class="camp-count"></b></span></div><div class="ss-frame"></div>
    <div class="ss-controls"><button type="button" class="camp-back">← 장 목록</button><button type="button" class="primary camp-ready">출진 정비 ▶</button></div></div>`;
  const hero:At=[50,80];
  const stage=new Stage(host.querySelector<HTMLElement>('.ss-frame')!,o.camp.art,o.camp.place,[{name:'사마의',look:'strategist',at:hero,face:'right'},...people.map(p=>({name:p.name,look:p.look,at:p.at}))]);stage.skin='paper';
  const count=host.querySelector<HTMLElement>('.camp-count')!;
  const mark=()=>{count.textContent=`이야기 ${people.filter(p=>o.talked.has(p.name)).length}/${people.length}`;for(const p of people){const a=stage.actors.get(p.name)!;a.el.classList.toggle('talked',o.talked.has(p.name));}};
  let busy=false;
  for(const p of people){
    const a=stage.actors.get(p.name)!;a.el.classList.add('clickable');a.el.setAttribute('role','button');a.el.tabIndex=0;a.el.setAttribute('aria-label',`${p.name}에게 말 걸기`);
    const go=()=>{if(!busy)void talk(p);};a.el.addEventListener('click',go);a.el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  }
  mark();
  // 사람들은 제자리 근처를 서성인다(말하는 동안에는 멈춘다).
  const homes=new Map(people.map(p=>[p.name,stage.cellOf(p.name)!] as const));
  const idle=setInterval(()=>{
    if(!document.contains(stage.el)){clearInterval(idle);return;}
    if(busy||!people.length)return;
    const p=people[Math.floor(Math.random()*people.length)]!;
    void stage.wander(p.name,homes.get(p.name)!,2);
  },1900);
  async function talk(p:CampPerson){
    if(busy)return;busy=true;host.querySelector('.ss-root')!.classList.add('talking');
    // 사마의가 상대 곁으로 한 칸씩 걸어가 마주 본다(상대가 걷던 중이면 멈출 때까지 기다린다).
    for(let i=0;i<20&&stage.actors.get(p.name)!.el.classList.contains('walking');i++)await new Promise(r=>setTimeout(r,60));
    await stage.approach('사마의',p.name);
    stage.bubble(p.name,'!','emote');
    const steps=o.talked.has(p.name)&&p.again?.length?p.again:p.talk;
    stage.skipping=false;await stage.run(steps,{flags:o.flags});
    o.talked.add(p.name);mark();busy=false;host.querySelector('.ss-root')!.classList.remove('talking');
  }
  host.querySelector<HTMLButtonElement>('.camp-ready')!.onclick=()=>{clearInterval(idle);o.onReady();};
  host.querySelector<HTMLButtonElement>('.camp-back')!.onclick=()=>{clearInterval(idle);o.onBack();};
  return ()=>clearInterval(idle);
}
