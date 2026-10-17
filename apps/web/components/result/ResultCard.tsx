"use client";

import type { CalcOutcome } from "@/lib/calc";
import { ContributionBars } from "@/components/charts/ContributionBars";
import { compareRates, formatMonth, formatPercent } from "@/lib/format";

interface ResultCardProps {
  readonly outcome: CalcOutcome;
}

/**
 * Sonuç kartı (docs/web.md, Bölüm 2.2 adım 3): büyük rakam, resmi rakamla
 * karşılaştırma ve katkı dökümü grafiği (tablo görünümüyle).
 * Özet cümle `aria-live="polite"` bölgesinde ekran okuyucuya duyurulur.
 */
export function ResultCard({ outcome }: ResultCardProps) {
  return (
    <section
      aria-labelledby="sonuc-baslik"
      className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-5"
    >
      <h2 id="sonuc-baslik" className="sr-only">
        Sonuç
      </h2>
      <div aria-live="polite" aria-atomic="true">
        {outcome.status === "empty" && (
          <p className="text-[var(--color-muted)]">
            Bir harcama kalemi gir; kişisel enflasyonun burada görünecek.
          </p>
        )}
        {outcome.status === "error" && (
          <p role="alert" className="text-[var(--color-danger)]">
            {outcome.message}
          </p>
        )}
        {outcome.status === "ok" && <Summary outcome={outcome} />}
      </div>
      {outcome.status === "ok" && <Contributions outcome={outcome} />}
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
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-muted)]">
        {formatMonth(outcome.from)} → {formatMonth(outcome.to)}
      </p>
      <p className="text-lg">
        Senin enflasyonun{" "}
        <strong className="block text-5xl font-semibold tracking-tight text-[var(--color-accent)]">
          {formatPercent(outcome.personal)}
        </strong>
      </p>
      <p>
        Resmi:{" "}
        <strong className="tabular-nums text-[var(--color-official)]">
          {formatPercent(outcome.official)}
        </strong>{" "}
        — {comparison}
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
    <div className="mt-6">
      <ContributionBars contributions={outcome.contributions} summary={summary} />
    </div>
  );
}
