import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { YearReport } from "@/components/content/YearReport";
import { loadSiteData } from "@/lib/data";
import { siteUrl } from "@/lib/site";
import { availableYears, yearLead, yearSummary } from "@/lib/years";

interface PageProps {
  readonly params: Promise<{ readonly yil: string }>;
}

/** Yıl sayfaları build'de üretilir; listede olmayan yıl 404 döner. */
export const dynamicParams = false;

export function generateStaticParams(): { yil: string }[] {
  return availableYears(loadSiteData().indices).map((yil) => ({ yil }));
}

function load(yil: string) {
  const site = loadSiteData();
  const summary = yearSummary(yil, site.indices, site.weights);
  if (summary === null) notFound();
  return { site, summary };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { yil } = await params;
  const { summary } = load(yil);
  return {
    title: `${yil} enflasyonu: aylık ve yıllık TÜFE`,
    description: yearLead(summary),
    alternates: { canonical: `/enflasyon/${yil}` },
  };
}

export default async function YearPage({ params }: PageProps) {
  const { yil } = await params;
  const { site, summary } = load(yil);
  const url = new URL(`/enflasyon/${yil}`, siteUrl(process.env)).toString();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: `Türkiye ${yil} tüketici fiyat endeksi (TÜFE) özeti`,
          description: yearLead(summary),
          url,
          inLanguage: "tr-TR",
          temporalCoverage: `${yil}-01/${summary.lastPeriod}`,
          spatialCoverage: { "@type": "Place", name: "Türkiye" },
          isBasedOn: site.sourceLabel,
          creator: { "@type": "Organization", name: "Türkiye İstatistik Kurumu (TÜİK)" },
          dateModified: site.retrievedAt,
          variableMeasured: ["Aylık TÜFE değişimi", "Yıllık TÜFE değişimi", "Grup değişimleri"],
        }}
      />
      <YearReport
        summary={summary}
        years={availableYears(site.indices)}
        attribution={site.attribution}
      />
    </>
  );
}
