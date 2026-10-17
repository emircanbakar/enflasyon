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

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Yıllara göre enflasyon</h1>
        <p className="text-lg text-[var(--color-muted)]">
          Resmi tüketici fiyat endeksi (TÜFE), Aralık&apos;tan Aralık&apos;a değişim. Devam eden yıl
          için yılbaşından beri değişim gösterilir.
        </p>
      </header>
      <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {rows.map((summary) => (
          <li key={summary.year}>
            <Link
              href={`/enflasyon/${summary.year}`}
              className="flex min-h-11 items-center justify-between gap-4 px-2 py-3 hover:bg-[var(--color-card)]"
            >
              <span className="font-medium">{summary.year}</span>
              <span className="tabular-nums">
                {formatPercent(summary.yearToDate)}
                {!summary.complete && (
                  <span className="text-sm text-[var(--color-muted)]"> (yılbaşından beri)</span>
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
