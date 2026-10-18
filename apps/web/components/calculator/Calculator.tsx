"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { availablePeriods, toIndexSet } from "enflasyon-core";
import { track } from "@/lib/analytics";
import { availableTargets, calculate } from "@/lib/calc";
import { formatPercent } from "@/lib/format";
import type { CalculatorData } from "@/lib/calc";
import { officialProfile } from "@/lib/profiles";
import { annualSeries } from "@/lib/series";
import { useBasket } from "@/lib/use-basket";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import { PastAmountTool } from "../tools/PastAmountTool";
import { WageTool } from "../tools/WageTool";
import { ResultCard } from "../result/ResultCard";
import { ShareActions } from "../result/ShareActions";
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

  // Sayfa başına bir kez: kullanıcı ilk sonucunu gördü (yalnızca dönem tipi ve giriş modu gider).
  const reported = useRef(false);
  const isOk = outcome.status === "ok";
  useEffect(() => {
    if (!isOk || reported.current) return;
    reported.current = true;
    track({ name: "hesap-tamamlandi", data: { donem: state.period, mod: state.mode } });
  }, [isOk, state.period, state.mode]);

  // Detay araçlarının başlangıç ayı seçenekleri: son veri ayı hariç, yeniden eskiye.
  const toolMonths = useMemo(() => starts.slice(0, -1).reverse(), [starts]);
  const series = useMemo(
    () => annualSeries(state.values, data, indices),
    [state.values, data, indices],
  );

  const card = "rounded-xl bg-[var(--color-card)] p-5 sm:p-6";

  // Mobilde sonuç formun altında kalır; sonuç ekranda değilken altta kısa özet gösterilir.
  const resultRef = useRef<HTMLDivElement>(null);
  const [resultVisible, setResultVisible] = useState(true);
  useEffect(() => {
    const element = resultRef.current;
    if (element === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setResultVisible(entry?.isIntersecting ?? true);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="space-y-8 lg:space-y-10">
      {urlWasInvalid && (
        <p role="status" className="rounded-lg bg-[var(--color-card)] p-3 text-sm">
          Linkteki sepet okunamadı; boş bir sepetle başladık.
        </p>
      )}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-8">
        <BasketForm state={state} dispatch={dispatch} profile={profile} />
        {/* Masaüstünde sonuç paneli formun yanında sabit kalır; uzarsa kendi içinde kayar. */}
        <div
          ref={resultRef}
          id="sonuc-paneli"
          className="scroll-mt-4 space-y-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain"
        >
          <ResultCard
            outcome={outcome}
            period={
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
            }
          >
            {outcome.status === "ok" && (
              <ShareActions state={{ ...state, at, from }} lastPeriod={data.lastPeriod} />
            )}
          </ResultCard>
        </div>
      </div>
      {outcome.status === "ok" && !resultVisible && (
        <a
          href="#sonuc-paneli"
          className="fixed inset-x-3 bottom-3 z-20 flex min-h-14 items-center justify-between gap-3 rounded-xl bg-[var(--color-shell)] px-4 text-[var(--color-shell-ink)] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)] lg:hidden"
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm text-[var(--color-shell-muted)]">
              <span aria-hidden="true">Sen</span>
              <span className="sr-only">Senin enflasyonun</span>
            </span>
            <strong className="text-xl text-[var(--color-shell-accent)] tabular-nums">
              {formatPercent(outcome.personal)}
            </strong>
            <span className="text-sm whitespace-nowrap text-[var(--color-shell-muted)]">
              Resmi {formatPercent(outcome.official)}
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium">Sonuca git ↓</span>
        </a>
      )}
      <section aria-label="Zaman serisi" className={card}>
        <TimeSeriesChart points={series} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Kişisel çizgi bugünkü sepetinin geçmiş yıllara uygulanmasıdır; o yıllardaki harcama
          dağılımın farklı olmuş olabilir.
        </p>
      </section>
      <section aria-labelledby="araclar-baslik" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="araclar-baslik" className="text-xl font-semibold">
            Hesap araçları
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Sepetin doluysa sonuçlar önce senin enflasyonunla, sonra resmi enflasyonla verilir.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={card}>
            <PastAmountTool
              data={data}
              indices={indices}
              values={state.values}
              months={toolMonths}
            />
          </div>
          <div className={card}>
            <WageTool data={data} indices={indices} values={state.values} months={toolMonths} />
          </div>
        </div>
      </section>
    </div>
  );
}
