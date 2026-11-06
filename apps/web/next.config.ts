import type { NextConfig } from "next";
import { parsePublicEnv } from "./lib/env/schema";
import { ANALYTICS_PATH, UMAMI_ORIGIN } from "./lib/analytics";
import { securityHeaders } from "./lib/security-headers";

// Public değişkenleri build başında doğrula; gizli görünen bir NEXT_PUBLIC_ değeri build'i durdurur.
const publicEnv = parsePublicEnv(process.env);
// Sentry olayları DSN'deki ingest adresine gider; CSP connect-src yalnızca onu açar.
const connectOrigins = publicEnv.NEXT_PUBLIC_SENTRY_DSN
  ? [new URL(publicEnv.NEXT_PUBLIC_SENTRY_DSN).origin]
  : [];

const isDev = process.env.NODE_ENV === "development";
// Yalnızca e2e/Lighthouse build'i (`pnpm build:local`) için; bkz. lib/security-headers.ts.
const allowHttp = process.env.ALLOW_HTTP === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Next'in başlangıç script'lerine integrity ekler; uygulama chunk'larını kapsamaz (docs/web.md 10.2).
    sri: { algorithm: "sha256" },
  },
  // Analitik birinci taraf adresten sunulur (docs/web.md, Bölüm 12.2): CSP'ye dış
  // script origin'i eklenmez.
  rewrites() {
    return Promise.resolve([
      { source: `${ANALYTICS_PATH}/script.js`, destination: `${UMAMI_ORIGIN}/script.js` },
      { source: `${ANALYTICS_PATH}/api/send`, destination: `${UMAMI_ORIGIN}/api/send` },
    ]);
  },
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: securityHeaders({ isDev, allowHttp, connectOrigins }),
      },
    ]);
  },
};

export default nextConfig;
