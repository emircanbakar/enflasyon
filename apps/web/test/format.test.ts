import { describe, expect, it } from "vitest";
import { compareRates, formatMonth, formatPercent, formatPoints, formatTry } from "../lib/format";

const NBSP = " ";

describe("formatPercent", () => {
  it.each<[number, string]>([
    [0.4812, "%48,1"],
    [0.318, "%31,8"],
    [0, "%0,0"],
    [1.2345, "%123,5"],
    [-0.05, "-%5,0"],
    // Sıfıra yuvarlanan negatif değer işaretsiz görünür
    [-0.0001, "%0,0"],
    // Kayan nokta düzeltmesi: %10,05 yarımın altında saklanır, yine de yukarı yuvarlanır
    [0.10045, "%10,0"],
  ])("formatPercent(%s) === %s", (rate, expected) => {
    expect(formatPercent(rate)).toBe(expected);
  });

  it("basamak sayısı verilebilir", () => {
    expect(formatPercent(0.481234, 2)).toBe("%48,12");
    expect(formatPercent(0.4812, 0)).toBe("%48");
  });
});

describe("formatPoints / compareRates", () => {
  it("farkı işaretsiz, 'puan' kelimesiyle yazar", () => {
    expect(formatPoints(0.163)).toBe(`16,3${NBSP}puan`);
    expect(formatPoints(-0.163)).toBe(`16,3${NBSP}puan`);
  });

  it("kişisel oran yüksekse 'yüksek' der", () => {
    expect(compareRates(0.481, 0.318)).toEqual({ points: `16,3${NBSP}puan`, direction: "yüksek" });
  });

  it("kişisel oran düşükse 'düşük' der", () => {
    expect(compareRates(0.25, 0.318).direction).toBe("düşük");
  });

  it("gösterilen basamakta fark yoksa 'eşit' der", () => {
    expect(compareRates(0.3182, 0.318)).toEqual({ points: `0,0${NBSP}puan`, direction: "eşit" });
  });
});

describe("formatTry", () => {
  it.each<[number, string]>([
    [29624, `29.624${NBSP}₺`],
    [29624.5, `29.625${NBSP}₺`],
    [1234567, `1.234.567${NBSP}₺`],
    [0, `0${NBSP}₺`],
  ])("formatTry(%s) === %s", (amount, expected) => {
    expect(formatTry(amount)).toBe(expected);
  });
});

describe("formatMonth", () => {
  it.each([
    ["2026-09", "Eylül 2026"],
    ["2026-01", "Ocak 2026"],
    ["2025-12", "Aralık 2025"],
    ["2026-08", "Ağustos 2026"],
  ] as const)("formatMonth(%s) === %s", (period, expected) => {
    expect(formatMonth(period)).toBe(expected);
  });
});
