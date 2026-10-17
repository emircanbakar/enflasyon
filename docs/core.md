# enflasyon-core — Motor Paketi Teknik Dokümanı

13 Ekim 2026 · Emir

## 1. Amaç ve kapsam

`enflasyon-core`, bir harcama sepetini ve fiyat endeksi serilerini girdi olarak alıp kişisel enflasyonu hesaplayan, sıfır bağımlılıklı, saf TypeScript bir kütüphanedir. Veri içermez; tüm veri çağıran taraftan gelir. Bu sayede TÜİK, İTO veya başka bir ülkenin endeksiyle aynı şekilde çalışır.

**Paket ne yapar:**

- Kullanıcı sepetini (kalem → pay veya TL tutarı) normalize eder ve doğrular
- Endeks serilerinden iki tarih arası değişimi hesaplar (yıllık, aylık, kümülatif, 12 aylık ortalama)
- Ağırlıklı kişisel enflasyonu ve her kalemin katkısını (puan olarak) döndürür
- Eski bir tutarın bugünkü karşılığını ve maaşın reel değişimini hesaplar
- Endeks serilerini birleştirir/zincirler (baz yılı değişimleri)

**Paket ne yapmaz:**

- Ağ isteği atmaz, dosya okumaz, veri çekmez
- TÜİK, TCMB veya herhangi bir kaynağa bağımlı değildir
- UI, grafik, formatlama (TL gösterimi, locale) içermez; sadece sayı ve yapı döndürür
- Global state tutmaz, yan etkisi yoktur

**Tasarım ilkeleri:**

1. **Saf fonksiyonlar.** Aynı girdi her zaman aynı çıktıyı verir. Tarayıcı, Node, Deno, Bun, Edge ve Web Worker'da çalışır.
2. **Sıfır runtime bağımlılık.** `dependencies` alanı boş kalır. Sadece `devDependencies` olur.
3. **Veri dışarıdan.** Endeks verisi her çağrıda parametre olarak gelir. Paket sürümü ile veri güncelliği birbirinden bağımsızdır.
4. **Açık hata modeli.** Geçersiz girdi sessizce yanlış sonuç üretmez; tipli bir hata döner (Bölüm 5).
5. **Tree-shakeable.** Her fonksiyon ayrı export edilir, `sideEffects: false` işaretlenir.
6. **Küçük.** Hedef: minified + gzip toplam < 5 KB. CI'da `size-limit` ile korunur.
7. **Tip öncelikli.** Public API'deki her şeyin TSDoc açıklaması ve örneği vardır.

**Paket adı:** npm'de `enflasyon-core` müsaitse bu, değilse scope'lu `@emircanbakar/enflasyon-core`. İsim, ilk commit'ten önce `npm view <ad>` ile kontrol edilir. Scope'lu isim kişisel marka açısından da tercih edilebilir.

## 2. Repo yapısı ve araç zinciri

Proje tek bir **pnpm workspace monorepo**'sudur: [`github.com/emircanbakar/enflasyon`](https://github.com/emircanbakar/enflasyon). Motor paketi `packages/core` altında yaşar ve npm'e yayınlanır; web uygulaması `apps/web` altındadır ve yayınlanmaz (`"private": true`). Web, paketi `workspace:^` ile kullanır; bu sayede iki taraf aynı PR'da birlikte değişebilir ve test edilebilir.

**Paketin bağımsızlığı nasıl korunur** (ayrı repo yerine kurallarla):

- `packages/core` hiçbir workspace paketini import etmez; ESLint `no-restricted-imports` kuralı ve kendi `tsconfig`'i bunu zorlar.
- Paketin kendi `package.json`, `README.md`, `LICENSE` ve `CHANGELOG.md` dosyaları vardır; npm sayfası monorepo'dan bağımsız okunur.
- Smoke test, paketi `pnpm pack` ile tarball'a çevirip workspace dışındaki geçici bir klasöre kurar ve oradan hem `import` hem `require` ile çalıştırır. Böylece "sadece monorepo içinde çalışıyor" türü hatalar yakalanır.
- Changesets sadece `packages/core`'u sürümler; `apps/web` `ignore` listesindedir.

```
enflasyon/
├── packages/core/            # npm: enflasyon-core
│   ├── src/                  # (aşağıda)
│   ├── test/
│   ├── package.json · tsconfig.json · tsup.config.ts · vitest.config.ts
│   ├── .size-limit.json
│   ├── README.md · LICENSE · CHANGELOG.md
├── apps/web/                 # Next.js uygulaması (web dokümanı)
├── docs/                     # Bu iki teknik doküman
├── .changeset/               # config: apps/web ignore
├── .github/
│   ├── workflows/            # ci.yml, release.yml, data-update.yml, security.yml
│   ├── dependabot.yml
│   └── CODEOWNERS
├── package.json              # private, sadece workspace script'leri
├── pnpm-workspace.yaml       # packages/*, apps/*; minimumReleaseAge, allowBuilds
├── eslint.config.js · .prettierrc · lefthook.yml · commitlint.config.js
├── SECURITY.md
├── LICENSE                   # MIT
└── README.md                 # Proje vitrini: iki parçayı tanıtır, linkler
```

`packages/core` içi:

```
packages/core/
├── src/
│   ├── index.ts              # Sadece public export'lar
│   ├── types.ts              # Tüm public tipler
│   ├── errors.ts             # Hata sınıfı ve kodları
│   ├── basket/
│   │   ├── normalize.ts      # Tutar → pay, toplam = 1
│   │   └── validate.ts
│   ├── series/
│   │   ├── period.ts         # YYYY-MM işlemleri
│   │   ├── lookup.ts         # Dönem değeri bulma
│   │   └── chain.ts          # Seri zincirleme / baz değişimi
│   ├── calc/
│   │   ├── change.ts         # Yıllık, aylık, kümülatif değişim
│   │   ├── personal.ts       # Ağırlıklı kişisel enflasyon + katkılar
│   │   ├── adjust.ts         # Tutarı bugüne taşıma
│   │   └── realWage.ts       # Reel maaş değişimi
│   └── internal/
│       └── math.ts           # Yuvarlama, güvenli toplama
├── test/
│   ├── unit/
│   ├── property/
│   └── golden/               # Elle doğrulanmış sabit örnekler
└── …                         # config dosyaları (yukarıda)
```

