/**
 * 본편 전장에 나오는 NPC(아군 AI · 우군) 목록 — 병종 진화표에서 "이 병종으로 나오는 NPC"를 보여 준다.
 * packages/data/stages의 side가 allyAi(초록 NPC)·ally(우군)인 이름 있는 유닛이다(test/npc-roster.test.ts가 맞춰 본다).
 */
import type {UnitClass} from '../../core/src/index.ts';

export interface NpcEntry {name:string;unitClass:UnitClass;side:'allyAi'|'ally';stages:string[]}
const n=(name:string,unitClass:UnitClass,side:NpcEntry['side'],...stages:string[]):NpcEntry=>({name,unitClass,side,stages});

export const NPC_ROSTER:NpcEntry[]=[
  n('동문 피난민','civilian','allyAi','S1-01'),n('북문 피난민','civilian','allyAi','S1-01'),n('꿈속의 황제','civilian','allyAi','S1-04'),
  n('군량 수송대','engineer','allyAi','S1-05'),n('부상병 수송대','engineer','allyAi','S1-05'),
  n('조조','lord','allyAi','S1-06','S1-09','S1-10'),n('허저','infantry','ally','S1-06'),
  n('성채 수비장','spearman','allyAi','S2-01'),n('조비','lord','allyAi','S2-02','S2-03'),n('양양 수문장','spearman','allyAi','S2-04'),
  n('사마사','cavalry','ally','S2-05','S2-08','S2-13'),n('사마소','crossbow','ally','S2-05','S2-08','S2-13'),
  n('장합','cavalry','allyAi','S2-06','S2-11'),n('곽회','infantry','allyAi','S2-07'),n('곽회 창병','spearman','allyAi','S2-07'),
  n('조휴','infantry','allyAi','S2-08'),n('조휴 궁수','archer','allyAi','S2-08'),
  n('대릉','infantry','allyAi','S2-09'),n('전선 창병','spearman','allyAi','S2-09'),n('전선 방패병','infantry','allyAi','S2-09'),
  n('곽회','spearman','allyAi','S2-12'),n('양동 깃발대','infantry','ally','S3-01'),n('번성 수비대','spearman','allyAi','S3-03'),
  n('공병','engineer','ally','S3-04'),n('방패 호위병','infantry','ally','S3-04'),
  n('조상','cavalry','allyAi','S3-05'),n('조상 친위','spearman','allyAi','S3-05'),
];
