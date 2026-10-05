"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useLogin } from "../hooks";
import { loginSchema, type LoginValues } from "../validation";
import { safeNextPath } from "@/shared/lib/auth-redirect";
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
 * Login form (.agent/phase_2.txt item 16). RHF + Zod, submitted against the
 * BFF; server errors arrive as a toast, the user is then returned to the
 * destination middleware recorded in `?next=`.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  // Read once: the param can only change via a navigation, which remounts us.
  const nextPath = safeNextPath(searchParams.get("next"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login.mutateAsync(values);
      if (!session.user) {
        toast.error("Signed in, but the account details could not be loaded.");
      }
      // A full refresh re-runs middleware against the freshly set cookies.
      router.replace(nextPath as Route);
      router.refresh();
    } catch {
      // Surfaced by the QueryProvider mutation toast; nothing else to do.
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your projects, chats and knowledge bases.</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <CardContent className="space-y-4">
          <Input
            label="Email or username"
            type="text"
            autoComplete="username"
            error={errors.username?.message}
            disabled={isSubmitting}
            {...register("username")}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            disabled={isSubmitting}
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" fullWidth loading={isSubmitting}>
            Sign in
          </Button>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
