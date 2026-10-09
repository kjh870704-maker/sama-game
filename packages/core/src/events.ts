/**
 * 이벤트 시스템 — 기믹 모듈(M-01~M-23)의 실행 엔진.
 *
 * 스테이지 JSON의 trigger/action 쌍을 해석한다.
 * 개별 스테이지를 위한 특수 코드는 이 파일에 들어오지 않는다.
 */
import type { BattleState } from "./state.ts";
import type { StageEvent, Trigger, Action } from "./stage.ts";
import { makeUnit } from "./units.ts";
import { adjacent, sameCoord, key, manhattan, passableFor, isHostile } from "./grid.ts";
import type { Coord, Side, UnitClass } from "./types.ts";

export interface EventPhase {
  kind: "battle_start" | "turn_start" | "turn_end" | "after_action";
  side?: Side;
}

export function runEvents(state: BattleState, phase: EventPhase): void {
  const events = state.stage.events ?? [];
  const segment = state.scenarioPhase;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    if (state.scenarioPhase !== segment) break;
    if (ev.phase !== undefined && ev.phase !== segment) continue;
    const id = ev.id ?? `${state.stage.id}#${i}`;
    const once = ev.once ?? true;
    if (once && state.firedEvents.has(id)) continue;
    if (!matches(state, ev.trigger, phase)) continue;

    state.firedEvents.add(id);
    state.push({ t: "event", id });
    for (const action of ev.actions) applyAction(state, action);
  }
}

function matches(state: BattleState, trig: Trigger, phase: EventPhase): boolean {
  switch (trig.type) {
    case "battle_start":
      return phase.kind === "battle_start";

    case "turn_start":
      if (phase.kind !== "turn_start") return false;
      if (trig.side && phase.side !== trig.side) return false;
      if (trig.turn !== undefined) return state.turn === trig.turn;
      if (trig.every !== undefined) return state.turn % trig.every === 0;
      return true;

    case "turn_end":
      if (phase.kind !== "turn_end") return false;
      if (trig.side && phase.side !== trig.side) return false;
      if (trig.turn !== undefined) return state.turn === trig.turn;
      if (trig.every !== undefined) return state.turn % trig.every === 0;
      return true;

    case "unit_reaches": {
      if (!trig.unit || !trig.region) return false;
      const u = state.find(trig.unit);
      if (!u || !u.alive) return false;
      return state.map.regionCoords(trig.region).some((c) => sameCoord(c, u.pos));
    }

    case "unit_retreats": {
      if (!trig.unit) return false;
      const u = state.find(trig.unit);
      return u !== undefined && !u.alive;
    }

    case "enemy_count_below":
      return state.living("enemy").length < (trig.n ?? 0);

    case "region_captured":
      return trig.region !== undefined && state.captured.get(trig.region) === (trig.by ?? "player");

    case "units_adjacent": {
      if (!trig.unitA || !trig.unitB) return false;
      const a = state.find(trig.unitA);
      const b = state.find(trig.unitB);
      if (!a?.alive || !b?.alive) return false;
      return adjacent(a.pos).some((c) => sameCoord(c, b.pos));
    }

    case "hp_below": {
      if (!trig.unit) return false;
      const u = state.find(trig.unit);
      if (!u?.alive) return false;
      return u.hp / u.stats.maxHp < (trig.ratio ?? 0);
    }

    case "survive_turns": {
      const start = state.survivalClocks.get(trig.region ?? "default");
      return start !== undefined && state.turn - start >= (trig.n ?? 0);
    }

    // n을 주면 "n회 이상 선택" — 한정 자원(지참금 등)의 소진을 표현한다.
    case "dialogue_choice": {
      const hits = state.choices.filter(
        (c) => c.nodeId === trig.nodeId && (!trig.optionId || c.optionId === trig.optionId),
      ).length;
      return hits >= (trig.n ?? 1);
    }

    // M-09 ENCIRCLE_LOCK — 대상의 인접 4칸이 모두 막혀 있는가.
    // 유닛뿐 아니라 통행 불가 지형과 맵 경계도 봉쇄로 인정한다.
    case "unit_surrounded": {
      if (!trig.unit) return false;
      const u = state.find(trig.unit);
      if (!u?.alive) return false;
      return adjacent(u.pos).every((c) => {
        if (!passableFor(state.map, u.unitClass, c)) return true;
        const blocker = state.unitAt(c);
        if (!blocker) return false;
        return trig.by ? blocker.side === trig.by : isHostile(u.side, blocker.side);
      });
    }

    // M-08 CONSTRUCT — 특정 진영이 영역을 N턴 연속 점유했는가
    case "region_held": {
      if (!trig.region) return false;
      return state.heldTurns(trig.region, trig.by ?? "player") >= (trig.n ?? 1);
    }

    case "scripted":
      return false;

    // M-02 PATROL_STEALTH — 순찰 유닛의 시야에 적대 유닛이 들어왔는가
    case "unit_spotted": {
      const watchers = trig.watcher
        ? [state.find(trig.watcher)].filter((u): u is NonNullable<typeof u> => u?.alive === true)
        : state.living().filter((u) => u.behavior === "patrol");
      return watchers.some((w) => {
        if (state.hasStatus(w, 'confusion')) return false;
        const vision = w.visionRange ?? 0;
        if (vision <= 0) return false;
        return state
          .living()
          .some((t) => isHostile(w.side, t.side) && manhattan(w.pos, t.pos) <= vision);
      });
    }
  }
}

