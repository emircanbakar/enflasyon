import { describe, expect, it } from "vitest";
import { normalizeBasket, SHARE_TOLERANCE } from "../../src/basket/normalize.js";
import { assertSafeKey, compareKeys, validateBasket } from "../../src/basket/validate.js";
import { MAX_BASKET_ITEMS } from "../../src/internal/limits.js";
import { safeSum } from "../../src/internal/math.js";
import type { Basket } from "../../src/types.js";
import { deepFreeze, expectCode } from "../helpers.js";

/** Tip sistemini bilerek atlatan girdiler (JS veya JSON'dan gelen çağrıları taklit eder). */
const raw = (value: unknown): Basket => value as Basket;

const amount = (items: Record<string, number>): Basket => ({ mode: "amount", items });
const share = (items: Record<string, number>): Basket => ({ mode: "share", items });

describe("normalizeBasket: amount modu", () => {
  it("tutarları toplamı 1 olan paylara çevirir", () => {
    expect(normalizeBasket(amount({ konut: 30000, gida: 10000 }))).toEqual({
      gida: 0.25,
      konut: 0.75,
    });
  });

  it("README örneğindeki payları üretir", () => {
    const weights = normalizeBasket(amount({ konut: 25000, gida: 12000, ulastirma: 5000 }));
    expect(weights["konut"]).toBeCloseTo(25 / 42, 12);
    expect(weights["gida"]).toBeCloseTo(12 / 42, 12);
    expect(weights["ulastirma"]).toBeCloseTo(5 / 42, 12);
  });

  it("tek kalemde payı 1 yapar", () => {
    expect(normalizeBasket(amount({ konut: 123.45 }))).toEqual({ konut: 1 });
  });

  it("değeri 0 olan kalemleri sonuçtan çıkarır", () => {
    expect(normalizeBasket(amount({ konut: 100, gida: 0, egitim: -0 }))).toEqual({ konut: 1 });
  });

  it("toplamı 100 olmayan yüzdeleri göreli tutar gibi ölçekler", () => {
    expect(normalizeBasket(amount({ konut: 60, gida: 52 }))).toEqual({
      gida: 52 / 112,
      konut: 60 / 112,
    });
  });

  it("çok büyük tutarlarda taşma olmadan çalışır", () => {
    const weights = normalizeBasket(amount({ a: Number.MAX_VALUE, b: Number.MAX_VALUE }));
    expect(weights).toEqual({ a: 0.5, b: 0.5 });
  });

  it("çok küçük tutarlarda da çalışır", () => {
    expect(normalizeBasket(amount({ a: 5e-324, b: 5e-324 }))).toEqual({ a: 0.5, b: 0.5 });
  });
});

describe("normalizeBasket: share modu", () => {
  it("toplamı tam 1 olan payları kabul eder", () => {
    expect(normalizeBasket(share({ konut: 0.5, gida: 0.3, ulastirma: 0.2 }))).toEqual({
      gida: 0.3,
      konut: 0.5,
      ulastirma: 0.2,
    });
  });

  it("tolerans içindeki sapmayı (0,9999999) yeniden normalize eder", () => {
    const weights = normalizeBasket(share({ konut: 0.5, gida: 0.4999999 }));
    expect(safeSum(Object.values(weights))).toBeCloseTo(1, 15);
    expect(weights["konut"]).toBeCloseTo(0.5 / 0.9999999, 15);
  });

  it("toleransı aşan toplamda (0,98) SHARES_NOT_ONE fırlatır", () => {
    const error = expectCode(
      () => normalizeBasket(share({ konut: 0.5, gida: 0.48 })),
      "SHARES_NOT_ONE",
    );
    expect(error.details["total"]).toBeCloseTo(0.98, 12);
    expect(error.details["tolerance"]).toBe(SHARE_TOLERANCE);
  });

  it("1'i aşan toplamda (1,1) SHARES_NOT_ONE fırlatır", () => {
    expectCode(() => normalizeBasket(share({ konut: 0.6, gida: 0.5 })), "SHARES_NOT_ONE");
  });

  it("yüzde gibi girilmiş payları (60 + 40) reddeder", () => {
    expectCode(() => normalizeBasket(share({ konut: 60, gida: 40 })), "SHARES_NOT_ONE");
  });
});

describe("normalizeBasket: dönüş değeri", () => {
  it("dondurulmuş, prototipsiz ve anahtarları sıralı bir obje döndürür", () => {
    const weights = normalizeBasket(amount({ ulastirma: 1, konut: 1, gida: 1 }));
    expect(Object.isFrozen(weights)).toBe(true);
    expect(Object.getPrototypeOf(weights)).toBeNull();
    expect(Object.keys(weights)).toEqual(["gida", "konut", "ulastirma"]);
  });

  it("derin dondurulmuş girdiyle çalışır ve girdiyi değiştirmez", () => {
    const basket = deepFreeze(amount({ konut: 3, gida: 1 }));
    expect(normalizeBasket(basket)).toEqual({ gida: 0.25, konut: 0.75 });
    expect(basket.items).toEqual({ konut: 3, gida: 1 });
  });
});

