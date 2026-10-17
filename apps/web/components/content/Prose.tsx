import type { ReactNode } from "react";

/** İçerik sayfalarının ortak metin düzeni (Tailwind typography eklentisi olmadan). */
export function Prose({ children }: { readonly children: ReactNode }) {
  return (
    <article className="space-y-5 leading-relaxed [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5">
      {children}
    </article>
  );
}

/** Formül bloğu: görsel olarak öne çıkar, ekran okuyucuya düz metin olarak okunur. */
export function Formula({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <figure className="rounded-lg bg-[var(--color-card)] px-4 py-3">
      <p className="font-mono text-sm break-words">{children}</p>
      <figcaption className="mt-1 text-sm text-[var(--color-muted)]">{label}</figcaption>
    </figure>
  );
}
