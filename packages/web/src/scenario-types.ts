/**
 * 시나리오 대본 형식 — 조조전식 이야기 장면(작은 인물들이 무대 위를 걷고 말풍선으로 말한다)과
 * 사마의의 대사 선택.
 *
 * 시나리오 모드의 한 장은 [이야기 장면들 → 출진 전 정비 → 전투 → 전투 뒤 장면]으로 흐른다.
 * 대본 파일(scenario/*.ts)은 이 형식의 데이터만 담는다. 이 파일은 타입과 검사만 두며,
 * 다른 모듈을 값으로 가져오지 않는다(node --experimental-strip-types 로 바로 검사할 수 있게).
 */
import type {UnitClass} from '../../core/src/index.ts';

/**
 * 무대 위 인물의 겉모습(픽셀 병사 그림). 장수도 병종 그림으로 그리고 이름표를 단다.
 * strategist·civil: 도포(책사·문관) / infantry: 보병 / spear: 창병 / archer: 궁병 / cavalry: 기병 /
 * crossbow: 노병 / heavy: 중기병 / engineer: 공병 / sage: 풍수사 / shaman: 무당 / lady: 여인(무녀) /
 * taoist: 도사 / physician: 의원 / monk: 무승 / bandit: 산적 / assassin: 자객 / horseArcher: 궁기병 / elephant: 코끼리
 */
export const LOOKS=['strategist','civil','infantry','spear','archer','cavalry','crossbow','heavy','engineer','sage','shaman','lady','taoist','physician','monk','bandit','assassin','horseArcher','elephant'] as const;
export type Look=typeof LOOKS[number];

/** 무대 좌표: 가로 0~100, 세로 0~100(퍼센트). 세로는 30~85 사이가 바닥이다. */
export type At=[number,number];

export interface CastMember {
  /** 화자 이름과 같아야 한다(대사의 say와 맞춘다). */
  name:string;
  look:Look;
  /** 처음 서 있는 자리. 없으면 무대 밖에 있다가 enter로 들어온다. */
  at?:At;
  face?:'left'|'right';
}

/** 대사 선택의 효과. 전투에 바로 반영되거나(가상 전장), 다음 이야기·결말에 남는다. */
export type ChoiceEffect=
  /** 우군이 합류한다. side 'npc'는 초록 깃발의 자동 우군, 'ally'는 직접 지휘하는 편입 아군. */
  |{kind:'reinforce';name:string;unitClass:UnitClass;side:'npc'|'ally'}
  /** 장수가 부대에 영입된다(이번 전투부터 끝까지 함께 싸운다). */
  |{kind:'recruit';name:string;unitClass:UnitClass}
  /** 아군 전원 처음 2턴 사기 상승. */
  |{kind:'rally'}
  /** 아군 전원 처음 1턴 방어 태세. */
  |{kind:'guard'}
  /** 사마의 책략 MP +15. */
  |{kind:'insight'}
  /** 척후: 적 한 부대가 전장에 나오지 않는다(가상 전장만). */
  |{kind:'scout'}
  /** 기습: 적 전원이 체력 80%로 시작한다(가상 전장만). */
  |{kind:'ambush'}
  /** 정면 승부: 적 정예 한 부대가 더 나오지만 경험치 1.5배(가상 전장만). */
  |{kind:'bold'}
  /** 다음 가상 전장을 다른 이야기로 바꾼다(extraTales에 정의한 id). */
  |{kind:'path';tale:string}
  /** 이야기에 남는 표식. 뒤 장면의 when/unless, 결말 덧말이 읽는다. */
  |{kind:'flag';flag:string}
  /** 그 자리에서 일기토(무력)·설전(지력) 5합. by: 나서는 사람(기본 사마의). 이기면 이번 전투 사기 상승(+가상 전장은 적 기세 꺾임), 설전 승리는 책략 MP도. */
  |{kind:'duel'|'debate';foe:string;by?:string;line?:string};

export interface ChoiceOption {
  /** 운명의 갈림길(fate:…)에서는 고를 수 있는 루트 id와 같아야 한다. */
  id:string;
  /** 선택지 문구(사마의가 할 말이나 결정). */
  text:string;
  /** 고른 뒤 사마의가 하는 말. */
  reply?:string;
  /** 고른 뒤 상대가 받는 말. */
  answer?:{speaker:string;line:string};
  /** 화면에 보이는 효과 설명(짧게). */
  note?:string;
  effects?:ChoiceEffect[];
}

