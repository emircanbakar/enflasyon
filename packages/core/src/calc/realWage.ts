import { EnflasyonError } from "../errors.js";
import { assertAmount, assertRate } from "../internal/number.js";
import { isPlainRecord } from "../internal/object.js";

/** {@link realWageChange} girdisi. */
export interface RealWageInput {
  /** Önceki maaş (ör. son zamdan önce). 0'dan büyük olmalıdır. */
  readonly wageFrom: number;
  /** Şimdiki maaş. */
  readonly wageTo: number;
  /** Aynı dönemdeki enflasyon oranı (0.4 = %40). */
  readonly rate: number;
}

/** {@link realWageChange} sonucu. */
export interface RealWageResult {
  /** Reel değişim oranı; negatifse maaş enflasyona yenilmiştir. */
  readonly real: number;
  /** Satın alma gücünü korumak için gereken maaş: `wageFrom × (1 + rate)`. */
  readonly requiredWage: number;
}

/**
 * Maaşın enflasyona göre reel değişimini hesaplar:
 * `reel = (wageTo / wageFrom) / (1 + rate) − 1`.
 *
 * @throws {EnflasyonError} `INVALID_INPUT` (obje/sayı değil, `wageFrom` 0 veya
 *   oran ≤ −1), `NON_FINITE`, `NEGATIVE_VALUE`
 *
 * @example
 * realWageChange({ wageFrom: 40000, wageTo: 52000, rate: 0.5 });
 * // { real: -0.1333…, requiredWage: 60000 }  → maaş %13,3 eridi
 */
export function realWageChange(input: RealWageInput): RealWageResult {
  if (!isPlainRecord(input)) {
    throw new EnflasyonError("INVALID_INPUT", "Input must be a plain object");
  }
  const wageFrom = assertAmount(input.wageFrom, "wageFrom");
  const wageTo = assertAmount(input.wageTo, "wageTo");
  const rate = assertRate(input.rate);
  if (wageFrom === 0) {
    throw new EnflasyonError("INVALID_INPUT", "wageFrom must be greater than 0", {
      field: "wageFrom",
    });
  }
  return Object.freeze({
    real: wageTo / wageFrom / (1 + rate) - 1,
    requiredWage: wageFrom * (1 + rate),
  });
}
