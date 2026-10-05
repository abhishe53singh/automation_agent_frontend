import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/Card";

export const metadata: Metadata = { title: "Settings" };

/** Account, appearance and the LLM registry index (.agent/phase_3.txt item 25). */
export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your account, appearance and the LLM registry.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your profile, email and account status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/profile" className="text-sm text-primary hover:underline">
            View profile
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Light, dark or follow the system preference. Stored locally, applied instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Models &amp; providers</CardTitle>
          <CardDescription>Register the LLM vendors and models chats can use.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/llm" className="text-sm text-primary hover:underline">
            Open the registry
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
