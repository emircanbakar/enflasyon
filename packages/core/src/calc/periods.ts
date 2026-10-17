import { safeSum } from "../internal/math.js";
import { assertSeries, indexValue } from "../series/lookup.js";
import { addMonths, assertPeriod } from "../series/period.js";
import type { Period, PeriodInflationInput, PersonalInflationResult } from "../types.js";
import { personalInflation } from "./personal.js";
import { assertInputRecord, buildResult, readCommonInput } from "./shared.js";

function between(
  input: PeriodInflationInput,
  start: (at: Period) => Period,
): PersonalInflationResult {
  assertInputRecord(input);
  const at = assertPeriod(input.at, "at");
  return personalInflation({ ...input, from: start(at), to: at });
}

/**
 * Yıllık kişisel enflasyon: `at` ayının bir önceki yılın aynı ayına göre değişimi.
 *
 * @example
 * annual({ basket, indices, at: "2026-09" }); // 2025-09 → 2026-09
 */
export function annual(input: PeriodInflationInput): PersonalInflationResult {
  return between(input, (at) => addMonths(at, -12));
}

/**
 * Aylık kişisel enflasyon: `at` ayının bir önceki aya göre değişimi.
 *
 * @example
 * monthly({ basket, indices, at: "2026-01" }); // 2025-12 → 2026-01
 */
export function monthly(input: PeriodInflationInput): PersonalInflationResult {
  return between(input, (at) => addMonths(at, -1));
}

/**
 * Yılbaşından beri kişisel enflasyon: önceki yılın Aralık ayına göre değişim.
 * Ocak'ta aylık, Aralık'ta yıllık enflasyona eşittir.
 *
 * @example
 * yearToDate({ basket, indices, at: "2026-09" }); // 2025-12 → 2026-09
 */
export function yearToDate(input: PeriodInflationInput): PersonalInflationResult {
  return between(input, (at) => addMonths(at, -Number(at.slice(5, 7))));
}

/**
 * 12 aylık ortalamalara göre kişisel enflasyon: son 12 ayın endeks ortalamasının,
 * önceki 12 ayın ortalamasına göre değişimi. 24 aylık veri gerekir.
 *
 * Önce `base = at − 23` bazlı aylık kişisel endeks kurulur:
 * `Pₜ = Σ wᵢ · Iᵢ,ₜ / Iᵢ,base`; sonuç `ort(P, son 12) / ort(P, önceki 12) − 1`'dir.
 * Bu, TÜİK'in genel endeksten 12 aylık ortalama hesaplama biçimiyle aynıdır.
 *
 * Katkılar tam ayrıştırılır (ölçekleme yoktur): kalemin önceki ve son 12 ay
 * ortalamaları `Bᵢ` ve `Aᵢ`, `B = Σ wᵢ · Bᵢ` olmak üzere
 * `weight = wᵢ · Bᵢ / B`, `change = Aᵢ / Bᵢ − 1` ve `contribution = weight × change`.
 * Ağırlıkların toplamı 1, katkıların toplamı orana eşittir.
 *
 * Dönen sonuçta `from` = `at − 23`, `to` = `at`'tir: 24 aylık veri penceresi.
 * `weightsAt: "to"` ise paylar `at`'ten `base`'e deflate edilir.
 *
 * @example
 * twelveMonthAverage({ basket, indices, at: "2026-09" }); // 2024-10 … 2026-09
 */
export function twelveMonthAverage(input: PeriodInflationInput): PersonalInflationResult {
  assertInputRecord(input);
  const at = assertPeriod(input.at, "at");
  const base = addMonths(at, -23);
  const { items, weightsAt } = readCommonInput(input);
  const months = Array.from({ length: 24 }, (_, i) => addMonths(base, i));

  const rows = items.map((item) => {
    assertSeries(item.series, item.seriesKey);
    const baseValue = indexValue(item.series, base, item.seriesKey);
    const relative = months.map((p) => indexValue(item.series, p, item.seriesKey) / baseValue);
    return {
      key: item.key,
      share: item.weight,
      usedFallback: item.usedFallback,
      prior: safeSum(relative.slice(0, 12)) / 12,
      recent: safeSum(relative.slice(12)) / 12,
      // Son ayın baz aya göre oranı (relative'in son elemanı).
      growth: indexValue(item.series, at, item.seriesKey) / baseValue,
    };
  });

  // weightsAt "to": bugünkü payları baz aya taşı (personalInflation ile aynı mantık).
  const raw = rows.map((row) => ({
    ...row,
    w: weightsAt === "to" ? row.share / row.growth : row.share,
  }));
  const rawTotal = safeSum(raw.map((row) => row.w));
  const weighted = raw.map((row) => ({ ...row, w: row.w / rawTotal }));

  const priorTotal = safeSum(weighted.map((row) => row.w * row.prior));
  const parts = weighted.map((row) => {
    const weight = (row.w * row.prior) / priorTotal;
    const change = row.recent / row.prior - 1;
    return {
      key: row.key,
      weight,
      change,
      contribution: weight * change,
      usedFallback: row.usedFallback,
    };
  });

  return buildResult(parts, base, at);
}
