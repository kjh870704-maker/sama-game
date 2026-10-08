import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {NPC_ROSTER} from '../src/npc-roster.ts';
import {evolutionChart} from '../src/troop-evolution.ts';

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
  it('진화표에 장수·NPC 줄과 단일 병종이 나온다', ()=>{
    const all=evolutionChart('all');
    expect(all).toContain('evo-people');
    expect(all).toContain('사마의');
    expect(all).toContain('동문 피난민');
    expect(all).toContain('단일 병종');
    const single=evolutionChart('single');
    expect(single).toContain('군량 수송대');
    expect(single).not.toContain('계통 <small>');
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
    const horse=evolutionChart('horse');
    expect(horse).toMatch(/군주 계통[\s\S]*조조/);
  });
});
