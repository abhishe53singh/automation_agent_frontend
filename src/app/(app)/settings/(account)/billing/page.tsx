"use client";

import { useState } from "react";
import { Coins, Cpu, CreditCard, Gauge, Search } from "lucide-react";

import { useMyUsage, type MyUsage } from "@/modules/users/usage";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { cn } from "@/shared/lib/cn";

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
];

const num = (n: number) => n.toLocaleString();
const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Gauge; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

/** Daily cost bars; hover a bar for the exact numbers. */
function DailyChart({ days }: { days: MyUsage["by_day"] }) {
  const max = Math.max(...days.map((d) => d.cost), 0);
  const byTokens = max === 0; // all free models: chart tokens instead
  const top = byTokens ? Math.max(...days.map((d) => d.total_tokens), 1) : max;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily {byTokens ? "tokens" : "cost"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-1" role="img" aria-label={`Daily ${byTokens ? "tokens" : "cost"} chart`}>
          {days.map((d) => {
            const value = byTokens ? d.total_tokens : d.cost;
            const label = new Date(`${d.date}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
            return (
              <div
                key={d.date}
                className="group relative flex h-full flex-1 min-w-[4px] max-w-10 items-end"
              >
                <div
                  className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max((value / top) * 100, 2)}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md group-hover:block">
                  <div className="font-medium">{label}</div>
                  <div>{usd(d.cost)} · {num(d.total_tokens)} tokens · {num(d.calls)} calls</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{days[0]?.date}</span>
          <span>{days[days.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingUsagePage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useMyUsage(days);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Billing &amp; usage</h2>
          <p className="text-sm text-muted-foreground">Your plan, and the AI tokens and cost across the app.</p>
        </div>
        <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              aria-pressed={days === p.days}
              onClick={() => setDays(p.days)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                days === p.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden />
              Plan
            </CardTitle>
            <Badge variant="info">Billing upcoming</Badge>
          </div>
          <CardDescription>
            No paid plan or invoices yet. You pay your model providers directly; the costs below are
            estimates from each model&apos;s registered prices.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Could not load your usage.</p>
      ) : data.totals.calls === 0 && data.web_searches === 0 ? (
        <EmptyState
          icon={<Gauge className="h-10 w-10 text-muted-foreground" />}
          title="No usage in this period"
          description="Chats, agents and AI-written emails show up here once they run."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Coins} label="Estimated cost" value={usd(data.totals.cost)} />
            <Stat
              icon={Gauge}
              label="Tokens"
              value={num(data.totals.total_tokens)}
              hint={`${num(data.totals.input_tokens)} in · ${num(data.totals.output_tokens)} out`}
            />
            <Stat icon={Cpu} label="AI calls" value={num(data.totals.calls)} />
            <Stat icon={Search} label="Web searches" value={num(data.web_searches)} hint="Lead research, count only" />
          </div>

          {data.by_day.length > 0 && <DailyChart days={data.by_day} />}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">By area</div>
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Area</th>
                    <th className="px-4 py-2 text-right font-medium">Calls</th>
                    <th className="px-4 py-2 text-right font-medium">Tokens</th>
                    <th className="px-4 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 tabular-nums">
                  {data.by_area.map((a) => (
                    <tr key={a.area}>
                      <td className="px-4 py-2 text-foreground">{a.label}</td>
                      <td className="px-4 py-2 text-right">{num(a.calls)}</td>
                      <td className="px-4 py-2 text-right">{num(a.total_tokens)}</td>
                      <td className="px-4 py-2 text-right font-medium">{usd(a.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">By model</div>
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Model</th>
                    <th className="px-4 py-2 text-right font-medium">Calls</th>
                    <th className="px-4 py-2 text-right font-medium">Tokens</th>
                    <th className="px-4 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 tabular-nums">
                  {data.by_model.map((m) => (
                    <tr key={m.model}>
                      <td className="px-4 py-2 text-foreground truncate max-w-[200px]" title={m.model}>
                        {m.model}
                      </td>
                      <td className="px-4 py-2 text-right">{num(m.calls)}</td>
                      <td className="px-4 py-2 text-right">{num(m.total_tokens)}</td>
                      <td className="px-4 py-2 text-right font-medium">{usd(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">
              Recent activity <span className="font-normal text-muted-foreground">(last 25)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">When</th>
                    <th className="px-4 py-2 text-left font-medium">Area</th>
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
                      <td className="px-4 py-2 text-foreground">{r.area}</td>
                      <td className="px-4 py-2 text-foreground">
                        {r.task}
                        {r.campaign_name ? (
                          <span className="text-muted-foreground"> · {r.campaign_name}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]" title={r.model ?? undefined}>
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
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
