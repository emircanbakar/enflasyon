# Güvenlik Politikası

## Açık bildirme

Bir güvenlik açığı bulduysan lütfen herkese açık bir issue açma. Bunun yerine GitHub'ın **Private vulnerability reporting** özelliğini kullan: repo sayfasında **Security → Report a vulnerability**.

Bildirime 7 gün içinde dönüş yapılır. Doğrulanan açıklar düzeltildikten sonra bildirenin izniyle duyurulur.

## Kapsam

- `enflasyon-core` npm paketinin son yayınlanan sürümü
- Web uygulamasının canlı sürümü

## Tasarım gereği

- `enflasyon-core` ağ isteği atmaz ve çalışma anında bağımlılığı yoktur.
- Web uygulaması kullanıcının girdiği TL tutarlarını sunucuya göndermez.
