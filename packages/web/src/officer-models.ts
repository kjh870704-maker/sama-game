import {familyOf,tierOf,type Unit} from '../../core/src/index.ts';
import {romanceOf} from './romance.ts';
import {SD_REDESIGN_OFFICERS,SD_REDESIGN_VERSIONS} from './sd-redesign-batch.ts';

export interface OfficerFrameSet {sheet:string;row:number;rows:number;cell?:readonly [number,number]}
export interface OfficerBattleModel {action:OfficerFrameSet;walk:OfficerFrameSet;sideWalk:OfficerFrameSet;fallback?:OfficerBattleModel}
type OfficerLike=Pick<Unit,'id'|'name'>&Partial<Pick<Unit,'unitClass'>>;
type BattleDef={sheet:string;cell:readonly [number,number];rows:number};
export type OfficerEntry={id:string;name:string;aliases:string[];battle:Record<string,BattleDef>;story?:string;bust?:string;duel?:string};

const E=(id:string,name:string,classes:Record<string,[string,number,number,number]>,extra:Partial<OfficerEntry>={}):OfficerEntry=>({
  id,name,aliases:[`${name}의 환영`],battle:Object.fromEntries(Object.entries(classes).map(([k,[sheet,w,h,rows]])=>[k,{sheet:`officers/${sheet}`,cell:[w,h] as const,rows}])),...extra,
});
const c=(id:string,cls:string,rows=1,w=280,h=224)=>({[cls]:[`${id}-battle-${cls}-v1.webp`,rows===1?280:w,rows===1?224:h,rows] as [string,number,number,number]});

