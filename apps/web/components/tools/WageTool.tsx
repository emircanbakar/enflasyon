"use client";

import { useMemo, useState } from "react";
import type { IndexSet, Period } from "enflasyon-core";
import type { BasketValues } from "@/lib/basket-state";
import type { CalculatorData } from "@/lib/calc";
import { formatMonth, formatPercent, formatTry } from "@/lib/format";
import { wageCheck } from "@/lib/tools";
import { MoneyInput, MonthSelect } from "./fields";

interface WageToolProps {
  readonly data: CalculatorData;
  readonly indices: IndexSet;
  readonly values: BasketValues;
  /** Seçilebilecek zam ayları (yeniden eskiye, son veri ayı hariç). */
  readonly months: readonly Period[];
}

function verdict(real: number): string {
  const rounded = Math.round(real * 1000) / 1000;
  if (rounded === 0) return "Maaşın enflasyonla aynı hızda arttı.";
  return rounded < 0
    ? `Maaşın reel olarak ${formatPercent(-real)} eridi.`
    : `Maaşın reel olarak ${formatPercent(real)} arttı.`;
}

/**
 * Reel maaş (docs/web.md, Bölüm 2.2 adım 4): zamdan önceki ve şimdiki maaş ile
 * zam tarihi → reel değişim ve "enflasyonu karşılayan maaş".
 */
export function WageTool({ data, indices, values, months }: WageToolProps) {
  const [wageFrom, setWageFrom] = useState<number | null>(null);
  const [wageTo, setWageTo] = useState<number | null>(null);
  const [since, setSince] = useState<Period>(() => months[11] ?? months.at(-1) ?? data.firstPeriod);
  const outcome = useMemo(
    () => wageCheck(wageFrom, wageTo, { since, values, data, indices }),
    [wageFrom, wageTo, since, values, data, indices],
  );
  const main = outcome.status === "ok" ? (outcome.personal ?? outcome.official) : null;

  return (
    <section aria-labelledby="maas-baslik" className="space-y-4">
      <h3 id="maas-baslik" className="text-lg font-semibold">
        Maaşın enflasyona yenildi mi?
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <MoneyInput label="Zamdan önceki maaş" onChange={setWageFrom} />
        <MoneyInput label="Şimdiki maaş" onChange={setWageTo} />
        <MonthSelect label="Zam tarihi" value={since} options={months} onChange={setSince} />
      </div>
      <div aria-live="polite" className="min-h-12 text-sm">
        {outcome.status === "empty" && (
          <p className="text-[var(--color-muted)]">İki maaşı da gir.</p>
        )}
        {outcome.status === "error" && (
          <p className="text-[var(--color-danger)]">{outcome.message}</p>
        )}
        {outcome.status === "ok" && main && (
          <div className="space-y-1">
            <p className="text-lg font-medium">{verdict(main.real)}</p>
            <p>
              {formatMonth(outcome.since)} → {formatMonth(outcome.to)}: maaşın{" "}
              {formatPercent(Math.abs(outcome.nominal))} {outcome.nominal < 0 ? "azaldı" : "arttı"},{" "}
              {outcome.personal ? "senin enflasyonun" : "resmi enflasyon"}{" "}
              {formatPercent(main.rate)}.
            </p>
            <p>
              Satın alma gücünü korumak için gereken maaş:{" "}
              <strong>{formatTry(main.requiredWage)}</strong>
            </p>
            {outcome.personal && (
              <p className="text-[var(--color-muted)]">
                Resmi enflasyona ({formatPercent(outcome.official.rate)}) göre:{" "}
                {verdict(outcome.official.real).toLocaleLowerCase("tr-TR")} Gereken maaş{" "}
                {formatTry(outcome.official.requiredWage)}.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
