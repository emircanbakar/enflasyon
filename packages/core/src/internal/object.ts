/** Düz obje mi (`{}` veya `Object.create(null)`)? Dizi, `Map`, `Date` ve sınıf örnekleri değildir. */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
