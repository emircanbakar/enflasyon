"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";
import "./globals.css";

/** Kök layout'un kendisi hata verirse (ör. veri dosyası bozuk) gösterilir. */
export default function GlobalError({ error }: { readonly error: Error & { digest?: string } }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Bir şeyler ters gitti</h1>
          <p>Sayfa yüklenemedi. Biraz sonra tekrar dene.</p>
        </main>
      </body>
    </html>
  );
}
