import Link from "next/link";
import { formatMonth } from "@/lib/format";
import { REPO_URL } from "@/lib/site";
import type { Period } from "enflasyon-core";

interface SiteFooterProps {
  readonly lastPeriod: Period;
  readonly attribution: string;
}

const footerLink = "inline-flex min-h-6 items-center underline-offset-4 hover:underline";

/** Altbilgi (docs/web.md, Bölüm 2.2 adım 5): kaynak, son veri, gizlilik notu, linkler. */
export function SiteFooter({ lastPeriod, attribution }: SiteFooterProps) {
  return (
    <footer className="border-t border-[var(--color-line)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-[var(--color-muted)] sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <p className="max-w-[60ch]">
          {attribution} Son veri: {formatMonth(lastPeriod)}. Girdiğin tutarlar tarayıcında kalır,
          hiçbir yere gönderilmez.
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href="/nasil-hesapliyoruz" className={footerLink}>
              Metodoloji
            </Link>
          </li>
          <li>
            <Link href="/enflasyon" className={footerLink}>
              Yıllara göre enflasyon
            </Link>
          </li>
          <li>
            <Link href="/gizlilik" className={footerLink}>
              Gizlilik
            </Link>
          </li>
          <li>
            <a href={REPO_URL} className={footerLink}>
              Kaynak kod (GitHub)
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
