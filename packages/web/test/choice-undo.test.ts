import {describe,it,expect} from 'vitest';
import {newScenarioRun,choose,undoChoice,scriptOf,type ScenarioStep} from '../src/scenario.ts';

const step={id:'IF1-yuan-2',kind:'tale',act:1,route:'yuan'} as unknown as ScenarioStep;
const opts=()=>scriptOf(step.id)!.scenes.flatMap(s=>s.steps).flatMap(st=>'choice' in st?st.options:[]);
const pick=(state:ReturnType<typeof newScenarioRun>,id:string)=>choose(state,step,id,opts().find(o=>o.id===id)!.effects??[],5);

describe('장을 다시 시작하면 전에 고른 답의 효과를 걷어 낸다',()=>{
 it('다른 답을 골라도 표식·영입·바꿔치기가 겹치지 않는다',()=>{
  const s=newScenarioRun(1,7);
  pick(s,'jushou');expect(s.flags).toContain('yuan_jushou');expect(s.officers['저수']).toBeDefined();
  undoChoice(s,step);expect(s.flags).not.toContain('yuan_jushou');expect(s.officers['저수']).toBeUndefined();expect(s.choices[step.id]).toBeUndefined();
  pick(s,'xudu');expect(s.flags).toContain('yuan_xudu');expect(s.flags).not.toContain('yuan_jushou');expect(Object.values(s.paths)).toContain('IF1-yuan-xudu');
  undoChoice(s,step);expect(s.flags).not.toContain('yuan_xudu');expect(Object.values(s.paths)).not.toContain('IF1-yuan-xudu');
 });
 it('마친 장과 갈림길은 건드리지 않는다',()=>{
  const s=newScenarioRun(1,7);pick(s,'jushou');s.done.push(step.id);undoChoice(s,step);
  expect(s.flags).toContain('yuan_jushou');expect(s.officers['저수']).toBeDefined();
 });
});
