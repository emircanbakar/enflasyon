import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      // Yalnızca process.env okuyan ince sarmalayıcılar; şemaları test/env.test.ts kapsar.
      exclude: ["lib/env.server.ts", "lib/env.public.ts"],
      // docs/web.md, Bölüm 9.1: lib/ için %90 eşiği.
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
