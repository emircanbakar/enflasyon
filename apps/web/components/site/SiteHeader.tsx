import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const navLink =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm text-[var(--color-shell-muted)] transition-colors hover:text-[var(--color-shell-ink)]";

export function SiteHeader() {
  return (
    <header className="bg-[var(--color-shell)] text-[var(--color-shell-ink)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 font-semibold">
          <svg aria-hidden="true" viewBox="0 0 20 24" className="h-5 w-auto">
            <path
              d="M1 1h18v19l-3 3-3-3-3 3-3-3-3 3-3-3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M5 7h10M5 11h6M5 15h10" stroke="var(--color-shell-accent)" strokeWidth="1.6" />
          </svg>
          {SITE_NAME}
        </Link>
        <nav aria-label="Ana menü">
          <ul className="-mr-3 flex">
            <li>
              <Link href="/enflasyon" className={navLink}>
                Yıllara göre
              </Link>
            </li>
            <li>
              <Link href="/nasil-hesapliyoruz" className={navLink}>
                Nasıl hesaplıyoruz?
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
