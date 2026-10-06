/**
 * 밸런스 시뮬레이션 러너.
 *   node --experimental-strip-types tools/sim.ts [stageId] [runs]
 *
 * 각 스테이지를 AI 자동 플레이로 N회 돌려 클리어율·평균 턴·인장 획득률을 낸다.
 * 어느 스테이지도 AI가 한 번도 깨지 못하면 종료 코드 1을 반환한다 — CI에서
 * 밸런스 회귀를 잡는다. (PRD R6, §11)
 *
 * 플레이어가 실제로 쓰는 규칙 계층(packages/web의 Session)을 그대로 구동한다.
 * 코어 + 스테이지 JSON만으로 돌리면 시나리오 단계·통행료·민병 무장처럼
 * Session에만 있는 규칙이 빠져 "달성 불가능한 승리 조건"을 측정하게 된다.
 * Session은 TS 파라미터 프로퍼티를 쓰므로 node의 strip-only 모드로는 읽히지
 * 않는다. 그래서 이미 직접 의존성인 vite의 SSR 로더로 불러온다.
 */
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root,
  configFile: false,
  logLevel: "warn",
  server: { middlewareMode: true },
  appType: "custom",
});
const load = (p: string) => server.ssrLoadModule(p);
const { Session, chapters, campaignOrder } = await load("/packages/web/src/session.ts");
const { award, deployment, equip, freshCampaign, treasures, OFFICERS } =
  await load("/packages/web/src/progression.ts");
const { martialPower } = await load("/packages/web/src/officers.ts");
const { CONTROLLABLE, decide, evaluate, key, manhattan } = await load("/packages/core/src/index.ts");

type Difficulty = "normal" | "extreme";

/**
 * 해당 스테이지에 도달한 시점의 캠페인 상태.
 *
 * 스테이지의 recommendedLevel을 그대로 쓰면 캠페인 후반 스테이지를 1장 수준의
 * 부대로 재게 된다 — 실제로는 앞 스테이지들의 경험치와 보물을 쌓아 온다.
 */
function campaignAt(chapter: number, difficulty: Difficulty) {
  const campaign = freshCampaign();
  // 일반은 캠페인 순서대로 여기까지 온 상태, 극한은 일반을 완주한 뒤 다시
  // 도전하는 상태로 본다 — 극한은 1회차에 열리는 난이도가 아니다.
  for (const index of campaignOrder) {
    if (difficulty === "normal" && index === chapter) break;
    const stage = chapters[index].stage;
    award(campaign, stage.id, "normal", stage.deployment.forced, [1]);
  }
  // 획득한 보물은 등급이 높은 것부터 장수에게 한 개씩 채운다.
  const owned = treasures
    .filter((t: { id: string }) => campaign.treasures.includes(t.id))
    .sort((a: { grade: number }, b: { grade: number }) => b.grade - a.grade);
  for (const officer of OFFICERS) {
    const item = owned.find((t: { id: string }) => !Object.values(campaign.equipped).includes(t.id));
    if (item) equip(campaign, officer, item.id);
  }
  return campaign;
}

/**
 * 이 유닛이 지금 목표 지점으로 달려야 하는가.
 *
 * 도주·잠입 스테이지는 한 턴을 다른 데 쓰면 그대로 잡힌다 — 그런 유닛에게는
 * 일기토도 구급약도 손해다. 다만 앞 단계로 "특정 적 격퇴"가 남아 있으면 아직
 * 달릴 때가 아니다. (S1-04의 "세 대결 → 어전 접근"이 그렇다)
 */
function isRacing(state: any, unit: any): boolean {
  const unmet = (cond: any) => !evaluate(state, cond);
  return state.victory.some((cond: any) => {
    if (cond.type !== "reach" || cond.unit !== unit.id || !unmet(cond)) return false;
    // 앞 단계가 "특정 적 격퇴"로 남아 있으면 지금은 달릴 때가 아니라 싸울 때다.
    // 다른 부대의 도달 같은 단계는 달리기를 막지 않는다.
    return !state.victory.some(
      (prior: any) =>
        prior.type === "retreat" &&
        prior.order !== undefined &&
        cond.order !== undefined &&
        prior.order < cond.order &&
        unmet(prior),
    );
  });
}

