import {describe,it,expect} from 'vitest';
import {runBoard} from '../src/run-board.ts';
import {readScenario,freshScenario} from '../src/scenario.ts';
import type {MetaState} from '../src/meta.ts';
const meta={mandate:7} as MetaState;
describe('본영 로그라이크 진행판',()=>{
  it('explains the roguelike loop before the first run',()=>{
    const html=runBoard(freshScenario(),meta);
    for(const word of ['회차마다','행군로 세 갈래','체력·보물이 이어진다','천명'])expect(html).toContain(word);
  });
  it('shows the run number, the current chapter, the pending march choices, relics and wounds',()=>{
    const s=readScenario(JSON.stringify({version:1,route:{},done:['S1-01','S1-02'],flags:[],choices:{},officers:{},paths:{},run:{seed:123,no:2,hp:{'조진':0.4},relics:['whetstone'],fallen:[],marched:['S1-01'],guard:true,nodes:1,status:'alive',bonus:3}}));
    const html=runBoard(s,meta);
    expect(html).toContain('제2회차');expect(html).toContain('다음 행군로');expect(html).toContain('조진 40%');expect(html).toContain('이번 회차 +3');
    expect(html.match(/rogue-node now/g)).toHaveLength(1);expect(html.match(/rogue-node done/g)).toHaveLength(2);
    expect(html.match(/class="rogue-choice/g)!.length).toBe(3);
  });
});
