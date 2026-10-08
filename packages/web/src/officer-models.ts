import type {Unit} from '../../core/src/index.ts';

export interface OfficerFrameSet {
  sheet:string;
  row:number;
  rows:number;
}

export interface OfficerBattleModel {
  action:OfficerFrameSet;
  walk:OfficerFrameSet;
  sideWalk:OfficerFrameSet;
}

export const officerModelSheets=[
  {id:'officer-battle-sima',url:'officer-battle-sima-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
  {id:'officer-battle-wei',url:'officer-battle-wei-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
  {id:'officer-battle-rivals',url:'officer-battle-rivals-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
] as const;

const byKey:Record<string,OfficerBattleModel>={};
const groups=[
  {sheet:'officer-battle-sima',officers:[['sima_yi','사마의'],['sima_yi_young','소년 사마의'],['sima_lang','사마랑'],['sima_fang','사마방']]},
  {sheet:'officer-battle-wei',officers:[['cao_zhen','조진'],['cao_cao','조조'],['cao_pi','조비'],['xu_chu','허저']]},
  {sheet:'officer-battle-rivals',officers:[['ma_chao','마초'],['lu_bu','여포'],['chen_gong','진궁'],['zhou_yu','주유']]},
] as const;
groups.forEach(({sheet,officers})=>officers.forEach(([id,name],row)=>{
  const model:OfficerBattleModel={
    action:{sheet,row,rows:4},
    // 새 시트의 1·2열(대기·한 걸음)을 번갈아 전·측면 보행에 공용한다.
    walk:{sheet,row,rows:4},
    sideWalk:{sheet,row,rows:4},
  };
  byKey[id]=model;byKey[name]=model;
}));

const plain=(name:string)=>name.replace(/의?\s*환영$/,'').trim();
export function officerBattleModel(u:Pick<Unit,'id'|'name'>){return byKey[u.id]??byKey[plain(u.name)];}

/** CSS 카드·일기토가 쓰는 첫 자세. */
export function officerModelStyle(u:Pick<Unit,'id'|'name'>){
  const model=officerBattleModel(u);if(!model)return undefined;
  const {sheet,row,rows}=model.action,frame=0;
  return `background-image:url(${officerModelSheets.find(s=>s.id===sheet)!.url});background-size:400% ${rows*100}%;background-position:${frame/3*100}% ${rows>1?row/(rows-1)*100:0}%`;
}
