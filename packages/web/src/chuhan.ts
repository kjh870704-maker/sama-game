/**
 * 초한의 선대 영웅 — 사마의보다 사백 년 앞서 진이 무너진 뒤 천하를 다툰 사람들.
 *
 * 그들은 사마의의 부대에 들어오지 않는다. 대신 '계승'으로 남는다: 천명을 바쳐 한 영웅의 뜻(유산)을 열어 두면,
 * 회차마다 그 가운데 하나를 골라 그 영웅의 힘을 빌려 싸운다(로그라이크의 영구 해금 + 회차별 선택).
 * 열리는 조건은 회차·연의 전장·결말이라, 여러 생을 거칠수록 더 많은 영웅이 길을 열어 준다.
 * 초상은 옛 초한지 인물화풍(portrait.ts)으로, 이름난 영웅은 사서·전승의 모습에 맞춰 둔다
 * (항우의 패왕 투구와 겹눈동자, 유방이 만들어 썼다는 유씨관과 긴 수염, 여인 같았다는 장량의 고운 얼굴).
 */
import type {MetaState} from './meta.ts';
import type {PerkGrant} from './perks.ts';
import type {PortraitSpec} from './portrait.ts';
import type {Gate} from './research.ts';
import {gateOpen} from './research.ts';
import {perkText} from './perks.ts';

export const CHU=['항우','범증','우희','종리매','계포','용저'] as const;
export const HAN=['유방','장량','한신','소하','진평','번쾌','조참','관영','영포','팽월'] as const;
export const CHUHAN:readonly string[]=[...CHU,...HAN];
export const isChuHan=(name:string)=>CHUHAN.includes(name);

/** 이름난 영웅의 초상(사서·전승의 모습). 나머지는 이름·병종·성격으로 짓는다. */
export const CHUHAN_FACES:Record<string,Partial<PortraitSpec>>={
  항우:{face:2,skin:2,eyes:2,brows:0,mouth:2,beard:3,hair:0,hat:2,robe:3,armor:3,item:3,bg:3,age:0,mark:0},
  유방:{face:1,skin:1,eyes:1,brows:1,mouth:1,beard:4,hair:0,hat:7,robe:1,armor:0,item:2,bg:0,age:1,mark:0},
  장량:{face:0,skin:0,eyes:4,brows:1,mouth:1,beard:0,hair:0,hat:1,robe:6,armor:0,item:4,bg:4,age:0,mark:0},
  한신:{face:0,skin:1,eyes:0,brows:2,mouth:0,beard:1,hair:0,hat:3,robe:0,armor:1,item:2,bg:1,age:0,mark:0},
  소하:{face:3,skin:0,eyes:1,brows:1,mouth:1,beard:4,hair:2,hat:1,robe:5,armor:0,item:4,bg:0,age:2,mark:0},
  범증:{face:1,skin:1,eyes:3,brows:3,mouth:0,beard:4,hair:3,hat:0,robe:3,armor:0,item:1,bg:2,age:2,mark:0},
  우희:{face:0,skin:0,eyes:4,brows:1,mouth:1,beard:0,hair:0,hat:5,robe:4,armor:0,item:2,bg:3,age:0,mark:0},
  영포:{face:2,skin:2,eyes:2,brows:3,mouth:2,beard:2,hair:0,hat:6,robe:3,armor:2,item:2,bg:2,age:1,mark:3},
  번쾌:{face:3,skin:2,eyes:2,brows:0,mouth:2,beard:3,hair:0,hat:3,robe:1,armor:2,item:2,bg:3,age:1,mark:1},
  진평:{face:0,skin:0,eyes:0,brows:2,mouth:1,beard:1,hair:0,hat:4,robe:2,armor:0,item:1,bg:4,age:0,mark:0},
};

/** 계승: 영웅 하나의 유산. 고르면 그 회차의 모든 전투에 실린다. */
export interface Legacy {hero:string;name:string;story:string;cost:number;gate?:Gate;grants:PerkGrant[]}
export const LEGACIES:Legacy[]=[
  {hero:'항우',name:'파부침주',story:'솥을 깨고 배를 가라앉혀 돌아갈 길을 끊었다.',cost:12,gate:{runs:2},grants:[['physicalPower',10],['lastStand',10]]},
  {hero:'유방',name:'약법삼장',story:'법을 세 조로 줄여 민심을 얻었다.',cost:8,gate:{runs:1},grants:[['regen',3],['physicalDamageReduction',5]]},
  {hero:'장량',name:'운주유악',story:'장막 안에서 꾀를 내어 천 리 밖의 승부를 정했다.',cost:12,gate:{chronicle:3},grants:[['strategyPower',10],['strategyEvasion',8]]},
  {hero:'한신',name:'배수진',story:'강을 등지고 진을 쳐 병사들이 죽기로 싸우게 했다.',cost:15,gate:{chronicle:6},grants:[['veteran',12],['chargePower',8],['accuracyBoost',5]]},
  {hero:'소하',name:'관중 보급',story:'관중을 지키며 군량과 병사를 끊이지 않게 보냈다.',cost:10,gate:{runs:3},grants:[['healPower',25],['manaRegen',2]]},
  {hero:'범증',name:'옥결의 신호',story:'옥결을 세 번 들어 결단을 재촉했다.',cost:12,gate:{endings:1},grants:[['strategyPower',8],['critical',6]]},
  {hero:'진평',name:'반간계',story:'금을 뿌려 적의 군신 사이를 갈라놓았다.',cost:10,gate:{runs:4},grants:[['strategyEvasion',10],['evasionBoost',5]]},
  {hero:'번쾌',name:'홍문의 방패',story:'방패를 들고 잔치 장막에 뛰어들어 주군을 지켰다.',cost:10,gate:{chronicle:8},grants:[['counterBoost',20],['defenseBoost',4]]},
  {hero:'우희',name:'패왕별희',story:'사면에서 초나라 노래가 들리던 밤, 마지막 춤을 추었다.',cost:14,gate:{endings:2},grants:[['evasionBoost',8],['turnaround',12]]},
];
export const legacyOf=(hero:string)=>LEGACIES.find(l=>l.hero===hero);
export const legacyText=(l:Legacy)=>l.grants.map(([id,n])=>perkText(id,n)).join(' · ');
export type LegacyState='active'|'owned'|'open'|'locked';
export function legacyState(m:MetaState,l:Legacy):LegacyState{
  if(m.heir===l.hero)return 'active';if(m.legacies?.includes(l.hero))return 'owned';return gateOpen(m,l.gate)?'open':'locked';
}
/** 유산을 연다(천명). 처음 연 유산은 바로 계승한다. */
export function unlockLegacy(m:MetaState,hero:string){
  const l=legacyOf(hero);if(!l||legacyState(m,l)!=='open'||m.mandate<l.cost)return false;
  m.mandate-=l.cost;m.legacies=[...(m.legacies??[]),hero];if(!m.heir)m.heir=hero;return true;
}
/** 계승할 영웅을 고른다(연 유산만). 같은 영웅을 다시 고르면 계승을 내려놓는다. */
export function chooseHeir(m:MetaState,hero:string){
  if(!m.legacies?.includes(hero))return false;if(m.heir===hero)delete m.heir;else m.heir=hero;return true;
}
/** 지금 계승한 유산이 아군 전원에 주는 보정. */
export function heirGrants(m:MetaState):PerkGrant[]{const l=m.heir&&m.legacies?.includes(m.heir)?legacyOf(m.heir):undefined;return l?l.grants.map(([id,n])=>[id,n] as PerkGrant):[];}
