"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

export default function ErrorPage({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Bir şeyler ters gitti</h1>
      <p className="text-[var(--color-muted)]">
        Sayfa beklenmedik bir hatayla karşılaştı. Girdiğin tutarlar adres çubuğunda duruyor; tekrar
        denediğinde kaybolmaz.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-md border border-[var(--color-line)] px-4 font-medium"
      >
        Tekrar dene
      </button>
    </div>
  );
}
