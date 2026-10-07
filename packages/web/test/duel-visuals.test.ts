import {describe,it,expect} from 'vitest';
import {duelBackdrop} from '../src/duel-ui.ts';
import {strategyIconUrl} from '../src/strategy-icons.ts';
import {allStrategies} from '../src/officers.ts';

describe('대결과 책략 이미지',()=>{
  it('일기토와 설전이 각각 전용 대치 배경을 쓴다',()=>{
    expect(duelBackdrop('duel','seed')).toContain('duel-arena-v1.png');
    expect(duelBackdrop('debate','seed')).toContain('debate-arena-v1.png');
  });

  it('모든 책략에 즉시 표시 가능한 SVG 이미지가 있다',()=>{
    for(const strategy of allStrategies){
      expect(strategyIconUrl(strategy.id),strategy.id).toMatch(/^data:image\/svg\+xml/);
    }
  });
});
