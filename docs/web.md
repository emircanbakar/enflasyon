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
   - **Uygulama (web Adım 8):** `components/tools/` (`PastAmountTool`, `WageTool`), hesap `lib/tools.ts`'te (`adjustAmount`, `realWageChange`). Başlangıç ayı varsayılan olarak bir yıl öncesidir; bitiş her zaman son veri ayıdır. Sepet doluysa sonuç önce kişisel enflasyonla, ardından resmi enflasyonla verilir; boşsa yalnızca resmi. Ay adlarına Türkçe ek getirilmez ("Eylül'de"/"Mart'ta" ünlü uyumu hatası riskine karşı cümleler eksiz kurulur). "Maaş erimesi" grafiği (Bölüm 6.1) henüz yok; metin sonuçlar ve gereken maaş gösteriliyor.
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

**Şu anki durum (web Adım 6):** tek profil **"Türkiye ortalaması"**dır; TÜİK'in son yılın resmi grup ağırlıklarından türetilir ve 'nereden başlayacağını bilmeyen' kullanıcıya hazır sepet sunar. Öğrenci, kiracı aile gibi profiller TÜİK Hanehalkı Bütçe Araştırması verisi eklendiğinde gelir; o zamana kadar uydurma profil gösterilmez.

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

Uygulamanın tek verisi, TÜİK'in yayınladığı **TÜFE ana harcama grubu endeksleri** (2025=100, COICOP 2018, 13 grup + genel endeks) ve **yıllık resmi grup ağırlıklarıdır**. Pipeline `apps/web/scripts/data/` altındadır, `data/*.json` üretir; uygulama yalnızca bu dosyaları bilir.

