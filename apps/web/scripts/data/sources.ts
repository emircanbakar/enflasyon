import { addMonths } from "enflasyon-core";
import type { Period } from "enflasyon-core";
import { CATEGORY_KEYS } from "../../lib/categories.ts";
import type { CategoryKey } from "../../lib/categories.ts";
import {
  COICOP_TO_KEY,
  SERIES_KEYS,
  coicopOf,
  cpiGroupsSchema,
  cpiWeightsSchema,
  tuikIndexSnapshotSchema,
  tuikWeightSnapshotSchema,
} from "./schema.ts";
import type { CpiGroups, CpiWeights, SeriesKey } from "./schema.ts";

/**
 * Veri kaynakları (docs/web.md, Bölüm 4).
 *
 * - **EVDS3** (TCMB, birincil, otomatik): `TP.TUKFIY2025.*` endeksleri ve
 *   `TP.TUKFIYAGRLK.*` ağırlıkları. Anahtar HTTP header'ında `key` olarak gönderilir.
 * - **TÜİK anlık görüntüsü** (yedek): TÜİK veri portalından tarayıcıyla alınmış
 *   resmi tablolar (`data/sources/`). Portal tarayıcı dışı istemcileri engellediği
 *   için otomatik çekilemez.
 */

export interface SourceData {
  readonly groups: CpiGroups;
  readonly weights: CpiWeights;
  readonly sourceLabel: string;
  readonly retrievedAt: string;
}

// ---------------------------------------------------------------- TÜİK

export function fromTuikSnapshot(indexJson: unknown, weightJson: unknown): SourceData {
  const index = tuikIndexSnapshotSchema.parse(indexJson);
  const weightSnapshot = tuikWeightSnapshotSchema.parse(weightJson);

  const series: Record<string, Record<string, number>> = {};
  for (const key of SERIES_KEYS) {
    const raw = index.series[key === "genel" ? "genel" : coicopOf(key)];
    if (raw === undefined) throw new Error(`TÜİK anlık görüntüsünde ${key} serisi yok`);
    const out: Record<string, number> = {};
    raw.forEach((value, i) => {
      out[addMonths(index.start, i)] = value;
    });
    const last = addMonths(index.start, raw.length - 1);
    if (last !== index.end) {
      throw new Error(
        `${key}: ${String(raw.length)} değer ${index.start}–${last} eder, beklenen bitiş ${index.end}`,
      );
    }
    series[key] = out;
  }

  const weights: Record<string, Record<string, number>> = {};
  for (const [year, row] of Object.entries(weightSnapshot.weights)) {
    weights[year] = Object.fromEntries(
      Object.entries(row).map(([code, value]) => {
        const key = COICOP_TO_KEY.get(code);
        if (key === undefined) throw new Error(`Bilinmeyen COICOP kodu: ${code}`);
        return [key, value];
      }),
    );
  }

  return {
    groups: cpiGroupsSchema.parse({ base: "2025=100", series }),
    weights: cpiWeightsSchema.parse(weights),
    sourceLabel: index.source,
    retrievedAt: index.retrievedAt,
  };
}

// ---------------------------------------------------------------- EVDS3

export const EVDS_BASE_URL = "https://evds3.tcmb.gov.tr/igmevdsms-dis";
/** Bir istekte en fazla 1000 gözlem döner (EVDS Web Servis Kılavuzu). */
export const EVDS_MAX_OBSERVATIONS = 1000;

export const indexCode = (key: SeriesKey): string => `TP.TUKFIY2025.${coicopOf(key)}`;
export const weightCode = (key: CategoryKey): string => `TP.TUKFIYAGRLK.${coicopOf(key)}`;

function evdsDate(p: Period): string {
  return `01-${p.slice(5, 7)}-${p.slice(0, 4)}`;
}

export function evdsUrl(
  codes: readonly string[],
  from: Period,
  to: Period,
  frequency: 5 | 8,
): string {
  return (
    `${EVDS_BASE_URL}/series=${codes.join("-")}` +
    `&startDate=${evdsDate(from)}&endDate=${evdsDate(to)}&type=json&frequency=${String(frequency)}`
  );
}

