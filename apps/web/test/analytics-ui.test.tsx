// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const reported: ((metric: { name: string; value: number }) => void)[] = [];
vi.mock("next/navigation", () => ({ usePathname: () => "/enflasyon/2025" }));
vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (callback: (metric: { name: string; value: number }) => void) => {
    reported.push(callback);
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
  delete window.umami;
});

describe("Analytics", () => {
  it("site kimliği yokken script eklemez ama web vitals'ı kuyruğa alır", async () => {
    const { Analytics } = await import("../components/site/Analytics");
    const { container } = render(<Analytics />);
    expect(container.innerHTML).toBe("");
    const umami = { track: vi.fn() };
    reported.at(-1)?.({ name: "LCP", value: 900 });
    reported.at(-1)?.({ name: "Next.js-render", value: 5 });
    window.umami = umami;
    const { flushAnalytics } = await import("../lib/analytics");
    flushAnalytics();
    expect(umami.track).toHaveBeenCalledWith("web-vitals", {
      metrik: "LCP",
      deger: 900,
      sayfa: "/enflasyon/[yil]",
    });
  });

  it("site kimliği varsa birinci taraf script'i yükler", async () => {
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "5f0b7c1e-3a2d-4c5b-9e8f-1a2b3c4d5e6f");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ornek.com");
    const { Analytics } = await import("../components/site/Analytics");
    render(<Analytics />);
    await vi.waitFor(() => {
      const script = document.querySelector('script[src="/stats/script.js"]');
      expect(script?.getAttribute("data-domains")).toBe("ornek.com");
    });
  });
});
