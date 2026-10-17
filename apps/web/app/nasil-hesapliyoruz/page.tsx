import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Formula, Prose } from "@/components/content/Prose";
import { loadSiteData } from "@/lib/data";
import { formatMonth } from "@/lib/format";
import { REPO_URL, SITE_NAME, siteUrl } from "@/lib/site";

const TITLE = "Nasıl hesaplıyoruz?";
const DESCRIPTION =
  "Kişisel enflasyonun hesap yöntemi: TÜİK'in TÜFE grup endeksleri, Laspeyres formülü, ağırlıklar, resmi rakamla fark ve sınırlamalar.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nasil-hesapliyoruz" },
};

/**
 * Metodoloji (docs/web.md, Bölüm 2.1 ve 7.3). Formüller `enflasyon-core`'un
 * uyguladığıyla birebir aynıdır (docs/core.md, Bölüm 4).
 */
export default function MethodologyPage() {
  const site = loadSiteData();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          inLanguage: "tr-TR",
          url: new URL("/nasil-hesapliyoruz", siteUrl(process.env)).toString(),
          dateModified: site.retrievedAt,
          author: { "@type": "Person", name: "Emircan Bakar" },
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <Prose>
        <h1>{TITLE}</h1>
        <p className="text-lg">
          Resmi enflasyon, ortalama bir hanenin harcama dağılımına göre hesaplanır. {SITE_NAME},
          aynı resmi fiyat endekslerini <strong>senin</strong> dağılımınla ağırlıklandırır. Fiyat
          verisi değişmez; değişen yalnızca hangi kalemin ne kadar ağırlık taşıdığıdır.
        </p>

        <h2>Veri</h2>
        <ul>
          <li>
            Kaynak: Türkiye İstatistik Kurumu (TÜİK), tüketici fiyat endeksi (TÜFE), 13 ana harcama
            grubu ve genel endeks. Baz yılı 2025=100; TÜİK yeni bazlı serileri geriye dönük olarak
            da yayımladığı için seriler zincirleme yapılmadan kullanılır.
          </li>
          <li>Grupların resmi sepet ağırlıkları her yıl için ayrı ayrı saklanır.</li>
          <li>
            Veri her ay yeni TÜFE açıklandıktan sonra güncellenir; her güncelleme yayımlanmadan önce
            otomatik doğrulamadan geçer. Şu anki son veri: {formatMonth(site.lastPeriod)}.
          </li>
        </ul>

        <h2>Formül</h2>
        <p>
          Her harcama grubunun payı <em>w</em>, grubun dönem başı ve sonu endeksleri <em>I</em> ile
          gösterilirse kişisel enflasyon, payların fiyat değişimleriyle ağırlıklandırılmış
          toplamıdır (Laspeyres yöntemi; TÜİK de aynı yöntemi kullanır):
        </p>
        <Formula label="Kişisel enflasyon: grupların fiyat değişimlerinin, senin paylarınla ağırlıklı ortalaması.">
          π = Σ wᵢ × (Iᵢ,son ÷ Iᵢ,baş) − 1
        </Formula>
        <p>
          Bir grubun sonuca <strong>katkısı</strong>, payıyla kendi fiyat değişiminin çarpımıdır;
          katkıların toplamı sonucun kendisidir. &quot;Enflasyonunun yüzde kaçı konuttan
          geliyor&quot; cümlesi bu katkıdan çıkar.
        </p>

        <h2>Bugünkü harcaman, geçmişin dağılımı</h2>
        <p>
          Formüldeki paylar dönem <em>başındaki</em> dağılımdır, ama çoğu kişi harcamasını bugünkü
          tutarlarla girer. Bir yılda kirası %80, giyimi %20 artan birinin bugünkü dağılımında kira,
          bir yıl öncesine göre daha büyük görünür. Bu yüzden girdiğin paylar önce her grubun kendi
          fiyat değişimiyle dönem başına geri çevrilir:
        </p>
        <Formula label="Bugünkü payların (s) dönem başına geri çevrilmesi; r grubun dönemdeki değişimi.">
          wᵢ = (sᵢ ÷ (1 + rᵢ)) ÷ Σ (sⱼ ÷ (1 + rⱼ))
        </Formula>
        <p>
          TL ya da yüzde girmen fark etmez; ikisi de paya çevrilir. Yüzdelerin toplamı 100 olmasa da
          sonuç, girdiğin oranlara göre ölçeklenerek hesaplanır.
        </p>

        <h2>Dönemler</h2>
        <ul>
          <li>
            <strong>Yıllık:</strong> seçilen ayın, önceki yılın aynı ayına göre değişimi.
          </li>
          <li>
            <strong>Aylık:</strong> önceki aya göre değişim.
          </li>
          <li>
            <strong>Yılbaşından beri:</strong> önceki yılın Aralık ayına göre değişim.
          </li>
          <li>
            <strong>Özel aralık:</strong> seçtiğin iki ay arasındaki değişim.
          </li>
        </ul>
        <p>
          &quot;O zamanki tutar&quot; ve maaş hesapları da aynı endekslerle yapılır: bir tutar,
          sepetinin (sepet boşsa genel endeksin) aynı dönemdeki değişimiyle bugüne taşınır.
        </p>

        <h2>Resmi rakamla karşılaştırma</h2>
        <p>
          Sonuç kartındaki resmi rakam, TÜİK genel endeksinin aynı dönemdeki değişimidir ve
          TÜİK&apos;in açıkladığı rakamla aynıdır. Hesaplayıcıya resmi ağırlıkları girdiğinde ise
          sonuç resmi rakama çok yakın çıkar ama birebir aynı olmayabilir:
        </p>
        <ul>
          <li>
            TÜİK ağırlıkları her yıl günceller ve endeksi her Aralık ayında bu yeni ağırlıklarla
            birbirine bağlar (zincirleme). Yılbaşından beri hesaplarda iki yöntem aynı sonucu verir;
            doğrulamada fark 0,01 puanın altında kaldı.
          </li>
          <li>
            Aralık&apos;ı aşan dönemlerde (ör. Eylül&apos;den Eylül&apos;e yıllık) hesaplayıcı tek
            bir ağırlık seti kullanır. Bu yüzden onda birkaç puanlık fark normaldir; fark resmi
            rakamın yanlış olduğunu göstermez, yöntemin farkıdır.
          </li>
        </ul>

        <h2>Sınırlamalar</h2>
        <ul>
          <li>
            Hesap 13 ana grup düzeyindedir. Grubun içindeki dağılımın (ör. konutta kira mı fatura
            mı) senin için farklı olması sonuca yansımaz.
          </li>
          <li>
            Fiyatlar Türkiye ortalamasıdır; yaşadığın şehrin ya da alışveriş yaptığın yerin
            fiyatları farklı değişmiş olabilir.
          </li>
          <li>
            Geçmiş yılları gösteren grafik, bugünkü sepetini geçmişe uygular. Taşınma, araba alma
            gibi yaşam değişikliklerini bilemez.
          </li>
          <li>
            Hazır profil olarak şimdilik yalnızca &quot;Türkiye ortalaması&quot; var ve resmi
            ağırlıklardan türetilir. Öğrenci, kiracı gibi profiller ancak kaynağı gösterilebilen
            veriyle eklenecek; tahmini profil gösterilmez.
          </li>
        </ul>

        <h2>Gizlilik ve açık kaynak</h2>
        <p>
          Hesap tamamen tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.
          Ayrıntılar <Link href="/gizlilik">gizlilik</Link> sayfasında. Hesap motoru{" "}
          <code>enflasyon-core</code> açık kaynaklı bir TypeScript kütüphanesidir; formüllerin
          testleri gerçek TÜİK verisiyle yapılır. <a href={REPO_URL}>Kaynak kod</a>.
        </p>
      </Prose>
    </>
  );
}
