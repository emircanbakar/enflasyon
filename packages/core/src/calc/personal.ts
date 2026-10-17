import { normalizeBasket } from "../basket/normalize.js";
import { compareKeys } from "../basket/validate.js";
import { EnflasyonError } from "../errors.js";
import { safeSum } from "../internal/math.js";
import { isPlainRecord } from "../internal/object.js";
import { assertPeriod } from "../series/period.js";
import type {
  Contribution,
  IndexSeries,
  PersonalInflationInput,
  PersonalInflationResult,
} from "../types.js";
import { changeBetween } from "./change.js";

/**
 * Bu değerden küçük oranlar katkı payı hesabında sıfır sayılır (`share: null`).
 *
 * Artış ve düşüşler kağıt üzerinde birbirini tam götürse de kayan noktada oran
 * `5.5e-17` gibi çıkabilir; bu durumda `contribution / rate` anlamsız derecede büyür.
 * Oranın kendisi yuvarlanmaz; 1e-12, yüzde olarak 1e-10'dur ve gösterimde 0'dır.
 */
export const ZERO_RATE_EPSILON = 1e-12;

interface ItemChange {
  readonly key: string;
  readonly weight: number;
  readonly change: number;
  readonly usedFallback: boolean;
}

interface Options {
  /** `onMissing: "fallback"` iken yedek seri anahtarı; aksi halde `null`. */
  readonly fallbackKey: string | null;
  readonly weightsAt: "from" | "to";
}

/**
 * Sepetin iki dönem arasındaki kişisel enflasyonunu sabit ağırlıklı Laspeyres
 * yöntemiyle hesaplar: `π = Σ wᵢ · rᵢ`.
 *
 * - `weightsAt: "from"` (varsayılan): sepet payları `from` dönemine ait kabul edilir.
 * - `weightsAt: "to"`: sepet bugünkü harcamadır; paylar önce `from` dönemine deflate
 *   edilir (`wᵢ ∝ sᵢ / (1 + rᵢ)`). Bu durumda `1 + π = 1 / Σ sᵢ / (1 + rᵢ)` olur.
 *
 * Katkılar (`wᵢ · rᵢ`) anahtar sırasıyla telafili toplanır; sonuç obje anahtar
 * sırasından bağımsız ve bit düzeyinde deterministiktir. Katkılar mutlak değere
 * göre büyükten küçüğe, eşitlikte anahtara göre sıralanır. `|rate| < 1e-12` ise
 * her katkının `share` alanı `null`'dır (bkz. {@link ZERO_RATE_EPSILON}).
 *
 * Dönen sonuç ve içindeki tüm objeler dondurulmuştur; girdi değiştirilmez.
 *
 * @throws {EnflasyonError} sepet hataları (`normalizeBasket`), `INVALID_PERIOD`,
 *   `PERIOD_ORDER`, `INVALID_INPUT`, `MISSING_SERIES`, `MISSING_PERIOD`,
 *   `NON_FINITE`, `NON_POSITIVE_INDEX`, `LIMIT_EXCEEDED`
 *
 * @example
 * personalInflation({
 *   basket: { mode: "share", items: { konut: 0.6, gida: 0.4 } },
 *   indices: {
 *     konut: { "2025-09": 100, "2026-09": 150 },
 *     gida: { "2025-09": 100, "2026-09": 125 },
 *   },
 *   from: "2025-09",
 *   to: "2026-09",
 * }).rate; // 0.4  (0,6 × %50 + 0,4 × %25)
 */
export function personalInflation(input: PersonalInflationInput): PersonalInflationResult {
  if (!isPlainRecord(input)) {
    throw new EnflasyonError("INVALID_INPUT", "Input must be a plain object");
  }
  const from = assertPeriod(input.from, "from");
  const to = assertPeriod(input.to, "to");
  const options = readOptions(input);
  const indices = input.indices as unknown;
  if (!isPlainRecord(indices)) {
    throw new EnflasyonError("INVALID_INPUT", "indices must be a plain object");
  }
  const weights = normalizeBasket(input.basket);

  // Sıra normalizeBasket'ten gelir ve aynı anahtar kümesi için her zaman aynıdır;
  // tüm toplamalar bu sırayla yapılır.
  let items: ItemChange[] = Object.entries(weights).map(([key, weight]) => {
    const { series, seriesKey, usedFallback } = resolveSeries(indices, key, options);
    return { key, weight, change: changeBetween(series, from, to, seriesKey), usedFallback };
  });

  if (options.weightsAt === "to") items = deflateWeights(items);

  const parts = items.map((item) => ({ ...item, contribution: item.weight * item.change }));
  const rate = safeSum(parts.map((part) => part.contribution));

  const result: Contribution[] = parts.map((part) =>
    Object.freeze({
      key: part.key,
      weight: part.weight,
      change: part.change,
      contribution: part.contribution,
      share: Math.abs(rate) < ZERO_RATE_EPSILON ? null : part.contribution / rate,
      usedFallback: part.usedFallback,
    }),
  );
  result.sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution) || compareKeys(a.key, b.key),
  );

  return Object.freeze({ rate, from, to, contributions: Object.freeze(result) });
}

/** Seçenekleri doğrular. Tipler bunu garanti eder, ama paket JS'ten de çağrılabilir. */
function readOptions(input: Record<string, unknown>): Options {
  const { onMissing = "error", fallbackKey, weightsAt = "from" } = input;
  if (weightsAt !== "from" && weightsAt !== "to") {
    throw new EnflasyonError("INVALID_INPUT", 'weightsAt must be "from" or "to"', { weightsAt });
  }
  if (onMissing === "error") return { fallbackKey: null, weightsAt };
  if (onMissing !== "fallback") {
    throw new EnflasyonError("INVALID_INPUT", 'onMissing must be "error" or "fallback"', {
      onMissing,
    });
  }
  if (typeof fallbackKey !== "string" || fallbackKey === "") {
    throw new EnflasyonError("INVALID_INPUT", 'onMissing "fallback" requires a fallbackKey');
  }
  return { fallbackKey, weightsAt };
}

function resolveSeries(
  indices: Record<string, unknown>,
  key: string,
  options: Options,
): { series: IndexSeries; seriesKey: string; usedFallback: boolean } {
  if (Object.hasOwn(indices, key)) {
    return { series: indices[key] as IndexSeries, seriesKey: key, usedFallback: false };
  }
  const { fallbackKey } = options;
  if (fallbackKey !== null) {
    if (Object.hasOwn(indices, fallbackKey)) {
      return {
        series: indices[fallbackKey] as IndexSeries,
        seriesKey: fallbackKey,
        usedFallback: true,
      };
    }
    throw new EnflasyonError("MISSING_SERIES", "Fallback series not found in indices", {
      key: fallbackKey,
      missingFor: key,
    });
  }
  throw new EnflasyonError("MISSING_SERIES", "No index series for basket item", { key });
}

/**
 * Bugünkü payları (`sᵢ`) başlangıç dönemine taşır: `wᵢ = (sᵢ / (1 + rᵢ)) / Σ`.
 * Endeksler pozitif olduğu için `1 + rᵢ > 0`'dır.
 */
function deflateWeights(items: readonly ItemChange[]): ItemChange[] {
  const deflated = items.map((item) => ({ ...item, weight: item.weight / (1 + item.change) }));
  const total = safeSum(deflated.map((item) => item.weight));
  return deflated.map((item) => ({ ...item, weight: item.weight / total }));
}
