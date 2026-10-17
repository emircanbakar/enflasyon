import { EnflasyonError } from "../errors.js";
import { MAX_SERIES_LENGTH } from "../internal/limits.js";
import { isPlainRecord } from "../internal/object.js";
import type { IndexSeries, Period } from "../types.js";

/**
 * Serinin düz bir obje olduğunu ve 1200 aydan uzun olmadığını doğrular.
 * `key`, hata ayrıntısında hangi kalemin serisi olduğunu gösterir.
 */
export function assertSeries(series: unknown, key?: string): asserts series is IndexSeries {
  if (!isPlainRecord(series)) {
    throw new EnflasyonError("INVALID_INPUT", "Index series must be a plain object", { key });
  }
  const length = Object.keys(series).length;
  if (length > MAX_SERIES_LENGTH) {
    throw new EnflasyonError(
      "LIMIT_EXCEEDED",
      `Series has more than ${String(MAX_SERIES_LENGTH)} periods`,
      { key, length, limit: MAX_SERIES_LENGTH },
    );
  }
}

/**
 * Serideki bir ayın endeks değerini doğrulayarak okur.
 *
 * Ay seride yoksa `MISSING_PERIOD`, değer sayı değilse `INVALID_INPUT`,
 * sonlu değilse `NON_FINITE`, sıfır veya negatifse `NON_POSITIVE_INDEX` fırlatır.
 * Yalnızca serinin kendi anahtarlarına bakar (prototip zincirine değil).
 */
export function indexValue(series: IndexSeries, period: Period, key?: string): number {
  if (!Object.hasOwn(series, period)) {
    throw new EnflasyonError("MISSING_PERIOD", "Series has no value for the period", {
      key,
      period,
    });
  }
  const value: unknown = series[period];
  if (typeof value !== "number") {
    throw new EnflasyonError("INVALID_INPUT", "Index values must be numbers", { key, period });
  }
  if (!Number.isFinite(value)) {
    throw new EnflasyonError("NON_FINITE", "Index values must be finite", { key, period, value });
  }
  if (value <= 0) {
    throw new EnflasyonError("NON_POSITIVE_INDEX", "Index values must be positive", {
      key,
      period,
      value,
    });
  }
  return value;
}
