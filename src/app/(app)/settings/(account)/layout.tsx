"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, CreditCard, ShieldCheck, UserRound } from "lucide-react";

import { cn } from "@/shared/lib/cn";

const TABS: { href: Route; label: string; icon: typeof UserRound; hint: string }[] = [
  { href: "/settings/profile", label: "Profile", icon: UserRound, hint: "Identity and account status" },
  { href: "/settings/security", label: "Security", icon: ShieldCheck, hint: "Password and sign-in" },
  { href: "/settings/billing", label: "Billing & usage", icon: CreditCard, hint: "Plan, tokens and cost" },
];

/** Account area: a second sidebar (Profile, Security, Billing & usage) beside the page. */
export default function AccountSettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <aside className="md:sticky md:top-6 w-full md:w-60 shrink-0">
        <div className="mb-3 px-1">
          <h1 className="text-lg font-semibold text-foreground">Account</h1>
          <p className="text-xs text-muted-foreground">Manage your account</p>
        </div>
        <nav aria-label="Account settings" className="flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map(({ href, label, icon: Icon, hint }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex shrink-0 items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="flex flex-col">
                  <span className="font-medium">{label}</span>
                  <span className="hidden md:block text-[11px] text-muted-foreground">{hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 hidden md:block border-t border-border pt-3 px-1">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            All settings
          </Link>
        </div>
      </aside>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