| Araç                            | Görev               | Neden                                                                                                                                    |
| ------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm                            | Paket yöneticisi    | Hızlı, katı bağımlılık çözümü, lockfile güvenilir                                                                                        |
| TypeScript 6.0 (strict)         | Dil                 | TS 7 (native) `typescript-eslint` desteği gelene kadar beklenir; `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` açık |
| tsup                            | Build               | ESM + CJS + `.d.ts` tek komutla                                                                                                          |
| Vitest                          | Test                | Hızlı, TS desteği yerleşik, coverage dahili                                                                                              |
| fast-check                      | Property-based test | Rastgele girdiyle matematiksel kuralları doğrular                                                                                        |
| Changesets                      | Sürüm ve CHANGELOG  | Semver kararı PR'da verilir, yayın otomatik                                                                                              |
| size-limit                      | Boyut bütçesi       | 5 KB sınırı aşılırsa CI kırılır                                                                                                          |
| publint + @arethetypeswrong/cli | Paket doğrulama     | `exports` ve tip çözümlemesinin her ortamda doğru olduğunu kontrol eder                                                                  |
| ESLint (flat config) + Prettier | Stil                | `typescript-eslint` strict-type-checked preset                                                                                           |

**package.json kritik alanları:**

```json
{
  "name": "enflasyon-core",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "files": ["dist"],
  "engines": { "node": ">=22" },
  "publishConfig": { "access": "public", "provenance": true },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/emircanbakar/enflasyon.git",
    "directory": "packages/core"
  },
  "dependencies": {}
}
```

`repository.directory` monorepo'da zorunludur: npm provenance doğrulaması, paketin hangi repo ve klasörden üretildiğini bu alanla eşleştirir.

`files: ["dist"]` sadece build çıktısının yayınlanmasını garanti eder. Test, config veya yanlışlıkla oluşmuş bir dosya npm'e gitmez. Yayından önce `pnpm pack --dry-run` ile paket içeriği kontrol edilir.

## 3. Veri modeli ve tipler

Paketin tüm girdisi üç kavramdan oluşur: **dönem** (ay), **endeks serisi** (bir kalemin aylara göre endeks değerleri) ve **sepet** (kullanıcının kalemlere dağılımı). Kalem kimlikleri serbest string'dir; paket TÜİK grup adlarını bilmez.

```ts
/** "2026-09" biçiminde ay. Gün ve saat dilimi yok, bilinçli olarak. */
export type Period = `${number}-${number}`;

/** Bir kalemin aylık endeks değerleri. Örn. { "2025-09": 3012.4, "2025-10": 3080.1 } */
export type IndexSeries = Readonly<Record<Period, number>>;

/** Kalem kimliği → seri. Örn. { konut: {...}, gida: {...}, genel: {...} } */
export type IndexSet = Readonly<Record<string, IndexSeries>>;

/** Kullanıcı sepeti. Değerler TL tutar veya pay olabilir; mod ile belirtilir. */
export interface Basket {
  readonly mode: "amount" | "share";
  readonly items: Readonly<Record<string, number>>;
}

/** Normalize edilmiş sepet: tüm paylar 0..1 arası ve toplamı 1. */
export type Weights = Readonly<Record<string, number>>;

export interface PersonalInflationInput {
  readonly basket: Basket;
  readonly indices: IndexSet;
  readonly from: Period;
  readonly to: Period;
  /** Sepette olup endeksi olmayan kalem için davranış. Varsayılan: "error" */
  readonly onMissing?: "error" | "fallback";
  /** onMissing = "fallback" iken kullanılacak seri anahtarı. Örn. "genel" */
  readonly fallbackKey?: string;
  /** Sepet paylarının hangi döneme ait olduğu. Varsayılan: "from".
   *  "to": kullanıcı bugünkü harcamasını girdi; paylar from dönemine deflate edilir (Bölüm 4). */
  readonly weightsAt?: "from" | "to";
}

export interface Contribution {
  readonly key: string;
  readonly weight: number; // 0..1
  readonly change: number; // kalemin kendi değişimi, oran (0.45 = %45)
  readonly contribution: number; // weight × change, puan olarak oran
  /** Toplam enflasyondaki payı: contribution / rate. |rate| < 1e-12 iken null (Bölüm 4.2).
   *  Katkılar zıt işaretliyse 0..1 dışına çıkabilir. */
  readonly share: number | null;
  readonly usedFallback: boolean;
}

export interface PersonalInflationResult {
  readonly rate: number; // oran: 0.52 = %52
  readonly from: Period;
  readonly to: Period;
  readonly contributions: readonly Contribution[]; // katkıya göre azalan sıralı
}
```

**Kararlar ve gerekçeleri:**

- **Oranlar her zaman ondalık** (0.52), yüzde (52) değil. Formatlama UI'ın işidir. Bu, en sık yapılan hatayı (yüzdeyi iki kez 100'le çarpmak) yapısal olarak engeller.
- **Dönem ay bazlıdır.** `Date` nesnesi kullanılmaz; saat dilimi kaynaklı "ay kayması" hataları imkânsız hale gelir.
- **Tüm girdiler `Readonly`.** Paket hiçbir girdiyi değiştirmez; test ile de doğrulanır (girdi dondurulup fonksiyon çağrılır).
- **Sepet iki modda gelir.** Kullanıcı TL girerse paket paya çevirir. Ağırlık hesabı tek yerde (`normalize`) yapılır. `share` modu bilinçli olarak katıdır (toplam 1 olmalı); kullanıcının serbestçe yüzde girdiği arayüzler, toplamı 100 olmayan yüzdeleri `amount` modunda göndermelidir. Paket bunları göreli tutar olarak normalize eder (web uygulaması böyle yapar).
- **Eksik veri sessizce yutulmaz.** Varsayılan davranış hata fırlatmaktır. `fallback` seçilirse sonuçta `usedFallback: true` işaretlenir; UI bunu kullanıcıya gösterebilir.
- **Endeks değeri baz yılından bağımsızdır.** Hesap hep oran üzerinden yapıldığı için 2003=100 veya 2025=100 serisi aynı sonucu verir, yeter ki iki dönem aynı bazda olsun. Baz değişimi için `chainSeries` vardır (Bölüm 4).

## 4. Hesaplama yöntemi ve matematik

Kişisel enflasyon, sabit ağırlıklı **Laspeyres** yaklaşımıyla hesaplanır: sepet payları `from` dönemine ait harcama dağılımı kabul edilir, sabit tutulur ve her kalemin fiyat değişimi bu paylarla ağırlıklandırılır.

**TÜİK ile farkı:** TÜİK de Laspeyres kullanır ama **zincirleme** biçimde: ağırlıklar her yıl güncellenir ve endeks her Aralık'ta bağlanır. Yıl içindeki bir dönem için (`from` = önceki Aralık) aynı ağırlıklarla paketin sonucu resmi rakamla tutarlı çıkar. İki takvim yılına yayılan dönemlerde (yıllık enflasyon dahil) ise tek sabit ağırlık seti resmi zincirden bir miktar sapar; sapma yüksek enflasyonda büyür. Golden test ve web'deki çapraz kontrol bu yüzden yıl içi dönem üzerinden yapılır (Bölüm 7.3).

