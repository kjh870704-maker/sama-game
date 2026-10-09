/**
 * 상편 앞 세 장(S1-01 189년 · S1-02 190년 · S1-03 190년)의 사마의는 열 살 남짓이다.
 * 그동안은 이야기·대화·전투·대결에서 사마의 그림을 「소년 사마의」 그림으로 바꿔 보여 준다.
 * 이름·능력치·유닛은 그대로 사마의다 — 그림만 바뀐다.
 */
const YOUNG_STAGES=new Set(['S1-01','S1-02','S1-03']);
let young=false;

/** 연의 장에 들어갈 때 부른다. 연의 장이 아닌 전투(행군·외전)는 앞 장의 나이를 그대로 잇는다. */
export function setStoryEra(stageId:string|undefined){if(stageId&&/^S\d-\d+$/.test(stageId))young=YOUNG_STAGES.has(stageId);}
/** 본영으로 돌아가면 성인 사마의로 돌아온다. */
export function resetStoryEra(){young=false;}
export const youngSimaYi=()=>young;

const ADULT_KEYS:Record<string,string>={sima_yi:'sima_yi_young','사마의':'소년 사마의','사마의 중달':'소년 사마의','중달':'소년 사마의'};
/** 그림을 찾을 때 쓰는 열쇠(id·이름). 소년 시절 장이면 사마의를 소년 사마의로 바꾼다. */
export function artKey(key:string){return young?ADULT_KEYS[key]??key:key;}
