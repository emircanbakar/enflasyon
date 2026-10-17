import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { adjustAmount } from "../../src/calc/adjust.js";
import { itemChange } from "../../src/calc/change.js";
import { realWageChange } from "../../src/calc/realWage.js";
import { roundTo } from "../../src/calc/round.js";
import { chainSeries } from "../../src/series/chain.js";
import type { IndexSeries, Period } from "../../src/types.js";
import { shift } from "../reference.js";

const amount = fc.double({ min: 0, max: 1e9, noNaN: true });
const rate = fc.double({ min: -0.99, max: 10, noNaN: true });

describe("yardımcı fonksiyon kuralları (property)", () => {
  it("adjustAmount ile bugüne taşınan tutar, realWageChange'in requiredWage'ine eşittir", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 1e9, noNaN: true }), rate, (wage, r) => {
        const { requiredWage } = realWageChange({ wageFrom: wage, wageTo: wage, rate: r });
        expect(requiredWage).toBe(adjustAmount(wage, r));
      }),
    );
  });

  it("maaş tam requiredWage kadar artarsa reel değişim ~0", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 1e9, noNaN: true }), rate, (wage, r) => {
        const { requiredWage } = realWageChange({ wageFrom: wage, wageTo: wage, rate: r });
        const { real } = realWageChange({ wageFrom: wage, wageTo: requiredWage, rate: r });
        expect(Math.abs(real)).toBeLessThanOrEqual(1e-12);
      }),
    );
  });

  it("adjustAmount tutarda doğrusaldır", () => {
    fc.assert(
      fc.property(amount, rate, (a, r) => {
        expect(adjustAmount(2 * a, r)).toBe(2 * adjustAmount(a, r));
      }),
    );
  });

  it("roundTo sonucu değere en fazla yarım birim uzaktır ve idempotenttir", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.integer({ min: 0, max: 6 }),
        (value, decimals) => {
          const rounded = roundTo(value, decimals);
          const half = 0.5 * 10 ** -decimals;
          expect(Math.abs(rounded - value)).toBeLessThanOrEqual(half * (1 + 1e-9));
          expect(roundTo(rounded, decimals)).toBe(rounded);
        },
      ),
    );
  });

  it("roundTo simetriktir: roundTo(−x) === −roundTo(x)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e6, noNaN: true }),
        fc.integer({ min: 0, max: 6 }),
        (value, decimals) => {
          expect(roundTo(-value, decimals)).toBe(-roundTo(value, decimals) || 0);
        },
      ),
    );
  });

  it("chainSeries örtüşme sonrası ve öncesi değişimleri korur", () => {
    const values = fc.array(fc.double({ min: 1, max: 1e5, noNaN: true }), {
      minLength: 2,
      maxLength: 30,
    });
    fc.assert(
      fc.property(values, values, (oldValues, newValues) => {
        const start: Period = "2020-01";
        const t0 = shift(start, oldValues.length - 1);
        const older = Object.fromEntries(
          oldValues.map((v, i) => [shift(start, i), v]),
        ) as IndexSeries;
        const newer = Object.fromEntries(newValues.map((v, i) => [shift(t0, i), v])) as IndexSeries;
        const chained = chainSeries(older, newer, t0);

        const lastNew = shift(t0, newValues.length - 1);
        expect(itemChange(chained, t0, lastNew)).toBe(itemChange(newer, t0, lastNew));
        expect(
          Math.abs(itemChange(chained, start, t0) - itemChange(older, start, t0)),
        ).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(itemChange(older, start, t0))));
        expect(Object.keys(chained)).toHaveLength(oldValues.length + newValues.length - 1);
      }),
    );
  });
});
