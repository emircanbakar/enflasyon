import { isPeriod } from "enflasyon-core";
import type { Period } from "enflasyon-core";
import { z } from "zod";
import { CATEGORY_KEYS } from "../../lib/categories.ts";
import type { CategoryKey } from "../../lib/categories.ts";

/**
 * Veri pipeline'ının şemaları ve kod eşlemeleri (docs/web.md, Bölüm 4).
 *
 * Grup sırası TÜİK/COICOP 2018 sırasıdır: `CATEGORY_KEYS[i]` ↔ `"0" + (i + 1)` ↔
 * EVDS `TP.TUKFIY2025.0i`. Bu eşleme hem TÜİK veri portalı hem EVDS3 seri listesiyle
 * doğrulanmıştır (17 Ekim 2026).
 */

export type SeriesKey = CategoryKey | "genel";
export const SERIES_KEYS: readonly SeriesKey[] = ["genel", ...CATEGORY_KEYS];

/** "01" … "13" (COICOP 2018 ana grup kodu) → kategori anahtarı. */
export const COICOP_TO_KEY: ReadonlyMap<string, CategoryKey> = new Map(
  CATEGORY_KEYS.map((key, i) => [String(i + 1).padStart(2, "0"), key]),
);

export function coicopOf(key: SeriesKey): string {
  if (key === "genel") return "GENEL";
  return String(CATEGORY_KEYS.indexOf(key) + 1).padStart(2, "0");
}

export const period = z.custom<Period>(
  (value) => isPeriod(value),
  "YYYY-MM biçiminde dönem bekleniyor",
);
const positive = z.number().positive();

/** Bir endeks serisi: dönem → pozitif sonlu değer. */
export const seriesSchema = z.record(period, positive);

/** `data/cpi-groups.json`: genel endeks ve 13 grup, tümü aynı aylar. */
export const cpiGroupsSchema = z.object({
  base: z.literal("2025=100"),
  series: z.object(
    Object.fromEntries(SERIES_KEYS.map((key) => [key, seriesSchema])) as Record<
      SeriesKey,
      typeof seriesSchema
    >,
  ),
});
export type CpiGroups = z.infer<typeof cpiGroupsSchema>;

const weightRow = z.object(
  Object.fromEntries(CATEGORY_KEYS.map((key) => [key, z.number().nonnegative()])) as Record<
    CategoryKey,
    z.ZodNumber
  >,
);

/** `data/cpi-weights.json`: yıl → grup → resmi ağırlık (%). */
export const cpiWeightsSchema = z.record(z.string().regex(/^\d{4}$/), weightRow);
export type CpiWeights = z.infer<typeof cpiWeightsSchema>;

/** `data/meta.json`: kaynak ve tazelik bilgisi (altbilgi ve metodoloji sayfası kullanır). */
export const metaSchema = z.object({
  source: z.enum(["evds", "tuik-snapshot"]),
  sourceLabel: z.string().min(1),
  attribution: z.string().min(1),
  base: z.literal("2025=100"),
  firstPeriod: period,
  lastPeriod: period,
  retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Meta = z.infer<typeof metaSchema>;

/** TÜİK veri portalından alınmış anlık görüntü (`data/sources/tuik-tt01.json`). */
export const tuikIndexSnapshotSchema = z.object({
  source: z.string(),
  retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: period,
  end: period,
  series: z.record(z.string(), z.array(positive)),
});

/** TÜİK ağırlık anlık görüntüsü (`data/sources/tuik-tt08.json`). */
export const tuikWeightSnapshotSchema = z.object({
  source: z.string(),
  retrievedAt: z.string(),
  weights: z.record(z.string().regex(/^\d{4}$/), z.record(z.string(), z.number().nonnegative())),
});
