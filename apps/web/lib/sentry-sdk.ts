/**
 * Sentry'den yalnızca kullanılan iki fonksiyon. `lib/monitoring.ts` bu modülü
 * dinamik import eder; paketin tamamı (replay, feedback) yerine yalnızca bunlar
 * tembel chunk'a girer.
 */
export { captureException, init } from "@sentry/browser";
