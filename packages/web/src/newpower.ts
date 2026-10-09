/**
 * 신세력의 대본 — 사마의가 스스로 새 깃발을 드는 길(fate.ts의 custom 루트)은 플레이어가 지은 세력 이름과
 * 함께하는 장수(신장수 포함)에 따라 글이 달라지므로, 미리 써 둔 대본 대신 여기서 그때그때 짓는다.
 * 장마다 해설(역사·시나리오 배경), 출진 전 장면, 출진 전 진영(척후·군리·동료), 전투 뒤 장면을 갖춘다.
 */
import type {ChapterScript,Look,CastMember,ScriptStep,CampPerson,ChoiceOption,Camp} from './scenario-types.ts';
import {ROUTES,routeById,factionText,fatePoint} from './fate.ts';
import {NP_DETAIL,NP_TEMPER} from './newpower-detail.ts';
import {을를,이가} from './josa.ts';

export interface FactionContext {name:string;emblem:string;companions:Array<{name:string;look:Look}>}
let ctx:FactionContext={name:'신세력',emblem:'신',companions:[]};
/** 지금 회차의 세력·동료(scenario.ts가 불러올 때마다 맞춘다). */
export function setFactionContext(c:FactionContext){ctx=c;}
export const factionContext=()=>ctx;

const LOOK:Partial<Record<string,Look>>={infantry:'infantry',spearman:'spear',archer:'archer',cavalry:'cavalry',heavyCav:'heavy',crossbow:'crossbow',strategist:'strategist',horseArcher:'horseArcher',bandit:'bandit',monk:'monk',taoist:'taoist',fengshui:'sage',assassin:'assassin'};
const lookOf=(c:string):Look=>LOOK[c]??'infantry';
const T=(s:string)=>factionText(s,ctx.name);
const YEARS:Record<string,string>={NP1:'200년',NP2:'210년',NP3:'225년'};

/** 이 id가 신세력의 장인가. */
export const isNewPower=(id:string)=>/^NP\d/.test(id)||/^np/.test(id.split(':')[1]??'')||id==='fate:2:np1'||/^fate:3:np_/.test(id)||/^ending:np_/.test(id)||/^np[\w]*:boss$/.test(id);

