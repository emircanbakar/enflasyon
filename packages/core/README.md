# enflasyon-core

[![npm version](https://img.shields.io/npm/v/enflasyon-core.svg)](https://www.npmjs.com/package/enflasyon-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/enflasyon-core)

Harcama sepetinden kişisel enflasyon, reel maaş erimesi ve geçmiş tutar düzeltmesi hesaplayan, **sıfır bağımlılıklı**, saf TypeScript kütüphanesi.

- **Sıfır bağımlılık (`dependencies: {}`)**: Hiçbir dış paket gerektirmez.
- **Ultra hafif**: Minified + gzip boyutu < 4 KB.
- **Dual Build (ESM + CJS)**: Hem `import` hem `require` ile tam uyumludur.
- **Platform bağımsız**: Node.js, tarayıcı, Next.js / Edge runtime, Cloudflare Workers, Deno ve Bun üzerinde çalışır.
- **%100 Test kapsamı**: 320+ birim, property-based ve golden test ile korunur.

---

## Kurulum

```bash
npm install enflasyon-core
# veya
pnpm add enflasyon-core
# veya
yarn add enflasyon-core
```

---

## Hızlı Başlangıç

```typescript
import { annual, toIndexSet } from "enflasyon-core";

// 1. Endeks serilerini hazırlayın (ör. TÜİK veya İTO verileri)
const indices = toIndexSet({
  genel: { "2025-09": 105.77, "2026-09": 137.23 },
  gida: { "2025-09": 105.02, "2026-09": 134.04 },
  konut: { "2025-09": 108.97, "2026-09": 152.56 },
  ulasim: { "2025-09": 104.1, "2026-09": 140.64 },
});

// 2. Kullanıcı sepetini TL tutar veya yüzde pay olarak tanımlayın
const basket = {
  mode: "amount" as const,
  items: {
    konut: 20000,
    gida: 12000,
    ulasim: 4000,
  },
};

// 3. Yıllık kişisel enflasyonu hesaplayın
const result = annual({ basket, indices, at: "2026-09" });

console.log("Kişisel Yıllık Enflasyon:", (result.rate * 100).toFixed(1) + "%");
console.log("En çok etkileyen kalemler:");
for (const item of result.contributions) {
  console.log(`- ${item.key}: +${(item.contribution * 100).toFixed(1)} puan katkı`);
}
```

---

## Temel API

### Enflasyon Hesaplamaları

- `annual({ basket, indices, at })`: Son 1 yılın aynı ayına göre yıllık kişisel enflasyon.
- `monthly({ basket, indices, at })`: Bir önceki aya göre aylık kişisel enflasyon.
- `yearToDate({ basket, indices, at })`: Yılbaşından (önceki yılın Aralık ayından) itibaren kişisel enflasyon.
- `twelveMonthAverage({ basket, indices, at })`: Son 12 ayın ortalamasının önceki 12 ay ortalamasına göre değişimi.
- `personalInflation({ basket, indices, from, to })`: İki özel tarih arasındaki kümülatif kişisel enflasyon.

### Alım Gücü ve Maaş Araçları

- `realWageChange({ wageFrom, wageTo, rate })`: Maaşın enflasyon karşısındaki reel değişim oranı ve alım gücünü korumak için gereken maaş.
- `adjustAmount(amount, from, to, series)`: Geçmişteki bir tutarın bugünkü nominal karşılığı.

### Yardımcılar & Doğrulama

- `normalizeBasket(basket)`: TL veya yüzde sepetini toplamı 1 olan ağırlıklara (`Weights`) dönüştürür.
- `toIndexSet(raw)`: Ham endeks kayıtlarını doğrular ve güvenli `IndexSet` nesnesine çevirir.
- `chainSeries(...)`: Farklı baz yıllarına ait serileri zincirler.

---

## Hata Modeli

Tüm geçersiz girdiler (hatalı dönem biçimi, eksik endeks ayı, negatif tutarlar) açık ve tipli `EnflasyonError` fırlatır:

```typescript
import { EnflasyonError, isEnflasyonError } from "enflasyon-core";

try {
  annual({ basket, indices, at: "2026-99" });
} catch (error) {
  if (isEnflasyonError(error)) {
    console.error(error.code); // "INVALID_PERIOD"
  }
}
```

---

## Lisans

MIT © [Emircan Bakar](https://github.com/emircanbakar)
