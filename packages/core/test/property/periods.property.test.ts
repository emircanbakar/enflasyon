import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { annual, twelveMonthAverage, yearToDate } from "../../src/calc/periods.js";
import { personalInflation } from "../../src/calc/personal.js";
import { safeSum } from "../../src/internal/math.js";
import type { Period } from "../../src/types.js";
import { referenceTwelveMonthAverage, shift } from "../reference.js";

const START: Period = "2023-01";
const LENGTH = 48; // 2023-01 … 2026-12

const key = fc.stringMatching(/^[a-z]{1,6}$/);
/** Aylık −%5 … +%10 arası değişimlerden oluşan seri. */
const series = fc
  .array(fc.double({ min: -0.05, max: 0.1, noNaN: true }), {
    minLength: LENGTH,
    maxLength: LENGTH,
  })
  .map((growth) => {
    const out: Record<string, number> = {};
    let value = 100;
    growth.forEach((g, i) => {
      out[shift(START, i)] = value;
      value *= 1 + g;
    });
    return out;
  });

const scenario = fc
  .uniqueArray(
    fc.record({ key, amount: fc.double({ min: 0.01, max: 1e6, noNaN: true }), series }),
    {
      selector: (row) => row.key,
      minLength: 1,
      maxLength: 8,
    },
  )
  .map((rows) => ({
    items: Object.fromEntries(rows.map((r) => [r.key, r.amount])),
    indices: Object.fromEntries(rows.map((r) => [r.key, r.series])),
  }));

/** Hedef ay: 24 aylık pencerenin ve 12 ay öncesinin veride kaldığı aylar. */
const at = fc.integer({ min: 23, max: LENGTH - 1 }).map((i) => shift(START, i));

describe("dönem fonksiyonları (property)", () => {
  it("annual ve yearToDate, personalInflation'ın doğru from/to ile çağrısıdır", () => {
    fc.assert(
      fc.property(scenario, at, ({ items, indices }, target) => {
        const input = { basket: { mode: "amount" as const, items }, indices, at: target };
        const month = Number(target.slice(5, 7));
        expect(annual(input)).toEqual(
          personalInflation({ ...input, from: shift(target, -12), to: target }),
        );
        expect(yearToDate(input)).toEqual(
          personalInflation({ ...input, from: shift(target, -month), to: target }),
        );
      }),
    );
  });

  it("twelveMonthAverage bağımsız referans hesapla uyuşur", () => {
    fc.assert(
      fc.property(scenario, at, ({ items, indices }, target) => {
        const total = Object.values(items).reduce((a, b) => a + b, 0);
        const weights = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v / total]));
        const expected = referenceTwelveMonthAverage(weights, indices, target);
        const { rate } = twelveMonthAverage({
          basket: { mode: "amount", items },
          indices,
          at: target,
        });
        expect(Math.abs(rate - expected)).toBeLessThanOrEqual(
          1e-12 * Math.max(1, Math.abs(expected)),
        );
      }),
    );
  });

  it("twelveMonthAverage katkıları tam ayrışır", () => {
    fc.assert(
      fc.property(
        scenario,
        at,
        fc.constantFrom("from", "to"),
        ({ items, indices }, target, weightsAt) => {
          const result = twelveMonthAverage({
            basket: { mode: "amount", items },
            indices,
            at: target,
            weightsAt,
          });
          const weights = safeSum(result.contributions.map((c) => c.weight));
          const contributions = safeSum(result.contributions.map((c) => c.contribution));
          expect(Math.abs(weights - 1)).toBeLessThanOrEqual(1e-12);
          expect(Math.abs(contributions - result.rate)).toBeLessThanOrEqual(
            1e-12 * Math.max(1, Math.abs(result.rate)),
          );
        },
      ),
    );
  });

  it("twelveMonthAverage kalemlerin kendi 12 aylık değişimleri arasında kalır", () => {
    fc.assert(
      fc.property(scenario, at, ({ items, indices }, target) => {
        const result = twelveMonthAverage({
          basket: { mode: "amount", items },
          indices,
          at: target,
        });
        const changes = result.contributions.map((c) => c.change);
        const eps = 1e-12 * Math.max(1, ...changes.map(Math.abs));
        expect(result.rate).toBeGreaterThanOrEqual(Math.min(...changes) - eps);
        expect(result.rate).toBeLessThanOrEqual(Math.max(...changes) + eps);
      }),
    );
  });
});
