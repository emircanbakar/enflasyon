export default function HomePage() {
  return (
    <section aria-labelledby="baslik" className="space-y-4">
      <h1 id="baslik" className="text-4xl font-semibold tracking-tight">
        Resmi enflasyon herkes için aynı. Seninki değil.
      </h1>
      <p className="text-lg text-[var(--color-muted)]">
        Harcamalarını gir, resmi fiyat endekslerini senin dağılımına göre ağırlıklandıralım. Hesap
        tamamen tarayıcında yapılır; girdiğin tutarlar hiçbir sunucuya gönderilmez.
      </p>
      <p className="text-sm text-[var(--color-muted)]">Hesaplayıcı yapım aşamasında.</p>
    </section>
  );
}