/** public/officers/manifest.json과 같은 내장 색인. JSON을 못 읽는 테스트·오프라인 빌드도 동일하게 찾는다. */
export const officerManifest:OfficerEntry[]=[
  E('sima_yi','사마의',{},{story:'sima_yi-story-v2.webp',bust:'sima_yi-bust-v1.webp'}),
  E('cao_zhen','조진',{},{story:'cao_zhen-story-v2.webp',bust:'cao_zhen-bust-v1.webp'}),
  E('sima_lang','사마랑',{},{story:'sima_lang-story-v2.webp',bust:'sima_lang-bust-v1.webp'}),
  E('sima_fang','사마방',{},{story:'sima_fang-story-v2.webp',bust:'sima_fang-bust-v1.webp'}),
  E('sima_fu','사마부',{}, {aliases:['사마부의 환영'],story:'sima_fu-story-v2.webp'}),
  E('hu_zun','호준',{}, {aliases:['호준의 환영'],story:'hu_zun-story-v2.webp'}),
  E('sima_shi','사마사',{},{story:'sima_shi-story-v2.webp',bust:'sima_shi-bust-v1.webp'}),
  E('sima_zhao','사마소',{},{story:'sima_zhao-story-v2.webp',bust:'sima_zhao-bust-v1.webp'}),
  E('cao_cao','조조',c('cao_cao','lord',1,350,280),{story:'cao_cao-story-v2.webp',bust:'cao_cao-bust-v1.webp',duel:'officers/cao_cao-duel-v1.webp'}),
  E('cao_pi','조비',{},{story:'cao_pi-story-v2.webp',bust:'cao_pi-bust-v1.webp'}),
  E('cao_rui','조예',{}),
  E('xu_chu','허저',{},{story:'xu_chu-story-v2.webp',bust:'xu_chu-bust-v1.webp'}),
  E('ma_chao','마초',{sd:['ma_chao-sd-v1.webp',350,280,1]},{story:'ma_chao-story-v2.webp',bust:'ma_chao-bust-v1.webp',duel:'ma_chao-duel-v2.webp'}),
  E('lu_bu','여포',{...c('lu_bu','cavalry'),...c('lu_bu','heavyCav',1,350,280)},{story:'lu_bu-story-v2.webp',bust:'lu_bu-bust-v1.webp',duel:'officers/lu_bu-duel-v2.webp'}),
  E('xiang_yu','항우',c('xiang_yu','lord',1,350,280),{duel:'officers/xiang_yu-duel-v1.webp'}),
  E('chen_gong','진궁',{},{story:'chen_gong-story-v2.webp',bust:'chen_gong-bust-v1.webp'}),
  E('zhou_yu','주유',{},{story:'zhou_yu-story-v2.webp',bust:'zhou_yu-bust-v1.webp'}),
  E('liu_bei','유비',{sd:['liu_bei-sd-v1.webp',350,280,1]},{duel:'officers/liu_bei-duel-v2.webp'}),E('guan_yu','관우',c('guan_yu','cavalry'),{duel:'officers/guan_yu-duel-v1.webp'}),E('zhang_fei','장비',c('zhang_fei','spearman')),
  E('wooden_zhuge','제갈량',c('wooden_zhuge','strategist'),{aliases:['zhuge_liang','제갈량의 환영'],story:'zhuge_liang-story-v2.webp',duel:'officers/wooden_zhuge-duel-v1.webp'}),E('zhao_yun','조운',{}),
  E('huang_zhong','황충',{}),E('wei_yan','위연',{}),E('jiang_wei','강유',c('jiang_wei','cavalry'),{duel:'officers/jiang_wei-duel-v1.webp'}),E('pang_tong','방통',c('pang_tong','strategist'),{duel:'officers/pang_tong-duel-v1.webp'}),
  E('xiahou_dun','하후돈',{}),E('xiahou_yuan','하후연',{}),E('zhang_liao','장료',{}),E('xu_huang','서황',c('xu_huang','heavyCav',1,350,280),{duel:'officers/xu_huang-duel-v1.webp'}),
  E('zhang_he','장합',{},{story:'zhang_he-story-v2.webp'}),E('cao_ren','조인',{}),E('xun_yu','순욱',c('xun_yu','strategist'),{duel:'officers/xun_yu-duel-v1.webp'}),E('sun_quan','손권',c('sun_quan','lord',1,350,280),{story:'sun_quan-story-v2.webp',duel:'officers/sun_quan-duel-v1.webp'}),
  E('lu_xun','육손',{}),E('lu_meng','여몽',{}),E('gan_ning','감녕',c('gan_ning','bandit',1,350,280),{duel:'officers/gan_ning-duel-v1.webp'}),E('lu_su','노숙',c('lu_su','strategist'),{duel:'officers/lu_su-duel-v1.webp'}),
  E('huang_gai','황개',c('huang_gai','infantry'),{duel:'officers/huang_gai-duel-v1.webp'}),E('meng_huo','맹획',{}),E('zhu_rong','축융',{}),
  E('gongsun_yuan','공손연',c('gongsun_yuan','lord',1,350,280),{duel:'officers/gongsun_yuan-duel-v2.webp'}),E('yuan_tan','원담',c('yuan_tan','lord',1,350,280),{duel:'officers/yuan_tan-duel-v1.webp'}),E('yuan_shang','원상',c('yuan_shang','lord',1,350,280),{duel:'officers/yuan_shang-duel-v1.webp'}),E('liu_bang','유방',c('liu_bang','lord',1,350,280)),
  E('yang_ang','양앙',c('yang_ang','infantry'),{duel:'officers/yang_ang-duel-v2.webp'}),E('lu_fan','여범',c('lu_fan','crossbow'),{duel:'officers/lu_fan-duel-v2.webp'}),E('sun_shao','손소',c('sun_shao','crossbow'),{duel:'officers/sun_shao-duel-v2.webp'}),
  E('meng_da','맹달',{},{story:'meng_da-story-v2.webp'}),E('ma_su','마속',{}),E('wang_ping','왕평',{}),
  E('gao_xiang','고상',{}),E('meng_yan','맹염',c('meng_yan','cavalry'),{duel:'officers/meng_yan-duel-v2.webp'}),E('bi_yan','비연',c('bi_yan','cavalry'),{duel:'officers/bi_yan-duel-v2.webp'}),
  E('zhu_ran','주연',{}),E('zhuge_ke','제갈각',c('zhuge_ke','strategist'),{duel:'officers/zhuge_ke-duel-v2.webp'}),E('wang_ling','왕릉',c('wang_ling','infantry'),{duel:'officers/wang_ling-duel-v2.webp'}),
  E('gao_shou','고수',c('gao_shou','bandit'),{duel:'officers/gao_shou-duel-v1.webp'}),E('guo_huai','곽회',{},{story:'guo_huai-story-v2.webp'}),
  E('dai_ling','대릉',c('dai_ling','infantry'),{duel:'officers/dai_ling-duel-v1.webp'}),E('zhang_zhao','장소',{}),E('zhuge_jin','제갈근',{}),
  E('zhang_ba','장패',c('zhang_ba','cavalry'),{duel:'officers/zhang_ba-duel-v1.webp'}),E('cao_xiu','조휴',c('cao_xiu','cavalry'),{duel:'officers/cao_xiu-duel-v1.webp'}),E('cao_shuang','조상',{}),
  // 이름있는 장수 전용 SD(Codex 2026-10-11): 병종 실루엣과 오른쪽 기본 방향을 통일한 대기·이동·공격·피격 4칸 시트.
  E('jia_xu','가후',c('jia_xu','wheelSage')),E('yu_jin','우금',c('yu_jin','spearman')),E('yue_jin','악진',c('yue_jin','infantry')),E('deng_ai','등애',c('deng_ai','infantry'),{story:'deng_ai-story-v2.webp'}),
  E('zhong_hui','종회',c('zhong_hui','fengshui'),{story:'zhong_hui-story-v2.webp'}),E('hao_zhao','학소',c('hao_zhao','crossbow')),E('cao_hong','조홍',c('cao_hong','infantry')),E('cao_zhang','조창',c('cao_zhang','cavalry')),
  E('wen_ping','문빙',c('wen_ping','spearman')),E('guan_ping','관평',c('guan_ping','infantry')),E('ma_dai','마대',{}),E('xu_sheng','서성',c('xu_sheng','spearman')),
  E('ding_feng','정봉',c('ding_feng','infantry')),E('yan_liang','안량',c('yan_liang','cavalry')),E('wen_chou','문추',c('wen_chou','cavalry')),E('ju_shou','저수',c('ju_shou','strategist')),
  E('tian_feng','전풍',c('tian_feng','strategist')),E('shen_pei','심배',c('shen_pei','strategist')),E('han_xin','한신',c('han_xin','spearman')),E('zhang_liang','장량',c('zhang_liang','strategist')),
  E('xiao_he','소하',c('xiao_he','fengshui')),E('ying_bu','영포',c('ying_bu','cavalry')),E('peng_yue','팽월',c('peng_yue','infantry')),E('fan_kuai','번쾌',c('fan_kuai','cavalry')),
  E('chen_ping','진평',c('chen_ping','strategist')),E('fan_zeng','범증',c('fan_zeng','strategist')),E('zhongli_mo','종리매',c('zhongli_mo','cavalry')),E('ji_bu','계포',c('ji_bu','infantry')),
  E('yu_ji','우희',{assassin:['yu_ji-battle-assassin-v1.webp',280,224,1]},{bust:'yu_ji-bust-v1.webp',duel:'officers/yu_ji-duel-v1.webp'}),
  E('long_ju','용저',{cavalry:['long_ju-battle-cavalry-v1.webp',280,224,1]}),
  E('guan_ying','관영',{cavalry:['guan_ying-battle-cavalry-v1.webp',280,224,1]}),
  E('cao_shen','조참',{infantry:['cao_shen-battle-infantry-v1.webp',280,224,1]}),
  E('cao_zhi','조식',{strategist:['cao_zhi-battle-strategist-v1.webp',280,224,1]}),
  E('wutugu','올돌골',{}),
  E('feng_ji','봉기',{strategist:['feng_ji-battle-strategist-v1.webp',280,224,1]}),
  E('gao_lan','고람',{cavalry:['gao_lan-battle-cavalry-v1.webp',280,224,1]}),
  E('guo_jia','곽가',{strategist:['guo_jia-battle-strategist-v1.webp',280,224,1]}),
  E('xun_you','순유',{strategist:['xun_you-battle-strategist-v1.webp',280,224,1]}),
  E('cheng_yu','정욱',{strategist:['cheng_yu-battle-strategist-v1.webp',280,224,1]}),
  E('dian_wei','전위',{infantry:['dian_wei-battle-infantry-v1.webp',280,224,1]}),
  E('pang_de','방덕',{cavalry:['pang_de-battle-cavalry-v1.webp',280,224,1]}),
  E('li_dian','이전',{cavalry:['li_dian-battle-cavalry-v1.webp',280,224,1]}),
  E('fa_zheng','법정',{}),
  E('ma_liang','마량',{}),
  E('guan_xing','관흥',{}),
  E('zhang_bao','장포',{}),
  E('yan_yan','엄안',{}),
  // 동오·군웅·촉한 보강 장수 39명: 표준 4칸 SD 전투 시트
  E('sun_jian','손견',c('sun_jian','cavalry')),E('sun_ce','손책',c('sun_ce','cavalry')),E('taishi_ci','태사자',c('taishi_ci','cavalry')),E('cheng_pu','정보',c('cheng_pu','spearman')),E('zhou_tai','주태',c('zhou_tai','infantry')),E('ling_tong','능통',c('ling_tong','cavalry')),
  E('yuan_shao','원소',c('yuan_shao','lord')),E('dong_zhuo','동탁',c('dong_zhuo','lord')),E('hua_xiong','화웅',c('hua_xiong','heavyCav')),E('gongsun_zan','공손찬',c('gongsun_zan','cavalry')),E('zhang_jiao','장각',c('zhang_jiao','strategist')),E('gao_shun','고순',c('gao_shun','infantry')),E('ma_teng','마등',c('ma_teng','cavalry')),E('liu_biao','유표',c('liu_biao','lord')),E('xu_shu','서서',{}),
  E('zhang_ren','장임',c('zhang_ren','spearman')),E('zhou_cang','주창',{}),E('jian_yong','간옹',{}),E('mi_zhu','미축',{}),E('sun_qian','손건',{}),E('liao_hua','요화',{}),E('zhang_yi','장익',{}),E('li_yan','이엄',{}),E('chen_shi','진식',{}),E('deng_zhi','등지',{}),
  E('wen_yang','문앙',c('wen_yang','cavalry')),E('zhang_chunhua','장춘화',c('zhang_chunhua','strategist')),E('zhen_shi','견씨',c('zhen_shi','dancer')),E('wang_shuang','왕쌍',{}),E('wen_qin','문흠',c('wen_qin','cavalry')),E('han_dang','한당',c('han_dang','archer')),E('zhang_qin','장흠',c('zhang_qin','infantry')),E('pan_zhang','반장',c('pan_zhang','cavalry')),E('lu_kang','육항',c('lu_kang','strategist')),E('diaochan','초선',c('diaochan','dancer')),E('li_jue','이각',c('li_jue','cavalry')),E('guo_si','곽사',c('guo_si','cavalry')),E('yuan_shu','원술',c('yuan_shu','lord')),
  // 여성 인물 보강: 초상화·SD는 별도 제작 단계에서 연결한다.
  E('wang_yi','왕이',{}),E('sun_shangxiang','손상향',{}),E('bian_shi','변씨',{}),E('bu_lianshi','보연사',{}),E('guan_yinping','관은병',{}),E('bao_sanliang','포삼랑',{}),E('lingqi','여령기',{}),E('ma_yunlu','마운록',{}),E('xin_xianying','신헌영',{}),E('wang_yuanji','왕원희',{}),E('da_qiao','대교',{}),E('xiao_qiao','소교',{}),E('xiahou_shi','하후씨',{}),E('dong_bai','동백',{}),E('cai_wenji','채문희',{}),
];
// 완전 아트 세트가 추가된 장수: 공통 파일 규격(초상·흉상·일기토)을 색인에 연결한다.
const COMPLETE_ART_IDS=['sun_jian','sun_ce','taishi_ci','cheng_pu','zhou_tai','ling_tong','yuan_shao','dong_zhuo','hua_xiong','gongsun_zan','zhang_jiao','gao_shun','ma_teng','liu_biao','xu_shu','zhang_ren','zhou_cang','jian_yong','mi_zhu','sun_qian','liao_hua','zhang_yi','li_yan','chen_shi','deng_zhi','wen_yang','zhang_chunhua','zhen_shi','wang_shuang','wen_qin','han_dang','zhang_qin','pan_zhang','lu_kang','diaochan','li_jue','guo_si','yuan_shu'] as const;
// 흉상(-bust-v1)은 38장 모두 같은 여성 대체 그림이 잘못 들어가 지웠다(2026-10-15) — 대화창은 각자의 초상으로 선다.
// 흉상(-bust-v1) 38장은 2026-10-17 검수 불합격(체크무늬가 그림에 박힘) — 투명 배경 판이 올 때까지 대화창은 초상으로 선다.
const BUST_READY=true;
for(const id of COMPLETE_ART_IDS){const e=officerManifest.find(x=>x.id===id);if(e){if(BUST_READY)e.bust=`officers/${id}-bust-v8.webp`;e.duel=`officers/${id}-duel-v1.webp`;}}
// 장수 그림 한 벌(디자인 지시서 docs/design/장수-디자인-긴급지시.md): 병종과 무관한 SD 시트 하나(1400×280, 칸 350×280)와
// 일기토 하나(1024×256). 이 장수들은 옛 병종별 시트·옛 일기토를 쓰지 않는다(파일도 지웠다). 목상 제갈량의 수레는 그대로 둔다.
// 2차(2026-10-13 납품 중 칸·일기토가 맞는 19명). 촉 문관·무장 가운데 색인에 없던 10명은 이름으로 찾도록 새로 넣는다.
// 3차(재납품 07e57d5, 21명): 조진·진식·등지·법정·관색·간옹·제갈균·이엄·요화·마량·미축·사마방·사마랑·사마의·사마소·손건·위연·엄안·장익·주창, 사마사는 새 판으로.
// 4차(2927c61, 30명 중 검수 합격 15명): 조비·조예·허저·사마부·호준·장합·조인·하후돈·하후연·장료·왕쌍·육손·진궁·축융·서서.
// 5차(f13bbec, 군주 기마): 조조·손권·여포를 새로, 유비·목상 제갈량(사륜거)은 새 판으로.
// 6차(9e662ab까지, 검수 합격): 맹획(코끼리)·주유·올돌골 다시 그린 판, 조상·장소·안량 새로, 4차 도보 판으로 합격한 곽회·조홍·여몽·주연.
const PREVIOUS_UNIFIED_SD_IDS=['liu_bang','liu_bei','ma_chao','guan_yu','zhang_fei','zhao_yun','huang_zhong','jiang_wei','pang_tong','wooden_zhuge','guan_ping',
  'meng_da','ma_su','wang_ping','gao_xiang','liu_feng','ma_dai','huang_quan','wu_ban','wu_yi','fei_yi','mi_fang','yi_ji','jiang_wan','yang_yi','huang_yueying','zhang_bao','guan_xing','zhuge_jin','sima_shi',
  'cao_zhen','chen_shi','deng_zhi','fa_zheng','guan_suo','jian_yong','zhuge_jun','li_yan','liao_hua','ma_liang','mi_zhu','sima_fang','sima_lang','sima_yi','sima_zhao','sun_qian','wei_yan','yan_yan','zhang_yi','zhou_cang',
  'cao_pi','cao_rui','xu_chu','sima_fu','hu_zun','zhang_he','cao_ren','xiahou_dun','xiahou_yuan','zhang_liao','wang_shuang','lu_xun','chen_gong','zhu_rong','xu_shu',
  'cao_cao','sun_quan','lu_bu',
  'meng_huo','zhou_yu','wutugu','cao_shuang','zhang_zhao','yan_liang','guo_huai','cao_hong','lu_meng','zhu_ran',
  'sun_jian','sun_ce','taishi_ci','cheng_pu','zhou_tai','ling_tong','zhang_chunhua','zhang_jiao','dong_zhuo',
  'yuan_shu','yuan_shao','yue_jin','dai_ling','zhong_hui','deng_ai','li_dian','guo_jia','xun_you','cheng_yu','dian_wei','pang_de','gongsun_zan','liu_biao','ma_teng','dong_zhuo','gao_lan','wen_qin','wen_yang','cao_xiu','gongsun_yuan','wen_chou','xu_huang','xu_sheng','yu_jin','yuan_shang','yuan_tan','hua_xiong','zhang_ren','jia_xu','gao_shun','gao_shou','sun_jian','sun_ce','taishi_ci','zhou_tai','ling_tong','lu_kang','yang_ang','lu_fan','sun_shao','yu_ji'] as const;
