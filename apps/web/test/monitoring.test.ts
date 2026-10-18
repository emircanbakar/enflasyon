import type { ErrorEvent } from "@sentry/browser";
import { describe, expect, it, vi } from "vitest";
import { createReporter, scrubEvent, scrubUrl } from "../lib/monitoring";

describe("scrubUrl", () => {
  it("query ve fragment'i (sepet, TL tutarları) siler", () => {
    expect(scrubUrl("https://ornek.com/sonuc?w=gida.1000#m=tl&s=gida.5000")).toBe(
      "https://ornek.com/sonuc",
    );
    expect(scrubUrl("/sonuc?w=1#s=2")).toBe("/sonuc");
  });
});

describe("scrubEvent", () => {
  it("adres, referer, breadcrumb ve kullanıcı bilgisini temizler", () => {
    const event = {
      type: undefined,
      request: {
        url: "https://ornek.com/?w=gida.1000#s=gida.5000",
        query_string: "w=gida.1000",
        cookies: { a: "b" },
        headers: { Referer: "https://ornek.com/?w=1", "User-Agent": "x" },
      },
      breadcrumbs: [{ message: "x" }],
      user: { ip_address: "1.2.3.4" },
    } as ErrorEvent;
    expect(scrubEvent(event)).toEqual({
      type: undefined,
      request: { url: "https://ornek.com/", headers: { "User-Agent": "x" } },
    });
  });

  it("isteği olmayan olayı bozmaz", () => {
    expect(scrubEvent({ type: undefined })).toEqual({ type: undefined });
  });
});

function fakeSentry() {
  return { init: vi.fn(), captureException: vi.fn(() => "id") };
}

describe("createReporter", () => {
  it("DSN yoksa SDK'yı hiç yüklemez", () => {
    const load = vi.fn(() => Promise.resolve(fakeSentry()));
    createReporter(undefined, load)(new Error("x"));
    expect(load).not.toHaveBeenCalled();
  });

  it("ilk hatada SDK'yı bir kez yükler, gizlilik ayarlarıyla başlatır ve hataları gönderir", async () => {
    const sentry = fakeSentry();
    const load = vi.fn(() => Promise.resolve(sentry));
    const report = createReporter("https://k@o1.ingest.sentry.io/1", load);
    report(new Error("bir"));
    report(new Error("iki"));
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledTimes(2);
    });
    expect(load).toHaveBeenCalledTimes(1);
    const options = sentry.init.mock.calls[0]?.[0] as {
      sendDefaultPii: boolean;
      integrations: (d: { name: string }[]) => { name: string }[];
      beforeBreadcrumb: () => null;
    };
    expect(options.sendDefaultPii).toBe(false);
    expect(options.beforeBreadcrumb()).toBeNull();
    expect(
      options
        .integrations([{ name: "GlobalHandlers" }, { name: "Breadcrumbs" }, { name: "Dedupe" }])
        .map((i) => i.name),
    ).toEqual(["Dedupe"]);
  });

  it("sayfa başına en fazla 10 hata gönderir, yükleme başarısızsa sessiz kalır", async () => {
    const sentry = fakeSentry();
    const report = createReporter("dsn", () => Promise.resolve(sentry));
    for (let i = 0; i < 15; i++) report(new Error(String(i)));
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledTimes(10);
    });

    const failing = createReporter("dsn", () => Promise.reject(new Error("ağ")));
    expect(() => {
      failing(new Error("x"));
    }).not.toThrow();
  });
});
