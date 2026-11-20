"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Plus,
  Trash2,
  Pencil,
  Clock,
  Mail,
  Reply,
  Save,
  Undo2,
  CalendarClock,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Switch } from "@/shared/ui/Switch";
import { Skeleton } from "@/shared/ui/Skeleton";
import { TemplateEditor } from "./TemplateEditor";
import { SelectTemplateModal } from "./SelectTemplateModal";
import { AIGenerateDialog } from "./AIGenerateDialog";
import {
  useCampaignSteps,
  useUpdateCampaignSteps,
  useEmailTemplates,
  useEmailTemplate,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useEmailCampaign,
} from "../hooks";
import type { EmailCampaignStepInput, EmailTemplateOut } from "../schemas";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VARIANT_LETTERS = "ABCDEFGHIJ";
const WAIT_INPUT_CLASS =
  "h-7 w-16 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface SequenceBuilderProps {
  campaignId: string;
}

type DraftStep = EmailCampaignStepInput & { sent_count: number };

function toDraft(steps: { delay_days: number; delay_hours: number; template_ids: string[]; same_thread: boolean; sent_count?: number }[]): DraftStep[] {
  return steps.map((s) => ({
    delay_days: s.delay_days,
    delay_hours: s.delay_hours,
    template_ids: [...s.template_ids],
    same_thread: s.same_thread,
    sent_count: s.sent_count ?? 0,
  }));
}

function waitLabel(days: number, hours: number): string {
  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  return parts.length ? `after ${parts.join(" ")}` : "right after the previous email";
}

