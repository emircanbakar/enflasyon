import { toIndexSet } from "enflasyon-core";
import { describe, expect, it } from "vitest";
import { DEFAULT_STATE } from "../lib/basket-url";
import type { BasketState } from "../lib/basket-url";
import type { CalculatorData } from "../lib/calc";
import { MAX_OG_QUERY, ogCacheControl, ogModel } from "../lib/og";
import { ogImagePath, resolvedState, shareUrl } from "../lib/share";
import { readJson } from "./data/fixtures";

const groups = readJson("test/data/frozen/cpi-groups.json") as { series: CalculatorData["series"] };
const weights = readJson("test/data/frozen/cpi-weights.json") as Record<
  string,
  CalculatorData["officialWeights"]
>;
const data: CalculatorData = {
  series: groups.series,
  officialWeights: weights["2026"]!,
  officialWeightsYear: "2026",
  firstPeriod: "2020-01",
  lastPeriod: "2026-09",
  attribution: "",
};
const indices = toIndexSet(data.series);
const tl: BasketState = { ...DEFAULT_STATE, values: { konut: 30000, gida: 10000 } };

describe("shareUrl", () => {
  it("varsayılan olarak TL tutarlarını linke koymaz ve hedef ayı açık yazar", () => {
    const url = shareUrl(tl, "https://ornek.com", "2026-09", { includeAmounts: false });
    expect(url).toBe("https://ornek.com/sonuc?v=1&d=y&at=2026-09&w=gida.250~konut.750");
    expect(url).not.toContain("30000");
  });

  it("istenirse tutarları yalnızca fragment'e ekler", () => {
    const url = shareUrl(tl, "https://ornek.com", "2026-09", { includeAmounts: true });
    const [beforeHash, hash] = url.split("#");
    expect(beforeHash).not.toContain("30000");
    expect(hash).toBe("m=tl&s=gida.10000~konut.30000");
  });

  it("seçili ay varsa onu korur", () => {
    expect(resolvedState({ ...tl, at: "2026-06" }, "2026-09").at).toBe("2026-06");
  });
});

describe("ogImagePath", () => {
  it("yalnızca query taşır; story biçimini ekleyebilir", () => {
    expect(ogImagePath(tl, "2026-09")).toBe("/api/og?v=1&d=y&at=2026-09&w=gida.250~konut.750");
    expect(ogImagePath(tl, "2026-09", "story")).toMatch(/&format=story$/);
    expect(ogImagePath(tl, "2026-09")).not.toMatch(/[#]|s=|m=/);
  });
});

describe("ogModel", () => {
  it("geçerli dağılımdan sonuç modeli üretir", () => {
    const model = ogModel("v=1&d=y&at=2026-09&w=konut.700~gida.300", data, indices);
    expect(model).toMatchObject({ kind: "result", from: "2025-09", to: "2026-09" });
    if (model.kind !== "result") throw new Error(model.kind);
    expect(model.official).toBeCloseTo(137.23 / 105.780006 - 1, 12);
    expect(model.top?.label).toBe("Konut");
  });

  it("at yoksa son veri ayını kullanır", () => {
    expect(ogModel("w=gida.1000", data, indices)).toMatchObject({ kind: "result", to: "2026-09" });
  });

  it("tek kalemde en büyük pay satırı yoktur", () => {
    const model = ogModel("w=gida.1000", data, indices);
    expect(model.kind === "result" && model.top).toBeNull();
  });

  it("hazır profil tek başına geçerliyse resmi dağılımdan sonuç üretir", () => {
    const model = ogModel("p=turkiye-ortalamasi", data, indices);
    expect(model).toMatchObject({ kind: "result", from: "2025-09", to: "2026-09" });
  });

  it.each([
    ["boş", ""],
    ["bilinmeyen sürüm", "v=9&w=gida.1000"],
    ["veride olmayan ay", "at=2030-01&w=gida.1000"],
    ["çok uzun", `w=${"gida.1~".repeat(MAX_OG_QUERY)}`],
  ])("%s girdide genel görsel modeline düşer", (_, search) => {
    expect(ogModel(search, data, indices)).toEqual({ kind: "generic", lastPeriod: "2026-09" });
  });
});

describe("ogCacheControl", () => {
  it("hedef ay açıksa süresiz, değilse kısa önbellek", () => {
    expect(ogCacheControl("at=2026-09&w=gida.1000")).toBe("public, max-age=31536000, immutable");
    expect(ogCacheControl("w=gida.1000")).toBe("public, max-age=3600");
  });
});