export const UNIFIED_SD_IDS=[...new Set<string>([...PREVIOUS_UNIFIED_SD_IDS,...SD_REDESIGN_OFFICERS.map(([id])=>id)])];
/** 통합 SD 장수의 파일 판 번호 [SD, 일기토]. 납품마다 판 번호가 달라 장수별로 적는다(적지 않은 장수는 `{id}-sd-v1`·`{id}-duel-v2`).
 * 4차 납품(6d66aeb)에서 일기토만 SD 비례로 다시 그린 장수는 일기토 판이 올랐다. 제갈균은 파일 이름이 `jun-*`이다. */
const SD_VERSIONS:Readonly<Record<string,readonly [number,number]>>={
  cao_zhen:[2,3],chen_shi:[2,3],deng_zhi:[2,3],fa_zheng:[2,3],jian_yong:[2,3],li_yan:[2,3],liao_hua:[2,3],ma_liang:[2,3],sima_fang:[2,3],sima_yi:[2,3],sima_shi:[2,3],sun_qian:[2,3],yan_yan:[2,3],zhang_yi:[2,3],zhou_cang:[2,3],
  mi_zhu:[1,3],sima_lang:[1,3],
  meng_da:[2,4],ma_su:[2,4],wang_ping:[2,4],gao_xiang:[2,4],wei_yan:[2,4],guan_suo:[2,4],zhuge_jun:[2,4],sima_zhao:[3,5],
  liu_feng:[1,3],ma_dai:[1,3],huang_quan:[1,3],wu_ban:[1,3],wu_yi:[1,3],fei_yi:[1,3],mi_fang:[1,3],yi_ji:[1,3],jiang_wan:[1,3],yang_yi:[1,3],huang_yueying:[1,3],zhang_bao:[1,3],guan_xing:[1,3],zhuge_jin:[1,3],
  huang_zhong:[1,3],zhao_yun:[1,3],lu_xun:[1,3],
  liu_bang:[1,2],liu_bei:[2,3],wooden_zhuge:[2,3],cao_cao:[2,3],sun_quan:[3,5],lu_bu:[2,4],
  meng_huo:[2,3],zhou_yu:[2,3],wutugu:[2,3],lu_meng:[1,3],zhu_ran:[1,3],
  sun_jian:[2,2],sun_ce:[2,2],taishi_ci:[2,2],cheng_pu:[2,2],zhou_tai:[2,2],ling_tong:[2,2],zhang_chunhua:[2,1],zhang_jiao:[2,2],dong_zhuo:[2,2],
  yuan_shu:[2,2],yuan_shao:[2,2],yue_jin:[3,3],dai_ling:[3,3],zhong_hui:[4,7],deng_ai:[3,3],li_dian:[3,3],guo_jia:[2,2],xun_you:[2,2],cheng_yu:[2,2],dian_wei:[2,2],pang_de:[2,2],gongsun_zan:[2,2],liu_biao:[2,2],ma_teng:[2,2],gao_lan:[2,2],wen_qin:[1,2],wen_yang:[1,2],yang_ang:[1,2],lu_fan:[1,2],sun_shao:[1,2],yu_ji:[1,2],han_xin:[1,2],
  cao_xiu:[3,2],gongsun_yuan:[3,2],wen_chou:[4,7],xu_huang:[2,2],xu_sheng:[3,2],yu_jin:[3,2],yuan_shang:[3,2],
};
const SD_VERSION_OVERRIDES:Readonly<Record<string,readonly [number,number]>>={...SD_REDESIGN_VERSIONS,yue_jin:[8,8],zhong_hui:[8,8],deng_ai:[8,8],li_dian:[8,8],wen_chou:[8,8],zhang_chunhua:[8,8],cheng_pu:[8,2],lu_fan:[8,2],sun_shao:[8,2],yang_ang:[8,2],liu_bang:[1,8],yu_ji:[8,8],fa_zheng:[8,3],jian_yong:[8,3],li_yan:[8,3],ma_liang:[8,3],dai_ling:[8,3]};
export const UNIFIED_SD_FILES:Readonly<Record<string,{sd:string;duel:string}>>=Object.fromEntries((UNIFIED_SD_IDS as readonly string[]).map(id=>{
  const [sd,duel]=SD_VERSION_OVERRIDES[id]??SD_VERSIONS[id]??[1,2],file=id==='zhuge_jun'?'jun':id;
  return [id,{sd:`${file}-sd-v${sd}.webp`,duel:`${file}-duel-v${duel}.webp`}];
}));
for(const [id,name] of [['liu_feng','유봉'],['huang_quan','황권'],['wu_ban','오반'],['wu_yi','오의'],['fei_yi','비의'],['mi_fang','미방'],['yi_ji','이적'],['jiang_wan','장완'],['yang_yi','양의'],['huang_yueying','황월영'],['guan_suo','관색'],['zhuge_jun','제갈균']] as const)
  if(!officerManifest.some(x=>x.id===id))officerManifest.push(E(id,name,{}));
