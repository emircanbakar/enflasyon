import type { Metadata } from "next";
import { Prose } from "@/components/content/Prose";
import { REPO_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gizlilik",
  description: `${SITE_NAME} hangi veriyi işler, hangisini işlemez: tutarlar tarayıcıda kalır, çerez kullanılmaz.`,
  alternates: { canonical: "/gizlilik" },
};

/**
 * Gizlilik açıklaması (docs/web.md, Bölüm 10.4). Toplanan veriyi değiştiren her
 * değişiklik (lib/analytics.ts, lib/monitoring.ts) bu sayfayı aynı commit'te günceller.
 */
export default function PrivacyPage() {
  return (
    <Prose>
      <h1>Gizlilik</h1>
      <p className="text-lg">
        {SITE_NAME} hesap tutmaz, giriş istemez ve girdiğin harcamaları saklamaz. Hesap tamamen
        tarayıcında yapılır.
      </p>

      <h2>İşlenmeyen veriler</h2>
      <ul>
        <li>
          <strong>Girdiğin TL tutarları</strong> hiçbir sunucuya gönderilmez. Sayfayı yenilediğinde
          kaybolmasınlar diye adres çubuğunda <code>#</code> işaretinden sonraki kısımda tutulur;
          tarayıcılar bu kısmı sunucuya iletmez.
        </li>
        <li>
          Maaş ve &quot;o zamanki tutar&quot; hesaplarına yazdığın değerler de aynı şekilde yalnızca
          tarayıcında işlenir.
        </li>
        <li>
          Çerez, yerel depolama ya da cihaz parmak izi kullanılmaz; bu yüzden çerez bandı yoktur.
        </li>
      </ul>

      <h2>Sunucuya ulaşan veriler</h2>
      <ul>
        <li>
          <strong>Paylaştığın link:</strong> &quot;Linki kopyala&quot; ya da &quot;Paylaş&quot; ile
          oluşan link, varsayılan olarak yalnızca harcamalarının <em>yüzde dağılımını</em> ve
          seçtiğin dönemi içerir. Link açıldığında ya da bir uygulama önizleme görseli
          oluşturduğunda bu bilgiler sunucuya gelir. TL tutarları, ancak sen &quot;TL tutarlarımı da
          linke ekle&quot;yi işaretlersen linke eklenir ve o durumda da <code>#</code>
          sonrasında durduğu için sunucuya gitmez; linki açan kişi görür.
        </li>
        <li>
          <strong>Standart istek kayıtları:</strong> her web sitesinde olduğu gibi barındırma
          sağlayıcısı (Vercel) IP adresi, tarayıcı bilgisi ve istenen adres gibi teknik kayıtları
          kendi saklama süresi boyunca tutar. Bu kayıtlar kişisel enflasyon hesabında kullanılmaz.
        </li>
      </ul>

      <h2>Ölçüm</h2>
      <ul>
        <li>
          <strong>Hata kayıtları (Sentry):</strong> yalnızca sayfada bir hata oluştuğunda hata
          mesajı, kodun hangi satırda bozulduğu ve tarayıcı türü gönderilir. Adreslerin{" "}
          <code>?</code> ve <code>#</code> sonrası, çerezler ve önceki sayfa bilgisi silinir; IP
          adresi saklanmaz. Hata olmayan ziyaretlerde bu araç hiç yüklenmez.
        </li>
      </ul>
      <p>Sayfada reklam, sosyal medya eklentisi veya izleme amaçlı başka bir script yoktur.</p>

      <h2>İletişim</h2>
      <p>
        Soru ve talepler için projenin <a href={`${REPO_URL}/issues`}>GitHub sayfasından</a>
        ulaşabilirsin. Sitenin kaynak kodu açıktır; yukarıdaki her iddia kodda doğrulanabilir.
      </p>
    </Prose>
  );
}
