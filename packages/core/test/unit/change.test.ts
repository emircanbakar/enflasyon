import { describe, expect, it } from "vitest";
import { changeBetween, itemChange } from "../../src/calc/change.js";
import { MAX_SERIES_LENGTH } from "../../src/internal/limits.js";
import { assertSeries, indexValue } from "../../src/series/lookup.js";
import { fromMonthIndex } from "../../src/series/period.js";
import type { IndexSeries } from "../../src/types.js";
import { deepFreeze, expectCode } from "../helpers.js";

/** Tip sistemini bilerek atlatan seri (JS veya JSON'dan gelen çağrıları taklit eder). */
const raw = (value: unknown): IndexSeries => value as IndexSeries;

const series: IndexSeries = {
  "2025-09": 200,
  "2025-12": 220,
  "2026-01": 231,
  "2026-09": 290,
};

describe("itemChange", () => {
  it("iki dönem arası değişimi oran olarak döndürür", () => {
    expect(itemChange(series, "2025-09", "2026-09")).toBeCloseTo(0.45, 15);
  });

  it("yıl geçişinde de çalışır", () => {
    expect(itemChange(series, "2025-12", "2026-01")).toBeCloseTo(0.05, 15);
  });

  it("aynı dönemde tam olarak 0 döndürür", () => {
    expect(itemChange(series, "2026-09", "2026-09")).toBe(0);
  });

  it("düşüşte negatif oran döndürür", () => {
    expect(itemChange({ "2026-01": 100, "2026-02": 80 }, "2026-01", "2026-02")).toBeCloseTo(
      -0.2,
      15,
    );
  });

  it("baz yılından bağımsızdır (seri ölçeklenince oran değişmez)", () => {
    const rebased = Object.fromEntries(
      Object.entries(series).map(([k, v]) => [k, (v / 200) * 100]),
    ) as IndexSeries;
    expect(itemChange(rebased, "2025-09", "2026-09")).toBeCloseTo(
      itemChange(series, "2025-09", "2026-09"),
      14,
    );
  });

  it("dondurulmuş seriyle çalışır", () => {
    expect(itemChange(deepFreeze({ ...series }), "2025-09", "2025-12")).toBeCloseTo(0.1, 15);
  });

  it("geçersiz dönemde alan adıyla INVALID_PERIOD fırlatır", () => {
    expect(
      expectCode(() => itemChange(series, "2025-13", "2026-09"), "INVALID_PERIOD").details,
    ).toMatchObject({ field: "from" });
    expect(
      expectCode(() => itemChange(series, "2025-09", "26-09"), "INVALID_PERIOD").details,
    ).toMatchObject({ field: "to" });
  });

  it("from > to ise PERIOD_ORDER fırlatır", () => {
    expectCode(() => itemChange(series, "2026-09", "2025-09"), "PERIOD_ORDER");
  });

  it("olmayan ayda MISSING_PERIOD fırlatır", () => {
    const error = expectCode(() => itemChange(series, "2025-10", "2026-09"), "MISSING_PERIOD");
    expect(error.details).toEqual({ key: undefined, period: "2025-10" });
  });
});

describe("changeBetween", () => {
  it("hata ayrıntısına kalem anahtarını yazar", () => {
    const error = expectCode(
      () => changeBetween(series, "2025-10", "2026-09", "konut"),
      "MISSING_PERIOD",
    );
    expect(error.details).toEqual({ key: "konut", period: "2025-10" });
  });
});

describe("assertSeries", () => {
  it.each([
    ["null", null],
    ["dizi", [1, 2]],
    ["Map", new Map()],
    ["sayı", 100],
  ])("seri %s ise INVALID_INPUT fırlatır", (_, value) => {
    expectCode(() => {
      assertSeries(value, "konut");
    }, "INVALID_INPUT");
  });

  it("1200 aya kadar kabul eder, fazlasında LIMIT_EXCEEDED fırlatır", () => {
    const build = (length: number): IndexSeries =>
      Object.fromEntries(Array.from({ length }, (_, i) => [fromMonthIndex(1900 * 12 + i), 100]));

    expect(() => {
      assertSeries(build(MAX_SERIES_LENGTH));
    }).not.toThrow();
    const error = expectCode(() => {
      assertSeries(build(MAX_SERIES_LENGTH + 1), "konut");
    }, "LIMIT_EXCEEDED");
    expect(error.details).toEqual({
      key: "konut",
      length: MAX_SERIES_LENGTH + 1,
      limit: MAX_SERIES_LENGTH,
    });
  });
});

describe("indexValue", () => {
  it("değeri döndürür", () => {
    expect(indexValue(series, "2025-12")).toBe(220);
  });

  it("prototip zincirindeki anahtarı görmez", () => {
    const inherited = Object.create({ "2026-01": 100 }) as IndexSeries;
    expectCode(() => indexValue(inherited, "2026-01"), "MISSING_PERIOD");
  });

  it.each([
    ["string", "100", "INVALID_INPUT"],
    ["null", null, "INVALID_INPUT"],
    ["NaN", Number.NaN, "NON_FINITE"],
    ["Infinity", Number.POSITIVE_INFINITY, "NON_FINITE"],
    ["0", 0, "NON_POSITIVE_INDEX"],
    ["negatif", -5, "NON_POSITIVE_INDEX"],
  ] as const)("değer %s ise %s fırlatır", (_, value, code) => {
    const error = expectCode(() => indexValue(raw({ "2026-01": value }), "2026-01", "gida"), code);
    expect(error.details).toMatchObject({ key: "gida", period: "2026-01" });
  });
});
