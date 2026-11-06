/**
 * HTTP güvenlik başlıkları (docs/web.md, Bölüm 10.2).
 *
 * Saf bir fonksiyondur; `next.config.ts` build başında çağırır, testler doğrudan
 * kullanır.
 *
 * Script politikası: Next.js App Router her sayfaya satır içi script'ler gömer
 * (Turbopack başlatıcısı ve RSC payload'u; ölçüm: statik ana sayfada 3 adet).
 * Nonce her istekte değiştiği için tüm sayfaları dinamik render'a zorlar; hash ise
 * payload sayfaya/isteğe özgü olduğu ve başlıklar build başında sabitlendiği için
 * uygulanamaz. Bu yüzden satır içi script'lere izin verilir ('unsafe-inline'); harici
 * script'lerin yalnızca bir kısmı SRI ile korunur (`experimental.sri`, docs/web.md 10.2).
 * XSS'e karşı asıl savunma girdi tarafındadır: kullanıcı girdisi HTML'e basılmaz,
 * `dangerouslySetInnerHTML` yasaktır (docs/web.md, Bölüm 10.2–10.3).
 */

export interface SecurityHeaderOptions {
  /** Geliştirme modunda React hata ayıklaması için `'unsafe-eval'` gerekir. */
  readonly isDev: boolean;
  /**
   * Yerel HTTP sunucusunda (e2e, Lighthouse) `upgrade-insecure-requests` kapatılır:
   * WebKit localhost isteklerini de https'e çevirir ve sayfa kaynakları yüklenemez.
   * Üretimde her zaman false.
   */
  readonly allowHttp?: boolean;
  /** CSP'ye `connect-src` olarak eklenecek dış origin'ler (analitik, Sentry). */
  readonly connectOrigins?: readonly string[];
}

export interface Header {
  readonly key: string;
  readonly value: string;
}

function directive(name: string, ...sources: readonly string[]): string {
  return [name, ...sources].join(" ");
}

export function contentSecurityPolicy(options: SecurityHeaderOptions): string {
  const { isDev, allowHttp = false, connectOrigins = [] } = options;
  const scriptSources = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];
  return [
    directive("default-src", "'self'"),
    directive("script-src", ...scriptSources),
    // Tailwind çıktısı dış dosyadır; React'in `style` özniteliği için 'unsafe-inline' gerekir
    // (öznitelik stilleri script çalıştıramaz, risk düşüktür).
    directive("style-src", "'self'", "'unsafe-inline'"),
    directive("img-src", "'self'", "data:", "blob:"),
    directive("font-src", "'self'"),
    directive("connect-src", "'self'", ...connectOrigins),
    directive("object-src", "'none'"),
    directive("base-uri", "'self'"),
    directive("form-action", "'self'"),
    directive("frame-ancestors", "'none'"),
    ...(isDev || allowHttp ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function securityHeaders(options: SecurityHeaderOptions): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Paylaşım linklerindeki sepet bilgisi dış sitelere referrer olarak gitmesin.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "browsing-topics=()",
      ].join(", "),
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