/** 호스트 규칙이 조건을 판정하는 이벤트를 id로 한 번 발동한다. 이미 발동했으면 false. */
export function fireScripted(state: BattleState, id: string): boolean {
  const ev = (state.stage.events ?? []).find((e) => e.id === id);
  if (!ev || state.firedEvents.has(id)) return false;
  state.firedEvents.add(id);
  state.push({ t: "event", id });
  for (const action of ev.actions) applyAction(state, action);
  return true;
}

export function applyAction(state: BattleState, action: Action): void {
  switch (action.type) {
    case "set_phase":
      if (action.phase) state.scenarioPhase = action.phase;
      break;
    case "recover_units":
      for (const u of resolveTargets(state, action)) {
        u.hp = u.stats.maxHp;
        u.mp = u.stats.maxMp;
        u.statuses = [];
      }
      break;
    case "dismiss_units":
      // Scripted departure is not a combat loss or a retreat trigger.
      for (const u of resolveTargets(state, action)) state.units.delete(u.id);
      break;
    case "move_unit":
      if (action.at && state.map.inBounds(action.at) && !state.unitAt(action.at)) {
        const u = resolveTargets(state, action)[0];
        if (u && passableFor(state.map, u.unitClass, action.at)) {
          const from = u.pos;
          u.pos = { ...action.at };
          state.push({ t: 'move', unit: u.id, from, to: u.pos });
        }
      }
      break;
    case "spawn_units": {
      const spawned: string[] = [];
      for (const spec of action.units ?? []) {
        const count = spec.count ?? 1;
        const coords = spec.region
          ? state.map.regionCoords(spec.region)
          : spec.at
            ? [spec.at]
            : [];
        const occupied = state.occupancy();
        let placed = 0;
        for (const c of coords) {
          if (placed >= count) break;
          if (occupied.has(key(c))) continue;
          const id = spec.id ? (count > 1 ? `${spec.id}_${placed}` : spec.id) : `${spec.template}_${state.units.size}`;
          const side: Side = action.side ?? "enemy";
          const shift = side === "enemy" ? state.enemyLevelShift : 0;
          const u = makeUnit({
            id,
            name: spec.name ?? spec.template,
            side,
            unitClass: spec.template as UnitClass,
            level: (spec.level ?? 1) + shift,
            pos: c,
            traits: spec.traits ?? [],
            traitParams: spec.traitParams ?? {},
            behavior: (spec.behavior as never) ?? "advance",
            ...(spec.goalRegion !== undefined ? { goalRegion: spec.goalRegion } : {}),
            ...(spec.visionRange !== undefined ? { visionRange: spec.visionRange } : {}),
            ...(spec.patrolRoute !== undefined ? { patrolRoute: spec.patrolRoute } : {}),
          });
          state.add(u);
          occupied.set(key(c), u);
          spawned.push(u.id);
          placed++;
        }
      }
      if (spawned.length > 0) {
        state.push({ t: "spawn", units: spawned, side: action.side ?? "enemy" });
      }
      break;
    }

    case "apply_effect": {
      for (const u of resolveTargets(state, action)) {
        if (action.hpRatioDamage !== undefined) {
          const dmg = Math.round(u.stats.maxHp * action.hpRatioDamage);
          u.hp -= dmg;
          if (u.hp <= 0) state.retreat(u);
        }
        if (!action.effect || !u.alive) continue;
        state.applyStatus(u, {
          kind: action.effect,
          turns: action.duration ?? 1,
          magnitude: action.magnitude ?? 1,
        });
      }
      break;
    }

    case "remove_effect": {
      for (const u of resolveTargets(state, action)) {
        u.statuses = u.statuses.filter((s) => s.kind !== action.effect);
      }
      break;
    }

    case "change_victory":
      state.victory = structuredClone(action.conditions ?? []);
      state.goalProgress = 0;
      state.push({ t: "objectiveChanged", victory: state.victory });
      break;

    case "change_defeat":
      state.defeat = structuredClone(action.conditions ?? []);
      break;

    case "convert_unit": {
      // M-01 UNIT_CONVERT — 민중을 병사로 전환
      for (const u of resolveTargets(state, action)) {
        if (!action.toClass) continue;
        const previous = u.unitClass;
        u.unitClass = action.toClass;
        if (action.side) u.side = action.side;
        state.push({ t: "convert", unit: u.id, to: `${previous}→${action.toClass}` });
      }
      break;
    }

    case "grant_control": {
      // 우군 AI를 플레이어 조작 가능한 '편입 아군'으로 전환
      for (const u of resolveTargets(state, action)) {
        u.side = "ally";
        u.canUseItems = false;
        delete u.behavior;
      }
      break;
    }

    case "revoke_control": {
      for (const u of resolveTargets(state, action)) {
        u.side = "allyAi";
        u.behavior = "advance";
      }
      break;
    }

    case "terrain_change": {
      // M-19 HAZARD_FIELD / M-08 CONSTRUCT
      if (!action.region) break;
      for (const c of state.map.regionCoords(action.region)) {
        const tile = state.map.tileAt(c);
        // M-08 CONSTRUCT / flooding: the ground itself changes (a bridge over water, water over a field).
        if (action.terrain) tile.terrain = action.terrain;
        if (action.hazard) {
          tile.hazard = action.hazard;
          tile.hazardTurns = action.duration ?? 3;
        }
      }
      if (action.terrain) state.push({ t: "terrain", region: action.region, terrain: action.terrain });
      break;
    }

    case "play_dialogue":
      // M-03 — 대화를 활성화한다. 선택지 처리는 choose 명령이 담당한다.
      state.activeDialogue = action.dialogueId ?? null;
      if (state.activeDialogue) state.push({ t: "dialogue", node: state.activeDialogue });
      break;

    case "telegraph_aoe": {
      // M-18: mark the cells now, strike them later. Targets are marked where they stand
      // (and the four cells around them) so a unit that moves away escapes.
      const cells: Coord[] = action.region ? [...state.map.regionCoords(action.region)] : [];
      for (const id of action.targets ?? []) {
        const u = state.find(id);
        if (!u?.alive) continue;
        for (const d of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
          const c = { x: u.pos.x + d.x, y: u.pos.y + d.y };
          if (state.map.inBounds(c) && !cells.some((k) => k.x === c.x && k.y === c.y)) cells.push(c);
        }
      }
      // 차폐: 바위 그늘 같은 칸은 표식에서 뺀다 — 그 칸으로 피하면 맞지 않는다.
      if (action.exceptRegion) {
        const cover = state.map.regionCoords(action.exceptRegion);
        for (let i = cells.length - 1; i >= 0; i--) if (cover.some((c) => sameCoord(c, cells[i]!))) cells.splice(i, 1);
      }
      if (!cells.length) break;
      const turns = Math.max(1, action.duration ?? 1);
      const id = `${action.label ?? "aoe"}@${state.turn}:${cells[0]!.x},${cells[0]!.y}`;
      state.telegraphs.push({ id, cells, at: state.turn + turns, ratio: action.magnitude ?? 30, ...(action.effect ? { effect: action.effect } : {}), ...(action.label ? { label: action.label } : {}) });
      state.push({ t: "telegraph", id, cells, turns, ...(action.label ? { label: action.label } : {}), ...(action.magnitude === 0 ? { warning: true } : {}) });
      break;
    }
    case "start_duel":
      // 연출 계층에서 처리. 코어는 상태만 관리한다.
      break;
  }
}

function resolveTargets(state: BattleState, action: Action) {
  if (action.targets && action.targets.length > 0) {
    return action.targets.map((id) => state.find(id)).filter((u) => u?.alive === true) as NonNullable<
      ReturnType<BattleState["find"]>
    >[];
  }
  if (action.side) return state.living(action.side);
  return [];
}
