import { z } from "zod";

/**
 * Ortam değişkeni şemaları (docs/web.md, Bölüm 10.1).
 *
 * Bu modül saftır ve testlerde doğrudan kullanılır. Uygulama kodu buradan değil,
 * `lib/env.server.ts` (sadece sunucu) ve `lib/env.public.ts` (tarayıcı dahil) üzerinden okur.
 */

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const optionalUrl = optionalString.pipe(z.url({ protocol: /^https?$/ }).optional());

/** Gizli değerler. Asla `NEXT_PUBLIC_` önekiyle tanımlanmaz. */
export const serverEnvSchema = z.object({
  /** TCMB EVDS anahtarı; sadece veri pipeline'ı kullanır, uygulama çalışırken gerekmez. */
  EVDS_API_KEY: optionalString,
  /** Sentry source map yükleme; sadece build sırasında. */
  SENTRY_AUTH_TOKEN: optionalString,
});

/** Tarayıcıya giden, public değerler. */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_ANALYTICS_DOMAIN: optionalString,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Gizli bir değerin yanlışlıkla public önekle tanımlanıp tanımlanmadığını yakalar. */
const SECRET_LIKE = /(KEY|TOKEN|SECRET|PASSWORD)$/;

export function findLeakedSecrets(env: Readonly<Record<string, string | undefined>>): string[] {
  return Object.keys(env)
    .filter((key) => key.startsWith("NEXT_PUBLIC_") && SECRET_LIKE.test(key))
    .sort();
}

export function parseServerEnv(env: Readonly<Record<string, string | undefined>>): ServerEnv {
  return serverEnvSchema.parse(env);
}

export function parsePublicEnv(env: Readonly<Record<string, string | undefined>>): PublicEnv {
  const leaked = findLeakedSecrets(env);
  if (leaked.length > 0) {
    throw new Error(
      `Gizli görünen değişkenler NEXT_PUBLIC_ önekiyle tanımlanmış (tarayıcıya gider): ${leaked.join(", ")}`,
    );
  }
  return publicEnvSchema.parse(env);
}
