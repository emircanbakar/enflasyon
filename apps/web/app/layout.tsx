import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/** Mutlak URL'ler (canonical, og:image) için kök adres; tanımlı değilse Vercel'in üretim adresi. */
function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(vercel ? `https://${vercel}` : "http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "Benim Enflasyonum",
  description:
    "Harcamalarına göre kişisel enflasyonunu hesapla. Hesap tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Benim Enflasyonum",
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
  return (
    <html lang="tr">
      <body className="min-h-dvh antialiased">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-[var(--color-surface)] focus:px-3 focus:py-2"
        >
          İçeriğe atla
        </a>
        <main id="icerik" className="mx-auto max-w-2xl px-4 py-16">
          {children}
        </main>
      </body>
    </html>
  );
}
