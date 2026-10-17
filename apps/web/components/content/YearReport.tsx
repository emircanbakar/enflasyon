import Link from "next/link";
import { formatMonth, formatPercent } from "@/lib/format";
import { yearLead } from "@/lib/years";
import type { YearSummary } from "@/lib/years";

interface YearReportProps {
  readonly summary: YearSummary;
  readonly years: readonly string[];
  readonly attribution: string;
}

const cell = "px-2 py-1.5 text-right tabular-nums";
const headCell = "px-2 py-1.5 font-medium";

/** Bir yılın resmi enflasyon özeti: anahtar rakamlar, aylık tablo, grup tablosu. */
export function YearReport({ summary, years, attribution }: YearReportProps) {
  const index = years.indexOf(summary.year);
  const previous = index > 0 ? years[index - 1] : undefined;
  const next = index >= 0 ? years[index + 1] : undefined;
  const ytdLabel = summary.complete ? "Yıllık (Aralık'tan Aralık'a)" : "Yılbaşından beri";

  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{summary.year} enflasyonu</h1>
        <p className="text-lg">{yearLead(summary)}</p>
        {!summary.complete && (
          <p className="text-sm text-[var(--color-muted)]">
            Yıl devam ediyor; tablolar her ay yeni veriyle güncellenir.
          </p>
        )}
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label={ytdLabel} value={formatPercent(summary.yearToDate)} />
        {!summary.complete && (
          <Stat
            label={`Yıllık (${formatMonth(summary.lastPeriod)})`}
            value={formatPercent(summary.annual)}
          />
        )}
        {summary.average !== null && (
          <Stat label="12 aylık ortalama" value={formatPercent(summary.average)} />
        )}
      </dl>

      <section aria-labelledby="aylik" className="space-y-3">
        <h2 id="aylik" className="text-xl font-semibold">
          Aylık resmi enflasyon
        </h2>
        <table className="w-full text-sm">
          <caption className="sr-only">
            {summary.year} yılında aylık ve yıllık TÜFE değişimi
          </caption>
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              <th scope="col" className={headCell}>
                Ay
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                Aylık
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                Yıllık
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.months.map((row) => (
              <tr key={row.period} className="border-b border-[var(--color-line)]">
                <th scope="row" className="px-2 py-1.5 text-left font-normal">
                  {formatMonth(row.period)}
                </th>
                <td className={cell}>{formatPercent(row.monthly)}</td>
                <td className={cell}>{row.annual === null ? "—" : formatPercent(row.annual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="gruplar" className="space-y-3">
        <h2 id="gruplar" className="text-xl font-semibold">
          Harcama gruplarına göre
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Değişim: önceki yılın Aralık ayından {formatMonth(summary.lastPeriod)} ayına. Ağırlık:
          TÜİK sepetinde grubun {summary.year} yılı payı.
        </p>
        <table className="w-full text-sm">
          <caption className="sr-only">
            {summary.year} yılında harcama gruplarının fiyat değişimi ve sepet ağırlığı
          </caption>
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              <th scope="col" className={headCell}>
                Grup
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                Değişim
              </th>
              <th scope="col" className={`${headCell} text-right`}>
                Ağırlık
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.groups.map((group) => (
              <tr key={group.key} className="border-b border-[var(--color-line)]">
                <th scope="row" className="px-2 py-1.5 text-left font-normal">
                  {group.label}
                </th>
                <td className={cell}>{formatPercent(group.change)}</td>
                <td className={cell}>
                  {group.weight === null ? "—" : formatPercent(group.weight / 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3 rounded-lg bg-[var(--color-card)] p-5">
        <h2 className="text-xl font-semibold">Bu rakam senin için ne kadar?</h2>
        <p>
          Resmi rakam, ortalama bir hanenin harcama dağılımına göre hesaplanır. Kirası, mutfak
          masrafı ya da ulaşım payı farklı olanın enflasyonu da farklıdır.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--color-accent)] px-4 font-medium text-[var(--color-surface)]"
        >
          Kendi enflasyonunu hesapla
        </Link>
      </section>

      <footer className="space-y-4 text-sm">
        <p className="text-[var(--color-muted)]">
          {attribution} TÜFE 2025=100 bazlı seri. Hesap yöntemi:{" "}
          <Link href="/nasil-hesapliyoruz" className="underline underline-offset-4">
            nasıl hesaplıyoruz
          </Link>
          .
        </p>
        <nav aria-label="Diğer yıllar" className="flex justify-between gap-4">
          {previous ? (
            <Link
              href={`/enflasyon/${previous}`}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              ← {previous}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/enflasyon/${next}`}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {next} →
            </Link>
          )}
        </nav>
      </footer>
    </article>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-card)] p-4">
      <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
