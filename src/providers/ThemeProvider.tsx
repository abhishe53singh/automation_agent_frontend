"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

type NextThemesProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * next-themes handles ONLY the light/dark/system preference (storage +
 * `.dark` class on <html>). It contains no colors — those live exclusively in
 * src/styles/theme.css (.agent/theme_plan.txt).
 */
export function ThemeProvider({ children, ...props }: NextThemesProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
