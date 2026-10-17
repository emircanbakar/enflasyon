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
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
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