/** 통합 SD는 왔지만 일기토(1024×256) 그림이 아직 없는 장수: 일기토는 전투 SD로 대신 선다(없는 파일을 부르지 않게). */
// 2026-10-17 우선순위 ①의 8명 v8 일기토 검수 완료.
export const DUEL_PENDING:ReadonlySet<string>=new Set();
for(const id of UNIFIED_SD_IDS){const e=officerManifest.find(x=>x.id===id);if(!e)continue;const f=UNIFIED_SD_FILES[id]!,cart=e.battle.cart;e.battle={sd:{sheet:`officers/${f.sd}`,cell:[350,280],rows:1},...(cart?{cart}:{})};if(DUEL_PENDING.has(id))delete e.duel;else e.duel=`officers/${f.duel}`;}

/** 2026-10-17 SD 규격 재검수 통과판. 일기토 파일은 기존 연결을 유지하고 전투 SD만 v8로 올린다. */
export const SD_V8_ONLY_IDS=['cao_shen','chen_ping','cheng_pu','dai_ling','deng_ai','fa_zheng','fan_kuai','fan_zeng','guan_ying','han_xin','ji_bu','jian_yong','li_dian','li_yan','long_ju','lu_fan','ma_liang','peng_yue','sun_shao','wen_chou','yang_ang','ying_bu','yu_ji','yue_jin','zhang_chunhua','zhong_hui','zhongli_mo'] as const;
for(const id of SD_V8_ONLY_IDS){const e=officerManifest.find(x=>x.id===id);if(e)e.battle={sd:{sheet:`officers/${id}-sd-v8.webp`,cell:[350,280],rows:1}};}

