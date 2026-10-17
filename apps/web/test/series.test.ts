import { toIndexSet } from "enflasyon-core";
import { describe, expect, it } from "vitest";
import { barPath } from "../components/charts/ContributionBars";
import type { CalculatorData } from "../lib/calc";
import { annualSeries, summarize } from "../lib/series";
import type { SeriesPoint } from "../lib/series";
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

describe("annualSeries", () => {
  it("son 5 yılın 60 ayını eskiden yeniye döndürür", () => {
    const points = annualSeries({ gida: 1 }, data, indices);
    expect(points).toHaveLength(60);
    expect(points[0]?.at).toBe("2021-10");
    expect(points.at(-1)?.at).toBe("2026-09");
  });

  it("resmi seri genel endeksin yıllık değişimidir", () => {
    const last = annualSeries({}, data, indices).at(-1)!;
    expect(last.official).toBeCloseTo(137.23 / 105.780006 - 1, 12);
  });

  it("tek kalemde kişisel seri o grubun yıllık değişimidir", () => {
    const last = annualSeries({ konut: 1 }, data, indices).at(-1)!;
    expect(last.personal).toBeCloseTo(152.1 / 108.654178 - 1, 12);
  });

  it("boş sepette kişisel seri null'dır", () => {
    expect(annualSeries({}, data, indices).every((p) => p.personal === null)).toBe(true);
  });

  it("hesaplanamayan ayda kişisel değeri null bırakır", () => {
    const broken = toIndexSet({ ...data.series, gida: { "2026-09": 1 } });
    const points = annualSeries({ gida: 1 }, data, broken);
    expect(points.every((p) => p.personal === null)).toBe(true);
  });

  it("yıl sayısı verilebilir", () => {
    expect(annualSeries({}, data, indices, 2)).toHaveLength(24);
  });
});

describe("summarize", () => {
  const point = (at: string, personal: number | null, official: number): SeriesPoint => ({
    at: at as SeriesPoint["at"],
    personal,
    official,
  });

  it("son 12 aydaki değişimi iki seri için anlatır", () => {
    const points = [
      point("2025-09", 0.41, 0.33),
      ...Array.from({ length: 11 }, () => point("2026-01", 0.4, 0.3)),
      point("2026-09", 0.48, 0.3),
    ];
    expect(summarize(points)).toBe(
      "Eylül 2025–Eylül 2026 arasında senin yıllık enflasyonun %41,0 düzeyinden %48,0 düzeyine çıktı; resmi rakam %33,0 düzeyinden %30,0 düzeyine indi.",
    );
  });

  it("değişim yoksa 'yatay seyretti' der", () => {
    expect(summarize([point("2026-08", 0.3, 0.3), point("2026-09", 0.3, 0.3)])).toContain(
      "yatay seyretti",
    );
  });

  it("kişisel seri yoksa harcama girmeyi önerir", () => {
    expect(summarize([point("2026-08", null, 0.3), point("2026-09", null, 0.31)])).toMatch(
      /resmi rakam .* çıktı\. Kişisel çizgi için harcama gir\./,
    );
  });

  it("boş seride uyarı döner", () => {
    expect(summarize([])).toBe("Gösterilecek veri yok.");
  });
});

describe("barPath", () => {
  it("pozitif çubuk sağa, negatif çubuk sola uzanır; uzunluk 0 ise boş", () => {
    expect(barPath(10, 50, 0, 20)).toMatch(/^M10,0 H46 A4,4 0 0 1 50,4/);
    expect(barPath(50, 10, 0, 20)).toMatch(/^M50,0 H14 A4,4 0 0 0 10,4/);
    expect(barPath(10, 10, 0, 20)).toBe("");
  });

  it("kısa çubukta yarıçapı uzunlukla sınırlar", () => {
    expect(barPath(0, 2, 0, 20)).toMatch(/A2,2/);
  });
});
