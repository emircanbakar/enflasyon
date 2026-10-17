# Golden test verisi: kaynak

`tufe-2026.json`, Türkiye İstatistik Kurumu'nun (TÜİK) kamuya açık resmi istatistiklerinden alınmıştır.

| Alan          | Değer                                                            |
| ------------- | ---------------------------------------------------------------- |
| Kurum         | Türkiye İstatistik Kurumu (TÜİK)                                 |
| Seri          | Tüketici Fiyat Endeksi (TÜFE), 2025=100, COICOP 2018 sınıflaması |
| Kapsam        | Türkiye geneli, 13 ana harcama grubu ve genel endeks             |
| Alınma tarihi | 17 Ekim 2026                                                     |
| Son veri ayı  | Eylül 2026 (5 Ekim 2026'da yayımlandı)                           |

## Tablolar

TÜİK Veri Portalı → İstatistiksel Temalar → Fiyat İstatistikleri → Tüketici Fiyat Endeksi → Tablolar ve Grafikler:

1. **Ana harcama gruplarına göre tüketici fiyat endeksi (TÜFE) ve değişim oranları** (`TR,DF_TUFE_SDMX_TT01,1.0`)
   - `indices`: 2025-09, 2025-12, 2026-06 ve 2026-09 aylarının endeks değerleri (2 ondalık, yayımlandığı gibi)
   - `publishedChanges`: aynı tablodaki "Bir önceki yılın Aralık ayına göre değişim (%)" ve "Bir önceki yılın aynı ayına göre (yıllık) değişim oranı (%)" sütunları
2. **Ana grup ağırlıkları** (`TR,DF_TUFE_SDMX_TT08,1.0`)
   - `weights`: 2025 ve 2026 yılı "Harcama grubu ağırlıkları (%)"; tablodaki gibi 2 ondalık (toplamlar yuvarlamadan dolayı 99,97 ve 100,01)

Bağlantı: <https://veriportali.tuik.gov.tr/tr/statistical-themes>

## Notlar

- 2026'dan itibaren TÜFE 2025=100 bazlıdır ve COICOP 2018'e göre 13 ana gruba ayrılır. TÜİK geçmiş dönemleri (2025 ayları ve ağırlıklar dahil) yeni sınıflamaya göre yeniden hesaplamıştır; buradaki 2025 değerleri bu yeniden hesaplanmış seridendir.
- Değerler elle değiştirilmemiştir. Grup anahtarları (`gida`, `konut`…) bu proje için seçilmiştir; TÜİK adları `groups.*.label` alanındadır.
- Veri, testlerin kendisi tarafından da doğrulanır: her grubun endekslerden hesaplanan değişimi, TÜİK'in yayımladığı değişim oranıyla ±0,02 puan içinde örtüşmelidir (fark yalnızca endekslerin 2 ondalığa yuvarlanmasından gelir). Bir değer yanlış girilirse test kırılır.
- Elle hesaplanmış küçük (2–3 kalemli) örnekler `test/unit/personal.test.ts` ve `test/unit/periods.test.ts` içindedir.
