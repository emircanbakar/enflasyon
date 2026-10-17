/**
 * TÜFE ana harcama grupları (COICOP 2018, 2025=100 bazlı seri; 13 grup).
 *
 * Anahtarlar URL'de ve veri dosyalarında kullanılır; bir kez yayınlandıktan sonra
 * değiştirilmez (eski paylaşım linkleri bozulmasın). Sıra, TÜİK tablolarındaki
 * sıradır ve URL'deki kalem sırasını da belirler.
 */

export const CATEGORY_KEYS = [
  "gida",
  "alkol_tutun",
  "giyim",
  "konut",
  "mobilya",
  "saglik",
  "ulastirma",
  "bilgi_iletisim",
  "eglence",
  "egitim",
  "lokanta",
  "sigorta_finans",
  "kisisel_bakim",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface Category {
  readonly key: CategoryKey;
  /** Arayüzde gösterilen kısa ad. */
  readonly label: string;
  /** TÜİK'in resmi grup adı. */
  readonly officialLabel: string;
  /** Kullanıcıya grubun neyi kapsadığını anlatan kısa örnekler. */
  readonly hint: string;
}

const CATEGORY_LIST: readonly Category[] = [
  {
    key: "gida",
    label: "Gıda",
    officialLabel: "Gıda ve alkolsüz içecekler",
    hint: "market, manav, kasap, su ve meşrubat",
  },
  {
    key: "alkol_tutun",
    label: "Alkol ve tütün",
    officialLabel: "Alkollü içecekler, tütün ve tütün ürünleri",
    hint: "sigara, alkollü içecekler",
  },
  {
    key: "giyim",
    label: "Giyim",
    officialLabel: "Giyim ve ayakkabı",
    hint: "kıyafet, ayakkabı, terzi",
  },
  {
    key: "konut",
    label: "Konut",
    officialLabel: "Konut, su, elektrik, gaz ve diğer yakıtlar",
    hint: "kira, aidat, elektrik, doğalgaz, su",
  },
  {
    key: "mobilya",
    label: "Ev eşyası",
    officialLabel: "Mobilya, mefruşat ve evde kullanılan ekipmanlar ile rutin ev bakım ve onarımı",
    hint: "mobilya, beyaz eşya, temizlik malzemesi, tamir",
  },
  {
    key: "saglik",
    label: "Sağlık",
    officialLabel: "Sağlık",
    hint: "ilaç, muayene, gözlük",
  },
  {
    key: "ulastirma",
    label: "Ulaştırma",
    officialLabel: "Ulaştırma",
    hint: "akaryakıt, toplu taşıma, araç bakımı, uçak bileti",
  },
  {
    key: "bilgi_iletisim",
    label: "İletişim",
    officialLabel: "Bilgi ve iletişim",
    hint: "telefon, internet, cihazlar",
  },
  {
    key: "eglence",
    label: "Eğlence ve kültür",
    officialLabel: "Eğlence, dinlence, spor ve kültür",
    hint: "abonelikler, spor, kitap, etkinlik",
  },
  {
    key: "egitim",
    label: "Eğitim",
    officialLabel: "Eğitim hizmetleri",
    hint: "okul, kurs, üniversite",
  },
  {
    key: "lokanta",
    label: "Dışarıda yemek ve konaklama",
    officialLabel: "Lokantalar ve konaklama hizmetleri",
    hint: "restoran, kafe, otel",
  },
  {
    key: "sigorta_finans",
    label: "Sigorta ve finans",
    officialLabel: "Sigorta ve finansal hizmetler",
    hint: "sigorta primleri, banka ücretleri",
  },
  {
    key: "kisisel_bakim",
    label: "Kişisel bakım ve diğer",
    officialLabel: "Kişisel bakım, sosyal koruma ve çeşitli mal ve hizmetler",
    hint: "kuaför, kozmetik, bakım hizmetleri",
  },
];

export const CATEGORIES: ReadonlyMap<CategoryKey, Category> = new Map(
  CATEGORY_LIST.map((category) => [category.key, Object.freeze(category)]),
);

const KEY_SET: ReadonlySet<string> = new Set(CATEGORY_KEYS);

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && KEY_SET.has(value);
}
