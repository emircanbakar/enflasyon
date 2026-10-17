/**
 * Telafili (Neumaier / Kahan–Babuška) toplama.
 *
 * Çok sayıda ve farklı büyüklükte değeri toplarken biriken kayan nokta hatasını
 * düzeltir. Sonuç toplama sırasına bağlıdır; deterministik sonuç için çağıran
 * taraf değerleri sabit bir sırada (ör. anahtara göre) vermelidir.
 */
export function safeSum(values: readonly number[]): number {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    const next = sum + value;
    compensation += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    sum = next;
  }
  return sum + compensation;
}
