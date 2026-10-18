"use client";

import type { ReactNode } from "react";
import type { CalcOutcome } from "@/lib/calc";
import { ContributionBars } from "@/components/charts/ContributionBars";
import { compareRates, formatMonth, formatPercent } from "@/lib/format";

interface ResultCardProps {
  readonly outcome: CalcOutcome;
  /** Kartın üstündeki dönem seçici. */
  readonly period?: ReactNode;
  /** Kartın altına eklenecek içerik (paylaşım butonları). */
  readonly children?: ReactNode;
}

/**
 * Sonuç kartı (docs/web.md, Bölüm 2.2 adım 3): büyük rakam, resmi rakamla
 * karşılaştırma ve katkı dökümü grafiği (tablo görünümüyle).
 * Özet cümle `aria-live="polite"` bölgesinde ekran okuyucuya duyurulur.
 */
export function ResultCard({ outcome, period, children }: ResultCardProps) {
  return (
    <section
      aria-labelledby="sonuc-baslik"
      className="rounded-xl bg-[var(--color-card)] p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.18)] sm:p-6"
    >
      <h2 id="sonuc-baslik" className="sr-only">
        Sonuç
      </h2>
      {period}
      <hr className="rule-dashed my-5" />
      <div aria-live="polite" aria-atomic="true">
        {outcome.status === "empty" && (
          <div className="space-y-2 py-2">
            <p className="text-lg font-medium">Sonucun burada görünecek.</p>
            <p className="text-[var(--color-muted)]">
              Bir harcama kalemi gir ya da &quot;Türkiye ortalaması ile doldur&quot;u dene; kişisel
              enflasyonun yazdıkça hesaplanır.
            </p>
          </div>
        )}
        {outcome.status === "error" && (
          <p role="alert" className="text-[var(--color-danger)]">
            {outcome.message}
          </p>
        )}
        {outcome.status === "ok" && <Summary outcome={outcome} />}
      </div>
      {outcome.status === "ok" && <Contributions outcome={outcome} />}
      {children}
    </section>
  );
}

type Ok = Extract<CalcOutcome, { status: "ok" }>;

function Summary({ outcome }: { readonly outcome: Ok }) {
  const { points, direction } = compareRates(outcome.personal, outcome.official);
  const comparison =
    direction === "eşit"
      ? "seninkiyle aynı."
      : `senden ${points} ${direction === "yüksek" ? "düşük" : "yüksek"}.`;
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        {formatMonth(outcome.from)} → {formatMonth(outcome.to)}
      </p>
      <p>
        <span className="block text-base">Senin enflasyonun</span>
        <strong className="block text-6xl leading-none font-semibold tracking-tight tabular-nums text-[var(--color-accent)]">
          {formatPercent(outcome.personal)}
        </strong>
      </p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span>
          Resmi:{" "}
          <strong className="figures font-semibold text-[var(--color-official)]">
            {formatPercent(outcome.official)}
          </strong>
        </span>
        <span className="text-[var(--color-muted)]">— {comparison}</span>
      </p>
      {outcome.singleItem && (
        <p className="text-sm text-[var(--color-muted)]">
          Tek kalem girdin; sonuç o grubun kendi enflasyonudur.
        </p>
      )}
    </div>
  );
}

function Contributions({ outcome }: { readonly outcome: Ok }) {
  const top = outcome.contributions[0];
  const summary =
    outcome.contributions.length === 1
      ? `Enflasyonunun tamamı ${top?.label ?? "tek"} grubundan geliyor.`
      : outcome.sharesMeaningful && top?.share != null
        ? `En büyük pay ${top.label} grubunda: enflasyonunun ${formatPercent(top.share, 0)} kadarı buradan geliyor.`
        : "Bazı gruplarda fiyatlar düştü; katkılar puan olarak gösteriliyor.";
  return (
    <div className="mt-6 border-t border-[var(--color-line)] pt-5">
      <ContributionBars contributions={outcome.contributions} summary={summary} />
    </div>
  );
}
