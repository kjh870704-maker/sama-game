/** First-battle coach: reads the board and names the one next step, so the
 * opening battle teaches select → move → act → end turn without a text wall. */
export interface CoachUnit {id:string;hasMoved:boolean;hasActed:boolean}
export const COACH_KEY='sama-coach-done';
export function coachStep(turn:number,playerPhase:boolean,units:CoachUnit[],selected:string):string|undefined{
  if(turn>1||!playerPhase||!units.length)return undefined;
  const sel=units.find(u=>u.id===selected),acted=units.filter(u=>u.hasActed).length;
  if(acted===units.length)return '④ 모든 부대가 행동했습니다. 「턴 종료」(E 키)를 누르면 적이 움직입니다.';
  if(sel&&sel.hasMoved&&!sel.hasActed)return '② 이제 행동입니다. 「공격」으로 붉은 칸의 적을 치거나, 「책략」·「대기」를 고르세요.';
  if(acted>0)return `③ 남은 부대 ${units.length-acted}개도 움직이세요. 왼쪽 목록이나 N 키로 다음 부대를 고릅니다.`;
  return '① 푸른 칸을 눌러 선택한 부대를 옮기세요. 부대를 바꾸려면 지도에서 누르거나 N 키를 씁니다.';
}
