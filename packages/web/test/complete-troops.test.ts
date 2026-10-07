import {describe,it,expect} from 'vitest';
import {allUnitClasses,EVOLUTION,SINGLE_STAGE_CLASSES,VARIANTS} from '../../core/src/index.ts';
import {completeTroopArt,completeTroopSheets,fourStageCorrectionRows,lineageWeapons} from '../src/complete-troops.ts';
import {paintedTroopArt,paintedTroopSheets,POSE} from '../src/painted-troops.ts';
import {classSprite} from '../src/codex-ui.ts';
import {classSheets} from '../src/troops.ts';

describe('새 화풍 전체 병종 원화',()=>{
  it('전체 유닛을 하나도 빠짐없이, 중복 칸 없이 매핑한다',()=>{
    const classes=allUnitClasses();
    expect(classes).toHaveLength(153);
    expect(Object.keys(completeTroopArt).sort()).toEqual([...classes].sort());
    expect(new Set(Object.values(completeTroopArt).map(x=>`${x.sheet}:${x.row}`)).size).toBe(classes.length);
    for(const c of classes)expect(paintedTroopArt[c],c).toEqual(completeTroopArt[c]);
  });

  it('38개 계통 시트와 민간인 시트가 모두 4행·4열 규격을 사용한다',()=>{
    expect(completeTroopSheets).toHaveLength(39);
    for(const sheet of completeTroopSheets){
      expect(sheet.rows).toBe(4);
      expect(sheet.url).toMatch(/^troops-four-stage-[a-z-]+-v[123]\.(?:webp|png)$/);
      const loaded=paintedTroopSheets.find(x=>x.id===sheet.id);
      expect(loaded?.frames).toBe(POSE);
      expect(loaded).toHaveProperty('union',true);
    }
    expect(Object.values(fourStageCorrectionRows)).toHaveLength(38);
    expect(Object.values(fourStageCorrectionRows).every(line=>line.length===4)).toBe(true);
    expect(Object.values(fourStageCorrectionRows).flat()).toContain('divineStrategist');
    expect(Object.values(fourStageCorrectionRows).flat()).toContain('sonOfHeaven');
    expect(completeTroopArt.civilian).toEqual({sheet:'four-stage-civilian',row:0,rows:4});
    for(const id of ['fengshui','heavy-cavalry','lord','valiant-cavalry','rattan','yellow-turban','commander','mountain-cavalry'])
      expect(completeTroopSheets.find(x=>x.id===`four-stage-${id}`)?.url).toBe(`troops-four-stage-${id}-v2.png`);
    for(const id of ['monk','maiden','mounted-strategist','pirate'])
      expect(completeTroopSheets.find(x=>x.id===`four-stage-${id}`)?.url).toBe(`troops-four-stage-${id}-v3.png`);
  });

  it('지정 계통은 진화 내내 같은 무기군을 유지하고 신규 계통은 네 단계가 모두 다르다',()=>{
    expect(lineageWeapons).toMatchObject({
      'four-stage-heavy-cavalry':'spear','four-stage-lord':'sword','four-stage-rattan':'trident',
      'four-stage-valiant-cavalry':'curved-saber','four-stage-maiden':'talisman',
      'four-stage-commander':'sword','four-stage-mountain-cavalry':'short-spear-and-buckler','four-stage-horse-archer':'bow',
    });
    expect(VARIANTS.fanSage?.bloom?.name).toBe('천궁');
    expect(VARIANTS.fanSage?.bloom?.name).not.toBe('백우선');
    for(const id of ['four-stage-yellow-turban','four-stage-mounted-strategist','four-stage-pirate'] as const){
      expect(new Set(fourStageCorrectionRows[id]).size).toBe(4);
    }
  });

  it('요청한 완성형 병종은 진화하지 않고 투석병 계통은 폐기한다',()=>{
    expect([...SINGLE_STAGE_CLASSES]).toEqual(expect.arrayContaining(['crownPrince','civilian','xiliang','ram','navy','siegeTower','transport','gaemaWarrior','engineer']));
    for(const troop of SINGLE_STAGE_CLASSES)expect(EVOLUTION[troop],troop).toBeUndefined();
    expect(EVOLUTION.slinger).toBeUndefined();
  });

  it('보병 계열은 기본부터 전설까지 새 화풍의 정확한 4단계 행을 쓴다',()=>{
    for(const [row,troop] of (['infantry','shieldGuard','royalGuard','ironInfantry'] as const).entries()){
      expect(completeTroopArt[troop]).toEqual({sheet:'four-stage-infantry',row,rows:4});
    }
  });

  it('예전 manifest 전용 그림이 있어도 신규 전체 원화를 우선한다',()=>{
    classSheets.set('infantry','troops/old-infantry.webp');
    expect(classSprite('infantry')).toContain('--four-stage-infantry-atlas');
    expect(classSprite('infantry')).not.toContain('--own-infantry-atlas');
    classSheets.delete('infantry');
  });
});
