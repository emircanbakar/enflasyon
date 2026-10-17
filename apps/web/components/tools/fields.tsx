"use client";

import { useId, useState } from "react";
import type { Period } from "enflasyon-core";
import { parseValueInput } from "@/lib/basket-state";
import { formatMonth } from "@/lib/format";

const inputClass =
  "h-11 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 aria-[invalid=true]:border-[var(--color-danger)]";

interface MoneyInputProps {
  readonly label: string;
  readonly onChange: (value: number | null) => void;
}

/** TL tutarı alanı: "25.000" gibi Türkçe binlik ayırıcıyı kabul eder, geçersizde açıklama gösterir. */
export function MoneyInput({ label, onChange }: MoneyInputProps) {
  const id = useId();
  const errorId = `${id}-hata`;
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-[var(--color-muted)]">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={text}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => {
            setText(event.target.value);
            const parsed = parseValueInput(event.target.value, "tl");
            setInvalid(parsed === "invalid");
            onChange(parsed === "invalid" ? null : parsed);
          }}
          className={`${inputClass} text-right tabular-nums`}
        />
        <span aria-hidden="true" className="w-4 text-[var(--color-muted)]">
          ₺
        </span>
      </div>
      {invalid && (
        <p id={errorId} className="text-sm text-[var(--color-danger)]">
          0 ile 10.000.000 arasında bir tutar gir.
        </p>
      )}
    </div>
  );
}

interface MonthSelectProps {
  readonly label: string;
  readonly value: Period;
  /** Yeniden eskiye. */
  readonly options: readonly Period[];
  readonly onChange: (value: Period) => void;
}

export function MonthSelect({ label, value, options, onChange }: MonthSelectProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-[var(--color-muted)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value as Period);
        }}
        className={inputClass}
      >
        {options.map((p) => (
          <option key={p} value={p}>
            {formatMonth(p)}
          </option>
        ))}
      </select>
    </div>
  );
}
