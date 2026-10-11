import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
    },
  },
  {
    // Firebase is lazy-loaded: only src/features/firebase/** may import it as a value.
    ignores: ["src/features/firebase/**", "firestore/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["firebase", "firebase/*", "@/features/firebase/*"],
              message:
                "Import Firebase only via dynamic import() from src/features/firebase/**. Type imports are allowed.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
