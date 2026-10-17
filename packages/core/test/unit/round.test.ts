import { describe, expect, it } from "vitest";
import { roundTo } from "../../src/calc/round.js";
import { expectCode } from "../helpers.js";

describe("roundTo", () => {
  it.each<[number, number, number]>([
    // Kayan noktada yarımın hemen altında saklanan değerler
    [1.005, 2, 1.01],
    [2.675, 2, 2.68],
    [8.345, 2, 8.35],
    [1.45, 1, 1.5],
    [0.285, 2, 0.29],
    [1.0049999, 2, 1],
    // Yarımlar sıfırdan uzağa
    [0.5, 0, 1],
    [1.5, 0, 2],
    [2.5, 0, 3],
    [-0.5, 0, -1],
    [-2.5, 0, -3],
    [-1.005, 2, -1.01],
    // Sıradan değerler
    [29624.4, 0, 29624],
    [0.48123, 3, 0.481],
    [123.456, 0, 123],
    [5, 2, 5],
  ])("roundTo(%s, %i) === %s", (value, decimals, expected) => {
    expect(roundTo(value, decimals)).toBe(expected);
  });

  it("-0 ve sıfıra yuvarlanan negatifler için 0 döndürür (-0 değil)", () => {
    expect(Object.is(roundTo(-0, 2), 0)).toBe(true);
    expect(Object.is(roundTo(-0.001, 2), 0)).toBe(true);
  });

  it("çok büyük sayıları olduğu gibi döndürür", () => {
    expect(roundTo(1e20, 2)).toBe(1e20);
    expect(roundTo(-Number.MAX_VALUE, 0)).toBe(-Number.MAX_VALUE);
  });

  it("15 basamağa kadar kabul eder", () => {
    expect(roundTo(0.1 + 0.2, 15)).toBe(0.3);
  });

  it.each([-1, 16, 1.5, Number.NaN])("decimals %s için INVALID_INPUT fırlatır", (decimals) => {
    const error = expectCode(() => roundTo(1, decimals), "INVALID_INPUT");
    expect(error.details).toMatchObject({ field: "decimals" });
  });

  it("sonlu olmayan değerde NON_FINITE fırlatır", () => {
    expectCode(() => roundTo(Number.POSITIVE_INFINITY, 2), "NON_FINITE");
  });
});