**Ağırlıkların dönemi:** Kullanıcı genelde sepetini _bugünkü_ harcamasıyla girer, oysa formül payları `from` dönemine ait sayar. Kısa dönemde (1 yıl) bu fark küçüktür; çok yıllık hesaplarda (5 yıllık grafik) bugünkü sepet geçmişe uygulanmış olur. `PersonalInflationInput`'a opsiyonel `weightsAt?: "from" | "to"` alanı eklenir (varsayılan `"from"`). `"to"` seçilirse paylar önce geriye deflate edilir:

```latex
w_i^{from} = \frac{s_i / (1 + r_i)}{\sum_j s_j / (1 + r_j)}
```

Böylece "bugün bu dağılımla harcıyorum" diyen kullanıcı için başlangıç dönemindeki dağılım tahmin edilir ve Laspeyres formülü tutarlı kalır. Web uygulaması `"to"` kullanır.

### 4.1 Kalem değişimi

Bir kalemin iki dönem arası değişimi:

```latex
r_i = \frac{I_{i,\,to}}{I_{i,\,from}} - 1
```

### 4.2 Kişisel enflasyon

```latex
\pi = \sum_i w_i \cdot r_i \qquad \text{koşul: } \sum_i w_i = 1,\; w_i \ge 0
```

Her kalemin katkısı `w_i × r_i`'dir; toplam enflasyondaki payı `(w_i × r_i) / π` olur. Katkılar toplamı π'ye eşittir; bu bir değişmez kuraldır ve property test ile korunur.

**Pay için özel durumlar:**

- `π ≈ 0` (`|π| < 1e-12`; ör. `from === to` veya artış ve düşüşlerin birbirini götürmesi): `share` **`null`** döner. Eşik gereklidir: %10 artış ile %10 düşüş kağıt üzerinde sıfırlanır ama kayan noktada `110/100 − 1` ve `90/100 − 1` tam simetrik değildir, π `5,5e-17` çıkar ve pay 10¹⁵ mertebesine fırlar. π'nin kendisi yuvarlanmaz (Bölüm 6); 1e-12 yüzde olarak 1e-10'dur. NaN veya Infinity asla dönmez. UI bu durumda pay yerine sadece puan katkısını gösterir.
- Katkılar zıt işaretliyse (bazı kalemler düşmüş): `share` 0..1 dışına çıkabilir (ör. 1,2 veya −0,2). Bu matematiksel olarak doğrudur; paylar toplamı yine 1'dir. UI'da "enflasyonunun %X'i" dili sadece tüm katkılar π ile aynı işaretliyse kullanılır, aksi halde puan katkısı gösterilir.
- Sıralama: `contributions` mutlak katkıya göre azalan, eşitlikte anahtara göre sıralanır (deterministik).

### 4.3 Hazır dönem fonksiyonları

| Fonksiyon         | Tanım                                                     | from / to                                |
| ----------------- | --------------------------------------------------------- | ---------------------------------------- |
| Yıllık            | Aynı ayın bir önceki yıla göre değişimi                   | `to` = seçilen ay, `from` = 12 ay öncesi |
| Aylık             | Bir önceki aya göre değişim                               | `from` = 1 ay öncesi                     |
| Kümülatif         | Kullanıcının seçtiği iki ay arası                         | serbest                                  |
| Yılbaşından beri  | Önceki Aralık'a göre değişim                              | `from` = önceki yılın 12. ayı            |
| 12 aylık ortalama | Son 12 ay endeks ortalaması / önceki 12 ay ortalaması − 1 | 24 ay veri gerekir                       |

**12 aylık ortalamanın sepete uygulanışı.** İki yol farklı sonuç verir; paket **ikincisini** kullanır:

1. ~~Her kalem için ortalamalar oranı alınıp ağırlıklandırılır~~ (Σ w_i · (Ī_i,son / Ī_i,önceki − 1)). Resmi tanımla uyuşmaz.
2. **Önce aylık kişisel endeks kurulur, sonra ortalaması alınır.** Önceki 12 ayın ilk ayı (`at − 23`) baz alınır, her ay t için kişisel endeks `P_t = Σ w_i · I_i,t / I_i,baz` hesaplanır; sonuç `ortalama(P, son 12 ay) / ortalama(P, önceki 12 ay) − 1`'dir. Bu, TÜİK'in genel endeksten 12 aylık ortalama hesaplama biçimiyle aynıdır.

Dönüş tipi diğerleriyle aynıdır (`PersonalInflationResult`); `from` = `at − 23`, `to` = `at` olur ve bu iki alanın "24 aylık veri penceresi" anlamına geldiği TSDoc'ta belirtilir. Katkılar **tam ayrıştırılır**, ölçekleme yapılmaz: kalemin önceki ve son 12 aylık ortalamaları (baza göre) `Bᵢ` ve `Aᵢ`, `B = Σ wᵢ · Bᵢ` olmak üzere `π = Σ wᵢ (Aᵢ − Bᵢ) / B` olur. Buna göre her katkıda `weight = wᵢ · Bᵢ / B` (etkin ağırlık, toplamı 1), `change = Aᵢ / Bᵢ − 1` (kalemin kendi 12 aylık ortalama değişimi) ve `contribution = weight × change` döner; katkılar toplamı tam olarak `rate`'tir. `weightsAt: "to"` ise paylar `at`'ten baz aya deflate edilir (`wᵢ ∝ sᵢ · Iᵢ,base / Iᵢ,at`).

### 4.4 Tutarı bugüne taşıma

```latex
A_{to} = A_{from} \cdot (1 + \pi)
```

Örnek kullanım: "2021'de 20.000 TL'ye yaşadığın hayat bugün kaç TL?" Kişisel sepetle de, genel endeksle de çağrılabilir.

### 4.5 Reel maaş değişimi

```latex
\text{reel} = \frac{W_{to} / W_{from}}{1 + \pi} - 1
```

Sonuç negatifse maaş enflasyona yenilmiştir. Ek çıktı olarak "enflasyonu karşılamak için gereken maaş" de döner: W_from × (1 + π).

### 4.6 Seri zincirleme (baz değişimi)

TÜİK baz yılını değiştirdiğinde eski ve yeni seri ortak bir dönemde örtüşür. Eski seri, örtüşme dönemindeki oranla ölçeklenir:

```latex
k = \frac{I^{yeni}_{t_0}}{I^{eski}_{t_0}} \qquad I^{zincir}_t = k \cdot I^{eski}_t \;\; (t < t_0)
```

`chainSeries(oldSeries, newSeries, overlap)` bu işlemi yapar. Örtüşme dönemi her iki seride yoksa hata fırlatır.

### 4.7 Bilinen sınırlamalar (dokümana yazılacak)

