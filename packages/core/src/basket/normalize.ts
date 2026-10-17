import { EnflasyonError } from "../errors.js";
import { safeSum } from "../internal/math.js";
import type { Basket, Weights } from "../types.js";
import { validateBasket } from "./validate.js";

/** `share` modunda pay toplamının 1'den sapabileceği en büyük miktar. */
export const SHARE_TOLERANCE = 1e-6;

/**
 * Sepeti, toplamı 1 olan paylara çevirir.
 *
 * - `"amount"` modunda değerler göreli büyüklük kabul edilir (TL tutarı veya
 *   toplamı 100 olmayan yüzdeler); her kalemin payı `değer / toplam`'dır.
 * - `"share"` modunda değerler zaten paydır; toplam 1'den en fazla `1e-6` sapabilir
 *   (aksi halde `SHARES_NOT_ONE`) ve küçük sapma yeniden normalize edilerek giderilir.
 *
 * Değeri 0 olan kalemler sonuçta yer almaz. Dönen obje dondurulmuştur, prototipi
 * yoktur ve anahtarları sıralıdır; aynı sepet, anahtar sırası farklı da olsa
 * bit düzeyinde aynı payları üretir.
 *
 * @throws {EnflasyonError} `INVALID_INPUT`, `INVALID_KEY`, `LIMIT_EXCEEDED`,
 *   `NON_FINITE`, `NEGATIVE_VALUE`, `EMPTY_BASKET`, `SHARES_NOT_ONE`
 *
 * @example
 * normalizeBasket({ mode: "amount", items: { konut: 30000, gida: 10000 } });
 * // { gida: 0.25, konut: 0.75 }
 */
export function normalizeBasket(basket: Basket): Weights {
  const entries = validateBasket(basket).filter((entry) => entry.value > 0);
  if (entries.length === 0) {
    throw new EnflasyonError("EMPTY_BASKET", "Basket has no item with a positive value");
  }

  if (basket.mode === "share") {
    const shareTotal = safeSum(entries.map((entry) => entry.value));
    if (Math.abs(shareTotal - 1) > SHARE_TOLERANCE) {
      throw new EnflasyonError("SHARES_NOT_ONE", "Shares must add up to 1", {
        total: shareTotal,
        tolerance: SHARE_TOLERANCE,
      });
    }
  }

  // En büyük değere bölerek ölçekle: çok büyük tutarlarda toplam taşmaz (Infinity olmaz).
  const max = Math.max(...entries.map((entry) => entry.value));
  const scaled = entries.map((entry) => ({ key: entry.key, value: entry.value / max }));
  const total = safeSum(scaled.map((entry) => entry.value));

  const weights = Object.create(null) as Record<string, number>;
  for (const entry of scaled) {
    weights[entry.key] = entry.value / total;
  }
  return Object.freeze(weights);
}
