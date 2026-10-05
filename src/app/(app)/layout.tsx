import type { ReactNode } from "react";

import { AppShell } from "./_components/AppShell";

/** Authenticated application shell (phase_1.txt item 6). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
