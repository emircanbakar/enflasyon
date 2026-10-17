import { EnflasyonError } from "../errors.js";

/** Değer sayı değilse `INVALID_INPUT`, sonlu değilse `NON_FINITE` fırlatır. */
export function assertFinite(value: unknown, field: string): number {
  if (typeof value !== "number") {
    throw new EnflasyonError("INVALID_INPUT", `${field} must be a number`, { field });
  }
  if (!Number.isFinite(value)) {
    throw new EnflasyonError("NON_FINITE", `${field} must be finite`, { field, value });
  }
  return value;
}

/** Tutar sonlu ve ≥ 0 değilse hata fırlatır (`NEGATIVE_VALUE`). */
export function assertAmount(value: unknown, field: string): number {
  const amount = assertFinite(value, field);
  if (amount < 0) {
    throw new EnflasyonError("NEGATIVE_VALUE", `${field} must not be negative`, {
      field,
      value: amount,
    });
  }
  return amount;
}

/**
 * Enflasyon oranını doğrular: sonlu ve −1'den büyük olmalıdır (fiyatlar sıfıra
 * veya altına inemez). Aksi halde `INVALID_INPUT`.
 */
export function assertRate(value: unknown, field = "rate"): number {
  const rate = assertFinite(value, field);
  if (rate <= -1) {
    throw new EnflasyonError("INVALID_INPUT", `${field} must be greater than -1`, {
      field,
      value: rate,
    });
  }
  return rate;
}
