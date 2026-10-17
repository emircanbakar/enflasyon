import type { IndexSet, Period } from "enflasyon-core";
import { decodeBasket } from "./basket-url";
import { calculate } from "./calc";
import type { CalculatorData } from "./calc";

/**
 * Önizleme görselinin (`/api/og`) içeriği (docs/web.md, Bölüm 7.1). Görsel
 * yalnızca query'yi görür: oranlar ve dönem. TL tutarı, serbest metin veya
 * kullanıcının yazdığı hiçbir şey görsele basılmaz; geçersiz girdide genel
 * bir "kendi enflasyonunu hesapla" görseli gösterilir.
 */

export type OgModel =
  | { readonly kind: "generic"; readonly lastPeriod: Period }
  | {
      readonly kind: "result";
      readonly from: Period;
      readonly to: Period;
      readonly personal: number;
      readonly official: number;
      /** En büyük katkıyı yapan grup; katkılar aynı işaretli değilse null. */
      readonly top: { readonly label: string; readonly share: number } | null;
    };

/** Query uzunluğu bu sınırı aşarsa hiç çözülmez (maliyet saldırısına karşı). */
export const MAX_OG_QUERY = 600;

export function ogModel(search: string, data: CalculatorData, indices: IndexSet): OgModel {
  const generic: OgModel = { kind: "generic", lastPeriod: data.lastPeriod };
  if (search.length > MAX_OG_QUERY) return generic;
  // Fragment hiçbir zaman sunucuya gelmez; görsel yalnızca yüzde dağılımından hesaplanır.
  const state = decodeBasket(search, "");
  if (state === null) return generic;
  const outcome = calculate({ ...state, at: state.at ?? data.lastPeriod }, data, indices);
  if (outcome.status !== "ok") return generic;
  const first = outcome.contributions[0];
  const top =
    outcome.sharesMeaningful && first?.share != null && outcome.contributions.length > 1
      ? { label: first.label, share: first.share }
      : null;
  return {
    kind: "result",
    from: outcome.from,
    to: outcome.to,
    personal: outcome.personal,
    official: outcome.official,
    top,
  };
}

/**
 * Önbellek başlığı: hedef ay (`at`) linkte açıksa aynı parametre her zaman aynı
 * görseli üretir → süresiz önbellek. `at` yoksa "en son ay"a göre değişir → kısa önbellek.
 */
export function ogCacheControl(search: string): string {
  return new URLSearchParams(search).has("at")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=3600";
}
