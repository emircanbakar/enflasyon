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
  analyticsDomain: process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
} as const;
