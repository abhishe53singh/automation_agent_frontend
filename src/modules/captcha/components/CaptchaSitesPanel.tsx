"use client";

import * as React from "react";
import { KeyRound, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { OriginChips } from "@/modules/embed/components/OriginChips";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  Input,
  Skeleton,
  Switch,
} from "@/shared/ui";

import {
  useCaptchaSites,
  useCreateCaptchaSite,
  useDeleteCaptchaSite,
  useRotateCaptchaSecret,
  useUpdateCaptchaSite,
  type CaptchaSite,
  type CaptchaSiteWithSecret,
} from "../api";

function appOrigin(): string {
  return typeof window === "undefined" ? "https://YOUR_APP" : window.location.origin;
}

function htmlSnippet(site: CaptchaSite): string {
  return [
    `<form method="post" action="/your-form-handler">`,
    `  <!-- your fields -->`,
    `  <div class="aa-captcha" data-sitekey="${site.site_key}"></div>`,
    `  <button type="submit">Send</button>`,
    `</form>`,
    `<script src="${appOrigin()}/captcha.js" async></script>`,
  ].join("\n");
}

function serverSnippet(): string {
  return [
    `// On your server, before accepting the form (Node example):`,
    `const res = await fetch("${appOrigin()}/api/public/captcha/siteverify", {`,
    `  method: "POST",`,
    `  headers: { "Content-Type": "application/json" },`,
    `  body: JSON.stringify({`,
    `    secret: process.env.CAPTCHA_SECRET,        // your csk_... secret`,
    `    response: req.body["aa-captcha-token"],    // posted by the form`,
    `  }),`,
    `});`,
    `const result = await res.json();`,
    `if (!result.success) return reject("Captcha failed: " + result["error-codes"]);`,
  ].join("\n");
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative rounded-md border border-border bg-muted/40">
      <pre className="overflow-x-auto whitespace-pre p-3 pr-12 font-mono text-xs text-foreground">
        {code}
      </pre>
      <CopyButton text={code} label={label} size="sm" variant="ghost" className="absolute right-1 top-1" />
    </div>
  );
}

/** Shown once after creating a site or rotating its secret. */
function SecretNotice({ site, onDone }: { site: CaptchaSiteWithSecret; onDone: () => void }) {
  return (
    <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-sm font-medium text-foreground">
        Secret key for “{site.name}”: copy it now, it will not be shown again.
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5 font-mono text-xs">
          {site.secret}
        </code>
        <CopyButton text={site.secret} label="Copy secret" size="sm" variant="outline" />
      </div>
      <p className="text-xs text-muted-foreground">
        Keep it on your server only (e.g. an environment variable). Never put it in page HTML.
      </p>
      <Button size="sm" variant="ghost" onClick={onDone}>
        I saved it
      </Button>
    </div>
  );
}

function CreateSiteForm({ onCreated }: { onCreated: (site: CaptchaSiteWithSecret) => void }) {
  const create = useCreateCaptchaSite();
  const [name, setName] = React.useState("");
  const [origins, setOrigins] = React.useState<string[]>([]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const site = await create.mutateAsync({ name: name.trim(), allowed_origins: origins });
      setName("");
      setOrigins([]);
      onCreated(site);
    } catch {
      // API errors are toasted by the client.
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        label="Website name"
        placeholder="e.g. Company contact form"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={120}
      />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Allowed websites</p>
        <p className="text-xs text-muted-foreground">
          Only these sites may show the captcha. Leave empty to allow any website.
        </p>
        <OriginChips value={origins} onChange={setOrigins} />
      </div>
      <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
        <Plus aria-hidden /> Create captcha site
      </Button>
    </form>
  );
}

function SiteCard({
  site,
  onSecret,
}: {
  site: CaptchaSite;
  onSecret: (site: CaptchaSiteWithSecret) => void;
}) {
  const update = useUpdateCaptchaSite();
  const rotate = useRotateCaptchaSecret();
  const remove = useDeleteCaptchaSite();
  const [confirm, setConfirm] = React.useState<"delete" | "rotate" | null>(null);
  const [showCode, setShowCode] = React.useState(false);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {site.name}
              <Badge variant={site.is_active ? "success" : "neutral"}>
                {site.is_active ? "Active" : "Disabled"}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <code className="truncate font-mono text-xs text-muted-foreground">{site.site_key}</code>
              <CopyButton text={site.site_key} label="Copy site key" size="sm" variant="ghost" />
            </div>
          </div>
          <Switch
            label="Enabled"
            checked={site.is_active}
            disabled={update.isPending}
            onCheckedChange={(checked) =>
              update.mutate({ id: site.id, patch: { is_active: checked } })
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Allowed websites</p>
          <OriginChips
            value={site.allowed_origins}
            onChange={(next) =>
              update.mutate(
                { id: site.id, patch: { allowed_origins: next } },
                { onSuccess: () => toast.success("Allowed websites updated") },
              )
            }
          />
          {site.allowed_origins.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Any website can show this captcha. Add your domain to restrict it.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Live preview</p>
          <iframe
            title={`Captcha preview for ${site.name}`}
            src={`/captcha/${encodeURIComponent(site.site_key)}`}
            className="h-[150px] w-full max-w-[380px] rounded-md border-0"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCode((v) => !v)}>
            {showCode ? "Hide integration code" : "Show integration code"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm("rotate")}>
            <RefreshCw aria-hidden /> New secret
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm("delete")}>
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>

        {showCode ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              1. Add this to the form on your website. When solved, the form gets a hidden
              field <code className="font-mono">aa-captcha-token</code>.
            </p>
            <CodeBlock code={htmlSnippet(site)} label="Copy HTML" />
            <p className="text-xs text-muted-foreground">
              2. Verify the token on your server with your secret key (each token works once,
              for about 2 minutes). JSON or form-encoded bodies are accepted.
            </p>
            <CodeBlock code={serverSnippet()} label="Copy server code" />
          </div>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Delete “${site.name}”?`}
        description="Websites using this site key will stop showing the captcha and every verification will fail."
        loading={remove.isPending}
        onConfirm={() => remove.mutate(site.id, { onSettled: () => setConfirm(null) })}
      />
      <ConfirmDialog
        open={confirm === "rotate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Issue a new secret key?"
        description="The current secret stops working immediately. Update your server with the new one."
        confirmLabel="Issue new secret"
        variant="primary"
        loading={rotate.isPending}
        onConfirm={() =>
          rotate.mutate(site.id, {
            onSuccess: (withSecret) => onSecret(withSecret),
            onSettled: () => setConfirm(null),
          })
        }
      />
    </Card>
  );
}

/** Register websites for the self-hosted captcha and get their integration code. */
export function CaptchaSitesPanel() {
  const sites = useCaptchaSites();
  const [secret, setSecret] = React.useState<CaptchaSiteWithSecret | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="space-y-1">
              <CardTitle>Add a website</CardTitle>
              <CardDescription>
                A self-hosted, distorted-text captcha (no third-party service). Each website gets a
                public site key for its pages and a secret key for its server.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {secret ? <SecretNotice site={secret} onDone={() => setSecret(null)} /> : null}
          <CreateSiteForm onCreated={setSecret} />
        </CardContent>
      </Card>

      {sites.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : sites.isError ? (
        <p className="text-sm text-destructive">Could not load your captcha sites.</p>
      ) : sites.data.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-10 w-10 text-muted-foreground" />}
          title="No captcha sites yet"
          description="Create one above to get a site key and the code for your website."
        />
      ) : (
        sites.data.map((site) => <SiteCard key={site.id} site={site} onSecret={setSecret} />)
      )}
    </div>
  );
}
