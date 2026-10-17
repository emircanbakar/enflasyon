import { readFileSync } from "node:fs";
import { addMonths } from "enflasyon-core";
import type { Period } from "enflasyon-core";
import { CATEGORY_KEYS } from "../../lib/categories";
import type { CpiGroups, CpiWeights } from "../../scripts/data/schema";

export const readJson = (relative: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8")) as unknown;

/**
 * Küçük, tutarlı sentetik veri: her grup sabit aylık oranla büyür, genel endeks
 * ağırlıklarla birebir tutarlı kurulur (çapraz kontrol tam geçer).
 */
export function syntheticData(
  from: Period = "2025-01",
  months = 21,
): { groups: CpiGroups; weights: CpiWeights } {
  const weightRow = Object.fromEntries(
    CATEGORY_KEYS.map((k, i) => [k, i === 0 ? 100 - 12 * 7 : 7]),
  );
  const weights = { "2025": weightRow, "2026": weightRow } as unknown as CpiWeights;

  const series: Record<string, Record<string, number>> = { genel: {} };
  CATEGORY_KEYS.forEach((key, i) => {
    series[key] = {};
    for (let m = 0; m < months; m++)
      series[key][addMonths(from, m)] = 100 * (1 + 0.01 * (i + 1)) ** m;
  });
  // Genel: her yıl Aralık'ta zincirlenen Laspeyres (TÜİK yöntemi).
  let linkBase = from;
  let level = 100;
  for (let m = 0; m < months; m++) {
    const p = addMonths(from, m);
    const row = weights[p.slice(0, 4)]!;
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    const ratio = CATEGORY_KEYS.reduce(
      (sum, k) => sum + (row[k] / total) * (series[k]![p]! / series[k]![linkBase]!),
      0,
    );
    series.genel![p] = level * ratio;
    if (p.endsWith("-12")) {
      level = series.genel![p]!;
      linkBase = p;
    }
  }
  return { groups: { base: "2025=100", series } as CpiGroups, weights };
}
