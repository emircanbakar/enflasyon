import { describe, expect, it } from "vitest";
import { buildFiles, report, serialize } from "../../scripts/data/build";
import { crossCheck } from "../../scripts/data/crosscheck";
import { cpiGroupsSchema, cpiWeightsSchema, metaSchema } from "../../scripts/data/schema";
import { fromTuikSnapshot } from "../../scripts/data/sources";
import { validateGroups, validateWeights } from "../../scripts/data/validate";
import { readJson, syntheticData } from "./fixtures";

const clone = <T>(value: T): T => structuredClone(value);

describe("validateGroups", () => {
  it("tutarlı veride hata ve uyarı yok", () => {
    const { groups } = syntheticData();
    expect(validateGroups(groups)).toEqual({ errors: [], warnings: [] });
  });

  it("aradaki eksik ayı ve fazla ayı yakalar", () => {
    const groups = clone(syntheticData().groups);
    delete (groups.series.konut as Record<string, number>)["2025-06"];
    (groups.series.gida as Record<string, number>)["2027-01"] = 100;
    const { errors } = validateGroups(groups);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/gida: .*fazla: 2027-01/);
    expect(errors[1]).toMatch(/konut: .*eksik: 2025-06/);
  });

  it("±%30 dışındaki aylık değişimi uyarı olarak bildirir, durdurmaz", () => {
    const groups = clone(syntheticData().groups);
    const egitim = groups.series.egitim as Record<string, number>;
    egitim["2025-09"] = egitim["2025-09"]! * 1.5;
    const result = validateGroups(groups);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((w) => w.startsWith("egitim 2025-09"))).toBe(true);
  });

  it("son ay mevcut veriden eskiyse hata verir", () => {
    const { groups } = syntheticData();
    expect(validateGroups(groups, "2026-10").errors[0]).toMatch(/2026-09.*2026-10/);
    expect(validateGroups(groups, "2026-09").errors).toEqual([]);
  });

  it("boş genel seride hata verir", () => {
    const groups = clone(syntheticData().groups);
    (groups.series as Record<string, unknown>).genel = {};
    expect(validateGroups(groups).errors).toEqual(["genel seri boş"]);
  });
});

describe("validateWeights", () => {
  it("toplamı 100 olan ağırlıkları kabul eder", () => {
    expect(validateWeights(syntheticData().weights, ["2025", "2026"]).errors).toEqual([]);
  });

  it("eksik yılı ve 100'den sapan toplamı yakalar", () => {
    const weights = clone(syntheticData().weights);
    weights["2026"]!.gida += 1;
    const { errors } = validateWeights(weights, ["2024", "2026"]);
    expect(errors[0]).toMatch(/2024 yılı ağırlıkları yok/);
    expect(errors[1]).toMatch(/2026 ağırlık toplamı 101.00/);
  });
});

describe("crossCheck", () => {
  it("zincirli genel endeksle tutarlı veride geçer", () => {
    const { groups, weights } = syntheticData();
    const result = crossCheck(groups, weights);
    expect(result.errors).toEqual([]);
    expect(Math.abs(result.yearToDate.difference)).toBeLessThan(1e-9);
    // 2025-12 satırı için 2024-12 gerekir; sentetik veri 2025-01'de başlar.
    expect(result.history.map((r) => r.at)).toEqual(["2026-09"]);
  });

  it("bir grubun son ayı bozulursa engeller", () => {
    const { groups, weights } = syntheticData();
    const broken = clone(groups);
    const gida = broken.series.gida as Record<string, number>;
    gida["2026-09"] = gida["2026-09"]! * 1.05;
    const result = crossCheck(broken, weights);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/2026-09 yılbaşından beri/);
  });

  it("son ayın yılına ait ağırlık yoksa hata fırlatır", () => {
    const { groups, weights } = syntheticData();
    const partial = { "2025": weights["2025"]! };
    expect(() => crossCheck(groups, partial)).toThrow(/2026 yılı ağırlıkları/);
  });

  it("yıllık farkı ±1 puanı aşarsa uyarır", () => {
    const { groups, weights } = syntheticData();
    const skewed = clone(weights);
    skewed["2026"] = {
      ...skewed["2026"]!,
      gida: 0,
      kisisel_bakim: skewed["2026"]!.kisisel_bakim + skewed["2026"]!.gida,
    };
    // 2026 içi zincir değişmeden (genel 2025 ağırlıklarıyla kurulu) ağırlık oynarsa YTD de bozulur;
    // burada yalnızca uyarı mekanizmasını sınıyoruz.
    const result = crossCheck(groups, skewed);
    expect(result.warnings.some((w) => w.includes("yıllık"))).toBe(true);
  });
});

