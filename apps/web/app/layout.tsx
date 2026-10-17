import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Benim Enflasyonum",
  description:
    "Harcamalarına göre kişisel enflasyonunu hesapla. Hesap tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.",
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
