import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "scripts/data/**/*.ts"],
      // process.env okuyan ince sarmalayıcılar ve CLI girişi; asıl mantık ayrı modüllerde test edilir.
      exclude: ["lib/env.server.ts", "lib/env.public.ts", "scripts/data/update.ts"],
      // docs/web.md, Bölüm 9.1: lib/ için %90 eşiği.
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
