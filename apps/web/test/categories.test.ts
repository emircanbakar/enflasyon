import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_KEYS, isCategoryKey } from "../lib/categories";

describe("categories", () => {
  it("13 ana grup var ve her anahtarın bir tanımı var", () => {
    expect(CATEGORY_KEYS).toHaveLength(13);
    expect([...CATEGORIES.keys()]).toEqual([...CATEGORY_KEYS]);
  });

  it("anahtarlar URL'de güvenle kullanılabilir (küçük harf ve alt çizgi)", () => {
    for (const key of CATEGORY_KEYS) expect(key).toMatch(/^[a-z_]+$/);
  });

  it("resmi adlar ve anahtarlar golden testteki TÜİK verisiyle birebir aynı", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("../../../packages/core/test/golden/fixtures/tufe-2026.json", import.meta.url),
        "utf8",
      ),
    ) as { groups: Record<string, { label: string }> };

    expect(Object.keys(fixture.groups)).toEqual([...CATEGORY_KEYS]);
    for (const [key, category] of CATEGORIES) {
      expect(category.officialLabel).toBe(fixture.groups[key]?.label);
    }
  });

  it("isCategoryKey yalnızca bilinen anahtarları kabul eder", () => {
    expect(isCategoryKey("konut")).toBe(true);
    for (const value of ["Konut", "kira", "", "__proto__", "constructor", 1, null]) {
      expect(isCategoryKey(value)).toBe(false);
    }
  });
});
