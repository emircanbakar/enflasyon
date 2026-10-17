import { Calculator } from "@/components/calculator/Calculator";
import { loadCalculatorData } from "@/lib/data";
import { formatMonth } from "@/lib/format";

/** Ana sayfa ile paylaşım sayfasının (`/sonuc`) ortak içeriği. */
export function CalculatorPage() {
  const data = loadCalculatorData();
  return (
    <div className="space-y-12">
      <section aria-labelledby="baslik" className="space-y-4">
        <h1 id="baslik" className="text-4xl font-semibold tracking-tight">
          Resmi enflasyon herkes için aynı. Seninki değil.
        </h1>
        <p className="text-lg text-[var(--color-muted)]">
          Harcamalarını gir, resmi fiyat endekslerini senin dağılımına göre ağırlıklandıralım.
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          Son veri: {formatMonth(data.lastPeriod)} (TÜİK)
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
