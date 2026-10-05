"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/** True only after hydration. `useSyncExternalStore` avoids a setState-in-effect
 *  cascade while still giving a stable server render (no mismatch). */
const useIsHydrated = () =>
  React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

/** Light / dark / system switch. Persists via next-themes (localStorage) and
 *  toggles the `.dark` class that theme.css section 4 reacts to. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsHydrated();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border p-1",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${label} theme`}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn("size-7", active && "bg-accent text-accent-foreground")}
          >
            <Icon className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}