describe("normalizeBasket: hatalar", () => {
  it("boş sepette EMPTY_BASKET fırlatır", () => {
    expectCode(() => normalizeBasket(amount({})), "EMPTY_BASKET");
  });

  it("tüm değerler 0 ise EMPTY_BASKET fırlatır", () => {
    expectCode(() => normalizeBasket(amount({ konut: 0, gida: 0 })), "EMPTY_BASKET");
  });

  it("share modunda tüm değerler 0 ise de EMPTY_BASKET fırlatır", () => {
    expectCode(() => normalizeBasket(share({ konut: 0 })), "EMPTY_BASKET");
  });

  it("negatif değerde NEGATIVE_VALUE fırlatır ve kalemi belirtir", () => {
    const error = expectCode(
      () => normalizeBasket(amount({ konut: 100, gida: -1 })),
      "NEGATIVE_VALUE",
    );
    expect(error.details).toEqual({ key: "gida", value: -1 });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "%s değerinde NON_FINITE fırlatır",
    (value) => {
      expectCode(() => normalizeBasket(amount({ konut: 100, gida: value })), "NON_FINITE");
    },
  );
});

describe("validateBasket: yapı ve güvenlik", () => {
  it.each([
    ["null", null],
    ["string", "konut=100"],
    ["sayı", 1],
  ])("sepet %s ise INVALID_INPUT fırlatır", (_, value) => {
    expectCode(() => validateBasket(raw(value)), "INVALID_INPUT");
  });

  it.each([undefined, "amounts", "pct", 1])("bilinmeyen mod %j için INVALID_INPUT", (mode) => {
    expectCode(() => validateBasket(raw({ mode, items: {} })), "INVALID_INPUT");
  });

  it.each([
    ["eksik", undefined],
    ["null", null],
    ["dizi", [100, 200]],
    ["Map", new Map([["konut", 100]])],
    ["Date", new Date(0)],
  ])("items %s ise INVALID_INPUT fırlatır", (_, items) => {
    expectCode(() => validateBasket(raw({ mode: "amount", items })), "INVALID_INPUT");
  });

  it("prototipsiz items objesini kabul eder", () => {
    const items = Object.assign(Object.create(null) as Record<string, number>, { konut: 1 });
    expect(validateBasket(amount(items))).toEqual([{ key: "konut", value: 1 }]);
  });

  it.each([
    ["string", "100"],
    ["null", null],
    ["boolean", true],
    ["bigint", 100n],
  ])("değer %s ise INVALID_INPUT fırlatır", (_, value) => {
    const error = expectCode(
      () => validateBasket(raw({ mode: "amount", items: { konut: value } })),
      "INVALID_INPUT",
    );
    expect(error.details).toEqual({ key: "konut" });
  });

  it("JSON'dan gelen __proto__ anahtarını INVALID_KEY ile reddeder", () => {
    const items = JSON.parse('{"konut": 100, "__proto__": 5}') as Record<string, number>;
    expectCode(() => normalizeBasket(amount(items)), "INVALID_KEY");
    expect(({} as Record<string, unknown>)["konut"]).toBeUndefined(); // kirlilik yok
  });

  it.each(["constructor", "prototype", ""])("%j anahtarını INVALID_KEY ile reddeder", (key) => {
    expectCode(() => normalizeBasket(amount({ konut: 1, [key]: 1 })), "INVALID_KEY");
  });

  it("500 kaleme kadar kabul eder, fazlasında LIMIT_EXCEEDED fırlatır", () => {
    const build = (n: number): Basket =>
      amount(Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${String(i)}`, 1])));

    expect(Object.keys(normalizeBasket(build(MAX_BASKET_ITEMS)))).toHaveLength(MAX_BASKET_ITEMS);
    const error = expectCode(() => normalizeBasket(build(MAX_BASKET_ITEMS + 1)), "LIMIT_EXCEEDED");
    expect(error.details).toEqual({ length: MAX_BASKET_ITEMS + 1, limit: MAX_BASKET_ITEMS });
  });

  it("kalemleri anahtara göre sıralı döndürür ve -0'ı 0 yapar", () => {
    const entries = validateBasket(amount({ b: 2, a: -0, c: 3 }));
    expect(entries.map((e) => e.key)).toEqual(["a", "b", "c"]);
    expect(Object.is(entries[0]?.value, 0)).toBe(true);
  });
});

describe("assertSafeKey / compareKeys", () => {
  it("sıradan anahtarı kabul eder", () => {
    expect(() => {
      assertSafeKey("konut");
    }).not.toThrow();
  });

  it("anahtarları yerel ayardan bağımsız, kod birimine göre sıralar", () => {
    expect(["ı", "i", "Z", "a", "ç"].sort(compareKeys)).toEqual(["Z", "a", "i", "ç", "ı"]);
    expect(compareKeys("a", "a")).toBe(0);
  });
});