// 묶음 시트(옛 맞수 판)는 마초·주유까지 통합 SD로 옮겨 모두 지웠다(6차).
const legacySheets:readonly {id:string;url:string;rows:number;strictGrid:true;alphaCutoff:number}[]=[];
/** 전장에서 장수는 같은 병종 병사와 같은 키로 선다(병사 아틀라스 실측: 대부분 칸 높이의 0.6, 중기병 0.69).
 * 칸을 가로 1.5배로 넓혀, 창·칼을 길게 내지른 공격 자세 때문에 몸 전체가 줄어들지 않게 한다. */
/** 창을 위로 세워 든 기병 장수는 창끝까지 키로 재므로 그대로 두면 말이 다른 기병 장수보다 작아진다. 키를 높여 말 몸통을 맞춘다. */
const RAISED_SPEAR_RIDERS=new Set(['meng_yan','bi_yan','zhang_ba','cao_xiu','cao_shuang']);
const officerFit=(cls:string,id='')=>({height:cls==='heavyCav'?.69:cls==='cart'?.7:cls==='cavalry'&&RAISED_SPEAR_RIDERS.has(id)?.72:.6,aspect:1.5});
const generatedSheets=officerManifest.flatMap(e=>Object.entries(e.battle).map(([cls,b])=>({id:b.sheet,url:b.sheet,rows:b.rows,strictGrid:true as const,alphaCutoff:8,fit:officerFit(cls,e.id)})));
export const officerModelSheets=[...legacySheets,...generatedSheets];

