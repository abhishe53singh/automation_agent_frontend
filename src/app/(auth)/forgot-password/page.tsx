import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/modules/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

/** Request a password-reset token (the backend returns it inline, no email). */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
