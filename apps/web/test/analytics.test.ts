// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushAnalytics, track, umamiScriptProps, vitalsEvent } from "../lib/analytics";

afterEach(() => {
  delete window.umami;
  flushAnalytics();
});

describe("track", () => {
  it("script yüklüyse olayı verisiyle gönderir", () => {
    const umami = { track: vi.fn() };
    window.umami = umami;
    track({ name: "hesap-tamamlandi", data: { donem: "y", mod: "tl" } });
    track({ name: "link-kopyalandi" });
    expect(umami.track.mock.calls).toEqual([
      ["hesap-tamamlandi", { donem: "y", mod: "tl" }],
      ["link-kopyalandi", undefined],
    ]);
  });

  it("script yüklenmeden gelen olayları bekletir, yüklenince gönderir (en fazla 20)", () => {
    for (let i = 0; i < 25; i++) track({ name: "paylasildi" });
    flushAnalytics(); // script yokken hiçbir şey yapmaz
    const umami = { track: vi.fn() };
    window.umami = umami;
    flushAnalytics();
    expect(umami.track).toHaveBeenCalledTimes(20);
    flushAnalytics();
    expect(umami.track).toHaveBeenCalledTimes(20);
  });

  it("analitik hatası uygulamayı bozmaz", () => {
    window.umami = {
      track: () => {
        throw new Error("engellendi");
      },
    };
    expect(() => {
      track({ name: "story-indirildi" });
    }).not.toThrow();
  });
});

describe("vitalsEvent", () => {
  it("değeri yuvarlar, yıl sayfalarını tek grupta toplar", () => {
    expect(vitalsEvent({ name: "LCP", value: 1234.56 }, "/enflasyon/2025")).toEqual({
      name: "web-vitals",
      data: { metrik: "LCP", deger: 1235, sayfa: "/enflasyon/[yil]" },
    });
    expect(vitalsEvent({ name: "CLS", value: 0.01234 }, "/")).toMatchObject({
      data: { deger: 0.012, sayfa: "/" },
    });
  });

  it("izlenmeyen metrikleri yok sayar", () => {
    expect(vitalsEvent({ name: "Next.js-hydration", value: 10 }, "/")).toBeNull();
  });
});

describe("umamiScriptProps", () => {
  it("site kimliği yoksa script yüklenmez", () => {
    expect(umamiScriptProps(undefined, "ornek.com")).toBeNull();
  });

  it("birinci taraf adresten yükler, query ve fragment'i dışarıda bırakır", () => {
    expect(umamiScriptProps("id-1", "ornek.com")).toEqual({
      src: "/stats/script.js",
      "data-website-id": "id-1",
      "data-host-url": "/stats",
      "data-exclude-search": "true",
      "data-exclude-hash": "true",
      "data-do-not-track": "true",
      "data-domains": "ornek.com",
    });
    expect(umamiScriptProps("id-1", undefined)).not.toHaveProperty("data-domains");
  });
});
