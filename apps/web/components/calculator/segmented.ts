/**
 * Bölümlü seçim (segmented control): görünürde birleşik düğmeler, altta yerel
 * radio grubu (ok tuşları ve ekran okuyucu desteği tarayıcıdan gelir).
 */
export const segmentedGroup =
  "inline-flex flex-wrap gap-1 rounded-lg bg-[var(--color-surface)] p-1";

/** Kabın tamamını dolduran, eşit bölmeli sürüm (dar ekranda alta kaymaz). */
export const segmentedGroupFull =
  "grid w-full auto-cols-fr grid-flow-col gap-1 rounded-lg bg-[var(--color-surface)] p-1";

export const segmentedOption =
  "relative flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2.5 text-center text-sm leading-tight text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] has-[:checked]:bg-[var(--color-card)] has-[:checked]:font-medium has-[:checked]:text-[var(--color-ink)] has-[:checked]:shadow-[0_1px_2px_rgb(0_0_0/0.12)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)]";

/** Radio görünmez ama erişilebilir kalır; seçili durum etiketin kendisinde gösterilir. */
export const segmentedInput = "absolute inset-0 cursor-pointer opacity-0";

export const selectClass =
  "h-10 rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-2 text-sm";
