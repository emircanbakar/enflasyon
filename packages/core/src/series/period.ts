import { EnflasyonError } from "../errors.js";
import { MAX_SERIES_LENGTH } from "../internal/limits.js";
import type { IndexSeries, Period } from "../types.js";

/** 1000–9999 yılları arası, iki haneli ay. */
const PERIOD_PATTERN = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/;

const MIN_MONTH_INDEX = 1000 * 12;
const MAX_MONTH_INDEX = 9999 * 12 + 11;

/**
 * Değerin geçerli bir `"YYYY-MM"` dönemi olup olmadığını söyler.
 *
 * @example
 * isPeriod("2026-09"); // true
 * isPeriod("2026-13"); // false
 * isPeriod("2026-9");  // false
 */
export function isPeriod(value: unknown): value is Period {
  return typeof value === "string" && PERIOD_PATTERN.test(value);
}

/** Geçersiz dönemde `INVALID_PERIOD` fırlatır. `field`, hata ayrıntısında görünür. */
export function assertPeriod(value: unknown, field = "period"): Period {
  if (!isPeriod(value)) {
    throw new EnflasyonError("INVALID_PERIOD", `Invalid ${field}: expected "YYYY-MM"`, {
      field,
      value,
    });
  }
  return value;
}

/** Dönemi mutlak ay sayısına çevirir (yıl × 12 + ay − 1). */
export function toMonthIndex(period: Period): number {
  const valid = assertPeriod(period);
  // Biçim doğrulandı: ilk 4 karakter yıl, son 2 karakter ay.
  return Number(valid.slice(0, 4)) * 12 + Number(valid.slice(5, 7)) - 1;
}

/** Mutlak ay sayısını döneme çevirir. 1000–9999 aralığı dışında `INVALID_PERIOD`. */
export function fromMonthIndex(index: number): Period {
  if (!Number.isSafeInteger(index) || index < MIN_MONTH_INDEX || index > MAX_MONTH_INDEX) {
    throw new EnflasyonError(
      "INVALID_PERIOD",
      "Resulting period is out of range (1000-01..9999-12)",
      {
        index,
      },
    );
  }
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${String(year)}-${String(month).padStart(2, "0")}` as Period;
}

/**
 * Döneme ay ekler veya çıkarır; yıl geçişlerini doğru yapar.
 *
 * @param months Tam sayı olmalıdır; negatif değer geriye gider.
 * @example
 * addMonths("2025-12", 1);   // "2026-01"
 * addMonths("2026-09", -12); // "2025-09"
 */
export function addMonths(period: Period, months: number): Period {
  if (!Number.isFinite(months)) {
    throw new EnflasyonError("NON_FINITE", "months must be a finite number", { months });
  }
  if (!Number.isInteger(months)) {
    throw new EnflasyonError("INVALID_PERIOD", "months must be an integer", { months });
  }
  return fromMonthIndex(toMonthIndex(period) + months);
}

/** İki dönemi karşılaştırır: `a < b` ise negatif, eşitse 0, `a > b` ise pozitif. */
export function comparePeriods(a: Period, b: Period): number {
  return toMonthIndex(a) - toMonthIndex(b);
}

/** `from`'dan `to`'ya kaç ay olduğunu döndürür (`to` önceyse negatif). */
export function monthsBetween(from: Period, to: Period): number {
  return toMonthIndex(to) - toMonthIndex(from);
}

/** `from > to` ise `PERIOD_ORDER` fırlatır. */
export function assertPeriodOrder(from: Period, to: Period): void {
  if (comparePeriods(from, to) > 0) {
    throw new EnflasyonError("PERIOD_ORDER", "from must not be after to", { from, to });
  }
}

/**
 * Serideki dönemleri eskiden yeniye sıralı döndürür.
 *
 * Seri anahtarları doğrulanır: geçersiz anahtarda `INVALID_PERIOD`, 1200'den fazla
 * ayda `LIMIT_EXCEEDED` fırlatılır. Değerler bu fonksiyonda kontrol edilmez.
 *
 * @example
 * availablePeriods({ "2026-02": 101, "2026-01": 100 }); // ["2026-01", "2026-02"]
 */
export function availablePeriods(series: IndexSeries): Period[] {
  const keys = Object.keys(series);
  if (keys.length > MAX_SERIES_LENGTH) {
    throw new EnflasyonError(
      "LIMIT_EXCEEDED",
      `Series has more than ${String(MAX_SERIES_LENGTH)} periods`,
      {
        length: keys.length,
        limit: MAX_SERIES_LENGTH,
      },
    );
  }
  return keys.map((key) => assertPeriod(key, "series key")).sort((a, b) => comparePeriods(a, b));
}
