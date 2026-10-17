/**
 * Site geneli sabitler, kök adres ve arama motoru dosyaları (docs/web.md, Bölüm 7.3).
 *
 * Fonksiyonlar saftır; `app/sitemap.ts`, `app/robots.ts` ve metadata bunları
 * gerçek ortam değişkenleriyle çağırır, testler doğrudan kullanır.
 */

export const SITE_NAME = "Benim Enflasyonum";
export const REPO_URL = "https://github.com/emircanbakar/enflasyon";

type SiteEnv = Readonly<Record<string, string | undefined>>;

/** Mutlak URL'ler (canonical, og:image, sitemap) için kök adres. */
export function siteUrl(env: SiteEnv): URL {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured);
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return new URL(vercel ? `https://${vercel}` : "http://localhost:3000");
}

/** Arama motorlarına açık, statik sayfalar. `/sonuc` (noindex) ve `/api/` girmez. */
export function staticPaths(years: readonly string[]): string[] {
  return [
    "/",
    "/nasil-hesapliyoruz",
    "/enflasyon",
    ...years.map((year) => `/enflasyon/${year}`),
    "/gizlilik",
  ];
}

export interface SitemapEntry {
  readonly url: string;
  readonly lastModified: string;
}

/**
 * Sitemap girdileri. `lastModified` veri anlık görüntüsünün alındığı gündür:
 * içerik yalnızca veri güncellendiğinde değişir.
 */
export function sitemapEntries(
  base: URL,
  years: readonly string[],
  lastModified: string,
): SitemapEntry[] {
  return staticPaths(years).map((path) => ({
    url: new URL(path, base).toString(),
    lastModified,
  }));
}

/** JSON'u `<script>` içine güvenle gömer: `<` kaçışı `</script>` ile erken kapanmayı önler. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
