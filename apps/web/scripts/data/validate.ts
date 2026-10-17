import { addMonths, availablePeriods } from "enflasyon-core";
import type { Period } from "enflasyon-core";
import type { CpiGroups, CpiWeights } from "./schema.ts";
import { SERIES_KEYS } from "./schema.ts";
import { CATEGORY_KEYS } from "../../lib/categories.ts";

/**
 * Veri doğrulama kuralları (docs/web.md, Bölüm 4.1 adım 2).
 *
 * Hatalar pipeline'ı durdurur; uyarılar PR açıklamasına yazılır ama durdurmaz.
 */

export interface ValidationReport {
  readonly errors: string[];
  readonly warnings: string[];
}

/** Aylık değişim bu bandın dışındaysa (±%30) yazım hatası şüphesiyle uyarı verilir. */
export const MONTHLY_CHANGE_WARNING = 0.3;
/** Ağırlık toplamı 100'den bu kadar saparsa hata (yayın yuvarlaması ±0,05 civarındadır). */
export const WEIGHT_SUM_TOLERANCE = 0.1;

export function validateGroups(
  groups: CpiGroups,
  previousLastPeriod: Period | null = null,
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const genelPeriods = availablePeriods(groups.series.genel);
  const first = genelPeriods[0];
  const last = genelPeriods.at(-1);
  if (first === undefined || last === undefined) {
    return { errors: ["genel seri boş"], warnings };
  }

  // Aylar ardışık ve boşluksuz, tüm seriler aynı aylar.
  const expected: Period[] = [];
  for (let p: Period = first; p <= last; p = addMonths(p, 1)) expected.push(p);
  for (const key of SERIES_KEYS) {
    const periods = availablePeriods(groups.series[key]);
    if (periods.join() !== expected.join()) {
      const missing = expected.filter((p) => !periods.includes(p));
      const extra = periods.filter((p) => !expected.includes(p));
      errors.push(
        `${key}: aylar genel seriyle aynı değil (eksik: ${missing.join(", ") || "-"}, fazla: ${extra.join(", ") || "-"})`,
      );
      continue;
    }
    const entries = Object.entries(groups.series[key]).sort(([a], [b]) => (a < b ? -1 : 1));
    let previous: number | null = null;
    for (const [p, value] of entries) {
      const change = previous === null ? 0 : value / previous - 1;
      if (Math.abs(change) > MONTHLY_CHANGE_WARNING) {
        warnings.push(
          `${key} ${p}: aylık değişim %${(change * 100).toFixed(1)} (±%30 bandı dışında, yazım hatası olabilir)`,
        );
      }
      previous = value;
    }
  }

  // Yeni veri eskisinden geri gidemez.
  if (previousLastPeriod !== null && last < previousLastPeriod) {
    errors.push(`son veri ayı ${last}, mevcut verideki ${previousLastPeriod}'den eski`);
  }
  return { errors, warnings };
}

export function validateWeights(weights: CpiWeights, years: readonly string[]): ValidationReport {
  const errors: string[] = [];
  for (const year of years) {
    const row = weights[year];
    if (row === undefined) {
      errors.push(`${year} yılı ağırlıkları yok`);
      continue;
    }
    const sum = CATEGORY_KEYS.reduce((total, key) => total + row[key], 0);
    if (Math.abs(sum - 100) > WEIGHT_SUM_TOLERANCE) {
      errors.push(
        `${year} ağırlık toplamı ${sum.toFixed(2)} (100 ± ${String(WEIGHT_SUM_TOLERANCE)} bekleniyor)`,
      );
    }
  }
  return { errors, warnings: [] };
}