const legacy=new Map<string,OfficerBattleModel>();

const plain=(name:string)=>name.replace(/의?\s*환영$/,'').trim();
const byKey=new Map<string,OfficerEntry>();
for(const e of officerManifest)for(const k of [e.id,e.name,...e.aliases])byKey.set(k,e);

export function officerEntry(u:OfficerLike):OfficerEntry|undefined{
  const direct=byKey.get(u.id)??byKey.get(u.name)??byKey.get(plain(u.name));if(direct)return direct;
  const r=romanceOf(u);return r?byKey.get(r.name):undefined;
}
const classKey=(u:OfficerLike,e:OfficerEntry)=>{const cls=u.unitClass;if(cls&&e.battle[cls])return cls;if(cls){const family=familyOf(cls);if(family==='lord'&&e.battle.lord)return 'lord';if(e.battle[family])return family;}return e.battle.lord?'lord':Object.keys(e.battle)[0]!;};
export function officerBattleSheet(u:OfficerLike):OfficerBattleModel|undefined{
  const e=officerEntry(u);if(!e)return undefined;const b=e.battle[classKey(u,e)];if(!b)return undefined;
  // 장수는 병종이 진화해도 모습은 그대로다(능력치·책략·부대효과만 진화를 따른다). 단계별 줄이 있는 시트도 첫 줄만 쓴다.
  const row=0;
  const set={sheet:b.sheet,row,rows:b.rows,cell:b.cell};const fallback=legacy.get(e.id);
  return {action:set,walk:set,sideWalk:set,...(fallback?{fallback}:{})};
}
export const officerBattleModel=officerBattleSheet;

