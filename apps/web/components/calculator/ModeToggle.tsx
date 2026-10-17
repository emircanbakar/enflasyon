"use client";

import type { BasketMode } from "@/lib/basket-url";

interface ModeToggleProps {
  readonly mode: BasketMode;
  readonly onChange: (mode: BasketMode) => void;
}

const OPTIONS: readonly { readonly value: BasketMode; readonly label: string }[] = [
  { value: "tl", label: "Tutar (₺)" },
  { value: "pct", label: "Yüzde (%)" },
];

/** TL / yüzde giriş modu; yerel radio grubu (klavye ve ekran okuyucu desteği hazır gelir). */
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">Harcamaları nasıl gireceksin?</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-line)] px-3 has-[:checked]:border-[var(--color-accent)] has-[:checked]:font-medium"
        >
          <input
            type="radio"
            name="giris-modu"
            value={option.value}
            checked={mode === option.value}
            onChange={() => {
              onChange(option.value);
            }}
            className="accent-[var(--color-accent)]"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
