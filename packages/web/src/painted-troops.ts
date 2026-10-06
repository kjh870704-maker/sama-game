import type {UnitClass} from '../../core/src/index.ts';
import {completeTroopArt,completeTroopSheets} from './complete-troops.ts';

/** 칸 쓰임새: attack은 [준비, 내지름], walk는 [내딛음, 디딤] 칸 번호. */
export type PaintedFrames={attack:[number,number];walk:[number,number];cast:number;hit:number};
/** 완성 병종 시트: 0 대기 · 1 준비(젖힘) · 2 공격(내디딤) · 3 피격. 걷기는 대기·준비를 번갈아. */
export const POSE:PaintedFrames={attack:[1,2],walk:[0,1],cast:1,hit:3};
/** 전투·도감·정비 화면은 새 규격 병종 원화 37장·145병종만 쓴다. 예전 8행 병종 시트는 쓰지 않는다.
 * union: 칸 안의 떨어진 조각(투석기와 병사, 떠도는 부적)을 한 프레임으로 합쳐 자른다. */
export const paintedTroopSheets=completeTroopSheets.map(sheet=>({...sheet,frames:POSE,union:true}));
export const paintedFrames=(_sheet:string):PaintedFrames=>POSE;
/** 화면과 전투는 새 화풍으로 다시 그린 145병종만 사용한다. */
export const paintedTroopArt:Record<UnitClass,{sheet:string;row:number;rows:number}>=completeTroopArt;
/** 전장 자세 번호 → 시트 칸. 0 대기 · 1 공격 준비 · 2 공격 · 3 책략 · 4~7 걷기(짝수 내딛음) · 8~11 반응. */
export function paintedTroopFrame(pose:number,f:PaintedFrames=POSE){
  if(pose>=8)return pose===9||pose===11?0:f.hit;
  if(pose>=4)return pose%2===0?f.walk[0]:f.walk[1];
  if(pose===3)return f.cast;
  return pose===1?f.attack[0]:pose===2?f.attack[1]:0;
}
