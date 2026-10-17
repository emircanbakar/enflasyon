"use client";

import type { Dispatch } from "react";
import { percentTotal } from "@/lib/basket-state";
import type { BasketAction } from "@/lib/basket-state";
import type { BasketState } from "@/lib/basket-url";
import { CATEGORIES } from "@/lib/categories";
import type { Profile } from "@/lib/profiles";
import { BasketRow } from "./BasketRow";
import { ModeToggle } from "./ModeToggle";
import { ProfilePicker } from "./ProfilePicker";

interface BasketFormProps {
  readonly state: BasketState;
  readonly dispatch: Dispatch<BasketAction>;
  readonly profile: Profile;
}

const pct = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export function BasketForm({ state, dispatch, profile }: BasketFormProps) {
  const total = percentTotal(state.values);
  const hasValues = Object.keys(state.values).length > 0;

  return (
    <section aria-labelledby="sepet-baslik" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sepet-baslik" className="text-xl font-semibold">
          Aylık harcamaların
        </h2>
        <ModeToggle
          mode={state.mode}
          onChange={(mode) => {
            dispatch({ type: "setMode", mode });
          }}
        />
      </div>

      <ProfilePicker
        profile={profile}
        active={state.profile === profile.id}
        onApply={() => {
          dispatch({ type: "applyProfile", profile });
        }}
      />

      {state.mode === "pct" && hasValues && total !== 100 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-line)] p-3 text-sm"
        >
          <p>
            Toplam %{pct.format(total)}, {total > 100 ? "fazla" : "eksik"}. Sonuç girdiğin oranlara
            göre ölçeklendi.
          </p>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "normalize" });
            }}
            className="min-h-11 rounded-md border border-[var(--color-line)] px-3 font-medium"
          >
            100'e tamamla
          </button>
        </div>
      )}

      <div className="divide-y divide-[var(--color-line)]">
        {[...CATEGORIES.values()].map((category) => (
          <BasketRow
            key={category.key}
            category={category}
            mode={state.mode}
            value={state.values[category.key]}
            onChange={(value) => {
              dispatch({ type: "setValue", key: category.key, value });
            }}
          />
        ))}
      </div>

      {hasValues && (
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "reset" });
          }}
          className="min-h-11 text-sm text-[var(--color-muted)] underline underline-offset-4"
        >
          Sepeti temizle
        </button>
      )}
      {state.mode === "pct" && (
        <p className="text-sm text-[var(--color-muted)]">
          Tutar moduna geçersen yüzdeler silinir; tutardan yüzdeye geçişte dağılım korunur.
        </p>
      )}
    </section>
  );
}
