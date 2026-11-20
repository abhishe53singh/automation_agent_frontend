"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Sparkles, Eye, MousePointerClick, MessageSquare, Building, ArrowRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useUpdateCampaignLeadStage } from "../hooks";
import type { CampaignKanbanOut, KanbanLeadCard } from "../schemas";

interface KanbanBoardProps {
  campaignId: string;
  kanbanData?: CampaignKanbanOut | null;
}

const STAGES_CONFIG = [
  { key: "queued", label: "Queued", color: "border-slate-500/20 text-slate-500 bg-slate-500/10" },
  { key: "contacted", label: "Contacted", color: "border-blue-500/30 text-blue-500 bg-blue-500/10" },
  { key: "opened", label: "Opened", color: "border-amber-500/30 text-amber-500 bg-amber-500/10" },
  { key: "replied", label: "Replied", color: "border-orange-500/30 text-orange-500 bg-orange-500/10" },
  { key: "interested", label: "Interested", color: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" },
  { key: "meeting_booked", label: "Meeting Booked", color: "border-purple-500/30 text-purple-600 bg-purple-500/10" },
  { key: "converted", label: "Converted", color: "border-teal-500/30 text-teal-600 bg-teal-500/10" },
  { key: "not_interested", label: "Not Interested", color: "border-rose-500/30 text-rose-600 bg-rose-500/10" },
];

export function KanbanBoard({ campaignId, kanbanData }: KanbanBoardProps) {
  const [search, setSearch] = useState("");
  const updateStageMutation = useUpdateCampaignLeadStage(campaignId);
  const router = useRouter();

  // Open this lead's conversation in the campaign inbox to continue it
  const openConversation = (leadId: string) => {
    router.push(`/tools/email/campaigns/${campaignId}/inbox?lead=${leadId}` as Route);
  };

  const stages = kanbanData?.stages || {};
  const stageCounts = kanbanData?.stage_counts || {};

  const handleMove = (leadId: string, newStage: string) => {
    updateStageMutation.mutate({ leadId, stage: newStage });
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter leads in board..."
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" className="text-xs py-1 gap-1 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3" />
            <span>Auto Progression: Sent → Opened → Replied</span>
          </Badge>
        </div>
      </div>

      {/* Horizontal scrolling board */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin">
        {STAGES_CONFIG.map((col, idx) => {
          const cards: KanbanLeadCard[] = (stages[col.key] || []).filter(
            (c) =>
              !search ||
              c.email.toLowerCase().includes(search.toLowerCase()) ||
              (c.first_name && c.first_name.toLowerCase().includes(search.toLowerCase())) ||
              (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
          );

          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-72 rounded-xl border border-border bg-card/60 p-3 flex flex-col min-h-[540px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <span className="text-xs font-bold text-foreground">
                  {col.label}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${col.color}`}>
                  {stageCounts[col.key] || cards.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-2.5 py-3 overflow-y-auto max-h-[600px] scrollbar-thin">
                {cards.length === 0 ? (
                  <div className="flex items-center justify-center h-32 border border-dashed border-border/40 rounded-lg text-center p-3">
                    <span className="text-[11px] text-muted-foreground/60">
                      No leads in {col.label.toLowerCase()}
                    </span>
                  </div>
                ) : (
                  cards.map((card) => {
                    const fullName = [card.first_name, card.last_name]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <Card
                        key={card.send_id}
                        role="link"
                        tabIndex={0}
                        title="Open conversation in inbox"
                        onClick={() => openConversation(card.lead_id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openConversation(card.lead_id);
                          }
                        }}
                        className="p-3.5 space-y-2.5 border border-border/80 hover:border-primary/50 transition-all bg-card shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <div>
                          <div className="font-semibold text-xs text-foreground truncate">
                            {card.email}
                          </div>
                          {fullName && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {fullName}
                            </div>
                          )}
                          {card.company && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Building className="h-3 w-3 shrink-0" />
                              <span className="truncate">{card.company}</span>
                            </div>
                          )}
                        </div>

                        {/* Engagement Stats */}
                        <div className="flex items-center gap-3 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5" title="Opens">
                            <Eye className={`h-3 w-3 ${card.open_count > 0 ? "text-amber-500 font-bold" : ""}`} />
                            <span>{card.open_count}</span>
                          </span>
                          <span className="flex items-center gap-0.5" title="Clicks">
                            <MousePointerClick className={`h-3 w-3 ${card.click_count > 0 ? "text-blue-500 font-bold" : ""}`} />
                            <span>{card.click_count}</span>
                          </span>
                          {card.replied_at && (
                            <span className="flex items-center gap-0.5 text-emerald-500 font-bold">
                              <MessageSquare className="h-3 w-3" />
                              <span>Replied</span>
                            </span>
                          )}
                        </div>

                        {/* Stage Shift Selector */}
                        <div
                          className="pt-1.5 flex items-center justify-between gap-1"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {idx > 0 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => handleMove(card.lead_id, STAGES_CONFIG[idx - 1].key)}
                              title={`Move to ${STAGES_CONFIG[idx - 1].label}`}
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </Button>
                          ) : <div />}

                          <select
                            value={card.pipeline_stage}
                            onChange={(e) => handleMove(card.lead_id, e.target.value)}
                            className="h-6 rounded border border-border/60 bg-muted/40 px-1 text-[10px] text-foreground focus:outline-none"
                          >
                            {STAGES_CONFIG.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          {idx < STAGES_CONFIG.length - 1 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => handleMove(card.lead_id, STAGES_CONFIG[idx + 1].key)}
                              title={`Move to ${STAGES_CONFIG[idx + 1].label}`}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          ) : <div />}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
