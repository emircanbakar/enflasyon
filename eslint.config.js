import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/.next/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Config dosyaları ve Node script'leri: tip kontrollü kurallar kapalı.
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { console: "readonly", process: "readonly", URL: "readonly" },
    },
  },
  {
    // Testlerde fixture'lardan değer okurken `!` kabul edilir; kaynak kodda yasak kalır.
    files: ["**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Motor paketi: güvenlik ve bağımsızlık kuralları (docs/core.md, Bölüm 2 ve 8.5)
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-syntax": [
        "error",
        { selector: "ImportExpression", message: "Dinamik import kullanılmaz." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../../*", "**/apps/**", "web"],
              message: "Motor paketi başka workspace paketlerini import edemez.",
            },
            {
              group: ["node:*"],
              message:
                "Motor paketi Node API'lerine bağımlı olamaz (tarayıcı/Edge'de de çalışmalı).",
            },
          ],
        },
      ],
    },
  },
);
