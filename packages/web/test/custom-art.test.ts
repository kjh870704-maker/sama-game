import { describe, it, expect, afterEach } from "vitest";
import { readCustoms, registerCustoms, checkCustom, type CustomOfficer } from "../src/custom.ts";
import { portraitImage, PRESET_PORTRAITS } from "../src/portrait-images.ts";
import { customFace } from "../src/officer-art.ts";

const base: CustomOfficer = { name: "백운", epithet: "", unitClass: "cavalry", temper: "brave", war: 70, int: 70, lead: 70, pol: 70, cha: 70 };

describe("신장수 기본 초상", () => {
  afterEach(() => registerCustoms([]));
  it("기본 초상은 넷이고 그림 파일은 custom-N", () => {
    expect(PRESET_PORTRAITS.map((p) => p.id)).toEqual(["custom-1", "custom-2", "custom-3", "custom-4"]);
  });
  it("고른 기본 초상은 저장했다 읽어도 남고, 없는 이름은 버린다", () => {
    const [ok] = readCustoms([{ ...base, art: "custom-2" }]);
    expect(ok?.art).toBe("custom-2");
    const [bad] = readCustoms([{ ...base, art: "../evil" }]);
    expect(bad).toBeDefined();
    expect(bad?.art).toBeUndefined();
    expect(checkCustom({ ...base, art: "custom-9" as never })).toBe("없는 기본 초상");
  });
  it("장수록에 올리면 그 그림이 초상으로 쓰이고, 내리면 사라진다", () => {
    registerCustoms([{ ...base, art: "custom-4" }]);
    expect(portraitImage("백운")).toBe("portraits/custom-4.webp");
    expect(customFace("백운")).toBe("portraits/custom-4.webp");
    registerCustoms([{ ...base }]);
    expect(portraitImage("백운")).toBeUndefined();
  });
});