- **Sabit ağırlık sapması.** Çok yıllık dönemlerde insanlar pahalılaşan kalemden kaçar; sabit ağırlık bu ikameyi yakalamaz ve enflasyonu bir miktar yüksek gösterebilir. MVP'de kabul edilir, README'de açıkça belirtilir.
- **Bugünkü sepetin geçmişe uygulanması.** `weightsAt: "to"` paylardaki fiyat etkisini düzeltir, ama kullanıcının yıllar içinde değişen tüketim alışkanlığını (taşınma, araba alma) bilemez. 5 yıllık grafik "bugünkü sepetinle geçmiş" olarak etiketlenir.
- **Resmi zincirleme ile fark.** Paket tek ağırlık seti kullanır, TÜİK her yıl zincirler (Bölüm 4 girişi). Resmi ağırlıklar verildiğinde yıl içi dönemlerde sonuç resmiyle örtüşür, takvim yılını aşan dönemlerde küçük fark beklenir.
- **Alt kalem çözünürlüğü.** Sonuç, veri sağlayıcının yayınladığı kırılım kadar hassastır. Örneğin "kira" ayrı bir seri değilse "konut" grubuyla temsil edilir.
- **Bölgesel fark yok.** Türkiye geneli endeks kullanılır; il bazlı veri ileride eklenebilir, paket buna zaten hazırdır (veri dışarıdan geldiği için).

## 5. Public API

Public yüzey küçük tutulur: aşağıdaki tablodaki 16 fonksiyon, 1 hata sınıfı ve tipler. `src/index.ts` dışında hiçbir şey dışa açılmaz; `internal/` asla export edilmez.

| Fonksiyon            | İmza (özet)                                                                                                  | Döner                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `normalizeBasket`    | `(basket: Basket) => Weights`                                                                                | Toplamı 1 olan paylar                                       |
| `itemChange`         | `(series: IndexSeries, from: Period, to: Period) => number`                                                  | Oran                                                        |
| `personalInflation`  | `(input: PersonalInflationInput) => PersonalInflationResult`                                                 | Oran + katkılar                                             |
| `annual`             | `(input: PeriodInflationInput) => PersonalInflationResult`; `PeriodInflationInput` = `from`/`to` yerine `at` | Yıllık                                                      |
| `monthly`            | aynı, `at` ile                                                                                               | Aylık                                                       |
| `yearToDate`         | aynı, `at` ile                                                                                               | Yılbaşından beri                                            |
| `twelveMonthAverage` | aynı, `at` ile                                                                                               | 12 aylık ortalama                                           |
| `adjustAmount`       | `(amount: number, rate: number) => number`                                                                   | Bugünkü tutar                                               |
| `realWageChange`     | `(input: { wageFrom: number; wageTo: number; rate: number }) => { real: number; requiredWage: number }`      | Reel değişim                                                |
| `chainSeries`        | `(older: IndexSeries, newer: IndexSeries, overlap: Period) => IndexSeries`                                   | Zincirlenmiş seri                                           |
| `isPeriod`           | `(value: unknown) => value is Period`                                                                        | Geçerli `"YYYY-MM"` mı (URL çözme gibi dış girdiler için)   |
| `addMonths`          | `(period: Period, months: number) => Period`                                                                 | Ay eklenmiş/çıkarılmış dönem                                |
| `availablePeriods`   | `(series: IndexSeries) => Period[]`                                                                          | Serideki dönemler, eskiden yeniye                           |
| `roundTo`            | `(value: number, decimals: number) => number`                                                                | Yuvarlanmış sayı (Bölüm 6)                                  |
| `toIndexSet`         | `(data: unknown) => IndexSet`                                                                                | JSON'dan gelen veriyi doğrulayıp tipli `IndexSet`'e çevirir |
| `isEnflasyonError`   | `(e: unknown) => e is EnflasyonError`                                                                        | Type guard                                                  |

`toIndexSet`, JSON import'unun tip sorununu çözer: `import data from "./x.json"` TypeScript'te `Record<string, Record<string, number>>` olarak gelir ve anahtarlar `Period` tipine uymaz. Fonksiyon her dönem anahtarını ve değeri doğrular (`INVALID_PERIOD`, `NON_FINITE`, `NON_POSITIVE_INDEX`, `LIMIT_EXCEEDED`), dönüşü tiplidir; böylece kullanıcı `as` ile tip zorlamak zorunda kalmaz.

**Dönem kuralları** (`src/series/period.ts`): geçerli dönem `1000-01`..`9999-12` arasında, ay her zaman iki hanelidir (`"2026-1"` geçersiz). `Period` tipi biçimi yalnızca kabaca anlatır (`"2026-13"` de tipe uyar); asıl doğrulama çalışma anındadır. `addMonths`'ta ay sayısı tam sayı olmalıdır: `NaN`/`Infinity` → `NON_FINITE`, kesirli değer veya aralık dışına taşma → `INVALID_PERIOD`. `availablePeriods` seri anahtarlarını doğrular (`INVALID_PERIOD`, 1200 ay üstü `LIMIT_EXCEEDED`) ama değerlere bakmaz; değer doğrulaması `toIndexSet`'in işidir. `comparePeriods`, `monthsBetween`, `assertPeriodOrder` iç yardımcıdır, export edilmez.

**Sepet kuralları** (`src/basket/`): `normalizeBasket` önce yapıyı doğrular (bilinmeyen `mode`, düz obje olmayan `items` veya sayı olmayan değer → `INVALID_INPUT`), sonra her kalemi anahtara göre sıralı işler (`INVALID_KEY`, `NON_FINITE`, `NEGATIVE_VALUE`; 500 kalem üstü `LIMIT_EXCEEDED`). Değeri 0 olan kalemler sonuçtan çıkarılır; hiç pozitif kalem yoksa `EMPTY_BASKET`. `amount` modunda değerler önce en büyük değere bölünür, sonra toplama oranlanır; böylece çok büyük tutarlarda toplam taşmaz. Dönen `Weights` dondurulmuş, prototipsiz (`Object.create(null)`) ve anahtarları sıralıdır.

**Yardımcı kuralları:** `adjustAmount` ve `realWageChange` tutarların ≥ 0 (`NEGATIVE_VALUE`), oranın −1'den büyük olmasını ister (fiyatlar sıfıra inemez; aksi halde `INVALID_INPUT`); `realWageChange`'de `wageFrom` 0 olamaz. `roundTo` 0–15 ondalık kabul eder, `Number.MAX_SAFE_INTEGER` üstündeki ölçekli değerleri olduğu gibi döndürür ve `-0` yerine `0` verir. `chainSeries` eski serinin örtüşme ve sonrasındaki aylarını, yeni serinin örtüşme öncesindeki aylarını yok sayar; örtüşme ayı serilerden birinde yoksa `NO_OVERLAP` (ayrıntıda hangi seride olmadığı yazılır), birleşik seri 1200 ayı aşarsa `LIMIT_EXCEEDED` fırlatır. Dönen seri dondurulmuş ve prototipsizdir.

