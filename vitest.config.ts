import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "jsdom",
    // `globals: true` is REQUIRED, not a convenience. With this vitest build an
    // explicit `import { describe } from "vitest"` in a test file resolves to a
    // module instance that is not bound to the worker's suite collector, so
    // EVERY suite dies at its first `describe` call with
    // "Cannot read properties of undefined (reading 'config')" — which looks
    // exactly like a corrupted node_modules but is not one (`npm ci` does not
    // fix it). Test files therefore use the injected globals and must NOT
    // import from "vitest"; tsconfig adds `vitest/globals` for the types.
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
  },
});
