import type { Period } from "enflasyon-core";

/** Mutlak ay sayısını (yıl × 12 + ay − 1) "YYYY-MM" dönemine çevirir. Sadece testler için. */
export function fromMonthIndexForTest(index: number): Period {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${String(year)}-${String(month).padStart(2, "0")}` as Period;
}