/**
 * 승리 조건이 "특정 적 퇴각"인 장수가 도주 중이고 이번 턴에 칠 수 있으면 먼저 친다.
 * 사람은 달아나는 목표 장수를 두고 옆의 졸병을 치지 않는다. (S2-10 고상)
 * 버티는 강적(S1-04 여포)에게 무작정 달려들지는 않는다.
 */
/**
 * 닿는 적이 없는데 '지역을 n턴 지켜라'(region_held) 사건이 아직이면 그 지역으로 간다.
 * 사람은 단계 안내("강변을 지키세요")를 읽고 움직인다 — 적을 일찍 섬멸했다고 멈춰 서지 않는다.
 */
function holdGround(session: any, unit: any): boolean {
  const state = session.state;
  const pending = (state.stage.events ?? []).find(
    (e: any) => e.trigger?.type === "region_held" && e.trigger.by === "player" && !state.firedEvents.has(e.id),
  );
  if (!pending) return false;
  const cells = state.map.regionCoords(pending.trigger.region) as Array<{ x: number; y: number }>;
  if (!cells.length || cells.some((c) => key(c) === key(unit.pos))) return false;
  const reach = state.map.reachable(unit, state.occupancy());
  let best: { x: number; y: number } | undefined, bestD = Infinity;
  for (const k of reach.keys()) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    if (state.unitAt({ x, y })) continue;
    const d = Math.min(...cells.map((c) => manhattan(c, { x, y })));
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  if (!best || key(best) === key(unit.pos)) return false;
  return session.act({ kind: "move", unit: unit.id, to: best }).ok;
}

function strikeQuarry(session: any, unit: any): boolean {
  const state = session.state;
  const quarry = state.victory
    .filter((c: { type: string; unit?: string }) => c.type === "retreat" && c.unit)
    .map((c: { unit: string }) => state.find(c.unit))
    .find((u: any) => u?.alive && u.side === "enemy" && u.behavior === "flee");
  if (!quarry) return false;
  const reach = state.map.reachable(unit, state.occupancy());
  // 책략이 닿으면 가장 센 공격 책략으로 노린다(사람은 도망치는 적장에게 화력을 모은다).
  const spells = unit.strategies
    .map((id: string) => state.strategies.get(id))
    .filter((d: any) => d && d.power > 0 && d.targetSides?.includes("enemy") && unit.mp >= d.mpCost && !state.hasStatus(unit, "seal"))
    .sort((a: any, b: any) => b.power - a.power);
  for (const spell of spells) {
    for (const k of [key(unit.pos), ...reach.keys()]) {
      const [x, y] = k.split(",").map(Number);
      if (manhattan({ x, y }, quarry.pos) > spell.range) continue;
      if (k !== key(unit.pos) && (state.unitAt({ x, y }) || !session.act({ kind: "move", unit: unit.id, to: { x, y } }).ok)) continue;
      if (session.act({ kind: "strategy", unit: unit.id, strategy: spell.id, at: quarry.pos }).ok) return true;
      return unit.hasActed;
    }
  }
  if (unit.range[1] <= 0) return false;
  for (const k of reach.keys()) {
    const [x, y] = k.split(",").map(Number);
    const d = manhattan({ x, y }, quarry.pos);
    if (d < unit.range[0] || d > unit.range[1]) continue;
    if (k !== key(unit.pos) && !session.act({ kind: "move", unit: unit.id, to: { x, y } }).ok) continue;
    return session.act({ kind: "attack", unit: unit.id, target: quarry.id }).ok || unit.hasActed;
  }
  // 닿지 않으면 도주로 쪽으로 쫓는다(사람은 도망치는 적장을 눈앞에서 놓치지 않으려 한다).
  if (unit.hasMoved || manhattan(unit.pos, quarry.pos) <= 3) return false;
  let best: { x: number; y: number } | undefined, bestD = manhattan(unit.pos, quarry.pos);
  for (const k of reach.keys()) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    if (state.unitAt({ x, y })) continue;
    const d = manhattan({ x, y }, quarry.pos);
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  if (!best || !session.act({ kind: "move", unit: unit.id, to: best }).ok) return false;
  for (const cmd of decide(state, unit)) if (cmd.kind !== "move" && session.act(cmd).ok) break;
  if (!unit.hasActed) session.act({ kind: "wait", unit: unit.id });
  return true;

}

