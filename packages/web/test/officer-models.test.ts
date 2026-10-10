import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {officerBattleSheet,officerDuelModel,officerDuelModelStyle,officerDuelMounted,officerEntry,officerManifest,officerModelSheets} from '../src/officer-models.ts';

const lordIds=['cao_cao','cao_pi','cao_rui','liu_bei','sun_quan','gongsun_yuan','yuan_tan','yuan_shang','liu_bang','xiang_yu'] as const;
const priorityDuelIds=['huang_zhong','zhao_yun','sun_quan','lu_meng','wei_yan','lu_xun','gongsun_yuan','yang_ang','lu_fan','sun_shao','meng_da','ma_su','wang_ping','gao_xiang','meng_yan','bi_yan','zhu_ran','zhuge_ke','wang_ling'] as const;
const secondaryDuelIds=['guan_yu','zhang_liao','zhang_he','xiahou_dun','jiang_wei','xiahou_yuan','xu_huang','cao_ren','liu_bei','cao_rui','yuan_tan','yuan_shang','gan_ning','huang_gai','zhu_rong','meng_huo','lu_su','pang_tong','xun_yu','wooden_zhuge'] as const;
const secondaryFullIds=['gao_shou','guo_huai','dai_ling','zhang_zhao','zhuge_jin','zhang_ba','cao_xiu','cao_shuang'] as const;
const secondaryBattle=[
  ['gao_shou','bandit',1120,224],['guo_huai','archer',1120,224],['dai_ling','infantry',1120,224],['zhang_zhao','strategist',1120,224],
  ['zhuge_jin','strategist',1120,224],['zhang_ba','cavalry',1120,224],['cao_xiu','cavalry',1120,224],['cao_shuang','cavalry',1120,224],
] as const;
const priorityBattle=[
  ['yang_ang','infantry',1120,224],['lu_fan','crossbow',1120,224],['sun_shao','crossbow',1120,224],['meng_da','infantry',1120,224],['ma_su','strategist',1120,224],['wang_ping','infantry',1120,224],
  ['gao_xiang','infantry',1120,224],['meng_yan','cavalry',1120,224],['bi_yan','cavalry',1120,224],['zhu_ran','infantry',1120,224],['zhuge_ke','strategist',1120,224],['wang_ling','infantry',1120,224],
] as const;
function webpSize(file:URL){
  const b=readFileSync(file),vp8x=b.indexOf(Buffer.from('VP8X'));
  expect(vp8x).toBeGreaterThanOrEqual(0);
  const n=(i:number)=>b[i]!|(b[i+1]!<<8)|(b[i+2]!<<16);
  return [n(vp8x+12)+1,n(vp8x+15)+1] as const;
}

describe('장수별 전투 SD와 대결 모델',()=>{
  const players=[['sima_yi','사마의'],['cao_zhen','조진'],['sima_lang','사마랑'],['sima_fang','사마방'],['sima_shi','사마사'],['sima_zhao','사마소']] as const;

  it('대상 64명과 모든 공개 시트를 색인한다',()=>{
    expect(officerManifest).toHaveLength(64);
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

  it('진화 병종도 원래 계통 시트의 같은 모습(첫 줄)을 쓴다',()=>{
    const strategist=officerBattleSheet({id:'sima_yi',name:'사마의',unitClass:'mastermind'})!;
    expect(strategist.action.sheet).toContain('battle-strategist');
    expect(strategist.action.row).toBe(0);
    const infantry=officerBattleSheet({id:'sima_lang',name:'사마랑',unitClass:'ironInfantry'})!;
    expect(infantry.action.sheet).toContain('battle-infantry');
    expect(infantry.action.row).toBe(0);
  });

  it('군주 10명은 군주 전 계통에서 전용 기마 시트를 찾는다',()=>{
    for(const id of lordIds)for(const unitClass of ['lord','hegemon','sovereign','sonOfHeaven'] as const){
      const model=officerBattleSheet({id,name:id,unitClass})!;
      expect(model.action.sheet,`${id}/${unitClass}`).toBe(`officers/${id}-battle-lord-v1.webp`);
      expect(model.action.cell,`${id}/${unitClass}`).toEqual([350,280]);
    }
  });

  it('군주 10명의 전투 시트는 1400×280이다',()=>{
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
    expect(officerDuelModel({id:'xiang_yu',name:'항우'})?.sheet).toBe('officers/xiang_yu-duel-v1.webp');
  });

  it('우선순위 장수 19명은 각자 1024×256 전용 대결 시트를 쓴다',()=>{
    for(const id of priorityDuelIds){
      expect(officerDuelModel({id,name:id})?.sheet,id).toBe(`officers/${id}-duel-v1.webp`);
      expect(webpSize(new URL(`../public/officers/${id}-duel-v1.webp`,import.meta.url)),id).toEqual([1024,256]);
    }
  });

  it('2차 장수 20명은 각자 1024×256 전용 대결 시트를 쓴다',()=>{
    for(const id of secondaryDuelIds){
      expect(officerDuelModel({id,name:id})?.sheet,id).toBe(`officers/${id}-duel-v1.webp`);
      expect(webpSize(new URL(`../public/officers/${id}-duel-v1.webp`,import.meta.url)),id).toEqual([1024,256]);
    }
  });

  it('2차 추가 장수 8명도 각자 1024×256 전용 대결 시트를 쓴다',()=>{
    for(const id of secondaryFullIds){
      expect(officerDuelModel({id,name:id})?.sheet,id).toBe(`officers/${id}-duel-v1.webp`);
      expect(webpSize(new URL(`../public/officers/${id}-duel-v1.webp`,import.meta.url)),id).toEqual([1024,256]);
    }
  });

  it('2차 추가 장수 8명은 병종별 전투 시트 규격을 지킨다',()=>{
    for(const [id,unitClass,width,height] of secondaryBattle){
      const model=officerBattleSheet({id,name:id,unitClass})!;
      expect(model.action.sheet,id).toBe(`officers/${id}-battle-${unitClass}-v1.webp`);
      expect(model.action.cell,id).toEqual([width/4,height]);
      expect(webpSize(new URL(`../public/officers/${id}-battle-${unitClass}-v1.webp`,import.meta.url)),id).toEqual([width,height]);
    }
  });

  it('우선순위 장수 12명은 병종별 전투 시트 규격을 지킨다',()=>{
    for(const [id,unitClass,width,height] of priorityBattle){
      const model=officerBattleSheet({id,name:id,unitClass})!;
      expect(model.action.sheet,id).toBe(`officers/${id}-battle-${unitClass}-v1.webp`);
      expect(model.action.cell,id).toEqual([width/4,height]);
      expect(webpSize(new URL(`../public/officers/${id}-battle-${unitClass}-v1.webp`,import.meta.url)),id).toEqual([width,height]);
    }
  });

  it('기마 대결 장수만 기마 연출을 사용한다',()=>{
    for(const id of ['zhao_yun','sun_quan','lu_meng','gongsun_yuan','meng_yan','bi_yan'])expect(officerDuelMounted({id,name:id}),id).toBe(true);
    for(const id of ['huang_zhong','wei_yan','lu_xun','ma_su','zhuge_ke','wang_ling'])expect(officerDuelMounted({id,name:id}),id).toBe(false);
  });
});
