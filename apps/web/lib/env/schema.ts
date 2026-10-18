import { z } from "zod";

/**
 * Ortam değişkeni şemaları (docs/web.md, Bölüm 10.1).
 *
 * Bu modül saftır ve testlerde doğrudan kullanılır. `next.config.ts` build başında
 * doğrular; uygulama kodu public değerleri `lib/env.public.ts` üzerinden okur.
 */

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const optionalUrl = optionalString.pipe(z.url({ protocol: /^https?$/ }).optional());

/** Tarayıcıya giden, public değerler. */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  /** Umami Cloud site kimliği (UUID); yoksa analitik script'i hiç yüklenmez. */
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: optionalString.pipe(z.uuid().optional()),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Gizli bir değerin yanlışlıkla public önekle tanımlanıp tanımlanmadığını yakalar. */
const SECRET_LIKE = /(KEY|TOKEN|SECRET|PASSWORD)$/;

export function findLeakedSecrets(env: Readonly<Record<string, string | undefined>>): string[] {
  return Object.keys(env)
    .filter((key) => key.startsWith("NEXT_PUBLIC_") && SECRET_LIKE.test(key))
    .sort();
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
