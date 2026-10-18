"use client";

import { useId } from "react";
import type { Period } from "enflasyon-core";
import type { PeriodKind } from "@/lib/basket-url";
import { formatMonth } from "@/lib/format";
import { segmentedGroupFull, segmentedInput, segmentedOption, selectClass } from "./segmented";

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

export function PeriodPicker(props: PeriodPickerProps) {
  const { kind, at, from, targets, starts, onKind, onAt, onFrom } = props;
  const atId = useId();
  const fromId = useId();
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Dönem</legend>
        <div className={segmentedGroupFull}>
          {KINDS.map((option) => (
            <label key={option.value} className={segmentedOption}>
              <input
                type="radio"
                name="donem"
                value={option.value}
                checked={kind === option.value}
                onChange={() => {
                  onKind(option.value);
                }}
                className={segmentedInput}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {kind === "r" && (
          <div className="flex items-center gap-2">
            <label htmlFor={fromId} className="text-sm text-[var(--color-muted)]">
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
        <div className="flex items-center gap-2">
          <label htmlFor={atId} className="text-sm text-[var(--color-muted)]">
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
    </div>
  );
}