/** 일기토·설전 5합을 정해진 수순으로 끝낸다. 기합으로 기를 모아 필살기를 낸다. */
function resolveDuel(session: any) {
  const plan = ["rally", "special", "guard", "attack", "attack"] as const;
  while (session.activeDuel) {
    const duel = session.activeDuel;
    const action = plan[duel.round] ?? "attack";
    if (!session.act({ kind: "item", unit: duel.player.id, item: `duel-round:${action}` }).ok) {
      // 필살기는 기합 2 이상에서만 나간다 — 거절되면 평타로 대신한다.
      // 평타까지 거절되면 도구가 규칙을 잘못 읽은 것이다. 조용히 넘기면 전투가
      // 멈춘 채 "패배"로 집계되어 밸런스 수치를 오염시킨다 — 즉시 멈춘다.
      if (!session.act({ kind: "item", unit: duel.player.id, item: "duel-round:attack" }).ok) {
        throw new Error(`5합을 진행할 수 없음: ${duel.kind} ${duel.player.id} vs ${duel.enemy.id}`);
      }
    }
  }
}

/**
 * 능력치 우위가 있을 때만 일기토(무력)·설전(지력)을 건다.
 *
 * 이 둘은 승자에게 상대 최대 체력의 45%와 혼란을 안긴다 — 레벨 차가 큰
 * 보스를 평타만으로 넘기지 못하는 스테이지의 의도된 해법이다. (S1-04)
 * 같은 상대에게 같은 종류는 한 번만 가능하므로 실패해도 손해가 크다.
 */
function tryDuel(session: any, unit: any): boolean {
  if (session.revision !== 4) return false;
  const enemies = session.state.living("enemy");
  const options: Array<{ kind: "duel" | "debate"; target: string; edge: number }> = [];
  // 공격 책략을 가진 책사는 일기토로 턴을 쓰지 않는다(사람도 사마의로 칼싸움을 걸지 않는다).
  const caster = unit.strategies.some((id: string) => (session.state.strategies.get(id)?.power ?? 0) > 0);
  for (const enemy of enemies) {
    const distance = manhattan(unit.pos, enemy.pos);
    if (distance <= 3) {
      options.push({ kind: "debate", target: enemy.id, edge: unit.stats.intellect - enemy.stats.intellect });
    }
    if (distance <= 1 && !caster) {
      options.push({ kind: "duel", target: enemy.id, edge: martialPower(unit) - martialPower(enemy) });
    }
  }
  // 상대가 응할 도전만 건다(성격·연의의 실제 대결 — Session.challengeAnswer).
  for (let i = options.length - 1; i >= 0; i--) {
    const o = options[i]!, enemy = session.state.find(o.target);
    if (!enemy || !session.challengeAnswer(unit, enemy, o.kind).accept) options.splice(i, 1);
  }
  options.sort((a, b) => b.edge - a.edge || (a.target < b.target ? -1 : 1));
  const pick = options[0];
  if (!pick || pick.edge <= 0) return false;
  if (!session.act({ kind: "item", unit: unit.id, item: pick.kind, target: pick.target }).ok) return false;
  resolveDuel(session);
  return true;
}

/**
 * 점령 목표를 지운 상태 사본.
 *
 * Session이 "보스를 먼저 쓰러뜨려야 점령할 수 있다" 같은 규칙으로 명령을
 * 거절하면, 담당 유닛이 매 턴 거절된 점령만 되풀이하며 턴을 버린다.
 * 그때는 점령을 목표에서 빼고 다시 판단한다. (S1-06)
 */
function withoutCaptureGoals(state: any) {
  const view = Object.create(state);
  view.victory = state.victory.filter((c: { type: string }) => c.type !== "capture");
  view.defeat = state.defeat.filter((c: { type: string }) => c.type !== "capture");
  return view;
}

/** 측정할 규칙판(기본: 새 전투가 쓰는 규칙판). SIM_REVISION=4로 예전 규칙과 비교한다. */
const SIM_REVISION = (Number(process.env.SIM_REVISION) || 5) as 4 | 5;

