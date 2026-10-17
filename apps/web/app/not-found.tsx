import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Sayfa bulunamadı</h1>
      <p className="text-[var(--color-muted)]">Aradığın sayfa yok ya da taşınmış olabilir.</p>
      <ul className="flex flex-wrap gap-4">
        <li>
          <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Hesaplayıcıya dön
          </Link>
        </li>
        <li>
          <Link
            href="/enflasyon"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Yıllara göre enflasyon
          </Link>
        </li>
      </ul>
    </div>
  );
}
