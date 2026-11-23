"use client";

import { use } from "react";
import { Coins, Cpu, Gauge, Search } from "lucide-react";

import { Card } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useCampaignUsage } from "@/modules/email/hooks";

interface PageProps {
  params: Promise<{ id: string }>;
}

const num = (n: number) => n.toLocaleString();
const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Gauge; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4 space-y-1 border-border">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

/** AI usage filed under this campaign: AI-written emails, previews and lead research. */
export default function CampaignUsagePage({ params }: PageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useCampaignUsage(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load this campaign&apos;s usage.</p>;
  }

  const { totals } = data;
  const nothing = totals.calls === 0 && data.web_searches === 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">AI Usage</h2>
        <p className="text-sm text-muted-foreground">
          Tokens and cost of the AI work done for “{data.campaign_name}”: AI-written emails, previews and
          lead research. Updates every 30 seconds while sending.
        </p>
      </div>

      {nothing ? (
        <EmptyState
          icon={<Gauge className="h-10 w-10 text-muted-foreground" />}
          title="No AI usage yet"
          description="Usage appears here once AI-written emails, previews or lead research run for this campaign."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Cpu} label="AI calls" value={num(totals.calls)} />
            <Stat
              icon={Gauge}
              label="Tokens"
              value={num(totals.total_tokens)}
              hint={`${num(totals.input_tokens)} in · ${num(totals.output_tokens)} out`}
            />
            <Stat icon={Coins} label="Estimated cost" value={usd(totals.cost)} hint="From the model's registered prices" />
            <Stat icon={Search} label="News web searches" value={num(data.web_searches)} hint="Count only, no tokens" />
          </div>

          <Card className="overflow-hidden border-border">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">By task</div>
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Task</th>
                  <th className="px-4 py-2 text-right font-medium">Count</th>
                  <th className="px-4 py-2 text-right font-medium">Input tokens</th>
                  <th className="px-4 py-2 text-right font-medium">Output tokens</th>
                  <th className="px-4 py-2 text-right font-medium">Total tokens</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 tabular-nums">
                {data.by_task.map((t) => (
                  <tr key={t.task}>
                    <td className="px-4 py-2 text-foreground">{t.label}</td>
                    <td className="px-4 py-2 text-right">{num(t.calls)}</td>
                    <td className="px-4 py-2 text-right">{t.task === "email_web_search" ? "—" : num(t.input_tokens)}</td>
                    <td className="px-4 py-2 text-right">{t.task === "email_web_search" ? "—" : num(t.output_tokens)}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {t.task === "email_web_search" ? "—" : num(t.total_tokens)}
                    </td>
                    <td className="px-4 py-2 text-right">{t.task === "email_web_search" ? "—" : usd(t.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {data.by_model.length > 0 && (
            <Card className="overflow-hidden border-border">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">By model</div>
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Model</th>
                    <th className="px-4 py-2 text-right font-medium">Calls</th>
                    <th className="px-4 py-2 text-right font-medium">Total tokens</th>
                    <th className="px-4 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 tabular-nums">
                  {data.by_model.map((m) => (
                    <tr key={m.model}>
                      <td className="px-4 py-2 text-foreground truncate max-w-xs" title={m.model}>
                        {m.model}
                      </td>
                      <td className="px-4 py-2 text-right">{num(m.calls)}</td>
                      <td className="px-4 py-2 text-right font-medium">{num(m.total_tokens)}</td>
                      <td className="px-4 py-2 text-right">{usd(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card className="overflow-hidden border-border">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">
              Recent activity <span className="font-normal text-muted-foreground">(last 25)</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">When</th>
                  <th className="px-4 py-2 text-left font-medium">Task</th>
                  <th className="px-4 py-2 text-left font-medium">Model</th>
                  <th className="px-4 py-2 text-right font-medium">Tokens (in / out)</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 tabular-nums">
                {data.recent.map((r, i) => (
                  <tr key={`${r.created_at}-${i}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(r.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2 text-foreground">{r.task}</td>
                    <td className="px-4 py-2 text-muted-foreground truncate max-w-[220px]" title={r.model ?? undefined}>
                      {r.model ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.input_tokens || r.output_tokens ? `${num(r.input_tokens)} / ${num(r.output_tokens)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">{r.input_tokens || r.output_tokens ? usd(r.cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
