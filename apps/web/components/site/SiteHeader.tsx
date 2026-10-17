import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold">
        {SITE_NAME}
      </Link>
      <nav aria-label="Ana menü">
        <ul className="flex gap-4 text-sm">
          <li>
            <Link
              href="/enflasyon"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
            >
              Yıllara göre
            </Link>
          </li>
          <li>
            <Link
              href="/nasil-hesapliyoruz"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
            >
              Nasıl hesaplıyoruz?
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
