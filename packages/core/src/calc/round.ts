import { EnflasyonError } from "../errors.js";
import { assertFinite } from "../internal/number.js";

/** Desteklenen en fazla ondalık basamak (double'ın anlamlı basamak sınırı). */
const MAX_DECIMALS = 15;

/**
 * Sayıyı verilen ondalık basamağa "half away from zero" kuralıyla yuvarlar.
 *
 * Kayan nokta gösterim hatası düzeltilir: `1.005` aslında `1.00499999…` olarak
 * saklandığı için `Math.round(1.005 * 100) / 100` yanlışlıkla `1` verir; bu
 * fonksiyon `1.01` verir. Paket hesaplarda hiç yuvarlama yapmaz; bu fonksiyon
 * yalnızca gösterim ve kuruş hesabı içindir.
 *
 * @param decimals 0–15 arası tam sayı.
 * @throws {EnflasyonError} `INVALID_INPUT`, `NON_FINITE`
 *
 * @example
 * roundTo(1.005, 2);    // 1.01
 * roundTo(-2.5, 0);     // -3
 * roundTo(29624.4, 0);  // 29624
 */
export function roundTo(value: number, decimals: number): number {
  const x = assertFinite(value, "value");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw new EnflasyonError("INVALID_INPUT", "decimals must be an integer from 0 to 15", {
      field: "decimals",
      value: decimals,
    });
  }
  const factor = 10 ** decimals;
  const scaled = Math.abs(x) * factor;
  // Bu büyüklükte double zaten tam sayıdır; çarpma taşmasın diye olduğu gibi dön.
  if (scaled >= Number.MAX_SAFE_INTEGER) return x;
  // (1 + EPSILON) ile çarpmak, x.xx5'in hemen altında saklanan değerleri yarıma taşır.
  const rounded = Math.round(scaled * (1 + Number.EPSILON)) / factor;
  // -0 yerine 0 döndür.
  return rounded === 0 ? 0 : Math.sign(x) * rounded;
}
