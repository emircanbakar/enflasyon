# Kişisel Enflasyon Web Uygulaması — Teknik Doküman

13 Ekim 2026 · Emir

## 1. Ürün tanımı ve MVP kapsamı

Kullanıcı aylık harcamasını kalem kalem girer, uygulama resmi fiyat endekslerini bu dağılıma göre ağırlıklandırıp **"senin enflasyonun"** rakamını, hangi kalemin onu ne kadar etkilediğini ve maaşının reel olarak ne kadar eridiğini gösterir. Tüm hesap tarayıcıda, `enflasyon-core` paketiyle yapılır. **Girilen TL tutarları hiçbir sunucuya gitmez:** URL'de `#` (fragment) kısmında tutulur ve tarayıcı fragment'i sunucuya göndermez. Sunucuya giden tek kullanıcı bilgisi, paylaşım önizlemesi için kullanılan yüzde dağılımıdır (Bölüm 5.1).

**Çalışma adı:** "Benim Enflasyonum" (alan adı ve isim kesinleşmedi, Bölüm 12'de açık soru).

**Hedef kullanıcı:** Türkiye'de yaşayan, resmi enflasyonun kendi yaşadığını yansıtmadığını düşünen, mobilden gelen, 20-45 yaş arası kişiler. Özellikle kiracılar, öğrenciler, maaş zammı pazarlığı yapacak çalışanlar.

**Başarı ölçütleri (canlıya çıktıktan 3 ay sonra):**

- Lighthouse mobil: Performance, Accessibility, Best Practices, SEO dördü de 100
- Mobilde ilk hesap sonucuna ulaşma süresi < 30 saniye
- Paylaşım kartı indirme / sonuç görme oranı ölçülüyor
- Gerçek kullanıcı sayısı, gizlilik dostu analitikle raporlanabiliyor

### 1.1 MVP'de olanlar

- [ ] Sepet girişi: ana harcama grupları (TÜFE ana grupları; sayı ve adlar veri kaynağındaki güncel sınıflamadan alınır, Bölüm 4), TL veya yüzde, hazır profiller
- [ ] Sonuç: yıllık kişisel enflasyon, resmi rakamla karşılaştırma, kalem katkı dökümü
- [ ] Zaman serisi: son 5 yılda kişisel ve resmi enflasyon grafiği
- [ ] "O zamanki X TL bugün kaç TL?" hesabı
- [ ] Reel maaş hesabı (maaş + son zam tarihi)
- [ ] Link ile paylaşım (sonuç URL'de) + dinamik önizleme görseli + indirilebilir story kartı
- [ ] Metodoloji sayfası (nasıl hesaplıyoruz, veri kaynağı, sınırlamalar)
- [ ] Açık/koyu tema, tamamen Türkçe

### 1.2 MVP'de olmayanlar (bilinçli olarak)

- Kullanıcı hesabı, giriş, veritabanı (veri saklanmaz)
- İl bazlı enflasyon, alternatif endeksler (İTO, ENAG) — v2
- Alt kalem (madde) düzeyinde sepet — veri erişimine bağlı, v2
- İngilizce arayüz — v2 (i18n altyapısı baştan kurulur ama tek dil yayınlanır)
- PWA / offline — v2

## 2. Kullanıcı akışı ve ekranlar

Uygulama tek bir ana sayfada, kaydırılarak ilerleyen üç bölümden oluşur. Ayrı sayfalar sadece SEO ve bilgi içindir. Kullanıcı hiçbir noktada kayıt olmaz.

### 2.1 Rotalar

| Rota                  | İçerik                                                                                                                                          | Render                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/`                   | Hesaplayıcı (giriş → sonuç → detay)                                                                                                             | Statik kabuk + client island                                            |
| `/sonuc?…#…`          | Aynı sayfa, URL'deki sepetle dolu açılır; paylaşılan linkler buraya gelir. Query'de sadece yüzde dağılımı, fragment'te TL tutarları (Bölüm 5.1) | Dinamik (query'den `generateMetadata`), hafif kabuk; OG görseli dinamik |
| `/nasil-hesapliyoruz` | Metodoloji, formüller, veri kaynağı, sınırlamalar                                                                                               | Statik (MDX)                                                            |
| `/enflasyon/[yil]`    | Yıl bazlı resmi veri özet sayfaları (SEO)                                                                                                       | SSG, build'de üretilir                                                  |
| `/profil/[slug]`      | "Kiracı aile", "öğrenci" gibi hazır profil sonuçları (SEO)                                                                                      | SSG                                                                     |
| `/gizlilik`           | Gizlilik açıklaması                                                                                                                             | Statik                                                                  |
| `/api/og`             | Paylaşım görseli üretimi                                                                                                                        | Edge route handler                                                      |

### 2.2 Ana akış

1. **Giriş (hero):** Tek cümlelik vaat ("Resmi enflasyon herkes için aynı. Seninki değil.") ve "Hesapla" butonu. Altında son resmi rakam ve veri tarihi.
2. **Sepet adımı:**
   - Üstte profil seçici (öğrenci, kiracı aile, ev sahibi aile, emekli, kendim gireceğim). Seçim kalemleri önceden doldurur.
   - Her harcama grubu için bir satır: ikon, ad, kısa açıklama ("Konut: kira, aidat, faturalar"), sayı alanı ve kaydırıcı.
   - Mod anahtarı: **TL** veya **%**. Yüzde modunda toplam canlı gösterilir; kaydırıcılardan biri değişince diğerleri orantılı ayarlanmaz (kullanıcıyı şaşırtır), bunun yerine "toplam %112, fazla" uyarısı ve tek tıkla "normalize et" butonu sunulur.
   - **Toplam 100 değilken de sonuç gösterilir.** Web, `enflasyon-core`'a her iki modda da `mode: "amount"` gönderir; yüzdeler göreli tutar gibi normalize edilir. `mode: "share"` hiç kullanılmaz, çünkü toplam 1 değilken `SHARES_NOT_ONE` fırlatır ve kullanıcı yazarken sonuç kartı sürekli hata durumuna düşer. Uyarı bandı "sonuç, girdiğin oranlara göre ölçeklendi" der; "normalize et" sadece alanları 100'e tamamlar, sonucu değiştirmez.
   - Her değişiklikte sonuç anında yeniden hesaplanır (debounce yok, hesap < 1 ms).
3. **Sonuç kartı:**
   - Büyük rakam: "Senin yıllık enflasyonun %48,1". Altında: "Resmi: %31,8 — senden 16,3 puan düşük".
   - Katkı dökümü: yatay çubuklar, "Enflasyonunun %62'si konuttan geliyor".
   - Dönem seçici: yıllık / aylık / yılbaşından beri / özel aralık.
   - Butonlar: "Linki kopyala", "Story olarak indir", "Paylaş" (Web Share API, desteklenmiyorsa kopyala).
4. **Detay bölümü:**
   - Zaman serisi: aynı sepetin son 5 yıldaki yıllık enflasyonu ile resmi değer. Grafik "bugünkü sepetinle geçmiş yıllar" olarak etiketlenir; kullanıcının geçmişteki harcama dağılımının farklı olabileceği metodoloji sayfasında açıklanır.
   - "O zamanki tutar" hesaplayıcısı: tarih + TL → bugünkü karşılık.
   - Maaş hesaplayıcısı: eski maaş, yeni maaş, zam tarihi → reel değişim ve "enflasyonu karşılayan maaş".
5. **Altbilgi:** veri kaynağı ve son güncelleme tarihi, metodoloji linki, "verilerin hiçbir yere gönderilmez" notu, GitHub linki.

### 2.3 Boş, hata ve sınır durumları

| Durum                        | Davranış                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Sepet tamamen boş            | Sonuç alanı iskelet halinde, "Bir kalem gir" ipucu                                |
| Sadece tek kalem dolu        | Hesap yapılır, "tek kalemle sonuç o kalemin enflasyonudur" notu                   |
| URL'deki sepet bozuk / eksik | Sessizce varsayılana dönülür, üstte kapanabilir bilgi bandı                       |
| Seçilen dönem için veri yok  | Dönem seçicide o aylar devre dışı; en son veri ayı varsayılan                     |
| Negatif / harf girişi        | `inputmode="decimal"`, girişte temizlenir, alan altında hata metni                |
| JavaScript kapalı            | Statik içerik, son resmi rakam ve metodoloji görünür; hesaplayıcı yerine açıklama |

### 2.4 Hazır profiller

Profillerin dağılımları uydurulmaz; TÜİK'in hanehalkı tüketim harcaması verilerinden veya resmi ağırlıklardan türetilir ve kaynakları metodoloji sayfasında belirtilir. Türetme yapılamayan profil MVP'ye alınmaz.

## 3. Mimari ve repo yapısı

Uygulama **statik öncelikli** üretilir: `/` ve tüm içerik sayfaları SSG'dir. Çalışma anında sunucu işi iki tanedir: paylaşım görseli (`/api/og`) ve paylaşılan `/sonuc` linkinin metadata'sı (query'deki yüzdeleri okuduğu için dinamik render edilir, Bölüm 8.1). İkisi de TL tutarı görmez. Veri build sırasında JSON olarak gömülür, hesap tarayıcıda `enflasyon-core` ile yapılır. Veritabanı, kullanıcı oturumu ve runtime secret yoktur.

```
[Aylık GitHub Action] → veri çek → Zod ile doğrula → data/*.json → PR
                                                        ↓ (merge)
[Vercel build] → Next.js SSG → statik HTML/JS + gömülü veri → CDN
                                                        ↓
[Tarayıcı] → sepet (URL query + #fragment) → enflasyon-core → sonuç + grafikler
[Paylaşım linki] → /api/og (Edge) → query'den yüzde dağılımını oku → PNG
```

### 3.1 Teknoloji seçimleri

| Katman          | Seçim                                                                | Gerekçe                                                     |
| --------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework       | Next.js (App Router), TypeScript strict                              | SSG + RSC ile minimum client JS; OG image desteği yerleşik  |
| Hesap           | `enflasyon-core` (`workspace:^`, aynı monorepo'daki `packages/core`) | Kendi paketin; dogfooding. Yayınlanan sürümle aynı kod      |
| Stil            | Tailwind CSS v4 + CSS değişkenleri (design token)                    | Tema, dark mode, küçük CSS çıktısı                          |
| UI primitifleri | Radix UI (sadece Slider, Tabs, Dialog, Tooltip)                      | Erişilebilirlik hazır gelir; görünüm tamamen senin          |
| Grafik          | Kendi SVG bileşenleri + `d3-scale`, `d3-shape`, `d3-array`           | Hazır kütüphaneye göre çok küçük, tam kontrol, erişilebilir |
| Animasyon       | CSS + View Transitions API; gerekiyorsa `motion` (lazy)              | `prefers-reduced-motion` desteği                            |
| Doğrulama       | Zod (sadece build/pipeline tarafı)                                   | Client bundle'a girmez                                      |
| İçerik          | MDX (metodoloji sayfası)                                             | Formüller ve açıklama tek yerde                             |
| Test            | Vitest, Testing Library, Playwright, axe-core                        | Bölüm 9                                                     |
| Deploy          | Vercel (Hobby)                                                       | Statik + Edge OG; preview deploy her PR'da                  |
| Analitik        | Plausible veya Umami (çerezsiz)                                      | KVKK dostu, çerez bandı gerekmez                            |
| Hata takibi     | Sentry (sadece client hataları, PII kapalı)                          | Canlı sorunları görmek                                      |

### 3.2 Klasör yapısı

Uygulama monorepo'nun `apps/web` klasöründe yaşar (repo yapısı: core dokümanı Bölüm 2). Kök dizindeki ESLint, Prettier, lefthook, commitlint ve workflow'lar ortaktır; aşağıdaki ağaç `apps/web` içidir.

```
apps/web/
├── app/
│   ├── layout.tsx              # font, tema, metadata
│   ├── page.tsx                # hesaplayıcı kabuğu (RSC)
│   ├── sonuc/page.tsx
│   ├── nasil-hesapliyoruz/page.mdx
│   ├── enflasyon/[yil]/page.tsx
│   ├── profil/[slug]/page.tsx
│   ├── api/og/route.tsx        # Edge, ImageResponse
│   ├── sitemap.ts · robots.ts · manifest.ts
│   └── not-found.tsx
├── components/
│   ├── calculator/             # BasketForm, BasketRow, ModeToggle, ProfilePicker
│   ├── result/                 # ResultCard, ContributionBars, PeriodTabs, ShareActions
│   ├── charts/                 # LineChart, BarChart, Axis, ChartTable (erişilebilir tablo)
│   └── ui/                     # Button, Slider, Tabs (Radix sarmalayıcıları)
├── lib/
│   ├── basket-url.ts           # URL ⇄ sepet kodlama/çözme
│   ├── use-basket.ts           # useReducer + URL senkronu
│   ├── calc.ts                 # enflasyon-core çağrıları, memo
│   ├── format.ts               # Intl ile TL, yüzde, tarih (tr-TR)
│   └── categories.ts           # grup kimlikleri, Türkçe adlar, ikonlar
├── data/
│   ├── cpi-groups.json         # endeks serileri (pipeline üretir)
│   ├── cpi-weights.json        # resmi grup ağırlıkları, yıla göre
│   ├── profiles.json
│   └── meta.json               # kaynak, son güncelleme, baz yılı
├── scripts/data/
│   ├── fetch.ts · validate.ts · build.ts
│   └── schema.ts               # Zod şemaları
├── tests/  (unit, e2e, a11y)
├── package.json                # "private": true, enflasyon-core: workspace:^
└── …config dosyaları           # next.config.ts, tsconfig.json, playwright.config.ts
```

### 3.3 Server / Client sınırı

- **Server Components (varsayılan):** sayfa kabukları, başlıklar, metodoloji, yıl sayfaları, statik metin. Sıfır JS.
- **Client Components (`"use client"`, sadece gerektiği yerde):** `BasketForm`, `ResultCard`, grafikler, paylaşım butonları. Bunlar tek bir `CalculatorIsland` altında toplanır; client sınırı tek bir yerden geçer.
- Veri JSON'ı server'da import edilip client island'a **sadece gerekli seriler** prop olarak geçer (tüm geçmiş değil, son 6 yıl). Bu, ilk yükte JS + veri boyutunu bütçede tutar (Bölüm 8).

## 4. Veri kaynağı ve pipeline

Birincil kaynak **TCMB EVDS** web servisidir: TÜİK'in yayınladığı TÜFE serilerini makine tarafından okunabilir biçimde sunar. Servis **kişisel bir API anahtarı** ister; anahtar EVDS profil sayfasından alınır ve güncel servis sürümünde URL'de değil **HTTP header**'da gönderilir. ([EVDS kullanım kılavuzu](https://evds2.tcmb.gov.tr/help/videos/EVDS_Web_Service_Usage_Guide.pdf), [evdspy notu](https://pypi.org/project/evdspy/1.1.20)) Bu anahtar (ve veri PR'ını açan GitHub App'in anahtarı, Bölüm 4.1) **sadece GitHub Actions'ta** kullanılır; tarayıcıya, Vercel'e veya repoya asla girmez.

Önemli bağlam: TÜFE'nin baz yılı güncel yayınlarda **2025=100**'dür ([TCMB Tüketici Fiyatları](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Istatistikler/Enflasyon%2BVerileri/Tuketici%2BFiyatlari)). 5 yıllık grafik eski bazlı (2003=100) seriyle birleştirilmek zorundadır; bu, `enflasyon-core`'daki `chainSeries` fonksiyonunun gerçek kullanım yeridir. Baz değişiminde grup sınıflaması da değişmiş olabilir; eski ve yeni gruplar arasındaki eşleme `data/group-mapping.json` dosyasında açıkça tutulur.

### 4.1 Pipeline adımları

1. **`fetch.ts`** — EVDS'den grup endeks serilerini ve genel TÜFE'yi çeker. Anahtar `process.env.EVDS_API_KEY`'den okunur; yoksa script anlamlı bir hatayla durur. Ham yanıt `.cache/` altına yazılır (gitignore'da).
2. **`validate.ts`** — Zod şemasıyla doğrular: her değer pozitif sonlu sayı, aylar ardışık ve boşluksuz, son ay bir önceki veriden yeni veya eşit, aylık değişim ±%30 bandı dışındaysa uyarı (yazım hatası tespiti), grup sayısı beklenenle aynı.
3. **Çapraz kontrol** — Grup endeksleri **o yılın** resmi ağırlıklarıyla `enflasyon-core` üzerinden hesaplanır ve resmi genel TÜFE ile karşılaştırılır. Bu, hem verinin hem paketin aynı anda doğrulanmasıdır. TÜİK ağırlıkları her yıl güncelleyip endeksi Aralık'ta zincirlediği için kontrol iki kademelidir:
   - **Engelleyici (yıl içi):** önceki Aralık → son ay değişimi. Bu dönem tek zincir halkasında kaldığı için sonuç örtüşmelidir; fark ±0,1 puanı aşarsa pipeline durur.
   - **Uyarı (yıllık):** 12 aylık değişim iki zincir halkasına yayıldığı için sabit ağırlıkla küçük fark beklenir. Fark PR açıklamasına yazılır, ±1 puanı aşarsa PR'a uyarı etiketi eklenir ama pipeline durmaz. Böylece yüksek enflasyon dönemindeki doğal sapma aylık güncellemeyi bloke etmez.
   - Bu yüzden `cpi-weights.json` yıla göre tutulur: `{ "2025": {...}, "2026": {...} }`.
4. **`build.ts`** — Normalize edilmiş JSON'ları `data/` altına yazar: anahtarlar sabit sıralı, değerler 2 ondalık, `meta.json`'a kaynak, çekilme zamanı, son veri ayı, baz yılı.
5. **PR açılır** — Workflow doğrudan `main`'e yazmaz; "data: 2026-10 TÜFE" başlıklı bir PR açar. CI (testler + e2e) geçer, sen birleştirirsin, Vercel deploy eder. İstersen bir süre sonra otomatik merge'e geçilir.

**PR `GITHUB_TOKEN` ile açılmaz.** `GITHUB_TOKEN` ile açılan PR'larda `ci.yml` tetiklenmez; branch protection "CI geçmeli" dediği için PR hiç birleştirilemez. Ayrıca bu yol repo ayarında "Actions PR oluşturabilir" iznini açmayı gerektirir. Motor paketindeki gibi (core dokümanı Bölüm 10), sadece bu repoya kurulu minimum yetkili bir **GitHub App**'in kısa ömürlü token'ı kullanılır. Commit'ler `sign-commits: true` ile API üzerinden oluşturulur ve "Verified" olur; böylece "imzalı commit zorunlu" kuralına takılmaz.

### 4.2 Zamanlama

TÜİK enflasyonu her ayın 3'ünde saat 10:00'da açıklar; EVDS'ye yansıması kısa sürer. `data-update.yml` her ayın 3'ü, 4'ü ve 5'inde 11:00 (İstanbul) çalışır; yeni ay yoksa "değişiklik yok" diye çıkar. Ayrıca `workflow_dispatch` ile elle tetiklenebilir.

```yaml
name: data-update
on:
  schedule:
    - cron: "0 8 3-5 * *" # 11:00 Europe/Istanbul
  workflow_dispatch:
permissions: {}
jobs:
  update:
    runs-on: ubuntu-latest
    environment: data # secret'lar sadece bu environment'ta
    permissions:
      contents: read # yazma işi App token'ıyla yapılır
    steps:
      - uses: actions/create-github-app-token@<sha>
        id: app
        with:
          app-id: ${{ vars.DATA_APP_ID }}
          private-key: ${{ secrets.DATA_APP_PRIVATE_KEY }}
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: pnpm/action-setup@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 24 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm data:update
        env:
          EVDS_API_KEY: ${{ secrets.EVDS_API_KEY }}
      - uses: peter-evans/create-pull-request@<sha>
        with:
          token: ${{ steps.app.outputs.token }} # PR'da ci.yml tetiklensin
          sign-commits: true # "Verified" commit
          branch: data/auto-update
          title: "data: monthly CPI update"
          commit-message: "data: add monthly CPI update"
```

### 4.3 Secret güvenliği (EVDS anahtarı)

- Anahtar **GitHub → Settings → Environments → `data`** altında environment secret olarak tutulur, repo secret'ı olarak değil. Environment sadece `main` branch'inden çalışacak şekilde kısıtlanır; böylece bir fork veya PR workflow'u anahtara ulaşamaz.
- `pull_request_target` tetikleyicisi **hiçbir workflow'da kullanılmaz** (fork PR'larına secret sızdırmanın en yaygın yolu).
- Script anahtarı asla loglamaz; hata mesajlarında request header'ı yazdırılmaz. GitHub da secret değerini loglarda otomatik maskeler, ama buna güvenilmez.
- Yerel geliştirmede anahtar `.env.local`'de durur (gitignore'da). Repoda sadece `.env.example` vardır: `EVDS_API_KEY=` (değer boş).
- Yerel geliştirme anahtarsız da çalışır: `data/` zaten commit'li olduğu için uygulama ayağa kalkar; anahtar sadece veriyi güncellemek için gerekir.
- EVDS kullanım koşulları başlamadan okunur; yeniden yayın (türetilmiş veriyi public repoda tutma) izni ve atıf şekli kontrol edilir. Atıf metodoloji sayfasında ve altbilgide yer alır.

### 4.4 Yedek plan

EVDS erişimi kesilir veya koşullar uygun olmazsa: TÜİK'in veri portalından aylık bülten tabloları indirilip `scripts/data/import-csv.ts` ile aynı şemaya dönüştürülür. Uygulama veri kaynağından bağımsızdır; sadece `data/*.json` formatını bilir.

### 4.5 Veri formatı

```json
// data/cpi-groups.json
{
  "base": "2025=100",
  "series": {
    "genel": { "2025-01": 92.31, "2025-02": 94.4 },
    "konut": { "2025-01": 90.12, "2025-02": 93.05 },
    "gida": { "2025-01": 93.7, "2025-02": 95.11 }
  }
}
```

Dosyanın tamamı değil, `series` alanı `enflasyon-core`'un `IndexSet` yapısına uyar (değerler örnek amaçlıdır). JSON import'u TypeScript'te `Period` anahtar tipini taşımadığı için `lib/calc.ts` veriyi `toIndexSet(data.series)` ile doğrulayıp tipler; `as` ile tip zorlanmaz. Bu çağrı build sırasında server tarafında yapılır, client'a hazır veri gider.

## 5. State, URL şeması ve hesaplama entegrasyonu

Tek doğruluk kaynağı **URL**'dir. Sepet, mod ve dönem URL parametrelerinde durur; React state'i URL'in bir yansımasıdır. Global state kütüphanesi kullanılmaz. Sonuç linki paylaşıldığında karşı taraf aynı hesabı görür, sayfa yenilenince hiçbir şey kaybolmaz, geri tuşu beklendiği gibi çalışır.

### 5.1 URL şeması

```
/sonuc?v=1&d=y&at=2026-09&w=konut.595~gida.286~ulastirma.119#m=tl&s=konut.25000~gida.12000~ulastirma.5000
```

URL iki parçadan oluşur. **Query** (`?…`) sunucuya gider ve sadece oranları içerir; **fragment** (`#…`) tarayıcıda kalır ve TL tutarlarını içerir.

| Parametre | Yer      | Anlam             | Değerler                                                                                                                                   |
| --------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `v`       | query    | Şema sürümü       | `1` (ileride format değişirse eski linkler bozulmasın diye)                                                                                |
| `d`       | query    | Dönem tipi        | `y` yıllık, `m` aylık, `ytd` yılbaşından beri, `r` aralık                                                                                  |
| `at`      | query    | Hedef ay          | `YYYY-MM`. Paylaşım linkinde **her zaman açıkça yazılır** (OG cache'i buna dayanır, Bölüm 7.1); elle yazılmış linkte yoksa en son veri ayı |
| `from`    | query    | Aralık başlangıcı | sadece `d=r` iken                                                                                                                          |
| `w`       | query    | Yüzde dağılımı    | `kalem.binde` çiftleri, `~` ile ayrılmış; tam sayı binde (595 = %59,5), sıfır kalemler yazılmaz                                            |
| `p`       | query    | Profil            | opsiyonel; `w` veya `s` varsa yok sayılır                                                                                                  |
| `m`       | fragment | Giriş modu        | `tl` / `pct` (arayüzde hangi modun açılacağı)                                                                                              |
| `s`       | fragment | TL tutarları      | `kalem.tutar` çiftleri, tam sayı TL; sıfır kalemler yazılmaz                                                                               |

Değerler **sadece tam sayıdır**; böylece `kalem.değer` ayrımındaki `.` hiçbir zaman belirsiz olmaz (ondalık TL veya yüzde URL'e yazılmaz, binde kullanılır). Kısa ve okunabilir olması için JSON veya base64 kullanılmaz; böylece link WhatsApp'ta da makul görünür. Kalem anahtarları `lib/categories.ts`'deki sabit listeden gelir; listede olmayan anahtar sessizce atılır.

Hesap tutarla da bindeyle de aynı sonucu verir (sepeti ölçeklemek π'yi değiştirmez; binde yuvarlamasının etkisi gösterilen 1 ondalığın altındadır). Bu yüzden fragment'siz açılan bir link de aynı sonucu gösterir, sadece TL alanları boş, yüzde modunda açılır.

**Gizlilik notu:** Sepet tutarları kişisel finansal bilgi sayılabilir. Bu yüzden:

- TL tutarları **sadece fragment'te** durur; fragment HTTP isteğine girmez, Vercel loglarına, OG isteğine ve sosyal medya crawler'larına ulaşmaz.
- Query'deki yüzde dağılımı sunucuya gider (dinamik metadata ve OG için); bu, gelir veya harcama tutarını açığa çıkarmaz.
- Analitik aracına **sadece path** gönderilir, query ve fragment asla (Plausible/Umami ayarında açıkça kapatılır).
- Sentry'de URL'ler query ve fragment'siz kaydedilir (`beforeSend` ile temizlenir).
- Paylaşım butonunun yanında küçük bir not: "Link, girdiğin tutarları içerir (sadece linki açan görür)." Kullanıcıya **"yüzde olarak paylaş"** seçeneği sunulur; bu seçenek fragment'i linkten tamamen çıkarır.

### 5.2 Kodlama / çözme

`lib/basket-url.ts` iki saf fonksiyondan oluşur: `encodeBasket(state) → { query: URLSearchParams; hash: URLSearchParams }` ve `decodeBasket(query, hash) → state | null`. Çözme defansiftir: bilinmeyen parametreler atılır, sayılar tam sayı olmalı ve sınırlanır (0 ≤ tutar ≤ 10.000.000; 0 ≤ binde ≤ 1000), en fazla 30 kalem okunur, toplam URL uzunluğu 2.000 karakteri aşarsa varsayılana dönülür. Bu fonksiyonlar round-trip property testine tabidir: `decode(encode(x)) == x`.

### 5.3 Senkronizasyon

- `useBasket()` hook'u `useReducer` ile çalışır. İlk değer `useSearchParams` ile query'den okunur (yüzde dağılımı); fragment (`window.location.hash`) sunucuda görünmediği için hidrasyondan sonra bir effect içinde okunup TL tutarları state'e eklenir. Sonuç aynı kaldığı için bu geçiş görsel bir sıçrama yaratmaz. Her değişiklik `window.history.replaceState` ile hem query'e hem fragment'e yazılır. `router.push/replace` kullanılmaz, çünkü Next.js'te gereksiz RSC isteği tetikler; `replace` mantığı ise history'nin her tuşta şişmesini önler.
- Kaydırıcı sürüklenirken URL'e yazma `requestAnimationFrame` ile sınırlanır; hesap ise her karede yapılır (çok ucuz).
- Sonuç bileşenleri `useMemo` ile `enflasyon-core` çağrısının sonucunu kullanır; bağımlılık sadece sepet + dönem + veri.

### 5.4 Hata eşlemesi

`enflasyon-core`'dan gelen `EnflasyonError.code` değerleri `lib/errors.ts`'de Türkçe kullanıcı mesajlarına eşlenir (örn. `EMPTY_BASKET` → "En az bir harcama kalemi gir."). Web her zaman `amount` modu kullandığı için `SHARES_NOT_ONE` normal akışta oluşmaz; oluşursa bu bir hata (bug) sayılır ve Sentry'ye gider.

**Hesap seçenekleri:** Tüm çağrılar `weightsAt: "to"` ile yapılır, çünkü kullanıcı bugünkü harcamasını girer (core dokümanı Bölüm 4). Katkı dökümünde `share` `null` ise (π = 0) veya katkılar zıt işaretliyse "enflasyonunun %X'i konuttan" cümlesi gösterilmez; sadece puan katkısı yazılır. Beklenmeyen bir hata gelirse sonuç kartı "Bu hesap yapılamadı" durumuna geçer ve hata Sentry'ye (sepet verisi olmadan) gönderilir.

### 5.5 Biçimlendirme

Tüm sayılar `Intl.NumberFormat("tr-TR")` ile gösterilir: `%48,1`, `29.624 ₺`. Yüzde puan farkı "puan" kelimesiyle yazılır, "%" ile değil ("16,3 puan yüksek"). Tarihler "Eylül 2026" biçiminde. Formatlama fonksiyonları tek dosyada ve unit testli.

## 6. Grafikler ve erişilebilirlik

Grafikler hazır bir kütüphaneyle değil, React + SVG ile elle yazılır; hesap tarafında sadece `d3-scale`, `d3-shape` ve `d3-array` kullanılır (DOM'a dokunmayan, tree-shake edilebilen modüller). Hedef: tüm grafik kodu < 15 KB gzip. Bu, case study'nin ana konusu olacak karar: "neden Recharts/Chart.js değil" sorusunun cevabı ölçülmüş bundle farkıyla birlikte yazılır.

### 6.1 Grafik envanteri

| Grafik       | Tür                               | Ne gösterir                                  |
| ------------ | --------------------------------- | -------------------------------------------- |
| Katkı dökümü | Yatay çubuk, büyükten küçüğe      | Her kalemin kişisel enflasyona puan katkısı  |
| Sen vs resmi | İki çubuk veya büyük rakam + fark | Tek bakışta karşılaştırma                    |
| Zaman serisi | Çizgi, iki seri (sen, resmi)      | Son 5 yılda aylık bazda yıllık enflasyon     |
| Maaş erimesi | Çizgi + alan (reel değer)         | Zam tarihinden bugüne maaşın satın alma gücü |

### 6.2 Bileşen yapısı

- `<ChartFrame>`: `ResizeObserver` ile genişliği ölçer, `viewBox` ile ölçeklenir; SSR'da sabit genişlikle render edilip hidrasyonda ayarlanır (layout shift yok, CLS = 0).
- `<Axis>`, `<Gridlines>`, `<Line>`, `<Bars>`, `<Tooltip>`: küçük, birleştirilebilir parçalar.
- Renkler CSS değişkenlerinden gelir; dark mode'da otomatik değişir. "Sen" ve "resmi" serileri renk + çizgi stili (düz / kesikli) + doğrudan etiketle ayrılır; renk tek ayırt edici değildir.

### 6.3 Grafik erişilebilirliği

- Her `<svg>`: `role="img"`, `aria-labelledby` ile başlık ve tek cümlelik özet ("Senin enflasyonun son 12 ayda %41'den %48'e çıktı; resmi rakam %32 civarında kaldı."). Özet, veriden otomatik üretilir.
- Her grafiğin altında **"Tablo olarak göster"** düğmesi; aynı veriyi gerçek bir `<table>` ile sunar (ekran okuyucu ve kopyalama için).
- Tooltip'ler klavyeyle de çalışır: grafik odaklanabilir, ok tuşlarıyla noktalar arasında gezilir, değer `aria-live="polite"` bölgesinde okunur.
- Kontrast: metin 4.5:1, grafik çizgileri ve çubuklar arka plana karşı en az 3:1 (WCAG 1.4.11).

### 6.4 Uygulama geneli erişilebilirlik (WCAG 2.2 AA)

- Tüm form alanlarının görünür `<label>`'ı var; kaydırıcı ve sayı alanı aynı değeri kontrol eder, ikisi de etiketli.
- Radix Slider: ok tuşları 1 birim, PageUp/PageDown 10 birim, Home/End uçlar.
- Odak halkası her zaman görünür (`:focus-visible`), en az 2 px, yüksek kontrast.
- Dokunma hedefleri en az 44×44 px.
- Sonuç değişince ekran okuyucuya duyurulur: `aria-live="polite"` bölgesinde "Kişisel enflasyonun %48,1" (kaydırıcı sürüklenirken değil, bırakıldığında).
- Sayfa yapısı: tek `<h1>`, mantıklı başlık hiyerarşisi, `<main>`, `<nav>`, "İçeriğe atla" linki.
- `prefers-reduced-motion`: tüm geçişler ve sayı animasyonları kapanır.
- `lang="tr"`; sayılar ekran okuyucuda doğru okunsun diye görünen metinle aynı formatta.
- 200% yakınlaştırmada ve 320 px genişlikte yatay kaydırma olmadan çalışır.

Manuel test listesi (her sürümden önce): VoiceOver (iOS Safari), TalkBack (Android Chrome), NVDA (Windows Firefox), sadece klavye ile tam akış.

## 7. Paylaşım kartı ve SEO

### 7.1 Dinamik önizleme görseli (`/api/og`)

Paylaşılan `/sonuc?…` linki WhatsApp, X veya LinkedIn'de açıldığında kişinin kendi sonucunu gösteren 1200×630 bir görsel üretilir. `app/sonuc/page.tsx` içinde `generateMetadata`, `og:image` olarak `/api/og?<aynı parametreler>` döndürür.

- Route handler Edge runtime'da çalışır, `next/og`'un `ImageResponse`'u kullanılır. Girdi olarak sadece query'yi (yüzde dağılımı) görür; TL tutarları fragment'te olduğu için OG isteğine hiç ulaşmaz.
- **Hesap sunucuda da `enflasyon-core` ile yapılır** — aynı paket, iki ortam. Bu, paketin "her yerde çalışır" iddiasının canlı kanıtıdır.
- Girdi, client'takiyle aynı `decodeBasket` fonksiyonuyla ve aynı sınırlarla doğrulanır; geçersizse genel bir "Kendi enflasyonunu hesapla" görseli döner.
- Görselde **TL tutarları yer almaz**, sadece oranlar: "Benim enflasyonum %48,1 · Resmi %31,8" ve en büyük katkı yapan kalem.
- Font dosyası (Türkçe karakter destekli) build'de bundle'a eklenir; çalışma anında dış istek atılmaz.
- `at` parametresi içeren isteklerde `Cache-Control: public, max-age=31536000, immutable` (aynı parametre her zaman aynı görsel). `generateMetadata` OG URL'ine `at`'ı her zaman açıkça yazar. `at` olmayan istekler (elle yazılmış link) "en son ay"a göre değiştiği için kısa cache alır: `max-age=3600`.
- Kötüye kullanıma karşı: parametre sayısı ve uzunluğu sınırlı, metin alanı yok (kullanıcının yazdığı serbest metin görsele hiç basılmaz), böylece görsel üzerinden içerik enjeksiyonu yapılamaz.

### 7.2 Story kartı (indirme)

1080×1920 dikey kart, OG görseliyle aynı Edge route'unda **sunucuda** üretilir: tarayıcı `/api/og?format=story&…` adresinden PNG'yi `fetch` ile alır, `Blob`'a çevirir ve `Web Share API` (dosya paylaşımı destekleniyorsa) veya indirme linki ile sunar. İstek sadece yüzde dağılımını taşır, TL tutarlarını değil. Ayrı bir canvas kodu yazılmaz; tek şablon, iki boyut.

### 7.3 SEO

- **Statik, anlamlı sayfalar:** `/enflasyon/2025`, `/enflasyon/2026` gibi yıl sayfaları (aylık resmi rakamlar, grup bazında artışlar, kısa yorumsuz özet) ve `/profil/kiraci-aile` gibi profil sayfaları. Bunlar "2026 kira enflasyonu", "öğrenci enflasyonu" gibi aramalara cevap verir ve hesaplayıcıya yönlendirir.
- Her sayfada benzersiz `title` ve `description`, `canonical` URL. `/sonuc?…` sayfaları `noindex` (sonsuz kombinasyon, kopya içerik), ama `follow`.
- `sitemap.ts` sadece statik sayfaları listeler; `robots.ts` `/api/` yolunu engeller.
- Yapılandırılmış veri: ana sayfada `WebApplication`, metodoloji sayfasında `Article`, yıl sayfalarında `Dataset` (JSON-LD).
- Core Web Vitals (Bölüm 8) SEO'nun da parçasıdır.
- İçerik tonu tarafsız: resmi veriyi gösterir, "resmi rakam yanlış" iddiası yapmaz; fark, ağırlık farkı olarak açıklanır. Bu hem güvenilirlik hem hukuki açıdan önemlidir.

## 8. Performans bütçeleri

Bütçeler CI'da zorunludur; aşılırsa PR birleştirilemez. Ölçümler mobil profilde (Moto G Power sınıfı, yavaş 4G) yapılır.

**JS bütçesi neden iki parçalı:** App Router'da React + Next.js runtime tek başına yaklaşık 90–100 KB gzip tutar ve bu kısım uygulama kodundan bağımsızdır. Toplam için 90 KB gibi sabit bir sınır, ilk PR'dan itibaren aşılır. Bu yüzden taban (framework) adım 2'de boş bir sayfayla ölçülür ve kayda geçer; bütçe, uygulamanın kendi eklediği kod üzerinden konur. Framework sürüm yükseltmesinde taban yeniden ölçülür. Toplam ilk yük JS ölçülen değerin çok üstünde çıkarsa (ör. taban > 110 KB), island'ı Preact ile derlemek veya hesaplayıcıyı daha hafif bir framework'e (Astro + island) taşımak değerlendirilir; bu karar case study'de ölçümlerle anlatılır.

| Metrik                          | Bütçe               | Nasıl korunur                                                           |
| ------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| LCP                             | < 1,5 s             | Hero metni sunucuda render, font `preload`, görsel yok                  |
| INP                             | < 100 ms            | Hesap < 1 ms, uzun görev yok, kaydırıcıda rAF                           |
| CLS                             | 0                   | Grafikler sabit en-boy oranıyla SSR, font `size-adjust`                 |
| TTFB                            | < 200 ms            | CDN'den statik                                                          |
| Framework taban JS (gzip)       | Ölçülür, bütçe dışı | React + Next.js runtime; adım 2'de boş sayfayla ölçülüp referans alınır |
| Uygulama JS (gzip, taban hariç) | < 50 KB             | `size-limit` + `@next/bundle-analyzer`; island + analitik               |
| İlk yük JS (gzip, toplam)       | Taban + 50 KB       | Taban ölçüldükten sonra sabit sayıya çevrilir                           |
| Hesaplayıcı island JS           | < 35 KB             | Grafik kodu dahil                                                       |
| Gömülü veri                     | < 20 KB             | Son 6 yıl, 2 ondalık; uzun geçmiş istenirse lazy                        |
| Lighthouse (4 kategori)         | 100                 | Lighthouse CI, 3 çalışmanın medyanı                                     |

### 8.1 Teknikler

- **Fontlar:** `next/font` ile tek değişken font, Latin + Latin Extended (Türkçe karakterler) alt kümesi, `display: swap`, fallback metrik eşlemesi.
- **Lazy loading:** Detay bölümü (zaman serisi, maaş hesabı) görünüm alanına yaklaşınca yüklenir (`next/dynamic` + `IntersectionObserver`). Paylaşım ve Sentry kodu da ilk etkileşimde yüklenir.
- **Render maliyeti:** Grafik bileşenleri `memo`; ölçekler `useMemo`; katkı listesi 13 öğe olduğu için sanallaştırma gerekmez.
- **Dinamik rota bilinci:** `/sonuc` sayfası `generateMetadata` içinde query okuduğu için dinamik render edilir. Bu sayfanın HTML'i hafif tutulur (aynı kabuk), CDN'de kısa süreli cache'lenir. Ana sayfa `/` tamamen statik kalır; arama ve doğrudan trafik oraya gelir. Statik sayfalarda `useSearchParams` kullanan island bir `<Suspense>` sınırı içine konur; aksi halde Next.js sayfayı client-side render'a düşürür.
- **CSP statikliği bozmaz:** nonce yerine hash kullanıldığı için güvenlik başlıkları SSG'yi etkilemez (Bölüm 10.2).
- **Üçüncü taraf scriptler:** Sadece analitik (< 2 KB, `defer`). Sosyal medya widget'ı, embed, tag manager yok.

### 8.2 Gerçek kullanıcı ölçümü

`web-vitals` kütüphanesiyle LCP/INP/CLS değerleri analitik aracına özel olay olarak gönderilir (sadece metrik değeri, kişisel veri yok). README'de ve case study'de "laboratuvar skoru" ile birlikte "gerçek kullanıcı p75 değerleri" gösterilir; teknik ekiplerin asıl baktığı veri budur.

## 9. Test ve kalite kapıları

| Katman           | Araç                                          | Kapsam                                                                                                                            |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Unit             | Vitest                                        | `basket-url` (round-trip property testi dahil), `format`, `errors`, profil verisi doğrulama, veri pipeline'ı (fixture ile, ağsız) |
| Bileşen          | Vitest + Testing Library                      | Sepet formu: yazma, mod değiştirme, toplam uyarısı, normalize butonu; sonuç kartı durumları                                       |
| E2E              | Playwright (Chromium, WebKit, mobil viewport) | Tam akış; paylaşım linkini açınca aynı sonuç; geri tuşu; JS kapalı sayfa                                                          |
| Erişilebilirlik  | `@axe-core/playwright`                        | Her rota ve her ana durumda 0 ihlal                                                                                               |
| Görsel regresyon | Playwright screenshot                         | Sonuç kartı ve grafikler, açık/koyu tema                                                                                          |
| Performans       | Lighthouse CI                                 | Bölüm 8 bütçeleri                                                                                                                 |
| Veri             | Pipeline doğrulaması                          | Zod şeması + çapraz kontrol (Bölüm 4)                                                                                             |
| Güvenlik         | gitleaks, CodeQL, `pnpm audit`                | Secret ve bilinen açık                                                                                                            |

### 9.1 CI akışı (`ci.yml`)

Monorepo'daki ortak `ci.yml`'nin `web` job'u; `apps/web` veya `packages/core` değiştiğinde çalışır (core dokümanı Bölüm 10).

1. Install (`--frozen-lockfile`) → `packages/core` build (web onu `workspace:^` ile kullanır) → `pnpm --filter web` lint → typecheck → unit + bileşen testleri
2. `next build` → bundle bütçesi kontrolü
3. Vercel preview deploy (Vercel GitHub entegrasyonu; ayrı token gerekmez) → Playwright + axe + Lighthouse CI preview URL'ine karşı çalışır
4. gitleaks

Kural: tüm adımlar yeşil olmadan `main`'e birleştirme yok. Testler kapsam yüzdesi için değil, davranış için yazılır; yine de `lib/` için %90 eşiği konur.

### 9.2 Kod kalitesi

- TypeScript strict + `noUncheckedIndexedAccess`; `any` ESLint ile yasak.
- ESLint: `next/core-web-vitals`, `typescript-eslint` strict-type-checked, `jsx-a11y` strict.
- Prettier + Tailwind sınıf sıralama eklentisi.
- Bileşen başına bir dosya, isimli export, props tipleri dosyanın başında.
- Storybook yerine her UI durumu için `/dev/` altında yalnızca development'ta açılan bir önizleme sayfası (üretimde 404); hafif ve ek bağımlılıksız.

## 10. Güvenlik ve gizlilik (public repo)

Uygulamanın çalışma anında **hiçbir secret'ı yoktur**. Secret'lar (EVDS anahtarı ve veri PR'ı için GitHub App anahtarı) sadece veri güncelleme workflow'unda yaşar (Bölüm 4.1, 4.3). Kullanıcı verisi toplanmaz ve saklanmaz; TL tutarları sunucuya hiç gönderilmez (fragment'te kalır). Paylaşılan linklerdeki yüzde dağılımı OG/metadata için sunucuya ulaşır ve Vercel'in standart istek loglarında görünebilir; bu `/gizlilik` sayfasında açıkça yazılır.

### 10.1 Ortam değişkenleri kuralı

| Değişken                       | Nerede                                                 | Gizli mi | Not                                                                                  |
| ------------------------------ | ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------ |
| `EVDS_API_KEY`                 | GitHub Environment `data` secret; yerelde `.env.local` | Evet     | Sadece `scripts/data/` okur                                                          |
| `DATA_APP_PRIVATE_KEY`         | GitHub Environment `data` secret                       | Evet     | Veri PR'ını açan GitHub App; `DATA_APP_ID` aynı environment'ta variable              |
| `NEXT_PUBLIC_SITE_URL`         | Vercel env                                             | Hayır    | Canonical ve OG için                                                                 |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | Vercel env                                             | Hayır    | Plausible/Umami site kimliği                                                         |
| `NEXT_PUBLIC_SENTRY_DSN`       | Vercel env                                             | Hayır    | DSN public olacak şekilde tasarlanmıştır; Sentry'de "allowed domains" ile sınırlanır |
| `SENTRY_AUTH_TOKEN`            | Vercel env (sadece build)                              | Evet     | Source map yükleme; istemezsen hiç eklenmez                                          |

**Kurallar:**

- `NEXT_PUBLIC_` önekli her şey tarayıcıya gider, yani public kabul edilir. Gizli bir değer asla bu önekle tanımlanmaz.
- `lib/env.ts` Zod ile env doğrular ve **server-only** ile client ayrımını tipte zorlar: `import "server-only"` içeren bir modül client bileşene import edilirse build kırılır.
- Repoda sadece `.env.example` bulunur (anahtarlar var, değerler boş). `.env`, `.env.local`, `.env.*.local` gitignore'dadır.
- `next build` sonrası CI'da `.next/static` içinde bilinen secret desenleri aranır (gitleaks `--no-git` ile build çıktısı taranır). Yanlışlıkla client bundle'a sızan bir değer burada yakalanır.

### 10.2 HTTP güvenlik başlıkları

`next.config.ts` → `headers()` ile tüm rotalara:

- `Content-Security-Policy`: `default-src 'self'`; script için **hash tabanlı** politika (aşağıya bakın); `connect-src` sadece analitik ve Sentry alan adları; `img-src 'self' data:`; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` (paylaşım linklerindeki sepet bilgisinin dış sitelere referrer olarak gitmemesi için; dış linklerde ayrıca `rel="noreferrer"`)
- `Permissions-Policy`: kamera, mikrofon, konum vb. hepsi kapalı
- `Cross-Origin-Opener-Policy: same-origin`

**CSP kararı: nonce değil, hash.** Next.js'te middleware ile nonce üretmek, nonce her istekte farklı olduğu için **tüm sayfaları dinamik render'a zorlar**. Bu SSG'yi, CDN'den statik sunumu ve TTFB < 200 ms bütçesini bozar; bu yüzden nonce kullanılmaz. Bunun yerine:

- Next.js'in Subresource Integrity desteği (`experimental.sri`) açılır; build sırasında script'lerin hash'i üretilir ve `script-src 'self' 'strict-dynamic' 'sha256-…'` politikası bu hash'lerle kurulur.
- Next.js'in sayfa içine gömdüğü inline script'lerin hash'leri build sonrası bir script ile toplanıp `headers()`'a yazılır; JSON-LD bloğu da bu listeye girer.
- Adım 2'de (iskelet) bu kurulum doğrulanır: CSP ihlali raporu (`report-to`) development'ta sıfır olmalı. Hash yaklaşımı Next.js sürümüyle uyumsuz çıkarsa geri dönüş planı `'self'` + `'unsafe-inline'` değil, inline script'leri en aza indirip kalanların hash'ini elle tutmaktır.

Hedef: [securityheaders.com](https://securityheaders.com) ve Mozilla Observatory'de A+. Sonuç README'ye rozet olarak eklenir.

### 10.3 Girdi güvenliği

- Tüm URL parametreleri allowlist ile çözülür (Bölüm 5.2); `dangerouslySetInnerHTML` kullanılmaz (ESLint ile yasak; JSON-LD için tek istisna, `JSON.stringify` + `<` kaçışıyla).
- OG route'u serbest metin almaz, sadece sayısal ve listeden seçilen değerler.
- `/api/og` için Vercel'in temel korumalarına ek olarak parametre boyutu sınırlı; aynı parametre cache'ten döner, maliyet saldırısı sınırlı.

### 10.4 Gizlilik (KVKK)

- Çerez kullanılmaz; analitik çerezsiz, bu yüzden çerez bandı gerekmez.
- `/gizlilik` sayfası: hangi verinin işlenmediği (TL tutarları), hangisinin sunucuya ulaştığı (paylaşılan linkteki yüzde dağılımı; istek loglarında Vercel'in saklama süresi kadar kalır), hangi anonim metriklerin toplandığı (sayfa görüntüleme, web vitals), üçüncü taraflar (Vercel, analitik, Sentry) ve iletişim adresi.
- Sentry: `sendDefaultPii: false`, IP saklama kapalı, URL'lerden query temizlenir, session replay kapalı.

### 10.5 Repo ve supply chain

Motor paketindeki kurallar aynen geçerlidir: secret scanning + push protection, branch protection, imzalı commit'ler, SHA'ya pinli action'lar, `permissions: {}` varsayılanı, Dependabot, CodeQL, `pull_request_target` yasağı, fork PR'ları için onay zorunluluğu. Vercel tarafında: **"Preview deployments for fork PRs"** kapalı, Git fork protection açık, production deploy sadece `main`.

## 11. Git kuralları

Core dokümanının 9. bölümündeki kurallar web tarafı için de birebir geçerlidir (aynı repo). Özet:

1. **Kimlik ve imza:** GitHub noreply e-postası, SSH ile imzalı commit'ler ("Verified").
2. **Conventional Commits**, İngilizce mesajlar, rebase merge, `main`'e doğrudan push yok.

### 11.1 Bu repoya özel

- Veri güncelleme PR'ları kendi GitHub App'in (ör. `benim-enflasyonum-bot[bot]`) tarafından açılır; `GITHUB_TOKEN` kullanılmaz, çünkü o token ile açılan PR'da CI çalışmaz (Bölüm 4.1). Repo ayarında "Allow GitHub Actions to create and approve pull requests" kapalı kalır. Bot commit'leri API üzerinden imzalanır. Bu normaldir ve otomasyonu gösterdiği için portföyde artıdır. Bot commit'lerinin mesajı da Conventional Commits kuralına uyar: `data: add 2026-10 CPI`.
- Vercel'in GitHub entegrasyonu PR'lara deploy yorumu bırakır; bu da bir commit veya contributor kaydı oluşturmaz.

## 12. Deploy, gözlem ve yol haritası

### 12.1 Deploy

- **Vercel Hobby**, GitHub entegrasyonuyla: her PR'a preview, `main`'e production. Deploy için repoda hiçbir token tutulmaz.
- Monorepo ayarı: Vercel projesinde **Root Directory** `apps/web`'dir; Vercel pnpm workspace'i tanır ve `packages/core`'u birlikte build eder. "Ignored Build Step" ile sadece `apps/web` veya `packages/core` değiştiğinde deploy yapılır (dokümanda veya CI dosyasında yapılan değişiklik deploy tetiklemez).
- Hobby planı sadece **ticari olmayan** kullanım içindir. Kişisel portföy projesi olarak uygundur; ileride reklam, sponsorluk veya bağış eklenirse Pro plana geçilir ya da Cloudflare Pages gibi bir alternatif değerlendirilir.
- Alan adı: `.com` veya `.com.tr`; DNS'te CAA kaydı ve HTTPS zorunlu. Alt alan adı olarak `ecbakar.com` altında da yayınlanabilir (karar açık).
- Production'da `/dev/` önizleme rotaları devre dışı.

### 12.2 Gözlem

- **Analitik:** Plausible veya Umami; sayfa görüntüleme, "hesap tamamlandı", "paylaşım kartı indirildi", "link kopyalandı" olayları ve web vitals. Kullanıcı sayısı rakamı portföyde buradan gelir.
- **Hata takibi:** Sentry, PII kapalı, örnekleme %100 (düşük trafik), haftalık özet e-postası.
- **Veri tazeliği:** `meta.json`'daki son veri ayı 40 günden eskiyse altbilgide uyarı görünür; ayrıca veri workflow'u başarısız olursa GitHub bildirim gönderir.

### 12.3 Yol haritası

Web uygulaması aynı monorepo'da olduğu için npm yayınını beklemez; motor paketinin çekirdek hesabı (core yol haritası adım 6–8) bittikten sonra başlar. Her adım ayrı branch ve PR;

1. **Hazırlık (elle):** repo, GitHub güvenlik ayarları, Vercel bağlantısı, EVDS hesabı ve anahtarı (`data` environment secret'ı), veri PR'ları için GitHub App (anahtarı da `data` environment'ında), yerel `.env.local`.
2. **İskelet:** `apps/web` içinde Next.js + TS strict + Tailwind + `lib/env.ts` + güvenlik başlıkları + `.env.example`. ESLint/Prettier, lefthook/commitlint/gitleaks kökten devralınır.
3. **CI:** ortak `ci.yml`'ye `web` job'u (lint, typecheck, test, build, bundle bütçesi) ve `ci-ok` toplama job'u.
4. **Veri pipeline'ı:** Zod şemaları, `fetch/validate/build`, çapraz kontrol, ilk `data/*.json` commit'i, `data-update.yml`.
5. **Kategori ve format katmanı:** `categories.ts`, `format.ts`, `basket-url.ts` + property testleri.
6. **Hesaplayıcı UI:** sepet formu, mod, profil seçici, `useBasket`, sonuç kartı (grafiksiz).
7. **Grafik bileşenleri:** `ChartFrame`, katkı çubukları, zaman serisi, erişilebilir tablo.
8. **Detay araçları:** "o zamanki tutar", reel maaş.
9. **Paylaşım:** `/api/og`, story kartı, Web Share, gizlilik notu.
10. **İçerik ve SEO:** metodoloji (MDX), yıl ve profil sayfaları, sitemap, JSON-LD, `/gizlilik`.
11. **Kalite:** Playwright e2e, axe, görsel regresyon, Lighthouse CI; tüm bütçeler yeşil.
12. **Gözlem ve yayın:** analitik, Sentry, alan adı, production deploy. Motor paketi `1.0.0`.
13. **Case study:** ecbakar.com'da yazı: problem, mimari, "grafik kütüphanesini neden yazdım" (ölçümlü), veri pipeline'ı, erişilebilirlik, sonuç metrikleri.

### 12.4 Açık sorular

- Ürün adı ve alan adı
- EVDS kullanım koşullarının türetilmiş veriyi public repoda tutmaya ve yeniden yayına izin verip vermediği (adım 1'de okunacak)
- Yeni baz (2025=100) ile eski baz arasındaki grup eşlemesinin bire bir olup olmadığı ve 5 yıllık grafiğin hangi gruplarda mümkün olduğu (adım 4'te veriye bakılarak netleşecek)
- Hazır profillerin hangi resmi kaynaktan türetileceği
- Analitik: Plausible (ücretli, barındırılan) mı, Umami (ücretsiz, self-host veya cloud) mı