export type ScriptStep=(
  /** 화자가 말한다(말풍선 + 아래 대화창). to: 바라볼 사람. */
  |{say:string;line:string;to?:string}
  /** 해설(장면 사이 자막). */
  |{narrate:string}
  /** 걸어서 이동. */
  |{move:string;to:At}
  /** 무대에 들어온다. from: 들어오는 쪽. */
  |{enter:string;at:At;from?:'left'|'right'}
  /** 무대에서 나간다. */
  |{exit:string;to?:'left'|'right'}
  /** 머리 위 감정 표시: '!', '?', '…', '♪', '분노', '땀' 같은 짧은 글자. */
  |{emote:string;text:string}
  /** 사마의의 선택. 장 하나에 최대 한 번. */
  |{choice:string;options:ChoiceOption[]}
)&{
  /** 이 표식이 있을 때만 */
  when?:string;
  /** 이 표식이 없을 때만 */
  unless?:string;
};

export interface Scene {
  /** 장소 이름(무대 왼쪽 위에 표시). */
  place:string;
  /** 배경 그림 번호 0~17(story.ts의 storyBackdrop). 0 저택 뜰 · 1 불타는 도성 · 2 성문 · 3 산등성이 · 4 골짜기 · 5 궁정 · 6 군영 아침 · 7 강 · 8 성벽 · 9 창고 · 10 저택 문 · 11 숲길 · 12 서재 · 13 회랑 · 14 군막 · 15 강둑 · 16 진영 · 17 요새 */
  art:number;
  cast:CastMember[];
  steps:ScriptStep[];
}

/**
 * 출진 전 진영 — 조조전의 거점처럼, 이야기가 끝난 뒤 진영에서 사람들이 오가고(제자리 근처를 걷는다)
 * 플레이어가 누군가를 누르면 사마의가 다가가 말을 건다. 대화는 그 장의 상황·인물 관계·다가올 전투의
 * 실마리를 담는다. 말을 다 걸지 않아도 출진할 수 있다.
 */
export interface CampPerson {
  name:string;look:Look;at:At;
  /** 처음 말을 걸 때. say 의 화자는 이 사람이나 '사마의'(다른 사람은 cast 에 없으니 쓰지 않는다). */
  talk:ScriptStep[];
  /** 두 번째부터(없으면 talk 의 마지막 대사를 다시). */
  again?:ScriptStep[];
  /** 이 사람이 나타나는 조건(표식). */
  when?:string;unless?:string;
}
export interface Camp {place:string;art:number;people:CampPerson[]}

export interface ChapterScript {
  /**
   * 장을 여는 해설(역사적 배경·시나리오 배경). 이야기 장면 앞에 해설 화면으로 한 줄씩 나온다.
   * 연의 장은 그 해의 정세와 사마의의 처지, 가상 장은 역사와 어디서 갈라졌는지를 쓴다. 2~5줄, 줄마다 140자 이하.
   */
  history?:string[];
  /** 출진 전 진영(전투가 있는 장에만). */
  camp?:Camp;
  /** 가상 전장: 반드시 출진해야 하는 장수(부대에 있을 때만 적용). 사마의는 언제나 필수. */
  required?:string[];
  /**
   * 연의 장: 스테이지 id('S1-01'…). 가상 전장: 가상 전장 id('IF1-srv-1'…). 루트의 우두머리 전: `${루트id}:boss`.
   * 운명의 갈림길: 'fate:1', 'fate:2:refuse', 'fate:2:serve'… (fate:${편}:${앞 루트}). 결말: `ending:${하편 루트id}`.
   */
  id:string;
  year:string;
  title:string;
  /** 장 선택 화면에 보이는 두세 문장. */
  synopsis:string;
  /** 전투 전 이야기. */
  scenes:Scene[];
  /** 이긴 뒤 이야기(결말 장에는 없다). */
  after?:Scene[];
}

/** 루트 안에서 선택(path)으로 바뀌는 다른 가상 전장. */
export interface ExtraTale {
  id:string;route:string;
  /** 이 전장이 대신하는 원래 가상 전장 id */
  replaces:string;
  title:string;intro:string;
  target:{name:string;unitClass:UnitClass};
}

export interface ScenarioPack {chapters:ChapterScript[];extraTales?:ExtraTale[];
  /** 결말 덧말: 표식이 있으면 결말 끝에 붙는다. */
  endingNotes?:Array<{flag:string;line:string}>;}

