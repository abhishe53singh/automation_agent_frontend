"use client";

import { ProviderList } from "./ProviderList";
import { ModelList } from "./ModelList";
import { RegistryTransfer } from "./RegistryTransfer";
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

      <RegistryTransfer />

      <ProviderList />
      <ModelList />

      <Card>
        <CardHeader>
          <CardTitle>Archive vs. delete</CardTitle>
          <CardDescription>
            Nothing is ever erased from the registry, so chat history always stays intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Archive</strong> hides a model or provider from new
            chats. Chats that already use it keep working. Unarchive it from the Archived tab.
          </p>
          <p>
            <strong className="text-foreground">Delete</strong> removes it from every model
            selection, including chats that used it: their messages stay, but they must pick another
            model to continue. Restore it from the Deleted tab.
          </p>
          <p>
            Archiving or deleting a provider does the same for all of its models, without changing
            them; restoring the provider brings them back.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
