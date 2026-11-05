// @vitest-environment jsdom
import { toIndexSet } from "enflasyon-core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PastAmountTool } from "../components/tools/PastAmountTool";
import { WageTool } from "../components/tools/WageTool";
import type { CalculatorData } from "../lib/calc";
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
// 2026-08 … 2020-01, yeniden eskiye; varsayılan seçim 12. eleman = 2025-09.
const months = Object.keys(data.series.genel ?? {})
  .slice(0, -1)
  .reverse() as CalculatorData["firstPeriod"][];

afterEach(cleanup);

describe("PastAmountTool", () => {
  it("varsayılan olarak bir yıl önceyi seçer ve resmi sonucu gösterir", async () => {
    const user = userEvent.setup();
    render(<PastAmountTool data={data} indices={indices} values={{}} months={months} />);
    expect(screen.getByLabelText<HTMLSelectElement>("Ne zaman?").value).toBe("2025-09");
    expect(screen.getByText("Bir tutar gir.")).toBeTruthy();
    await user.type(screen.getByLabelText("Tutar"), "10.000");
    // 10.000 × 137,23 / 105,780006 = 12.973
    expect(screen.getByText(/12\.973/)).toBeTruthy();
    expect(screen.queryByText(/Senin sepetinle/)).toBeNull();
  });

  it("sepet doluysa önce kişisel sonucu gösterir; ay değişince günceller", async () => {
    const user = userEvent.setup();
    render(<PastAmountTool data={data} indices={indices} values={{ konut: 1 }} months={months} />);
    await user.type(screen.getByLabelText("Tutar"), "10000");
    expect(screen.getByText(/Senin sepetinle bugün/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Ne zaman?"), "2020-01");
    expect(screen.getByText(/Ocak 2020 → Eylül 2026/)).toBeTruthy();
  });

  it("geçersiz tutarda açıklama gösterir", async () => {
    const user = userEvent.setup();
    render(<PastAmountTool data={data} indices={indices} values={{}} months={months} />);
    await user.type(screen.getByLabelText("Tutar"), "on bin");
    expect(screen.getByLabelText("Tutar").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/0 ile 10.000.000 arasında/)).toBeTruthy();
  });
});

describe("WageTool", () => {
  it("maaş enflasyonun gerisinde kaldıysa erimeyi ve gereken maaşı söyler", async () => {
    const user = userEvent.setup();
    render(<WageTool data={data} indices={indices} values={{}} months={months} />);
    expect(screen.getByText("İki maaşı da gir.")).toBeTruthy();
    await user.type(screen.getByLabelText("Zamdan önceki maaş"), "40.000");
    await user.type(screen.getByLabelText("Şimdiki maaş"), "50.000");
    // 1,25 / 1,2973 − 1 = −%3,6; gereken 40.000 × 1,2973 = 51.893
    expect(screen.getByText("Maaşın reel olarak %3,6 eridi.")).toBeTruthy();
    expect(screen.getByText(/maaşın %25,0 arttı, resmi enflasyon %29,7/)).toBeTruthy();
    expect(screen.getByText(/51\.893/)).toBeTruthy();
  });

  it("maaş enflasyondan hızlı arttıysa reel artışı söyler", async () => {
    const user = userEvent.setup();
    render(<WageTool data={data} indices={indices} values={{}} months={months} />);
    await user.type(screen.getByLabelText("Zamdan önceki maaş"), "40000");
    await user.type(screen.getByLabelText("Şimdiki maaş"), "60000");
    expect(screen.getByText(/Maaşın reel olarak %15,6 arttı\./)).toBeTruthy();
  });

  it("maaş düştüyse 'azaldı' der", async () => {
    const user = userEvent.setup();
    render(<WageTool data={data} indices={indices} values={{}} months={months} />);
    await user.type(screen.getByLabelText("Zamdan önceki maaş"), "50000");
    await user.type(screen.getByLabelText("Şimdiki maaş"), "40000");
    expect(screen.getByText(/maaşın %20,0 azaldı/)).toBeTruthy();
  });

  it("sepet doluysa kişisel enflasyonu öne alır, resmi sonucu ikincil verir", async () => {
    const user = userEvent.setup();
    render(<WageTool data={data} indices={indices} values={{ gida: 1 }} months={months} />);
    await user.type(screen.getByLabelText("Zamdan önceki maaş"), "40000");
    await user.type(screen.getByLabelText("Şimdiki maaş"), "50000");
    expect(screen.getByText(/senin enflasyonun %27,6/)).toBeTruthy();
    expect(screen.getByText(/Resmi enflasyona \(%29,7\) göre: maaşın reel olarak/)).toBeTruthy();
  });

  it("maaş enflasyonla aynı arttıysa bunu söyler", async () => {
    const user = userEvent.setup();
    render(<WageTool data={data} indices={indices} values={{}} months={months} />);
    await user.selectOptions(screen.getByLabelText("Zam tarihi"), "2026-08");
    // 2026-08 → 2026-09 genel: 134,75 → 137,23 (%1,84). 10.000 → 10.184 neredeyse aynı.
    await user.type(screen.getByLabelText("Zamdan önceki maaş"), "13475");
    await user.type(screen.getByLabelText("Şimdiki maaş"), "13723");
    expect(screen.getByText("Maaşın enflasyonla aynı hızda arttı.")).toBeTruthy();
  });
});
