import { describe, expect, it } from "vitest";
import { annual } from "../../src/calc/periods.js";
import { MAX_BASKET_ITEMS } from "../../src/internal/limits.js";
import { toIndexSet } from "../../src/series/indexSet.js";
import { deepFreeze, expectCode } from "../helpers.js";

/** JSON'dan geliyormuş gibi: anahtarlar düz string, tip bilgisi yok. */
const json = (text: string): unknown => JSON.parse(text) as unknown;

const sample = json(`{
  "konut": { "2026-09": 160, "2025-09": 100 },
  "gida":  { "2025-09": 100, "2026-09": 130 }
}`);

describe("toIndexSet", () => {
  it("geçerli veriyi aynı değerlerle döndürür", () => {
    expect(toIndexSet(sample)).toEqual({
      gida: { "2025-09": 100, "2026-09": 130 },
      konut: { "2025-09": 100, "2026-09": 160 },
    });
  });

  it("serileri alfabetik, ayları kronolojik sıralar", () => {
    const set = toIndexSet(sample);
    expect(Object.keys(set)).toEqual(["gida", "konut"]);
    expect(Object.keys(set["konut"]!)).toEqual(["2025-09", "2026-09"]);
  });

  it("dondurulmuş ve prototipsiz kopya döndürür, girdiyi değiştirmez", () => {
    const input = deepFreeze(json('{ "konut": { "2026-01": 100 } }'));
    const set = toIndexSet(input);
    expect(Object.isFrozen(set)).toBe(true);
    expect(Object.isFrozen(set["konut"])).toBe(true);
    expect(Object.getPrototypeOf(set)).toBeNull();
    expect(Object.getPrototypeOf(set["konut"])).toBeNull();
    expect(set["konut"]).not.toBe((input as Record<string, unknown>)["konut"]);
  });

  it("sonucu hesap fonksiyonlarına doğrudan verilebilir", () => {
    const result = annual({
      basket: { mode: "share", items: { konut: 0.5, gida: 0.5 } },
      indices: toIndexSet(sample),
      at: "2026-09",
    });
    expect(result.rate).toBeCloseTo(0.45, 15);
  });

  it("boş objeyi kabul eder", () => {
    expect(toIndexSet({})).toEqual({});
  });

  it.each([null, [], "konut", 1, new Map()])("veri %j ise INVALID_INPUT fırlatır", (data) => {
    expectCode(() => toIndexSet(data), "INVALID_INPUT");
  });

  it("seri obje değilse INVALID_INPUT fırlatır ve seriyi belirtir", () => {
    const error = expectCode(() => toIndexSet(json('{ "konut": [100, 101] }')), "INVALID_INPUT");
    expect(error.details).toEqual({ key: "konut" });
  });

  it("__proto__ seri anahtarını INVALID_KEY ile reddeder", () => {
    expectCode(() => toIndexSet(json('{ "__proto__": { "2026-01": 1 } }')), "INVALID_KEY");
  });

  it("geçersiz ayda INVALID_PERIOD fırlatır", () => {
    expectCode(() => toIndexSet(json('{ "konut": { "2026-13": 100 } }')), "INVALID_PERIOD");
    expectCode(() => toIndexSet(json('{ "konut": { "2026-1": 100 } }')), "INVALID_PERIOD");
  });

  it.each([
    ['"100"', "INVALID_INPUT"],
    ["null", "INVALID_INPUT"],
    ["0", "NON_POSITIVE_INDEX"],
    ["-3", "NON_POSITIVE_INDEX"],
  ] as const)("değer %s ise %s fırlatır ve yeri belirtir", (value, code) => {
    const error = expectCode(() => toIndexSet(json(`{ "gida": { "2026-01": ${value} } }`)), code);
    expect(error.details).toMatchObject({ key: "gida", period: "2026-01" });
  });

  it("sonsuz değerde NON_FINITE fırlatır", () => {
    expectCode(() => toIndexSet({ gida: { "2026-01": Number.POSITIVE_INFINITY } }), "NON_FINITE");
  });

  it("500 seriye kadar kabul eder, fazlasında LIMIT_EXCEEDED fırlatır", () => {
    const build = (n: number): unknown =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${String(i)}`, {}]));
    expect(Object.keys(toIndexSet(build(MAX_BASKET_ITEMS)))).toHaveLength(MAX_BASKET_ITEMS);
    expectCode(() => toIndexSet(build(MAX_BASKET_ITEMS + 1)), "LIMIT_EXCEEDED");
  });
});
