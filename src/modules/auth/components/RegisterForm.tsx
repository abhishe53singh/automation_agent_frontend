"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSignup } from "../hooks";
import { registerSchema, type RegisterValues } from "../validation";
import { AuthDivider, GoogleSignInButton } from "./GoogleSignInButton";
import { getClientEnv } from "@/config/env";
import { CaptchaWidget } from "@/modules/captcha/components/CaptchaWidget";
import { FIRST_PARTY_CAPTCHA_KEY } from "@/shared/lib/captcha";
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
 * Register form (.agent/phase_2.txt item 16). The BFF creates the account AND
 * signs the user in (Set-Cookie), so a success lands directly on /dashboard.
 */
export function RegisterForm() {
  const router = useRouter();
  const googleEnabled = Boolean(getClientEnv().NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  // Self-hosted captcha pass token (single use). Any failed signup consumed
  // it, so a new image is loaded via captchaReset.
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = React.useState(0);
  const [captchaError, setCaptchaError] = React.useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    if (!captchaToken) {
      setCaptchaError("Please solve the captcha first.");
      return;
    }
    try {
      await signup.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password,
        captcha_token: captchaToken,
      });
      toast.success("Account created. Welcome!");
      // Refresh so middleware sees the new cookies before the redirect.
      router.replace("/dashboard");
      router.refresh();
    } catch {
      // Duplicate username/email or a captcha problem arrives as
      // error.validation — already toasted. The token is spent either way.
      setCaptchaToken(null);
      setCaptchaReset((n) => n + 1);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start building projects, chats and knowledge bases.</CardDescription>
      </CardHeader>

      <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
        <CardContent className="space-y-4">
          <Input
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            disabled={isSubmitting}
            {...register("username")}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.password?.message}
            disabled={isSubmitting}
            {...register("password")}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Verify you are human</p>
            <CaptchaWidget
              siteKey={FIRST_PARTY_CAPTCHA_KEY}
              resetKey={captchaReset}
              disabled={isSubmitting}
              onSolved={(token) => {
                setCaptchaToken(token);
                setCaptchaError(null);
              }}
              onExpired={() => setCaptchaToken(null)}
            />
            {captchaError && !captchaToken ? (
              <p role="alert" className="text-xs text-destructive">
                {captchaError}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" fullWidth loading={isSubmitting}>
            Create account
          </Button>
          {googleEnabled && (
            <>
              <AuthDivider />
              <GoogleSignInButton redirectTo={"/dashboard"} text="signup_with" />
            </>
          )}
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
