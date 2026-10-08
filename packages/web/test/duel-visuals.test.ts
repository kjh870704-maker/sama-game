import {describe,it,expect} from 'vitest';
import {contestModel,duelArena,duelBackdrop,duelModel} from '../src/duel-ui.ts';
import {duelRound,newDuel,duelAdvantage} from '../src/duel.ts';
import {strategyIconUrl} from '../src/strategy-icons.ts';
import {allStrategies} from '../src/officers.ts';

describe('대결과 책략 이미지',()=>{
  it('일기토 3종과 설전 2종 전용 WebP 배경을 장면마다 바꿔 쓴다',()=>{
    const duelScenes=new Set(Array.from({length:40},(_,i)=>duelBackdrop('duel',`seed-${i}`)));
    const debateScenes=new Set(Array.from({length:40},(_,i)=>duelBackdrop('debate',`seed-${i}`)));
    expect(duelScenes.size).toBe(3);
    expect(debateScenes.size).toBe(2);
    for(const scene of [...duelScenes,...debateScenes])expect(scene).toContain('.webp');
    expect([...duelScenes].some(scene=>scene.includes('duel-arena-river-v2.webp'))).toBe(true);
    expect([...debateScenes].some(scene=>scene.includes('debate-arena-tent-v2.webp'))).toBe(true);
  });

  it('초상 카드 대신 두 전신 모델과 5수 상성 결과를 표시한다',()=>{
    const duel=newDuel('duel',{id:'a',name:'관우',stat:95},{id:'b',name:'여포',stat:98});
    duelRound(duel,'feint');
    const html=duelArena(duel,{models:{player:contestModel('duel','player','관우'),enemy:contestModel('duel','enemy','여포')},backdrop:''});
    expect(html).toContain('live-models');expect(html).not.toContain('duel-card');expect(html.match(/data-duel-action=/g)).toHaveLength(5);expect(html).toContain('duel-clash');
    // 말 탄 크기는 이름이 아니라 세운 그림으로 정한다: 검객 그림의 여포는 걸어서, 말 탄 그림(data-mounted)은 이름과 상관없이 말 탄 크기.
    expect(contestModel('duel','enemy','여포')).not.toContain('mounted');
    expect(duelModel('<span class="battle-model" data-mounted></span>','enemy','유비')).toContain('duel-model face-left mounted');
    // 체력 상자는 인물 밖(화면 위 양쪽)에 둔다: 인물 안에 있으면 돌진·정면 승부 때 함께 움직여 가운데서 겹친다.
    const ground=html.slice(html.indexOf('duel-ground'),html.indexOf('duel-cutin')>0?html.indexOf('duel-cutin'):html.length);
    expect(html.indexOf('class="duel-mini')).toBeGreaterThan(html.indexOf('duel-fighter enemy'));expect(ground.indexOf('duel-mini')).toBeGreaterThan(ground.lastIndexOf('<div class="duel-fighter'));
    expect(html.match(/duel-mini (left|right) fixed/g)).toHaveLength(2);
    expect(contestModel('debate','enemy','진궁')).not.toContain('mounted');
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
