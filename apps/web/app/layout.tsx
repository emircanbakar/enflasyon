import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { loadCalculatorData } from "@/lib/data";
import { SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(process.env),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description:
    "Harcamalarına göre kişisel enflasyonunu hesapla. Hesap tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  const { lastPeriod, attribution } = loadCalculatorData();
  return (
    <html lang="tr">
      <body className="min-h-dvh antialiased">
        <a
          href="#icerik"
          className="fixed top-2 left-2 z-50 -translate-y-24 rounded bg-[var(--color-surface)] px-3 py-2 focus:translate-y-0"
        >
          İçeriğe atla
        </a>
        <SiteHeader />
        <main id="icerik" className="mx-auto max-w-2xl px-4 py-12">
          {children}
        </main>
        <SiteFooter lastPeriod={lastPeriod} attribution={attribution} />
      </body>
    </html>
  );
}
