import { describe, expect, it } from "vitest";
import { safeSum } from "../../src/internal/math.js";

describe("safeSum", () => {
  it("boş listede 0 döner", () => {
    expect(safeSum([])).toBe(0);
  });

  it("sıradan toplamayı yapar", () => {
    expect(safeSum([1, 2, 3.5])).toBe(6.5);
  });

  it("naif toplamanın kaybettiği küçük değerleri korur", () => {
    const values = [1e16, 1, -1e16];
    expect(values.reduce((a, b) => a + b, 0)).toBe(0); // naif toplama 1'i kaybeder
    expect(safeSum(values)).toBe(1);
  });

  it("önce küçük sonra büyük değer geldiğinde de telafi eder", () => {
    expect(safeSum([1, 1e100, 1, -1e100])).toBe(2);
  });

  it("0,1'i on kez toplamada tam 1 verir", () => {
    const tenths = Array.from({ length: 10 }, () => 0.1);
    expect(tenths.reduce((a, b) => a + b, 0)).not.toBe(1);
    expect(safeSum(tenths)).toBe(1);
  });
});
