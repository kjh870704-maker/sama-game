/**
 * 시나리오 대본 검사.
 *   node --experimental-strip-types tools/check-scenario.ts packages/web/src/scenario/if-act1-2.ts
 * 파일은 `export default` 로 ScenarioPack 을 내보낸다. 문제가 없으면 장 수를 출력한다.
 */
import { allUnitClasses } from "../packages/core/src/units.ts";
import { ROUTES, routesFor, routeById } from "../packages/web/src/fate.ts";
import { checkPack, type ScenarioPack } from "../packages/web/src/scenario-types.ts";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/** 운명의 갈림길 장 id → 고를 수 있는 루트 id */
export function fateOptions(): Record<string, string[]> {
  const out: Record<string, string[]> = { "fate:1": routesFor(1).map((r) => r.id) };
  for (const parent of ROUTES.filter((r) => r.act === 1)) out[`fate:2:${parent.id}`] = routesFor(2, { 1: parent.id }, true).map((r) => r.id);
  for (const parent of ROUTES.filter((r) => r.act === 2)) {
    const first = routeById(parent.after?.[0])?.id ?? "refuse";
    out[`fate:3:${parent.id}`] = routesFor(3, { 1: first, 2: parent.id }, true).map((r) => r.id);
  }
  return out;
}

const files = process.argv.slice(2);
let bad = 0;
for (const file of files) {
  const pack = (await import(pathToFileURL(resolve(file)).href)).default as ScenarioPack;
  const problems = checkPack(pack, { unitClasses: allUnitClasses(), fateOptions: fateOptions() });
  if (problems.length) { bad++; console.log(`✗ ${file}`); for (const p of problems) console.log("  - " + p); }
  else console.log(`✓ ${file} · 장 ${pack.chapters.length}개`);
}
if (!files.length) console.log(JSON.stringify(fateOptions(), null, 1));
process.exit(bad ? 1 : 0);