### 5.1 Hata modeli

Tek bir hata sınıfı ve makine tarafından okunabilir kodlar kullanılır. UI, `code` alanına göre Türkçe mesaj üretir; paket mesajları İngilizce ve geliştirici odaklıdır.

```ts
export type EnflasyonErrorCode =
  | "EMPTY_BASKET" // sepet boş veya tüm değerler 0
  | "NEGATIVE_VALUE" // sepette negatif tutar/pay
  | "NON_FINITE" // NaN, Infinity
  | "SHARES_NOT_ONE" // share modunda toplam 1 değil (tolerans 1e-6)
  | "INVALID_PERIOD" // "2026-13", "26-01" vb.
  | "PERIOD_ORDER" // from > to
  | "MISSING_SERIES" // sepetteki kalemin serisi yok
  | "MISSING_PERIOD" // seride ilgili ay yok
  | "NON_POSITIVE_INDEX" // endeks değeri ≤ 0
  | "NO_OVERLAP" // zincirlemede ortak dönem yok
  | "INVALID_KEY" // __proto__, constructor, prototype veya boş anahtar
  | "LIMIT_EXCEEDED" // sepette > 500 kalem veya seride > 1200 ay
  | "INVALID_INPUT"; // bilinmeyen sepet modu, obje olmayan kalemler, sayı olmayan değer

export class EnflasyonError extends Error {
  readonly code: EnflasyonErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
}
```

Fonksiyonlar hata **fırlatır** (Result tipi değil). Gerekçe: hesaplama fonksiyonları için hata nadir ve programlama hatasıdır; ayrıca kütüphane kullanıcısına tanıdık gelir. `isEnflasyonError(e)` type guard'ı da export edilir.

**`instanceof` yerine `isEnflasyonError`:** Paket hem ESM hem CJS olarak yayınlandığı için aynı uygulamada iki kopya yüklenebilir (dual package hazard). Bu durumda bir kopyanın fırlattığı hata, diğer kopyanın `EnflasyonError` sınıfına göre `instanceof` testinden geçmez. `isEnflasyonError` bu yüzden sınıfa bakmaz; `name === "EnflasyonError"` ve `code`'un bilinen bir kod olmasını kontrol eder. README'de `instanceof` yerine bu fonksiyon önerilir.

### 5.2 Kullanım örneği (README'de birebir yer alacak)

```ts
import { annual, adjustAmount, toIndexSet } from "enflasyon-core";
import data from "./tuik-2026-09.json" with { type: "json" }; // veri senin

const result = annual({
  basket: { mode: "amount", items: { konut: 25000, gida: 12000, ulastirma: 5000 } },
  indices: toIndexSet(data), // doğrular ve tipler; `as` gerekmez
  at: "2026-09",
});

result.rate; // 0.4812  → %48,12
result.contributions[0]; // { key: "konut", weight: 0.595, change: 0.62, ... }

adjustAmount(20000, result.rate); // 29624
```

### 5.3 Sürümleme sözleşmesi

- `0.x` sürecinde API değişebilir; `1.0.0` web uygulaması canlıya çıktığında yayınlanır.
- 1.0 sonrası katı semver: public tipte veya fonksiyon imzasında kırıcı değişiklik = major.
- Yeni hata kodu eklemek minor sayılır; README'de belirtilir.

## 6. Sayısal hassasiyet ve yuvarlama

Paket ara hesaplarda **hiç yuvarlama yapmaz**; tam `number` (IEEE 754 double) hassasiyetiyle çalışır ve sonucu ham oran olarak döndürür. Gösterim için yuvarlama UI'ın sorumluluğudur. Bu, kümülatif yuvarlama hatasını tamamen ortadan kaldırır.

**Neden decimal kütüphanesi yok?** Endeks değerleri zaten TÜİK tarafından 2 ondalıkla yayınlanır; oran hesabında double hassasiyeti (yaklaşık 15-16 anlamlı basamak) gereğinden fazladır. Decimal kütüphanesi hem sıfır bağımlılık ilkesini bozar hem de boyutu 5 KB'ın üstüne çıkarır. Bu karar README'de ve case study'de gerekçesiyle anlatılır.

**Alınan önlemler:**

1. **Toplama sırası sabit.** Katkılar anahtara göre sıralı toplanır; aynı girdi farklı obje sırasıyla gelse bile bit düzeyinde aynı sonuç çıkar (property test).
2. **Kahan (compensated) toplama.** `internal/math.ts` içindeki `safeSum`, çok kalemli sepetlerde birikimli hatayı önler.
3. **Pay doğrulamada tolerans.** `share` modunda toplam `|Σ − 1| ≤ 1e-6` ise kabul edilir ve yeniden normalize edilir; aksi halde `SHARES_NOT_ONE`.
4. **TL tutarlar.** `adjustAmount` ve `realWageChange` ham sayı döner. Kuruşa yuvarlama gerekiyorsa paket ayrıca `roundTo(value, decimals)` yardımcısını export eder; bu fonksiyon `Number.EPSILON` düzeltmeli "half away from zero" yuvarlama yapar (1.005 → 1.01).
5. **Geçersiz sayılar girişte durdurulur.** `NaN`, `Infinity`, negatif ve sıfır endeks değerleri hesaplamaya hiç girmez.

**Test kuralı:** Kayan nokta karşılaştırmalarında `toBe` yerine `toBeCloseTo(x, 10)` kullanılır. Golden testlerde beklenen değerler elle (tablo veya hesap makinesiyle) doğrulanmış sabitlerdir.

## 7. Test stratejisi

Hedef: satır ve dal kapsamı **%100** (küçük, saf bir kütüphanede gerçekçi). CI'da kapsam %100'ün altına düşerse build kırılır. Üç katman vardır:

### 7.1 Unit testler (`test/unit`)

Her fonksiyon için mutlu yol, sınır durumları ve her hata kodu en az bir kez test edilir.

- `normalizeBasket`: tek kalem, 0 değerli kalemler, tamamı 0, negatif, `NaN`, share toplamı 0.9999999 ve 0.98
- `itemChange`: değişim yok (0), düşüş (negatif oran), olmayan ay
- `personalInflation`: eksik seri + `onMissing` varyasyonları, `from === to` (sonuç 0)
- Dönem: `"2026-13"`, `"2026-1"`, yıl geçişi (`addMonths("2025-12", 1) === "2026-01"`)
- Girdi değişmezliği: `Object.freeze` ile derin dondurulmuş girdiyle çağrı hata vermemeli

### 7.2 Property-based testler (`test/property`, fast-check)

Rastgele sepet ve seriler üretilir; şu kurallar her seferinde doğru olmalıdır:

