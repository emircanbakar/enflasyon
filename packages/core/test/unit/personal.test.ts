import { describe, expect, it } from "vitest";
import { personalInflation, ZERO_RATE_EPSILON } from "../../src/calc/personal.js";
import type { IndexSeries, IndexSet, PersonalInflationInput } from "../../src/types.js";
import { deepFreeze, expectCode } from "../helpers.js";

/**
 * Elle hesaplanmış örnek (2025-09 → 2026-09):
 *   konut: 100 → 150  (%50)
 *   gida:  100 → 125  (%25)
 *   genel: 100 → 130  (%30)
 *   ulasim: 100 → 90  (−%10)
 */
const indices: IndexSet = {
  konut: { "2025-09": 100, "2026-09": 150 },
  gida: { "2025-09": 100, "2026-09": 125 },
  genel: { "2025-09": 100, "2026-09": 130 },
  ulasim: { "2025-09": 100, "2026-09": 90 },
};

const input = (overrides: Partial<PersonalInflationInput> = {}): PersonalInflationInput => ({
  basket: { mode: "share", items: { konut: 0.6, gida: 0.4 } },
  indices,
  from: "2025-09",
  to: "2026-09",
  ...overrides,
});

/** Tip sistemini bilerek atlatan girdi (JS veya JSON'dan gelen çağrıları taklit eder). */
const raw = (value: unknown): PersonalInflationInput => value as PersonalInflationInput;

describe("personalInflation: elle hesaplanmış örnekler", () => {
  it("0,6 × %50 + 0,4 × %25 = %40", () => {
    const result = personalInflation(input());

    expect(result.rate).toBeCloseTo(0.4, 15);
    expect(result.from).toBe("2025-09");
    expect(result.to).toBe("2026-09");
    expect(result.contributions).toHaveLength(2);

    const [konut, gida] = result.contributions;
    expect(konut).toMatchObject({ key: "konut", weight: 0.6, usedFallback: false });
    expect(konut?.change).toBeCloseTo(0.5, 15);
    expect(konut?.contribution).toBeCloseTo(0.3, 15);
    expect(konut?.share).toBeCloseTo(0.75, 15);
    expect(gida).toMatchObject({ key: "gida", weight: 0.4, usedFallback: false });
    expect(gida?.contribution).toBeCloseTo(0.1, 15);
    expect(gida?.share).toBeCloseTo(0.25, 15);
  });

  it("tutar moduyla aynı sonucu verir (30.000 + 20.000 TL)", () => {
    const result = personalInflation(
      input({ basket: { mode: "amount", items: { konut: 30000, gida: 20000 } } }),
    );
    expect(result.rate).toBeCloseTo(0.4, 15);
  });

  it("weightsAt: 'to' payları geriye taşır: 1 / (0,6/1,5 + 0,4/1,25) − 1 = 7/18", () => {
    const result = personalInflation(input({ weightsAt: "to" }));

    expect(result.rate).toBeCloseTo(7 / 18, 15);
    const konut = result.contributions.find((c) => c.key === "konut");
    expect(konut?.weight).toBeCloseTo(5 / 9, 15);
    expect(konut?.contribution).toBeCloseTo(5 / 18, 15);
  });

  it("weightsAt: 'from' açıkça verilince varsayılanla aynı sonucu verir", () => {
    expect(personalInflation(input({ weightsAt: "from" }))).toEqual(personalInflation(input()));
  });

  it("tek kalemde sonuç o kalemin değişimidir", () => {
    const result = personalInflation(input({ basket: { mode: "amount", items: { gida: 500 } } }));
    expect(result.rate).toBeCloseTo(0.25, 15);
    expect(result.contributions[0]?.share).toBe(1);
  });
});

