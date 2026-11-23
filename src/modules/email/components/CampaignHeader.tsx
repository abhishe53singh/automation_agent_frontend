"use client";

import Link from "next/link";
import { ArrowLeft, Play, Pause, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { useModels } from "@/modules/llm/hooks";
import {
  useEmailCampaign,
  usePauseEmailCampaign,
  useResumeEmailCampaign,
  useStartEmailCampaign,
  useUpdateEmailCampaign,
} from "../hooks";

/**
 * The model that writes this campaign's AI-written sequence steps. Saved on
 * change; a model that was deactivated since shows as "(unavailable)".
 */
function CampaignAiModelPicker({ campaignId, value }: { campaignId: string; value: string | null }) {
  const { data: models, isPending } = useModels();
  const update = useUpdateEmailCampaign(campaignId);
  const active = (models ?? []).filter((m) => m.selectable);
  const current = (models ?? []).find((m) => m.id === value);
  const label = (m: { display_name?: string | null; name: string }) => m.display_name?.trim() || m.name;

  return (
    <label
      className="flex items-center gap-2 text-xs text-muted-foreground"
      title="Writes the emails of sequence steps with “AI-written” switched on"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="hidden sm:inline">AI model</span>
      <select
        aria-label="AI model for AI-written emails"
        value={value ?? ""}
        disabled={isPending || update.isPending}
        onChange={(e) => update.mutate({ ai_model_id: e.target.value || null })}
        className="h-8 w-56 truncate rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="">{isPending ? "Loading models…" : "No AI model"}</option>
        {value && current && !current.selectable ? (
          <option value={value}>{label(current)} (unavailable)</option>
        ) : null}
        {active.map((m) => (
          <option key={m.id} value={m.id} title={label(m)}>
            {label(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

interface CampaignHeaderProps {
  id: string;
  name?: string;
  status?: string;
  onStart?: () => void;
  onPause?: () => void;
  isStarting?: boolean;
  isPausing?: boolean;
}

export function CampaignHeader({
  id,
  name: nameProp,
  status: statusProp,
  onStart: onStartProp,
  onPause: onPauseProp,
  isStarting: isStartingProp,
  isPausing: isPausingProp,
}: CampaignHeaderProps) {
  // Load the campaign so the header shows its real name/status (the layout only knows the id)
  const { data: campaign } = useEmailCampaign(id);
  const startMutation = useStartEmailCampaign(id);
  const pauseMutation = usePauseEmailCampaign(id);
  const resumeMutation = useResumeEmailCampaign(id);

  const name = nameProp ?? campaign?.name ?? "Campaign Workspace";
  const status = statusProp ?? campaign?.status ?? "draft";
  const onStart =
    onStartProp ??
    (() => (status === "paused" ? resumeMutation.mutate() : startMutation.mutate()));
  const onPause = onPauseProp ?? (() => pauseMutation.mutate());
  const isStarting = isStartingProp ?? (startMutation.isPending || resumeMutation.isPending);
  const isPausing = isPausingProp ?? pauseMutation.isPending;
  const getStatusBadge = (s: string) => {
    switch (s.toLowerCase()) {
      case "sending":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">🟢 Sending</Badge>;
      case "scheduled":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">🟡 Scheduled</Badge>;
      case "paused":
        return <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">⏸️ Paused</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">✅ Completed</Badge>;
      default:
        return <Badge variant="neutral">{s === "draft" ? "Draft" : s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 border-b border-border bg-card/40 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/tools/email">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </Button>
          <div className="h-5 w-px bg-border/60" />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {name}
            </h1>
            {getStatusBadge(status)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CampaignAiModelPicker campaignId={id} value={campaign?.ai_model_id ?? null} />
          {status === "sending" && onPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              disabled={isPausing}
              className="gap-1.5 text-amber-600 dark:text-amber-400"
            >
              <Pause className="h-4 w-4" />
              <span>Pause Campaign</span>
            </Button>
          )}

          {(status === "draft" || status === "paused") && onStart && (
            <Button
              variant="primary"
              size="sm"
              onClick={onStart}
              disabled={isStarting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Play className="h-4 w-4" />
              <span>{status === "paused" ? "Resume Sending" : "Start Sending"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
