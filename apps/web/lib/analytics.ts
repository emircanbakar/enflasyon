/**
 * Çerezsiz analitik (Umami Cloud; docs/web.md, Bölüm 12.2).
 *
 * Script kendi alan adımızdan proxy'lenir (`/stats/*` → cloud.umami.is, bkz.
 * `next.config.ts`); CSP'ye dış origin eklenmez. Script yüklenmemişse (site kimliği
 * yok, reklam engelleyici, test) her çağrı sessizce hiçbir şey yapmaz.
 *
 * Olaylara kişisel veri ya da tutar konmaz; yalnızca aşağıdaki sabit alanlar gider.
 * Sayfa adreslerinden query ve fragment çıkarılır (`data-exclude-search/hash`).
 */

export const ANALYTICS_PATH = "/stats";
export const UMAMI_ORIGIN = "https://cloud.umami.is";

export type AnalyticsEvent =
  | {
      readonly name: "hesap-tamamlandi";
      readonly data: { readonly donem: string; readonly mod: string };
    }
  | { readonly name: "link-kopyalandi" }
  | { readonly name: "paylasildi" }
  | { readonly name: "story-indirildi" }
  | {
      readonly name: "web-vitals";
      readonly data: { readonly metrik: string; readonly deger: number; readonly sayfa: string };
    };

interface Umami {
  track(name: string, data?: Readonly<Record<string, string | number>>): void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/** Script yüklenmeden gelen olaylar (ör. ilk web vitals) burada bekler. */
const pending: AnalyticsEvent[] = [];
const MAX_PENDING = 20;

function send(umami: Umami, event: AnalyticsEvent) {
  try {
    umami.track(event.name, "data" in event ? event.data : undefined);
  } catch {
    // Analitik hiçbir zaman uygulamayı bozmaz.
  }
}

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const umami = window.umami;
  if (umami) send(umami, event);
  else if (pending.length < MAX_PENDING) pending.push(event);
}

/** Script yüklendiğinde bekleyen olayları gönderir. */
export function flushAnalytics(): void {
  const umami = window.umami;
  if (!umami) return;
  for (const event of pending.splice(0)) send(umami, event);
}

/** Ölçülen web vitals; INP/LCP/FCP/TTFB ms'ye yuvarlanır, CLS üç ondalığa. */
const VITALS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

export function vitalsEvent(
  metric: { readonly name: string; readonly value: number },
  pathname: string,
): AnalyticsEvent | null {
  if (!VITALS.has(metric.name)) return null;
  const value =
    metric.name === "CLS" ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value);
  // Yıl sayfaları tek grupta toplanır; adres hiçbir zaman query/fragment taşımaz.
  const page = pathname.startsWith("/enflasyon/") ? "/enflasyon/[yil]" : pathname;
  return { name: "web-vitals", data: { metrik: metric.name, deger: value, sayfa: page } };
}

/** Umami script etiketinin öznitelikleri; site kimliği yoksa null (script yüklenmez). */
export function umamiScriptProps(
  websiteId: string | undefined,
  siteHost: string | undefined,
): Readonly<Record<string, string>> | null {
  if (!websiteId) return null;
  return {
    src: `${ANALYTICS_PATH}/script.js`,
    "data-website-id": websiteId,
    "data-host-url": ANALYTICS_PATH,
    "data-exclude-search": "true",
    "data-exclude-hash": "true",
    "data-do-not-track": "true",
    // Preview deploy'ları ve yerel build'ler sayılmaz.
    ...(siteHost ? { "data-domains": siteHost } : {}),
  };
}
