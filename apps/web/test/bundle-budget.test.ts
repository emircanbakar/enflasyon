import { describe, expect, it } from "vitest";
import { inlineScripts, measure, scriptSources, violations } from "../scripts/bundle-budget";

const page = (...sources: string[]) =>
  [
    ...sources.map((src) => `<script src="${src}" async="" integrity="sha256-x"></script>`),
    `<script src="/_next/static/chunks/polyfill.js" noModule=""></script>`,
    `<script>self.__next_f.push([1,"veri"])</script>`,
  ].join("");

describe("bundle bütçesi", () => {
  it("noModule polyfill'ini saymaz, satır içi yükü ayırır", () => {
    expect(scriptSources(page("/a.js", "/b.js"))).toEqual(["/a.js", "/b.js"]);
    expect(inlineScripts(page("/a.js"))).toBe('self.__next_f.push([1,"veri"])');
  });

  it("tabanda olmayan chunk'ları uygulama JS'i sayar", () => {
    const sizes: Record<string, number> = { "/react.js": 100, "/app.js": 20, "/chart.js": 5 };
    const result = measure(
      page("/react.js", "/app.js", "/chart.js"),
      page("/react.js"),
      (src) => sizes[src] ?? 0,
    );
    expect(result).toMatchObject({ base: 100, app: 25, total: 125 });
    expect(result.inlineData).toBeGreaterThan(0);
  });

  it("aşılan bütçeleri listeler", () => {
    const within = { base: 135, app: 20, total: 155, inlineData: 10 };
    expect(violations(within)).toEqual([]);
    expect(violations({ ...within, app: 60, total: 195 })).toEqual([
      "app: 60.0 KB > bütçe 50 KB",
      "total: 195.0 KB > bütçe 185 KB",
    ]);
  });
});
