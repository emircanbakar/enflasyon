"use client";

import type { CalcOutcome } from "@/lib/calc";
import { compareRates, formatMonth, formatPercent, formatPoints } from "@/lib/format";

interface ResultCardProps {
  readonly outcome: CalcOutcome;
}

/**
 * Sonuç kartı (docs/web.md, Bölüm 2.2 adım 3). Grafik bileşenleri ayrı adımda
 * gelir; katkı dökümü burada erişilebilir bir liste ve CSS çubuklarıyla gösterilir.
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
      ? "Resmi rakamla aynı."
      : `Resmi rakam senden ${points} ${direction === "yüksek" ? "düşük" : "yüksek"}.`;
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--color-muted)]">
        {formatMonth(outcome.from)} → {formatMonth(outcome.to)}
      </p>
      <p className="text-lg">
        Senin enflasyonun{" "}
        <strong className="block text-5xl font-semibold tracking-tight text-[var(--color-accent)] tabular-nums">
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
  const max = Math.max(...outcome.contributions.map((c) => Math.abs(c.contribution)), 1e-12);
  const top = outcome.contributions[0];
  return (
    <div className="mt-6 space-y-3">
      <h3 className="font-medium">Enflasyonun nereden geliyor?</h3>
      {outcome.sharesMeaningful && top?.share != null && outcome.contributions.length > 1 && (
        <p className="text-sm text-[var(--color-muted)]">
          En büyük pay: <strong className="text-[var(--color-ink)]">{top.label}</strong> (
          {formatPercent(top.share, 0)})
        </p>
      )}
      <ul className="space-y-2">
        {outcome.contributions.map((c) => (
          <li key={c.key} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate">{c.label}</span>
            <span aria-hidden="true" className="h-2 rounded-full bg-[var(--color-line)]">
              <span
                className="block h-2 rounded-full bg-[var(--color-accent)]"
                style={{ width: `${String((Math.abs(c.contribution) / max) * 100)}%` }}
              />
            </span>
            <span className="tabular-nums text-[var(--color-muted)]">
              {c.contribution < 0 ? "−" : ""}
              {formatPoints(c.contribution)} · grup {formatPercent(c.change)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
