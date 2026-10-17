import { roundTo } from "enflasyon-core";
import type { Period } from "enflasyon-core";

/**
 * Türkçe sayı, yüzde, para ve tarih biçimleri (docs/web.md, Bölüm 5.5).
 *
 * Hesaplar ham oran döndürür (0.481 = %48,1); yuvarlama yalnızca burada, gösterim
 * için yapılır. Yuvarlama `enflasyon-core`'un `roundTo`'su ile "half away from
 * zero" kuralıyla yapılır; böylece 1.005 gibi değerler doğru yuvarlanır.
 */

const LOCALE = "tr-TR";
const NBSP = " ";

const percentFormatters = new Map<number, Intl.NumberFormat>();
const decimalFormatters = new Map<number, Intl.NumberFormat>();

function percentFormatter(digits: number): Intl.NumberFormat {
  let formatter = percentFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "percent",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      // Sıfıra yuvarlanan negatif değerler "-%0,0" değil "%0,0" görünür.
      signDisplay: "negative",
    });
    percentFormatters.set(digits, formatter);
  }
  return formatter;
}

function decimalFormatter(digits: number): Intl.NumberFormat {
  let formatter = decimalFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: "negative",
    });
    decimalFormatters.set(digits, formatter);
  }
  return formatter;
}

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Oranı yüzde olarak gösterir: `0.4812` → `"%48,1"`. */
export function formatPercent(rate: number, digits = 1): string {
  return percentFormatter(digits).format(roundTo(rate * 100, digits) / 100);
}

/**
 * İki oran arasındaki farkı puan olarak gösterir (işaretsiz): `0.163` → `"16,3 puan"`.
 * Yüzde puan farkı "%" ile değil "puan" kelimesiyle yazılır.
 */
export function formatPoints(rateDifference: number, digits = 1): string {
  const points = roundTo(Math.abs(rateDifference) * 100, digits);
  return `${decimalFormatter(digits).format(points)}${NBSP}puan`;
}

export type Direction = "yüksek" | "düşük" | "eşit";

/**
 * Kişisel oranı resmi oranla karşılaştırır. Gösterilen basamakta fark yoksa
 * `"eşit"` döner; böylece "0,0 puan yüksek" gibi çelişkili metin oluşmaz.
 *
 * @example
 * compareRates(0.481, 0.318); // { points: "16,3 puan", direction: "yüksek" }
 */
export function compareRates(
  personal: number,
  official: number,
  digits = 1,
): { readonly points: string; readonly direction: Direction } {
  const difference = personal - official;
  const rounded = roundTo(difference * 100, digits);
  const direction: Direction = rounded === 0 ? "eşit" : rounded > 0 ? "yüksek" : "düşük";
  return { points: formatPoints(difference, digits), direction };
}

/** TL tutarını kuruşsuz gösterir: `29624.4` → `"29.624 ₺"`. */
export function formatTry(amount: number): string {
  return `${decimalFormatter(0).format(roundTo(amount, 0))}${NBSP}₺`;
}

/** Dönemi ay adıyla gösterir: `"2026-09"` → `"Eylül 2026"`. */
export function formatMonth(period: Period): string {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  return monthFormatter.format(Date.UTC(year, month - 1, 1));
}
