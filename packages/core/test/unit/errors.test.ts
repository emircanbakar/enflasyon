import { describe, expect, it } from "vitest";
import { EnflasyonError, isEnflasyonError } from "../../src/errors.js";

describe("EnflasyonError", () => {
  it("kod, mesaj, ad ve ayrıntıları taşır", () => {
    const error = new EnflasyonError("MISSING_PERIOD", "Period not found", { period: "2026-09" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("EnflasyonError");
    expect(error.code).toBe("MISSING_PERIOD");
    expect(error.message).toBe("Period not found");
    expect(error.details).toEqual({ period: "2026-09" });
  });

  it("ayrıntı verilmezse boş obje kullanır", () => {
    expect(new EnflasyonError("EMPTY_BASKET", "Basket is empty").details).toEqual({});
  });

  it("ayrıntıları dondurur ve çağıranın objesini değiştirmez", () => {
    const details = { key: "konut" };
    const error = new EnflasyonError("MISSING_SERIES", "Missing", details);

    expect(Object.isFrozen(error.details)).toBe(true);
    expect(Object.isFrozen(details)).toBe(false);
    expect(error.details).not.toBe(details);
  });
});

describe("isEnflasyonError", () => {
  it("paketin hatasını tanır", () => {
    expect(isEnflasyonError(new EnflasyonError("NO_OVERLAP", "No overlap"))).toBe(true);
  });

  it("başka bir kopyadan gelmiş gibi duran hatayı da tanır (instanceof'a bakmaz)", () => {
    const foreign = Object.assign(new Error("x"), { name: "EnflasyonError", code: "INVALID_KEY" });
    expect(isEnflasyonError(foreign)).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["string", "EnflasyonError"],
    ["sayı", 42],
    ["sıradan Error", new Error("x")],
    ["TypeError", new TypeError("x")],
    ["adı doğru, kodu yok", { name: "EnflasyonError" }],
    ["adı doğru, kodu sayı", { name: "EnflasyonError", code: 1 }],
    ["adı doğru, kodu bilinmiyor", { name: "EnflasyonError", code: "NOPE" }],
    ["kodu doğru, adı farklı", { name: "Error", code: "EMPTY_BASKET" }],
  ])("%s için false döner", (_, value) => {
    expect(isEnflasyonError(value)).toBe(false);
  });
});
