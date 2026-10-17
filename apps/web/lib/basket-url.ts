import { isPeriod } from "enflasyon-core";
import type { Period } from "enflasyon-core";
import { CATEGORY_KEYS, isCategoryKey } from "./categories";
import type { CategoryKey } from "./categories";

/**
 * Sepet ⇄ URL kodlaması (docs/web.md, Bölüm 5.1–5.2).
 *
 * - **Query** (`?…`) sunucuya gider ve yalnızca oranları taşır: `v`, `d`, `at`,
 *   `from`, `w` (binde dağılım), `p` (profil).
 * - **Fragment** (`#…`) tarayıcıda kalır: giriş modu `m` (`tl`/`pct`) ve TL tutarları `s`.
 *
 * Değerler yalnızca tam sayıdır; `kalem.değer` ayrımındaki `.` hiçbir zaman
 * belirsiz olmaz. Çözme defansiftir: bilinmeyen kalem ve parametreler atılır,
 * aralık dışı değerler yok sayılır, URL çok uzunsa `null` döner.
 */

export type BasketMode = "tl" | "pct";
export type PeriodKind = "y" | "m" | "ytd" | "r";

export interface BasketState {
  /** Arayüzde hangi giriş modunun açık olduğu. */
  readonly mode: BasketMode;
  /**
   * `tl`: tam sayı TL tutarları. `pct`: yüzdeler (0–100, 0,1 adımlı).
   * Değeri 0 olan kalemler yer almaz.
   */
  readonly values: Readonly<Partial<Record<CategoryKey, number>>>;
  readonly period: PeriodKind;
  /** Hedef ay; `null` ise en son veri ayı kullanılır. */
  readonly at: Period | null;
  /** Yalnızca `period: "r"` (aralık) iken başlangıç ayı. */
  readonly from: Period | null;
  /** Hazır profil; sepette değer varsa yok sayılır. */
  readonly profile: string | null;
}

export interface EncodeOptions {
  /**
   * `false` ise TL tutarları linke yazılmaz ("yüzde olarak paylaş"); alıcı aynı
   * sonucu yüzde modunda görür.
   */
  readonly includeAmounts?: boolean;
}

export interface EncodedBasket {
  /** `?` olmadan query string. */
  readonly search: string;
  /** `#` olmadan fragment. */
  readonly hash: string;
}

export const SCHEMA_VERSION = "1";
export const MAX_URL_LENGTH = 2000;
export const MAX_ITEMS = 30;
export const MAX_AMOUNT = 10_000_000;
export const MAX_PERMILLE = 1000;

const PERIOD_KINDS: ReadonlySet<string> = new Set<PeriodKind>(["y", "m", "ytd", "r"]);
const PROFILE_PATTERN = /^[a-z0-9-]{1,40}$/;
const INTEGER_PATTERN = /^\d{1,8}$/;

export const DEFAULT_STATE: BasketState = Object.freeze({
  mode: "tl",
  values: Object.freeze({}),
  period: "y",
  at: null,
  from: null,
  profile: null,
});

/** Kalemleri `CATEGORY_KEYS` sırasıyla döndürür (aynı sepet her zaman aynı URL'i üretir). */
function orderedEntries(
  values: Readonly<Partial<Record<CategoryKey, number>>>,
): [CategoryKey, number][] {
  const entries: [CategoryKey, number][] = [];
  for (const key of CATEGORY_KEYS) {
    const value = values[key];
    if (value !== undefined && value > 0) entries.push([key, value]);
  }
  return entries;
}

function serializeItems(entries: readonly (readonly [CategoryKey, number])[]): string {
  return entries.map(([key, value]) => `${key}.${String(value)}`).join("~");
}

/** Değerleri bindeye çevirir: TL modunda dağılım, yüzde modunda yüzde × 10. */
function toPermille(
  mode: BasketMode,
  entries: readonly [CategoryKey, number][],
): [CategoryKey, number][] {
  if (mode === "pct") {
    return entries.map(([key, value]) => [key, Math.round(value * 10)]);
  }
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  return entries.map(([key, value]) => [key, Math.round((value / total) * MAX_PERMILLE)]);
}

