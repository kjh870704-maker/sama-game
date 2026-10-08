/** 병종 진화표 "장수" 탭의 진영 구분(위·촉·오·군웅). 전용 전투 그림이 있는 장수와, 그림이 들어올 군주를 미리 적어 둔다. */
export type OfficerFaction='위'|'촉'|'오'|'군웅';
export const OFFICER_FACTIONS:readonly OfficerFaction[]=['위','촉','오','군웅'];
const of=(f:OfficerFaction,...ids:string[])=>ids.map(id=>[id,f] as const);
export const OFFICER_FACTION:Record<string,OfficerFaction>=Object.fromEntries([
  ...of('위','sima_yi','sima_yi_young','cao_zhen','sima_lang','sima_fang','sima_shi','sima_zhao','cao_cao','cao_pi','cao_rui','xu_chu','xiahou_dun','xiahou_yuan','zhang_liao','xu_huang','zhang_he','cao_ren','xun_yu'),
  ...of('촉','liu_bei','guan_yu','zhang_fei','wooden_zhuge','zhao_yun','huang_zhong','wei_yan','jiang_wei','pang_tong','ma_chao'),
  ...of('오','sun_quan','zhou_yu','lu_xun','lu_meng','gan_ning','lu_su','huang_gai'),
  ...of('군웅','lu_bu','chen_gong','meng_huo','zhu_rong','gongsun_yuan','yuan_tan','yuan_shang','liu_bang'),
]);
