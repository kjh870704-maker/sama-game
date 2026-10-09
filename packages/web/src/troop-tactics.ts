import {classTraitSummary} from './perks.ts';
import {matchupMultiplier,familyOf,tierOf,VARIANTS,getTrait,type Unit,type UnitClass} from '../../core/src/index.ts';
import type {TrialLandscape} from './expedition-scenes.ts';
import {expeditionLandscape} from './expedition-scenes.ts';
import {trialGoals} from './expedition-objectives.ts';
export const troopAdvice:Partial<Record<UnitClass,string>>={
 infantry:'창병을 상대하는 전열. 숲과 성채를 활용하고 적 기병과의 정면전을 피하세요.',
 spearman:'기병·중기병을 막는 전열. 구릉에서 싸우고 적 보병은 사격 부대에 맡기세요.',
 cavalry:'평지·도로로 우회해 궁병과 책사를 압박하세요. 산지는 이동 6이 들어 한 칸이 한계이고, 갈대늪에서는 힘을 못 씁니다. 여울은 말로 건널 수 있습니다.',
 heavyCav:'평지 돌파에 강한 중장 부대. 산지·갈대늪·잔도에는 들어갈 수 없고 숲에서는 느립니다.',
 archer:'2칸 거리에서 전열 뒤를 지원하세요. 인접한 적은 쏠 수 없습니다.',
 crossbow:'2~3칸 사격으로 중기병을 견제하세요. 이동 4이므로 미리 위치를 잡으세요.',
 strategist:'후열에서 공격·교란 책략을 사용하세요. 레벨별 습득 책략과 남은 MP를 확인하세요.',
 fengshui:'후열 책략 부대. 치유 아이템 명령과 습득한 책략으로 전열을 지원하세요.',
 shaman:'독·봉인·혼란은 해당 책략 습득 후 활용하세요. 초반에는 화계로 전열을 지원합니다.',
 maiden:'소회복으로 아군을 보조하고 성장 후 정화·견고·고무를 활용하세요.',
 taoist:'바람·물·번개 책략을 단계적으로 습득합니다. 전열 뒤에서 MP를 관리하세요.',
 monk:'숲·잔도 이동 비용 1, 갈대늪·여울 2. 근접 전투와 소회복을 조합하고 기병과의 정면전을 피하세요.',
 horseArcher:'이동 6, 사거리 2~3. 평지에서 측면 사격하세요. 산지는 사실상 한 칸, 여울은 건널 수 있습니다.',
 bandit:'숲·잔도 이동 비용 1, 갈대늪 2. 험지와 갈대 속에서 매복하세요. 방어가 약하므로 지원 부대와 함께 움직이세요.',
 ram:'이동 3. 도로로 접근해 성문·감시탑을 공격하세요. 산지·갈대늪·잔도·여울에는 들어갈 수 없습니다.',
 catapult:'2~4칸 원거리 사격. 산지·갈대늪·잔도·여울에는 들어갈 수 없으니 길을 따라 전열 뒤에 두세요.',
 engineer:'공성 지원 부대. 인접한 충차·포차·방책·성문을 수리하고, 빈 칸에 방책을 세워(전투당 2회) 사격로를 막으세요.',
 navy:'물길 전용 부대. 1~2칸 공격, 수상에서 강합니다. 급류는 이동 3이 들어 발이 묶이고, 갈대늪·여울은 지날 수 있습니다. 육지·교량은 불가.',
 civilian:'전투를 피하고 호위하세요. 무장 전환 등 해당 시나리오의 목표를 따르세요.'
};
export const recommendedSupport:Record<TrialLandscape,{classes:[UnitClass,UnitClass];reason:string}>={
 field:{classes:['archer','fengshui'],reason:'궁병이 전열 뒤에서 보병·창병을 사격하고 풍수사가 아군을 회복합니다.'},
 forest:{classes:['bandit','fengshui'],reason:'산적의 숲 기동과 풍수사의 회복으로 좁은 보급로를 지킵니다.'},
 river:{classes:['crossbow','maiden'],reason:'노병이 교량 너머를 사격하고 무녀가 전열을 회복합니다.'},
 pass:{classes:['monk','crossbow'],reason:'무도가가 험지를 통과하고 노병이 협로 뒤에서 지원합니다. 회복 MP를 아껴 쓰세요.'},
 court:{classes:['shaman','fengshui'],reason:'주술사의 화계·성장 책략으로 수비대를 약화하고 풍수사로 버팁니다.'},
 fort:{classes:['catapult','engineer'],reason:'포차가 감시탑을 사격하고 공병이 충차를 수리하며 방책으로 사격을 막아 성문에 접근합니다.'},
 naval:{classes:['crossbow','fengshui'],reason:'수군 두 척이 물길을 막는 동안 노병이 강안에서 적선을 사격하고 풍수사가 부교를 건너는 전열을 회복합니다.'}
};
export function recommendExpeditionSupport(id:string):{classes:[UnitClass,UnitClass];reason:string}{
 const terrain=expeditionLandscape(id),goal=trialGoals[id]?.kind;
 if(goal==='defend')return {classes:['spearman','fengshui'],reason:'창병으로 거점과 증원 기병을 막고 풍수사로 수비 부대를 회복합니다. 두 방어 칸을 모두 지키세요.'};
 if(goal==='rescue')return {classes:[terrain==='forest'?'bandit':'monk','fengshui'],reason:'험지에 강한 전열로 구출 경로를 열고 풍수사로 귀환하는 대상을 회복합니다. 사마의 또는 조진이 대상에게 접근해야 합니다.'};
 return recommendedSupport[terrain];
}
export function supportWarnings(units:Unit[]){const warnings:string[]=[];
 if(!units.some(u=>u.strategies.includes('mend')||u.strategies.includes('greatMend')||familyOf(u.unitClass)==='fengshui'))warnings.push('회복 담당이 없습니다. 구급약 소모와 전열 체력에 유의하세요.');
 if(!units.some(u=>u.range[1]>=2))warnings.push('원거리 물리 사격 부대가 없습니다. 적 사격대에 접근할 경로를 확보하세요.');
 return warnings;
}
export function physicalMatchup(a:UnitClass,d:UnitClass){const m=1+(matchupMultiplier(a,d)-1)*.5;// 균형 규칙 6(새 전투)의 상성: 절반만 반영
  return '물리 병종 상성 ×'+m.toFixed(2)+(m>1?' · 유리':m<1?' · 불리':' · 보통');}

/** 확장 병종은 계열의 운용법에 개화 스킬(또는 고유 특성) 한 줄을 붙인다. */
export function adviceFor(c:UnitClass):string{
  const own=troopAdvice[c];if(own)return own;
  const v=VARIANTS[c],tier=tierOf(c);
  const skill=v?.bloom?`개화 「${v.bloom.name}」 ${classTraitSummary(v.traits)||v.bloom.description}. `:v?.traits?`고유 특성: ${Object.keys(v.traits).map(t=>getTrait(t).name).join(' · ')}. `:'';
  return `${tier>1?`${tier}단계 진화 병종. `:''}${skill}${troopAdvice[familyOf(c)]??''}`;
}
