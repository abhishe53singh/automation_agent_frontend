import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Must be last: disables any stylistic rules Prettier owns.
  prettier,
  globalIgnores([
    // Build output
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    // Agent instruction docs + backend mirror are not source
    ".agent/**",
    ".backend_agent/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
