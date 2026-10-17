/**
 * `"2026-09"` biçiminde ay. Gün ve saat dilimi bilinçli olarak yoktur.
 *
 * Tip yalnızca kabaca biçimi anlatır; `"2026-13"` gibi geçersiz değerleri
 * çalışma anında `isPeriod` ve paket fonksiyonları reddeder.
 */
export type Period = `${number}-${number}`;

/**
 * Bir kalemin aylık endeks değerleri.
 *
 * @example
 * const kira: IndexSeries = { "2025-09": 3012.4, "2025-10": 3080.1 };
 */
export type IndexSeries = Readonly<Record<Period, number>>;

/**
 * Kalem kimliği → endeks serisi.
 *
 * @example
 * const indices: IndexSet = { konut: { ... }, gida: { ... }, genel: { ... } };
 */
export type IndexSet = Readonly<Record<string, IndexSeries>>;

/**
 * Kullanıcı sepeti.
 *
 * - `"amount"`: değerler TL tutar (veya herhangi bir göreli büyüklük); paket paya çevirir.
 * - `"share"`: değerler 0..1 arası pay; toplamı 1 olmalıdır (tolerans 1e-6).
 */
export interface Basket {
  readonly mode: "amount" | "share";
  readonly items: Readonly<Record<string, number>>;
}

/** Normalize edilmiş sepet: tüm paylar 0..1 arası ve toplamı 1. */
export type Weights = Readonly<Record<string, number>>;

/** Kişisel enflasyon hesabının girdisi. */
export interface PersonalInflationInput {
  readonly basket: Basket;
  readonly indices: IndexSet;
  readonly from: Period;
  readonly to: Period;
  /** Sepette olup endeksi olmayan kalem için davranış. Varsayılan: `"error"`. */
  readonly onMissing?: "error" | "fallback";
  /** `onMissing: "fallback"` iken kullanılacak seri anahtarı. Örn. `"genel"`. */
  readonly fallbackKey?: string;
  /**
   * Sepet paylarının hangi döneme ait olduğu. Varsayılan: `"from"`.
   *
   * `"to"`: kullanıcı bugünkü harcamasını girdi; paylar `from` dönemine deflate edilir.
   */
  readonly weightsAt?: "from" | "to";
}

/**
 * Hazır dönem fonksiyonlarının (`annual`, `monthly`, `yearToDate`,
 * `twelveMonthAverage`) girdisi: `from`/`to` yerine tek bir hedef ay.
 */
export interface PeriodInflationInput extends Omit<PersonalInflationInput, "from" | "to"> {
  /** Hedef ay; dönemin sonu. */
  readonly at: Period;
}

/** Bir kalemin kişisel enflasyona katkısı. */
export interface Contribution {
  readonly key: string;
  /** Kalemin payı, 0..1. */
  readonly weight: number;
  /** Kalemin kendi değişimi, oran (0.45 = %45). */
  readonly change: number;
  /** `weight × change`, puan olarak oran. */
  readonly contribution: number;
  /**
   * Toplam enflasyondaki payı: `contribution / rate`.
   * `rate = 0` iken `null`. Katkılar zıt işaretliyse 0..1 dışına çıkabilir.
   */
  readonly share: number | null;
  /** Kalemin serisi yoktu ve `fallbackKey` serisi kullanıldı. */
  readonly usedFallback: boolean;
}

/** Kişisel enflasyon hesabının sonucu. */
export interface PersonalInflationResult {
  /** Oran: 0.52 = %52. */
  readonly rate: number;
  readonly from: Period;
  readonly to: Period;
  /** Mutlak katkıya göre azalan, eşitlikte anahtara göre sıralı. */
  readonly contributions: readonly Contribution[];
}
