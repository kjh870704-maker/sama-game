import {describe,it,expect} from 'vitest';
import {allUnitClasses} from '../../core/src/index.ts';
import {completeTroopArt,completeTroopSheets,fourStageCorrectionRows} from '../src/complete-troops.ts';
import {paintedTroopArt,paintedTroopSheets,POSE} from '../src/painted-troops.ts';
import {classSprite} from '../src/codex-ui.ts';
import {classSheets} from '../src/troops.ts';

describe('새 화풍 전체 병종 원화',()=>{
  it('깃허브의 전체 145개 유닛을 하나도 빠짐없이, 중복 칸 없이 매핑한다',()=>{
    const classes=allUnitClasses();
    expect(classes).toHaveLength(145);
    expect(Object.keys(completeTroopArt).sort()).toEqual([...classes].sort());
    expect(new Set(Object.values(completeTroopArt).map(x=>`${x.sheet}:${x.row}`)).size).toBe(classes.length);
    for(const c of classes)expect(paintedTroopArt[c],c).toEqual(completeTroopArt[c]);
  });

  it('36개 진화 시트와 민간인 시트가 모두 4행·4열 규격을 사용한다',()=>{
    expect(completeTroopSheets).toHaveLength(37);
    for(const sheet of completeTroopSheets){
      expect(sheet.rows).toBe(4);
      expect(sheet.url).toMatch(/^troops-four-stage-[a-z-]+-v1\.webp$/);
      const loaded=paintedTroopSheets.find(x=>x.id===sheet.id);
      expect(loaded?.frames).toBe(POSE);
      expect(loaded).toHaveProperty('union',true);
    }
    expect(Object.values(fourStageCorrectionRows)).toHaveLength(36);
    expect(Object.values(fourStageCorrectionRows).every(line=>line.length===4)).toBe(true);
    expect(Object.values(fourStageCorrectionRows).flat()).toContain('divineStrategist');
    expect(Object.values(fourStageCorrectionRows).flat()).toContain('sonOfHeaven');
    expect(completeTroopArt.civilian).toEqual({sheet:'four-stage-civilian',row:0,rows:4});
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
