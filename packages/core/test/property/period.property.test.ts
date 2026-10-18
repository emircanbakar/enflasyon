import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addMonths,
  availablePeriods,
  comparePeriods,
  fromMonthIndex,
  isPeriod,
  toMonthIndex,
} from "../../src/series/period.js";
import type { IndexSeries } from "../../src/types.js";

const MIN = 1000 * 12;
const MAX = 9999 * 12 + 11;

/** 1900–2100 arası geçerli dönem. */
const period = fc.integer({ min: 1900 * 12, max: 2100 * 12 + 11 }).map(fromMonthIndex);
const offset = fc.integer({ min: -1200, max: 1200 });

describe("dönem kuralları (property)", () => {
  it("üretilen her dönem geçerlidir ve ay sayısına gidip gelir", () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN, max: MAX }), (index) => {
        const p = fromMonthIndex(index);
        expect(isPeriod(p)).toBe(true);
        expect(toMonthIndex(p)).toBe(index);
      }),
    );
  });

  it("addMonths(addMonths(p, n), -n) === p", () => {
    fc.assert(
      fc.property(period, offset, (p, n) => {
        expect(addMonths(addMonths(p, n), -n)).toBe(p);
      }),
    );
  });

  it("addMonths birleşmelidir: (p + a) + b === p + (a + b)", () => {
    fc.assert(
      fc.property(period, offset, offset, (p, a, b) => {
        expect(addMonths(addMonths(p, a), b)).toBe(addMonths(p, a + b));
      }),
    );
  });

  it("string sıralaması ile kronolojik sıralama aynıdır", () => {
    fc.assert(
      fc.property(period, period, (a, b) => {
        expect(Math.sign(comparePeriods(a, b))).toBe(Math.sign(a.localeCompare(b)));
      }),
    );
  });

  it("availablePeriods sıralı, tekrarsız ve anahtar sırasından bağımsızdır", () => {
    fc.assert(
      fc.property(fc.uniqueArray(period, { maxLength: 60 }), (periods) => {
        const forward = Object.fromEntries(periods.map((p) => [p, 100])) as IndexSeries;
        const backward = Object.fromEntries(
          [...periods].reverse().map((p) => [p, 100]),
        ) as IndexSeries;

        const result = availablePeriods(forward);
        expect(result).toEqual(availablePeriods(backward));
        expect(result).toHaveLength(periods.length);
        expect(new Set(result).size).toBe(result.length);
        expect(result).toEqual([...periods].sort(comparePeriods));
      }),
    );
  });
});