/** AI 자동 플레이 1회. 사람 실력의 하한선 근사치로 쓴다. */
function play(chapter: number, difficulty: Difficulty, seed: number) {
  // 출진 준비는 책략(MP) — 주력 딜이 책략이므로 AI가 가장 잘 쓰는 선택이다.
  const session = new Session(
    chapter,
    difficulty,
    seed,
    "strategy",
    SIM_REVISION,
    deployment(campaignAt(chapter, difficulty), true),
  );

  for (let step = 0; step < 6000 && session.state.outcome === "ongoing"; step++) {
    const state = session.state;
    // 대화가 열려 있으면 먼저 응답한다. 방치하면 대화로 분기하는 스테이지의
    // 난이도를 전혀 측정하지 못한다. 정답 선택지를 최적 플레이 근사치로 쓰고,
    // 지참금이 부족해 거절되면 다음 선택지로 넘어간다.
    if (state.activeDialogue) {
      const node = session.battle.dialogue.node(state.activeDialogue);
      const ordered = [...node.options].sort(
        (a: { correct?: boolean }, b: { correct?: boolean }) =>
          (b.correct === true ? 1 : 0) - (a.correct === true ? 1 : 0),
      );
      // S1-02: a second bribe (1,500전) would leave less than the 1,000전 gate toll.
      // A player who can count, and whose party can match the patrols, cuts through instead.
      const power = (side: string) => {
        const us = state.living(side);
        return us.reduce((n: number, u: { stats: { maxHp: number; attack: number; defense: number } }) => n + u.stats.maxHp * (u.stats.attack + u.stats.defense), 0);
      };
      if (node.id === "bribe" && session.bribes > 0 && session.funds - 1500 < 1000 && power("player") >= power("enemy") * 0.8) {
        ordered.sort((a: { id: string }, b: { id: string }) => (b.id === "fight" ? 1 : 0) - (a.id === "fight" ? 1 : 0));
      }
      const answered = ordered.some(
        (pick: { id: string }) =>
          session.act({ kind: "choose", nodeId: node.id, optionId: pick.id }).ok,
      );
      if (!answered) break;
      continue;
    }

    if (!CONTROLLABLE.has(state.currentSide)) {
      if (!session.tick()) break;
      continue;
    }

    const unit = state.living(state.currentSide).find((u: { hasActed: boolean }) => !u.hasActed);
    if (!unit) {
      if (!session.tick()) break;
      continue;
    }
    if (unit.hasMoved) {
      session.act({ kind: "wait", unit: unit.id });
      continue;
    }

    // 달려야 하는 유닛은 턴을 다른 데 쓰지 않는다.
    const racing = isRacing(state, unit);
    // 중상이면 먼저 구급약을 쓴다. 쓰지 않으면 보스전에서 먼저 쓰러진다.
    if (!racing && unit.hp < unit.stats.maxHp * 0.5 && session.medicine > 0) {
      if (session.act({ kind: "item", unit: unit.id, item: "medicine" }).ok) continue;
    }
    if (!racing && tryDuel(session, unit)) continue;
    if (!racing && strikeQuarry(session, unit)) continue;
    // 진정(S2-14): 구급약이 남았으면 2칸 안의 혼란에 빠진 아군을 먼저 깨운다.
    if (!racing && session.canCalm && session.medicine > 0) {
      const dazed = [...state.living("player"), ...state.living("ally")].find(
        (u: any) => u.id !== unit.id && state.hasStatus(u, "confusion") && manhattan(u.pos, unit.pos) <= 2,
      );
      if (dazed && session.act({ kind: "item", unit: unit.id, item: "calm", target: dazed.id }).ok) continue;
    }

    let accepted = false;
    for (const asView of [() => state, () => withoutCaptureGoals(state)]) {
      for (const cmd of decide(asView(), unit)) {
        // 제자리 이동은 Session이 거절한다 — 결정에서 걸러 낸다.
        if (cmd.kind === "move" && key(cmd.to) === key(unit.pos)) continue;
        // 충차가 없는 싸움(탈출·수성)에서는 성문·망루를 두드리지 않는다 — 흠집만 내고 반격에 쓰러진다.
        // (공성병기는 우리가 성을 칠 때만 나온다. 탈출·수성전에서는 피해 가는 것이 사람의 판단이다.)
        if (cmd.kind === "attack" && /^(gate|tower)_/.test(cmd.target) && !state.find("siege_crew")) continue;
        if (cmd.kind === "wait" && holdGround(session, unit)) { accepted = true; continue; }
        if (session.act(cmd).ok) accepted = true;
        if (state.outcome !== "ongoing") break;
      }
      if (accepted || state.outcome !== "ongoing") break;
    }
    // 할 일이 없으면(닿는 적 없음) 지켜야 할 지역으로 간다.
    if (!accepted && !unit.hasMoved && state.outcome === "ongoing") holdGround(session, unit);
    if (!unit.hasActed && state.outcome === "ongoing") {
      session.act({ kind: "wait", unit: unit.id });
    }
  }
  return session;
}

