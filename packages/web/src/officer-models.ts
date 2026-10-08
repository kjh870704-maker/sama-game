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
  E('cao_cao','조조',c('cao_cao','infantry'),{story:'cao_cao-story-v1.webp',bust:'cao_cao-bust-v1.webp',duel:'officer-battle-wei-v2.webp'}),
  E('cao_pi','조비',c('cao_pi','strategist'),{story:'cao_pi-story-v1.webp',bust:'cao_pi-bust-v1.webp',duel:'officer-battle-wei-v2.webp'}),
  E('xu_chu','허저',c('xu_chu','infantry'),{story:'xu_chu-story-v1.webp',bust:'xu_chu-bust-v1.webp',duel:'officer-battle-wei-v2.webp'}),
  E('ma_chao','마초',{...c('ma_chao','cavalry'),...c('ma_chao','heavyCav',1,350,280)},{story:'ma_chao-story-v1.webp',bust:'ma_chao-bust-v1.webp',duel:'officer-battle-rivals-v2.webp'}),
  E('lu_bu','여포',{...c('lu_bu','cavalry'),...c('lu_bu','heavyCav',1,350,280)},{story:'lu_bu-story-v1.webp',bust:'lu_bu-bust-v1.webp',duel:'officers/lu_bu-duel-v2.webp'}),
  E('chen_gong','진궁',c('chen_gong','strategist'),{story:'chen_gong-story-v1.webp',bust:'chen_gong-bust-v1.webp',duel:'officer-battle-rivals-v2.webp'}),
  E('zhou_yu','주유',{...c('zhou_yu','strategist'),...c('zhou_yu','archer',1,350,280)},{story:'zhou_yu-story-v1.webp',bust:'zhou_yu-bust-v1.webp',duel:'officer-battle-rivals-v2.webp'}),
  E('liu_bei','유비',c('liu_bei','infantry')),E('guan_yu','관우',c('guan_yu','cavalry')),E('zhang_fei','장비',c('zhang_fei','spearman')),
  E('wooden_zhuge','제갈량',{...c('wooden_zhuge','strategist'),cart:['zhuge_liang-battle-cart-v1.webp',280,224,1]},{aliases:['zhuge_liang','제갈량의 환영']}),E('zhao_yun','조운',{...c('zhao_yun','cavalry'),...c('zhao_yun','heavyCav',1,350,280)}),
  E('huang_zhong','황충',c('huang_zhong','archer',1,350,280)),E('wei_yan','위연',c('wei_yan','infantry')),E('jiang_wei','강유',c('jiang_wei','cavalry')),E('pang_tong','방통',c('pang_tong','strategist')),
  E('xiahou_dun','하후돈',c('xiahou_dun','cavalry')),E('xiahou_yuan','하후연',c('xiahou_yuan','horseArcher')),E('zhang_liao','장료',c('zhang_liao','cavalry')),E('xu_huang','서황',c('xu_huang','heavyCav',1,350,280)),
  E('zhang_he','장합',c('zhang_he','cavalry')),E('cao_ren','조인',c('cao_ren','heavyCav',1,350,280)),E('xun_yu','순욱',c('xun_yu','strategist')),E('sun_quan','손권',c('sun_quan','strategist')),
  E('lu_xun','육손',c('lu_xun','strategist')),E('lu_meng','여몽',{...c('lu_meng','cavalry'),...c('lu_meng','infantry')}),E('gan_ning','감녕',c('gan_ning','bandit',1,350,280)),E('lu_su','노숙',c('lu_su','strategist')),
  E('huang_gai','황개',c('huang_gai','infantry')),E('meng_huo','맹획',c('meng_huo','elephant')),E('zhu_rong','축융',c('zhu_rong','assassin',1,350,280)),
];

const legacySheets=[
  {id:'officer-battle-sima',url:'officer-battle-sima-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
  {id:'officer-battle-wei',url:'officer-battle-wei-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
  {id:'officer-battle-rivals',url:'officer-battle-rivals-v2.webp',rows:4,strictGrid:true,alphaCutoff:8},
] as const;
const generatedSheets=officerManifest.flatMap(e=>Object.values(e.battle).map(b=>({id:b.sheet,url:b.sheet,rows:b.rows,strictGrid:true as const,alphaCutoff:8})));
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
const classKey=(u:OfficerLike,e:OfficerEntry)=>{if(u.id==='wooden_zhuge'&&e.battle.cart)return 'cart';const cls=u.unitClass;if(cls&&e.battle[cls])return cls;if(cls){const family=familyOf(cls);if(e.battle[family])return family;}return Object.keys(e.battle)[0]!;};
export function officerBattleSheet(u:OfficerLike):OfficerBattleModel|undefined{
  const e=officerEntry(u);if(!e)return undefined;const b=e.battle[classKey(u,e)];if(!b)return undefined;
  const row=b.rows>1&&u.unitClass?Math.min(b.rows-1,tierOf(u.unitClass)-1):0;
  const set={sheet:b.sheet,row,rows:b.rows,cell:b.cell};const fallback=legacy.get(e.id);
  return {action:set,walk:set,sideWalk:set,...(fallback?{fallback}:{})};
}
export const officerBattleModel=officerBattleSheet;

const duelRows:Record<string,{sheet:string;row:number;rows:number}>={
  sima_yi:{sheet:'officer-battle-sima',row:0,rows:4},sima_yi_young:{sheet:'officer-battle-sima',row:1,rows:4},sima_lang:{sheet:'officer-battle-sima',row:2,rows:4},sima_fang:{sheet:'officer-battle-sima',row:3,rows:4},
  cao_zhen:{sheet:'officer-battle-wei',row:0,rows:4},cao_cao:{sheet:'officer-battle-wei',row:1,rows:4},cao_pi:{sheet:'officer-battle-wei',row:2,rows:4},xu_chu:{sheet:'officer-battle-wei',row:3,rows:4},
  ma_chao:{sheet:'officer-battle-rivals',row:0,rows:4},lu_bu:{sheet:'officers/lu_bu-duel-v2.webp',row:0,rows:1},chen_gong:{sheet:'officer-battle-rivals',row:2,rows:4},zhou_yu:{sheet:'officer-battle-rivals',row:3,rows:4},
  sima_shi:{sheet:'officers/sima_shi-duel-v1.webp',row:0,rows:1},sima_zhao:{sheet:'officers/sima_zhao-duel-v1.webp',row:0,rows:1},
};
export function officerDuelModel(u:OfficerLike){const e=officerEntry(u);return e?duelRows[e.id]:undefined;}
export function officerDuelModelStyle(u:OfficerLike,frame=0){const set=officerDuelModel(u);if(!set)return undefined;const def=officerModelSheets.find(s=>s.id===set.sheet);const url=def?.url??set.sheet,x=Math.max(0,Math.min(3,frame))/3*100,y=set.rows>1?set.row/(set.rows-1)*100:0;return `--officer-x:${x}%;--officer-y:${y}%;background-image:url(${url});background-size:400% ${set.rows*100}%;background-position:var(--officer-x) var(--officer-y)`;}
/** 이전 호출부 호환: 대결용 상세 모델의 첫 자세. */
export const officerModelStyle=(u:OfficerLike)=>officerDuelModelStyle(u,0);