| Kural                                                    | Neden önemli                               |
| -------------------------------------------------------- | ------------------------------------------ |
| `min(r_i) ≤ π ≤ max(r_i)`                                | Ağırlıklı ortalama, uçların dışına çıkamaz |
| `Σ contribution === π` (tolerans 1e-12)                  | Katkı dökümü toplamla tutarlı              |
| Tüm kalemler aynı oranla artarsa π o orana eşit          | Ağırlıkların sonucu bozmadığını kanıtlar   |
| Sepeti sabit bir katsayıyla ölçeklemek π'yi değiştirmez  | Tutar modu ile pay modu tutarlı            |
| Obje anahtar sırası değişince sonuç bit düzeyinde aynı   | Deterministik toplama                      |
| `chainSeries` sonrası örtüşme sonrası değişimler korunur | Zincirleme veri bozmaz                     |
| Normalize edilmiş payların toplamı 1, hepsi ≥ 0          | Temel değişmez                             |

### 7.3 Golden testler (`test/golden`)

Gerçek bir aya ait resmi veriyle yapılır. TÜİK'in yayınladığı grup endeksleri ve **o yılın resmi grup ağırlıkları** sepet olarak verilir.

- **Kesin test (yıl içi):** `from` = önceki Aralık, `to` = test ayı. Bu dönem tek bir zincir halkasının içinde kaldığı için paketin sonucu resmi genel endeksin aynı dönemdeki değişimiyle örtüşmelidir. Tolerans ±0,1 puan (sadece 2 ondalıklı yayın yuvarlaması).
- **Bilgi amaçlı test (yıllık):** 12 aylık dönem iki zincir halkasına yayıldığı için fark beklenir. Test kırılmaz; fark raporlanır ve snapshot'ta tutulur, büyük bir sıçrama incelenir.

Ayrıca 3-4 elle hesaplanmış küçük örnek (2-3 kalemli) sabit beklenen değerle test edilir; aralarında `π = 0` (share = null) ve zıt işaretli katkı örneği de vardır.

**İlk sonuçlar (Eylül 2026 verisi, 17 Ekim 2026):** resmi 2026 ağırlıklarıyla paket, yılbaşından beri değişimi Haziran'da %17,761 (resmi %17,755), Eylül'de %24,319 (resmi %24,314) olarak verir; fark 0,005–0,006 puandır ve yalnızca yayımlanan değerlerin yuvarlanmasından gelir. Yıllık değişimde tek ağırlık setiyle fark beklendiği gibi daha büyüktür (2026 ağırlıklarıyla −0,14, 2025 ağırlıklarıyla +0,68 puan). Fixture ayrıca kendini doğrular: her grubun endekslerden hesaplanan değişimi TÜİK'in yayımladığı oranla ±0,02 puan içinde örtüşmezse test kırılır.

Golden veri `test/golden/fixtures/*.json` altında repoya konur. Bu veri kamuya açık resmi istatistiktir; kaynağı ve tarihi dosyanın yanında `SOURCE.md` ile belirtilir.

### 7.4 Paket doğrulama testleri

- `publint` ve `attw --pack` CI'da çalışır: ESM/CJS çözümlemesi ve tipler doğru mu
- `size-limit`: 5 KB gzip bütçesi
- **Smoke test:** build sonrası `dist/` hem `import` hem `require` ile Node'da yüklenip bir hesap yapılır

## 8. Güvenlik (public repo)

Bu paketin **çalışma anında hiçbir secret'a ihtiyacı yoktur**: ağ isteği atmaz, API anahtarı kullanmaz. npm'e yayın bile token olmadan, OIDC ile yapılır. Repodaki tek secret, Version Packages PR'ını açan GitHub App'in özel anahtarıdır (Bölüm 10) ve sadece `npm` environment'ında durur. Dolayısıyla repoda `.env` dosyası hiç olmaz; olması bir hata belirtisidir.

### 8.1 Secret sızıntısını engelleme

- **`.gitignore`** baştan şunları içerir: `.env`, `.env.*` (`!.env.example` hariç), `*.pem`, `*.key`, `coverage/`, `dist/`, `node_modules/`, `.DS_Store`. Repoda `.npmrc` yoktur; kişisel token'lar sadece `~/.npmrc`'de durur ve o dosya zaten repo dışındadır.
- **GitHub Secret scanning + Push protection** repo ayarlarından açılır. Push protection, bilinen formatta bir anahtar içeren push'u sunucu tarafında reddeder.
- **gitleaks** hem pre-commit hook'u (yerel, `lefthook` ile) hem de CI adımı olarak çalışır. Yerel hook atlanırsa CI yakalar.
- **İlk commit'ten önce** `git log` geçmişi temiz olmalı. Bir secret yanlışlıkla commit'lenirse: önce anahtar iptal edilir (rotate), sonra geçmiş temizlenir. Sıra önemli: public repoda bir an bile görünen anahtar ele geçmiş sayılır.

### 8.2 npm yayını: Trusted Publishing (token yok)

