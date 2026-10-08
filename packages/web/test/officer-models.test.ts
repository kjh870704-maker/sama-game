import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {officerBattleSheet,officerDuelModel,officerDuelModelStyle,officerEntry,officerManifest,officerModelSheets} from '../src/officer-models.ts';

const lordIds=['cao_cao','cao_pi','cao_rui','liu_bei','sun_quan','gongsun_yuan','yuan_tan','yuan_shang','liu_bang'] as const;
function webpSize(file:URL){
  const b=readFileSync(file),vp8x=b.indexOf(Buffer.from('VP8X'));
  expect(vp8x).toBeGreaterThanOrEqual(0);
  const n=(i:number)=>b[i]!|(b[i+1]!<<8)|(b[i+2]!<<16);
  return [n(vp8x+12)+1,n(vp8x+15)+1] as const;
}

describe('장수별 전투 SD와 대결 모델',()=>{
  const players=[['sima_yi','사마의'],['cao_zhen','조진'],['sima_lang','사마랑'],['sima_fang','사마방'],['sima_shi','사마사'],['sima_zhao','사마소']] as const;

  it('대상 43명과 모든 공개 시트를 색인한다',()=>{
    expect(officerManifest).toHaveLength(43);
    const sheets=new Set(officerModelSheets.map(s=>s.id));
    for(const entry of officerManifest)for(const battle of Object.values(entry.battle))expect(sheets.has(battle.sheet),battle.sheet).toBe(true);
  });

  it('플레이어 장수 6명은 전투 SD 4줄이며 정확한 셀 규격을 쓴다',()=>{
    for(const [id,name] of players){
      const model=officerBattleSheet({id,name})!;
      expect(model.action.rows,id).toBe(4);
      expect(model.action.cell?.[0],id).toBe(id==='cao_zhen'||id==='sima_zhao'?350:280);
      expect(model.action.cell?.[1],id).toBe(id==='cao_zhen'||id==='sima_zhao'?280:224);
      expect(model.action.sheet,id).toMatch(/^officers\//);
    }
  });

  it('진화 병종은 원래 계통 시트에서 해당 단계 줄을 고른다',()=>{
    const strategist=officerBattleSheet({id:'sima_yi',name:'사마의',unitClass:'mastermind'})!;
    expect(strategist.action.sheet).toContain('battle-strategist');
    expect(strategist.action.row).toBe(2);
    const infantry=officerBattleSheet({id:'sima_lang',name:'사마랑',unitClass:'ironInfantry'})!;
    expect(infantry.action.sheet).toContain('battle-infantry');
    expect(infantry.action.row).toBe(3);
  });

  it('군주 9명은 군주 전 계통에서 전용 기마 시트를 찾는다',()=>{
    for(const id of lordIds)for(const unitClass of ['lord','hegemon','sovereign','sonOfHeaven'] as const){
      const model=officerBattleSheet({id,name:id,unitClass})!;
      expect(model.action.sheet,`${id}/${unitClass}`).toBe(`officers/${id}-battle-lord-v1.webp`);
      expect(model.action.cell,`${id}/${unitClass}`).toEqual([350,280]);
    }
  });

  it('군주 9명의 전투 시트는 1400×280이다',()=>{
    for(const id of lordIds)expect(webpSize(new URL(`../public/officers/${id}-battle-lord-v1.webp`,import.meta.url)),id).toEqual([1400,280]);
  });

  it('id, 환영, wooden_zhuge, boss의 연의 이름 순서로 찾는다',()=>{
    expect(officerEntry({id:'chen_gong',name:'무명'})?.name).toBe('진궁');
    expect(officerEntry({id:'story_enemy',name:'진궁의 환영'})?.id).toBe('chen_gong');
    expect(officerEntry({id:'wooden_zhuge',name:'목우 제갈'})?.name).toBe('제갈량');
    expect(officerEntry({id:'boss',name:'관우'})?.id).toBe('guan_yu');
    expect(officerBattleSheet({id:'wooden_zhuge',name:'제갈량',unitClass:'strategist'})?.action.sheet).toContain('zhuge_liang-battle-cart');
  });

  it('전투 SD와 대결 모델은 다른 파일을 쓴다',()=>{
    for(const [id,name] of [...players,['lu_bu','여포'] as const]){
      const battle=officerBattleSheet({id,name})!;
      const duel=officerDuelModel({id,name});
      if(duel)expect(duel.sheet,id).not.toBe(battle.action.sheet);
    }
    expect(officerDuelModelStyle({id:'lu_bu',name:'여포'})).toContain('--officer-x');
    expect(officerDuelModel({id:'lu_bu',name:'여포'})?.sheet).toBe('officers/lu_bu-duel-v2.webp');
    expect(officerDuelModel({id:'cao_cao',name:'조조'})?.sheet).toBe('officers/cao_cao-duel-v1.webp');
    expect(officerDuelModel({id:'cao_pi',name:'조비'})?.sheet).toBe('officers/cao_pi-duel-v1.webp');
  });
});
