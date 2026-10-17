import { describe, expect, it } from "vitest";
import { annual, monthly, twelveMonthAverage, yearToDate } from "../../src/calc/periods.js";
import { personalInflation } from "../../src/calc/personal.js";
import { safeSum } from "../../src/internal/math.js";
import type { IndexSet, PeriodInflationInput } from "../../src/types.js";
import { deepFreeze, expectCode } from "../helpers.js";
import { growingSeries, referenceTwelveMonthAverage } from "../reference.js";

/** 2024-01'den 2026-12'ye 36 aylık seriler. */
const indices: IndexSet = {
  konut: growingSeries("2024-01", 36, 0.04),
  gida: growingSeries("2024-01", 36, (i) => (i % 3 === 0 ? 0.05 : 0.01)),
  genel: growingSeries("2024-01", 36, 0.025),
  ulasim: growingSeries("2024-01", 36, (i) => (i % 2 === 0 ? 0.03 : -0.01)),
};

const input = (overrides: Partial<PeriodInflationInput> = {}): PeriodInflationInput => ({
  basket: { mode: "amount", items: { konut: 25000, gida: 12000, ulasim: 5000 } },
  indices,
  at: "2026-09",
  ...overrides,
});

const raw = (value: unknown): PeriodInflationInput => value as PeriodInflationInput;

describe("annual / monthly / yearToDate", () => {
  it("annual, 12 ay öncesinden at'e personalInflation ile aynıdır", () => {
    const result = annual(input());
    expect(result.from).toBe("2025-09");
    expect(result.to).toBe("2026-09");
    expect(result).toEqual(personalInflation({ ...input(), from: "2025-09", to: "2026-09" }));
  });

  it("monthly yıl geçişinde önceki Aralık'tan başlar", () => {
    const result = monthly(input({ at: "2026-01" }));
    expect([result.from, result.to]).toEqual(["2025-12", "2026-01"]);
  });

  it("yearToDate önceki yılın Aralık ayından başlar", () => {
    const result = yearToDate(input());
    expect([result.from, result.to]).toEqual(["2025-12", "2026-09"]);
  });

  it("yearToDate Ocak'ta monthly'ye, Aralık'ta annual'a eşittir", () => {
    expect(yearToDate(input({ at: "2026-01" }))).toEqual(monthly(input({ at: "2026-01" })));
    expect(yearToDate(input({ at: "2025-12" }))).toEqual(annual(input({ at: "2025-12" })));
  });

  it("tek kalemde sabit aylık %4 artış yıllıkta (1,04)¹² − 1 verir", () => {
    const result = annual(input({ basket: { mode: "amount", items: { konut: 1 } } }));
    expect(result.rate).toBeCloseTo(1.04 ** 12 - 1, 12);
  });

  it("seçenekleri (weightsAt, fallback) personalInflation'a iletir", () => {
    const options = {
      basket: { mode: "amount" as const, items: { konut: 1, egitim: 1 } },
      onMissing: "fallback" as const,
      fallbackKey: "genel",
      weightsAt: "to" as const,
    };
    const result = annual(input(options));
    expect(result).toEqual(
      personalInflation({ ...input(options), from: "2025-09", to: "2026-09" }),
    );
    expect(result.contributions.find((c) => c.key === "egitim")?.usedFallback).toBe(true);
  });

  it.each([annual, monthly, yearToDate, twelveMonthAverage])(
    "%o geçersiz at için alan adıyla INVALID_PERIOD fırlatır",
    (fn) => {
      const error = expectCode(() => fn(input({ at: "2026-13" })), "INVALID_PERIOD");
      expect(error.details).toMatchObject({ field: "at" });
      expectCode(() => fn(raw({ ...input(), at: undefined })), "INVALID_PERIOD");
    },
  );

  it.each([annual, monthly, yearToDate, twelveMonthAverage])(
    "%o obje olmayan girdide INVALID_INPUT fırlatır",
    (fn) => {
      expectCode(() => fn(raw(null)), "INVALID_INPUT");
    },
  );

  it("veri başlangıcından önceki dönemde MISSING_PERIOD fırlatır", () => {
    expectCode(() => annual(input({ at: "2024-06" })), "MISSING_PERIOD");
  });
});

