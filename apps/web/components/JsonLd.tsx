import { serializeJsonLd } from "@/lib/site";

/**
 * Yapılandırılmış veri (docs/web.md, Bölüm 7.3). `dangerouslySetInnerHTML`'in
 * izinli olduğu tek yer burasıdır (ESLint istisnası, Bölüm 10.3): içerik
 * kullanıcıdan gelmez, sunucuda sabit veriden üretilir ve `<` kaçışlıdır.
 * `application/ld+json` çalıştırılan bir script değildir, CSP'yi etkilemez.
 */
export function JsonLd({ data }: { readonly data: Readonly<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
