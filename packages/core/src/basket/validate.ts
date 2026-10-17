import { EnflasyonError } from "../errors.js";
import { MAX_BASKET_ITEMS } from "../internal/limits.js";
import { isPlainRecord } from "../internal/object.js";
import type { Basket } from "../types.js";

/** Prototype pollution'a yol açabilecek anahtarlar. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

/** Doğrulanmış bir sepet kalemi. Değer sonlu ve ≥ 0'dır. */
export interface BasketEntry {
  readonly key: string;
  readonly value: number;
}

/** Kalem veya seri anahtarı güvenli değilse `INVALID_KEY` fırlatır. */
export function assertSafeKey(key: string): void {
  if (key.length === 0 || FORBIDDEN_KEYS.has(key)) {
    throw new EnflasyonError("INVALID_KEY", "Item keys must be non-empty and not reserved", {
      key,
    });
  }
}

/**
 * Sepetin yapısını ve değerlerini doğrular; kalemleri anahtara göre sıralı döndürür.
 *
 * Sıralı dönüş, sonraki toplamaların obje anahtar sırasından bağımsız ve
 * bit düzeyinde deterministik olmasını sağlar. Toplamın sıfır olup olmadığı veya
 * pay toplamının 1 olup olmadığı burada değil, normalize aşamasında kontrol edilir.
 */
export function validateBasket(basket: Basket): BasketEntry[] {
  // Tipler bunu garanti eder, ama paket JS'ten ve JSON'dan da çağrılabilir.
  const input = basket as unknown;
  if (typeof input !== "object" || input === null) {
    throw new EnflasyonError("INVALID_INPUT", "Basket must be an object");
  }
  const { mode, items } = input as { mode?: unknown; items?: unknown };
  if (mode !== "amount" && mode !== "share") {
    throw new EnflasyonError("INVALID_INPUT", 'Basket mode must be "amount" or "share"', {
      mode,
    });
  }
  if (!isPlainRecord(items)) {
    throw new EnflasyonError("INVALID_INPUT", "Basket items must be a plain object");
  }

  const keys = Object.keys(items);
  if (keys.length > MAX_BASKET_ITEMS) {
    throw new EnflasyonError(
      "LIMIT_EXCEEDED",
      `Basket has more than ${String(MAX_BASKET_ITEMS)} items`,
      { length: keys.length, limit: MAX_BASKET_ITEMS },
    );
  }

  return keys.sort(compareKeys).map((key) => {
    assertSafeKey(key);
    const value = items[key];
    if (typeof value !== "number") {
      throw new EnflasyonError("INVALID_INPUT", "Basket values must be numbers", { key });
    }
    if (!Number.isFinite(value)) {
      throw new EnflasyonError("NON_FINITE", "Basket values must be finite", { key, value });
    }
    if (value < 0) {
      throw new EnflasyonError("NEGATIVE_VALUE", "Basket values must not be negative", {
        key,
        value,
      });
    }
    // -0'ı 0'a çevirir; sonraki adımlarda işaret karmaşası olmaz.
    return { key, value: value === 0 ? 0 : value };
  });
}

/** Yerel ayardan bağımsız, kod birimi sırasına göre karşılaştırma. */
export function compareKeys(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
