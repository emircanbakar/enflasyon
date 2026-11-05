import { toIndexSet } from "enflasyon-core";
import { describe, expect, it } from "vitest";
import { availableYears, yearLead, yearSummary } from "../lib/years";
import type { WeightsByYear } from "../lib/years";
import { readJson } from "./data/fixtures";

const groups = readJson("test/data/frozen/cpi-groups.json") as {
  series: Record<string, Record<string, number>>;
};
const weights = readJson("test/data/frozen/cpi-weights.json") as WeightsByYear;
const indices = toIndexSet(groups.series);

/** `from` ayından başlayıp her ay %1 artan, `count` aylık sentetik seri. */
function monthlySeries(from: string, count: number): Record<string, number> {
  const out: Record<string, number> = {};
  let [year, month] = from.split("-").map(Number) as [number, number];
  for (let i = 0; i < count; i++) {
    out[`${String(year)}-${String(month).padStart(2, "0")}`] = 100 * 1.01 ** i;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

describe("availableYears", () => {
  it("önceki Aralık verisi olan yılları eskiden yeniye verir", () => {
    expect(availableYears(indices)).toEqual(["2021", "2022", "2023", "2024", "2025", "2026"]);
  });

  it("genel seri yoksa boş döner", () => {
    expect(availableYears({})).toEqual([]);
  });
});

describe("yearSummary", () => {
  // TÜİK'in açıkladığı Aralık yıllık TÜFE rakamları (%).
  it.each([
    ["2021", 36.08],
    ["2022", 64.27],
    ["2023", 64.77],
    ["2024", 44.38],
    ["2025", 30.89],
  ])("%s yıllık enflasyonu TÜİK'in açıkladığıyla aynı (%s)", (year, published) => {
    const summary = yearSummary(year, indices, weights);
    expect(summary?.complete).toBe(true);
    expect(summary?.lastPeriod).toBe(`${year}-12`);
    expect((summary?.yearToDate ?? 0) * 100).toBeCloseTo(published, 2);
    expect(summary?.annual).toBeCloseTo(summary?.yearToDate ?? 0, 12);
  });

  it("devam eden yılda son veri ayına kadar özetler", () => {
    const summary = yearSummary("2026", indices, weights);
    expect(summary).toMatchObject({ complete: false, lastPeriod: "2026-09" });
    expect(summary?.months).toHaveLength(9);
    expect((summary?.yearToDate ?? 0) * 100).toBeCloseTo(24.32, 2);
    expect((summary?.annual ?? 0) * 100).toBeCloseTo(29.73, 2);
  });

  it("aylık satırlar ve gruplar tutarlı", () => {
    const summary = yearSummary("2025", indices, weights)!;
    expect(summary.months).toHaveLength(12);
    const compounded = summary.months.reduce((acc, row) => acc * (1 + row.monthly), 1) - 1;
    expect(compounded).toBeCloseTo(summary.yearToDate, 10);
    expect(summary.groups).toHaveLength(13);
    const changes = summary.groups.map((g) => g.change);
    expect(changes).toEqual([...changes].sort((a, b) => b - a));
    const totalWeight = summary.groups.reduce((acc, g) => acc + (g.weight ?? 0), 0);
    expect(totalWeight).toBeCloseTo(100, 1);
    expect(summary.average).not.toBeNull();
  });

  it("24 ay geriye veri yoksa 12 aylık ortalama verilmez, ağırlığı olmayan grup tire alır", () => {
    const summary = yearSummary("2021", indices, {})!;
    expect(summary.average).not.toBeNull();
    expect(summary.groups.every((g) => g.weight === null)).toBe(true);
    // 2024-03'ten 2025-03'e: Ocak ve Şubat için 12 ay öncesi yok, 24 aylık pencere de yok.
    const short = toIndexSet({
      genel: monthlySeries("2024-03", 13),
      gida: monthlySeries("2024-03", 13),
    });
    const result = yearSummary("2025", short, {})!;
    expect(result.average).toBeNull();
    expect(result.months[0]?.annual).toBeNull();
    expect(result.groups.map((g) => g.key)).toEqual(["gida"]);
  });

  it("verisi olmayan yıl için null döner", () => {
    expect(yearSummary("2020", indices, weights)).toBeNull();
    expect(yearSummary("2030", indices, weights)).toBeNull();
    // Yıllık karşılaştırma için 12 ay öncesi yoksa da özet çıkmaz.
    const noYearAgo = toIndexSet({ genel: { "2025-06": 99, "2025-12": 100, "2026-01": 101 } });
    expect(yearSummary("2026", noYearAgo, {})).toBeNull();
  });
});

describe("yearLead", () => {
  it("tamamlanmış yıl için Aralık'tan Aralık'a cümle kurar", () => {
    const lead = yearLead(yearSummary("2025", indices, weights)!);
    expect(lead).toMatch(
      /^2025 yılında tüketici fiyatları \(TÜFE\) Aralık'tan Aralık'a %30,9 arttı\./,
    );
    expect(lead).toMatch(/En yüksek artış .+ grubunda \(%[\d,]+\), en düşük değişim .+ grubunda/);
  });

  it("devam eden yılda ay sayısını ve yıllık rakamı söyler", () => {
    expect(yearLead(yearSummary("2026", indices, weights)!)).toMatch(
      /^2026 yılının ilk 9 ayında .+ %24,3 arttı; Eylül 2026 itibarıyla yıllık enflasyon %29,7\./,
    );
  });

  it("tek grup varsa grup cümlesi eklenmez", () => {
    const one = toIndexSet({
      genel: monthlySeries("2024-12", 13),
      gida: monthlySeries("2024-12", 13),
    });
    expect(yearLead(yearSummary("2025", one, {})!)).not.toMatch(/grubunda/);
  });
});
