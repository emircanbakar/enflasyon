"use client";

import { useMemo, useState } from "react";
import type { IndexSet, Period } from "enflasyon-core";
import type { BasketValues } from "@/lib/basket-state";
import type { CalculatorData } from "@/lib/calc";
import { formatMonth, formatPercent, formatTry } from "@/lib/format";
import { pastAmount } from "@/lib/tools";
import { MoneyInput, MonthSelect } from "./fields";

interface PastAmountToolProps {
  readonly data: CalculatorData;
  readonly indices: IndexSet;
  readonly values: BasketValues;
  /** Seçilebilecek başlangıç ayları (yeniden eskiye, son veri ayı hariç). */
  readonly months: readonly Period[];
}

/** "O zamanki X TL bugün kaç TL?" (docs/web.md, Bölüm 2.2 adım 4). */
export function PastAmountTool({ data, indices, values, months }: PastAmountToolProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [since, setSince] = useState<Period>(() => months[11] ?? months.at(-1) ?? data.firstPeriod);
  const outcome = useMemo(
    () => pastAmount(amount, { since, values, data, indices }),
    [amount, since, values, data, indices],
  );

  return (
    <section aria-labelledby="eski-tutar-baslik" className="space-y-4">
      <h3 id="eski-tutar-baslik" className="text-lg font-semibold">
        O zamanki tutar bugün kaç TL?
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyInput label="Tutar" onChange={setAmount} />
        <MonthSelect label="Ne zaman?" value={since} options={months} onChange={setSince} />
      </div>
      <div aria-live="polite" className="min-h-12 text-sm">
        {outcome.status === "empty" && <p className="text-[var(--color-muted)]">Bir tutar gir.</p>}
        {outcome.status === "error" && (
          <p className="text-[var(--color-danger)]">{outcome.message}</p>
        )}
        {outcome.status === "ok" && (
          <div className="space-y-1">
            {outcome.personal && (
              <p>
                Senin sepetinle bugün{" "}
                <strong className="text-lg">{formatTry(outcome.personal.today)}</strong>{" "}
                <span className="text-[var(--color-muted)]">
                  (enflasyon {formatPercent(outcome.personal.rate)})
                </span>
              </p>
            )}
            <p>
              Resmi enflasyonla{" "}
              <strong className={outcome.personal ? "" : "text-lg"}>
                {formatTry(outcome.official.today)}
              </strong>{" "}
              <span className="text-[var(--color-muted)]">
                ({formatPercent(outcome.official.rate)}, {formatMonth(outcome.since)} →{" "}
                {formatMonth(outcome.to)})
              </span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
