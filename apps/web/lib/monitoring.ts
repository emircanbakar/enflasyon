import type { ErrorEvent, init } from "@sentry/browser";
import { publicEnv } from "./env.public";

/**
 * Hata takibi (Sentry; docs/web.md, Bölüm 10.4 ve 12.2).
 *
 * SDK ilk yüke girmez: ilk hata yakalandığında dinamik import ile indirilir, o ana
 * kadar hatalar kuyrukta bekler. Hatasız bir ziyarette Sentry'nin tek baytı bile
 * yüklenmez. Gizlilik: `sendDefaultPii: false`, breadcrumb yok, adreslerden query ve
 * fragment (sepet, TL tutarları) silinir, Referer başlığı gönderilmez.
 */

interface SentryModule {
  readonly init: typeof init;
  readonly captureException: (error: unknown) => string;
}

/** Adresten query ve fragment'i atar: sepet ve tutarlar Sentry'ye gitmez. */
export function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0] ?? "";
  }
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const { url, headers } = event.request;
    delete event.request.query_string;
    delete event.request.cookies;
    if (url) event.request.url = scrubUrl(url);
    if (headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(headers).filter(([name]) => name.toLowerCase() !== "referer"),
      );
    }
  }
  delete event.breadcrumbs;
  delete event.user;
  return event;
}

/** Sayfa başına gönderilecek en fazla hata (döngüye giren bir hata kotayı tüketmesin). */
const MAX_REPORTS = 10;

export function createReporter(
  dsn: string | undefined,
  load: () => Promise<SentryModule>,
): (error: unknown) => void {
  let sentry: Promise<SentryModule | null> | null = null;
  let reports = 0;

  const start = (key: string) =>
    load()
      .then((module) => {
        module.init({
          dsn: key,
          sendDefaultPii: false,
          tracesSampleRate: 0,
          // Global dinleyiciler bizde (instrumentation-client.ts); breadcrumb toplanmaz.
          integrations: (defaults) =>
            defaults.filter((i) => i.name !== "GlobalHandlers" && i.name !== "Breadcrumbs"),
          beforeBreadcrumb: () => null,
          beforeSend: scrubEvent,
        });
        return module;
      })
      .catch(() => null);

  return (error) => {
    if (!dsn || reports >= MAX_REPORTS) return;
    reports += 1;
    sentry ??= start(dsn);
    void sentry.then((module) => module?.captureException(error));
  };
}

export const reportError = createReporter(publicEnv.sentryDsn, () => import("./sentry-sdk"));
