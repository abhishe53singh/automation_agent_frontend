import type { Metadata } from "next";
import Link from "next/link";

import { LlmSettings } from "@/modules/llm/components/LlmSettings";

export const metadata: Metadata = { title: "Models & providers" };

/** /settings/llm (item 25) — the LLM registry: providers, models, costs. */
export default function LlmSettingsPage() {
  return (
    <div className="space-y-4">
      <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
        ← All settings
      </Link>
      <LlmSettings />
    </div>
  );
}
