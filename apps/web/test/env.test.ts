import { describe, expect, it } from "vitest";
import { findLeakedSecrets, parsePublicEnv, parseServerEnv } from "../lib/env/schema";

describe("parsePublicEnv", () => {
  it("boş ortamı kabul eder (tüm değerler opsiyonel)", () => {
    expect(parsePublicEnv({})).toEqual({});
  });

  it("geçerli değerleri döndürür, boş string'i yok sayar", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SITE_URL: "https://ornek.com",
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: "5f0b7c1e-3a2d-4c5b-9e8f-1a2b3c4d5e6f",
        NEXT_PUBLIC_SENTRY_DSN: "",
      }),
    ).toEqual({
      NEXT_PUBLIC_SITE_URL: "https://ornek.com",
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: "5f0b7c1e-3a2d-4c5b-9e8f-1a2b3c4d5e6f",
    });
  });

  it("Umami kimliği UUID değilse reddeder", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: "ornek.com" })).toThrow();
  });

  it("ilgisiz değişkenleri sonuca taşımaz", () => {
    expect(parsePublicEnv({ PATH: "/usr/bin", NODE_ENV: "production" })).toEqual({});
  });

  it.each(["ornek.com", "javascript:alert(1)", "ftp://ornek.com"])(
    "geçersiz site URL'sini (%s) reddeder",
    (url) => {
      expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: url })).toThrow();
    },
  );

  it("gizli görünen bir değer NEXT_PUBLIC_ önekiyle tanımlanmışsa build'i durdurur", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_EVDS_API_KEY: "x" })).toThrow(
      /NEXT_PUBLIC_EVDS_API_KEY/,
    );
  });
});

describe("findLeakedSecrets", () => {
  it("KEY/TOKEN/SECRET/PASSWORD ile biten public değişkenleri bulur", () => {
    expect(
      findLeakedSecrets({
        NEXT_PUBLIC_API_KEY: "",
        NEXT_PUBLIC_SENTRY_AUTH_TOKEN: "",
        NEXT_PUBLIC_DB_PASSWORD: "",
        NEXT_PUBLIC_SITE_URL: "",
        EVDS_API_KEY: "",
      }),
    ).toEqual(["NEXT_PUBLIC_API_KEY", "NEXT_PUBLIC_DB_PASSWORD", "NEXT_PUBLIC_SENTRY_AUTH_TOKEN"]);
  });

  it("public olmayan gizli değerleri sorun saymaz", () => {
    expect(findLeakedSecrets({ EVDS_API_KEY: "x", SENTRY_AUTH_TOKEN: "y" })).toEqual([]);
  });
});

describe("parseServerEnv", () => {
  it("anahtar yokken de çalışır (uygulama çalışırken EVDS gerekmez)", () => {
    expect(parseServerEnv({})).toEqual({});
  });

  it("değerleri kırpar ve boş değerleri yok sayar", () => {
    expect(parseServerEnv({ EVDS_API_KEY: "  abc  ", SENTRY_AUTH_TOKEN: " " })).toEqual({
      EVDS_API_KEY: "abc",
    });
  });
});
