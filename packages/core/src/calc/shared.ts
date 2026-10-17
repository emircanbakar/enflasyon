import { normalizeBasket } from "../basket/normalize.js";
import { compareKeys } from "../basket/validate.js";
import { EnflasyonError } from "../errors.js";
import { safeSum } from "../internal/math.js";
import { isPlainRecord } from "../internal/object.js";
import type { Contribution, IndexSeries, Period, PersonalInflationResult } from "../types.js";

/**
 * Bu değerden küçük oranlar katkı payı hesabında sıfır sayılır (`share: null`).
 *
 * Artış ve düşüşler kağıt üzerinde birbirini tam götürse de kayan noktada oran
 * `5.5e-17` gibi çıkabilir; bu durumda `contribution / rate` anlamsız derecede büyür.
 * Oranın kendisi yuvarlanmaz; 1e-12, yüzde olarak 1e-10'dur ve gösterimde 0'dır.
 */
export const ZERO_RATE_EPSILON = 1e-12;

/** Sepetteki bir kalem ve fiyatını taşıyan seri. */
export interface ResolvedItem {
  readonly key: string;
  /** Sepet payı (normalize edilmiş, henüz deflate edilmemiş). */
  readonly weight: number;
  readonly series: IndexSeries;
  /** Hata ayrıntıları için serinin `indices` içindeki anahtarı. */
  readonly seriesKey: string;
  readonly usedFallback: boolean;
}

/** Sonuca girecek, ağırlığı ve değişimi hesaplanmış kalem. */
export interface ItemPart {
  readonly key: string;
  readonly weight: number;
  readonly change: number;
  readonly contribution: number;
  readonly usedFallback: boolean;
}

export interface CommonInput {
  readonly items: readonly ResolvedItem[];
  readonly weightsAt: "from" | "to";
}

/** Girdinin düz obje olduğunu doğrular. */
export function assertInputRecord(input: unknown): asserts input is Record<string, unknown> {
  if (!isPlainRecord(input)) {
    throw new EnflasyonError("INVALID_INPUT", "Input must be a plain object");
  }
}

/**
 * Hesap fonksiyonlarının ortak girdisini doğrular: seçenekler, `indices` ve sepet.
 * Her sepet kalemi için seriyi (gerekirse yedek seriyi) bulur. Kalemler
 * `normalizeBasket`'in deterministik sırasıyla döner.
 */
export function readCommonInput(input: Record<string, unknown>): CommonInput {
  const { onMissing = "error", fallbackKey, weightsAt = "from" } = input;
  if (weightsAt !== "from" && weightsAt !== "to") {
    throw new EnflasyonError("INVALID_INPUT", 'weightsAt must be "from" or "to"', { weightsAt });
  }
  if (onMissing !== "error" && onMissing !== "fallback") {
    throw new EnflasyonError("INVALID_INPUT", 'onMissing must be "error" or "fallback"', {
      onMissing,
    });
  }
  if (onMissing === "fallback" && (typeof fallbackKey !== "string" || fallbackKey === "")) {
    throw new EnflasyonError("INVALID_INPUT", 'onMissing "fallback" requires a fallbackKey');
  }
  const fallback = onMissing === "fallback" ? (fallbackKey as string) : null;

  const { indices } = input;
  if (!isPlainRecord(indices)) {
    throw new EnflasyonError("INVALID_INPUT", "indices must be a plain object");
  }
  const weights = normalizeBasket(input["basket"] as Parameters<typeof normalizeBasket>[0]);

  const items = Object.entries(weights).map(([key, weight]) => ({
    key,
    weight,
    ...resolveSeries(indices, key, fallback),
  }));
  return { items, weightsAt };
}

function resolveSeries(
  indices: Record<string, unknown>,
  key: string,
  fallbackKey: string | null,
): { series: IndexSeries; seriesKey: string; usedFallback: boolean } {
  if (Object.hasOwn(indices, key)) {
    return { series: indices[key] as IndexSeries, seriesKey: key, usedFallback: false };
  }
  if (fallbackKey === null) {
    throw new EnflasyonError("MISSING_SERIES", "No index series for basket item", { key });
  }
  if (!Object.hasOwn(indices, fallbackKey)) {
    throw new EnflasyonError("MISSING_SERIES", "Fallback series not found in indices", {
      key: fallbackKey,
      missingFor: key,
    });
  }
  return {
    series: indices[fallbackKey] as IndexSeries,
    seriesKey: fallbackKey,
    usedFallback: true,
  };
}

/**
 * Pay ve katkıları dondurulmuş sonuca çevirir. Oran, katkıların verilen sırayla
 * telafili toplamıdır; katkılar mutlak değere göre azalan, eşitlikte anahtara göre sıralanır.
 */
export function buildResult(
  parts: readonly ItemPart[],
  from: Period,
  to: Period,
): PersonalInflationResult {
  const rate = safeSum(parts.map((part) => part.contribution));
  const contributions: Contribution[] = parts.map((part) =>
    Object.freeze({
      key: part.key,
      weight: part.weight,
      change: part.change,
      contribution: part.contribution,
      share: Math.abs(rate) < ZERO_RATE_EPSILON ? null : part.contribution / rate,
      usedFallback: part.usedFallback,
    }),
  );
  contributions.sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution) || compareKeys(a.key, b.key),
  );
  return Object.freeze({ rate, from, to, contributions: Object.freeze(contributions) });
}