const [stageFilter, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 100);
const targets = campaignOrder.filter(
  (chapter: number) => !stageFilter || chapters[chapter].stage.id.startsWith(stageFilter),
);

let failures = 0;
console.log(`스테이지 ${targets.length}개 × ${runs}회 시뮬레이션\n`);

for (const chapter of targets) {
  const stage = chapters[chapter].stage;
  for (const difficulty of ["normal", "extreme"] as Difficulty[]) {
    const seals: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const reasons = new Map<string, number>();
    const turns: number[] = [];
    let victories = 0;

    for (let seed = 0; seed < runs; seed++) {
      const session = play(chapter, difficulty, seed);
      if (session.state.outcome === "victory") {
        victories++;
        turns.push(session.state.turn);
        for (const slot of session.seals) seals[slot]!++;
      } else {
        const reason = session.failure || session.state.outcome;
        reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
        // SIM_DEBUG=1: show how the first lost run ended (who fell, to whom).
        if (process.env.SIM_DEBUG && reasons.get(reason) === 1) {
          console.log(`  [${stage.id} ${difficulty} seed ${seed}] ${reason} · ${session.state.turn}턴`);
          for (const e of session.state.log.slice(-Number(process.env.SIM_DEBUG_TAIL ?? 10))) console.log("    " + JSON.stringify(e));
          if (process.env.SIM_DEBUG_UNITS) console.log("    units", JSON.stringify(session.state.living().map((u: any) => [u.id, u.side, u.pos.x, u.pos.y, u.hp])), JSON.stringify([...session.state.regionHolds]));
        }
      }
    }

    // SIM_DEBUG=1: 패배 이유별 횟수(전멸·생존 장수 퇴각·시간 초과를 가려 본다).
    if (process.env.SIM_DEBUG && reasons.size) console.log("  패배 이유: " + [...reasons].map(([r, n]) => `${r} ×${n}`).join(" · "));
    const clearRate = runs === 0 ? 0 : victories / runs;
    const avgTurns = turns.length === 0 ? 0 : turns.reduce((a, b) => a + b, 0) / turns.length;
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    const target = stage.difficulty[difficulty].targetClearRate;
    const line =
      `${stage.id} [${difficulty.padEnd(7)}] ` +
      `클리어 ${pct(clearRate).padStart(6)} | ` +
      `평균 ${avgTurns.toFixed(1).padStart(5)}턴 | ` +
      `인장2 ${pct(seals[2]! / runs).padStart(6)} | ` +
      `인장3 ${pct(seals[3]! / runs).padStart(6)}`;

    // AI 자동 플레이는 사람 실력의 하한선 근사치다. 목표치를 그대로 요구하지 않고
    // "AI가 전혀 못 깬다"(0%)를 과난이도 신호로 본다.
    if (clearRate === 0) {
      const why = [...reasons].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ×${n}`).join(" / ");
      console.log(`❌ ${line}   ← AI가 한 번도 클리어하지 못함: ${why}`);
      failures++;
    } else if (target !== undefined && clearRate > Math.min(1, target + 0.4)) {
      console.log(`⚠️  ${line}   ← 목표(${pct(target)}) 대비 과도하게 쉬움`);
    } else {
      console.log(`✅ ${line}`);
    }
  }
}

await server.close();

console.log();
if (failures > 0) {
  console.error(`${failures}건의 난이도 이상 감지`);
  process.exit(1);
}
