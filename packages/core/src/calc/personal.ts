import { safeSum } from "../internal/math.js";
import { assertPeriod } from "../series/period.js";
import type { PersonalInflationInput, PersonalInflationResult } from "../types.js";
import { changeBetween } from "./change.js";
import { assertInputRecord, buildResult, readCommonInput } from "./shared.js";

export { ZERO_RATE_EPSILON } from "./shared.js";

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
 * her katkının `share` alanı `null`'dır (bkz. `ZERO_RATE_EPSILON`).
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
  assertInputRecord(input);
  const from = assertPeriod(input.from, "from");
  const to = assertPeriod(input.to, "to");
  const { items, weightsAt } = readCommonInput(input);

  let changed = items.map((item) => ({
    key: item.key,
    weight: item.weight,
    change: changeBetween(item.series, from, to, item.seriesKey),
    usedFallback: item.usedFallback,
  }));

  if (weightsAt === "to") {
    // Bugünkü payları (sᵢ) başlangıç dönemine taşı: wᵢ = (sᵢ / (1 + rᵢ)) / Σ.
    // Endeksler pozitif olduğu için 1 + rᵢ > 0'dır.
    const deflated = changed.map((item) => ({ ...item, weight: item.weight / (1 + item.change) }));
    const total = safeSum(deflated.map((item) => item.weight));
    changed = deflated.map((item) => ({ ...item, weight: item.weight / total }));
  }

  return buildResult(
    changed.map((item) => ({ ...item, contribution: item.weight * item.change })),
    from,
    to,
  );
}