describe("buildFiles / report", () => {
  it("pencereyi uygular, anahtarları sıralar ve meta üretir", () => {
    const { groups, weights } = syntheticData();
    const files = buildFiles(
      {
        groups,
        weights: { ...weights, "2024": weights["2025"]! },
        sourceLabel: "test",
        retrievedAt: "2026-10-17",
      },
      "evds",
      "2025-03",
    );
    expect(Object.keys(files.groups.series.genel)[0]).toBe("2025-03");
    expect(Object.keys(files.weights)).toEqual(["2025", "2026"]);
    expect(files.meta).toMatchObject({
      source: "evds",
      attribution: "Kaynak: TÜİK; TCMB EVDS üzerinden.",
      firstPeriod: "2025-03",
      lastPeriod: "2026-09",
    });
    expect(serialize(files.meta).endsWith("}\n")).toBe(true);
  });

  it("seçilen aralıkta veri yoksa hata fırlatır", () => {
    const { groups, weights } = syntheticData();
    expect(() =>
      buildFiles(
        { groups, weights, sourceLabel: "x", retrievedAt: "2026-10-17" },
        "evds",
        "2030-01",
      ),
    ).toThrow();
  });

  it("raporda her kontrol satırı ve uyarılar yer alır", () => {
    const { groups, weights } = syntheticData();
    const files = buildFiles(
      { groups, weights, sourceLabel: "test", retrievedAt: "2026-10-17" },
      "tuik-snapshot",
      "2025-01",
    );
    const markdown = report(files, crossCheck(files.groups, files.weights), ["örnek uyarı"]);
    expect(markdown).toContain("## TÜFE verisi: 2026-09");
    expect(markdown).toContain("| 2026-09 | yılbaşından beri |");
    expect(markdown).toContain("- örnek uyarı");
    expect(report(files, crossCheck(files.groups, files.weights), [])).toContain("Uyarı yok.");
  });
});

describe("repodaki veri (data/*.json)", () => {
  const groups = cpiGroupsSchema.parse(readJson("data/cpi-groups.json"));
  const weights = cpiWeightsSchema.parse(readJson("data/cpi-weights.json"));
  const meta = metaSchema.parse(readJson("data/meta.json"));

  it("şemalara uyar ve doğrulamadan hatasız geçer", () => {
    expect(validateGroups(groups).errors).toEqual([]);
    expect(validateWeights(weights, Object.keys(weights)).errors).toEqual([]);
    expect(meta.lastPeriod).toBe(Object.keys(groups.series.genel).at(-1));
  });

  it("çapraz kontrolden geçer (resmi ağırlıklarla genel endeks ±0,1 puan)", () => {
    const result = crossCheck(groups, weights);
    expect(result.errors).toEqual([]);
    for (const row of result.history) expect(Math.abs(row.difference)).toBeLessThanOrEqual(0.1);
  });

  it("elle düzenlenmemiş: kaynak anlık görüntüsünden yeniden üretilince bayt düzeyinde aynı", () => {
    // Bu test meta.source "tuik-snapshot" iken anlamlıdır; EVDS'ye geçilince EVDS kaydıyla değiştirilir.
    if (meta.source !== "tuik-snapshot") return;
    const data = fromTuikSnapshot(
      readJson("data/sources/tuik-tt01.json"),
      readJson("data/sources/tuik-tt08.json"),
    );
    const rebuilt = buildFiles(data, "tuik-snapshot", meta.firstPeriod);
    expect(serialize(rebuilt.groups)).toBe(serialize(groups));
    expect(serialize(rebuilt.weights)).toBe(serialize(weights));
    expect(rebuilt.meta).toEqual(meta);
  });
});
