// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ContributionBars } from "../components/charts/ContributionBars";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import type { ContributionView } from "../lib/calc";
import type { SeriesPoint } from "../lib/series";

afterEach(cleanup);

const points: SeriesPoint[] = [
  { at: "2025-12", personal: 0.4, official: 0.31 },
  { at: "2026-01", personal: 0.42, official: 0.3 },
  { at: "2026-02", personal: 0.45, official: 0.29 },
];

const contributions: ContributionView[] = [
  { key: "konut", label: "Konut", change: 0.4, contribution: 0.2, share: 0.8 },
  { key: "giyim", label: "Giyim", change: -0.1, contribution: -0.05, share: -0.2 },
];

describe("TimeSeriesChart", () => {
  it("başlık, özet, lejant ve grafiği erişilebilir adla gösterir", () => {
    render(<TimeSeriesChart points={points} />);
    const chart = screen.getByRole("img");
    expect(chart.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getByText("Son 5 yılda yıllık enflasyon")).toBeTruthy();
    expect(screen.getByText("Senin sepetin")).toBeTruthy();
    expect(screen.getByText("Resmi TÜFE")).toBeTruthy();
    expect(screen.getByText(/düzeyinden %45,0 düzeyine çıktı/)).toBeTruthy();
  });

  it("uç etiketleri birbirinden uzaksa gösterir", () => {
    render(<TimeSeriesChart points={points} />);
    expect(screen.getByText("Sen %45,0")).toBeTruthy();
    expect(screen.getByText("Resmi %29,0")).toBeTruthy();
  });

  it("uç etiketleri çakışacaksa yığmaz (lejant ve tooltip devralır)", () => {
    render(<TimeSeriesChart points={[{ at: "2026-01", personal: 0.3, official: 0.301 }]} />);
    expect(screen.queryByText(/^Sen %/)).toBeNull();
  });

  it("klavyeyle aylar arasında gezilir; seçili ay aria-valuetext ile okunur", async () => {
    const user = userEvent.setup();
    render(<TimeSeriesChart points={points} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuetext")).toBe("Şubat 2026: sen %45,0, resmi %29,0");
    await user.tab(); // önce başlıktaki "Tablo olarak göster" düğmesi
    await user.tab();
    expect(document.activeElement).toBe(slider);
    await user.keyboard("{ArrowLeft}");
    expect(slider.getAttribute("aria-valuetext")).toBe("Ocak 2026: sen %42,0, resmi %30,0");
    expect(slider.getAttribute("aria-valuenow")).toBe("1");
    await user.keyboard("{Home}");
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    await user.keyboard("{PageDown}");
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
    await user.keyboard("{a}");
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
    await user.tab();
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
  });

  it("fare hareketinde tooltip iki seriyi birden gösterir, çıkınca kaybolur", () => {
    const { container } = render(<TimeSeriesChart points={points} />);
    const overlay = container.querySelector('rect[fill="transparent"]')!;
    fireEvent.pointerMove(overlay, { clientX: 0 });
    expect(screen.getByText("Aralık 2025")).toBeTruthy();
    expect(screen.getByText("%40,0")).toBeTruthy();
    expect(screen.getByText("%31,0")).toBeTruthy();
    fireEvent.pointerLeave(overlay);
    expect(screen.queryByText("Aralık 2025")).toBeNull();
  });

  it("kişisel değer yoksa yalnızca resmi seriyi okur", () => {
    render(<TimeSeriesChart points={[{ at: "2026-01", personal: null, official: 0.3 }]} />);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe(
      "Ocak 2026: resmi %30,0",
    );
  });

  it("tablo görünümüne geçer ve geri döner", async () => {
    const user = userEvent.setup();
    render(
      <TimeSeriesChart points={[...points, { at: "2026-03", personal: null, official: 0.28 }]} />,
    );
    await user.click(screen.getByRole("button", { name: "Tablo olarak göster" }));
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(5); // başlık + 4 ay, yeniden eskiye
    expect(within(rows[1]!).getByText("Mart 2026")).toBeTruthy();
    expect(within(rows[1]!).getByText("—")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Grafik olarak göster" }));
    expect(screen.getByRole("img")).toBeTruthy();
  });
});

describe("ContributionBars", () => {
  it("her grup için çubuk ve uçta işaretli puan değeri çizer", () => {
    const { container } = render(
      <ContributionBars contributions={contributions} summary="Özet." />,
    );
    expect(screen.getByRole("img")).toBeTruthy();
    expect(screen.getByText("Konut")).toBeTruthy();
    expect(container.querySelectorAll("path")).toHaveLength(2);
    expect(screen.getByText(/^20,0\s?puan$/)).toBeTruthy();
    expect(screen.getByText(/^−5,0\s?puan$/)).toBeTruthy();
  });

  it("tablo görünümünde grup değişimini de gösterir", async () => {
    const user = userEvent.setup();
    render(<ContributionBars contributions={contributions} summary="Özet." />);
    await user.click(screen.getByRole("button", { name: "Tablo olarak göster" }));
    const row = within(screen.getByRole("table")).getByText("Giyim").closest("tr")!;
    expect(within(row).getByText("-%10,0")).toBeTruthy();
  });

  it("tüm katkılar sıfırsa da çizilebilir", () => {
    render(
      <ContributionBars
        contributions={[{ key: "gida", label: "Gıda", change: 0, contribution: 0, share: null }]}
        summary="Özet."
      />,
    );
    expect(screen.getByText("Gıda")).toBeTruthy();
  });
});
