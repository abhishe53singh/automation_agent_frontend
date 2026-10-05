import Link from "next/link";
import type { ReactNode } from "react";
import { Bot } from "lucide-react";

import { ThemeToggle } from "@/shared/components/ThemeToggle";

/**
 * Authenticated shell-free layout (phase_1.txt item 6): centered card on a
 * plain background, with the theme switch always reachable.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-end p-4">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center p-4 pb-16">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold"
          >
            <Bot className="size-5 text-primary" />
            Automation Agent
          </Link>
          {children}
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        Sessions use httpOnly cookies — tokens never reach the browser&apos;s JavaScript.
      </footer>
    </div>
  );
}
