import {describe,expect,it} from 'vitest';
import {officerBattleModel,officerModelSheets,officerModelStyle} from '../src/officer-models.ts';

describe('장수별 전신 모델과 보행',()=>{
  const story=[
    ['sima_yi','사마의'],['sima_yi_young','소년 사마의'],['sima_lang','사마랑'],['sima_fang','사마방'],
    ['cao_zhen','조진'],['cao_cao','조조'],['cao_pi','조비'],['xu_chu','허저'],
  ] as const;
  const elite=[['ma_chao','마초'],['lu_bu','여포'],['chen_gong','진궁'],['zhou_yu','주유']] as const;

  it('주요 장수 12명을 id와 이름 모두로 찾는다',()=>{
    for(const [id,name] of [...story,...elite]){
      expect(officerBattleModel({id,name}),id).toBeDefined();
      expect(officerBattleModel({id:'story_enemy',name}),name).toBeDefined();
      expect(officerModelStyle({id,name}),name).toContain('background-image');
    }
    expect(officerBattleModel({id:'unknown',name:'무명 장수'})).toBeUndefined();
  });

  it('모든 장수가 행동·앞뒤 보행·좌우 보행 시트를 갖는다',()=>{
    const sheets=new Set(officerModelSheets.map(s=>s.id));
    for(const [id,name] of [...story,...elite]){
      const model=officerBattleModel({id,name})!;
      expect(sheets.has(model.action.sheet),id).toBe(true);
      expect(sheets.has(model.walk.sheet),id).toBe(true);
      expect(sheets.has(model.sideWalk.sheet),id).toBe(true);
      expect(model.walk.row).toBeGreaterThanOrEqual(0);
      expect(model.sideWalk.row).toBe(model.walk.row);
      expect(model.action.sheet).toBe(model.walk.sheet);
      expect(model.action.sheet).toBe(model.sideWalk.sheet);
    }
  });

  it('전투 전용 시트 세 장은 각 네 장수의 대기·보행·공격·방어 4프레임이다',()=>{
    expect(officerModelSheets).toHaveLength(3);
    expect(officerModelSheets.every(s=>s.rows===4&&s.strictGrid)).toBe(true);
  });
});
