"use client";

import { useMemo } from "react";
import { availablePeriods, toIndexSet } from "enflasyon-core";
import { availableTargets, calculate } from "@/lib/calc";
import type { CalculatorData } from "@/lib/calc";
import { officialProfile } from "@/lib/profiles";
import { useBasket } from "@/lib/use-basket";
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
      <p className="text-sm text-[var(--color-muted)]">
        {data.attribution} Hesap tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.
      </p>
    </div>
  );
}
