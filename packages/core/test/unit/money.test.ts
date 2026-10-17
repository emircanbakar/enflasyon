import { describe, expect, it } from "vitest";
import { adjustAmount } from "../../src/calc/adjust.js";
import { realWageChange } from "../../src/calc/realWage.js";
import type { RealWageInput } from "../../src/calc/realWage.js";
import type { EnflasyonErrorCode } from "../../src/errors.js";
import { expectCode } from "../helpers.js";

const raw = (value: unknown): RealWageInput => value as RealWageInput;

describe("adjustAmount", () => {
  it("README örneği: 20.000 TL, %48,12 → 29.624 TL", () => {
    expect(adjustAmount(20000, 0.4812)).toBeCloseTo(29624, 9);
  });

  it("oran 0 ise tutar aynı kalır", () => {
    expect(adjustAmount(1234.56, 0)).toBe(1234.56);
  });

  it("negatif oranda (deflasyon) tutar düşer", () => {
    expect(adjustAmount(1000, -0.1)).toBeCloseTo(900, 12);
  });

  it("0 tutarda 0 döner", () => {
    expect(adjustAmount(0, 0.5)).toBe(0);
  });

  it("negatif tutarda NEGATIVE_VALUE fırlatır", () => {
    const error = expectCode(() => adjustAmount(-1, 0.5), "NEGATIVE_VALUE");
    expect(error.details).toEqual({ field: "amount", value: -1 });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("tutar %s ise NON_FINITE fırlatır", (amount) => {
    expectCode(() => adjustAmount(amount, 0.5), "NON_FINITE");
  });

  it.each([-1, -2])("oran %s (≤ −1) ise INVALID_INPUT fırlatır", (rate) => {
    const error = expectCode(() => adjustAmount(100, rate), "INVALID_INPUT");
    expect(error.details).toEqual({ field: "rate", value: rate });
  });

  it("oran sonlu değilse NON_FINITE, sayı değilse INVALID_INPUT fırlatır", () => {
    expectCode(() => adjustAmount(100, Number.NaN), "NON_FINITE");
    expectCode(() => adjustAmount(100, "0.5" as unknown as number), "INVALID_INPUT");
    expectCode(() => adjustAmount("100" as unknown as number, 0.5), "INVALID_INPUT");
  });
});

describe("realWageChange", () => {
  it("maaş enflasyondan az artınca reel değişim negatiftir", () => {
    // 40.000 → 52.000 (%30 zam), enflasyon %50: 1,3 / 1,5 − 1 = −0,1333…
    const result = realWageChange({ wageFrom: 40000, wageTo: 52000, rate: 0.5 });
    expect(result.real).toBeCloseTo(1.3 / 1.5 - 1, 15);
    expect(result.requiredWage).toBe(60000);
  });

  it("maaş enflasyonla aynı oranda artınca reel değişim 0'dır", () => {
    const result = realWageChange({ wageFrom: 40000, wageTo: 60000, rate: 0.5 });
    expect(result.real).toBeCloseTo(0, 15);
    expect(result.requiredWage).toBe(60000);
  });

  it("maaş enflasyondan fazla artınca reel değişim pozitiftir", () => {
    expect(realWageChange({ wageFrom: 100, wageTo: 200, rate: 0.25 }).real).toBeCloseTo(0.6, 15);
  });

  it("şimdiki maaş 0 ise reel değişim −1'dir", () => {
    expect(realWageChange({ wageFrom: 100, wageTo: 0, rate: 0.25 }).real).toBe(-1);
  });

  it("sonucu dondurur", () => {
    expect(Object.isFrozen(realWageChange({ wageFrom: 1, wageTo: 1, rate: 0 }))).toBe(true);
  });

  it("önceki maaş 0 ise INVALID_INPUT fırlatır", () => {
    const error = expectCode(
      () => realWageChange({ wageFrom: 0, wageTo: 100, rate: 0.1 }),
      "INVALID_INPUT",
    );
    expect(error.details).toEqual({ field: "wageFrom" });
  });

  it.each<[string, Partial<RealWageInput>, EnflasyonErrorCode]>([
    ["negatif wageFrom", { wageFrom: -1 }, "NEGATIVE_VALUE"],
    ["negatif wageTo", { wageTo: -1 }, "NEGATIVE_VALUE"],
    ["NaN wageTo", { wageTo: Number.NaN }, "NON_FINITE"],
    ["oran −1", { rate: -1 }, "INVALID_INPUT"],
    ["oran Infinity", { rate: Number.POSITIVE_INFINITY }, "NON_FINITE"],
  ])("%s için %s fırlatır", (_, override, code) => {
    const input = { wageFrom: 100, wageTo: 120, rate: 0.1, ...override };
    expectCode(() => realWageChange(input), code);
  });

  it.each([null, "x", [100, 120, 0.1]])("girdi %j ise INVALID_INPUT fırlatır", (value) => {
    expectCode(() => realWageChange(raw(value)), "INVALID_INPUT");
  });

  it("eksik alanlarda INVALID_INPUT fırlatır", () => {
    const error = expectCode(
      () => realWageChange(raw({ wageFrom: 100, rate: 0.1 })),
      "INVALID_INPUT",
    );
    expect(error.details).toEqual({ field: "wageTo" });
  });
});
