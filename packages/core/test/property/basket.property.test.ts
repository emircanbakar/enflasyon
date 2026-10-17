import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizeBasket } from "../../src/basket/normalize.js";
import { safeSum } from "../../src/internal/math.js";
import type { Basket } from "../../src/types.js";

const key = fc.stringMatching(/^[a-z]{1,8}$/);

/** En az bir pozitif değeri olan, 0 değerli kalemler de içerebilen tutar sepeti. */
const items = fc
  .dictionary(
    key,
    fc.oneof(
      { weight: 4, arbitrary: fc.double({ min: 0.01, max: 1e7, noNaN: true }) },
      { weight: 1, arbitrary: fc.constant(0) },
    ),
    { minKeys: 1, maxKeys: 30 },
  )
  .filter((record) => Object.values(record).some((value) => value > 0));

const amount = (record: Record<string, number>): Basket => ({ mode: "amount", items: record });

describe("sepet kuralları (property)", () => {
  it("paylar 0..1 arasında ve toplamı 1", () => {
    fc.assert(
      fc.property(items, (record) => {
        const weights = Object.values(normalizeBasket(amount(record)));
        for (const w of weights) {
          expect(w).toBeGreaterThan(0);
          expect(w).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(safeSum(weights) - 1)).toBeLessThanOrEqual(1e-12);
      }),
    );
  });

  it("sonuçta tam olarak pozitif değerli kalemler yer alır", () => {
    fc.assert(
      fc.property(items, (record) => {
        const expected = Object.keys(record)
          .filter((k) => (record[k] ?? 0) > 0)
          .sort();
        expect(Object.keys(normalizeBasket(amount(record))).sort()).toEqual(expected);
      }),
    );
  });

  it("sepeti 2'nin kuvvetiyle ölçeklemek payları bit düzeyinde değiştirmez", () => {
    fc.assert(
      fc.property(items, fc.integer({ min: -20, max: 20 }), (record, exponent) => {
        const factor = 2 ** exponent;
        const scaled = Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v * factor]));
        expect(normalizeBasket(amount(scaled))).toEqual(normalizeBasket(amount(record)));
      }),
    );
  });

  it("sepeti herhangi bir katsayıyla ölçeklemek payları değiştirmez (tolerans 1e-12)", () => {
    fc.assert(
      fc.property(items, fc.double({ min: 1e-3, max: 1e3, noNaN: true }), (record, factor) => {
        const base = normalizeBasket(amount(record));
        const scaled = normalizeBasket(
          amount(Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v * factor]))),
        );
        for (const [k, w] of Object.entries(base)) {
          expect(Math.abs((scaled[k] ?? Number.NaN) - w)).toBeLessThanOrEqual(1e-12);
        }
      }),
    );
  });

  it("anahtar sırası değişince sonuç bit düzeyinde aynı", () => {
    fc.assert(
      fc.property(items, (record) => {
        const reversed = Object.fromEntries(Object.entries(record).reverse());
        const a = normalizeBasket(amount(record));
        const b = normalizeBasket(amount(reversed));
        expect(Object.entries(b)).toEqual(Object.entries(a));
      }),
    );
  });

  it("normalize edilmiş paylar share modunda tekrar verilince aynı kalır", () => {
    fc.assert(
      fc.property(items, (record) => {
        const weights = normalizeBasket(amount(record));
        const again = normalizeBasket({ mode: "share", items: weights });
        for (const [k, w] of Object.entries(weights)) {
          expect(Math.abs((again[k] ?? Number.NaN) - w)).toBeLessThanOrEqual(1e-12);
        }
      }),
    );
  });
});