describe("personalInflation: katkı payı (share)", () => {
  it("from === to ise oran 0 ve tüm paylar null", () => {
    const result = personalInflation(input({ from: "2026-09", to: "2026-09" }));
    expect(result.rate).toBe(0);
    for (const c of result.contributions) {
      expect(c.change).toBe(0);
      expect(c.contribution).toBe(0);
      expect(c.share).toBeNull();
    }
  });

  it("artış ve düşüş birbirini götürünce oran ~0 ve paylar null", () => {
    // 0,5 × %10 + 0,5 × −%10 = 0; kayan noktada 5.5e-17 çıkar, pay yine null olmalı
    const result = personalInflation({
      basket: { mode: "share", items: { a: 0.5, b: 0.5 } },
      indices: { a: { "2026-01": 100, "2026-02": 110 }, b: { "2026-01": 100, "2026-02": 90 } },
      from: "2026-01",
      to: "2026-02",
    });
    expect(Math.abs(result.rate)).toBeLessThan(ZERO_RATE_EPSILON);
    expect(result.contributions.map((c) => c.share)).toEqual([null, null]);
  });

  it("zıt işaretli katkılarda pay 0..1 dışına çıkar ama toplamı 1 kalır", () => {
    // 0,5 × %50 + 0,5 × −%10 = %20 → konut payı 0,25 / 0,2 = 1,25, ulaşım −0,25
    const result = personalInflation(
      input({ basket: { mode: "share", items: { konut: 0.5, ulasim: 0.5 } } }),
    );
    expect(result.rate).toBeCloseTo(0.2, 15);
    const shares = Object.fromEntries(result.contributions.map((c) => [c.key, c.share]));
    expect(shares["konut"]).toBeCloseTo(1.25, 14);
    expect(shares["ulasim"]).toBeCloseTo(-0.25, 14);
  });
});

describe("personalInflation: sıfıra yakın oran eşiği", () => {
  const twoItems = (end: number): PersonalInflationInput => ({
    basket: { mode: "share", items: { a: 0.5, b: 0.5 } },
    indices: { a: { "2026-01": 1, "2026-02": 1 + end }, b: { "2026-01": 1, "2026-02": 1 } },
    from: "2026-01",
    to: "2026-02",
  });

  it("eşiğin hemen üstündeki oranda payları hesaplar", () => {
    const result = personalInflation(twoItems(4 * ZERO_RATE_EPSILON));
    expect(result.rate).toBeGreaterThanOrEqual(ZERO_RATE_EPSILON);
    expect(result.contributions.every((c) => c.share !== null)).toBe(true);
  });
});

describe("personalInflation: sıralama ve değişmezlik", () => {
  it("katkıları mutlak değere göre büyükten küçüğe sıralar", () => {
    // konut 0,2 × %50 = 0,10 · gida 0,3 × %25 = 0,075 · ulasim 0,5 × −%10 = −0,05
    const result = personalInflation(
      input({ basket: { mode: "share", items: { gida: 0.3, konut: 0.2, ulasim: 0.5 } } }),
    );
    expect(result.contributions.map((c) => c.key)).toEqual(["konut", "gida", "ulasim"]);
  });

  it("eşit katkıda anahtara göre sıralar", () => {
    const result = personalInflation({
      basket: { mode: "amount", items: { b: 1, a: 1, c: 1 } },
      indices: {
        a: { "2026-01": 100, "2026-02": 110 },
        b: { "2026-01": 100, "2026-02": 110 },
        c: { "2026-01": 100, "2026-02": 110 },
      },
      from: "2026-01",
      to: "2026-02",
    });
    expect(result.contributions.map((c) => c.key)).toEqual(["a", "b", "c"]);
  });

  it("derin dondurulmuş girdiyle çalışır ve dondurulmuş sonuç döndürür", () => {
    const result = personalInflation(deepFreeze(input()));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.contributions)).toBe(true);
    for (const c of result.contributions) expect(Object.isFrozen(c)).toBe(true);
  });

  it("sepette olmayan serileri yok sayar", () => {
    const result = personalInflation(input());
    expect(result.contributions.map((c) => c.key).sort()).toEqual(["gida", "konut"]);
  });
});

