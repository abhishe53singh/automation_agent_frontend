import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/modules/auth/components/ResetPasswordForm";
import { SpinnerBlock } from "@/shared/ui";

export const metadata: Metadata = { title: "Reset password" };

/** Consume a reset token and set a new password. */
export default function ResetPasswordPage() {
  // The form reads ?token= via useSearchParams, which requires a boundary.
  return (
    <Suspense fallback={<SpinnerBlock label="Loading reset form…" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
