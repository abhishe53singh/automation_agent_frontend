import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Bare layout for the public, embeddable chat widget. It deliberately sits
 * outside the (app) route group, so no authenticated shell, sidebar or session
 * check applies; the root layout only contributes the theme/query providers,
 * neither of which redirects or needs a session.
 */

export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-background text-foreground">{children}</div>
  );
}
