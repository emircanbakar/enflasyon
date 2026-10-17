import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_AMOUNT, MAX_PERMILLE, decodeBasket, encodeBasket } from "../lib/basket-url";
import type { BasketState, PeriodKind } from "../lib/basket-url";
import { CATEGORY_KEYS, isCategoryKey } from "../lib/categories";
import type { CategoryKey } from "../lib/categories";
import { fromMonthIndexForTest } from "./period-helper";

const period = fc.integer({ min: 2004 * 12, max: 2030 * 12 + 11 }).map(fromMonthIndexForTest);
const categories = fc.subarray([...CATEGORY_KEYS]);

/** Kanonik durum: decode(encode(x)) bunu birebir geri vermelidir. */
const canonicalState: fc.Arbitrary<BasketState> = fc
  .record({
    mode: fc.constantFrom<"tl" | "pct">("tl", "pct"),
    keys: categories,
    period: fc.constantFrom<PeriodKind>("y", "m", "ytd", "r"),
    at: fc.option(period, { nil: null }),
    fromOffset: fc.integer({ min: 1, max: 120 }),
    profile: fc.option(fc.stringMatching(/^[a-z0-9-]{1,40}$/), { nil: null }),
    tl: fc.array(fc.integer({ min: 1, max: MAX_AMOUNT }), { minLength: 13, maxLength: 13 }),
    pct: fc.array(fc.integer({ min: 1, max: MAX_PERMILLE }), { minLength: 13, maxLength: 13 }),
  })
  .map((r) => {
    const values: Partial<Record<CategoryKey, number>> = {};
    r.keys.forEach((key, i) => {
      values[key] = r.mode === "tl" ? r.tl[i]! : r.pct[i]! / 10;
    });
    const hasValues = r.keys.length > 0;
    let from = null;
    if (r.period === "r") {
      from = r.at === null ? fromMonthIndexForTest(2010 * 12) : shiftBack(r.at, r.fromOffset);
    }
    return {
      mode: r.mode,
      values,
      period: r.period,
      at: r.at,
      from,
      profile: hasValues ? null : r.profile,
    } satisfies BasketState;
  });

function shiftBack(at: string, months: number): BasketState["from"] {
  const [y, m] = at.split("-").map(Number) as [number, number];
  return fromMonthIndexForTest(y * 12 + m - 1 - months);
}

describe("basket-url kuralları (property)", () => {
  it("gidiş-dönüş: decode(encode(x)) === x", () => {
    fc.assert(
      fc.property(canonicalState, (s) => {
        const { search, hash } = encodeBasket(s);
        expect(decodeBasket(search, hash)).toEqual(s);
      }),
    );
  });

  it("encode, decode sonucunda sabit kalır (idempotent kanonik biçim)", () => {
    fc.assert(
      fc.property(canonicalState, (s) => {
        const once = encodeBasket(s);
        const decoded = decodeBasket(once.search, once.hash);
        expect(decoded && encodeBasket(decoded)).toEqual(once);
      }),
    );
  });

  it("TL tutarları hiçbir zaman query'de yer almaz", () => {
    fc.assert(
      fc.property(canonicalState, (s) => {
        fc.pre(s.mode === "tl" && Object.keys(s.values).length > 0);
        const { search } = encodeBasket(s);
        expect(search).not.toMatch(/(^|&)s=/);
        expect(search).not.toMatch(/(^|&)m=/);
      }),
    );
  });

  it("yüzde olarak paylaşılan link, oranları koruyarak yüzde modunda açılır", () => {
    fc.assert(
      fc.property(canonicalState, (s) => {
        fc.pre(s.mode === "tl" && Object.keys(s.values).length > 0);
        const { search, hash } = encodeBasket(s, { includeAmounts: false });
        expect(hash).toBe("");
        const decoded = decodeBasket(search, hash);
        expect(decoded?.mode).toBe("pct");
        // Sıfır olmayan her binde pay, orijinal kalemlerden birine aittir.
        for (const key of Object.keys(decoded?.values ?? {})) {
          expect(key in s.values).toBe(true);
        }
      }),
    );
  });

  it("rastgele girdide asla hata fırlatmaz ve sonuç her zaman geçerlidir", () => {
    const anyText = fc.string({ maxLength: 300, unit: "binary" });
    fc.assert(
      fc.property(anyText, anyText, (search, hash) => {
        const decoded = decodeBasket(search, hash);
        if (decoded === null) return;
        const limit = decoded.mode === "tl" ? MAX_AMOUNT : MAX_PERMILLE / 10;
        for (const [key, value] of Object.entries(decoded.values)) {
          expect(isCategoryKey(key)).toBe(true);
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThanOrEqual(limit);
        }
      }),
    );
  });

  it("geçerli parçalar arasına rastgele çöp eklense de geçerli kalemler okunur", () => {
    const junk = fc.string({ maxLength: 12 }).filter((s) => !/[&#~]/.test(s));
    fc.assert(
      fc.property(fc.array(junk, { maxLength: 5 }), (junkParts) => {
        const parts = [...junkParts.map((j) => `zz${j}`), "konut.100"];
        const decoded = decodeBasket("", `m=tl&s=${parts.map(encodeURIComponent).join("~")}`);
        expect(decoded?.values.konut).toBe(100);
      }),
    );
  });
});
