import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
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
          allowDefaultProject: ["*.js", "apps/web/*.mjs"],
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
    files: ["**/test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Web uygulaması: Next.js, React Hooks ve erişilebilirlik kuralları (docs/web.md, Bölüm 9.2)
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      next: { rootDir: "apps/web" },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      // Kullanıcı girdisi asla HTML olarak basılmaz (docs/web.md, Bölüm 10.3).
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML yasak; JSON-LD için ayrı, gözden geçirilmiş bileşen kullanılır.",
        },
      ],
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
