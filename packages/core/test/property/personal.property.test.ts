import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { personalInflation } from "../../src/calc/personal.js";
import { safeSum } from "../../src/internal/math.js";
import type { IndexSet, PersonalInflationInput } from "../../src/types.js";

const FROM = "2025-09";
const TO = "2026-09";

const key = fc.stringMatching(/^[a-z]{1,6}$/);
const index = fc.double({ min: 1, max: 10_000, noNaN: true });
const amountValue = fc.double({ min: 0.01, max: 1e6, noNaN: true });

/** Her kalem için tutar ve iki aylık endeks değeri olan rastgele senaryo. */
const scenario = fc
  .uniqueArray(fc.record({ key, amount: amountValue, start: index, end: index }), {
    selector: (item) => item.key,
    minLength: 1,
    maxLength: 25,
  })
  .map((rows) => {
    const items = Object.fromEntries(rows.map((r) => [r.key, r.amount]));
    const indices: IndexSet = Object.fromEntries(
      rows.map((r) => [r.key, { [FROM]: r.start, [TO]: r.end }]),
    );
    const changes = rows.map((r) => r.end / r.start - 1);
    const input: PersonalInflationInput = {
      basket: { mode: "amount", items },
      indices,
      from: FROM,
      to: TO,
    };
    return { input, changes, rows };
  });

describe("kişisel enflasyon kuralları (property)", () => {
  it("ağırlıklı ortalama uçların dışına çıkmaz: min(rᵢ) ≤ π ≤ max(rᵢ)", () => {
    fc.assert(
      fc.property(scenario, fc.constantFrom("from", "to"), ({ input, changes }, weightsAt) => {
        const { rate } = personalInflation({ ...input, weightsAt });
        const eps = 1e-12 * Math.max(1, ...changes.map(Math.abs));
        expect(rate).toBeGreaterThanOrEqual(Math.min(...changes) - eps);
        expect(rate).toBeLessThanOrEqual(Math.max(...changes) + eps);
      }),
    );
  });

  it("katkıların toplamı orana eşit", () => {
    fc.assert(
      fc.property(scenario, ({ input }) => {
        const result = personalInflation(input);
        const total = safeSum(result.contributions.map((c) => c.contribution));
        expect(Math.abs(total - result.rate)).toBeLessThanOrEqual(
          1e-12 * Math.max(1, Math.abs(result.rate)),
        );
      }),
    );
  });

  it("oran sıfır değilse payların toplamı 1", () => {
    fc.assert(
      fc.property(scenario, ({ input }) => {
        const result = personalInflation(input);
        fc.pre(Math.abs(result.rate) > 1e-6);
        const shares = result.contributions.map((c) => c.share ?? Number.NaN);
        expect(Math.abs(safeSum(shares) - 1)).toBeLessThanOrEqual(1e-6);
      }),
    );
  });

  it("tüm kalemler aynı oranla artarsa π o orana eşit", () => {
    fc.assert(
      fc.property(
        scenario,
        fc.double({ min: -0.9, max: 5, noNaN: true }),
        fc.constantFrom("from", "to"),
        ({ input, rows }, change, weightsAt) => {
          const indices: IndexSet = Object.fromEntries(
            rows.map((r) => [r.key, { [FROM]: r.start, [TO]: r.start * (1 + change) }]),
          );
          const { rate } = personalInflation({ ...input, indices, weightsAt });
          expect(Math.abs(rate - change)).toBeLessThanOrEqual(
            1e-12 * Math.max(1, Math.abs(change)),
          );
        },
      ),
    );
  });

  it("sepeti 2'nin kuvvetiyle ölçeklemek sonucu bit düzeyinde değiştirmez", () => {
    fc.assert(
      fc.property(scenario, fc.integer({ min: -10, max: 10 }), ({ input }, exponent) => {
        const items = Object.fromEntries(
          Object.entries(input.basket.items).map(([k, v]) => [k, v * 2 ** exponent]),
        );
        expect(personalInflation({ ...input, basket: { mode: "amount", items } })).toEqual(
          personalInflation(input),
        );
      }),
    );
  });

  it("sepet ve endeks anahtar sırası değişince sonuç bit düzeyinde aynı", () => {
    fc.assert(
      fc.property(scenario, ({ input }) => {
        const reversed: PersonalInflationInput = {
          ...input,
          basket: {
            mode: "amount",
            items: Object.fromEntries(Object.entries(input.basket.items).reverse()),
          },
          indices: Object.fromEntries(Object.entries(input.indices).reverse()),
        };
        expect(personalInflation(reversed)).toEqual(personalInflation(input));
      }),
    );
  });

  it("weightsAt: 'to' iken 1 + π = 1 / Σ sᵢ / (1 + rᵢ)", () => {
    fc.assert(
      fc.property(scenario, ({ input, rows }) => {
        const total = safeSum(rows.map((r) => r.amount));
        const harmonic = safeSum(rows.map((r) => r.amount / total / (r.end / r.start)));
        const { rate } = personalInflation({ ...input, weightsAt: "to" });
        expect(Math.abs(1 + rate - 1 / harmonic)).toBeLessThanOrEqual(1e-9 * (1 / harmonic));
      }),
    );
  });

  it("katkılar mutlak değere göre azalan sıralı", () => {
    fc.assert(
      fc.property(scenario, ({ input }) => {
        const abs = personalInflation(input).contributions.map((c) => Math.abs(c.contribution));
        expect(abs).toEqual([...abs].sort((a, b) => b - a));
      }),
    );
  });
});
