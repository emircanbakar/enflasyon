/**
 * Golden testler: gerçek TÜİK verisi (kaynak: fixtures/SOURCE.md).
 *
 * Paket, TÜİK'in resmi ağırlıkları ve grup endeksleriyle beslendiğinde resmi
 * genel endeksi yeniden üretebilmelidir. TÜİK endeksi her Aralık'ta zincirlediği
 * için kesin karşılaştırma yıl içi dönemde (önceki Aralık → ay) yapılır; yıllık
 * değişim iki zincir halkasına yayıldığından yalnızca bilgi amaçlı kontrol edilir
 * (docs/core.md, Bölüm 4 ve 7.3).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { annual, itemChange, toIndexSet, yearToDate } from "../../src/index.js";
import type { Basket, Period } from "../../src/index.js";

interface Fixture {
  readonly groups: Record<string, { label: string }>;
  readonly weights: Record<"2025" | "2026", Record<string, number>>;
  readonly indices: unknown;
  readonly publishedChanges: {
    readonly yearToDate: Record<string, Record<string, number>>;
    readonly annual: Record<string, Record<string, number>>;
  };
}

const fixture = JSON.parse(
  readFileSync(new URL("fixtures/tufe-2026.json", import.meta.url), "utf8"),
) as Fixture;

const indices = toIndexSet(fixture.indices);
const groupKeys = Object.keys(fixture.groups);

/** Resmi ağırlıklar (toplamları yuvarlamadan dolayı 100 değil; amount modu normalize eder). */
const officialBasket = (year: "2025" | "2026"): Basket => ({
  mode: "amount",
  items: fixture.weights[year],
});

/** Resmi genel endeksin iki ay arasındaki değişimi, yüzde. */
const officialChange = (from: Period, to: Period): number =>
  itemChange(indices["genel"]!, from, to) * 100;

const percent = (rate: number): number => rate * 100;

describe("golden: veri bütünlüğü", () => {
  it("13 ana grup ve genel endeks var; tümü toIndexSet doğrulamasından geçiyor", () => {
    expect(groupKeys).toHaveLength(13);
    expect(Object.keys(indices).sort()).toEqual([...groupKeys, "genel"].sort());
  });

  it.each([
    ["2026-06", "yearToDate"],
    ["2026-09", "yearToDate"],
    ["2026-09", "annual"],
  ] as const)(
    "her grubun endekslerden hesaplanan değişimi yayımlanan oranla örtüşür (%s, %s)",
    (at, kind) => {
      const from: Period = kind === "annual" ? "2025-09" : "2025-12";
      const published = fixture.publishedChanges[kind][at]!;
      for (const key of [...groupKeys, "genel"]) {
        const computed = percent(itemChange(indices[key]!, from, at));
        // Fark yalnızca endekslerin 2 ondalığa yuvarlanmasından gelebilir.
        expect(Math.abs(computed - published[key]!), key).toBeLessThanOrEqual(0.02);
      }
    },
  );
});

describe("golden: resmi genel endeksin yeniden üretilmesi", () => {
  it.each(["2026-06", "2026-09"] as const)(
    "yılbaşından beri (%s): paket, resmi ağırlıklarla genel endeksi ±0,1 puan içinde verir",
    (at) => {
      const result = yearToDate({ basket: officialBasket("2026"), indices, at });
      const official = officialChange("2025-12", at);
      const published = fixture.publishedChanges.yearToDate[at]!["genel"]!;

      expect(result.from).toBe("2025-12");
      expect(Math.abs(percent(result.rate) - official)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(percent(result.rate) - published)).toBeLessThanOrEqual(0.1);
    },
  );

  it("yılbaşından beri (2026-09) sonucu sabit: %24,32 (yuvarlanmış)", () => {
    const result = yearToDate({ basket: officialBasket("2026"), indices, at: "2026-09" });
    expect(percent(result.rate).toFixed(2)).toBe("24.32");
  });

  it("katkı dökümü: en büyük katkı ulaştırmadan, katkılar toplamı orana eşit", () => {
    const result = yearToDate({ basket: officialBasket("2026"), indices, at: "2026-09" });
    const total = result.contributions.reduce((sum, c) => sum + c.contribution, 0);

    expect(result.contributions[0]?.key).toBe("ulastirma");
    expect(Math.abs(total - result.rate)).toBeLessThan(1e-12);
    expect(result.contributions.every((c) => !c.usedFallback)).toBe(true);
  });
});

describe("golden: yıllık değişim (bilgi amaçlı)", () => {
  /**
   * Yıllık dönem (2025-09 → 2026-09) iki zincir halkasına yayılır: TÜİK
   * Ekim–Aralık 2025'i 2025 ağırlıklarıyla, Ocak–Eylül 2026'yı 2026 ağırlıklarıyla
   * hesaplar. Tek ağırlık setiyle sapma beklenir (17 Ekim 2026 verisiyle: 2026
   * ağırlıklarıyla −0,14, 2025 ağırlıklarıyla +0,68 puan). Test yalnızca sapmanın
   * makul sınırda (±1 puan) kaldığını kontrol eder; büyük bir sıçrama veri
   * hatasına işaret eder.
   */
  it.each(["2025", "2026"] as const)(
    "%s ağırlıklarıyla resmi yıllık orandan ±1 puan içinde",
    (year) => {
      const result = annual({ basket: officialBasket(year), indices, at: "2026-09" });
      const official = officialChange("2025-09", "2026-09");
      expect(Math.abs(percent(result.rate) - official)).toBeLessThanOrEqual(1);
    },
  );
});
