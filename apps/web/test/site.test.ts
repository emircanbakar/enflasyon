import { describe, expect, it } from "vitest";
import { serializeJsonLd, sitemapEntries, siteUrl, staticPaths } from "../lib/site";

describe("siteUrl", () => {
  it("önce NEXT_PUBLIC_SITE_URL, sonra Vercel adresi, en son localhost", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://ornek.com" }).origin).toBe("https://ornek.com");
    expect(
      siteUrl({ NEXT_PUBLIC_SITE_URL: " ", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }).origin,
    ).toBe("https://x.vercel.app");
    expect(siteUrl({}).origin).toBe("http://localhost:3000");
  });
});

describe("sitemap", () => {
  it("yalnızca statik sayfaları mutlak URL ile listeler", () => {
    const entries = sitemapEntries(new URL("https://ornek.com"), ["2025", "2026"], "2026-10-17");
    expect(entries.map((e) => e.url)).toEqual([
      "https://ornek.com/",
      "https://ornek.com/nasil-hesapliyoruz",
      "https://ornek.com/enflasyon",
      "https://ornek.com/enflasyon/2025",
      "https://ornek.com/enflasyon/2026",
      "https://ornek.com/gizlilik",
    ]);
    expect(entries.every((e) => e.lastModified === "2026-10-17")).toBe(true);
    expect(staticPaths([]).some((p) => p.startsWith("/sonuc") || p.startsWith("/api"))).toBe(false);
  });
});

describe("serializeJsonLd", () => {
  it("script etiketini erken kapatamaz", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
