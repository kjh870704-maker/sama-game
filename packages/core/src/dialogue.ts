/**
 * 대화·선택지 시스템 (M-03 DIALOGUE_GATE).
 *
 * 설전(S1-11), 도주 중 조우(S1-03), 작전 선택(S2-05, S2-07)이 모두 이 구조를 쓴다.
 * 선택의 "결과"는 여기에 적지 않는다 — 이벤트의 `dialogue_choice` 트리거로
 * 표현해야 스테이지마다 다른 페널티를 데이터로 붙일 수 있다.
 */
import type { StatusKind } from "./types.ts";

export interface DialogueOption {
  id: string;
  text: string;
  /** 다음 노드. 없으면 대화 종료. */
  next?: string;
  /**
   * 정답 여부. 인장 판정과 오답 페널티에 쓰인다.
   * 명시하지 않으면 정오답 개념이 없는 선택지(분기용)로 본다.
   */
  correct?: boolean;
}

export interface DialogueNode {
  id: string;
  /** 화자 유닛 ID (연출용) */
  speaker?: string;
  text: string;
  options: DialogueOption[];
}

/**
 * 오답 페널티 기본값.
 * PRD 기믹사양 M-03: 오답은 즉시 패배가 아니라 HP 감소를 기본으로 한다.
 * 즉사는 리트라이 비용이 너무 커서 스토리 중심 플레이어를 이탈시킨다.
 */
export const DEFAULT_WRONG_ANSWER_PENALTY = {
  kind: "bleed" as StatusKind,
  hpRatio: 0.25,
};

export class DialogueScript {
  private readonly nodes: Map<string, DialogueNode>;

  constructor(nodes: readonly DialogueNode[]) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    // 참조 무결성은 로드 시점에 검사한다 — 전투 중에 끊긴 링크를 만나면
    // 플레이어는 진행 불가 상태에 갇힌다.
    for (const node of nodes) {
      for (const opt of node.options) {
        if (opt.next !== undefined && !this.nodes.has(opt.next)) {
          throw new Error(`대화 "${node.id}"의 선택지 "${opt.id}"가 없는 노드 "${opt.next}"를 가리킴`);
        }
      }
      if (node.options.length === 0) {
        throw new Error(`대화 노드 "${node.id}"에 선택지가 없음`);
      }
    }
  }

  node(id: string): DialogueNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`정의되지 않은 대화 노드: ${id}`);
    return n;
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  option(nodeId: string, optionId: string): DialogueOption {
    const opt = this.node(nodeId).options.find((o) => o.id === optionId);
    if (!opt) throw new Error(`대화 "${nodeId}"에 선택지 "${optionId}"가 없음`);
    return opt;
  }

  /** 전체 노드 수 — 검증기와 테스트용 */
  get size(): number {
    return this.nodes.size;
  }
}
