import { describe, expect, it } from "vitest";
import { isEnflasyonError } from "../../src/errors.js";
import {
  addMonths,
  assertPeriod,
  assertPeriodOrder,
  availablePeriods,
  comparePeriods,
  fromMonthIndex,
  isPeriod,
  monthsBetween,
  toMonthIndex,
} from "../../src/series/period.js";
import type { IndexSeries, Period } from "../../src/types.js";
import { expectCode } from "../helpers.js";

describe("isPeriod", () => {
  it.each(["2026-01", "2026-09", "2026-12", "1000-01", "9999-12"])("%s geçerli", (value) => {
    expect(isPeriod(value)).toBe(true);
  });

  it.each([
    "2026-13",
    "2026-00",
    "2026-1",
    "26-01",
    "0999-12",
    "2026/01",
    "2026-01-01",
    " 2026-01",
    "2026-01\n",
    "",
  ])("%j geçersiz", (value) => {
    expect(isPeriod(value)).toBe(false);
  });

  it.each([null, undefined, 202601, {}, ["2026-01"]])("string olmayan %j geçersiz", (value) => {
    expect(isPeriod(value)).toBe(false);
  });
});

describe("assertPeriod", () => {
  it("geçerli dönemi aynen döndürür", () => {
    expect(assertPeriod("2026-09")).toBe("2026-09");
  });

  it("geçersizde alan adını ayrıntıya yazar", () => {
    try {
      assertPeriod("2026-13", "to");
      expect.fail("hata bekleniyordu");
    } catch (error) {
      expect(isEnflasyonError(error) && error.details).toEqual({ field: "to", value: "2026-13" });
    }
  });

  it("alan adı verilmezse 'period' kullanır", () => {
    try {
      assertPeriod("x");
      expect.fail("hata bekleniyordu");
    } catch (error) {
      expect(isEnflasyonError(error) && error.details["field"]).toBe("period");
    }
  });
});

describe("toMonthIndex / fromMonthIndex", () => {
  it("yıl × 12 + ay − 1 hesaplar", () => {
    expect(toMonthIndex("2026-01")).toBe(2026 * 12);
    expect(toMonthIndex("2026-12")).toBe(2026 * 12 + 11);
  });

  it("geri çevirirken ayı iki haneye tamamlar", () => {
    expect(fromMonthIndex(2026 * 12)).toBe("2026-01");
    expect(fromMonthIndex(2026 * 12 + 11)).toBe("2026-12");
  });

  it("geçersiz dönemde INVALID_PERIOD fırlatır", () => {
    expectCode(() => toMonthIndex("2026-13"), "INVALID_PERIOD");
  });

  it.each([1000 * 12 - 1, 9999 * 12 + 12, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "aralık dışı veya tam sayı olmayan %s için INVALID_PERIOD fırlatır",
    (index) => {
      expectCode(() => fromMonthIndex(index), "INVALID_PERIOD");
    },
  );
});

describe("addMonths", () => {
  it.each<[Period, number, Period]>([
    ["2026-09", 0, "2026-09"],
    ["2026-09", 1, "2026-10"],
    ["2025-12", 1, "2026-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-09", -12, "2025-09"],
    ["2026-09", -24, "2024-09"],
    ["2026-09", 27, "2028-12"],
  ])("addMonths(%s, %i) === %s", (period, months, expected) => {
    expect(addMonths(period, months)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "%s ay için NON_FINITE fırlatır",
    (months) => {
      expectCode(() => addMonths("2026-09", months), "NON_FINITE");
    },
  );

  it("tam sayı olmayan ay için INVALID_PERIOD fırlatır", () => {
    expectCode(() => addMonths("2026-09", 1.5), "INVALID_PERIOD");
  });

  it("geçersiz başlangıç dönemi için INVALID_PERIOD fırlatır", () => {
    expectCode(() => addMonths("2026-13", 1), "INVALID_PERIOD");
  });

  it("sonuç 9999-12 sonrasına taşarsa INVALID_PERIOD fırlatır", () => {
    expectCode(() => addMonths("9999-12", 1), "INVALID_PERIOD");
  });
});

describe("comparePeriods / monthsBetween / assertPeriodOrder", () => {
  it("dönemleri karşılaştırır", () => {
    expect(comparePeriods("2025-12", "2026-01")).toBeLessThan(0);
    expect(comparePeriods("2026-01", "2026-01")).toBe(0);
    expect(comparePeriods("2026-02", "2026-01")).toBeGreaterThan(0);
  });

  it("aradaki ay sayısını işaretli döndürür", () => {
    expect(monthsBetween("2025-09", "2026-09")).toBe(12);
    expect(monthsBetween("2026-09", "2025-09")).toBe(-12);
    expect(monthsBetween("2026-09", "2026-09")).toBe(0);
  });

  it("from ≤ to ise sessiz kalır", () => {
    expect(() => {
      assertPeriodOrder("2025-09", "2026-09");
    }).not.toThrow();
    expect(() => {
      assertPeriodOrder("2026-09", "2026-09");
    }).not.toThrow();
  });

  it("from > to ise PERIOD_ORDER fırlatır", () => {
    expectCode(() => {
      assertPeriodOrder("2026-10", "2026-09");
    }, "PERIOD_ORDER");
  });
});

describe("availablePeriods", () => {
  it("dönemleri eskiden yeniye sıralar", () => {
    const series: IndexSeries = { "2026-02": 102, "2025-12": 100, "2026-01": 101 };
    expect(availablePeriods(series)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("boş seride boş liste döndürür", () => {
    expect(availablePeriods({})).toEqual([]);
  });

  it("girdiyi değiştirmez", () => {
    const series = Object.freeze({ "2026-02": 102, "2026-01": 101 });
    expect(() => availablePeriods(series)).not.toThrow();
  });

  it("geçersiz anahtarda INVALID_PERIOD fırlatır", () => {
    const series = { "2026-01": 100, "2026-13": 101 } as IndexSeries;
    expectCode(() => availablePeriods(series), "INVALID_PERIOD");
  });

  it("1200 aya kadar kabul eder, fazlasında LIMIT_EXCEEDED fırlatır", () => {
    const build = (length: number): IndexSeries =>
      Object.fromEntries(Array.from({ length }, (_, i) => [fromMonthIndex(1900 * 12 + i), 100]));

    expect(availablePeriods(build(1200))).toHaveLength(1200);
    expectCode(() => availablePeriods(build(1201)), "LIMIT_EXCEEDED");
  });
});
