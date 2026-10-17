import { describe, expect, it } from "vitest";
import { itemChange } from "../../src/calc/change.js";
import { MAX_SERIES_LENGTH } from "../../src/internal/limits.js";
import { chainSeries } from "../../src/series/chain.js";
import { fromMonthIndex } from "../../src/series/period.js";
import type { IndexSeries } from "../../src/types.js";
import { deepFreeze, expectCode } from "../helpers.js";

/** 2003=100 bazlı eski seri (2024-10 … 2025-01). */
const older: IndexSeries = {
  "2024-10": 2300,
  "2024-11": 2400,
  "2024-12": 2500,
  "2025-01": 2600, // örtüşme sonrası; yok sayılmalı
};

/** 2025=100 bazlı yeni seri, 2024-12'den başlıyor. */
const newer: IndexSeries = {
  "2024-12": 100,
  "2025-01": 104,
  "2025-02": 107,
};

describe("chainSeries", () => {
  it("eski seriyi örtüşme oranıyla yeni baza taşır", () => {
    // k = 100 / 2500 = 0,04
    const chained = chainSeries(older, newer, "2024-12");
    expect(chained["2024-10"]).toBeCloseTo(92, 12);
    expect(chained["2024-11"]).toBeCloseTo(96, 12);
    expect(chained["2024-12"]).toBe(100);
    expect(chained["2025-01"]).toBe(104);
    expect(chained["2025-02"]).toBe(107);
  });

  it("ayları eskiden yeniye sıralı döndürür", () => {
    expect(Object.keys(chainSeries(older, newer, "2024-12"))).toEqual([
      "2024-10",
      "2024-11",
      "2024-12",
      "2025-01",
      "2025-02",
    ]);
  });

  it("örtüşme sonrasında eski serinin değerlerini yok sayar", () => {
    expect(chainSeries(older, newer, "2024-12")["2025-01"]).toBe(104);
  });

  it("yeni serinin örtüşme öncesi aylarını yok sayar", () => {
    const withEarly = { "2024-11": 1, ...newer };
    expect(chainSeries(older, withEarly, "2024-12")["2024-11"]).toBeCloseTo(96, 12);
  });

  it("değişim oranlarını korur: örtüşme öncesi eski seriyle, sonrası yeni seriyle aynı", () => {
    const chained = chainSeries(older, newer, "2024-12");
    expect(itemChange(chained, "2024-10", "2024-12")).toBeCloseTo(
      itemChange(older, "2024-10", "2024-12"),
      14,
    );
    expect(itemChange(chained, "2024-12", "2025-02")).toBe(itemChange(newer, "2024-12", "2025-02"));
  });

  it("baz geçişini aşan değişimi de hesaplanabilir kılar", () => {
    // 2024-11 → 2025-02: (107 / 96) − 1
    expect(itemChange(chainSeries(older, newer, "2024-12"), "2024-11", "2025-02")).toBeCloseTo(
      107 / 96 - 1,
      12,
    );
  });

  it("dondurulmuş, prototipsiz bir seri döndürür ve girdileri değiştirmez", () => {
    const a = deepFreeze({ ...older });
    const b = deepFreeze({ ...newer });
    const chained = chainSeries(a, b, "2024-12");
    expect(Object.isFrozen(chained)).toBe(true);
    expect(Object.getPrototypeOf(chained)).toBeNull();
    expect(a).toEqual(older);
    expect(b).toEqual(newer);
  });

  it("örtüşme ayı serilerden birinde yoksa NO_OVERLAP fırlatır", () => {
    const error = expectCode(() => chainSeries(older, newer, "2024-11"), "NO_OVERLAP");
    expect(error.details).toEqual({ overlap: "2024-11", inOlder: true, inNewer: false });
    expect(
      expectCode(() => chainSeries(older, newer, "2025-02"), "NO_OVERLAP").details,
    ).toMatchObject({ inOlder: false, inNewer: true });
  });

  it("geçersiz örtüşme ayında INVALID_PERIOD fırlatır", () => {
    const error = expectCode(() => chainSeries(older, newer, "2024-13"), "INVALID_PERIOD");
    expect(error.details).toMatchObject({ field: "overlap" });
  });

  it("geçersiz değerlerde hatayı hangi seriden geldiğiyle fırlatır", () => {
    expect(
      expectCode(
        () => chainSeries({ ...older, "2024-12": 0 }, newer, "2024-12"),
        "NON_POSITIVE_INDEX",
      ).details,
    ).toMatchObject({ key: "older" });
    expect(
      expectCode(
        () => chainSeries(older, { ...newer, "2025-02": Number.NaN }, "2024-12"),
        "NON_FINITE",
      ).details,
    ).toMatchObject({ key: "newer", period: "2025-02" });
  });

  it("seri obje değilse INVALID_INPUT fırlatır", () => {
    expectCode(() => chainSeries([] as unknown as IndexSeries, newer, "2024-12"), "INVALID_INPUT");
  });

  it("birleşik seri 1200 ayı aşarsa LIMIT_EXCEEDED fırlatır", () => {
    const build = (start: number, length: number): IndexSeries =>
      Object.fromEntries(Array.from({ length }, (_, i) => [fromMonthIndex(start + i), 100]));
    const t0 = 2000 * 12;
    const a = build(t0 - 700, 701); // örtüşme dahil 701 ay, 700'ü örtüşme öncesi
    const b = build(t0, 501);
    const error = expectCode(() => chainSeries(a, b, fromMonthIndex(t0)), "LIMIT_EXCEEDED");
    expect(error.details).toEqual({ length: MAX_SERIES_LENGTH + 1, limit: MAX_SERIES_LENGTH });
    expect(() => chainSeries(a, build(t0, 500), fromMonthIndex(t0))).not.toThrow();
  });
});
