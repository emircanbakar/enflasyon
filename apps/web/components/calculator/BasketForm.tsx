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
const tl = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

export function BasketForm({ state, dispatch, profile }: BasketFormProps) {
  const total = percentTotal(state.values);
  const hasValues = Object.keys(state.values).length > 0;
  const sum = Object.values(state.values).reduce((acc, value) => acc + value, 0);
  const filled = Object.values(state.values).filter((value) => value > 0).length;

  return (
    <section
      aria-labelledby="sepet-baslik"
      className="receipt rounded-t-xl bg-[var(--color-card)] px-5 pt-5 sm:px-7 sm:pt-6"
    >
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

      <div className="mt-4">
        <ProfilePicker
          profile={profile}
          active={state.profile === profile.id}
          onApply={() => {
            dispatch({ type: "applyProfile", profile });
          }}
        />
      </div>

      <hr className="rule-dashed mt-5" />

      <div>
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

      <hr className="rule-dashed" />
      <div className="flex items-baseline gap-3 pt-4">
        <p className="text-base font-semibold">
          Toplam
          <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">{filled} kalem</span>
        </p>
        <span aria-hidden="true" className="leader" />
        <p className="figures text-xl font-semibold">
          {state.mode === "tl" ? `${tl.format(sum)} ₺` : `%${pct.format(total)}`}
        </p>
      </div>

      {state.mode === "pct" && hasValues && total !== 100 && (
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--color-surface)] p-3 text-sm"
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
            className="min-h-10 rounded-md bg-[var(--color-card)] px-3 font-medium shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
          >
            100'e tamamla
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 text-sm text-[var(--color-muted)]">
        <p>
          {state.mode === "pct"
            ? "Tutar moduna geçersen yüzdeler silinir; tutardan yüzdeye geçişte dağılım korunur."
            : "Tutarlar yalnızca tarayıcında kalır."}
        </p>
        {hasValues && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "reset" });
            }}
            className="min-h-11 underline underline-offset-4 hover:text-[var(--color-ink)]"
          >
            Sepeti temizle
          </button>
        )}
      </div>
    </section>
  );
}
