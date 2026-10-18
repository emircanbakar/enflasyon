/**
 * Tarayıcıya giden public ortam değişkenleri.
 *
 * Next.js `NEXT_PUBLIC_*` değerlerini build sırasında koda gömer ve bunu yalnızca
 * `process.env.NEXT_PUBLIC_X` biçimindeki doğrudan erişimlerde yapar; bu yüzden
 * değerler tek tek okunur. Doğrulama `next.config.ts`'te build başında yapılır
 * (Zod istemci paketine girmesin diye burada tekrar edilmez).
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  umamiWebsiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
} as const;
