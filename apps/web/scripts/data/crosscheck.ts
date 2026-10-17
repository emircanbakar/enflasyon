import { addMonths, annual, availablePeriods, itemChange, yearToDate } from "enflasyon-core";
import type { IndexSet, Period } from "enflasyon-core";
import type { CpiGroups, CpiWeights } from "./schema.ts";

/**
 * Çapraz kontrol (docs/web.md, Bölüm 4.1 adım 3): grup endeksleri o yılın resmi
 * ağırlıklarıyla `enflasyon-core` üzerinden toplanır ve resmi genel endeksle
 * karşılaştırılır. Hem verinin hem paketin aynı anda doğrulanmasıdır.
 *
 * - Engelleyici: yılbaşından beri değişim (önceki Aralık → ay), ±0,1 puan.
 * - Uyarı: yıllık değişim; iki zincir halkasına yayıldığı için ±1 puan.
 */

export const YTD_TOLERANCE_POINTS = 0.1;
export const ANNUAL_WARNING_POINTS = 1;

export interface CheckRow {
  readonly at: Period;
  /** Yüzde puan. */
  readonly computed: number;
  readonly official: number;
  readonly difference: number;
}

export interface CrossCheckResult {
  readonly yearToDate: CheckRow;
  readonly annual: CheckRow | null;
  /** Her yılın Aralık ayı (ve son ay) için yılbaşından beri karşılaştırma; bilgi amaçlı. */
  readonly history: readonly CheckRow[];
  readonly errors: string[];
  readonly warnings: string[];
}

const points = (rate: number): number => rate * 100;

function ytdRow(groups: CpiGroups, weights: CpiWeights, at: Period): CheckRow | string {
  const year = at.slice(0, 4);
  const row = weights[year];
  if (row === undefined) return `${year} yılı ağırlıkları olmadan ${at} kontrol edilemez`;
  const indices = groups.series as unknown as IndexSet;
  const computed = points(yearToDate({ basket: { mode: "amount", items: row }, indices, at }).rate);
  const official = points(
    itemChange(groups.series.genel, addMonths(at, -Number(at.slice(5, 7))), at),
  );
  return { at, computed, official, difference: computed - official };
}

export function crossCheck(groups: CpiGroups, weights: CpiWeights): CrossCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const periods = availablePeriods(groups.series.genel);
  const last = periods.at(-1);
  if (last === undefined) throw new Error("genel seri boş");

  const latest = ytdRow(groups, weights, last);
  if (typeof latest === "string") throw new Error(latest);
  if (Math.abs(latest.difference) > YTD_TOLERANCE_POINTS) {
    errors.push(
      `${last} yılbaşından beri: paket %${latest.computed.toFixed(3)}, resmi %${latest.official.toFixed(3)}; ` +
        `fark ${latest.difference.toFixed(3)} puan (sınır ±${String(YTD_TOLERANCE_POINTS)})`,
    );
  }

  let annualRow: CheckRow | null = null;
  const yearAgo = addMonths(last, -12);
  const lastWeights = weights[last.slice(0, 4)];
  if (periods.includes(yearAgo) && lastWeights !== undefined) {
    const indices = groups.series as unknown as IndexSet;
    const computed = points(
      annual({ basket: { mode: "amount", items: lastWeights }, indices, at: last }).rate,
    );
    const official = points(itemChange(groups.series.genel, yearAgo, last));
    annualRow = { at: last, computed, official, difference: computed - official };
    if (Math.abs(annualRow.difference) > ANNUAL_WARNING_POINTS) {
      warnings.push(
        `${last} yıllık: fark ${annualRow.difference.toFixed(3)} puan (±${String(ANNUAL_WARNING_POINTS)} üstü; zincirleme etkisinden büyük, veriyi kontrol et)`,
      );
    }
  }

  const history: CheckRow[] = [];
  for (const p of periods) {
    if (!p.endsWith("-12") || p === periods[0]) continue;
    if (!periods.includes(addMonths(p, -12))) continue;
    const row = ytdRow(groups, weights, p);
    if (typeof row !== "string") history.push(row);
  }
  history.push(latest);

  return { yearToDate: latest, annual: annualRow, history, errors, warnings };
}
