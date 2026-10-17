import { addMonths, availablePeriods, itemChange, twelveMonthAverage } from "enflasyon-core";
import type { IndexSet, Period } from "enflasyon-core";
import { CATEGORIES, CATEGORY_KEYS } from "./categories";
import type { CategoryKey } from "./categories";
import { formatMonth, formatPercent } from "./format";

/**
 * Yıl sayfalarının (`/enflasyon/[yil]`, docs/web.md Bölüm 7.3) içeriği: yalnızca
 * resmi veri, yorumsuz. Hesaplar `enflasyon-core` ile yapılır; genel endeksin
 * Aralık'tan Aralık'a değişimi TÜİK'in açıkladığı yıllık rakamın aynısıdır
 * (test/years.test.ts gerçek veriyle doğrular).
 */

export type WeightsByYear = Readonly<Record<string, Readonly<Record<string, number>> | undefined>>;

export interface MonthRow {
  readonly period: Period;
  /** Önceki aya göre değişim. */
  readonly monthly: number;
  /** Önceki yılın aynı ayına göre değişim; veri yoksa null. */
  readonly annual: number | null;
}

export interface GroupRow {
  readonly key: CategoryKey;
  readonly label: string;
  /** Önceki Aralık'tan yılın son veri ayına değişim. */
  readonly change: number;
  /** O yılın resmi ağırlığı (yüzde); veride yoksa null. */
  readonly weight: number | null;
}

export interface YearSummary {
  readonly year: string;
  /** Aralık verisi yayımlandıysa true; değilse yıl devam ediyordur. */
  readonly complete: boolean;
  /** Yılın son veri ayı. */
  readonly lastPeriod: Period;
  /** Yılbaşından beri değişim; yıl tamamsa yıllık enflasyonun kendisi. */
  readonly yearToDate: number;
  /** Son veri ayının yıllık değişimi. */
  readonly annual: number;
  /** 12 aylık ortalamalara göre değişim; 24 ay veri yoksa null. */
  readonly average: number | null;
  readonly months: readonly MonthRow[];
  /** Değişime göre büyükten küçüğe. */
  readonly groups: readonly GroupRow[];
}

/** Sayfası üretilebilen yıllar (önceki yılın Aralık verisi olanlar), eskiden yeniye. */
export function availableYears(indices: IndexSet): string[] {
  const periods = new Set<string>(availablePeriods(indices.genel ?? {}));
  const years = new Set([...periods].map((period) => period.slice(0, 4)));
  return [...years].filter((year) => periods.has(`${String(Number(year) - 1)}-12`)).sort();
}

export function yearSummary(
  year: string,
  indices: IndexSet,
  weights: WeightsByYear,
): YearSummary | null {
  const genel = indices.genel ?? {};
  const periods = availablePeriods(genel);
  const start = `${String(Number(year) - 1)}-12` as Period;
  const inYear = periods.filter((period) => period.startsWith(`${year}-`));
  const lastPeriod = inYear.at(-1);
  if (lastPeriod === undefined || !periods.includes(start)) return null;

  const has = new Set(periods);
  const months = inYear.map((period): MonthRow => {
    const yearAgo = addMonths(period, -12);
    return {
      period,
      monthly: itemChange(genel, addMonths(period, -1), period),
      annual: has.has(yearAgo) ? itemChange(genel, yearAgo, period) : null,
    };
  });
  const yearAgo = addMonths(lastPeriod, -12);
  const annual = has.has(yearAgo) ? itemChange(genel, yearAgo, lastPeriod) : null;
  if (annual === null) return null;

  const row = weights[year];
  const groups = CATEGORY_KEYS.flatMap((key): GroupRow[] => {
    const series = indices[key];
    if (series === undefined) return [];
    return [
      {
        key,
        label: CATEGORIES.get(key)?.label ?? key,
        change: itemChange(series, start, lastPeriod),
        weight: row?.[key] ?? null,
      },
    ];
  }).sort((a, b) => b.change - a.change);

  return {
    year,
    complete: lastPeriod.endsWith("-12"),
    lastPeriod,
    yearToDate: itemChange(genel, start, lastPeriod),
    annual,
    average: has.has(addMonths(lastPeriod, -23))
      ? twelveMonthAverage({
          basket: { mode: "share", items: { genel: 1 } },
          indices,
          at: lastPeriod,
        }).rate
      : null,
    months,
    groups,
  };
}

/**
 * Sayfanın giriş paragrafı ve meta açıklaması. Tarafsızdır: rakamı ve en çok/en az
 * artan grubu söyler, yorum yapmaz. Türkçe ek hatası olmasın diye yıl ve ay
 * adlarına ek getirilmez.
 */
export function yearLead(summary: YearSummary): string {
  const top = summary.groups[0];
  const bottom = summary.groups.at(-1);
  const groupsPart =
    top && bottom && top !== bottom
      ? ` En yüksek artış ${top.label.toLocaleLowerCase("tr-TR")} grubunda (${formatPercent(top.change)}), en düşük değişim ${bottom.label.toLocaleLowerCase("tr-TR")} grubunda (${formatPercent(bottom.change)}).`
      : "";
  if (summary.complete) {
    return `${summary.year} yılında tüketici fiyatları (TÜFE) Aralık'tan Aralık'a ${formatPercent(summary.yearToDate)} arttı.${groupsPart}`;
  }
  const month = Number(summary.lastPeriod.slice(5, 7));
  return `${summary.year} yılının ilk ${String(month)} ayında tüketici fiyatları (TÜFE) ${formatPercent(summary.yearToDate)} arttı; ${formatMonth(summary.lastPeriod)} itibarıyla yıllık enflasyon ${formatPercent(summary.annual)}.${groupsPart}`;
}
