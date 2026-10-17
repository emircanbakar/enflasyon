import { assertSafeKey, compareKeys } from "../basket/validate.js";
import { EnflasyonError } from "../errors.js";
import { MAX_BASKET_ITEMS } from "../internal/limits.js";
import { isPlainRecord } from "../internal/object.js";
import type { IndexSeries, IndexSet, Period } from "../types.js";
import { assertSeries, indexValue } from "./lookup.js";
import { availablePeriods } from "./period.js";

/**
 * Dışarıdan gelen veriyi (JSON dosyası, API yanıtı) doğrulayıp tipli bir
 * `IndexSet`'e çevirir.
 *
 * `import data from "./tuik.json"` TypeScript'te dönem anahtarlarını `Period`
 * olarak tanımaz; bu fonksiyon her anahtarı ve değeri doğrular, böylece `as`
 * ile tip zorlamak gerekmez. Hatalar ilk sorunlu seride ve ayda durur.
 *
 * Dönen yapı ve içindeki seriler dondurulmuş ve prototipsizdir; seri anahtarları
 * alfabetik, aylar eskiden yeniye sıralıdır.
 *
 * @throws {EnflasyonError} `INVALID_INPUT`, `INVALID_KEY`, `LIMIT_EXCEEDED`
 *   (500'den fazla seri veya 1200'den fazla ay), `INVALID_PERIOD`, `NON_FINITE`,
 *   `NON_POSITIVE_INDEX`
 *
 * @example
 * import data from "./tuik-2026-09.json" with { type: "json" };
 * const indices = toIndexSet(data);
 */
export function toIndexSet(data: unknown): IndexSet {
  if (!isPlainRecord(data)) {
    throw new EnflasyonError("INVALID_INPUT", "Index data must be a plain object");
  }
  const keys = Object.keys(data);
  if (keys.length > MAX_BASKET_ITEMS) {
    throw new EnflasyonError(
      "LIMIT_EXCEEDED",
      `Index set has more than ${String(MAX_BASKET_ITEMS)} series`,
      { length: keys.length, limit: MAX_BASKET_ITEMS },
    );
  }

  const result = Object.create(null) as Record<string, IndexSeries>;
  for (const key of keys.sort(compareKeys)) {
    assertSafeKey(key);
    const series = data[key];
    assertSeries(series, key);
    const copy = Object.create(null) as Record<Period, number>;
    for (const period of availablePeriods(series)) {
      copy[period] = indexValue(series, period, key);
    }
    result[key] = Object.freeze(copy);
  }
  return Object.freeze(result);
}
