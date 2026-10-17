import "server-only";
import { availablePeriods, toIndexSet } from "enflasyon-core";
import type { IndexSet, Period } from "enflasyon-core";
import groupsJson from "@/data/cpi-groups.json";
import metaJson from "@/data/meta.json";
import weightsJson from "@/data/cpi-weights.json";
import { CATEGORY_KEYS } from "./categories";
import type { CalculatorData } from "./calc";
import type { WeightsByYear } from "./years";

/**
 * `data/*.json` dosyalarını build sırasında okur ve hesaplayıcıya verilecek
 * serileştirilebilir veriyi hazırlar. Şema doğrulaması CI'da yapılır
 * (`test/data/pipeline.test.ts`); burada `toIndexSet` değer ve dönemleri
 * yeniden doğrular, bozuk veri build'i durdurur.
 */
export function loadCalculatorData(): CalculatorData {
  const indices = toIndexSet(groupsJson.series);
  const periods = availablePeriods(indices.genel ?? {});
  const firstPeriod = periods[0];
  const lastPeriod = periods.at(-1);
  if (firstPeriod === undefined || lastPeriod === undefined) {
    throw new Error("data/cpi-groups.json: genel seri boş");
  }

  const latestYear = lastPeriod.slice(0, 4);
  const byYear: Readonly<Record<string, Readonly<Record<string, number>> | undefined>> =
    weightsJson;
  const row = byYear[latestYear];
  const latestWeights = Object.fromEntries(
    CATEGORY_KEYS.map((key) => {
      const value = row?.[key];
      if (typeof value !== "number") {
        throw new Error(`data/cpi-weights.json: ${latestYear} yılında ${key} ağırlığı yok`);
      }
      return [key, value];
    }),
  ) as Record<(typeof CATEGORY_KEYS)[number], number>;

  return {
    series: groupsJson.series,
    officialWeights: latestWeights,
    officialWeightsYear: latestYear,
    firstPeriod,
    lastPeriod,
    attribution: metaJson.attribution,
  };
}

export interface SiteData {
  readonly indices: IndexSet;
  readonly weights: WeightsByYear;
  readonly lastPeriod: Period;
  readonly sourceLabel: string;
  readonly attribution: string;
  /** Veri anlık görüntüsünün alındığı gün (YYYY-AA-GG). */
  readonly retrievedAt: string;
}

/** İçerik sayfaları (yıl sayfaları, sitemap) için resmi veri. */
export function loadSiteData(): SiteData {
  const { lastPeriod } = loadCalculatorData();
  return {
    indices: toIndexSet(groupsJson.series),
    weights: weightsJson,
    lastPeriod,
    sourceLabel: metaJson.sourceLabel,
    attribution: metaJson.attribution,
    retrievedAt: metaJson.retrievedAt,
  };
}
