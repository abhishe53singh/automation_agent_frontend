import type { Metadata } from "next";

import { RegisterForm } from "@/modules/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

/** Registration. The BFF creates the account and signs the user in. */
export default function RegisterPage() {
  return <RegisterForm />;
}
