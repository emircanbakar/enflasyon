import { assertSeries, indexValue } from "../series/lookup.js";
import { assertPeriod, assertPeriodOrder } from "../series/period.js";
import type { IndexSeries, Period } from "../types.js";

/**
 * Bir kalemin iki dönem arasındaki değişimini oran olarak döndürür:
 * `I(to) / I(from) − 1`.
 *
 * Sonuç baz yılından bağımsızdır; iki dönem aynı bazda olduğu sürece 2003=100
 * ve 2025=100 serileri aynı oranı verir. `from === to` ise sonuç tam olarak 0'dır.
 *
 * @throws {EnflasyonError} `INVALID_PERIOD`, `PERIOD_ORDER`, `INVALID_INPUT`,
 *   `LIMIT_EXCEEDED`, `MISSING_PERIOD`, `NON_FINITE`, `NON_POSITIVE_INDEX`
 *
 * @example
 * itemChange({ "2025-09": 200, "2026-09": 290 }, "2025-09", "2026-09"); // 0.45
 */
export function itemChange(series: IndexSeries, from: Period, to: Period): number {
  return changeBetween(series, assertPeriod(from, "from"), assertPeriod(to, "to"));
}

/**
 * {@link itemChange}'in, dönemleri zaten doğrulanmış çağıranlar için iç sürümü.
 * `key`, hata ayrıntısında hangi kalemin serisi olduğunu gösterir.
 */
export function changeBetween(series: IndexSeries, from: Period, to: Period, key?: string): number {
  assertPeriodOrder(from, to);
  assertSeries(series, key);
  return indexValue(series, to, key) / indexValue(series, from, key) - 1;
}
