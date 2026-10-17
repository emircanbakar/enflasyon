/**
 * enflasyon-core: harcama sepetinden kişisel enflasyon hesaplar.
 *
 * Public API yalnızca bu dosyadan export edilir; `src/internal` asla dışa açılmaz.
 */
export type {
  Basket,
  Contribution,
  IndexSeries,
  IndexSet,
  Period,
  PersonalInflationInput,
  PersonalInflationResult,
  Weights,
} from "./types.js";

export { EnflasyonError, isEnflasyonError } from "./errors.js";
export type { EnflasyonErrorCode } from "./errors.js";

export { addMonths, availablePeriods, isPeriod } from "./series/period.js";

export { normalizeBasket } from "./basket/normalize.js";

export { itemChange } from "./calc/change.js";
export { personalInflation } from "./calc/personal.js";
