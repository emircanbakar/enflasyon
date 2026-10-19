import { EnflasyonError, toIndexSet } from "enflasyon-core";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "../lib/basket-url";
import type { BasketState } from "../lib/basket-url";
import { availableTargets, calculate, periodStart } from "../lib/calc";
import type { CalculatorData } from "../lib/calc";
import { CATEGORY_KEYS } from "../lib/categories";
import { UNEXPECTED_ERROR, userMessage } from "../lib/errors";
import { OFFICIAL_PROFILE_ID, officialProfile } from "../lib/profiles";
import { readJson } from "./data/fixtures";

const groups = readJson("data/cpi-groups.json") as { series: CalculatorData["series"] };
const weights = readJson("data/cpi-weights.json") as Record<
  string,
  CalculatorData["officialWeights"]
>;
const data: CalculatorData = {
  series: groups.series,
  officialWeights: weights["2026"]!,
  officialWeightsYear: "2026",
  firstPeriod: "2020-01",
  lastPeriod: "2026-09",
  attribution: "Kaynak: test.",
};
const indices = toIndexSet(data.series);
const state = (overrides: Partial<BasketState> = {}): BasketState => ({
  ...DEFAULT_STATE,
  ...overrides,
});

describe("periodStart", () => {
  it.each([
    ["y", "2026-09", "2025-09"],
    ["m", "2026-01", "2025-12"],
    ["ytd", "2026-09", "2025-12"],
    ["ytd", "2026-01", "2025-12"],
  ] as const)("%s, %s → %s", (kind, at, expected) => {
    expect(periodStart(kind, at, null, "2020-01")).toBe(expected);
  });

  it("aralıkta başlangıç yoksa ilk veri ayını kullanır", () => {
    expect(periodStart("r", "2026-09", null, "2020-01")).toBe("2020-01");
    expect(periodStart("r", "2026-09", "2023-03", "2020-01")).toBe("2023-03");
  });
});

describe("availableTargets", () => {
  it("yıllıkta ilk hedef ay veri başlangıcından 12 ay sonrasıdır (yeniden eskiye)", () => {
    const targets = availableTargets("y", data);
    expect(targets[0]).toBe("2026-09");
    expect(targets.at(-1)).toBe("2021-01");
  });

  it("aylıkta ve aralıkta ikinci aydan başlar", () => {
    expect(availableTargets("m", data).at(-1)).toBe("2020-02");
    expect(availableTargets("r", data).at(-1)).toBe("2020-02");
  });

  it("yılbaşından beride ilk Aralık'tan sonraki aydan başlar", () => {
    expect(availableTargets("ytd", data).at(-1)).toBe("2021-01");
  });
});

describe("calculate", () => {
  it("boş sepette 'empty' döner", () => {
    expect(calculate(state(), data, indices)).toEqual({ status: "empty" });
  });

  it("resmi ağırlıklarla yıllık sonuç resmi rakama yakın, katkılar etiketli", () => {
    const profile = officialProfile(data.officialWeights, "2026");
    const outcome = calculate(state({ mode: "pct", values: profile.percentages }), data, indices);
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome).toMatchObject({ from: "2025-09", to: "2026-09", singleItem: false });
    expect(outcome.official).toBeCloseTo(137.23 / 105.780006 - 1, 12);
    // weightsAt "to": bugünkü payları deflate eder; resmi rakamdan birkaç puan içinde kalır.
    expect(Math.abs(outcome.personal - outcome.official)).toBeLessThan(0.02);
    expect(outcome.contributions).toHaveLength(13);
    expect(outcome.contributions[0]?.label).toBeTypeOf("string");
  });

  it("tek kalemde sonuç o grubun değişimidir ve not düşülür", () => {
    const outcome = calculate(state({ values: { konut: 25000 } }), data, indices);
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome.singleItem).toBe(true);
    expect(outcome.personal).toBeCloseTo(152.1 / 108.654178 - 1, 12);
    expect(outcome.sharesMeaningful).toBe(true);
  });

  it("zıt işaretli katkılarda pay dili kapatılır", () => {
    // 2026-06 → 2026-07: giyim düştü (116,30 → 111,73), konut arttı.
    const outcome = calculate(
      state({ period: "m", at: "2026-07", values: { giyim: 100, konut: 100 } }),
      data,
      indices,
    );
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome.sharesMeaningful).toBe(false);
  });

  it("aralık döneminde verilen başlangıcı kullanır", () => {
    const outcome = calculate(
      state({ period: "r", from: "2021-01", at: "2026-09", values: { gida: 1 } }),
      data,
      indices,
    );
    expect(outcome).toMatchObject({ status: "ok", from: "2021-01", to: "2026-09" });
  });

  it("veride olmayan ayda Türkçe hata mesajı döner", () => {
    expect(calculate(state({ at: "2030-01", values: { gida: 1 } }), data, indices)).toEqual({
      status: "error",
      message: "Seçilen dönem için henüz veri yok; daha yakın bir ay seç.",
    });
  });

  it("beklenmeyen bir hata veya SHARES_NOT_ONE oluşursa Sentry'ye bildirir", async () => {
    const monitoring = await import("../lib/monitoring");
    const spy = vi.spyOn(monitoring, "reportError").mockImplementation(() => undefined);
    const brokenIndices = { ...indices, genel: { "2026-09": 100 } }; // from ayı yok
    const outcome = calculate(state({ values: { gida: 1 } }), data, brokenIndices);
    expect(outcome.status).toBe("error");
    spy.mockRestore();
  });
});

describe("userMessage", () => {
  it("paket hatalarını Türkçeye çevirir, diğerlerine genel mesaj verir", () => {
    expect(userMessage(new EnflasyonError("EMPTY_BASKET", "x"))).toBe(
      "En az bir harcama kalemi gir.",
    );
    expect(userMessage(new Error("x"))).toBe(UNEXPECTED_ERROR);
  });
});

describe("officialProfile", () => {
  it("resmi ağırlıkları 0,1 adımlı yüzdeye çevirir", () => {
    const profile = officialProfile(data.officialWeights, "2026");
    expect(profile.id).toBe(OFFICIAL_PROFILE_ID);
    expect(Object.keys(profile.percentages)).toEqual([...CATEGORY_KEYS]);
    expect(profile.percentages.lokanta).toBe(11.1);
    expect(profile.description).toContain("2026");
  });
});
