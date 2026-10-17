import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { CalculatorPage } from "@/components/page/CalculatorPage";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url: siteUrl(process.env).toString(),
          description:
            "Harcama dağılımına göre kişisel enflasyon hesaplayıcı. TÜİK'in resmi TÜFE grup endekslerini kullanır; hesap tarayıcıda yapılır.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          inLanguage: "tr-TR",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
        }}
      />
      <CalculatorPage />
    </>
  );
}
