import {familyOf,tierOf,type Unit} from '../../core/src/index.ts';
import {romanceOf} from './romance.ts';

export interface OfficerFrameSet {sheet:string;row:number;rows:number;cell?:readonly [number,number]}
export interface OfficerBattleModel {action:OfficerFrameSet;walk:OfficerFrameSet;sideWalk:OfficerFrameSet;fallback?:OfficerBattleModel}
type OfficerLike=Pick<Unit,'id'|'name'>&Partial<Pick<Unit,'unitClass'>>;
type BattleDef={sheet:string;cell:readonly [number,number];rows:number};
export type OfficerEntry={id:string;name:string;aliases:string[];battle:Record<string,BattleDef>;story?:string;bust?:string;duel?:string};

const E=(id:string,name:string,classes:Record<string,[string,number,number,number]>,extra:Partial<OfficerEntry>={}):OfficerEntry=>({
  id,name,aliases:[`${name}의 환영`],battle:Object.fromEntries(Object.entries(classes).map(([k,[sheet,w,h,rows]])=>[k,{sheet:`officers/${sheet}`,cell:[w,h] as const,rows}])),...extra,
});
const c=(id:string,cls:string,rows=1,w=280,h=224)=>({[cls]:[`${id}-battle-${cls}-v1.webp`,w,h,rows] as [string,number,number,number]});

