import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "scripts/data/**/*.ts", "components/**/*.tsx"],
      // process.env veya build zamanı JSON'u okuyan ince sarmalayıcılar ve CLI girişi;
      // asıl mantık ayrı modüllerde test edilir.
      exclude: ["lib/env.public.ts", "lib/data.ts", "lib/sentry-sdk.ts", "scripts/data/update.ts"],
      // docs/web.md, Bölüm 9.1: lib/ için %90 eşiği.
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
