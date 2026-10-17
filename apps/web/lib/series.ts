import { addMonths, itemChange, personalInflation } from "enflasyon-core";
import type { IndexSet, Period } from "enflasyon-core";
import type { BasketValues } from "./basket-state";
import { availableTargets } from "./calc";
import type { CalculatorData } from "./calc";
import { formatMonth, formatPercent } from "./format";

/**
 * "Sen vs resmi" zaman serisi (docs/web.md, Bölüm 6.1): her ay için o ayın yıllık
 * enflasyonu. Kişisel seri bugünkü sepetin geçmişe uygulanmasıdır (`weightsAt: "to"`).
 */

export interface SeriesPoint {
  readonly at: Period;
  /** Sepet boşsa veya ay hesaplanamıyorsa null. */
  readonly personal: number | null;
  readonly official: number;
}

/** Son `years` yılın aylık "yıllık enflasyon" noktaları, eskiden yeniye. */
export function annualSeries(
  values: BasketValues,
  data: CalculatorData,
  indices: IndexSet,
  years = 5,
): SeriesPoint[] {
  const items = Object.fromEntries(Object.entries(values).filter(([, v]) => v > 0));
  const hasBasket = Object.keys(items).length > 0;
  const targets = availableTargets("y", data).reverse();
  const first = addMonths(data.lastPeriod, -(years * 12 - 1));
  const genel = indices.genel ?? {};

  return targets
    .filter((at) => at >= first)
    .map((at) => {
      const from = addMonths(at, -12);
      let personal: number | null = null;
      if (hasBasket) {
        try {
          personal = personalInflation({
            basket: { mode: "amount", items },
            indices,
            from,
            to: at,
            weightsAt: "to",
          }).rate;
        } catch {
          personal = null;
        }
      }
      return { at, personal, official: itemChange(genel, from, at) };
    });
}

/**
 * Grafiğin tek cümlelik özeti (`aria-labelledby` ile okunur, docs/web.md 6.3).
 * Veriden otomatik üretilir; son 12 ayda başlangıç ve bitişi anlatır.
 */
export function summarize(points: readonly SeriesPoint[]): string {
  const last = points.at(-1);
  const yearAgo = points.at(-13) ?? points[0];
  if (last === undefined || yearAgo === undefined) return "Gösterilecek veri yok.";

  const officialPart = `resmi rakam ${formatPercent(yearAgo.official)} düzeyinden ${formatPercent(last.official)} düzeyine ${trend(yearAgo.official, last.official)}`;
  if (last.personal === null || yearAgo.personal === null) {
    return `${formatMonth(yearAgo.at)}–${formatMonth(last.at)} arasında ${officialPart}. Kişisel çizgi için harcama gir.`;
  }
  return `${formatMonth(yearAgo.at)}–${formatMonth(last.at)} arasında senin yıllık enflasyonun ${formatPercent(yearAgo.personal)} düzeyinden ${formatPercent(last.personal)} düzeyine ${trend(yearAgo.personal, last.personal)}; ${officialPart}.`;
}

function trend(from: number, to: number): string {
  const delta = Math.round((to - from) * 1000);
  if (delta === 0) return "yatay seyretti";
  return delta > 0 ? "çıktı" : "indi";
}
