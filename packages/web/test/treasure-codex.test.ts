import { describe, it, expect } from "vitest";
import { filterTreasures, defaultFilter } from "../src/treasure-codex.ts";
import { EXTRA_TREASURE_SHEETS, UNIQUE_TREASURE_SHEETS, KOEI_TREASURE_SHEETS, TREASURE_ART, ART_PENDING, formOf, FORMS, relicIcon, treasureIcon } from "../src/treasure-art.ts";
import { treasures } from "../src/progression.ts";
import { RELICS } from "../src/roguelike.ts";

const h = { owned: new Set(["yitian", "rattanShield"]), wearer: new Map<string, string>(), relics: new Set(["drum"]) };

describe("보물 도감 필터", () => {
  it("전체는 장착 보물과 회차 보물을 모두 담는다", () => {
    expect(filterTreasures(defaultFilter(), h)).toHaveLength(treasures.length + RELICS.length);
  });
  it("종류·형태·등급·보유로 거른다", () => {
    const shields = filterTreasures({ kind: "armor", form: "shield", grade: 0, own: "all" }, h).map((e) => e.id);
    expect(shields).toEqual(expect.arrayContaining(["rattanShield", "phoenixHelm", "tigerShield", "lionHelm", "hideShield", "wolfHelm", "riverShield", "rattanHelm", "ironHelm", "silverShield", "windGodShield"]));
    expect(shields).toHaveLength(11);
    const legend = filterTreasures({ kind: "weapon", form: "all", grade: 4, own: "all" }, h);
    expect(legend.length).toBeGreaterThan(0);
    expect(legend.every((e) => e.kind === "weapon" && e.grade === 4)).toBe(true);
    expect(filterTreasures({ kind: "all", form: "all", grade: 0, own: "owned" }, h).map((e) => e.id).sort()).toEqual(["drum", "rattanShield", "yitian"]);
    expect(filterTreasures(defaultFilter("owned"), h)).toHaveLength(3);
  });
  it("모든 보물의 형태는 그 보물 칸(무기·방어구·보조구)에 속한다", () => {
    for (const t of treasures) expect(FORMS.find((f) => f.id === formOf(t.id))!.slot).toBe(t.slot ?? FORMS.find((f) => f.id === formOf(t.id))!.slot);
  });
  it("그림 판 밖의 보물과 회차 보물도 모두 추가 그림판에 등록한다", () => {
    expect(EXTRA_TREASURE_SHEETS.flat()).toHaveLength(66);
    expect(UNIQUE_TREASURE_SHEETS.flat()).toHaveLength(26);
    expect(KOEI_TREASURE_SHEETS.flat()).toHaveLength(22);
    expect(TREASURE_ART.size).toBe(114);
    for(const t of treasures)if(!ART_PENDING.includes(t.id))expect(treasureIcon(t.id),t.id).not.toContain("pending");
    expect(ART_PENDING).toHaveLength(0);
    for(const id of ART_PENDING){expect(treasures.some((t)=>t.id===id),id).toBe(true);expect(treasureIcon(id),id).toContain("pending");}
    for(const r of RELICS)expect(relicIcon(r.id,r.name),r.id).not.toContain("pending");
    expect(treasureIcon("lionHelm")).toContain("treasures-extra-02-v1.webp");
    expect(relicIcon("whetstone", "숫돌")).toContain("treasures-extra-05-v1.webp");
    expect(relicIcon("drum", "진군고")).not.toContain("pending");
    expect(treasureIcon("laozi")).toContain("treasures-unique-02-v1.webp");
    expect(treasureIcon("shanhaijing")).toContain("treasures-unique-03-v1.webp");
    expect(treasureIcon("lubuBow")).toContain("treasures-koei-01-v1.webp");
  });
});
