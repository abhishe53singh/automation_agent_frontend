"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Sparkles, Mail, Users, FileCode2, Settings2, Send } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Switch } from "@/shared/ui/Switch";
import { Badge } from "@/shared/ui/Badge";

import { useEmailAccounts, useEmailLeadLists, useEmailTemplates, useCreateEmailCampaign, useStartEmailCampaign } from "../hooks";

export function CampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [listId, setListId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [batchSize, setBatchSize] = useState(50);
  const [batchDelay, setBatchDelay] = useState(60);
  const [kanbanAutoAssign, setKanbanAutoAssign] = useState(true);

  const { data: accounts } = useEmailAccounts();
  const { data: leadLists } = useEmailLeadLists();
  const { data: templates } = useEmailTemplates();

  const createMutation = useCreateEmailCampaign();

  const handleFinish = async (andStart: boolean = false) => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    const payload = {
      name,
      description: description || undefined,
      account_id: accountId || undefined,
      list_id: listId || undefined,
      template_id: templateId || undefined,
      batch_size: batchSize,
      batch_delay_seconds: batchDelay,
      kanban_auto_assign: kanbanAutoAssign,
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      if (andStart && created.id) {
        // Trigger immediate start
        await fetch(`/api/email/email-campaigns/${created.id}/start`, { method: "POST" });
        toast.success("Campaign launched and sending dispatches!");
      }
      router.push(`/tools/email/campaigns/${created.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create campaign");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Wizard Step Indicator */}
      <div className="grid grid-cols-5 gap-2 border-b border-border/40 pb-4 text-center">
        {[
          { num: 1, label: "Basics" },
          { num: 2, label: "Mailbox" },
          { num: 3, label: "Audience" },
          { num: 4, label: "Template" },
          { num: 5, label: "Review" },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-1">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s.num
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : step > s.num
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
            </span>
            <span className={`text-[11px] ${step === s.num ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: Basics */}
      {step === 1 && (
        <Card className="p-6 space-y-4 border-border">
          <h3 className="text-base font-semibold text-foreground">Step 1: Campaign Basics</h3>
          <p className="text-xs text-muted-foreground">
            Provide a descriptive name and internal summary for this outreach campaign.
          </p>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-foreground">Campaign Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Cold Outreach — Enterprise Tech"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe outreach goals, persona criteria, and key metrics..."
              rows={3}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              onClick={() => {
                if (!name.trim()) {
                  toast.error("Please enter a campaign name");
                  return;
                }
                setStep(2);
              }}
              className="gap-1.5"
            >
              <span>Next: Select Mailbox</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Mailbox */}
      {step === 2 && (
        <Card className="p-6 space-y-4 border-border">
          <h3 className="text-base font-semibold text-foreground">Step 2: Sending Mailbox</h3>
          <p className="text-xs text-muted-foreground">
            Select the verified SMTP email account used to dispatch dispatches for this campaign.
          </p>

          <div className="space-y-2 pt-2">
            {!accounts || accounts.length === 0 ? (
              <p className="text-xs text-destructive">
                No mailboxes connected yet. You can still create a draft and connect a mailbox later.
              </p>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => setAccountId(acc.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    accountId === acc.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{acc.label}</p>
                      <p className="text-[11px] text-muted-foreground">{acc.from_name} &lt;{acc.from_email}&gt;</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Limit: {acc.daily_send_limit}/day
                  </Badge>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} className="gap-1.5">
              <span>Next: Audience</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Audience */}
      {step === 3 && (
        <Card className="p-6 space-y-4 border-border">
          <h3 className="text-base font-semibold text-foreground">Step 3: Audience & Recipients</h3>
          <p className="text-xs text-muted-foreground">
            Select the contact lead list that should receive this outreach sequence.
          </p>

          <div className="space-y-2 pt-2">
            {!leadLists || leadLists.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No contact lists created yet. You can import contacts or assign leads later from the workspace.
              </p>
            ) : (
              leadLists.map((lst) => (
                <div
                  key={lst.id}
                  onClick={() => setListId(lst.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    listId === lst.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{lst.name}</p>
                      {lst.description && (
                        <p className="text-[11px] text-muted-foreground">{lst.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {lst.lead_count} Contacts
                  </Badge>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(4)} className="gap-1.5">
              <span>Next: Template</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Template */}
      {step === 4 && (
        <Card className="p-6 space-y-4 border-border">
          <h3 className="text-base font-semibold text-foreground">Step 4: Email Template</h3>
          <p className="text-xs text-muted-foreground">
            Select the HTML template and merge-tag structure for outgoing emails.
          </p>

          <div className="space-y-2 pt-2">
            {!templates || templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No templates in library yet. You can select one later from the campaign workspace.
              </p>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setTemplateId(tpl.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    templateId === tpl.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{tpl.name}</p>
                      <p className="text-[11px] text-muted-foreground">Subject: {tpl.subject}</p>
                    </div>
                  </div>
                  {tpl.is_ai_generated && (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      AI
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(5)} className="gap-1.5">
              <span>Next: Settings & Review</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 5: Review & Throttling */}
      {step === 5 && (
        <Card className="p-6 space-y-5 border-border">
          <h3 className="text-base font-semibold text-foreground">Step 5: Throttling & Launch Review</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Batch Size</label>
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                min={1}
                max={500}
              />
              <span className="text-[11px] text-muted-foreground">Dispatches per worker sweep</span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Delay (seconds)</label>
              <Input
                type="number"
                value={batchDelay}
                onChange={(e) => setBatchDelay(Number(e.target.value))}
                min={5}
                max={3600}
              />
              <span className="text-[11px] text-muted-foreground">Interval between batches</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={kanbanAutoAssign}
              onCheckedChange={setKanbanAutoAssign}
            />
            <span className="text-xs text-foreground font-medium">
              Auto-advance leads across Kanban pipeline (Sent → Opened → Replied)
            </span>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border/40 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campaign:</span>
              <span className="font-semibold text-foreground">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mailbox:</span>
              <span className="font-medium text-foreground">{accountId ? "Configured" : "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lead List:</span>
              <span className="font-medium text-foreground">{listId ? "Assigned" : "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template:</span>
              <span className="font-medium text-foreground">{templateId ? "Selected" : "None"}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setStep(4)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={createMutation.isPending}
                onClick={() => handleFinish(false)}
              >
                Save as Draft
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={() => handleFinish(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="h-4 w-4" />
                <span>Launch & Start Sending</span>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
