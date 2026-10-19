// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Calculator } from "../components/calculator/Calculator";
import type { CalculatorData } from "../lib/calc";
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
  attribution: "Kaynak: TÜİK Veri Portalı.",
};

/** Bir sonraki animasyon karesini bekler (URL yazımı rAF ile yapılır). */
const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      }),
  );

const resultRegion = () => screen.getByRole("region", { name: "Sonuç" });

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);

describe("Calculator", () => {
  it("boş sepette yönlendirme metni gösterir ve URL'i kirletmez", async () => {
    render(<Calculator data={data} />);
    await nextFrame();
    expect(within(resultRegion()).getByText(/Bir harcama kalemi gir/)).toBeTruthy();
    expect(window.location.search).toBe("");
  });

  it("tutar girilince sonucu hesaplar, tek kalem notunu gösterir ve URL'i günceller", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    await user.type(screen.getByLabelText("Konut"), "25.000");
    const region = resultRegion();
    // Konut, 2025-09 → 2026-09: 152,10 / 108,654178 − 1 = %39,99
    expect(within(region).getByText("%40,0")).toBeTruthy();
    expect(within(region).getByText(/Tek kalem girdin/)).toBeTruthy();
    await nextFrame();
    expect(window.location.search).toBe("?v=1&d=y&w=konut.1000");
    expect(window.location.hash).toBe("#m=tl&s=konut.25000");
  });

  it("geçersiz girdide alanı işaretler ve açıklama gösterir", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    const input = screen.getByLabelText("Gıda");
    await user.type(input, "abc");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/0 ile 10.000.000 arasında/)).toBeTruthy();
  });

  it("Türkiye ortalaması profiliyle doldurur; sonuç resmi rakama yakın çıkar", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    await user.click(screen.getByRole("button", { name: /Türkiye ortalaması ile doldur/ }));
    expect(
      screen
        .getByRole("button", { name: /Türkiye ortalaması seçili/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Resmi ağırlıklar (toplam 99,97) tam 100'e normalize edilir: 24,44 → 24,5.
    expect(screen.getByLabelText<HTMLInputElement>("Gıda").value).toBe("24,5");
    expect(screen.queryByText(/Toplam %/)).toBeNull();
    const region = resultRegion();
    expect(within(region).getByText(/Resmi:/)).toBeTruthy();
    expect(within(region).getByText("%29,7")).toBeTruthy(); // resmi yıllık
  });

  it("yüzde toplamı 100 değilse uyarır ve 100'e tamamlar", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    await user.click(screen.getByLabelText("Yüzde (%)"));
    await user.type(screen.getByLabelText("Gıda"), "60");
    await user.type(screen.getByLabelText("Konut"), "60");
    expect(screen.getByText(/Toplam %120, fazla/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "100'e tamamla" }));
    expect(screen.getByLabelText<HTMLInputElement>("Gıda").value).toBe("50");
    expect(screen.queryByText(/Toplam %/)).toBeNull();
  });

  it("TL'den yüzdeye geçince dağılımı korur", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    await user.type(screen.getByLabelText("Konut"), "30000");
    await user.type(screen.getByLabelText("Gıda"), "10000");
    await user.click(screen.getByLabelText("Yüzde (%)"));
    expect(screen.getByLabelText<HTMLInputElement>("Konut").value).toBe("75");
    expect(screen.getByLabelText<HTMLInputElement>("Gıda").value).toBe("25");
  });

  it("paylaşılan linki açınca sepeti ve dönemi URL'den yükler", async () => {
    window.history.replaceState(null, "", "/?v=1&d=m&at=2026-01&w=gida.1000#m=tl&s=gida.5000");
    render(<Calculator data={data} />);
    await nextFrame();
    expect(screen.getByLabelText<HTMLInputElement>("Gıda").value).toBe("5.000");
    expect(screen.getByLabelText<HTMLInputElement>("Aylık").checked).toBe(true);
    expect(within(resultRegion()).getByText(/Aralık 2025 → Ocak 2026/)).toBeTruthy();
  });

  it("bozuk linkte bilgi bandı gösterir", async () => {
    window.history.replaceState(null, "", "/?v=9&w=gida.1000");
    render(<Calculator data={data} />);
    await nextFrame();
    expect(screen.getByText(/Linkteki sepet okunamadı/)).toBeTruthy();
  });

  it("dönem ve ay seçimi sonucu değiştirir; aralıkta başlangıç seçilebilir", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    await user.type(screen.getByLabelText("Gıda"), "100");
    await user.click(screen.getByLabelText("Yılbaşından beri"));
    expect(within(resultRegion()).getByText(/Aralık 2025 → Eylül 2026/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Ay"), "2026-06");
    expect(within(resultRegion()).getByText(/Aralık 2025 → Haziran 2026/)).toBeTruthy();
    await user.click(screen.getByLabelText("Aralık"));
    await user.selectOptions(screen.getByLabelText("Başlangıç"), "2023-01");
    expect(within(resultRegion()).getByText(/Ocak 2023 → Haziran 2026/)).toBeTruthy();
  });

  it("sepeti temizler", async () => {
    const user = userEvent.setup();
    render(<Calculator data={data} />);
    await user.type(screen.getByLabelText("Gıda"), "100");
    await user.click(screen.getByRole("button", { name: "Sepeti temizle" }));
    expect(screen.getByLabelText<HTMLInputElement>("Gıda").value).toBe("");
    expect(within(resultRegion()).getByText(/Bir harcama kalemi gir/)).toBeTruthy();
  });

  it("profil parametresiyle açılınca sepeti o profille doldurur", async () => {
    window.history.replaceState(null, "", "/?p=turkiye-ortalamasi");
    render(<Calculator data={data} />);
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: /Türkiye ortalaması seçili/ })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });
    expect(screen.getByLabelText<HTMLInputElement>("Gıda").value).toBe("24,5");
    expect(within(resultRegion()).getByText("%29,1")).toBeTruthy();
    expect(within(resultRegion()).getByText("%29,7")).toBeTruthy(); // resmi yıllık
  });
});
