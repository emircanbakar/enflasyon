import { EnflasyonError } from "../errors.js";
import { MAX_SERIES_LENGTH } from "../internal/limits.js";
import type { IndexSeries, Period } from "../types.js";
import { assertSeries, indexValue } from "./lookup.js";
import { assertPeriod, availablePeriods, comparePeriods } from "./period.js";

/**
 * Baz yılı değişmiş iki seriyi tek seride birleştirir (zincirleme).
 *
 * Eski seri, örtüşme ayındaki oranla yeni bazda ölçeklenir:
 * `k = yeni(t₀) / eski(t₀)`, `t < t₀` için `zincir(t) = k × eski(t)`.
 * `t ≥ t₀` aylarında yeni serinin değerleri aynen kullanılır; eski serinin bu
 * aylardaki değerleri yok sayılır. Böylece örtüşme sonrası değişimler aynen
 * korunur, örtüşme öncesi değişimler de oran olarak değişmez.
 *
 * Dönen seri dondurulmuştur, prototipsizdir ve ayları eskiden yeniye sıralıdır.
 *
 * @throws {EnflasyonError} `INVALID_PERIOD`, `NO_OVERLAP` (örtüşme ayı serilerden
 *   birinde yok), `INVALID_INPUT`, `NON_FINITE`, `NON_POSITIVE_INDEX`, `LIMIT_EXCEEDED`
 *
 * @example
 * chainSeries(
 *   { "2024-11": 2400, "2024-12": 2500 },   // 2003=100
 *   { "2024-12": 100, "2025-01": 104 },     // 2025=100 (örtüşme: 2024-12)
 *   "2024-12",
 * );
 * // { "2024-11": 96, "2024-12": 100, "2025-01": 104 }
 */
export function chainSeries(older: IndexSeries, newer: IndexSeries, overlap: Period): IndexSeries {
  const t0 = assertPeriod(overlap, "overlap");
  assertSeries(older, "older");
  assertSeries(newer, "newer");
  if (!Object.hasOwn(older, t0) || !Object.hasOwn(newer, t0)) {
    throw new EnflasyonError("NO_OVERLAP", "Both series must contain the overlap period", {
      overlap: t0,
      inOlder: Object.hasOwn(older, t0),
      inNewer: Object.hasOwn(newer, t0),
    });
  }
  const factor = indexValue(newer, t0, "newer") / indexValue(older, t0, "older");

  const before = availablePeriods(older).filter((p) => comparePeriods(p, t0) < 0);
  // Yeni serinin örtüşme öncesi ayları (varsa) yok sayılır.
  const after = availablePeriods(newer).filter((p) => comparePeriods(p, t0) >= 0);
  if (before.length + after.length > MAX_SERIES_LENGTH) {
    throw new EnflasyonError(
      "LIMIT_EXCEEDED",
      `Chained series has more than ${String(MAX_SERIES_LENGTH)} periods`,
      { length: before.length + after.length, limit: MAX_SERIES_LENGTH },
    );
  }

  const chained = Object.create(null) as Record<Period, number>;
  for (const p of before) chained[p] = factor * indexValue(older, p, "older");
  for (const p of after) chained[p] = indexValue(newer, p, "newer");
  return Object.freeze(chained);
}
