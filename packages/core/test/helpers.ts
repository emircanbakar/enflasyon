import { expect } from "vitest";
import { isEnflasyonError } from "../src/errors.js";
import type { EnflasyonError, EnflasyonErrorCode } from "../src/errors.js";

/** `fn`'in verilen kodla `EnflasyonError` fırlattığını doğrular ve hatayı döndürür. */
export function expectCode(fn: () => unknown, code: EnflasyonErrorCode): EnflasyonError {
  try {
    fn();
  } catch (error) {
    if (!isEnflasyonError(error)) throw error;
    expect(error.code).toBe(code);
    return error;
  }
  return expect.fail(`"${code}" hatası bekleniyordu ama fırlatılmadı`);
}

/** Objeyi ve içindeki tüm objeleri dondurur (girdi değişmezliği testleri için). */
export function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
