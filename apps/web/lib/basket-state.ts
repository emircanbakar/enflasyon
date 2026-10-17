import type { Period } from "enflasyon-core";
import { DEFAULT_STATE, MAX_AMOUNT } from "./basket-url";
import type { BasketMode, BasketState, PeriodKind } from "./basket-url";
import { CATEGORY_KEYS } from "./categories";
import type { CategoryKey } from "./categories";
import type { Profile } from "./profiles";

/**
 * Sepet durumunun saf reducer'ı. React'ten bağımsızdır; `useBasket` bunu
 * `useReducer` ile kullanır, testler doğrudan çağırır.
 */

export type BasketValues = Readonly<Partial<Record<CategoryKey, number>>>;

export type BasketAction =
  | { readonly type: "hydrate"; readonly state: BasketState }
  | { readonly type: "setValue"; readonly key: CategoryKey; readonly value: number | null }
  | { readonly type: "setMode"; readonly mode: BasketMode }
  | { readonly type: "applyProfile"; readonly profile: Profile }
  | { readonly type: "setPeriod"; readonly period: PeriodKind }
  | { readonly type: "setAt"; readonly at: Period | null }
  | { readonly type: "setFrom"; readonly from: Period | null }
  | { readonly type: "normalize" }
  | { readonly type: "reset" };

const MAX_PERCENT = 100;

function withValue(values: BasketValues, key: CategoryKey, value: number | null): BasketValues {
  const others = Object.entries(values).filter(([k]) => k !== key);
  return Object.fromEntries(value === null || value <= 0 ? others : [...others, [key, value]]);
}

/** Yüzdelerin toplamı (0,1 hassasiyetle). */
export function percentTotal(values: BasketValues): number {
  const total = Object.values(values).reduce((sum, v) => sum + v, 0);
  return Math.round(total * 10) / 10;
}

/**
 * Değerleri, toplamı tam 100 olan 0,1 adımlı yüzdelere çevirir. Yuvarlama
 * artığı en büyük kalana eklenir (en büyük kalan yöntemi), böylece toplam
 * 99,9 veya 100,1 olmaz.
 */
export function toPercentages(values: BasketValues): BasketValues {
  const entries = CATEGORY_KEYS.flatMap((key) => {
    const value = values[key];
    return value !== undefined && value > 0 ? [[key, value] as const] : [];
  });
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return {};
  const scaled = entries.map(([key, value]) => {
    const exact = (value / total) * 1000; // binde
    return { key, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let missing = 1000 - scaled.reduce((sum, s) => sum + s.floor, 0);
  for (const item of [...scaled].sort((a, b) => b.remainder - a.remainder)) {
    if (missing <= 0) break;
    item.floor += 1;
    missing -= 1;
  }
  return Object.fromEntries(scaled.filter((s) => s.floor > 0).map((s) => [s.key, s.floor / 10]));
}

export function basketReducer(state: BasketState, action: BasketAction): BasketState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "setValue":
      // Elle düzenleme profili geçersiz kılar.
      return { ...state, values: withValue(state.values, action.key, action.value), profile: null };
    case "setMode": {
      if (action.mode === state.mode) return state;
      // TL → yüzde: dağılım korunur, sonuç değişmez. Yüzde → TL: tutarlar bilinmediği için temizlenir.
      const values = action.mode === "pct" ? toPercentages(state.values) : {};
      return { ...state, mode: action.mode, values, profile: null };
    }
    case "applyProfile":
      return {
        ...state,
        mode: "pct",
        values: action.profile.percentages,
        profile: action.profile.id,
      };
    case "setPeriod":
      return { ...state, period: action.period, from: action.period === "r" ? state.from : null };
    case "setAt":
      return { ...state, at: action.at };
    case "setFrom":
      return { ...state, from: action.from };
    case "normalize":
      return state.mode === "pct" ? { ...state, values: toPercentages(state.values) } : state;
    case "reset":
      return DEFAULT_STATE;
  }
}

/**
 * Kullanıcının yazdığı metni değere çevirir.
 *
 * - TL: binlik ayırıcı noktalar ve boşluklar atılır ("25.000" → 25000), virgüllü
 *   kuruş yuvarlanır; 0 ile 10 milyon arası tam sayı.
 * - Yüzde: virgül ondalık ayırıcıdır ("59,5" → 59.5); 0 ile 100 arası, 0,1 adımlı.
 *
 * Boş metin `null` (kalemi sil), okunamayan veya aralık dışı metin `"invalid"` döner.
 */
export function parseValueInput(text: string, mode: BasketMode): number | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  let normalized: string;
  if (mode === "tl") {
    normalized = trimmed.replace(/[\s.]/g, "").replace(",", ".");
  } else {
    if (trimmed.includes(".") && trimmed.includes(",")) return "invalid";
    normalized = trimmed.replace(",", ".").replace(/^%|%$/g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return "invalid";
  const value = Number(normalized);
  if (mode === "tl") {
    const rounded = Math.round(value);
    return rounded <= MAX_AMOUNT ? rounded : "invalid";
  }
  const rounded = Math.round(value * 10) / 10;
  return rounded <= MAX_PERCENT ? rounded : "invalid";
}