function mates(n=2){return ctx.companions.slice(0,n);}
function camp(place:string,art:number,lines:{scout:string;clerk:string;mate:string}):Camp{
  const people:CampPerson[]=[
    {name:'척후',look:'archer',at:[22,58],talk:[{say:'척후',line:lines.scout},{say:'사마의',line:'좋다. 그 길목을 먼저 막는다.'}]},
    {name:'군리',look:'civil',at:[76,60],talk:[{say:'군리',line:lines.clerk},{say:'사마의',line:'아껴 쓰되, 굶기지는 마라.'}]},
  ];
  mates(3).forEach((m,i)=>people.push({name:m.name,look:m.look,at:[34+i*16,50+(i%2)*16],talk:[{say:m.name,line:T(lines.mate)},{say:'사마의',line:T('{세력}의 이름은 그대들의 칼끝에서 시작되오.')}]}));
  return {place,art,people};
}
function battleScript(id:string,title:string,intro:string,target:{name:string;unitClass:string},act:number,boss=false):ChapterScript{
  const year=YEARS[`NP${act}`]??'',m=mates(2),foe={name:target.name,look:lookOf(target.unitClass)},d=NP_DETAIL[id];
  const cast:CastMember[]=[{name:'사마의',look:'strategist',at:[34,64],face:'right'},...m.map((x,i)=>({name:x.name,look:x.look,at:[i?50:18,i?76:72] as [number,number]}))];
  const mateLine=d?.mate??`${이가(target.name)} 온다는 소식입니다. {세력}의 첫 시험이 될지도 모릅니다.`;
  const choice:ScriptStep[]=d?[{choice:'사마의',options:d.options.map(o=>({id:o.id,text:T(o.text),reply:T(o.reply),note:o.note,effects:o.effects}))}]:[];
  const steps:ScriptStep[]=[{narrate:T(intro)},...(m[0]?[{say:m[0].name,line:T(mateLine)}] as ScriptStep[]:[]),
    {enter:foe.name,at:[70,56],from:'right'},{say:foe.name,line:T(d?.foe??(boss?'사마중달. 이름 없는 깃발로 어디까지 오를 셈이냐.':'{세력}이라… 들어 본 적 없는 이름이군.')),to:'사마의'},
    {say:'사마의',line:T(d?.reply??'이름은 오늘 생길 것이오. {세력}의 이름으로.'),to:foe.name},{emote:foe.name,text:'분노'},{exit:foe.name,to:'right'},...choice];
  return {id,year:`${year} · ${T('{세력}')}`,title,synopsis:T(intro),
    history:d?d.history.map(T):[T(`${year} 무렵, 천하는 아직 위·촉·오의 이름으로 나뉘기 전이었고, 하내에서 {세력}의 깃발이 올랐다.`),T(`사마의는 누구의 신하도 아니다. 이번 적은 ${target.name} — 꺾으면 붙잡아 설득할 수도 있다.`)],
    scenes:[{place:title,art:boss?17:act===1?6:act===2?2:16,cast:[...cast,{name:foe.name,look:foe.look}],steps}],
    after:[{place:`${title} · 싸움 뒤`,art:16,cast:[{name:'사마의',look:'strategist',at:[40,64],face:'right'},...m.map((x,i)=>({name:x.name,look:x.look,at:[56+i*12,62] as [number,number]}))],
      steps:[{narrate:T(d?.after??`${을를(target.name)} 꺾었다. {세력}의 깃발 아래로 사람들이 모여든다.`)},...(m[0]?[{say:m[0].name,line:'이겼습니다! 다음은 어디입니까?'}] as ScriptStep[]:[]),{say:'사마의',line:'서두르지 마라. 판은 아직 길다.'}]}],
    camp:camp(`${title} · ${T('{세력}')} 진영`,16,{scout:T(d?.scout??`${target.name}의 군이 정면으로 온다는 소문입니다. 측면이 비어 있습니다.`),clerk:T(d?.clerk??'군량은 열흘 치. 길게 끌 수는 없습니다.'),mate:'{세력}의 깃발을 지키겠습니다. 명만 내리십시오.'})};
}
/** 신세력 장의 대본. 없는 id면 undefined. */
export function newPowerScript(id:string):ChapterScript|undefined{
  for(const r of ROUTES.filter(x=>x.custom)){
    const t=r.tales.find(x=>x.id===id);if(t)return battleScript(id,t.title,t.intro,t.target,r.act);
    if(id===`${r.id}:boss`)return battleScript(id,`우두머리 · ${r.region.boss.name}`,`${r.region.name}의 주인 ${이가(r.region.boss.name)} 몸소 나섰다. ${T(r.name)}의 마지막 싸움이다.`,r.region.boss,r.act,true);
    if(id===`ending:${r.id}`&&r.ending)return {id,year:'훗날',title:T(r.ending.title),synopsis:T(r.ending.lines[0]!),history:r.ending.lines.map(T),
      scenes:[{place:T('{세력}의 궁'),art:5,cast:[{name:'사마의',look:'strategist',at:[50,52],face:'right'},...mates(3).map((x,i)=>({name:x.name,look:x.look,at:[30+i*20,70] as [number,number]}))],
        steps:[{narrate:T(r.ending.lines[0]!)},...NP_TEMPER.map(n=>({narrate:T(n.line),when:n.flag} as ScriptStep)),...mates(1).map(x=>({say:x.name,line:T('{세력}의 이름이 천하에 남았습니다.')} as ScriptStep)),{say:'사마의',line:'기다린 것도, 일어선 것도 모두 오늘을 위해서였다.'}]}]};
  }
  const fate=/^fate:(2|3):(np\w*)$/.exec(id);
  if(fate){const act=Number(fate[1]) as 2|3,parent=fate[2]!,routes=ROUTES.filter(r=>r.custom&&r.act===act&&r.after?.includes(parent));if(!routes.length)return undefined;
    const p=fatePoint(act,act===2?{1:parent}:{1:'np1',2:parent}),m=mates(2);
    const options:ChoiceOption[]=routes.map(r=>({id:r.id,text:T(r.choice),note:T(r.detail).slice(0,40),reply:T(r.choice.split(' — ')[0]!)+'. 그렇게 하겠다.'}));
    return {id,year:p.year,title:p.title,synopsis:T(p.prompt),history:[T(p.prompt).slice(0,140),T('어느 길이든 {세력}이 걷는 길이다. 되돌아갈 곳은 없다.')],
      scenes:[{place:T('{세력}의 군막'),art:14,cast:[{name:'사마의',look:'strategist',at:[40,64],face:'right'},...m.map((x,i)=>({name:x.name,look:x.look,at:[60+i*12,58+i*6] as [number,number]}))],
        steps:[{narrate:T(p.prompt).slice(0,140)},...(m[0]?[{say:m[0].name,line:'주공, 어디로 가시렵니까?'}] as ScriptStep[]:[]),{choice:'사마의',options}]}]};
  }
  return undefined;
}
/** 갈림길 ① 장면에 더할 선택지(신세력 회차에서만). */
export function foundingOption():ChoiceOption{const r=routeById('np1')!;return {id:'np1',text:T(r.choice),note:'신세력 · 가상',reply:T('남의 깃발 아래서 기다리는 것도 이제 그만이다. {세력}의 깃발을 들겠다.')};}
