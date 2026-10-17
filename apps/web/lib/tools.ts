import { adjustAmount, itemChange, personalInflation, realWageChange } from "enflasyon-core";
import type { IndexSet, Period } from "enflasyon-core";
import type { BasketValues } from "./basket-state";
import type { CalculatorData } from "./calc";
import { userMessage } from "./errors";

/**
 * Detay araçları (docs/web.md, Bölüm 2.2 adım 4): "o zamanki tutar bugün kaç TL?"
 * ve reel maaş. Her sonuç iki temelde verilir: resmi TÜFE ve (sepet doluysa)
 * kullanıcının kendi sepeti. Hesap `enflasyon-core` ile yapılır.
 */

export interface Basis {
  /** `since` → son veri ayı enflasyonu (oran). */
  readonly rate: number;
}

export interface ToolInput {
  readonly since: Period;
  readonly values: BasketValues;
  readonly data: CalculatorData;
  readonly indices: IndexSet;
}

/** Resmi ve kişisel (sepet doluysa) enflasyonu `since` → son veri ayı için hesaplar. */
function rates({ since, values, data, indices }: ToolInput): {
  official: number;
  personal: number | null;
} {
  const to = data.lastPeriod;
  const official = itemChange(indices.genel ?? {}, since, to);
  const items = Object.fromEntries(Object.entries(values).filter(([, v]) => v > 0));
  const personal =
    Object.keys(items).length === 0
      ? null
      : personalInflation({
          basket: { mode: "amount", items },
          indices,
          from: since,
          to,
          weightsAt: "to",
        }).rate;
  return { official, personal };
}

export type ToolOutcome<T> =
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string }
  | ({ readonly status: "ok"; readonly since: Period; readonly to: Period } & T);

export interface PastAmountResult {
  readonly official: { readonly rate: number; readonly today: number };
  readonly personal: { readonly rate: number; readonly today: number } | null;
}

/** "`since` ayındaki X TL bugün kaç TL eder?" */
export function pastAmount(amount: number | null, input: ToolInput): ToolOutcome<PastAmountResult> {
  if (amount === null || amount <= 0) return { status: "empty" };
  try {
    const { official, personal } = rates(input);
    return {
      status: "ok",
      since: input.since,
      to: input.data.lastPeriod,
      official: { rate: official, today: adjustAmount(amount, official) },
      personal:
        personal === null ? null : { rate: personal, today: adjustAmount(amount, personal) },
    };
  } catch (error) {
    return { status: "error", message: userMessage(error) };
  }
}

export interface WageResult {
  /** Maaşın nominal değişimi (oran). */
  readonly nominal: number;
  readonly official: {
    readonly rate: number;
    readonly real: number;
    readonly requiredWage: number;
  };
  readonly personal: {
    readonly rate: number;
    readonly real: number;
    readonly requiredWage: number;
  } | null;
}

/** Zamdan bu yana maaşın reel değişimi: `since` ayındaki maaş → bugünkü maaş. */
export function wageCheck(
  wageFrom: number | null,
  wageTo: number | null,
  input: ToolInput,
): ToolOutcome<WageResult> {
  if (wageFrom === null || wageTo === null || wageFrom <= 0) return { status: "empty" };
  try {
    const { official, personal } = rates(input);
    const officialWage = realWageChange({ wageFrom, wageTo, rate: official });
    const personalWage =
      personal === null ? null : realWageChange({ wageFrom, wageTo, rate: personal });
    return {
      status: "ok",
      since: input.since,
      to: input.data.lastPeriod,
      nominal: wageTo / wageFrom - 1,
      official: { rate: official, ...officialWage },
      personal:
        personalWage === null || personal === null ? null : { rate: personal, ...personalWage },
    };
  } catch (error) {
    return { status: "error", message: userMessage(error) };
  }
}
