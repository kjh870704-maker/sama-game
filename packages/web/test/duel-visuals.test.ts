import {describe,it,expect} from 'vitest';
import {contestModel,duelArena,duelBackdrop} from '../src/duel-ui.ts';
import {duelRound,newDuel,duelAdvantage} from '../src/duel.ts';
import {strategyIconUrl} from '../src/strategy-icons.ts';
import {allStrategies} from '../src/officers.ts';

describe('대결과 책략 이미지',()=>{
  it('일기토와 설전이 각각 전용 대치 배경을 쓴다',()=>{
    expect(duelBackdrop('duel','seed')).toContain('duel-arena-v1.png');
    expect(duelBackdrop('debate','seed')).toContain('debate-arena-v1.png');
  });

  it('초상 카드 대신 두 전신 모델과 5수 상성 결과를 표시한다',()=>{
    const duel=newDuel('duel',{id:'a',name:'관우',stat:95},{id:'b',name:'여포',stat:98});
    duelRound(duel,'feint');
    const html=duelArena(duel,{models:{player:contestModel('duel','player','관우'),enemy:contestModel('duel','enemy','여포')},backdrop:''});
    expect(html).toContain('live-models');expect(html).not.toContain('duel-card');expect(html.match(/data-duel-action=/g)).toHaveLength(5);expect(html).toContain('duel-clash');
    expect(duelAdvantage('guard','attack')).toBe(1);expect(duelAdvantage('feint','guard')).toBe(1);expect(duelAdvantage('special','rally')).toBe(1);
  });

  it('모든 책략에 즉시 표시 가능한 서로 다른 SVG 이미지가 있다',()=>{
    const visuals=new Set<string>();
    for(const strategy of allStrategies){
      expect(strategyIconUrl(strategy.id),strategy.id).toMatch(/^data:image\/svg\+xml/);
      const normalized=decodeURIComponent(strategyIconUrl(strategy.id)).replaceAll(`g${strategy.id}1`,'gSTRATEGY');
      expect(visuals.has(normalized),`${strategy.id}가 다른 책략과 같은 그림을 사용한다`).toBe(false);
      visuals.add(normalized);
    }
    expect(visuals.size).toBe(allStrategies.length);
  });
});