describe("twelveMonthAverage", () => {
  it("24 aylık pencereyi from/to olarak döndürür", () => {
    const result = twelveMonthAverage(input());
    expect([result.from, result.to]).toEqual(["2024-10", "2026-09"]);
  });

  it("bağımsız referans hesapla aynı sonucu verir", () => {
    const basket = { konut: 25000 / 42000, gida: 12000 / 42000, ulasim: 5000 / 42000 };
    const expected = referenceTwelveMonthAverage(basket, indices, "2026-09");
    expect(twelveMonthAverage(input()).rate).toBeCloseTo(expected, 13);
  });

  it("tek seride doğrudan endeks ortalamalarının oranıdır (TÜİK tanımı)", () => {
    const series = indices["genel"] as Record<string, number>;
    const months = Object.keys(series).sort().slice(9, 33); // 2024-10 … 2026-09
    const mean = (ks: string[]): number => ks.reduce((s, k) => s + series[k]!, 0) / 12;
    const expected = mean(months.slice(12)) / mean(months.slice(0, 12)) - 1;

    const result = twelveMonthAverage(input({ basket: { mode: "share", items: { genel: 1 } } }));
    expect(result.rate).toBeCloseTo(expected, 13);
  });

  it("sabit aylık büyümede (1 + g)¹² − 1 verir", () => {
    const result = twelveMonthAverage(input({ basket: { mode: "share", items: { konut: 1 } } }));
    expect(result.rate).toBeCloseTo(1.04 ** 12 - 1, 12);
  });

  it("katkılar tam ayrışır: ağırlıklar toplamı 1, katkılar toplamı oran", () => {
    const result = twelveMonthAverage(input());
    const weights = result.contributions.map((c) => c.weight);
    const contributions = result.contributions.map((c) => c.contribution);

    expect(safeSum(weights)).toBeCloseTo(1, 14);
    expect(safeSum(contributions)).toBeCloseTo(result.rate, 14);
    for (const c of result.contributions) {
      expect(c.contribution).toBe(c.weight * c.change);
    }
  });

  it("kalemin change değeri kendi 12 aylık ortalama değişimidir", () => {
    const konut = twelveMonthAverage(input()).contributions.find((c) => c.key === "konut");
    expect(konut?.change).toBeCloseTo(1.04 ** 12 - 1, 12);
  });

  it("weightsAt: 'to' payları baz aya deflate eder ve referansla uyuşur", () => {
    const shares = { konut: 0.5, gida: 0.3, ulasim: 0.2 };
    const base = "2024-10";
    const at = "2026-09";
    const deflated = Object.fromEntries(
      Object.entries(shares).map(([k, s]) => {
        const series = indices[k] as Record<string, number>;
        return [k, s / (series[at]! / series[base]!)];
      }),
    );
    const total = Object.values(deflated).reduce((a, b) => a + b, 0);
    const weights = Object.fromEntries(Object.entries(deflated).map(([k, v]) => [k, v / total]));

    const result = twelveMonthAverage(
      input({ basket: { mode: "share", items: shares }, weightsAt: "to" }),
    );
    expect(result.rate).toBeCloseTo(referenceTwelveMonthAverage(weights, indices, at), 13);
    expect(result.rate).not.toBeCloseTo(
      twelveMonthAverage(input({ basket: { mode: "share", items: shares } })).rate,
      6,
    );
  });

  it("yedek seriyi kullanır ve işaretler", () => {
    const result = twelveMonthAverage(
      input({
        basket: { mode: "share", items: { konut: 0.5, egitim: 0.5 } },
        onMissing: "fallback",
        fallbackKey: "genel",
      }),
    );
    expect(result.contributions.find((c) => c.key === "egitim")?.usedFallback).toBe(true);
    expect(result.contributions.find((c) => c.key === "egitim")?.change).toBeCloseTo(
      1.025 ** 12 - 1,
      12,
    );
  });

  it("24 aylık pencerede eksik ay varsa MISSING_PERIOD fırlatır", () => {
    const gida = { ...(indices["gida"] as Record<string, number>) };
    delete gida["2025-03"];
    const error = expectCode(
      () => twelveMonthAverage(input({ indices: { ...indices, gida } })),
      "MISSING_PERIOD",
    );
    expect(error.details).toEqual({ key: "gida", period: "2025-03" });
  });

  it("pencere dışındaki eksik ayları önemsemez", () => {
    const gida = { ...(indices["gida"] as Record<string, number>) };
    delete gida["2024-09"];
    delete gida["2026-10"];
    expect(() => twelveMonthAverage(input({ indices: { ...indices, gida } }))).not.toThrow();
  });

  it("seri obje değilse INVALID_INPUT fırlatır", () => {
    expectCode(
      () => twelveMonthAverage(input({ indices: { ...indices, konut: raw([1]) as never } })),
      "INVALID_INPUT",
    );
  });

  it("sepet ve seçenek hatalarını iletir", () => {
    expectCode(
      () => twelveMonthAverage(input({ basket: { mode: "amount", items: {} } })),
      "EMPTY_BASKET",
    );
    expectCode(() => twelveMonthAverage(raw({ ...input(), weightsAt: "now" })), "INVALID_INPUT");
  });

  it("derin dondurulmuş girdiyle çalışır ve dondurulmuş sonuç döndürür", () => {
    const result = twelveMonthAverage(deepFreeze(input()));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.contributions)).toBe(true);
  });
});