**Kaynaklar** (17 Ekim 2026'da doğrulandı):

| Kaynak                     | Rol                                 | Erişim                                                                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TCMB EVDS3** web servisi | Birincil, otomatik (aylık workflow) | `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=…&startDate=gg-aa-yyyy&endDate=…&type=json&frequency=5`; kişisel anahtar HTTP header'ında `key` olarak (URL'de değil). Bir istekte en fazla 1000 gözlem. ([EVDS Web Servis Kılavuzu](https://evds3.tcmb.gov.tr/dokumanlar)) |
| **TÜİK Veri Portalı**      | Yedek ve ilk veri (anlık görüntü)   | `veriportali.tuik.gov.tr` tabloları `TR,DF_TUFE_SDMX_TT01` (endeks) ve `TT08` (ağırlık). Portal tarayıcı dışı istemcileri engeller; veri tarayıcıdan alınıp `data/sources/` altına kaydedilir.                                                                              |

**Seri kodları (EVDS3):** endeksler `TP.TUKFIY2025.GENEL` ve `TP.TUKFIY2025.01`–`.13` (veri grubu `bie_tukfiy2025`), ağırlıklar `TP.TUKFIYAGRLK.01`–`.13` (`bie_tukfiyagrlk`, yıllık). Grup sırası COICOP 2018 sırasıdır ve `lib/categories.ts`'deki `CATEGORY_KEYS` ile birebir aynıdır (`gida` = 01 … `kisisel_bakim` = 13).

**Baz değişimi:** TÜİK yeni (2025=100) bazlı grup endekslerini **2005'e kadar geriye dönük** hesaplayıp yayımlamıştır. Bu yüzden 5 yıllık grafik için eski (2003=100) seriyle zincirleme gerekmez; `chainSeries` ileride başka bir baz değişimi için pakette hazır durur. Geriye dönük değerler 6 ondalıkla, 2026 ve sonrası 2 ondalıkla yayımlanır.

**Kullanım şartları ve atıf:** EVDS şartlarına göre veriler **kaynak gösterilmek koşuluyla** üçüncü kişilerce kullanılabilir ve yayımlanabilir; ürün kullanıcılarına ek ücret olarak yansıtılamaz. Atıf `meta.json`'daki `attribution` alanından altbilgiye ve metodoloji sayfasına basılır ("Kaynak: TÜİK; TCMB EVDS üzerinden.").

### 4.1 Pipeline adımları

`pnpm --filter web data:update [--source evds|tuik-snapshot] [--from 2020-01]`

1. **Kaynak** (`sources.ts`) — EVDS3'ten endeks ve ağırlık serilerini çeker veya TÜİK anlık görüntüsünü okur. EVDS yanıtında tarih `"2026-9"` ya da `"01-09-2026"` olarak gelebilir, seri kolonlarında nokta yerine alt çizgi bulunur; okuyucu ikisini de kabul eder ama sonucu Zod şemasından geçirir. Yanıt biçimi beklenenden farklıysa (ör. `items` yoksa) açık bir hatayla durur, sessizce yanlış veri üretmez. Anahtar yoksa istek atılmaz; HTTP hatalarında anahtar asla mesaja yazılmaz.
2. **Doğrulama** (`schema.ts`, `validate.ts`) — her değer pozitif sayı, 13 grup + genel aynı ve ardışık aylara sahip, son ay mevcut veriden eski değil, ağırlık toplamı 100 ± 0,1. Aylık değişim ±%30 dışındaysa **uyarı** (ör. Eylül 2023'te eğitim %30,3: gerçek okul ücreti artışı).
3. **Çapraz kontrol** (`crosscheck.ts`) — grup endeksleri o yılın resmi ağırlıklarıyla `enflasyon-core` üzerinden toplanır ve resmi genel endeksle karşılaştırılır:
   - **Engelleyici:** son ayın yılbaşından beri değişimi, ±0,1 puan.
   - **Bilgi:** her yılın Aralık ayı (yılbaşından beri) ve son ayın yıllık değişimi; yıllık fark ±1 puanı aşarsa uyarı (yıllık dönem iki zincir halkasına yayılır).
   - **İlk sonuç (Eylül 2026 verisi):** 2021–2025 Aralık ayları ve Eylül 2026'da fark **≤ 0,001 puan**; yıllık (2026 ağırlıklarıyla) −0,145 puan. Bu hem verinin hem paketin aynı anda doğrulanmasıdır.
4. **Üretim** (`build.ts`) — `data/cpi-groups.json`, `data/cpi-weights.json`, `data/meta.json`. Değerler **yayımlandığı gibi** saklanır (yuvarlanmaz: geriye dönük 6 ondalıklı değerleri yuvarlamak çapraz kontrolü 0,001'den 0,005 puana bozar). Anahtarlar sabit sıralıdır; aynı veri bayt düzeyinde aynı dosyayı üretir, veri PR'ındaki fark yalnızca yeni ayı gösterir. Varsayılan pencere 2020-01'den bugüne (5 yıllık yıllık enflasyon grafiği + 12 ay geriye bakış).
5. **Rapor ve PR** — çapraz kontrol tablosu ve uyarılar `.cache/data-report.md`'ye yazılır; workflow bunu PR açıklaması yapar. Hata varsa hiçbir dosya yazılmaz ve komut 1 ile çıkar.

Repodaki veri CI'da her seferinde yeniden doğrulanır (`test/data/pipeline.test.ts`): şemalar, doğrulama, çapraz kontrol ve kaynak anlık görüntüsünden yeniden üretildiğinde bayt düzeyinde aynı olması (veri elle düzenlenemez).

**PR `GITHUB_TOKEN` ile açılmaz.** `GITHUB_TOKEN` ile açılan PR'larda `ci.yml` tetiklenmez. Sadece bu repoya kurulu, minimum yetkili (contents + pull-requests: write) bir **GitHub App**'in kısa ömürlü token'ı kullanılır; commit'ler `sign-commits: true` ile API üzerinden imzalanır.

### 4.2 Zamanlama ve kurulum

`.github/workflows/data-update.yml` her ayın 3'ü, 4'ü ve 5'inde 11:00'de (İstanbul) ve elle (`workflow_dispatch`) çalışır. Kurulum tamamlanana kadar job **atlanır** (repo değişkeni `DATA_APP_CLIENT_ID` boşken), böylece zamanlanmış çalışmalar boşuna hata vermez.

Kurulum (bir kez, elle):

1. EVDS3'e üye ol → Profilim → **API Key Kopyala**.
2. GitHub → Settings → Environments → **`data`** oluştur, "Deployment branches" = yalnızca `main`; secret'lar: `EVDS_API_KEY`, `DATA_APP_PRIVATE_KEY`.
3. Kişisel bir GitHub App oluştur (izinler: Contents read/write, Pull requests read/write; webhook kapalı), yalnızca bu repoya kur, özel anahtar üret.
4. Repo değişkeni (Settings → Variables → Actions, repository): `DATA_APP_CLIENT_ID` = App'in Client ID'si. (Job seviyesindeki `if` environment değişkenlerini göremediği için bu değer repo düzeyindedir; gizli değildir.)
5. Actions → data-update → **Run workflow** ile ilk çalıştırma. İlk EVDS yanıtı biçimi bu çalıştırmada doğrulanır.

### 4.3 Secret güvenliği (EVDS anahtarı)

- Anahtar `data` environment secret'ıdır, repo secret'ı değil; environment yalnızca `main`'den çalışır, fork veya PR workflow'u anahtara ulaşamaz.
- `pull_request_target` hiçbir workflow'da kullanılmaz.
- Script anahtarı loglamaz; hata mesajlarında header yazdırılmaz (testle doğrulanır).
- Yerelde anahtar `.env.local`'de durur (gitignore'da); repoda sadece boş değerli `.env.example` vardır.
- Uygulama anahtarsız çalışır: `data/` commit'lidir, anahtar yalnızca güncelleme içindir. Yerelde anahtarsız güncelleme için `--source tuik-snapshot`.

### 4.4 Yedek plan

EVDS erişimi kesilirse: TÜİK veri portalında iki tablo (`TT01` endeks, `TT08` ağırlık) tarayıcıdan alınıp `data/sources/tuik-tt01.json` ve `tuik-tt08.json` güncellenir, ardından `data:update --source tuik-snapshot` çalıştırılır. Anlık görüntü golden test verisiyle de karşılaştırılarak doğrulanmıştır (56 değerin hepsi tutuyor). Uygulama veri kaynağından bağımsızdır; sadece `data/*.json` biçimini bilir.

### 4.5 Veri formatı

```json
// data/cpi-groups.json (kısaltılmış)
{
  "base": "2025=100",
  "series": {
    "genel": { "2025-12": 110.386963, "2026-09": 137.23 },
    "gida": { "2025-12": 110.008887, "2026-09": 134.04 }
  }
}
```

`cpi-weights.json`: `{ "2026": { "gida": 24.44, … } }` (yıl → grup → %). `meta.json`: kaynak, atıf, baz, ilk/son ay, alınma tarihi. Gömülü verinin tamamı 8,4 KB gzip (bütçe 20 KB).

Dosyanın tamamı değil, `series` alanı `enflasyon-core`'un `IndexSet` yapısına uyar. JSON import'u TypeScript'te `Period` anahtar tipini taşımadığı için uygulama veriyi `toIndexSet(data.series)` ile doğrulayıp tipler; `as` ile tip zorlanmaz.

## 5. State, URL şeması ve hesaplama entegrasyonu

Tek doğruluk kaynağı **URL**'dir. Sepet, mod ve dönem URL parametrelerinde durur; React state'i URL'in bir yansımasıdır. Global state kütüphanesi kullanılmaz. Sonuç linki paylaşıldığında karşı taraf aynı hesabı görür, sayfa yenilenince hiçbir şey kaybolmaz, geri tuşu beklendiği gibi çalışır.

### 5.1 URL şeması

```
/sonuc?v=1&d=y&at=2026-09&w=gida.286~konut.595~ulastirma.119#m=tl&s=gida.12000~konut.25000~ulastirma.5000
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

Kalemler her zaman `lib/categories.ts`'deki sıra ile yazılır (TÜİK tablo sırası); aynı sepet her zaman aynı linki üretir. Yüzde modu fragment'te `m=pct` ile açıkça işaretlenir (hassas değildir); fragment'te mod yoksa `w` varsa yüzde, yoksa varsayılan TL modu açılır. Uygulama: `apps/web/lib/basket-url.ts`, gidiş-dönüş ve rastgele girdi property testleriyle.

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

**Uygulama (web Adım 7):** `components/charts/` altında `ChartFrame` (başlık, veriden üretilen özet, "Tablo olarak göster"), `TimeSeriesChart` ve `ContributionBars`; hesap `lib/series.ts`'te. Ölçülen maliyet: grafikler `d3-scale`/`d3-shape`/`d3-array` dahil uygulama chunk'ına **+11,9 KB gzip** ekler (bütçe 15 KB); uygulama chunk'ı toplam 20,9 KB (island bütçesi 35 KB).

- **Renkler doğrulayıcıyla seçildi**, göz kararı değil: "Sen" açık modda `#c2410c` (site vurgusu), koyu modda `#d95926`; "Resmi" `#2a78d6` / `#3987e5`. Paletin varsayılan turuncusu `#eb6834` kart yüzeyinde 2,98:1 verdiği için (3:1 altı) reddedildi. Seçilen çift iki modda da kontrast ≥ 3:1, CVD ΔE ≥ 26.
- **Kimlik asla yalnızca renkte değil:** lejant (çizgi anahtarı), resmi seri kesikli, uç etiketleri. Seriler sonda 16 px'ten yakınsa uç etiketleri üst üste yığılmaz; lejant ve tooltip devralır.
- **Katkı çubukları:** grup adı çubuğun üstünde kendi satırında (uzun adlar hiçbir genişlikte çubuğa binmez), çubuk 16 px, yalnızca veri ucu 4 px yuvarlak, değer ucunda; negatif katkılar sıfır çizgisinin soluna.
- **Klavye:** zaman serisi `role="slider"`dır; ok tuşları ay, PageUp/PageDown yıl, Home/End uç değiştirir; seçili ay ve değerler `aria-valuetext` ile okunur.
- **Gerçek tarayıcıda bulunan ve düzeltilen sorunlar:** SSR'daki varsayılan 640 px genişlik mobilde düzeni 677 px'e genişletiyordu (yatay kaydırma) → grafik kapları taşmaz, `ResizeObserver` gerçek genişliği ölçer; dar ekranda yıl etiketleri birbirine yapışıyordu → en az 40 px aralıkla seyreltilir; uç etiketi sağda kırpılıyordu → sağ boşluk 100 px. 320 px genişlikte yatay kaydırma yoktur.

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

**Uygulama (web Adım 9):**

- `app/api/og/route.tsx` (görsel), `app/sonuc/page.tsx` (`generateMetadata` ile kişiye özel `og:image`, `noindex, follow`, canonical `/`), `components/result/ShareActions.tsx`; saf mantık `lib/og.ts` ve `lib/share.ts`'te.
- **Runtime:** Edge yerine Node (Next.js varsayılanı). Hesap aynı `enflasyon-core` ile yapılır; ölçülen bir Edge ihtiyacı çıkarsa değiştirilir. Önbellek başlığı Edge'dekiyle aynıdır.
- **Font:** ayrı font dosyası eklenmedi; `next/og` ile paketli gelen Geist, Türkçe karakterlerin tamamını kapsar (ğ, ş, ı, İ, ç, ö, ü; karakter tablosundan doğrulandı). Yalnızca `₺` yoktur, görselde zaten TL tutarı olmadığı için sorun değildir.
- **Gizlilik varsayılandır:** "Linki kopyala" ve "Paylaş" varsayılan olarak yalnızca yüzde dağılımını paylaşır; TL tutarları ancak kullanıcı "TL tutarlarımı da linke ekle"yi işaretlerse fragment'e eklenir (Bölüm 5.1'deki "yüzde olarak paylaş" seçeneğinin tersine çevrilmiş, daha güvenli hali).
- **Allowlist:** `/sonuc` önizleme URL'ine yalnızca `v`, `d`, `at`, `from`, `w` parametrelerini geçirir; `/api/og` 600 karakterden uzun query'yi çözmez, geçersiz girdide genel görsel döner.
- **Story:** aynı route `format=story` ile 1080×1920 üretir; tarayıcı dosya paylaşımını destekliyorsa Web Share ile, desteklemiyorsa indirme olarak sunulur.

### 7.3 SEO

- **Statik, anlamlı sayfalar:** `/enflasyon/2025`, `/enflasyon/2026` gibi yıl sayfaları (aylık resmi rakamlar, grup bazında artışlar, kısa yorumsuz özet) ve `/profil/kiraci-aile` gibi profil sayfaları. Bunlar "2026 kira enflasyonu", "öğrenci enflasyonu" gibi aramalara cevap verir ve hesaplayıcıya yönlendirir.
- Her sayfada benzersiz `title` ve `description`, `canonical` URL. `/sonuc?…` sayfaları `noindex` (sonsuz kombinasyon, kopya içerik), ama `follow`.
- `sitemap.ts` sadece statik sayfaları listeler; `robots.ts` `/api/` yolunu engeller.
- Yapılandırılmış veri: ana sayfada `WebApplication`, metodoloji sayfasında `Article`, yıl sayfalarında `Dataset` (JSON-LD).
- Core Web Vitals (Bölüm 8) SEO'nun da parçasıdır.
- İçerik tonu tarafsız: resmi veriyi gösterir, "resmi rakam yanlış" iddiası yapmaz; fark, ağırlık farkı olarak açıklanır. Bu hem güvenilirlik hem hukuki açıdan önemlidir.

## 8. Performans bütçeleri

Bütçeler CI'da zorunludur; aşılırsa PR birleştirilemez. Ölçümler mobil profilde (Moto G Power sınıfı, yavaş 4G) yapılır.

**Ölçüm (web Adım 6, hesaplayıcı eklendikten sonra; Next.js 16.4, React 19.3):** ana sayfanın ilk yükünde modern tarayıcıya giden JS **~144 KB gzip**: framework (React + Next runtime) ~135 KB, uygulamanın kendi kodu (hesaplayıcı + `enflasyon-core`) **9 KB**. Ayrıca 39 KB'lık `core-js` polyfill chunk'ı `noModule` ile yalnızca eski tarayıcılara gider. Uygulama bütçesi (< 50 KB) ve island bütçesi (< 35 KB) rahatça tutuyor; framework tabanı ise aşağıdaki 110 KB eşiğini aşıyor. Bu yüzden Preact/Astro alternatifi, Lighthouse ve gerçek kullanıcı INP ölçümleri (Adım 11) alındıktan sonra karara bağlanacak.

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
- **CSP statikliği bozmaz:** nonce kullanılmadığı için güvenlik başlıkları SSG'yi etkilemez (Bölüm 10.2).
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
| `DATA_APP_PRIVATE_KEY`         | GitHub Environment `data` secret                       | Evet     | Veri PR'ını açan GitHub App; `DATA_APP_CLIENT_ID` repo variable (gizli değil)        |
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

- `Content-Security-Policy`: `default-src 'self'`; script için `'self' 'unsafe-inline'` + harici chunk'larda SRI (aşağıya bakın); `connect-src` sadece analitik ve Sentry alan adları; `img-src 'self' data:`; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` (paylaşım linklerindeki sepet bilgisinin dış sitelere referrer olarak gitmemesi için; dış linklerde ayrıca `rel="noreferrer"`)
- `Permissions-Policy`: kamera, mikrofon, konum vb. hepsi kapalı
- `Cross-Origin-Opener-Policy: same-origin`

**CSP kararı (web Adım 2'de ölçülerek verildi): nonce yok, satır içi script'lere izin var, harici chunk'larda SRI.**

- **Nonce kullanılmaz:** Next.js'te nonce her istekte değiştiği için tüm sayfaları dinamik render'a zorlar; SSG, CDN'den statik sunum ve TTFB < 200 ms bütçesi bozulur.
- **Hash tabanlı `script-src 'self'` uygulanamadı:** Next.js 16 App Router, statik ana sayfaya bile 3 satır içi script gömer (Turbopack başlatıcısı ve RSC payload'u `self.__next_f.push(...)`). Bunların içeriği sayfaya ve build'e özgüdür; `next.config` başlıkları ise build başında sabitlenir, yani hash'ler başlığa yazılamaz. Dinamik `/sonuc` sayfasında payload her istekte değişeceği için hash hiç mümkün değildir. Next.js dokümanındaki `experimental.sri` yalnızca harici script'lere `integrity` ekler, satır içi olanları kapsamaz.
- **Sonuç:** `script-src 'self' 'unsafe-inline'` (Next.js'in "nonce'suz" önerisi) ve `experimental.sri` ile harici chunk'larda integrity hash'i (ölçüm: 6 harici script'in 5'inde integrity var; Turbopack'in bir chunk'ına Next.js eklemiyor). Diğer tüm direktifler sıkıdır: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `connect-src` yalnızca izinli origin'ler, üretimde `unsafe-eval` yok.
- **XSS'e karşı asıl savunma girdi tarafında:** kullanıcı girdisi HTML'e basılmaz, URL parametreleri allowlist ile çözülür (Bölüm 5.2), `dangerouslySetInnerHTML` ESLint ile yasaktır (Bölüm 10.3).
- **İleride:** Next.js satır içi script'ler için build zamanı hash desteği getirirse veya Trusted Types ile uyumluluk doğrulanırsa politika sıkılaştırılır; karar `apps/web/lib/security-headers.ts` başındaki notta ve testlerde kayıtlıdır.

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
- ~~EVDS kullanım koşulları~~ → yanıtlandı: kaynak gösterilerek yayın serbest (Bölüm 4)
- ~~Baz değişimi ve grup eşlemesi~~ → yanıtlandı: TÜİK yeni bazlı grupları 2005'e kadar geriye hesapladı, zincirleme gerekmez (Bölüm 4)
- Hazır profillerin hangi resmi kaynaktan türetileceği
- Analitik: Plausible (ücretli, barındırılan) mı, Umami (ücretsiz, self-host veya cloud) mı
