"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, StopCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Skeleton } from "@/shared/ui/Skeleton";

import {
  useEmailCampaign,
  useUpdateEmailCampaign,
  useDeleteEmailCampaign,
  useCancelEmailCampaign,
} from "@/modules/email/hooks";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function readBrowserTimezones(): { browserTz: string; zones: string[] } {
  let browserTz = "UTC";
  let zones: string[] = [];
  try {
    browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    zones =
      (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    // Older browsers: fall back to UTC + the browser zone only
  }
  return { browserTz, zones: Array.from(new Set(["UTC", browserTz, ...zones])) };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignSettingsSubTabPage({ params }: PageProps) {
  const { id: campaignId } = use(params);
  const router = useRouter();

  const { data: campaign, isLoading } = useEmailCampaign(campaignId);
  const updateMutation = useUpdateEmailCampaign(campaignId);
  const deleteMutation = useDeleteEmailCampaign();
  const cancelMutation = useCancelEmailCampaign(campaignId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [batchSize, setBatchSize] = useState(50);
  const [batchDelay, setBatchDelay] = useState(60);
  const [kanbanAutoAssign, setKanbanAutoAssign] = useState(true);
  const [windowEnabled, setWindowEnabled] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [sendDays, setSendDays] = useState<number[]>([0, 1, 2, 3, 4]);
  // Timezone list is read on the client only (avoids a server/client render mismatch)
  const [{ browserTz, zones }, setTzInfo] = useState({ browserTz: "UTC", zones: ["UTC"] });
  useEffect(() => setTzInfo(readBrowserTimezones()), []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || "");
      setDescription(campaign.description || "");
      setBatchSize(campaign.batch_size || 50);
      setBatchDelay(campaign.batch_delay_seconds || 60);
      setKanbanAutoAssign(campaign.kanban_auto_assign ?? true);
      setWindowEnabled(campaign.send_window_enabled ?? false);
      setTimezone(campaign.send_timezone || "UTC");
      setWindowStart(campaign.send_window_start || "09:00");
      setWindowEnd(campaign.send_window_end || "17:00");
      setSendDays(campaign.send_days ?? [0, 1, 2, 3, 4]);
    }
  }, [campaign]);

  const handleSave = async () => {
    if (windowEnabled && sendDays.length === 0) {
      toast.error("Pick at least one sending day");
      return;
    }
    if (windowEnabled && windowStart === windowEnd) {
      toast.error("Sending window start and end can't be the same");
      return;
    }
    await updateMutation.mutateAsync({
      send_window_enabled: windowEnabled,
      send_timezone: timezone,
      send_window_start: windowStart,
      send_window_end: windowEnd,
      send_days: sendDays,
      name,
      description,
      batch_size: batchSize,
      batch_delay_seconds: batchDelay,
      kanban_auto_assign: kanbanAutoAssign,
    });
  };

  if (isLoading || !campaign) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Campaign Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Throttling, sending hours, timezone and delivery intervals.
        </p>
      </div>

      <Card className="p-6 space-y-4 border-border">
        <h3 className="text-base font-semibold text-foreground">General Info</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Campaign Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <h3 className="text-base font-semibold text-foreground pt-3 border-t border-border/40">
          Sending Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Batch Size</label>
            <Input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              min={1}
              max={500}
            />
            <p className="text-[11px] text-muted-foreground">Emails sent per dispatch cycle</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Batch Delay (seconds)</label>
            <Input
              type="number"
              value={batchDelay}
              onChange={(e) => setBatchDelay(Number(e.target.value))}
              min={5}
              max={3600}
            />
            <p className="text-[11px] text-muted-foreground">Interval between batches to prevent spam flags</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Switch
            checked={kanbanAutoAssign}
            onCheckedChange={setKanbanAutoAssign}
          />
          <span className="text-xs text-foreground font-medium">
            Auto-advance pipeline stages (Sent → Contacted, Opened → Opened, Replied → Replied)
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground pt-3 border-t border-border/40">
          Sending Schedule
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <Switch
              checked={windowEnabled}
              onCheckedChange={(on) => {
                setWindowEnabled(on);
                // First time on: default to the user's own timezone rather than UTC
                if (on && timezone === "UTC" && browserTz !== "UTC") setTimezone(browserTz);
              }}
            />
            <span className="text-xs text-foreground font-medium">
              Only send during set hours (applies to the initial email and every follow-up)
            </span>
          </label>

          <div className={`space-y-3 ${windowEnabled ? "" : "opacity-50 pointer-events-none"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-medium text-foreground" htmlFor="send-tz">
                  Timezone
                </label>
                <select
                  id="send-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {Array.from(new Set([timezone, ...zones])).map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                      {tz === browserTz ? " (your timezone)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="send-start">
                  From
                </label>
                <Input id="send-start" type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="send-end">
                  Until
                </label>
                <Input id="send-end" type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">Days</span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((day, i) => {
                  const on = sendDays.includes(i);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSendDays((prev) => (on ? prev.filter((d) => d !== i) : [...prev, i].sort()))
                      }
                      className={`h-8 min-w-12 rounded-md border px-2 text-xs font-medium transition-colors ${
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Emails that come due outside these hours wait until the window next opens.
              {windowStart > windowEnd && " The window runs overnight, past midnight."}
            </p>
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? "Saving..." : "Save Settings"}</span>
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-destructive/30 space-y-4">
        <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
        <p className="text-xs text-muted-foreground">
          Cancel remaining queued sends or delete this campaign entirely. Completed dispatches remain in logs.
        </p>

        <div className="flex flex-wrap gap-3">
          {campaign.status === "sending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmCancel(true)}
              className="text-amber-600 border-amber-500/40 hover:bg-amber-500/10 gap-1.5"
            >
              <StopCircle className="h-4 w-4" />
              <span>Cancel Remaining Sends</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Campaign</span>
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel Campaign Dispatches"
        description="Are you sure you want to cancel remaining outgoing emails for this campaign? Any already delivered emails cannot be recalled."
        confirmLabel="Cancel Remaining"
        variant="destructive"
        onConfirm={async () => {
          await cancelMutation.mutateAsync();
          setConfirmCancel(false);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? All queued dispatches will be permanently removed."
        confirmLabel="Delete Campaign"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(campaignId);
          router.push("/tools/email");
        }}
      />
    </div>
  );
}
