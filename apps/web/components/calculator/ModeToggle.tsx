"use client";

import type { BasketMode } from "@/lib/basket-url";
import { segmentedGroup, segmentedInput, segmentedOption } from "./segmented";

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
    <fieldset className={segmentedGroup}>
      <legend className="sr-only">Harcamaları nasıl gireceksin?</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className={segmentedOption}>
          <input
            type="radio"
            name="giris-modu"
            value={option.value}
            checked={mode === option.value}
            onChange={() => {
              onChange(option.value);
            }}
            className={segmentedInput}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
