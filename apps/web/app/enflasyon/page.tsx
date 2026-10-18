import type { Metadata } from "next";
import Link from "next/link";
import { loadSiteData } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { availableYears, yearSummary } from "@/lib/years";

export const metadata: Metadata = {
  title: "Yıllara göre enflasyon",
  description:
    "Türkiye'de yıllara göre resmi enflasyon (TÜFE): her yılın aylık rakamları ve harcama gruplarına göre değişimi.",
  alternates: { canonical: "/enflasyon" },
};

export default function YearsPage() {
  const site = loadSiteData();
  const rows = availableYears(site.indices)
    .reverse()
    .flatMap((year) => {
      const summary = yearSummary(year, site.indices, site.weights);
      return summary ? [summary] : [];
    });

  const max = Math.max(...rows.map((summary) => summary.yearToDate), 0);

  return (
    <div className="max-w-4xl space-y-8">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Yıllara göre enflasyon
        </h1>
        <p className="text-lg text-[var(--color-muted)]">
          Resmi tüketici fiyat endeksi (TÜFE), Aralık&apos;tan Aralık&apos;a değişim. Devam eden yıl
          için yılbaşından beri değişim gösterilir.
        </p>
      </header>
      <ul className="rounded-xl bg-[var(--color-card)] p-2 sm:p-3">
        {rows.map((summary) => (
          <li key={summary.year}>
            <Link
              href={`/enflasyon/${summary.year}`}
              className="grid min-h-14 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--color-surface)]"
            >
              <span className="figures text-lg font-semibold">{summary.year}</span>
              <span
                aria-hidden="true"
                className="h-3 overflow-hidden rounded-full bg-[var(--color-surface)]"
              >
                <span
                  className="block h-full rounded-full bg-[var(--color-series-official)]"
                  style={{ width: `${String((summary.yearToDate / max) * 100)}%` }}
                />
              </span>
              <span className="figures text-right">
                {formatPercent(summary.yearToDate)}
                {!summary.complete && (
                  <span className="block font-sans text-xs text-[var(--color-muted)]">
                    yılbaşından beri
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-[var(--color-muted)]">{site.attribution}</p>
    </div>
  );
}