/**
 * Durumu URL parçalarına çevirir. Query string'ler `URLSearchParams` yerine elle
 * kurulur: değerler zaten güvenli karakterlerden oluşur ve `~` kodlanmadan kalır,
 * böylece link mesajlaşma uygulamalarında okunabilir görünür.
 */
export function encodeBasket(state: BasketState, options: EncodeOptions = {}): EncodedBasket {
  const { includeAmounts = true } = options;
  const entries = orderedEntries(state.values);

  const query: string[] = [`v=${SCHEMA_VERSION}`, `d=${state.period}`];
  if (state.at !== null) query.push(`at=${state.at}`);
  if (state.period === "r" && state.from !== null) query.push(`from=${state.from}`);

  const permille = toPermille(state.mode, entries).filter(([, value]) => value > 0);
  if (permille.length > 0) query.push(`w=${serializeItems(permille)}`);
  else if (state.profile !== null) query.push(`p=${state.profile}`);

  let hash: string;
  if (state.mode === "pct") hash = "m=pct";
  else if (!includeAmounts)
    hash = ""; // yüzde olarak paylaş: alıcı yüzde modunda görür
  else hash = entries.length > 0 ? `m=tl&s=${serializeItems(entries)}` : "m=tl";
  return { search: query.join("&"), hash };
}

/** `kalem.değer` listesini çözer; geçersiz parçaları atar, ilk geçerli değeri tutar. */
function parseItems(raw: string | null, max: number): Partial<Record<CategoryKey, number>> {
  const values: Partial<Record<CategoryKey, number>> = {};
  if (raw === null || raw === "") return values;
  for (const part of raw.split("~").slice(0, MAX_ITEMS)) {
    const dot = part.indexOf(".");
    if (dot <= 0) continue;
    const key = part.slice(0, dot);
    const text = part.slice(dot + 1);
    if (!isCategoryKey(key) || !INTEGER_PATTERN.test(text) || key in values) continue;
    const value = Number(text);
    if (value > 0 && value <= max) values[key] = value;
  }
  return values;
}

/**
 * URL parçalarını duruma çevirir. `search` ve `hash` başlarındaki `?`/`#` ile veya
 * onlarsız verilebilir. Şema sürümü tanınmıyorsa veya URL çok uzunsa `null` döner
 * (arayüz varsayılan sepete döner ve bilgi bandı gösterir).
 */
export function decodeBasket(search: string, hash = ""): BasketState | null {
  if (search.length + hash.length > MAX_URL_LENGTH) return null;
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));

  const version = query.get("v");
  if (version !== null && version !== SCHEMA_VERSION) return null;

  const at = query.get("at");
  const atPeriod = isPeriod(at) ? at : null;

  const d = query.get("d");
  let period: PeriodKind = d !== null && PERIOD_KINDS.has(d) ? (d as PeriodKind) : "y";
  const from = query.get("from");
  let fromPeriod: Period | null = null;
  if (period === "r") {
    if (isPeriod(from) && (atPeriod === null || from < atPeriod)) fromPeriod = from;
    else period = "y"; // aralığın başlangıcı yoksa veya hatalıysa yıllığa dön
  }

  // Mod: fragment'te açıkça yazıyorsa o; yoksa dağılım varsa yüzde (tutarsız paylaşılmış
  // link), hiçbiri yoksa varsayılan TL modu.
  const m = fragment.get("m");
  const mode: BasketMode = m === "tl" || m === "pct" ? m : query.has("w") ? "pct" : "tl";
  let values: Partial<Record<CategoryKey, number>>;
  if (mode === "tl") {
    values = parseItems(fragment.get("s"), MAX_AMOUNT);
  } else {
    const permille = parseItems(query.get("w"), MAX_PERMILLE);
    values = Object.fromEntries(Object.entries(permille).map(([key, value]) => [key, value / 10]));
  }

  const p = query.get("p");
  const profile =
    Object.keys(values).length === 0 && p !== null && PROFILE_PATTERN.test(p) ? p : null;

  return { mode, values, period, at: atPeriod, from: fromPeriod, profile };
}
