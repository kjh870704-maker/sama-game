/**
 * 전 스테이지 데이터 검증. CI에서 실행한다.
 *   node --experimental-strip-types tools/validate-stages.ts
 *
 * 검증 항목:
 *   1. 맵 파일이 파싱되는가 (범례 누락, 행 길이 불일치)
 *   2. 스테이지의 의미론적 규칙 (PRD §9.1 성능 예산, §5.2 인장, R-5.5)
 *   3. 스테이지가 참조하는 맵/영역/특성이 실재하는가
 *   4. 외전 맵: 지형·표식 격자가 맞는가, 출진·적·목표 칸이 걸어서 이어지는가
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMap, type MapFile } from "../packages/core/src/mapio.ts";
import { validateStage, type StageDef } from "../packages/core/src/stage.ts";
import { parseSeal } from "../packages/core/src/conditions.ts";
import { allTraitIds } from "../packages/core/src/traits.ts";
import { DialogueScript } from "../packages/core/src/dialogue.ts";
import type { Coord, UnitClass } from "../packages/core/src/types.ts";
import { trialLayouts, layoutMap } from "../packages/web/src/expedition-maps-data.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stagesDir = join(root, "packages/data/stages");
const mapsDir = join(root, "packages/data/maps");

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

const errors: string[] = [];
const knownTraits = new Set(allTraitIds());

// 1. 맵
const maps = new Map<string, ReturnType<typeof loadMap>>();
for (const f of readdirSync(mapsDir).filter((f) => f.endsWith(".json"))) {
  const file = readJson<MapFile>(join(mapsDir, f));
  try {
    maps.set(file.id, loadMap(file));
  } catch (e) {
    errors.push(`[맵 ${file.id}] ${(e as Error).message}`);
  }
}

// 2~3. 스테이지
const stageFiles = readdirSync(stagesDir).filter((f) => f.endsWith(".json"));
for (const f of stageFiles) {
  const stage = readJson<StageDef>(join(stagesDir, f));
  errors.push(...validateStage(stage));

  const map = stage.mapId ? maps.get(stage.mapId) : undefined;
  if (stage.mapId && !map) {
    errors.push(`[${stage.id}] 존재하지 않는 맵 참조: ${stage.mapId}`);
  }

  // 인장 표현식이 파싱되는가
  for (const seal of stage.seals) {
    for (const expr of [seal.normal, seal.extreme]) {
      try {
        parseSeal(expr);
      } catch (e) {
        errors.push(`[${stage.id}] 인장 슬롯 ${seal.slot}: ${(e as Error).message}`);
      }
    }
  }

  // 조건과 이벤트가 참조하는 영역이 맵에 존재하는가
  const regionsUsed = new Set<string>();
  for (const c of [...stage.victory, ...stage.defeat]) {
    if (c.target && (c.type === "reach" || c.type === "capture")) regionsUsed.add(c.target);
  }
  for (const ev of stage.events ?? []) {
    if (ev.trigger.region) regionsUsed.add(ev.trigger.region);
    for (const a of ev.actions) {
      if (a.region) regionsUsed.add(a.region);
      if (a.exceptRegion) regionsUsed.add(a.exceptRegion);
      for (const u of a.units ?? []) if (u.region) regionsUsed.add(u.region);
    }
  }
  if (map) {
    for (const r of regionsUsed) {
      if (!map.regions.has(r)) errors.push(`[${stage.id}] 맵에 없는 영역 참조: "${r}"`);
    }
  }

  // 전투 시작에 지정 칸으로 생성되는 부대가 출진 칸과 겹치면, 출진한 아군이 먼저
  // 서 있어 조용히 생성되지 않는다(S2-08 사마사가 사라졌던 문제).
  if (map?.regions.has("player_start")) {
    const start = new Set(map.regionCoords("player_start").map((c) => `${c.x},${c.y}`));
    for (const ev of stage.events ?? []) {
      if (ev.trigger.type !== "battle_start") continue;
      for (const a of ev.actions)
        for (const u of a.units ?? [])
          if (u.at && start.has(`${u.at.x},${u.at.y}`))
            errors.push(`[${stage.id}] 전투 시작 생성 위치가 출진 칸과 겹칩니다: ${u.id ?? u.template} (${u.at.x},${u.at.y})`);
    }
  }

  // 대화 정의가 구조적으로 온전한가 (끊긴 링크 · 빈 선택지)
  let script: DialogueScript | null = null;
  try {
    script = new DialogueScript(stage.dialogues ?? []);
  } catch (e) {
    errors.push(`[${stage.id}] ${(e as Error).message}`);
  }

  // 이벤트가 참조하는 대화 노드/선택지가 실재하는가.
  // 오타 하나로 해당 이벤트가 영영 발동하지 않으면 플레이어는 진행 불가에 갇힌다.
  if (script) {
    for (const ev of stage.events ?? []) {
      const { type, nodeId, optionId } = ev.trigger;
      if (type === "dialogue_choice" && nodeId) {
        if (!script.has(nodeId)) {
          errors.push(`[${stage.id}] 이벤트가 없는 대화 노드를 참조: "${nodeId}"`);
        } else if (optionId && !script.node(nodeId).options.some((o) => o.id === optionId)) {
          errors.push(`[${stage.id}] 대화 "${nodeId}"에 없는 선택지를 참조: "${optionId}"`);
        }
      }
      for (const a of ev.actions) {
        if (a.type === "play_dialogue" && a.dialogueId && !script.has(a.dialogueId)) {
          errors.push(`[${stage.id}] play_dialogue가 없는 노드를 참조: "${a.dialogueId}"`);
        }
      }
    }
  }

  // 특성 ID가 레지스트리에 존재하는가
  const traitsUsed: string[] = [
    ...(stage.deployment.grantedUnits ?? []).flatMap((g) => g.traits ?? []),
    ...(stage.deployment.allyAi ?? []).flatMap((g) => g.traits ?? []),
    ...(stage.events ?? []).flatMap((e) => e.actions.flatMap((a) => (a.units ?? []).flatMap((u) => u.traits ?? []))),
  ];
  for (const t of traitsUsed) {
    if (!knownTraits.has(t)) errors.push(`[${stage.id}] 정의되지 않은 특성: "${t}"`);
  }
}

// 4. 외전 맵 (packages/web의 손그림 배치)
let layouts = 0;
for (const [key, layout] of Object.entries(trialLayouts)) {
  layouts++;
  const tag = `[외전 맵 ${key}]`;
  if (layout.terrain.length !== layout.marks.length || layout.terrain.some((row, y) => row.length !== layout.marks[y]!.length)) {
    errors.push(`${tag} 지형과 표식 격자의 크기가 다릅니다`);
    continue;
  }
  let built;
  try {
    built = layoutMap(layout, key, layout.name);
    const map = loadMap(built.map);
    const naval = key === "naval";
    const walkers: UnitClass[] = naval ? ["infantry", "navy"] : ["infantry"];
    const start = map.regions.get("player_start") ?? [];
    if (!start.length) { errors.push(`${tag} 출진 칸(1·2·3)이 없습니다`); continue; }
    if (built.enemies.some((e) => !e)) errors.push(`${tag} 적 배치(a~d)가 4개가 아닙니다`);
    // 출진 첫 칸에서 걸어서 닿는 칸. 수전은 배와 육군이 나뉘므로 출진 칸 전체에서 시작한다.
    const seen = new Set<string>(), queue: Coord[] = naval ? [...start] : [start[0]!];
    const passable = (c: Coord) => map.inBounds(c) && walkers.some((u) => Number.isFinite(map.moveCost(u, c)));
    for (const c of queue) seen.add(c.x + "," + c.y);
    while (queue.length) {
      const c = queue.shift()!;
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        if (!seen.has(n.x + "," + n.y) && passable(n)) { seen.add(n.x + "," + n.y); queue.push(n); }
      }
    }
    const check = (what: string, cells: Coord[]) => {
      for (const c of cells) {
        if (!passable(c)) errors.push(`${tag} ${what} (${c.x},${c.y})이 지나갈 수 없는 지형에 있습니다`);
        else if (!seen.has(c.x + "," + c.y)) errors.push(`${tag} ${what} (${c.x},${c.y})에 출진 칸에서 닿을 수 없습니다`);
      }
    };
    check("출진 칸", start);
    check("적 배치", built.enemies.filter(Boolean));
    for (const r of ["trial_goal", "trial_safe", "trial_defense", "rescue", "convoy"]) check(r, map.regions.get(r) ?? []);
  } catch (e) {
    errors.push(`${tag} ${(e as Error).message}`);
  }
}

console.log(`맵 ${maps.size}개, 스테이지 ${stageFiles.length}개, 외전 맵 ${layouts}개 검사 완료.`);
if (errors.length > 0) {
  console.error(`\n❌ ${errors.length}건의 문제:\n`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log("✅ 문제 없음");
