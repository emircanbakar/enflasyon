import { toIndexSet } from "enflasyon-core";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "../lib/calc";
import { pastAmount, wageCheck } from "../lib/tools";
import { readJson } from "./data/fixtures";

const groups = readJson("data/cpi-groups.json") as { series: CalculatorData["series"] };
const weights = readJson("data/cpi-weights.json") as Record<
  string,
  CalculatorData["officialWeights"]
>;
const data: CalculatorData = {
  series: groups.series,
  officialWeights: weights["2026"]!,
  officialWeightsYear: "2026",
  firstPeriod: "2020-01",
  lastPeriod: "2026-09",
  attribution: "",
};
const indices = toIndexSet(data.series);
const input = (since: "2025-09" | "2020-01" | "2030-01", values = {}) =>
  ({ since, values, data, indices }) as Parameters<typeof pastAmount>[1];

// Genel endeks: 2025-09 = 105,780006; 2026-09 = 137,23 → yıllık %29,73.
const officialYear = 137.23 / 105.780006 - 1;

describe("pastAmount", () => {
  it("tutar yoksa veya 0 ise boş döner", () => {
    expect(pastAmount(null, input("2025-09"))).toEqual({ status: "empty" });
    expect(pastAmount(0, input("2025-09"))).toEqual({ status: "empty" });
  });

  it("resmi enflasyonla bugüne taşır; sepet yoksa kişisel sonuç yoktur", () => {
    const outcome = pastAmount(10000, input("2025-09"));
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome).toMatchObject({ since: "2025-09", to: "2026-09", personal: null });
    expect(outcome.official.rate).toBeCloseTo(officialYear, 12);
    expect(outcome.official.today).toBeCloseTo(10000 * (1 + officialYear), 6);
  });

  it("sepet doluysa kişisel enflasyonla da hesaplar", () => {
    const outcome = pastAmount(10000, input("2025-09", { konut: 1 }));
    if (outcome.status !== "ok") throw new Error(outcome.status);
    const konut = 152.1 / 108.654178 - 1;
    expect(outcome.personal?.rate).toBeCloseTo(konut, 12);
    expect(outcome.personal?.today).toBeCloseTo(10000 * (1 + konut), 6);
  });

  it("2020'deki 10.000 TL bugün yaklaşık 98 bin TL'dir (genel endeks 14,03 → 137,23)", () => {
    const outcome = pastAmount(10000, input("2020-01"));
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome.official.today).toBeCloseTo((10000 * 137.23) / 14.025066, 4);
  });

  it("veride olmayan ayda Türkçe hata verir", () => {
    expect(pastAmount(100, input("2030-01"))).toMatchObject({ status: "error" });
  });
});

describe("wageCheck", () => {
  it("maaşlardan biri eksikse veya önceki maaş 0 ise boş döner", () => {
    expect(wageCheck(null, 50000, input("2025-09"))).toEqual({ status: "empty" });
    expect(wageCheck(40000, null, input("2025-09"))).toEqual({ status: "empty" });
    expect(wageCheck(0, 50000, input("2025-09"))).toEqual({ status: "empty" });
  });

  it("reel değişimi ve gereken maaşı resmi enflasyonla hesaplar", () => {
    const outcome = wageCheck(40000, 50000, input("2025-09"));
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome.nominal).toBeCloseTo(0.25, 12);
    expect(outcome.official.real).toBeCloseTo(1.25 / (1 + officialYear) - 1, 12);
    expect(outcome.official.requiredWage).toBeCloseTo(40000 * (1 + officialYear), 6);
    expect(outcome.personal).toBeNull();
  });

  it("sepet doluysa kişisel enflasyonla da hesaplar", () => {
    const outcome = wageCheck(40000, 50000, input("2025-09", { gida: 1 }));
    if (outcome.status !== "ok") throw new Error(outcome.status);
    const gida = 134.04 / 105.028194 - 1;
    expect(outcome.personal?.rate).toBeCloseTo(gida, 12);
    expect(outcome.personal?.real).toBeCloseTo(1.25 / (1 + gida) - 1, 12);
  });

  it("veride olmayan ayda Türkçe hata verir", () => {
    expect(wageCheck(1, 2, input("2030-01"))).toMatchObject({ status: "error" });
  });
});
