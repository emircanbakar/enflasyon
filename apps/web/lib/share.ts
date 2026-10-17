import type { Period } from "enflasyon-core";
import { encodeBasket } from "./basket-url";
import type { BasketState } from "./basket-url";

/**
 * Paylaşım linkleri (docs/web.md, Bölüm 5.1 ve 7).
 *
 * - Paylaşılan link her zaman `/sonuc` sayfasına gider ve hedef ayı (`at`) açıkça
 *   taşır; böylece önizleme görseli yeni veri gelince eskimez (Bölüm 7.1).
 * - TL tutarları yalnızca fragment'tedir; `includeAmounts: false` iken linke hiç
 *   yazılmaz ("yüzde olarak paylaş"). Varsayılan budur: gizlilik önce gelir.
 */

export interface ShareOptions {
  readonly includeAmounts: boolean;
}

/** Paylaşım için hedef ayı açık hale getirilmiş durum. */
export function resolvedState(state: BasketState, lastPeriod: Period): BasketState {
  return { ...state, at: state.at ?? lastPeriod };
}

export function shareUrl(
  state: BasketState,
  origin: string,
  lastPeriod: Period,
  { includeAmounts }: ShareOptions,
): string {
  const { search, hash } = encodeBasket(resolvedState(state, lastPeriod), { includeAmounts });
  return `${origin}/sonuc?${search}${hash === "" ? "" : `#${hash}`}`;
}

/** Önizleme görselinin yolu; yalnızca query'yi (oranları) taşır, TL tutarı asla. */
export function ogImagePath(
  state: BasketState,
  lastPeriod: Period,
  format: "card" | "story" = "card",
): string {
  const { search } = encodeBasket(resolvedState(state, lastPeriod), { includeAmounts: false });
  return `/api/og?${search}${format === "story" ? "&format=story" : ""}`;
}
