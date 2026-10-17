import Link from "next/link";
import { formatMonth } from "@/lib/format";
import { REPO_URL } from "@/lib/site";
import type { Period } from "enflasyon-core";

interface SiteFooterProps {
  readonly lastPeriod: Period;
  readonly attribution: string;
}

/** Altbilgi (docs/web.md, Bölüm 2.2 adım 5): kaynak, son veri, gizlilik notu, linkler. */
export function SiteFooter({ lastPeriod, attribution }: SiteFooterProps) {
  return (
    <footer className="mx-auto max-w-2xl space-y-3 border-t border-[var(--color-line)] px-4 py-8 text-sm text-[var(--color-muted)]">
      <p>
        {attribution} Son veri: {formatMonth(lastPeriod)}. Girdiğin tutarlar tarayıcında kalır,
        hiçbir yere gönderilmez.
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        <li>
          <Link href="/nasil-hesapliyoruz" className="underline underline-offset-4">
            Metodoloji
          </Link>
        </li>
        <li>
          <Link href="/enflasyon" className="underline underline-offset-4">
            Yıllara göre enflasyon
          </Link>
        </li>
        <li>
          <Link href="/gizlilik" className="underline underline-offset-4">
            Gizlilik
          </Link>
        </li>
        <li>
          <a href={REPO_URL} className="underline underline-offset-4">
            Kaynak kod (GitHub)
          </a>
        </li>
      </ul>
    </footer>
  );
}
