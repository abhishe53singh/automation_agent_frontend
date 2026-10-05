import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/modules/auth/components/LoginForm";
import { SpinnerBlock } from "@/shared/ui";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign in. The form is a client component (RHF + TanStack Query) and reads the
 * `?next=` destination recorded by the middleware guard, so Suspense is needed
 * for `useSearchParams`.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<SpinnerBlock label="Loading sign in…" />}>
      <LoginForm />
    </Suspense>
  );
}
