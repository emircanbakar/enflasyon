# Tasarım sistemi: Benim Enflasyonum

Görsel dil **market fişi**. Fiş, herkesin cebindeki harcama belgesidir: satır satır kalemler, sağa yaslı tutarlar, kesik çizgili ayraçlar, en altta kalın TOPLAM. Site bir araç olduğu için (Operate) fiş dünyası yalnızca dört şey getirir: tip, renk, yoğunluk ve tek bir imza. Navigasyon ve kontroller standart web bileşenleridir.

## İmza

Sepet formu bir fiş gibi okunur:

- Her satırda etiket ile tutar arasında noktalı bağ (`.leader`, yalnızca `sm` ve üstü).
- Bölümler arasında kesik ayraç (`.rule-dashed`).
- Formun sonunda kalın **Toplam** satırı (TL toplamı ya da yüzde toplamı) ve kalem sayısı.
- Kâğıdın alt kenarı yırtık (`.receipt`, CSS maskesi).

Sonuç paneli bu fişin "toplamı" gibi durur: büyük kişisel oran (vurgu rengi), altında resmi oran (resmi mavi).

## Düzen

- Kabuk: tam genişlik beyaz üst bant (`--color-shell`, alt kenar çizgisi), içerik `max-w-6xl`.
- Ana sayfa (çalışma masası): `lg` ve üstünde iki sütun; solda fiş (form), sağda `sticky` sonuç paneli (dönem seçici, sonuç, katkılar, paylaşım). Panel ekrandan uzunsa kendi içinde kayar. Altta tam genişlik zaman serisi ve iki sütunlu hesap araçları.
- Mobil: tek sütun; sonuç ekranda değilken altta beyaz özet çubuğu ("Sonuca git").
- Okuma sayfaları: metin en fazla `70ch`; yıl sayfasında iki tablo `lg`'de yan yana.

## Renk

Strateji: kısıtlı (tonlu nötrler + tek vurgu). Grafik renkleri dataviz doğrulayıcısından geçmiştir.

Tek tema: açık. Sistem koyu moddayken de site açık görünür (`color-scheme: light`).

| Token                                   | Değer                 | Görev                                                   |
| --------------------------------------- | --------------------- | ------------------------------------------------------- |
| `--color-surface`                       | `#eceeef`             | Zemin (tezgâh), alan içleri                             |
| `--color-card`                          | `#ffffff`             | Kâğıt: fiş ve kartlar                                   |
| `--color-shell`                         | `#ffffff`             | Üst bant, mobil özet, CTA bandı (ince kenar çizgisiyle) |
| `--color-ink` / `--color-muted`         | `#15171a` / `#59616b` | Metin                                                   |
| `--color-line` / `--color-rule`         | `#d6dade` / `#a7aeb6` | Satır çizgisi / fiş ayracı                              |
| `--color-accent`                        | `#c2410c`             | Kişisel oran, birincil eylem                            |
| `--color-official`                      | `#2f5d8a`             | Resmi oran metni                                        |
| `--color-series-personal` / `-official` | `#c2410c` / `#2a78d6` | Grafik serileri                                         |

## Tip

- Arayüz: sistem sans (Tailwind varsayılanı). Başlıklar yarı kalın, `tracking-tight`, `text-wrap: balance`.
- Rakamlar: `.figures`, yani sistem eş genişlikli yazı + `tabular-nums`. Yalnızca veri ve ölçümde kullanılır: fiş tutarları, tablo değerleri, formüller. Büyük sonuç rakamı sans + `tabular-nums`'tır (eş genişlikli virgül büyük boyda hantal durur).

## Bileşen dili

- Kartlar: `rounded-xl`, kenarlık yok, kâğıt rengi; yalnızca sonuç paneli hafif gölge alır.
- Bölümlü seçim (`components/calculator/segmented.ts`): görünürde birleşik düğmeler, altta yerel radio grubu.
- Alanlar: zemin renginde kuyu, odakta kâğıda döner; tutarlar sağa yaslı ve eş genişlikli.
- Birincil eylem dolu vurgu rengi; ikincil eylemler zemin renginde.
- Dokunma hedefi en az 40 px (segmentler), çoğunlukla 44 px.

## Yapılmayanlar

Eyebrow/kicker etiketleri, gradyan metin, cam efekti, renkli kalın kenar çizgileri, kart içinde kart, emoji ikon.