/**
 * EVDS tarih alanını döneme çevirir. Aylık seriler "2026-9" veya "01-09-2026",
 * yıllık seriler "2026" biçiminde gelebilir.
 */
export function parseEvdsDate(value: string): { period: Period | null; year: string | null } {
  const monthly =
    /^(?<y>\d{4})-(?<m>\d{1,2})$/.exec(value) ?? /^\d{1,2}-(?<m>\d{1,2})-(?<y>\d{4})$/.exec(value);
  if (monthly?.groups) {
    const { y = "", m = "" } = monthly.groups;
    return { period: `${y}-${m.padStart(2, "0")}` as Period, year: y };
  }
  if (/^\d{4}$/.test(value)) return { period: null, year: value };
  throw new Error(`EVDS tarih biçimi tanınmadı: "${value}"`);
}

/** EVDS JSON yanıtındaki seri kolonları: kodlardaki noktalar alt çizgiye çevrilir. */
const column = (code: string): string => code.replaceAll(".", "_");

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

interface EvdsItem {
  readonly Tarih?: unknown;
  readonly [column: string]: unknown;
}

function items(json: unknown): EvdsItem[] {
  const list = (json as { items?: unknown } | null)?.items;
  if (!Array.isArray(list))
    throw new Error("EVDS yanıtında 'items' dizisi yok (yanıt biçimi değişmiş olabilir)");
  return list as EvdsItem[];
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

async function getJson(fetchImpl: FetchLike, url: string, key: string): Promise<unknown> {
  const response = await fetchImpl(url, { headers: { key } });
  if (!response.ok) {
    // URL'de anahtar yoktur; hata mesajında header asla yazdırılmaz.
    throw new Error(`EVDS isteği başarısız: HTTP ${String(response.status)} (${url})`);
  }
  return response.json();
}

export async function fromEvds(options: {
  readonly key: string;
  readonly from: Period;
  readonly to: Period;
  readonly fetchImpl?: FetchLike;
  readonly today?: string;
}): Promise<SourceData> {
  const {
    key,
    from,
    to,
    fetchImpl = fetch,
    today = new Date().toISOString().slice(0, 10),
  } = options;
  if (key.trim() === "") throw new Error("EVDS_API_KEY tanımlı değil");

  const indexJson = await getJson(fetchImpl, evdsUrl(SERIES_KEYS.map(indexCode), from, to, 5), key);
  const series = Object.fromEntries(SERIES_KEYS.map((k) => [k, {}])) as Record<
    SeriesKey,
    Record<string, number>
  >;
  for (const item of items(indexJson)) {
    const { period } = parseEvdsDate(String(item.Tarih));
    if (period === null) continue;
    for (const k of SERIES_KEYS) {
      const value = parseNumber(item[column(indexCode(k))]);
      if (value !== null) series[k][period] = value;
    }
  }

  const weightJson = await getJson(
    fetchImpl,
    evdsUrl(CATEGORY_KEYS.map(weightCode), `${from.slice(0, 4)}-01` as Period, to, 8),
    key,
  );
  const weights: Record<string, Record<string, number>> = {};
  for (const item of items(weightJson)) {
    const { year } = parseEvdsDate(String(item.Tarih));
    const row = Object.fromEntries(
      CATEGORY_KEYS.map((k) => [k, parseNumber(item[column(weightCode(k))])]),
    );
    if (year !== null && Object.values(row).every((v) => v !== null))
      weights[year] = row as Record<string, number>;
  }

  return {
    groups: cpiGroupsSchema.parse({ base: "2025=100", series }),
    weights: cpiWeightsSchema.parse(weights),
    sourceLabel: "TCMB EVDS (kaynak: TÜİK), TP.TUKFIY2025 ve TP.TUKFIYAGRLK serileri",
    retrievedAt: today,
  };
}
