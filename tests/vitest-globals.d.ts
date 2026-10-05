/**
 * Ambient types for the test globals.
 *
 * Test files deliberately do NOT `import ... from "vitest"` — on this vitest
 * build an imported `describe` is a different module instance from the injected
 * global and is not bound to the worker's suite collector, so every suite dies
 * at its first `describe` call (see vitest.config.ts). The globals come from
 * `globals: true` instead, and this reference gives them their types.
 *
 * The jest-dom matcher TYPES (toBeInTheDocument, toHaveAttribute, …) are NOT
 * declared here: they arrive automatically from the `@types` packages, which is
 * why tsconfig must not set a restrictive `types` array.
 */

/// <reference types="vitest/globals" />

export {};
