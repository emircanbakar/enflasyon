import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { basketReducer, parseValueInput, percentTotal, toPercentages } from "../lib/basket-state";
import { DEFAULT_STATE } from "../lib/basket-url";
import type { BasketState } from "../lib/basket-url";
import { CATEGORY_KEYS } from "../lib/categories";
import type { Profile } from "../lib/profiles";

const state = (overrides: Partial<BasketState> = {}): BasketState => ({
  ...DEFAULT_STATE,
  ...overrides,
});
const profile: Profile = {
  id: "turkiye-ortalamasi",
  label: "Türkiye ortalaması",
  description: "",
  percentages: { gida: 60, konut: 40 },
};

describe("parseValueInput: TL", () => {
  it.each<[string, number | null]>([
    ["", null],
    ["  ", null],
    ["25000", 25000],
    ["25.000", 25000],
    ["1.250.000", 1250000],
    ["25 000", 25000],
    ["25000,6", 25001],
    ["0", 0],
    ["10.000.000", 10_000_000],
  ])("%j → %s", (text, expected) => {
    expect(parseValueInput(text, "tl")).toBe(expected);
  });

  it.each(["-5", "abc", "12a", "10.000.001", "1,2,3"])("%j geçersiz", (text) => {
    expect(parseValueInput(text, "tl")).toBe("invalid");
  });
});

describe("parseValueInput: yüzde", () => {
  it.each<[string, number | null]>([
    ["", null],
    ["12", 12],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["%12,5", 12.5],
    ["12,5%", 12.5],
    ["12,55", 12.6],
    ["100", 100],
  ])("%j → %s", (text, expected) => {
    expect(parseValueInput(text, "pct")).toBe(expected);
  });

  it.each(["100,1", "1.000,5", "-1", "on iki"])("%j geçersiz", (text) => {
    expect(parseValueInput(text, "pct")).toBe("invalid");
  });
});

describe("toPercentages / percentTotal", () => {
  it("toplamı tam 100 olan 0,1 adımlı yüzdeler üretir", () => {
    expect(toPercentages({ gida: 1, konut: 1, giyim: 1 })).toEqual({
      gida: 33.4,
      giyim: 33.3,
      konut: 33.3,
    });
    expect(percentTotal(toPercentages({ gida: 1, konut: 1, giyim: 1 }))).toBe(100);
  });

  it("boş veya sıfır sepette boş döner", () => {
    expect(toPercentages({})).toEqual({});
    expect(toPercentages({ gida: 0 })).toEqual({});
  });

  it("çok küçük payı (binde 1'in altı) atar", () => {
    expect(toPercentages({ gida: 1_000_000, konut: 1 })).toEqual({ gida: 100 });
  });

  it("property: her zaman toplamı 100, değerler 0,1 adımlı ve pozitif", () => {
    const values = fc.dictionary(
      fc.constantFrom(...CATEGORY_KEYS),
      fc.integer({ min: 1, max: 10_000_000 }),
      { minKeys: 1 },
    );
    fc.assert(
      fc.property(values, (v) => {
        const result = toPercentages(v);
        expect(percentTotal(result)).toBe(100);
        for (const x of Object.values(result)) {
          expect(x).toBeGreaterThan(0);
          expect(Math.round(x * 10)).toBeCloseTo(x * 10, 9);
        }
      }),
    );
  });
});

describe("basketReducer", () => {
  it("değer ekler, 0 veya null ile siler ve profili düşürür", () => {
    let s = basketReducer(state({ profile: "x" }), { type: "setValue", key: "konut", value: 100 });
    expect(s.values).toEqual({ konut: 100 });
    expect(s.profile).toBeNull();
    s = basketReducer(s, { type: "setValue", key: "konut", value: 0 });
    expect(s.values).toEqual({});
    s = basketReducer(state({ values: { gida: 5 } }), {
      type: "setValue",
      key: "gida",
      value: null,
    });
    expect(s.values).toEqual({});
  });

  it("TL'den yüzdeye geçişte dağılımı korur, yüzdeden TL'ye geçişte temizler", () => {
    const tl = state({ values: { konut: 30000, gida: 10000 } });
    const pct = basketReducer(tl, { type: "setMode", mode: "pct" });
    expect(pct).toMatchObject({ mode: "pct", values: { konut: 75, gida: 25 } });
    expect(basketReducer(pct, { type: "setMode", mode: "tl" })).toMatchObject({
      mode: "tl",
      values: {},
    });
  });

  it("aynı moda geçiş durumu değiştirmez", () => {
    const s = state();
    expect(basketReducer(s, { type: "setMode", mode: "tl" })).toBe(s);
  });

  it("profili yüzde modunda uygular", () => {
    expect(basketReducer(state(), { type: "applyProfile", profile })).toMatchObject({
      mode: "pct",
      values: { gida: 60, konut: 40 },
      profile: "turkiye-ortalamasi",
    });
  });

  it("dönem tipini değiştirir; aralık dışına çıkınca başlangıcı temizler", () => {
    let s = basketReducer(state(), { type: "setPeriod", period: "r" });
    s = basketReducer(s, { type: "setFrom", from: "2021-01" });
    expect(s).toMatchObject({ period: "r", from: "2021-01" });
    expect(basketReducer(s, { type: "setPeriod", period: "r" }).from).toBe("2021-01");
    expect(basketReducer(s, { type: "setPeriod", period: "y" }).from).toBeNull();
  });

  it("hedef ayı ayarlar", () => {
    expect(basketReducer(state(), { type: "setAt", at: "2026-06" }).at).toBe("2026-06");
  });

  it("normalize yalnızca yüzde modunda çalışır", () => {
    const pct = state({ mode: "pct", values: { gida: 60, konut: 60 } });
    expect(basketReducer(pct, { type: "normalize" }).values).toEqual({ gida: 50, konut: 50 });
    const tl = state({ values: { gida: 60 } });
    expect(basketReducer(tl, { type: "normalize" })).toBe(tl);
  });

  it("hydrate ve reset", () => {
    const loaded = state({ values: { gida: 1 } });
    expect(basketReducer(state(), { type: "hydrate", state: loaded })).toBe(loaded);
    expect(basketReducer(loaded, { type: "reset" })).toBe(DEFAULT_STATE);
  });
});
