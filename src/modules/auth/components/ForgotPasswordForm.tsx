"use client";

import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { forgotPassword } from "../api";
import { forgotPasswordValues, type ForgotPasswordValues } from "../validation";
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

/**
 * Forgot-password form (.agent/phase_2.txt item 16).
 *
 * The backend sends no email in this configuration, so it hands back the raw
 * single-use reset token. The UI therefore reveals it inline (and pre-fills the
 * reset form) instead of pretending an email is on its way — while keeping the
 * neutral "check your inbox" wording for the `null` (unknown email) case so no
 * account is enumerated.
 */
export function ForgotPasswordForm() {
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const request = useMutation({ mutationFn: (email: string) => forgotPassword(email) });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordValues),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await request.mutateAsync(values.email);
      setMessage(result.message);
      setIssuedToken(result.reset_token);
    } catch {
      // Toast already rendered by the QueryProvider mutation cache.
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a reset link.</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <CardContent className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            disabled={request.isPending}
            {...register("email")}
          />

          {message ? (
            <div role="status" className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="text-foreground">{message}</p>
              {issuedToken ? (
                <>
                  <p className="mt-2 text-muted-foreground">
                    Email delivery is not configured on this server, so here is your reset token
                    (single use, 30 minutes):
                  </p>
                  <code className="mt-2 block break-all rounded bg-background p-2 text-xs">
                    {issuedToken}
                  </code>
                  <a
                    href={`/reset-password?token=${encodeURIComponent(issuedToken)}`}
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                  >
                    Continue to set a new password
                  </a>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" fullWidth loading={request.isPending}>
            Send reset link
          </Button>
          <a href="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </a>
        </CardFooter>
      </form>
    </Card>
  );
}
