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
  PeriodInflationInput,
  PersonalInflationResult,
  Weights,
} from "./types.js";

export { EnflasyonError, isEnflasyonError } from "./errors.js";
export type { EnflasyonErrorCode } from "./errors.js";

export { addMonths, availablePeriods, isPeriod } from "./series/period.js";
export { chainSeries } from "./series/chain.js";

export { normalizeBasket } from "./basket/normalize.js";

export { itemChange } from "./calc/change.js";
export { personalInflation } from "./calc/personal.js";
export { annual, monthly, twelveMonthAverage, yearToDate } from "./calc/periods.js";
export { adjustAmount } from "./calc/adjust.js";
export { realWageChange } from "./calc/realWage.js";
export type { RealWageInput, RealWageResult } from "./calc/realWage.js";
export { roundTo } from "./calc/round.js";
