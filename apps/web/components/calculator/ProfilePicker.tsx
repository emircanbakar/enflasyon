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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--color-surface)] p-3 pl-4">
      <p className="max-w-[46ch] text-sm text-[var(--color-muted)]">
        <span className="font-medium text-[var(--color-ink)]">
          Nereden başlayacağını bilmiyor musun?
        </span>{" "}
        {profile.description}
      </p>
      <button
        type="button"
        onClick={onApply}
        aria-pressed={active}
        className="min-h-10 rounded-md bg-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 aria-pressed:bg-[var(--color-card)] aria-pressed:text-[var(--color-ink)] aria-pressed:shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
      >
        {active ? `${profile.label} seçili` : `${profile.label} ile doldur`}
      </button>
    </div>
  );
}
