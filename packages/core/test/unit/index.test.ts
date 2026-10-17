import { describe, expect, it } from "vitest";
import * as api from "../../src/index.js";

describe("public API", () => {
  it("yalnızca belgelenmiş değerleri dışa açar", () => {
    // Yeni bir export eklemek bilinçli bir karar olmalı: bu liste ve docs/core.md birlikte güncellenir.
    expect(Object.keys(api).sort()).toEqual([
      "EnflasyonError",
      "addMonths",
      "availablePeriods",
      "isEnflasyonError",
      "isPeriod",
      "normalizeBasket",
    ]);
  });
});
