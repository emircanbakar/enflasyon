"use client";

import type { Profile } from "@/lib/profiles";

interface ProfilePickerProps {
  readonly profile: Profile;
  readonly active: boolean;
  readonly onApply: () => void;
}

/** Hazır sepet; şimdilik yalnızca resmi ağırlıklardan türetilen "Türkiye ortalaması". */
export function ProfilePicker({ profile, active, onApply }: ProfilePickerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--color-card)] p-3">
      <p className="text-sm text-[var(--color-muted)]">
        <span className="font-medium text-[var(--color-ink)]">
          Nereden başlayacağını bilmiyor musun?
        </span>{" "}
        {profile.description}
      </p>
      <button
        type="button"
        onClick={onApply}
        aria-pressed={active}
        className="min-h-11 rounded-md border border-[var(--color-line)] px-3 font-medium aria-pressed:border-[var(--color-accent)]"
      >
        {active ? `${profile.label} seçili` : `${profile.label} ile doldur`}
      </button>
    </div>
  );
}
