import { toPercentages } from "./basket-state";
import { CATEGORY_KEYS } from "./categories";
import type { CategoryKey } from "./categories";

/**
 * Hazır sepet profilleri (docs/web.md, Bölüm 2.4).
 *
 * Profiller uydurulmaz; yalnızca resmi veriden türetilebilenler sunulur. Şu an
 * tek kaynak TÜİK'in yıllık resmi grup ağırlıklarıdır, bu yüzden tek profil
 * "Türkiye ortalaması"dır. Öğrenci, kiracı aile gibi profiller TÜİK Hanehalkı
 * Bütçe Araştırması verisi eklendiğinde gelir.
 */

export interface Profile {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Yüzde (0–100, 0,1 adımlı). */
  readonly percentages: Readonly<Partial<Record<CategoryKey, number>>>;
}

export const OFFICIAL_PROFILE_ID = "turkiye-ortalamasi";

/** Resmi ağırlıklardan "Türkiye ortalaması" profilini kurar. */
export function officialProfile(
  weights: Readonly<Record<CategoryKey, number>>,
  year: string,
): Profile {
  return {
    id: OFFICIAL_PROFILE_ID,
    label: "Türkiye ortalaması",
    description: `TÜİK'in ${year} resmi sepet ağırlıkları. Sonuç resmi enflasyona çok yakın çıkar.`,
    // Resmi ağırlıkların toplamı yayın yuvarlaması yüzünden 100 değildir (ör. 99,97);
    // toplamı tam 100 olan yüzdelere çevrilir, böylece "toplam eksik" uyarısı çıkmaz.
    percentages: toPercentages(Object.fromEntries(CATEGORY_KEYS.map((key) => [key, weights[key]]))),
  };
}
