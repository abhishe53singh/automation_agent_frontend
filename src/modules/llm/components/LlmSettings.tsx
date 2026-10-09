"use client";

import { ProviderList } from "./ProviderList";
import { ModelList } from "./ModelList";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

/**
 * The /settings/llm screen (item 25): the whole LLM registry in one place —
 * providers, their models, the cost fields and the 409 conflict UX.
 */
export function LlmSettings() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Models &amp; providers</h1>
          <Badge variant="info">Registry</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Register the LLM vendors and models chats can use. API keys can be stored securely in the
          database — they are write-only: the registry only ever reports whether a key exists.
        </p>
      </div>

      <ProviderList />
      <ModelList />

      <Card>
        <CardHeader>
          <CardTitle>How deletion behaves</CardTitle>
          <CardDescription>
            Removing a provider also removes its models. If any of them already appear in chat
            history the request is refused with a conflict — the row stays, so existing chats keep
            working.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Active models are offered in the chat model picker. Deactivating a model hides it from new
          chats without breaking existing ones.
        </CardContent>
      </Card>
    </div>
  );
}