const duelRows:Record<string,{sheet:string;row:number;rows:number}>={
  ma_chao:{sheet:'officers/ma_chao-duel-v2.webp',row:0,rows:1},
  xiang_yu:{sheet:'officers/xiang_yu-duel-v1.webp',row:0,rows:1},yu_ji:{sheet:'officers/yu_ji-duel-v1.webp',row:0,rows:1},
  gongsun_yuan:{sheet:'officers/gongsun_yuan-duel-v2.webp',row:0,rows:1},
  yang_ang:{sheet:'officers/yang_ang-duel-v2.webp',row:0,rows:1},lu_fan:{sheet:'officers/lu_fan-duel-v2.webp',row:0,rows:1},sun_shao:{sheet:'officers/sun_shao-duel-v2.webp',row:0,rows:1},meng_yan:{sheet:'officers/meng_yan-duel-v2.webp',row:0,rows:1},bi_yan:{sheet:'officers/bi_yan-duel-v2.webp',row:0,rows:1},zhuge_ke:{sheet:'officers/zhuge_ke-duel-v2.webp',row:0,rows:1},wang_ling:{sheet:'officers/wang_ling-duel-v2.webp',row:0,rows:1},
  guan_yu:{sheet:'officers/guan_yu-duel-v1.webp',row:0,rows:1},jiang_wei:{sheet:'officers/jiang_wei-duel-v1.webp',row:0,rows:1},xu_huang:{sheet:'officers/xu_huang-duel-v1.webp',row:0,rows:1},
  yuan_tan:{sheet:'officers/yuan_tan-duel-v1.webp',row:0,rows:1},yuan_shang:{sheet:'officers/yuan_shang-duel-v1.webp',row:0,rows:1},gan_ning:{sheet:'officers/gan_ning-duel-v1.webp',row:0,rows:1},huang_gai:{sheet:'officers/huang_gai-duel-v1.webp',row:0,rows:1},lu_su:{sheet:'officers/lu_su-duel-v1.webp',row:0,rows:1},pang_tong:{sheet:'officers/pang_tong-duel-v1.webp',row:0,rows:1},xun_yu:{sheet:'officers/xun_yu-duel-v1.webp',row:0,rows:1},
  gao_shou:{sheet:'officers/gao_shou-duel-v1.webp',row:0,rows:1},guo_huai:{sheet:'officers/guo_huai-duel-v1.webp',row:0,rows:1},dai_ling:{sheet:'officers/dai_ling-duel-v1.webp',row:0,rows:1},zhang_zhao:{sheet:'officers/zhang_zhao-duel-v1.webp',row:0,rows:1},zhang_ba:{sheet:'officers/zhang_ba-duel-v1.webp',row:0,rows:1},cao_xiu:{sheet:'officers/cao_xiu-duel-v1.webp',row:0,rows:1},cao_shuang:{sheet:'officers/cao_shuang-duel-v1.webp',row:0,rows:1},
};
for(const id of COMPLETE_ART_IDS)duelRows[id]={sheet:`officers/${id}-duel-v1.webp`,row:0,rows:1};
for(const id of UNIFIED_SD_IDS){if(DUEL_PENDING.has(id)){delete duelRows[id];continue;}duelRows[id]={sheet:`officers/${UNIFIED_SD_FILES[id]!.duel}`,row:0,rows:1};}

/** 통합 SD 한 벌(SD·일기토가 같은 화풍)을 받은 장수인가. */
export function hasUnifiedSd(u:OfficerLike){const e=officerEntry(u);return !!e&&(UNIFIED_SD_IDS as readonly string[]).includes(e.id);}
export function officerDuelModel(u:OfficerLike){const e=officerEntry(u);return e?duelRows[e.id]:undefined;}
/** 말을 탄 대결 모델(일기토에서 말 탄 크기·말 흔들림). 나머지 대결 모델은 걸어서 싸운다. 관색은 두 번째 칸만 말을 타서 도보로 둔다. */
const MOUNTED_DUEL=new Set(['zhang_fei','wooden_zhuge','ma_chao','lu_bu','xiang_yu','sima_shi','cao_cao','cao_pi','zhao_yun','sun_quan','gongsun_yuan','meng_yan','bi_yan','guan_yu','zhang_liao','zhang_he','xiahou_dun','jiang_wei','xiahou_yuan','xu_huang','cao_ren','liu_bei','cao_rui','yuan_tan','yuan_shang','zhang_ba','cao_xiu','cao_shuang','ma_dai','cao_zhen','wei_yan','meng_huo','yan_liang']);
for(const [id,,mounted] of SD_REDESIGN_OFFICERS)if(mounted)MOUNTED_DUEL.add(id);else MOUNTED_DUEL.delete(id);
export function officerDuelMounted(u:OfficerLike){const e=officerEntry(u);return !!e&&!!duelRows[e.id]&&MOUNTED_DUEL.has(e.id);}

/** 병종별 일기토 대표 모델(1024×256, 4프레임). 개별 장수 모델이 없을 때의 전용 폴백 자산. */
export const DUEL_CLASS_SHEETS=Object.freeze([
  'infantry','spearman','cavalry','heavyCav','archer','crossbow','strategist','fengshui','ram','catapult','engineer','navy',
  'warlock','priestess','stormSage','warriorMonk','outlaw','shaman','maiden','taoist','monk','horseArcher','bandit','assassin','elephant',
] as const).map(unitClass=>({unitClass,sheet:`officers/duel-class-${unitClass}-v1.webp`,cell:[256,256] as const,rows:1}));
// v2 기준판: 핵심 계통은 새 프레임 정렬·무기 가시성 검수본을 우선 사용한다.
const DUEL_CLASS_V2:Readonly<Record<string,string>>={
  infantry:'duel-class-infantry-v4.png',spearman:'duel-class-spearman-v3.png',
  cavalry:'duel-class-cavalry-v4.png',heavyCav:'duel-class-heavyCav-v3.png',
  archer:'duel-class-archer-v4.png',crossbow:'duel-class-crossbow-v3.png',
  strategist:'duel-class-strategist-v3.png',fengshui:'duel-class-fengshui-v3.png',
  ram:'duel-class-ram-v3.png',catapult:'duel-class-catapult-v3.png',
  engineer:'duel-class-engineer-v3.png',navy:'duel-class-navy-v3.png',
  warlock:'duel-class-warlock-v2.png',priestess:'duel-class-priestess-v2.png',
  monk:'duel-class-monk-v2.png',warriorMonk:'duel-class-warriorMonk-v2.png',
  outlaw:'duel-class-outlaw-v2.png',shaman:'duel-class-shaman-v2.png',maiden:'duel-class-maiden-v2.png',
  stormSage:'duel-class-stormSage-v3.png',taoist:'duel-class-taoist-v3.png',
  horseArcher:'duel-class-horseArcher-v3.png',bandit:'duel-class-bandit-v3.png',
  assassin:'duel-class-assassin-v3.png',elephant:'duel-class-elephant-v3.png',
};
for(const x of DUEL_CLASS_SHEETS){const file=DUEL_CLASS_V2[x.unitClass];if(file)x.sheet=`officers/${file}`;}

