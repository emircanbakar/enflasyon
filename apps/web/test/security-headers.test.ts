import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "../lib/security-headers";

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split("; ").map((part) => {
      const [name = "", ...sources] = part.split(" ");
      return [name, sources];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  const prod = directives(contentSecurityPolicy({ isDev: false }));

  it("varsayılan olarak sadece kendi origin'ine izin verir", () => {
    expect(prod.get("default-src")).toEqual(["'self'"]);
    expect(prod.get("connect-src")).toEqual(["'self'"]);
    expect(prod.get("font-src")).toEqual(["'self'"]);
  });

  it("gömülmeyi, eklentileri ve base/form yönlendirmesini kapatır", () => {
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'self'"]);
    expect(prod.get("form-action")).toEqual(["'self'"]);
  });

  it("üretimde eval'a izin vermez ve HTTPS'e yükseltir", () => {
    expect(prod.get("script-src")).not.toContain("'unsafe-eval'");
    expect(prod.has("upgrade-insecure-requests")).toBe(true);
  });

  it("Next.js'in satır içi script'leri için 'unsafe-inline' içerir (bilinçli karar)", () => {
    expect(prod.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("geliştirmede eval'a izin verir, HTTPS yükseltmesi yapmaz", () => {
    const dev = directives(contentSecurityPolicy({ isDev: true }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(dev.has("upgrade-insecure-requests")).toBe(false);
  });

  it("verilen dış origin'leri yalnızca connect-src'ye ekler", () => {
    const csp = directives(
      contentSecurityPolicy({ isDev: false, connectOrigins: ["https://plausible.io"] }),
    );
    expect(csp.get("connect-src")).toEqual(["'self'", "https://plausible.io"]);
    expect(csp.get("script-src")).not.toContain("https://plausible.io");
  });
});

describe("securityHeaders", () => {
  const headers = new Map(securityHeaders({ isDev: false }).map((h) => [h.key, h.value]));

  it("tüm beklenen başlıkları üretir", () => {
    expect([...headers.keys()].sort()).toEqual([
      "Content-Security-Policy",
      "Cross-Origin-Opener-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
    ]);
  });

  it("HSTS iki yıl, alt alan adları dahil ve preload'a uygun", () => {
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("referrer'da query string (sepet) dış sitelere gitmez", () => {
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("kamera, mikrofon ve konumu kapatır", () => {
    const policy = headers.get("Permissions-Policy") ?? "";
    for (const feature of ["camera=()", "microphone=()", "geolocation=()"]) {
      expect(policy).toContain(feature);
    }
  });
});