/** public/officers/manifest.json과 같은 내장 색인. JSON을 못 읽는 테스트·오프라인 빌드도 동일하게 찾는다. */
export const officerManifest:OfficerEntry[]=[
  E('sima_yi','사마의',c('sima_yi','strategist',4),{story:'sima_yi-story-v1.webp',bust:'sima_yi-bust-v1.webp',duel:'officer-battle-sima-v2.webp'}),
  E('sima_yi_young','소년 사마의',c('sima_yi_young','strategist',4),{story:'sima_yi_young-story-v1.webp',bust:'sima_yi_young-bust-v1.webp',duel:'officer-battle-sima-v2.webp'}),
  E('cao_zhen','조진',c('cao_zhen','heavyCav',4,350,280),{story:'cao_zhen-story-v1.webp',bust:'cao_zhen-bust-v1.webp',duel:'officer-battle-wei-v2.webp'}),
  E('sima_lang','사마랑',c('sima_lang','infantry',4),{story:'sima_lang-story-v1.webp',bust:'sima_lang-bust-v1.webp',duel:'officer-battle-sima-v2.webp'}),
  E('sima_fang','사마방',c('sima_fang','spearman',4),{story:'sima_fang-story-v1.webp',bust:'sima_fang-bust-v1.webp',duel:'officer-battle-sima-v2.webp'}),
  E('sima_shi','사마사',c('sima_shi','cavalry',4),{story:'sima_shi-story-v1.webp',bust:'sima_shi-bust-v1.webp',duel:'officers/sima_shi-duel-v1.webp'}),
  E('sima_zhao','사마소',c('sima_zhao','crossbow',4,350,280),{story:'sima_zhao-story-v1.webp',bust:'sima_zhao-bust-v1.webp',duel:'officers/sima_zhao-duel-v1.webp'}),
  E('cao_cao','조조',c('cao_cao','lord',1,350,280),{story:'cao_cao-story-v1.webp',bust:'cao_cao-bust-v1.webp',duel:'officers/cao_cao-duel-v1.webp'}),
  E('cao_pi','조비',c('cao_pi','lord',1,350,280),{story:'cao_pi-story-v1.webp',bust:'cao_pi-bust-v1.webp',duel:'officers/cao_pi-duel-v1.webp'}),
  E('cao_rui','조예',c('cao_rui','lord',1,350,280),{duel:'officers/cao_rui-duel-v1.webp'}),
  E('xu_chu','허저',c('xu_chu','infantry'),{story:'xu_chu-story-v1.webp',bust:'xu_chu-bust-v1.webp',duel:'officer-battle-wei-v2.webp'}),
  E('ma_chao','마초',{...c('ma_chao','cavalry'),...c('ma_chao','heavyCav',1,350,280)},{story:'ma_chao-story-v1.webp',bust:'ma_chao-bust-v1.webp',duel:'officer-battle-rivals-v2.webp'}),
  E('lu_bu','여포',{...c('lu_bu','cavalry'),...c('lu_bu','heavyCav',1,350,280)},{story:'lu_bu-story-v1.webp',bust:'lu_bu-bust-v1.webp',duel:'officers/lu_bu-duel-v2.webp'}),
  E('xiang_yu','항우',c('xiang_yu','lord',1,350,280),{duel:'officers/xiang_yu-duel-v1.webp'}),
  E('chen_gong','진궁',c('chen_gong','strategist'),{story:'chen_gong-story-v1.webp',bust:'chen_gong-bust-v1.webp',duel:'officer-battle-rivals-v2.webp'}),
  E('zhou_yu','주유',{...c('zhou_yu','strategist'),...c('zhou_yu','archer',1,350,280)},{story:'zhou_yu-story-v1.webp',bust:'zhou_yu-bust-v1.webp',duel:'officer-battle-rivals-v2.webp'}),
  E('liu_bei','유비',c('liu_bei','lord',1,350,280),{duel:'officers/liu_bei-duel-v1.webp'}),E('guan_yu','관우',c('guan_yu','cavalry'),{duel:'officers/guan_yu-duel-v1.webp'}),E('zhang_fei','장비',c('zhang_fei','spearman')),
  E('wooden_zhuge','제갈량',{...c('wooden_zhuge','strategist'),cart:['zhuge_liang-battle-cart-v1.webp',280,224,1]},{aliases:['zhuge_liang','제갈량의 환영'],duel:'officers/wooden_zhuge-duel-v1.webp'}),E('zhao_yun','조운',{...c('zhao_yun','cavalry'),...c('zhao_yun','heavyCav',1,350,280)},{duel:'officers/zhao_yun-duel-v1.webp'}),
  E('huang_zhong','황충',c('huang_zhong','archer',1,350,280),{duel:'officers/huang_zhong-duel-v1.webp'}),E('wei_yan','위연',c('wei_yan','infantry'),{duel:'officers/wei_yan-duel-v1.webp'}),E('jiang_wei','강유',c('jiang_wei','cavalry'),{duel:'officers/jiang_wei-duel-v1.webp'}),E('pang_tong','방통',c('pang_tong','strategist'),{duel:'officers/pang_tong-duel-v1.webp'}),
  E('xiahou_dun','하후돈',c('xiahou_dun','cavalry'),{duel:'officers/xiahou_dun-duel-v1.webp'}),E('xiahou_yuan','하후연',c('xiahou_yuan','horseArcher'),{duel:'officers/xiahou_yuan-duel-v1.webp'}),E('zhang_liao','장료',c('zhang_liao','cavalry'),{duel:'officers/zhang_liao-duel-v1.webp'}),E('xu_huang','서황',c('xu_huang','heavyCav',1,350,280),{duel:'officers/xu_huang-duel-v1.webp'}),
  E('zhang_he','장합',c('zhang_he','cavalry'),{duel:'officers/zhang_he-duel-v1.webp'}),E('cao_ren','조인',c('cao_ren','heavyCav',1,350,280),{duel:'officers/cao_ren-duel-v1.webp'}),E('xun_yu','순욱',c('xun_yu','strategist'),{duel:'officers/xun_yu-duel-v1.webp'}),E('sun_quan','손권',c('sun_quan','lord',1,350,280),{duel:'officers/sun_quan-duel-v1.webp'}),
  E('lu_xun','육손',c('lu_xun','strategist'),{duel:'officers/lu_xun-duel-v1.webp'}),E('lu_meng','여몽',{...c('lu_meng','cavalry'),...c('lu_meng','infantry')},{duel:'officers/lu_meng-duel-v1.webp'}),E('gan_ning','감녕',c('gan_ning','bandit',1,350,280),{duel:'officers/gan_ning-duel-v1.webp'}),E('lu_su','노숙',c('lu_su','strategist'),{duel:'officers/lu_su-duel-v1.webp'}),
  E('huang_gai','황개',c('huang_gai','infantry'),{duel:'officers/huang_gai-duel-v1.webp'}),E('meng_huo','맹획',c('meng_huo','elephant'),{duel:'officers/meng_huo-duel-v1.webp'}),E('zhu_rong','축융',c('zhu_rong','assassin',1,350,280),{duel:'officers/zhu_rong-duel-v1.webp'}),
  E('gongsun_yuan','공손연',c('gongsun_yuan','lord',1,350,280),{duel:'officers/gongsun_yuan-duel-v1.webp'}),E('yuan_tan','원담',c('yuan_tan','lord',1,350,280),{duel:'officers/yuan_tan-duel-v1.webp'}),E('yuan_shang','원상',c('yuan_shang','lord',1,350,280),{duel:'officers/yuan_shang-duel-v1.webp'}),E('liu_bang','유방',c('liu_bang','lord',1,350,280)),
  E('yang_ang','양앙',c('yang_ang','infantry'),{duel:'officers/yang_ang-duel-v1.webp'}),E('lu_fan','여범',c('lu_fan','crossbow'),{duel:'officers/lu_fan-duel-v1.webp'}),E('sun_shao','손소',c('sun_shao','crossbow'),{duel:'officers/sun_shao-duel-v1.webp'}),
  E('meng_da','맹달',c('meng_da','infantry'),{duel:'officers/meng_da-duel-v1.webp'}),E('ma_su','마속',c('ma_su','strategist'),{duel:'officers/ma_su-duel-v1.webp'}),E('wang_ping','왕평',c('wang_ping','infantry'),{duel:'officers/wang_ping-duel-v1.webp'}),
  E('gao_xiang','고상',c('gao_xiang','infantry'),{duel:'officers/gao_xiang-duel-v1.webp'}),E('meng_yan','맹염',c('meng_yan','cavalry',1,350,280),{duel:'officers/meng_yan-duel-v1.webp'}),E('bi_yan','비연',c('bi_yan','cavalry',1,350,280),{duel:'officers/bi_yan-duel-v1.webp'}),
  E('zhu_ran','주연',c('zhu_ran','infantry'),{duel:'officers/zhu_ran-duel-v1.webp'}),E('zhuge_ke','제갈각',c('zhuge_ke','strategist'),{duel:'officers/zhuge_ke-duel-v1.webp'}),E('wang_ling','왕릉',c('wang_ling','infantry'),{duel:'officers/wang_ling-duel-v1.webp'}),
];

