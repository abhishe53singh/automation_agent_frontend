import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Bare layout for the embeddable captcha (iframed by other websites through
 * public/captcha.js). Outside the (app) route group: no shell, no session.
 */

export const metadata: Metadata = {
  title: "Captcha",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function CaptchaLayout({ children }: { children: ReactNode }) {
  return <div className="w-full bg-transparent text-foreground">{children}</div>;
}