describe("personalInflation: eksik seri ve yedek seri", () => {
  const withEgitim = input({ basket: { mode: "share", items: { konut: 0.5, egitim: 0.5 } } });

  it("varsayılan olarak MISSING_SERIES fırlatır", () => {
    const error = expectCode(() => personalInflation(withEgitim), "MISSING_SERIES");
    expect(error.details).toEqual({ key: "egitim" });
  });

  it("onMissing: 'error' açıkça verilince de fırlatır", () => {
    expectCode(
      () => personalInflation({ ...withEgitim, onMissing: "error", fallbackKey: "genel" }),
      "MISSING_SERIES",
    );
  });

  it("fallback ile eksik kalemi yedek seriyle hesaplar ve işaretler", () => {
    const result = personalInflation({
      ...withEgitim,
      onMissing: "fallback",
      fallbackKey: "genel",
    });
    // 0,5 × %50 + 0,5 × %30 = %40
    expect(result.rate).toBeCloseTo(0.4, 15);
    const egitim = result.contributions.find((c) => c.key === "egitim");
    expect(egitim).toMatchObject({ usedFallback: true });
    expect(egitim?.change).toBeCloseTo(0.3, 15);
    expect(result.contributions.find((c) => c.key === "konut")?.usedFallback).toBe(false);
  });

  it("yedek serinin kendisi yoksa MISSING_SERIES fırlatır", () => {
    const error = expectCode(
      () => personalInflation({ ...withEgitim, onMissing: "fallback", fallbackKey: "yok" }),
      "MISSING_SERIES",
    );
    expect(error.details).toEqual({ key: "yok", missingFor: "egitim" });
  });

  it("yedek seride ay eksikse hata yedek serinin anahtarını gösterir", () => {
    const error = expectCode(
      () =>
        personalInflation({
          ...withEgitim,
          indices: { ...indices, genel: { "2026-09": 130 } },
          onMissing: "fallback",
          fallbackKey: "genel",
        }),
      "MISSING_PERIOD",
    );
    expect(error.details).toEqual({ key: "genel", period: "2025-09" });
  });

  it("indices'in prototipindeki anahtarı seri saymaz", () => {
    const inherited = Object.assign(Object.create({ egitim: indices["genel"] }) as IndexSet, {
      konut: indices["konut"],
    });
    expectCode(
      () => personalInflation({ ...withEgitim, indices: inherited }),
      "INVALID_INPUT", // prototipi olan obje düz obje değildir
    );
  });
});

describe("personalInflation: girdi doğrulaması", () => {
  it.each([null, "x", 1, []])("girdi %j ise INVALID_INPUT fırlatır", (value) => {
    expectCode(() => personalInflation(raw(value)), "INVALID_INPUT");
  });

  it.each([null, [], new Map(), "konut"])("indices %j ise INVALID_INPUT fırlatır", (value) => {
    expectCode(() => personalInflation(input({ indices: raw(value) as never })), "INVALID_INPUT");
  });

  it("seri obje değilse INVALID_INPUT fırlatır ve kalemi belirtir", () => {
    const error = expectCode(
      () =>
        personalInflation(
          input({ indices: { ...indices, konut: [1, 2] as unknown as IndexSeries } }),
        ),
      "INVALID_INPUT",
    );
    expect(error.details).toEqual({ key: "konut" });
  });

  it.each([
    ["onMissing", { onMissing: "skip" }],
    ["weightsAt", { weightsAt: "today" }],
    ["fallbackKey eksik", { onMissing: "fallback" }],
    ["fallbackKey boş", { onMissing: "fallback", fallbackKey: "" }],
    ["fallbackKey sayı", { onMissing: "fallback", fallbackKey: 1 }],
  ])("geçersiz seçenek (%s) için INVALID_INPUT fırlatır", (_, options) => {
    expectCode(() => personalInflation(raw({ ...input(), ...options })), "INVALID_INPUT");
  });

  it("geçersiz dönemde INVALID_PERIOD, ters sırada PERIOD_ORDER fırlatır", () => {
    expectCode(() => personalInflation(input({ to: "2026-13" })), "INVALID_PERIOD");
    expectCode(() => personalInflation(input({ from: "2026-09", to: "2025-09" })), "PERIOD_ORDER");
  });

  it("sepet hatalarını normalizeBasket'ten iletir", () => {
    expectCode(
      () => personalInflation(input({ basket: { mode: "amount", items: {} } })),
      "EMPTY_BASKET",
    );
  });
});
