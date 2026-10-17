import { availablePeriods } from "enflasyon-core";
import type { Period } from "enflasyon-core";
import { CATEGORY_KEYS } from "../../lib/categories.ts";
import type { CrossCheckResult } from "./crosscheck.ts";
import { SERIES_KEYS, cpiGroupsSchema, cpiWeightsSchema, metaSchema } from "./schema.ts";
import type { CpiGroups, CpiWeights, Meta } from "./schema.ts";
import type { SourceData } from "./sources.ts";

/**
 * Doğrulanmış kaynak verisinden `data/*.json` dosyalarını üretir
 * (docs/web.md, Bölüm 4.1 adım 4).
 *
 * Değerler yayımlandığı gibi saklanır (yuvarlanmaz: TÜİK 2025 öncesi geriye dönük
 * hesaplanmış değerleri 6 ondalıkla verir, yuvarlamak yıllık değişimi bozar).
 * Anahtarlar sabit sıralıdır; aynı veri her zaman bayt düzeyinde aynı dosyayı üretir,
 * böylece veri PR'ındaki fark yalnızca yeni ayı gösterir.
 */

/** Atıf metni; EVDS kullanım şartları kaynak gösterilmesini şart koşar (Bölüm 3). */
export const ATTRIBUTION: Readonly<Record<Meta["source"], string>> = {
  evds: "Kaynak: TÜİK; TCMB EVDS üzerinden.",
  "tuik-snapshot": "Kaynak: TÜİK Veri Portalı.",
};

export interface BuiltFiles {
  readonly groups: CpiGroups;
  readonly weights: CpiWeights;
  readonly meta: Meta;
}

export function buildFiles(data: SourceData, source: Meta["source"], from: Period): BuiltFiles {
  const series: Record<string, Record<string, number>> = {};
  for (const key of SERIES_KEYS) {
    // Sıralama ve doğrulama şemada/validate'te; burada pencere uygulanır.
    series[key] = Object.fromEntries(
      Object.entries(data.groups.series[key])
        .filter(([p]) => p >= from)
        .sort(([a], [b]) => (a < b ? -1 : 1)),
    );
  }
  const groups = cpiGroupsSchema.parse({ base: "2025=100", series });

  const periods = availablePeriods(groups.series.genel);
  const firstPeriod = periods[0];
  const lastPeriod = periods.at(-1);
  if (firstPeriod === undefined || lastPeriod === undefined)
    throw new Error("seçilen aralıkta veri yok");

  const firstYear = firstPeriod.slice(0, 4);
  const weights = cpiWeightsSchema.parse(
    Object.fromEntries(
      Object.entries(data.weights)
        .filter(([year]) => year >= firstYear && year <= lastPeriod.slice(0, 4))
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([year, row]) => [year, Object.fromEntries(CATEGORY_KEYS.map((k) => [k, row[k]]))]),
    ),
  );

  const meta = metaSchema.parse({
    source,
    sourceLabel: data.sourceLabel,
    attribution: ATTRIBUTION[source],
    base: "2025=100",
    firstPeriod,
    lastPeriod,
    retrievedAt: data.retrievedAt,
  });
  return { groups, weights, meta };
}

export function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** PR açıklamasına giden Markdown rapor. */
export function report(
  files: BuiltFiles,
  check: CrossCheckResult,
  warnings: readonly string[],
): string {
  const f = (n: number): string => n.toFixed(3);
  const lines = [
    `## TÜFE verisi: ${files.meta.lastPeriod}`,
    "",
    `Kaynak: ${files.meta.sourceLabel} (alınma: ${files.meta.retrievedAt})`,
    "",
    "### Çapraz kontrol (resmi ağırlıklarla paket hesabı ↔ resmi genel endeks)",
    "",
    "| Dönem | Tür | Paket % | Resmi % | Fark (puan) |",
    "| --- | --- | ---: | ---: | ---: |",
    ...check.history.map(
      (row) =>
        `| ${row.at} | yılbaşından beri | ${f(row.computed)} | ${f(row.official)} | ${f(row.difference)} |`,
    ),
    ...(check.annual
      ? [
          `| ${check.annual.at} | yıllık (bilgi) | ${f(check.annual.computed)} | ${f(check.annual.official)} | ${f(check.annual.difference)} |`,
        ]
      : []),
    "",
    warnings.length > 0 ? "### Uyarılar" : "Uyarı yok.",
    ...warnings.map((w) => `- ${w}`),
    "",
  ];
  return lines.join("\n");
}
