import {describe,it,expect} from 'vitest';
import {paintedTroopArt,paintedTroopFrame} from '../src/painted-troops.ts';
import {classSprite} from '../src/codex-ui.ts';
describe('dedicated troop art',()=>{
  it('uses separate elephant and harness designs, never horse armor overlays',()=>{
    for(const [row,c] of (['elephant','warElephant','elephantKing'] as const).entries()){
      expect(paintedTroopArt[c]?.row).toBe(row);
      expect(classSprite(c)).toContain('--four-stage-elephant-atlas');
      expect(classSprite(c)).not.toContain('cx-armor');
    }
  });
  it('retains distinct rattan evolution rows without metal armor overlays',()=>{
    for(const [row,c] of (['rattan','rattanElite','wuguoRattan'] as const).entries()){
      expect(paintedTroopArt[c]?.row).toBe(row);
      expect(classSprite(c)).toContain('--four-stage-rattan-atlas');
      expect(classSprite(c)).not.toContain('cx-armor');
    }
  });
  it('maps battle attack, walk and reaction poses to their own action columns',()=>{
    const f=(p:number)=>paintedTroopFrame(p);
    expect([0,1,2,3].map(f)).toEqual([0,1,2,1]);
    expect([4,5,6,7].map(f)).toEqual([0,1,0,1]);
    expect([8,9,10,11].map(f)).toEqual([3,0,3,0]);
  });
});
import {hasPaintedMotion} from '../src/troops.ts';
import {paintedFrames,paintedTroopSheets,POSE} from '../src/painted-troops.ts';
import {fourStageCorrectionRows} from '../src/complete-troops.ts';
describe('완성 원화만 쓰는 병종 그림',()=>{
  it('loads only the registered four-stage families and the civilian sheet',()=>{
    expect(paintedTroopSheets.map(s=>s.id)).toEqual([
      ...Object.keys(fourStageCorrectionRows),
      'four-stage-civilian',
    ]);
    expect(paintedTroopSheets.every(s=>s.url.startsWith('troops-four-stage-'))).toBe(true);
    expect(paintedFrames('four-stage-infantry')).toBe(POSE);
  });
  it('lets the battlefield use the painted walk and facing frames',()=>{
    expect(hasPaintedMotion('rattan')).toBe(true);expect(hasPaintedMotion('wuguoRattan')).toBe(true);
  });
  it('maps the families to their own complete sheets by tier',()=>{
    for(const [a,b,c,sheet,row,rows] of [['infantry','shieldGuard','royalGuard','four-stage-infantry',0,4],['spearman','pikeman','halberdier','four-stage-spearman',0,4],['archer','longbow','sharpshooter','four-stage-archer',0,4],['cavalry','lancer','tigerRider','four-stage-cavalry',0,4]] as const){
      expect(paintedTroopArt[a]).toEqual({sheet,row,rows});expect(paintedTroopArt[b]?.row).toBe(row+1);expect(paintedTroopArt[c]?.row).toBe(row+2);
    }
    for(const [a,c,aSheet,aRow,cSheet,cRow] of [['assassin','wraith','four-stage-assassin',0,'four-stage-assassin',2],['pirate','pirateCaptain','four-stage-pirate',0,'four-stage-pirate',2],['shaman','demonKing','four-stage-shaman',0,'four-stage-shaman',2]] as const){
      expect(paintedTroopArt[a]).toEqual({sheet:aSheet,row:aRow,rows:4});expect(paintedTroopArt[c]).toEqual({sheet:cSheet,row:cRow,rows:4});
    }
    expect(paintedTroopSheets.find(s=>s.id==='four-stage-elephant')).toHaveProperty('union',true);
  });
});

describe('병종 차트로 늘린 병종', () => {
  it('gives every chart class a Korean name, its own art row and a 조조전 grade', async () => {
    const {CHART_ROLES} = await import('../src/chart-troops.ts');
    const {paintedTroopArt, paintedTroopSheets} = await import('../src/painted-troops.ts');
    const {classNames, recruitPool} = await import('../src/troops.ts');
    const {VARIANTS, gradeProfileOf, evolvedClass, tierOf} = await import('../../core/src/index.ts');
    const retired=new Set(['slinger','hurler','boulderCorps','meteorSlinger']);
    for (const c of Object.keys(CHART_ROLES).filter(c=>!retired.has(c)) as Array<keyof typeof CHART_ROLES>) {
      expect(VARIANTS[c], c).toBeDefined();
      expect(classNames[c], c).toMatch(/[가-힣]/);
      const art = paintedTroopArt[c];
      expect(art, c).toBeDefined();
      const sheet = paintedTroopSheets.find((s) => s.id === art!.sheet);
      expect(sheet && art!.row < sheet.rows, c).toBe(true);
      expect(gradeProfileOf(c).grades).toHaveLength(5);
    }
    for (const c of ['swordsman', 'lord', 'commander', 'dancer', 'transport', 'yellowTurban'] as const) expect(recruitPool).toContain(c);
    expect(evolvedClass('swordsman', 40)).toBe('swordSaint');
    expect(tierOf('swordSaint')).toBe(4);
    expect(evolvedClass('infantry', 30)).toBe('ironInfantry');
  });
});
