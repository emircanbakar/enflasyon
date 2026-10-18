"use client";

import { useId, useState } from "react";
import { parseValueInput } from "@/lib/basket-state";
import type { BasketMode } from "@/lib/basket-url";
import type { Category } from "@/lib/categories";

interface BasketRowProps {
  readonly category: Category;
  readonly mode: BasketMode;
  readonly value: number | undefined;
  readonly onChange: (value: number | null) => void;
}

const tlFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const pctFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

function display(value: number | undefined, mode: BasketMode): string {
  if (value === undefined) return "";
  return mode === "tl" ? tlFormatter.format(value) : pctFormatter.format(value);
}

/**
 * Tek harcama grubu satırı. Kullanıcının yazdığı metin (ör. "59," veya "25.0")
 * yarım haliyle korunur; yalnızca geçerli bir değere dönüştüğünde durum güncellenir.
 * Dışarıdan değer değişirse (profil, mod değişimi, URL) metin yeniden kurulur.
 */
export function BasketRow({ category, mode, value, onChange }: BasketRowProps) {
  const id = useId();
  const [draft, setDraft] = useState(() => display(value, mode));
  const [synced, setSynced] = useState({ value, mode });
  const [invalid, setInvalid] = useState(false);

  // Prop değiştiğinde taslağı güncelle (React'in "prop değişince state ayarla" kalıbı).
  if (synced.value !== value || synced.mode !== mode) {
    setSynced({ value, mode });
    const parsed = parseValueInput(draft, mode);
    if (parsed === "invalid" || (parsed ?? undefined) !== value || synced.mode !== mode) {
      setDraft(display(value, mode));
      setInvalid(false);
    }
  }

  const hintId = `${id}-ipucu`;
  const errorId = `${id}-hata`;
  const unit = mode === "tl" ? "₺" : "%";

  return (
    <div className="border-b border-[var(--color-line)] py-2.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 shrink">
          <label htmlFor={id} className="font-medium">
            {category.label}
          </label>
          <p id={hintId} className="truncate text-sm text-[var(--color-muted)]">
            {category.hint}
          </p>
        </div>
        <span aria-hidden="true" className="leader hidden sm:block" />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <input
            id={id}
            type="text"
            inputMode={mode === "tl" ? "numeric" : "decimal"}
            autoComplete="off"
            value={draft}
            placeholder="0"
            aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
            aria-invalid={invalid}
            onChange={(event) => {
              const text = event.target.value;
              setDraft(text);
              const parsed = parseValueInput(text, mode);
              if (parsed === "invalid") {
                setInvalid(true);
                return;
              }
              setInvalid(false);
              onChange(parsed);
            }}
            className="figures h-11 w-32 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-right text-base transition-colors placeholder:text-[var(--color-rule)] hover:border-[var(--color-rule)] focus:bg-[var(--color-card)] aria-[invalid=true]:border-[var(--color-danger)]"
          />
          <span aria-hidden="true" className="figures w-4 text-[var(--color-muted)]">
            {unit}
          </span>
        </div>
      </div>
      {invalid && (
        <p id={errorId} className="mt-1 text-sm text-[var(--color-danger)]">
          {mode === "tl"
            ? "0 ile 10.000.000 arasında bir tutar gir (ör. 25.000)."
            : "0 ile 100 arasında bir yüzde gir (ör. 12,5)."}
        </p>
      )}
    </div>
  );
}
