import { assertAmount, assertRate } from "../internal/number.js";

/**
 * Eski bir tutarın, aradaki enflasyonla bugünkü karşılığını döndürür:
 * `tutar × (1 + oran)`.
 *
 * Oran kişisel (`personalInflation(...).rate`) veya resmi olabilir. Sonuç
 * yuvarlanmaz; kuruş gösterimi için `roundTo(sonuç, 2)` kullanılır.
 *
 * @throws {EnflasyonError} `INVALID_INPUT` (sayı değil veya oran ≤ −1),
 *   `NON_FINITE`, `NEGATIVE_VALUE`
 *
 * @example
 * adjustAmount(20000, 0.4812); // 29624
 */
export function adjustAmount(amount: number, rate: number): number {
  return assertAmount(amount, "amount") * (1 + assertRate(rate));
}