/** 대본 검사(테스트와 작성 도구가 쓴다). 문제 목록을 돌려준다. */
export function checkPack(pack:ScenarioPack,known:{unitClasses:readonly string[];fateOptions?:Record<string,string[]>}):string[]{
  const out:string[]=[],classes=new Set(known.unitClasses),looks=new Set<string>(LOOKS);
  const extra=new Set((pack.extraTales??[]).map(t=>t.id));
  for(const t of pack.extraTales??[])if(!classes.has(t.target.unitClass))out.push(`${t.id}: 모르는 병종 ${t.target.unitClass}`);
  for(const c of pack.chapters){
    const where=(s:string)=>`${c.id}: ${s}`;
    if(!c.title||!c.synopsis||!c.year)out.push(where('제목·연도·줄거리가 비었다'));
    if(!c.scenes.length)out.push(where('장면이 없다'));
    let choices=0;
    for(const scene of [...c.scenes,...(c.after??[])]){
      if(!Number.isInteger(scene.art)||scene.art<0||scene.art>17)out.push(where(`배경 번호 ${scene.art}`));
      const names=new Set(scene.cast.map(m=>m.name));
      for(const m of scene.cast){if(!looks.has(m.look))out.push(where(`${m.name}의 겉모습 ${m.look}`));if(m.at&&(m.at[0]<0||m.at[0]>100||m.at[1]<0||m.at[1]>100))out.push(where(`${m.name} 자리`));}
      if(!scene.steps.length)out.push(where(`${scene.place} 장면에 진행이 없다`));
      for(const st of scene.steps){
        const who='say' in st?st.say:'move' in st?st.move:'enter' in st?st.enter:'exit' in st?st.exit:'emote' in st?st.emote:'choice' in st?st.choice:undefined;
        if(who!==undefined&&!names.has(who))out.push(where(`${scene.place}: 출연진에 없는 ${who}`));
        if('say' in st&&(!st.line||st.line.length>140))out.push(where(`${st.say}의 대사 길이 ${st.line.length}`));
        if('choice' in st){
          choices++;
          {const contest=st.options.some(o=>o.effects?.some(e=>e.kind==='duel'||e.kind==='debate'));if(st.options.length<2||st.options.length>(contest?4:3))out.push(where(contest?'선택지는 2~4개(대결 포함)':'선택지는 2~3개'));}
          for(const o of st.options)for(const e of o.effects??[]){
            if((e.kind==='reinforce'||e.kind==='recruit')&&!classes.has(e.unitClass))out.push(where(`효과의 모르는 병종 ${e.unitClass}`));
            if(e.kind==='path'&&!extra.has(e.tale))out.push(where(`없는 가상 전장 ${e.tale}`));
          }
          const fate=known.fateOptions?.[c.id];
          if(fate){const ids=st.options.map(o=>o.id).sort().join(),want=[...fate].sort().join();if(ids!==want)out.push(where(`갈림길 선택지 ${ids} ≠ ${want}`));}
        }
      }
    }
    if(c.history){if(c.history.length<2||c.history.length>5)out.push(where(`해설 ${c.history.length}줄(2~5)`));for(const l of c.history)if(!l||l.length>140)out.push(where(`해설 길이 ${l.length}`));}
    if(c.camp){
      const cp=c.camp;if(!Number.isInteger(cp.art)||cp.art<0||cp.art>17)out.push(where(`진영 배경 번호 ${cp.art}`));
      if(cp.people.length<2||cp.people.length>7)out.push(where(`진영 인물 ${cp.people.length}명(2~7)`));
      for(const person of cp.people){
        if(!looks.has(person.look))out.push(where(`진영 ${person.name}의 겉모습 ${person.look}`));
        if(person.name==='사마의')out.push(where('진영 인물에 사마의는 넣지 않는다(사마의는 자동으로 선다)'));
        if(!person.talk.length)out.push(where(`진영 ${person.name}의 대화가 없다`));
        for(const st of [...person.talk,...(person.again??[])]){
          const who='say' in st?st.say:'move' in st?st.move:'emote' in st?st.emote:undefined;
          if('choice' in st||'enter' in st||'exit' in st)out.push(where(`진영 대화에는 say/emote/move/narrate만`));
          if(who!==undefined&&who!==person.name&&who!=='사마의')out.push(where(`진영 ${person.name} 대화에 다른 사람 ${who}`));
          if('say' in st&&(!st.line||st.line.length>140))out.push(where(`진영 ${st.say}의 대사 길이`));
        }
      }
    }
    if(choices>1)out.push(where('선택은 장마다 한 번'));
    if(c.id.startsWith('fate:')&&choices!==1)out.push(where('갈림길에는 선택이 꼭 하나'));
  }
  return out;
}