const legacySheets=[
  {id:'officer-battle-sima',url:'officer-battle-sima-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
  {id:'officer-battle-wei',url:'officer-battle-wei-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
  {id:'officer-battle-rivals',url:'officer-battle-rivals-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
] as const;
/** 전장에서 장수는 같은 병종 병사와 같은 키로 선다(병사 아틀라스 실측: 대부분 칸 높이의 0.6, 중기병 0.69).
 * 칸을 가로 1.5배로 넓혀, 창·칼을 길게 내지른 공격 자세 때문에 몸 전체가 줄어들지 않게 한다. */
const officerFit=(cls:string)=>({height:cls==='heavyCav'?.69:cls==='cart'?.7:.6,aspect:1.5});
const generatedSheets=officerManifest.flatMap(e=>Object.entries(e.battle).map(([cls,b])=>({id:b.sheet,url:b.sheet,rows:b.rows,strictGrid:true as const,alphaCutoff:8,fit:officerFit(cls)})));
export const officerModelSheets=[...legacySheets,...generatedSheets];

const legacy=new Map<string,OfficerBattleModel>();
for(const [sheet,officers] of [
  ['officer-battle-sima',[['sima_yi','사마의'],['sima_yi_young','소년 사마의'],['sima_lang','사마랑'],['sima_fang','사마방']]],
  ['officer-battle-wei',[['cao_zhen','조진'],['cao_cao','조조'],['cao_pi','조비'],['xu_chu','허저']]],
  ['officer-battle-rivals',[['ma_chao','마초'],['lu_bu','여포'],['chen_gong','진궁'],['zhou_yu','주유']]],
] as const)officers.forEach(([id,name],row)=>{const set={sheet,row,rows:4};const model={action:set,walk:set,sideWalk:set};legacy.set(id,model);legacy.set(name,model);});

const plain=(name:string)=>name.replace(/의?\s*환영$/,'').trim();
const byKey=new Map<string,OfficerEntry>();
for(const e of officerManifest)for(const k of [e.id,e.name,...e.aliases])byKey.set(k,e);

export function officerEntry(u:OfficerLike):OfficerEntry|undefined{
  const direct=byKey.get(u.id)??byKey.get(u.name)??byKey.get(plain(u.name));if(direct)return direct;
  const r=romanceOf(u);return r?byKey.get(r.name):undefined;
}
const classKey=(u:OfficerLike,e:OfficerEntry)=>{if(u.id==='wooden_zhuge'&&e.battle.cart)return 'cart';const cls=u.unitClass;if(cls&&e.battle[cls])return cls;if(cls){const family=familyOf(cls);if(family==='lord'&&e.battle.lord)return 'lord';if(e.battle[family])return family;}return e.battle.lord?'lord':Object.keys(e.battle)[0]!;};
export function officerBattleSheet(u:OfficerLike):OfficerBattleModel|undefined{
  const e=officerEntry(u);if(!e)return undefined;const b=e.battle[classKey(u,e)];if(!b)return undefined;
  // 장수는 병종이 진화해도 모습은 그대로다(능력치·책략·부대효과만 진화를 따른다). 단계별 줄이 있는 시트도 첫 줄만 쓴다.
  const row=0;
  const set={sheet:b.sheet,row,rows:b.rows,cell:b.cell};const fallback=legacy.get(e.id);
  return {action:set,walk:set,sideWalk:set,...(fallback?{fallback}:{})};
}
export const officerBattleModel=officerBattleSheet;

const duelRows:Record<string,{sheet:string;row:number;rows:number}>={
  sima_yi:{sheet:'officer-battle-sima',row:0,rows:4},sima_yi_young:{sheet:'officer-battle-sima',row:1,rows:4},sima_lang:{sheet:'officer-battle-sima',row:2,rows:4},sima_fang:{sheet:'officer-battle-sima',row:3,rows:4},
  cao_zhen:{sheet:'officer-battle-wei',row:0,rows:4},cao_cao:{sheet:'officers/cao_cao-duel-v1.webp',row:0,rows:1},cao_pi:{sheet:'officers/cao_pi-duel-v1.webp',row:0,rows:1},xu_chu:{sheet:'officer-battle-wei',row:3,rows:4},
  ma_chao:{sheet:'officer-battle-rivals',row:0,rows:4},lu_bu:{sheet:'officers/lu_bu-duel-v2.webp',row:0,rows:1},chen_gong:{sheet:'officer-battle-rivals',row:2,rows:4},zhou_yu:{sheet:'officer-battle-rivals',row:3,rows:4},
  xiang_yu:{sheet:'officers/xiang_yu-duel-v1.webp',row:0,rows:1},
  sima_shi:{sheet:'officers/sima_shi-duel-v1.webp',row:0,rows:1},sima_zhao:{sheet:'officers/sima_zhao-duel-v1.webp',row:0,rows:1},
  huang_zhong:{sheet:'officers/huang_zhong-duel-v1.webp',row:0,rows:1},zhao_yun:{sheet:'officers/zhao_yun-duel-v1.webp',row:0,rows:1},sun_quan:{sheet:'officers/sun_quan-duel-v1.webp',row:0,rows:1},lu_meng:{sheet:'officers/lu_meng-duel-v1.webp',row:0,rows:1},wei_yan:{sheet:'officers/wei_yan-duel-v1.webp',row:0,rows:1},lu_xun:{sheet:'officers/lu_xun-duel-v1.webp',row:0,rows:1},gongsun_yuan:{sheet:'officers/gongsun_yuan-duel-v1.webp',row:0,rows:1},
  yang_ang:{sheet:'officers/yang_ang-duel-v1.webp',row:0,rows:1},lu_fan:{sheet:'officers/lu_fan-duel-v1.webp',row:0,rows:1},sun_shao:{sheet:'officers/sun_shao-duel-v1.webp',row:0,rows:1},meng_da:{sheet:'officers/meng_da-duel-v1.webp',row:0,rows:1},ma_su:{sheet:'officers/ma_su-duel-v1.webp',row:0,rows:1},wang_ping:{sheet:'officers/wang_ping-duel-v1.webp',row:0,rows:1},gao_xiang:{sheet:'officers/gao_xiang-duel-v1.webp',row:0,rows:1},meng_yan:{sheet:'officers/meng_yan-duel-v1.webp',row:0,rows:1},bi_yan:{sheet:'officers/bi_yan-duel-v1.webp',row:0,rows:1},zhu_ran:{sheet:'officers/zhu_ran-duel-v1.webp',row:0,rows:1},zhuge_ke:{sheet:'officers/zhuge_ke-duel-v1.webp',row:0,rows:1},wang_ling:{sheet:'officers/wang_ling-duel-v1.webp',row:0,rows:1},
  guan_yu:{sheet:'officers/guan_yu-duel-v1.webp',row:0,rows:1},zhang_liao:{sheet:'officers/zhang_liao-duel-v1.webp',row:0,rows:1},zhang_he:{sheet:'officers/zhang_he-duel-v1.webp',row:0,rows:1},xiahou_dun:{sheet:'officers/xiahou_dun-duel-v1.webp',row:0,rows:1},jiang_wei:{sheet:'officers/jiang_wei-duel-v1.webp',row:0,rows:1},xiahou_yuan:{sheet:'officers/xiahou_yuan-duel-v1.webp',row:0,rows:1},xu_huang:{sheet:'officers/xu_huang-duel-v1.webp',row:0,rows:1},cao_ren:{sheet:'officers/cao_ren-duel-v1.webp',row:0,rows:1},
  liu_bei:{sheet:'officers/liu_bei-duel-v1.webp',row:0,rows:1},cao_rui:{sheet:'officers/cao_rui-duel-v1.webp',row:0,rows:1},yuan_tan:{sheet:'officers/yuan_tan-duel-v1.webp',row:0,rows:1},yuan_shang:{sheet:'officers/yuan_shang-duel-v1.webp',row:0,rows:1},gan_ning:{sheet:'officers/gan_ning-duel-v1.webp',row:0,rows:1},huang_gai:{sheet:'officers/huang_gai-duel-v1.webp',row:0,rows:1},zhu_rong:{sheet:'officers/zhu_rong-duel-v1.webp',row:0,rows:1},meng_huo:{sheet:'officers/meng_huo-duel-v1.webp',row:0,rows:1},lu_su:{sheet:'officers/lu_su-duel-v1.webp',row:0,rows:1},pang_tong:{sheet:'officers/pang_tong-duel-v1.webp',row:0,rows:1},xun_yu:{sheet:'officers/xun_yu-duel-v1.webp',row:0,rows:1},wooden_zhuge:{sheet:'officers/wooden_zhuge-duel-v1.webp',row:0,rows:1},
};
export function officerDuelModel(u:OfficerLike){const e=officerEntry(u);return e?duelRows[e.id]:undefined;}
/** 말을 탄 대결 모델(일기토에서 말 탄 크기·말 흔들림). 나머지 대결 모델은 걸어서 싸운다. */
const MOUNTED_DUEL=new Set(['ma_chao','lu_bu','sima_shi','cao_cao','cao_pi','zhao_yun','sun_quan','lu_meng','gongsun_yuan','meng_yan','bi_yan','guan_yu','zhang_liao','zhang_he','xiahou_dun','jiang_wei','xiahou_yuan','xu_huang','cao_ren','liu_bei','cao_rui','yuan_tan','yuan_shang']);
export function officerDuelMounted(u:OfficerLike){const e=officerEntry(u);return !!e&&!!duelRows[e.id]&&MOUNTED_DUEL.has(e.id);}

/**
 * 대결 그림 맞춤: 시트마다 발끝 높이(256칸 기준)와 대기 자세 키가 달라(옛 시트 발끝 246~256, 새 시트 229~230 /
 * 기마 조운 135 ~ 여포 230) 같은 무대에서 발이 뜨거나 키가 들쭉날쭉했다. 발끝을 230에 맞추고, 도보는 키 182·기마는 205에
 * 가깝게(0.8~1.3배 안에서) 늘이거나 줄인다. 값은 원본 시트를 잰 것이다.
 */
const DUEL_FIT:Record<string,readonly [number,number]>={sima_yi:[248,228],sima_yi_young:[256,238],sima_lang:[256,256],sima_fang:[237,237],cao_zhen:[256,231],xu_chu:[242,242],ma_chao:[236,216],chen_gong:[235,180],zhou_yu:[222,180],lu_bu:[243,230],zhuge_ke:[229,182],cao_pi:[248,206],lu_fan:[229,183],sun_quan:[230,184],huang_zhong:[230,184],sima_shi:[246,236],sun_shao:[229,183],meng_yan:[229,183],bi_yan:[230,174],zhu_ran:[229,177],sima_zhao:[246,236],wang_ling:[229,163],cao_cao:[248,203],yang_ang:[229,184],meng_da:[229,187],wang_ping:[229,183],gao_xiang:[229,177],zhao_yun:[230,135],lu_meng:[230,158],gongsun_yuan:[230,175],xiang_yu:[248,221],lu_xun:[230,169],wei_yan:[230,176],ma_su:[229,174]};
const DUEL_FOOT=230,DUEL_FOOT_H=182,DUEL_MOUNT_H=205;
function duelFitStyle(id:string){
  const f=DUEL_FIT[id];if(!f)return '';
  const [foot,h]=f,k=Math.max(.8,Math.min(1.3,(MOUNTED_DUEL.has(id)?DUEL_MOUNT_H:DUEL_FOOT_H)/h));
  return `;transform-origin:50% ${(foot/256*100).toFixed(1)}%;translate:0 ${((DUEL_FOOT-foot)/256*100).toFixed(2)}%;scale:${k.toFixed(3)}`;
}
export function officerDuelModelStyle(u:OfficerLike,frame=0){const set=officerDuelModel(u);if(!set)return undefined;const def=officerModelSheets.find(s=>s.id===set.sheet);const url=def?.url??set.sheet,x=Math.max(0,Math.min(3,frame))/3*100,y=set.rows>1?set.row/(set.rows-1)*100:0;return `--officer-x:${x}%;--officer-y:${y}%;background-image:url(${url});background-size:400% ${set.rows*100}%;background-position:var(--officer-x) var(--officer-y)${duelFitStyle(officerEntry(u)!.id)}`;}
/** 이전 호출부 호환: 대결용 상세 모델의 첫 자세. */
export const officerModelStyle=(u:OfficerLike)=>officerDuelModelStyle(u,0);
