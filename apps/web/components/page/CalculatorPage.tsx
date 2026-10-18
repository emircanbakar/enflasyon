import { Calculator } from "@/components/calculator/Calculator";
import { loadCalculatorData } from "@/lib/data";
import { formatMonth } from "@/lib/format";

/** Ana sayfa ile paylaşım sayfasının (`/sonuc`) ortak içeriği. */
export function CalculatorPage() {
  const data = loadCalculatorData();
  return (
    <div className="space-y-8 lg:space-y-10">
      <section
        aria-labelledby="baslik"
        className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3"
      >
        <div className="max-w-2xl space-y-3">
          <h1
            id="baslik"
            className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]"
          >
            Resmi enflasyon herkes için aynı. Seninki değil.
          </h1>
          <p className="text-lg text-[var(--color-muted)]">
            Harcamalarını gir, resmi fiyat endekslerini senin dağılımına göre ağırlıklandıralım.
          </p>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          Son veri: <span className="text-[var(--color-ink)]">{formatMonth(data.lastPeriod)}</span>{" "}
          (TÜİK)
        </p>
      </section>
      <noscript>
        <p>
          Hesaplayıcı JavaScript gerektirir. Hesap tamamen tarayıcında yapılır, hiçbir veri sunucuya
          gönderilmez.
        </p>
      </noscript>
      <Calculator data={data} />
    </div>
  );
}
