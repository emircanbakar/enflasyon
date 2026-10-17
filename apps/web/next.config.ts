import type { NextConfig } from "next";
import { parsePublicEnv } from "./lib/env/schema";
import { securityHeaders } from "./lib/security-headers";

// Public değişkenleri build başında doğrula; gizli görünen bir NEXT_PUBLIC_ değeri build'i durdurur.
parsePublicEnv(process.env);

const isDev = process.env.NODE_ENV === "development";
// Yalnızca e2e/Lighthouse build'i (`pnpm build:local`) için; bkz. lib/security-headers.ts.
const allowHttp = process.env.ALLOW_HTTP === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Script'lere build sırasında integrity hash'i eklenir (hash tabanlı CSP, docs/web.md 10.2).
    sri: { algorithm: "sha256" },
  },
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: securityHeaders({ isDev, allowHttp }),
      },
    ]);
  },
};

export default nextConfig;
