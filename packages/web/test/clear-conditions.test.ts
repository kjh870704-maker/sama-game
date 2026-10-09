import {describe,expect,it} from 'vitest';
import {Session,chapters,campaignOrder} from '../src/session.ts';
import {deployment,freshCampaign} from '../src/progression.ts';
import type {VictoryCondition} from '../../core/src/index.ts';

/** 열려 있는 대화는 정답(없으면 첫) 선택지로 넘긴다 — 플레이어가 고른 것처럼. */
function answerDialogues(s:Session){
  for(let i=0;i<10&&s.state.activeDialogue;i++){
    const node=s.battle.dialogue.node(s.state.activeDialogue);
    const opts=[...node.options].sort((a,b)=>Number(!!b.correct)-Number(!!a.correct));
    if(!opts.some(o=>s.act({kind:'choose',nodeId:node.id,optionId:o.id}).ok))break;
  }
}
/** 지금 걸린 승리 조건을 판에 그대로 채운다(단계가 있으면 모든 단계, 없으면 첫 조건). 채울 수 없는 조건은 이유를 돌려준다. */
function satisfy(s:Session):string[]{
  const st=s.state,missing:string[]=[];
  const unordered=st.victory.filter(c=>c.order===undefined),ordered=st.victory.filter(c=>c.order!==undefined);
  const steps=[...new Set(ordered.map(c=>c.order!))].sort((a,b)=>a-b).map(o=>ordered.find(c=>c.order===o)!);
  const todo:VictoryCondition[]=unordered.length?[unordered[0]!]:steps;
  for(const c of todo){
    switch(c.type){
      case 'annihilate':for(const u of st.living(c.side??'enemy'))st.retreat(u);break;
      case 'retreat':{const u=st.find(c.unit!);if(!u){missing.push(`없는 부대 ${c.unit}`);break;}st.retreat(u);break;}
      case 'reach':{const u=st.find(c.unit!),at=st.map.regionCoords(c.target!);if(!u||!u.alive){missing.push(`없는 부대 ${c.unit}`);break;}if(!at.length){missing.push(`없는 지점 ${c.target}`);break;}
        const free=at.find(p=>!st.living().some(o=>o!==u&&o.pos.x===p.x&&o.pos.y===p.y))??at[0]!;u.pos={...free};break;}
      case 'capture':if(!st.map.regionCoords(c.target!).length)missing.push(`없는 지점 ${c.target}`);st.captured.set(c.target!,c.by??'player');break;
      case 'dialogue_complete':st.choices.push({nodeId:c.target!,optionId:'test'} as never);break;
      case 'enemy_retreat_count':{const need=(c.n??0)-st.losses.enemy;for(const u of st.living('enemy').slice(0,Math.max(0,need)))st.retreat(u);st.losses.enemy=Math.max(st.losses.enemy,c.n??0);break;}
      case 'survive_turns':st.survivalClocks.set(c.target??'default',st.turn-(c.n??0));break;
      default:break;
    }
  }
  return missing;
}
/** 행동 한 번으로 판정을 돌린다(아직 움직이지 않은 아군 하나가 대기). */
function nudge(s:Session){
  const st=s.state;
  const u=st.living(st.currentSide).find(x=>!x.hasActed)??st.living('player').find(x=>!x.hasActed);
  if(u)s.act({kind:'wait',unit:u.id});
  else{s.act({kind:'endPhase'} as never);for(let i=0;i<40&&s.state.outcome==='ongoing'&&!['player','ally'].includes(s.state.currentSide)&&!s.state.activeDialogue;i++)if(!s.tick())break;}
  answerDialogues(s);
}

describe('승리 조건을 채우면 클리어된다',()=>{
  for(const ch of campaignOrder)for(const difficulty of ['normal','extreme'] as const){
    const id=chapters[ch]!.stage.id;
    it(`${id} ${difficulty}`,()=>{
      const s=new Session(ch,difficulty,7,'strategy',5,deployment(freshCampaign(),true));
      answerDialogues(s);
      // 조건이 이어지는 장(조건을 채우면 다음 목표로 바뀌는 장)은 바뀐 목표도 채워 본다.
      // 나중에 나타나는 적장(S1-04 여포·주유의 환영)은 앞 단계를 채워야 나온다 — 단계마다 다시 채운다.
      let missing:string[]=[];
      for(let round=0;round<8&&s.state.outcome==='ongoing';round++){missing=satisfy(s);nudge(s);}
      expect(s.state.outcome,`${id} 남은 목표 ${JSON.stringify(s.state.victory)} · 채우지 못함 ${missing.join(', ')} · 실패 ${s.failure??''}`).toBe('victory');
    });
  }
});
