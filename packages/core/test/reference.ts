/**
 * Testler için bilerek naif yazılmış referans hesaplar. Paket koduyla ortak
 * yardımcı kullanmaz; formülleri dokümandaki haliyle, doğrudan uygular.
 */
import type { IndexSet, Period } from "../src/types.js";

/** "YYYY-MM" dönemine ay ekler (paketin addMonths'undan bağımsız). */
export function shift(period: Period, months: number): Period {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${String(year)}-${String(month).padStart(2, "0")}` as Period;
}

/**
 * 12 aylık ortalama: Pₜ = Σ wᵢ · Iᵢ,ₜ / Iᵢ,base, sonuç ort(son 12) / ort(önceki 12) − 1.
 * `weights` toplamı 1 olan paylardır (base ayına ait).
 */
export function referenceTwelveMonthAverage(
  weights: Readonly<Record<string, number>>,
  indices: IndexSet,
  at: Period,
): number {
  const base = shift(at, -23);
  const personal: number[] = [];
  for (let i = 0; i < 24; i++) {
    const t = shift(base, i);
    let p = 0;
    for (const [key, w] of Object.entries(weights)) {
      const series = indices[key] as Record<string, number>;
      p += (w * series[t]!) / series[base]!;
    }
    personal.push(p);
  }
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  return mean(personal.slice(12)) / mean(personal.slice(0, 12)) - 1;
}

/** `start` ayından itibaren `length` ay boyunca aylık `growth` oranıyla büyüyen seri. */
export function growingSeries(
  start: Period,
  length: number,
  growth: number | ((i: number) => number),
  first = 100,
): Record<string, number> {
  const series: Record<string, number> = {};
  let value = first;
  for (let i = 0; i < length; i++) {
    series[shift(start, i)] = value;
    value *= 1 + (typeof growth === "number" ? growth : growth(i));
  }
  return series;
}
