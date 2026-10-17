"use client";

import { useId } from "react";
import type { Period } from "enflasyon-core";
import type { PeriodKind } from "@/lib/basket-url";
import { formatMonth } from "@/lib/format";

interface PeriodPickerProps {
  readonly kind: PeriodKind;
  readonly at: Period;
  readonly from: Period | null;
  /** Seçilen dönem tipiyle hesaplanabilen hedef aylar (yeniden eskiye). */
  readonly targets: readonly Period[];
  /** Aralık başlangıcı için seçilebilecek aylar (eskiden yeniye). */
  readonly starts: readonly Period[];
  readonly onKind: (kind: PeriodKind) => void;
  readonly onAt: (at: Period) => void;
  readonly onFrom: (from: Period) => void;
}

const KINDS: readonly { readonly value: PeriodKind; readonly label: string }[] = [
  { value: "y", label: "Yıllık" },
  { value: "m", label: "Aylık" },
  { value: "ytd", label: "Yılbaşından beri" },
  { value: "r", label: "Aralık" },
];

const selectClass =
  "h-11 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2";

export function PeriodPicker(props: PeriodPickerProps) {
  const { kind, at, from, targets, starts, onKind, onAt, onFrom } = props;
  const atId = useId();
  const fromId = useId();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 text-sm text-[var(--color-muted)]">Dönem</legend>
        {KINDS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-line)] px-3 has-[:checked]:border-[var(--color-accent)] has-[:checked]:font-medium"
          >
            <input
              type="radio"
              name="donem"
              value={option.value}
              checked={kind === option.value}
              onChange={() => {
                onKind(option.value);
              }}
              className="accent-[var(--color-accent)]"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {kind === "r" && (
        <div className="flex flex-col">
          <label htmlFor={fromId} className="mb-1 text-sm text-[var(--color-muted)]">
            Başlangıç
          </label>
          <select
            id={fromId}
            value={from ?? ""}
            onChange={(event) => {
              onFrom(event.target.value as Period);
            }}
            className={selectClass}
          >
            {starts
              .filter((p) => p < at)
              .map((p) => (
                <option key={p} value={p}>
                  {formatMonth(p)}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="flex flex-col">
        <label htmlFor={atId} className="mb-1 text-sm text-[var(--color-muted)]">
          {kind === "r" ? "Bitiş" : "Ay"}
        </label>
        <select
          id={atId}
          value={at}
          onChange={(event) => {
            onAt(event.target.value as Period);
          }}
          className={selectClass}
        >
          {targets.map((p) => (
            <option key={p} value={p}>
              {formatMonth(p)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
