import { addMonths, availablePeriods, itemChange, personalInflation } from "enflasyon-core";
import type { IndexSet, Period } from "enflasyon-core";
import type { BasketState, PeriodKind } from "./basket-url";
import { CATEGORIES } from "./categories";
import type { CategoryKey } from "./categories";
import { userMessage } from "./errors";

/**
 * Hesaplayıcının durumdan sonuca giden saf hesap katmanı (docs/web.md, Bölüm 5.3–5.4).
 *
 * Her çağrıda `enflasyon-core` kullanılır; hesap 1 ms'nin altındadır, bu yüzden
 * debounce yoktur. Kullanıcı bugünkü harcamasını girdiği için `weightsAt: "to"`.
 */

/** Sunucudan client island'a geçen, serileştirilebilir veri. */
export interface CalculatorData {
  readonly series: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly officialWeights: Readonly<Record<CategoryKey, number>>;
  readonly officialWeightsYear: string;
  readonly firstPeriod: Period;
  readonly lastPeriod: Period;
  readonly attribution: string;
}

export interface ContributionView {
  readonly key: CategoryKey;
  readonly label: string;
  /** Kalemin kendi değişimi (oran). */
  readonly change: number;
  /** Puan katkısı (oran). */
  readonly contribution: number;
  /** Toplam enflasyondaki payı; oran ~0 ise null. */
  readonly share: number | null;
}

export type CalcOutcome =
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ok";
      readonly from: Period;
      readonly to: Period;
      readonly personal: number;
      readonly official: number;
      readonly contributions: readonly ContributionView[];
      /** Tek kalem doluysa sonuç o kalemin enflasyonudur (arayüz not düşer). */
      readonly singleItem: boolean;
      /** Tüm katkılar sonuçla aynı işaretliyse "%X'i konuttan" dili kullanılabilir. */
      readonly sharesMeaningful: boolean;
    };

/** Dönem tipine göre hedef aydan başlangıç ayını bulur. */
export function periodStart(
  kind: PeriodKind,
  at: Period,
  from: Period | null,
  first: Period,
): Period {
  switch (kind) {
    case "y":
      return addMonths(at, -12);
    case "m":
      return addMonths(at, -1);
    case "ytd":
      return addMonths(at, -Number(at.slice(5, 7)));
    case "r":
      return from ?? first;
  }
}

/** Seçilen dönem tipiyle hesaplanabilen hedef aylar (yeniden eskiye). */
export function availableTargets(kind: PeriodKind, data: CalculatorData): Period[] {
  return availablePeriods(data.series.genel ?? {})
    .filter((at) => {
      const start = periodStart(kind, at, null, data.firstPeriod);
      return start >= data.firstPeriod && start < at;
    })
    .reverse();
}

export function calculate(
  state: BasketState,
  data: CalculatorData,
  indices: IndexSet,
): CalcOutcome {
  const items = Object.entries(state.values).filter(([, value]) => value > 0);
  if (items.length === 0) return { status: "empty" };

  const to = state.at ?? data.lastPeriod;
  const from = periodStart(state.period, to, state.from, data.firstPeriod);
  try {
    const result = personalInflation({
      basket: { mode: "amount", items: Object.fromEntries(items) },
      indices,
      from,
      to,
      weightsAt: "to",
    });
    const official = itemChange(indices.genel ?? {}, from, to);
    const contributions: ContributionView[] = result.contributions.map((c) => ({
      key: c.key as CategoryKey,
      label: CATEGORIES.get(c.key as CategoryKey)?.label ?? c.key,
      change: c.change,
      contribution: c.contribution,
      share: c.share,
    }));
    const sharesMeaningful =
      result.contributions.every((c) => c.share !== null) &&
      result.contributions.every((c) => Math.sign(c.contribution) * Math.sign(result.rate) >= 0);
    return {
      status: "ok",
      from,
      to,
      personal: result.rate,
      official,
      contributions,
      singleItem: items.length === 1,
      sharesMeaningful,
    };
  } catch (error) {
    return { status: "error", message: userMessage(error) };
  }
}
