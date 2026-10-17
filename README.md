# enflasyon

> Resmi enflasyon herkes için aynı. Seninki değil.

Harcama dağılımına göre **kişisel enflasyonunu** hesaplayan açık kaynak bir proje. İki parçadan oluşur:

| Parça              | Klasör          | Ne                                                                                                           |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| **enflasyon-core** | `packages/core` | Sepet ve fiyat endekslerinden kişisel enflasyonu hesaplayan, sıfır bağımlılıklı TypeScript kütüphanesi (npm) |
| **Web uygulaması** | `apps/web`      | Hesabın tamamen tarayıcıda yapıldığı, verinin hiçbir yere gönderilmediği Next.js uygulaması                  |

> **Durum:** Tasarım aşaması. Teknik dokümanlar hazır; geliştirme yol haritasına göre ilerliyor.

## Dokümanlar

- [Motor paketi teknik dokümanı](docs/core.md): veri modeli, hesaplama yöntemi (Laspeyres), public API, test stratejisi, yayın süreci
- [Web uygulaması teknik dokümanı](docs/web.md): mimari, veri pipeline'ı, URL şeması ve gizlilik, erişilebilirlik, performans bütçeleri

## Lisans

MIT
