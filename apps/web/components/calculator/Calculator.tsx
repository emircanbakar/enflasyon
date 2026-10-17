"use client";

import { useMemo } from "react";
import { availablePeriods, toIndexSet } from "enflasyon-core";
import { availableTargets, calculate } from "@/lib/calc";
import type { CalculatorData } from "@/lib/calc";
import { officialProfile } from "@/lib/profiles";
import { annualSeries } from "@/lib/series";
import { useBasket } from "@/lib/use-basket";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import { PastAmountTool } from "../tools/PastAmountTool";
import { WageTool } from "../tools/WageTool";
import { ResultCard } from "../result/ResultCard";
import { BasketForm } from "./BasketForm";
import { PeriodPicker } from "./PeriodPicker";

interface CalculatorProps {
  readonly data: CalculatorData;
}

/**
 * Hesaplayıcının tek client sınırı (docs/web.md, Bölüm 3.3). Sunucudan gelen
 * veri burada bir kez `toIndexSet` ile tiplenir; her durum değişikliğinde hesap
 * yeniden yapılır (< 1 ms).
 */
export function Calculator({ data }: CalculatorProps) {
  const { state, dispatch, urlWasInvalid } = useBasket();
  const indices = useMemo(() => toIndexSet(data.series), [data.series]);
  const profile = useMemo(
    () => officialProfile(data.officialWeights, data.officialWeightsYear),
    [data.officialWeights, data.officialWeightsYear],
  );
  const targets = useMemo(() => availableTargets(state.period, data), [state.period, data]);
  const starts = useMemo(() => availablePeriods(data.series.genel ?? {}), [data.series]);

  // Seçili ay bu dönem tipiyle hesaplanamıyorsa en yakın geçerli aya düş.
  const at =
    state.at !== null && targets.includes(state.at) ? state.at : (targets[0] ?? data.lastPeriod);
  const from = state.period === "r" ? (state.from ?? data.firstPeriod) : null;
  const outcome = useMemo(
    () => calculate({ ...state, at, from }, data, indices),
    [state, at, from, data, indices],
  );

  // Detay araçlarının başlangıç ayı seçenekleri: son veri ayı hariç, yeniden eskiye.
  const toolMonths = useMemo(() => starts.slice(0, -1).reverse(), [starts]);
  const series = useMemo(
    () => annualSeries(state.values, data, indices),
    [state.values, data, indices],
  );

  return (
    <div className="space-y-10">
      {urlWasInvalid && (
        <p role="status" className="rounded-md border border-[var(--color-line)] p-3 text-sm">
          Linkteki sepet okunamadı; boş bir sepetle başladık.
        </p>
      )}
      <BasketForm state={state} dispatch={dispatch} profile={profile} />
      <div className="space-y-4">
        <PeriodPicker
          kind={state.period}
          at={at}
          from={from}
          targets={targets}
          starts={starts}
          onKind={(period) => {
            dispatch({ type: "setPeriod", period });
          }}
          onAt={(value) => {
            dispatch({ type: "setAt", at: value });
          }}
          onFrom={(value) => {
            dispatch({ type: "setFrom", from: value });
          }}
        />
        <ResultCard outcome={outcome} />
      </div>
      <section
        aria-label="Zaman serisi"
        className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-5"
      >
        <TimeSeriesChart points={series} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Kişisel çizgi bugünkü sepetinin geçmiş yıllara uygulanmasıdır; o yıllardaki harcama
          dağılımın farklı olmuş olabilir.
        </p>
      </section>
      <section
        aria-label="Detay araçları"
        className="space-y-8 rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-5"
      >
        <PastAmountTool data={data} indices={indices} values={state.values} months={toolMonths} />
        <WageTool data={data} indices={indices} values={state.values} months={toolMonths} />
        <p className="text-sm text-[var(--color-muted)]">
          Sepetin doluysa sonuçlar önce senin enflasyonunla, sonra resmi enflasyonla verilir.
        </p>
      </section>
      <p className="text-sm text-[var(--color-muted)]">
        {data.attribution} Hesap tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.
      </p>
    </div>
  );
}
