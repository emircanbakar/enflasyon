import { isEnflasyonError } from "enflasyon-core";
import type { EnflasyonErrorCode } from "enflasyon-core";

/**
 * `enflasyon-core` hata kodlarının kullanıcıya gösterilecek Türkçe karşılıkları
 * (docs/web.md, Bölüm 5.4). Paket mesajları İngilizce ve geliştiriciye yöneliktir;
 * arayüz yalnızca bu metinleri gösterir.
 */
const MESSAGES: Readonly<Record<EnflasyonErrorCode, string>> = {
  EMPTY_BASKET: "En az bir harcama kalemi gir.",
  NEGATIVE_VALUE: "Tutarlar negatif olamaz.",
  NON_FINITE: "Geçersiz bir sayı girildi.",
  SHARES_NOT_ONE: "Yüzdelerin toplamı 100 olmalı.",
  INVALID_PERIOD: "Seçilen ay geçersiz.",
  PERIOD_ORDER: "Başlangıç ayı bitiş ayından sonra olamaz.",
  MISSING_SERIES: "Bu harcama grubu için veri bulunamadı.",
  MISSING_PERIOD: "Seçilen dönem için henüz veri yok; daha yakın bir ay seç.",
  NON_POSITIVE_INDEX: "Veride beklenmeyen bir değer var.",
  NO_OVERLAP: "Seriler birleştirilemedi.",
  INVALID_KEY: "Geçersiz bir harcama kalemi var.",
  LIMIT_EXCEEDED: "Çok fazla kalem girildi.",
  INVALID_INPUT: "Girdi okunamadı.",
};

export const UNEXPECTED_ERROR = "Bu hesap yapılamadı. Sayfayı yenileyip tekrar dene.";

/** Hatayı kullanıcı mesajına çevirir; tanınmayan hatalar için genel mesaj döner. */
export function userMessage(error: unknown): string {
  return isEnflasyonError(error) ? MESSAGES[error.code] : UNEXPECTED_ERROR;
}