/**
 * 대결 그림 맞춤: 시트마다 발끝 높이(256칸 기준)와 대기 자세 키가 달라(옛 시트 발끝 246~256, 새 시트 229~230 /
 * 기마 조운 135 ~ 여포 230) 같은 무대에서 발이 뜨거나 키가 들쭉날쭉했다. 발끝을 230에 맞추고, 도보는 키 182·기마는 205에
 * 가깝게(0.8~1.3배 안에서) 늘이거나 줄인다. 값은 원본 시트를 잰 것이다.
 */
// 4차 납품의 일기토(비연·공손연·여범·맹염·손소·왕릉·양앙·제갈각 duel-v2)는 통합 SD 일기토와 같은 틀(발끝 229, 대기 키 181)이라 맞춤값 없이 쓴다.
const DUEL_FIT:Record<string,readonly [number,number]>={zhou_yu:[236,174],zhu_ran:[229,177],lu_meng:[230,176],xiang_yu:[236,174]};
const DUEL_FOOT=230,DUEL_FOOT_H=182,DUEL_MOUNT_H=180;
function duelFitStyle(id:string){
  const f=(UNIFIED_SD_IDS as readonly string[]).includes(id)?undefined:DUEL_FIT[id];if(!f)return '';
  const [foot,h]=f,k=Math.max(.8,Math.min(1.3,(MOUNTED_DUEL.has(id)?DUEL_MOUNT_H:DUEL_FOOT_H)/h));
  return `;transform-origin:50% ${(foot/256*100).toFixed(1)}%;translate:0 ${((DUEL_FOOT-foot)/256*100).toFixed(2)}%;scale:${k.toFixed(3)}`;
}
export function officerDuelModelStyle(u:OfficerLike,frame=0){const set=officerDuelModel(u);if(!set)return undefined;const def=officerModelSheets.find(s=>s.id===set.sheet);const url=def?.url??set.sheet,x=Math.max(0,Math.min(3,frame))/3*100,y=set.rows>1?set.row/(set.rows-1)*100:0;return `--officer-x:${x}%;--officer-y:${y}%;background-image:url(${url});background-size:400% ${set.rows*100}%;background-position:var(--officer-x) var(--officer-y)${duelFitStyle(officerEntry(u)!.id)}`;}
/** 대결 그림 시트 주소(미리 받기용). */
export function officerDuelSheetUrl(u:OfficerLike){const set=officerDuelModel(u);if(!set)return undefined;return officerModelSheets.find(s=>s.id===set.sheet)?.url??set.sheet;}

/** 기마 장수가 설전에서 쓰는 도보 전용 4동작 시트. 일기토의 기마 모델을 궁정 설전에 재사용하지 않는다. */
export const DEBATE_FOOT_IDS=new Set(['bi_yan','cao_cao','cao_pi','cao_ren','cao_rui','cao_shuang','cao_xiu','cao_zhang','cao_zhen','dong_zhuo','gao_lan','gongsun_yuan','gongsun_zan','guan_yu','guo_si','jiang_wei','li_jue','ling_tong','lingqi','liu_bei','liu_biao','lu_bu','ma_chao','ma_dai','ma_teng','ma_yunlu','meng_huo','meng_yan','pan_zhang','pang_de','sima_shi','sun_ce','sun_jian','sun_quan','sun_shangxiang','taishi_ci','wei_yan','wen_yang','wooden_zhuge','xiahou_dun','xiahou_yuan','xiang_yu','xu_huang','yan_liang','yuan_shang','yuan_shao','yuan_shu','yuan_tan','zhang_ba','zhang_fei','zhang_he','zhang_liao','zhao_yun','sima_yi','sima_lang','sima_fang','sima_fu','sima_zhao','chen_gong','zhou_yu','pang_tong','xun_yu','lu_xun','xu_chu','hu_zun','guo_huai','cao_hong','lu_meng','zhu_ran','zhu_rong','wutugu','han_dang','zhou_tai']);
export function officerDebateModelStyle(u:OfficerLike,frame=0){const e=officerEntry(u);if(!e||!DEBATE_FOOT_IDS.has(e.id))return undefined;const x=Math.max(0,Math.min(3,frame))/3*100;return `--officer-x:${x}%;--officer-y:0%;background-image:url(officers/${e.id}-debate-v8.webp);background-size:400% auto;background-position:var(--officer-x) var(--officer-y)`;}
/** 이전 호출부 호환: 대결용 상세 모델의 첫 자세. */
export const officerModelStyle=(u:OfficerLike)=>officerDuelModelStyle(u,0);