npm, GitHub Actions ile OIDC tabanlı **trusted publishing**'i destekler; uzun ömürlü `NPM_TOKEN` gerekmez ve yayın otomatik olarak provenance (paketin hangi repo ve workflow'dan üretildiğinin imzalı kanıtı) içerir. ([npm docs](https://docs.npmjs.com/trusted-publishers), [GitHub changelog](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/))

Kurulum:

1. Paket ilk kez elle yayınlanır (`npm publish` ile `0.0.1`, isim rezervasyonu için) ya da npm'in "pending trusted publisher" akışı kullanılır.
2. npmjs.com → paket ayarları → **Trusted Publisher** → GitHub Actions: kullanıcı `emircanbakar`, repo `enflasyon`, workflow `release.yml`, environment `npm`.
   - **Repo görünürlüğü:** npm provenance sadece **public** repodan yapılan yayınlarda üretilir. Repo şu an private'tır; ilk npm yayınından (adım 11) önce public yapılır. Secret scanning push protection da public repolarda ücretsizdir, bu yüzden public'e geçiş en geç adım 11'de, tercihen ilk kod commit'inden önce yapılır.
3. Aynı sayfadan **"Require two-factor authentication and disallow tokens"** seçilir. Artık paket sadece bu workflow'dan yayınlanabilir; çalınan bir token bile işe yaramaz.
4. Workflow'da `permissions: id-token: write` ve npm CLI ≥ 11.5.1 gerekir.
5. npm hesabında 2FA zorunlu (security key veya authenticator).

### 8.3 Supply chain

- **Sıfır runtime bağımlılık** en büyük korumadır; kullanıcıya hiçbir üçüncü taraf kod gitmez.
- devDependencies için: `pnpm install --frozen-lockfile` CI'da zorunlu; lockfile değişiklikleri PR'da incelenir.
- pnpm ayarları (pnpm 12): `pnpm-workspace.yaml` içinde `minimumReleaseAge: 10080` (dakika; 7 gün. Yeni yayınlanmış, henüz doğrulanmamış sürümleri bekletir; ele geçirilmiş paket saldırılarına karşı) ve `allowBuilds` (kurulumda script çalıştırmasına izin verilen paketler: sadece `esbuild` ve `lefthook`). pnpm bağımlılıkların lifecycle script'lerini varsayılan olarak çalıştırmaz; yeni bir paket script isterse kurulum durur ve `pnpm approve-builds <paket>` ile bilinçli olarak onaylanır.
- **Dependabot**: haftalık, gruplanmış devDependency PR'ları + GitHub Actions sürümleri.
- **GitHub Actions**: tüm üçüncü taraf action'lar **commit SHA'ya pinlenir** (`actions/checkout@<sha> # v4`), tag'e değil. Her workflow en üstte `permissions: {}` veya `contents: read` ile başlar; yetki sadece ihtiyaç olan job'a verilir.
- **CodeQL** (JavaScript/TypeScript) ve **OpenSSF Scorecard** workflow'ları eklenir; Scorecard rozeti README'ye konur.

### 8.4 Repo ayarları (GitHub)

| Ayar                            | Değer                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch protection (`main`)      | PR zorunlu, CI geçmeli, force push kapalı, linear history                                                                                                                                   |
| Signed commits                  | Zorunlu (SSH signing key ile; Bölüm 9.1). Bot commit'leri de imzalı olmalı (Bölüm 10.2)                                                                                                     |
| Merge yöntemi                   | Rebase merge. **Doğrulanacak:** "Require signed commits" açıkken GitHub rebase merge'e izin veriyor mu; izin vermiyorsa merge commit veya squash'a geçilir (adım 3'te test edilir)          |
| Actions → Fork PR'ları          | "Require approval for all outside collaborators"                                                                                                                                            |
| Actions → Workflow permissions  | Varsayılan **read-only**; "Allow GitHub Actions to create and approve pull requests" **kapalı**. Version Packages PR'ı `GITHUB_TOKEN` ile değil, GitHub App token'ı ile açılır (Bölüm 10.2) |
| Environment `npm`               | Sadece `main` branch'inden deploy, isteğe bağlı manuel onay                                                                                                                                 |
| Private vulnerability reporting | Açık; `SECURITY.md` bu kanala yönlendirir                                                                                                                                                   |

### 8.5 Kod düzeyinde

- `eval`, `Function`, dinamik `import` kullanılmaz (ESLint kuralıyla yasak).
- Kullanıcı girdisi olan obje anahtarları `Object.hasOwn` ile okunur; `__proto__` / `constructor` / `prototype` anahtarları normalize aşamasında `INVALID_KEY` ile reddedilir (prototype pollution). Paketin ürettiği objeler `Object.create(null)` ile oluşturulur.
- Çok büyük girdiye karşı limit: sepette en fazla 500 kalem, seride en fazla 1200 ay (100 yıl); aşılırsa `LIMIT_EXCEEDED`.

## 9. Git ve commit kuralları

Tüm commit'ler Emircan Bakar'ın kimliği ve imzasıyla atılır.

### 9.1 Kimlik ve imza

```bash
git config user.name "Emircan Bakar"
git config user.email "<GitHub noreply adresin>"  # @users.noreply.github.com
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
git config commit.gpgsign true
```

GitHub'da **"Keep my email addresses private"** ve **"Block command line pushes that expose my email"** açılır. SSH anahtarı GitHub'a hem authentication hem **signing key** olarak eklenir; commit'ler "Verified" rozeti alır.

### 9.2 Commit mesajı kuralları

- **Conventional Commits:** `feat(calc): add twelveMonthAverage`, `fix(basket): reject __proto__ keys`, `test:`, `docs:`, `chore:`, `ci:`
- Mesajlar İngilizce, emir kipinde, ilk satır ≤ 72 karakter
- Her commit tek mantıksal değişiklik içerir ve kendi başına test'ten geçer
- `commitlint` + `lefthook` ile commit-msg hook'unda doğrulanır
- Branch adları: `feat/…`, `fix/…`, `chore/…`; `main`'e doğrudan push yok, squash değil **rebase merge** (temiz ve okunur geçmiş portföyün parçası)

`--no-verify` kullanılmaz; hook'u atlayan bir commit CI'da (commitlint + gitleaks) yine yakalanır.

## 10. CI/CD ve yayın süreci

Monorepo'daki tüm workflow'lar `.github/workflows/` altında ortaktır: `ci.yml`, `release.yml`, `security.yml` (bu doküman) ve `data-update.yml` (web dokümanı). Hepsi `permissions` en dar haliyle başlar ve action'lar SHA'ya pinlidir.

**`ci.yml`** — her PR ve `main` push'unda. İki job'dan oluşur; `dorny/paths-filter` ile sadece değişen taraf çalışır. `packages/core` değişirse web job'u da çalışır (web paketi kullandığı için).

`core` job'u:

1. Checkout → pnpm + Node 22/24 matrisi (Node 20 Nisan 2026'da destek dışı kaldı)
2. `pnpm install --frozen-lockfile`
3. `pnpm --filter enflasyon-core lint` → `typecheck` → `test --coverage` (kapsam eşiği %100)
4. `build` → `publint` → `attw --pack` → `size-limit` → smoke test (tarball workspace dışına kurulur; ESM + CJS)
5. gitleaks taraması

`web` job'u: web dokümanı Bölüm 9.1.

**Şu anki durum:** `ci.yml` kurulu; `core` job'u Node 22/24 matrisinde lint, format, typecheck, %100 kapsamlı test, build, publint + attw (node10 dahil tüm çözümlemeler yeşil; bunun için `main`/`types` alanları da var), size-limit (min + gzip: tüm API ~3,2 KB, sadece `annual` ~2,1 KB) ve tarball smoke testini (`packages/core/scripts/smoke.mjs`) çalıştırır. `secrets` job'u gitleaks-action ile tüm geçmişi tarar (kişisel hesapta lisans gerekmez). Web job'u ve `dorny/paths-filter` web uygulaması eklenince gelir.

Branch protection, iki job'u da "required" yapmak yerine her zaman çalışan küçük bir `ci-ok` toplama job'unu zorunlu tutar; böylece path filtresiyle atlanan bir job PR'ı kilitlemez.

**`release.yml`** — `main`'e merge sonrası:

1. Changesets action çalışır. Bekleyen changeset varsa "Version Packages" PR'ı açar/günceller (sürüm + CHANGELOG).
2. O PR merge edildiğinde aynı workflow `pnpm build` ve `npm publish` yapar. Kimlik doğrulama OIDC ile; `NODE_AUTH_TOKEN` yoktur.
3. Git tag'i (`v1.2.0`) ve GitHub Release otomatik oluşur.

**Bot PR'ları neden `GITHUB_TOKEN` ile açılmaz:** `GITHUB_TOKEN` ile açılan veya güncellenen PR'larda başka workflow'lar (`ci.yml`) **tetiklenmez**. Branch protection "CI geçmeli" dediği için böyle bir PR hiç birleştirilemez. Ayrıca bu yol, repo ayarında "Actions PR oluşturabilir" iznini açmayı gerektirir. Çözüm: sadece bu repoya kurulu, minimum yetkili (contents + pull-requests: write) kişisel bir **GitHub App**. Workflow her çalışmada `actions/create-github-app-token` ile kısa ömürlü bir token üretir; bu token ile açılan PR'da CI normal çalışır.

- App kimliği `RELEASE_APP_CLIENT_ID` (repo variable; `app-id` girdisi kullanımdan kalktı) ve özel anahtarı `RELEASE_APP_PRIVATE_KEY` (secret) olarak **sadece `npm` environment'ında** tutulur. Bu, paketin tek secret'ıdır ve npm yayınıyla ilgisi yoktur.
- Version Packages commit'lerinin "Verified" olması için Changesets action'da `commitMode: github-api` kullanılır; commit'ler API üzerinden oluşturulduğu için GitHub tarafından imzalanır.
- `environment: npm` üzerindeki manuel onay açılacaksa, onay her `main` push'unda (sadece PR güncellemesi için bile) istenir. Bu yüzden yayın ile PR güncellemesi iki ayrı job'a bölünebilir; MVP'de manuel onay kapalı tutulur.

```yaml
name: release
on:
  push:
    branches: [main]
permissions: {}
concurrency: release
jobs:
  release:
    runs-on: ubuntu-latest
    environment: npm
    permissions:
      contents: write # tag ve release
      id-token: write # npm trusted publishing (OIDC)
    steps:
      - uses: actions/create-github-app-token@<sha> # v2
        id: app
        with:
          client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
      - uses: actions/checkout@<sha> # v4
        with: { token: "${{ steps.app.outputs.token }}" }
      - uses: pnpm/action-setup@<sha> # v4
      - uses: actions/setup-node@<sha> # v4
        with: { node-version: 24, registry-url: "https://registry.npmjs.org" }
        # Node 24 npm 11 ile gelir; trusted publishing için ≥ 11.5.1 yeterli,
        # "npm install -g npm@latest" gibi pinlenmemiş kurulum yapılmaz
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter enflasyon-core build && pnpm --filter enflasyon-core test
      - uses: changesets/action@<sha> # v1
        with:
          publish: pnpm changeset publish
          commitMode: github-api
        env:
          GITHUB_TOKEN: ${{ steps.app.outputs.token }}
```

**Doğrulanacak (adım 11):** `pnpm changeset publish` pnpm üzerinden yayın yapar; kullanılan pnpm sürümünün npm OIDC trusted publishing'i desteklediği ilk yayından önce kontrol edilir. Desteklemiyorsa publish komutu `npm publish` çağıran bir script'e çevrilir.

**`security.yml`** — haftalık ve PR'da: CodeQL analizi + OpenSSF Scorecard.

### 10.1 Yayın öncesi kontrol listesi

- [ ] `pnpm pack --dry-run` çıktısında sadece `dist/`, `README.md`, `LICENSE`, `package.json` var
- [ ] npm sayfasında provenance rozeti görünüyor (ilk OIDC yayınından sonra)
- [ ] README'deki örnek kod, yayınlanan sürümle çalışıyor
- [ ] CHANGELOG girişi anlamlı (changeset açıklaması kullanıcıya yönelik yazılmış)

### 10.2 README içeriği

Rozetler (npm sürüm, CI, coverage, bundle size, provenance, OpenSSF Scorecard), tek cümlelik açıklama, kurulum, 10 satırlık örnek, API tablosu, hesaplama yöntemi (Bölüm 4'ün kısa hali), bilinen sınırlamalar, canlı demo linki (web uygulaması), lisans.

## 11. Geliştirme yol haritası

Her adım ayrı bir branch ve PR'dır; adım bitmeden diğerine geçilmez. Her adımın sonunda CI yeşil olmalıdır.

1. **Hazırlık (elle):** git kimliği + SSH imza, GitHub e-posta gizliliği, npm 2FA, paket adı kontrolü. Repo (`emircanbakar/enflasyon`) oluşturuldu; public'e alınır ve secret scanning + push protection + private vulnerability reporting açılır.
2. **İskelet (monorepo):** kökte `package.json` (private), `pnpm-workspace.yaml`, ESLint/Prettier, `.gitignore`, `lefthook` + commitlint + gitleaks, `LICENSE`, `SECURITY.md`, `.changeset/` (web ignore). `packages/core` içinde `package.json`, `tsconfig` (strict), `tsup`, `vitest`, boş `src/index.ts`. `apps/web` bu adımda sadece boş klasördür.
3. **CI:** `ci.yml` (lint, typecheck, test, build). Branch protection açılır.
4. **Tipler ve hatalar:** `types.ts`, `errors.ts`, dönem yardımcıları + testleri.
5. **Sepet:** `normalizeBasket` + doğrulama + unit/property testleri.
6. **Çekirdek hesap:** `itemChange`, `personalInflation`, katkı dökümü, Kahan toplama + testler.
7. **Dönem fonksiyonları:** `annual`, `monthly`, `yearToDate`, `twelveMonthAverage`.
8. **Yardımcılar:** `adjustAmount`, `realWageChange`, `roundTo`, `chainSeries`.
9. **Golden testler:** gerçek TÜİK verisiyle fixture + `SOURCE.md`.
10. **Paket kalitesi:** `publint`, `attw`, `size-limit`, smoke test, coverage %100 eşiği.
11. **Yayın altyapısı:** release için GitHub App (secret `npm` environment'ında), Changesets, `release.yml`, `security.yml`, Dependabot, CodeQL, Scorecard. İlk yayın `0.1.0`, ardından npm'de trusted publisher bağlanır ve token'lar kapatılır.
12. **Dokümantasyon:** README, TSDoc, örnekler. Web uygulaması canlıya çıkınca `1.0.0`.

**Tamamlanma tanımı (her adım için):** testler yazılmış ve geçiyor, tipler `any` içermiyor, public API değiştiyse changeset eklenmiş, commit mesajları kurala uygun.

**Açık sorular:**

- Paket adı: `enflasyon-core` mü, `@emircanbakar/enflasyon-core` mü? (npm'de kontrol edilecek)
- Lisans MIT olarak varsayıldı; farklı tercih varsa adım 2'den önce belirlenmeli.
