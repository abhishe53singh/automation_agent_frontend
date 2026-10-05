// TWO steps, both required, and the reason is subtle:
//
// 1. `import "@testing-library/jest-dom/vitest"` is kept for its SIDE-EFFECT ON
//    TYPES only — it is what teaches TypeScript that `expect` has
//    toBeInTheDocument / toHaveAttribute / … At runtime it extends its OWN copy
//    of `expect` (imported from "vitest"), which on this vitest build is a
//    different instance from the injected global — so it does nothing useful
//    there, and relying on it alone makes every matcher call fail with
//    "Invalid Chai property".
//
// 2. So the matchers are ALSO registered on the injected global `expect`
//    (provided by `globals: true`, see vitest.config.ts). That is the copy the
//    tests actually use, so this is the step that makes them work.
//
// Net effect: the package's own entry supplies the types, this file supplies the
// runtime registration. Both are needed; neither alone is enough.
import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers as never);

// jsdom does not implement matchMedia, which ThemeToggle/AppShell probe.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
