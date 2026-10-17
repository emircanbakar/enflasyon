const ERROR_CODES = [
  /** Sepet boş veya tüm değerler 0. */
  "EMPTY_BASKET",
  /** Sepette negatif tutar veya pay. */
  "NEGATIVE_VALUE",
  /** `NaN` veya `Infinity`. */
  "NON_FINITE",
  /** `share` modunda toplam 1 değil (tolerans 1e-6). */
  "SHARES_NOT_ONE",
  /** `"2026-13"`, `"26-01"` gibi geçersiz dönem. */
  "INVALID_PERIOD",
  /** `from`, `to`'dan sonra. */
  "PERIOD_ORDER",
  /** Sepetteki kalemin serisi yok. */
  "MISSING_SERIES",
  /** Seride ilgili ay yok. */
  "MISSING_PERIOD",
  /** Endeks değeri ≤ 0. */
  "NON_POSITIVE_INDEX",
  /** Zincirlemede ortak dönem yok. */
  "NO_OVERLAP",
  /** `__proto__`, `constructor`, `prototype` veya boş anahtar. */
  "INVALID_KEY",
  /** Sepette 500'den fazla kalem veya seride 1200'den fazla ay. */
  "LIMIT_EXCEEDED",
  /** Girdinin yapısı yanlış: bilinmeyen sepet modu, obje olmayan kalemler, sayı olmayan değer. */
  "INVALID_INPUT",
] as const;

/** Makine tarafından okunabilir hata kodu. UI, mesajı bu koda göre üretir. */
export type EnflasyonErrorCode = (typeof ERROR_CODES)[number];

const ERROR_CODE_SET: ReadonlySet<string> = new Set<string>(ERROR_CODES);

const ERROR_NAME = "EnflasyonError";

/**
 * Paketin fırlattığı tek hata sınıfı.
 *
 * Mesajlar İngilizce ve geliştiriciye yöneliktir; kullanıcıya gösterilecek metin
 * `code` alanından üretilmelidir. Hata yakalarken `instanceof` yerine
 * {@link isEnflasyonError} kullanın (ESM ve CJS kopyaları aynı uygulamada
 * yüklendiğinde `instanceof` yanılabilir).
 *
 * @example
 * try {
 *   annual(input);
 * } catch (e) {
 *   if (isEnflasyonError(e) && e.code === "MISSING_PERIOD") {
 *     // ...
 *   }
 * }
 */
export class EnflasyonError extends Error {
  override readonly name: typeof ERROR_NAME = ERROR_NAME;
  readonly code: EnflasyonErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: EnflasyonErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

/**
 * Değerin bu paketin fırlattığı bir hata olup olmadığını söyler.
 *
 * Sınıfa (`instanceof`) değil, `name` ve `code` alanlarına bakar; böylece paketin
 * ESM ve CJS kopyaları arasında da doğru çalışır.
 */
export function isEnflasyonError(value: unknown): value is EnflasyonError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { name?: unknown; code?: unknown };
  return (
    candidate.name === ERROR_NAME &&
    typeof candidate.code === "string" &&
    ERROR_CODE_SET.has(candidate.code)
  );
}
