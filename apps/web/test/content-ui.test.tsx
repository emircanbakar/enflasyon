// @vitest-environment jsdom
import { toIndexSet } from "enflasyon-core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JsonLd } from "../components/JsonLd";
import { Formula, Prose } from "../components/content/Prose";
import { YearReport } from "../components/content/YearReport";
import { SiteFooter } from "../components/site/SiteFooter";
import { SiteHeader } from "../components/site/SiteHeader";
import { yearSummary } from "../lib/years";
import type { WeightsByYear } from "../lib/years";
import { readJson } from "./data/fixtures";

const groups = readJson("data/cpi-groups.json") as {
  series: Record<string, Record<string, number>>;
};
const weights = readJson("data/cpi-weights.json") as WeightsByYear;
const indices = toIndexSet(groups.series);
const years = ["2021", "2022", "2023", "2024", "2025", "2026"];

afterEach(cleanup);

describe("YearReport", () => {
  it("tamamlanmış yılı tablolar ve yıl gezintisiyle gösterir", () => {
    render(
      <YearReport
        summary={yearSummary("2025", indices, weights)!}
        years={years}
        attribution="Kaynak: TÜİK."
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "2025 enflasyonu" })).toBeTruthy();
    expect(screen.getByText("Yıllık (Aralık'tan Aralık'a)").nextSibling?.textContent).toBe("%30,9");
    const [monthly, byGroup] = screen.getAllByRole("table");
    expect(within(monthly!).getAllByRole("row")).toHaveLength(13);
    expect(within(monthly!).getByRole("rowheader", { name: "Aralık 2025" })).toBeTruthy();
    expect(within(byGroup!).getAllByRole("row")).toHaveLength(14);
    const nav = screen.getByRole("navigation", { name: "Diğer yıllar" });
    expect(within(nav).getByRole("link", { name: "← 2024" }).getAttribute("href")).toBe(
      "/enflasyon/2024",
    );
    expect(within(nav).getByRole("link", { name: "2026 →" }).getAttribute("href")).toBe(
      "/enflasyon/2026",
    );
    expect(
      screen.getByRole("link", { name: "Kendi enflasyonunu hesapla" }).getAttribute("href"),
    ).toBe("/");
  });

  it("devam eden yılda notu ve yıllık kutusunu gösterir, ilk yılda geri linki yoktur", () => {
    const { unmount } = render(
      <YearReport summary={yearSummary("2026", indices, weights)!} years={years} attribution="" />,
    );
    expect(screen.getByText(/Yıl devam ediyor/)).toBeTruthy();
    expect(screen.getByText("Yıllık (Eylül 2026)")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /→$/ })).toBeNull();
    unmount();

    render(<YearReport summary={yearSummary("2021", indices, {})!} years={years} attribution="" />);
    expect(screen.queryByRole("link", { name: /^←/ })).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("verisi kısa olan yılda 12 aylık ortalama ve eksik yıllık değerler gösterilmez", () => {
    // 2024-03'ten 2025-03'e: Ocak ve Şubat için 12 ay öncesi yok, 24 aylık pencere de yok.
    const series: Record<string, number> = {};
    for (let i = 0; i < 13; i++) {
      series[new Date(Date.UTC(2024, 2 + i, 1)).toISOString().slice(0, 7)] = 100 + i;
    }
    const short = toIndexSet({ genel: series, gida: series });
    render(
      <YearReport summary={yearSummary("2025", short, {})!} years={["2025"]} attribution="" />,
    );
    expect(screen.queryByText("12 aylık ortalama")).toBeNull();
    expect(screen.getByRole("row", { name: /Ocak 2025/ }).textContent).toContain("—");
  });
});

describe("site çerçevesi", () => {
  it("üst menü ve altbilgi linkleri", () => {
    render(
      <>
        <SiteHeader />
        <SiteFooter lastPeriod="2026-09" attribution="Kaynak: TÜİK Veri Portalı." />
      </>,
    );
    expect(screen.getByRole("navigation", { name: "Ana menü" })).toBeTruthy();
    expect(
      screen.getByText(/Son veri: Eylül 2026\. Girdiğin tutarlar tarayıcında kalır/),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Gizlilik" }).getAttribute("href")).toBe("/gizlilik");
  });

  it("JSON-LD'yi kaçışlı olarak gömer", () => {
    const { container } = render(<JsonLd data={{ name: "<b>x</b>" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toBe('{"name":"\\u003cb>x\\u003c/b>"}');
  });

  it("metin düzeni ve formül bloğu", () => {
    render(
      <Prose>
        <Formula label="Kişisel enflasyon">π = Σ wᵢ × rᵢ</Formula>
      </Prose>,
    );
    expect(screen.getByRole("article")).toBeTruthy();
    expect(screen.getByRole("article").querySelector("figcaption")?.textContent).toBe(
      "Kişisel enflasyon",
    );
    expect(screen.getByText("π = Σ wᵢ × rᵢ")).toBeTruthy();
  });
});
