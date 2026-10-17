import type { Metadata } from "next";
import { CalculatorPage } from "@/components/page/CalculatorPage";

/** Önizleme görseline yalnızca bu parametreler geçer (allowlist); TL tutarı fragment'tedir, buraya gelmez. */
const OG_PARAMS = ["v", "d", "at", "from", "w"] as const;

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Paylaşılan sonuç sayfası (docs/web.md, Bölüm 2.1 ve 7.1). İçerik ana sayfayla
 * aynıdır; tek farkı, linkteki yüzde dağılımından kişiye özel önizleme görseli
 * üretmesidir. Sonsuz kombinasyon olduğu için arama motorlarına kapalıdır.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of OG_PARAMS) {
    const value = params[key];
    if (typeof value === "string") query.set(key, value);
  }
  const image = `/api/og?${query.toString()}`;
  return {
    title: "Benim enflasyonum",
    description: "Harcamalarıma göre kişisel enflasyonum. Seninkini de hesapla.",
    robots: { index: false, follow: true },
    alternates: { canonical: "/" },
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function ResultPage() {
  return <CalculatorPage />;
}
