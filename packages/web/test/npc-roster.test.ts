import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {NPC_ROSTER} from '../src/npc-roster.ts';
import {evolutionChart,npcList} from '../src/troop-evolution.ts';
import {officerManifest} from '../src/officer-models.ts';
import {OFFICER_FACTION} from '../src/officer-factions.ts';

/** 스테이지 데이터의 allyAi·ally 이름 있는 유닛을 모은다. */
function fromStages(){
  const dir=path.resolve(__dirname,'../../data/stages'),out=new Map<string,{name:string;unitClass:string;side:string;stages:Set<string>}>();
  const walk=(o:unknown,stage:string,side?:string):void=>{
    if(Array.isArray(o)){o.forEach(x=>walk(x,stage,side));return;}
    if(!o||typeof o!=='object')return;
    const r=o as Record<string,unknown>,s=(r.side as string|undefined)??side;
    if((s==='allyAi'||s==='ally')&&typeof r.name==='string'&&typeof r.template==='string'){
      const k=r.name+'|'+r.template,v=out.get(k)??{name:r.name,unitClass:r.template,side:s,stages:new Set<string>()};v.stages.add(stage);out.set(k,v);
    }
    for(const k in r)walk(r[k],stage,s);
  };
  for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort())walk(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')),f.replace('.json',''));
  return [...out.values()].map(v=>({name:v.name,unitClass:v.unitClass,side:v.side,stages:[...v.stages]}));
}

describe('NPC 목록', ()=>{
  it('본편 스테이지의 NPC·우군과 같다', ()=>{
    const key=(x:{name:string;unitClass:string;side:string;stages:string[]})=>`${x.name}|${x.unitClass}|${x.side}|${x.stages.join(',')}`;
    expect(NPC_ROSTER.map(key).sort()).toEqual(fromStages().map(key).sort());
  });
  it('진화표는 병종·장수·NPC를 각자 탭에서만 보여 준다', ()=>{
    const all=evolutionChart('all'),foot=evolutionChart('foot');
    for(const html of [all,foot,evolutionChart('single')]){expect(html).not.toContain('사마의');expect(html).not.toContain('동문 피난민');expect(html).not.toContain('evo-people');}
    expect(all).toContain('단일 병종');
    expect(evolutionChart('single')).not.toContain('계통 <small>');
    const officer=evolutionChart('officer');
    for(const f of ['위','촉','오','군웅'])expect(officer).toContain(`<h3>${f} <small>`);
    for(const n of ['사마의','유비','손권','여포'])expect(officer).toContain(`<h4>${n}</h4>`);
    expect(officer).not.toContain('동문 피난민');
    const npc=evolutionChart('npc');
    for(const n of ['꿈속의 황제','동문 피난민','북문 피난민','군량 수송대','조조'])expect(npc).toContain(`<h4>${n}</h4>`);
    expect(npc).not.toContain('우군');
    expect(npc).not.toContain('<h4>사마사</h4>');
    expect(npc.match(/evo-person-card/g)?.length).toBe(npcList().length);
    // 한 사람은 카드 한 장: 같은 이름이 두 번 나오지 않고, 장수 이름을 단 부대는 그 장수 카드의 휘하로 들어간다.
    const names=[...npc.matchAll(/<h4>([^<]+)<\/h4>/g)].map(m=>m[1]);
    expect(new Set(names).size).toBe(names.length);
    for(const n of ['곽회 창병','조휴 궁수','조상 친위'])expect(names).not.toContain(n);
    expect(npc).toMatch(/<h4>곽회<\/h4>[\s\S]*?휘하 창병 부대/);
  });
  it('장수는 모두 위·촉·오·군웅 중 하나에 속한다', ()=>{
    for(const e of officerManifest)expect(OFFICER_FACTION[e.id],e.id).toBeDefined();
  });
  it('진화표 그림은 모두 같은 상자에 맞춰 다시 그린다', ()=>{
    for(const g of ['all','officer','npc'] as const){
      const html=evolutionChart(g),cards=html.match(/<article class="evo-card/g)?.length??0,fits=html.match(/class="evo-fit"/g)?.length??0,officers=html.match(/background-image:url\(officers\//g)?.length??0;
      expect(fits+officers).toBe(cards);
    }
  });
});

describe('군주', ()=>{
  it('조조·조비·조예·유비·손권·공손연·원담·원상·유방은 군주 계통에 선다', async ()=>{
    const {officerClass}=await import('../src/officer-perks.ts');
    for(const n of ['조조','조비','조예','유비','손권','공손연','원담','원상','유방'])expect(officerClass(n)).toBe('lord');
    const {ROUTES}=await import('../src/fate.ts');
    const bosses=ROUTES.map(r=>r.region.boss).filter(b=>['조조','조비','조예','유비','손권','공손연','원담','원상'].includes(b.name));
    expect(bosses.length).toBeGreaterThan(0);
    for(const b of bosses)expect(b.unitClass).toBe('lord');
    const officer=evolutionChart('officer');
    expect(officer).toMatch(/<h4>조조<\/h4><\/div><\/div><div class="evo-range">[\s\S]*?<b>군주 ·/);
  });
});