export function SequenceBuilder({ campaignId }: SequenceBuilderProps) {
  const { data: campaign } = useEmailCampaign(campaignId);
  const { data: stepsData, isLoading } = useCampaignSteps(campaignId);
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const saveSteps = useUpdateCampaignSteps(campaignId);
  const createTemplate = useCreateEmailTemplate();

  const [draft, setDraft] = useState<DraftStep[]>([]);
  const [pickerForStep, setPickerForStep] = useState<number | null>(null);
  const [aiForStep, setAiForStep] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load server state into the editable draft
  useEffect(() => {
    if (stepsData) setDraft(toDraft(stepsData.steps));
  }, [stepsData]);

  const templateById = useMemo(() => {
    const map = new Map<string, EmailTemplateOut>();
    (templates || []).forEach((t) => map.set(t.id, t));
    return map;
  }, [templates]);

  const isDirty = useMemo(() => {
    if (!stepsData) return false;
    const strip = (s: DraftStep[]) =>
      s.map(({ delay_days, delay_hours, template_ids, same_thread }) => ({
        delay_days,
        delay_hours,
        template_ids,
        same_thread,
      }));
    return JSON.stringify(strip(draft)) !== JSON.stringify(strip(toDraft(stepsData.steps)));
  }, [draft, stepsData]);

  const updateStep = (idx: number, patch: Partial<DraftStep>) =>
    setDraft((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const addVariant = (idx: number, templateId: string) => {
    const step = draft[idx];
    if (!step) return;
    if (step.template_ids.includes(templateId)) {
      toast.info("That template is already a variant of this step");
      return;
    }
    if (step.template_ids.length >= VARIANT_LETTERS.length) {
      toast.error(`A step can have at most ${VARIANT_LETTERS.length} variants`);
      return;
    }
    updateStep(idx, { template_ids: [...step.template_ids, templateId] });
  };

  const removeVariant = (idx: number, templateId: string) => {
    updateStep(idx, { template_ids: draft[idx].template_ids.filter((t) => t !== templateId) });
    if (editingId === templateId) setEditingId(null);
  };

  const addFollowUp = () =>
    setDraft((prev) => [
      ...prev,
      { delay_days: 3, delay_hours: 0, template_ids: [], same_thread: true, sent_count: 0 },
    ]);

  const removeStep = (idx: number) => setDraft((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const emptyIdx = draft.findIndex((s) => s.template_ids.length === 0);
    if (emptyIdx >= 0) {
      toast.error(
        emptyIdx === 0
          ? "Add at least one template to the initial email"
          : `Add at least one template to follow-up ${emptyIdx}`
      );
      return;
    }
    const result = await saveSteps.mutateAsync(
      draft.map(({ delay_days, delay_hours, template_ids, same_thread }) => ({
        delay_days,
        delay_hours,
        template_ids,
        same_thread,
      }))
    );
    const queued = (campaign?.total_recipients ?? 0) - (campaign?.sent_count ?? 0);
    if (draft.length > 1 && result.active_leads === 0 && queued <= 0) {
      toast.info(
        "No leads are waiting for follow-ups: everyone has replied, bounced or unsubscribed. New leads you add will get the full sequence."
      );
    }
  };

  const createBlankVariant = async (idx: number) => {
    const isFollowUp = idx > 0;
    const created = await createTemplate.mutateAsync({
      name: isFollowUp ? `Follow-up ${idx} variant` : "Initial email variant",
      subject: isFollowUp ? "Following up, {{first_name}}" : "Quick question, {{first_name}}",
      body_html: isFollowUp
        ? "<p>Hi {{first_name}},</p><p>Just bumping this to the top of your inbox — any thoughts?</p><p>Best,</p>"
        : "<p>Hi {{first_name}},</p><p></p><p>Best,</p>",
      category: "campaign",
    });
    if (created?.id) {
      addVariant(idx, created.id);
      setEditingId(created.id);
    }
  };

  if (isLoading || !stepsData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const windowOn = campaign?.send_window_enabled;
  const windowSummary = windowOn
    ? `${(campaign?.send_days || []).map((d: number) => DAY_NAMES[d]).join(", ")} · ${campaign?.send_window_start}–${campaign?.send_window_end} (${campaign?.send_timezone})`
    : "Any time — no sending window set";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Email Sequence</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            An initial email plus as many follow-up rounds as you like. Add several templates to a step to
            A/B test — leads are split evenly between them. Follow-ups stop automatically when a lead
            replies, bounces or unsubscribes.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft(toDraft(stepsData.steps))}
              className="gap-1.5"
            >
              <Undo2 className="h-4 w-4" />
              <span>Discard</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saveSteps.isPending}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{saveSteps.isPending ? "Saving..." : isDirty ? "Save Sequence" : "Saved"}</span>
          </Button>
        </div>
      </div>

      {/* Progress + window summary */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>
            Sending window: <span className="text-foreground font-medium">{windowSummary}</span>
          </span>
          <Link
            href={`/tools/email/campaigns/${campaignId}/settings` as Route}
            className="text-primary hover:underline ml-1"
          >
            Change
          </Link>
        </span>
        <span className="text-muted-foreground">
          In sequence: <span className="text-foreground font-medium">{stepsData.active_leads}</span>
        </span>
        <span className="text-muted-foreground">
          Completed: <span className="text-foreground font-medium">{stepsData.finished_leads}</span>
        </span>
        <span className="text-muted-foreground">
          Stopped (replied/bounced): <span className="text-foreground font-medium">{stepsData.stopped_leads}</span>
        </span>
      </div>

      {/* Steps timeline */}
      <div className="space-y-0">
        {draft.map((step, idx) => {
          const isInitial = idx === 0;
          const share = step.template_ids.length ? Math.round(100 / step.template_ids.length) : 0;

          return (
            <div key={idx}>
              {/* Wait connector between steps */}
              {!isInitial && (
                <div className="flex items-stretch gap-3 py-2 pl-6">
                  <div className="w-px shrink-0 bg-border" />
                  <div className="flex flex-1 min-w-0 flex-row flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Wait</span>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={step.delay_days}
                      onChange={(e) =>
                        updateStep(idx, { delay_days: Math.min(365, Math.max(0, Number(e.target.value) || 0)) })
                      }
                      className={WAIT_INPUT_CLASS}
                      aria-label={`Follow-up ${idx} wait days`}
                    />
                    <span>days</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={step.delay_hours}
                      onChange={(e) =>
                        updateStep(idx, { delay_hours: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })
                      }
                      className={WAIT_INPUT_CLASS}
                      aria-label={`Follow-up ${idx} wait hours`}
                    />
                    <span>hours after the previous email, if no reply</span>
                  </div>
                </div>
              )}

              <Card className="p-4 space-y-3 border-border">
                {/* Step header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {isInitial ? (
                          <>
                            <Mail className="h-3.5 w-3.5" /> Initial email
                          </>
                        ) : (
                          <>
                            <Reply className="h-3.5 w-3.5" /> Follow-up {idx}
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {step.template_ids.length > 1
                          ? `${step.template_ids.length} variants · ~${share}% of leads each`
                          : step.template_ids.length === 1
                            ? "1 template"
                            : "No template yet"}
                        {step.sent_count > 0 && ` · ${step.sent_count} sent`}
                        {!isInitial && ` · ${waitLabel(step.delay_days, step.delay_hours)}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isInitial && (
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <Switch
                          checked={step.same_thread}
                          onCheckedChange={(v) => updateStep(idx, { same_thread: v })}
                        />
                        <span title="On: sent as “Re: <first subject>” in the same thread. Off: a new email with this template's own subject.">
                          Reply in same thread
                        </span>
                      </label>
                    )}
                    {!isInitial && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(idx)}
                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                        title="Remove this follow-up"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Variants */}
                <div className="space-y-2">
                  {step.template_ids.map((tid, vIdx) => {
                    const tpl = templateById.get(tid);
                    const editing = editingId === tid;
                    return (
                      <div
                        key={tid}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                          editing ? "border-primary/60 bg-primary/5" : "border-border/60 bg-background/40"
                        }`}
                      >
                        <span className="h-6 w-6 shrink-0 rounded-md bg-muted text-[11px] font-bold flex items-center justify-center text-foreground">
                          {VARIANT_LETTERS[vIdx]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground truncate">
                            {tpl?.name || (templatesLoading ? "Loading…" : "Missing template")}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {!isInitial && step.same_thread
                              ? "Subject: Re: <initial email subject>"
                              : `Subject: ${tpl?.subject || "—"}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setEditingId(editing ? null : tid)}
                        >
                          <Pencil className="h-3 w-3" />
                          <span>{editing ? "Close" : "Edit"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => removeVariant(idx, tid)}
                          title="Remove variant"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setPickerForStep(idx)}
                    >
                      <Plus className="h-3 w-3" />
                      <span>{step.template_ids.length ? "Add variant" : "Choose template"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={createTemplate.isPending}
                      onClick={() => createBlankVariant(idx)}
                    >
                      <Plus className="h-3 w-3" />
                      <span>New blank</span>
                    </Button>
                  </div>
                </div>

                {/* Inline editor for the selected variant of this step */}
                {editingId && step.template_ids.includes(editingId) && (
                  <VariantEditor templateId={editingId} />
                )}
              </Card>
            </div>
          );
        })}
      </div>

      <Button variant="outline" onClick={addFollowUp} className="w-full gap-1.5 border-dashed">
        <GitBranch className="h-4 w-4" />
        <span>Add follow-up round</span>
      </Button>

      {isDirty && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You have unsaved sequence changes. Leads already part-way through the sequence will follow the
          new steps once you save.
        </p>
      )}

      <SelectTemplateModal
        open={pickerForStep !== null}
        onOpenChange={(open) => !open && setPickerForStep(null)}
        templates={templates}
        isLoading={templatesLoading}
        currentTemplateId={null}
        onSelect={(tpl) => {
          if (pickerForStep !== null) addVariant(pickerForStep, tpl.id);
          setPickerForStep(null);
        }}
        onNewBlank={() => {
          if (pickerForStep !== null) void createBlankVariant(pickerForStep);
          setPickerForStep(null);
        }}
        onOpenAi={() => {
          setAiForStep(pickerForStep);
          setPickerForStep(null);
        }}
      />

      <AIGenerateDialog
        open={aiForStep !== null}
        onOpenChange={(open) => !open && setAiForStep(null)}
        onGenerated={(tpl) => {
          if (aiForStep !== null && tpl?.id) addVariant(aiForStep, tpl.id);
          setAiForStep(null);
        }}
      />
    </div>
  );
}

function VariantEditor({ templateId }: { templateId: string }) {
  const { data: template, isLoading } = useEmailTemplate(templateId);
  const update = useUpdateEmailTemplate(templateId);

  if (isLoading || !template) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="pt-2 border-t border-border/40">
      <TemplateEditor
        key={template.id}
        initialTemplate={template}
        saveLabel="Save Template"
        isLoading={update.isPending}
        onSave={async (values) => {
          await update.mutateAsync(values);
          toast.success("Template updated");
        }}
      />
    </div>
  );
}
