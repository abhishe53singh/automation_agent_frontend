"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSignup } from "../hooks";
import { registerSchema, type RegisterValues } from "../validation";
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
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signup.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password,
      });
      toast.success("Account created. Welcome!");
      // Refresh so middleware sees the new cookies before the redirect.
      router.replace("/dashboard");
      router.refresh();
    } catch {
      // Duplicate username/email arrives as error.validation — already toasted.
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start building projects, chats and knowledge bases.</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" fullWidth loading={isSubmitting}>
            Create account
          </Button>
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
