"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { resetPassword } from "../api";
import { resetPasswordValues, type ResetPasswordValues } from "../validation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from "@/shared/ui";

/** Reset-password form (.agent/phase_2.txt item 16); the token comes from the URL. */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordValues),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword({ token: values.token, newPassword: values.newPassword });
      toast.success("Password updated. You can sign in now.");
      router.replace("/login");
    } catch {
      // error.validation (invalid/reused/expired token) is toasted by the cache.
    }
  });

  const tokenError = errors.token?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Your reset link is single use and expires after 30 minutes.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <CardContent className="space-y-4">
          {!token ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
            >
              This link is missing its reset token. Request a new one.
            </p>
          ) : null}

          <Input label="Reset token" error={tokenError} disabled {...register("token")} />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" fullWidth disabled={!token}>
            Update password
          </Button>
          <a href="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </a>
        </CardFooter>
      </form>
    </Card>
  );
}
