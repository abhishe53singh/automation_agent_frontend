"use client";

import { useState } from "react";
import { FileCode2, Copy, Trash2, Edit2, Sparkles, Plus } from "lucide-react";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";

import type { EmailTemplateOut } from "../schemas";
import { useDeleteEmailTemplate, useCloneEmailTemplate } from "../hooks";

interface TemplateListProps {
  templates: EmailTemplateOut[];
  onSelectTemplate: (t: EmailTemplateOut) => void;
  onOpenCreate: () => void;
  onOpenAi: () => void;
}

export function TemplateList({
  templates,
  onSelectTemplate,
  onOpenCreate,
  onOpenAi,
}: TemplateListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useDeleteEmailTemplate();
  const cloneMutation = useCloneEmailTemplate();

  if (!templates || templates.length === 0) {
    return (
      <EmptyState
        icon={<FileCode2 className="h-10 w-10 text-muted-foreground" />}
        title="No email templates found"
        description="Build responsive HTML templates with merge tags or use AI to draft personalized copy."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onOpenAi} className="gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Generate</span>
            </Button>
            <Button onClick={onOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Create Template</span>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {templates.map((tpl) => (
        <Card
          key={tpl.id}
          className="flex flex-col justify-between p-5 border border-border hover:border-primary/50 transition-all shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <FileCode2 className="h-4 w-4 text-primary shrink-0" />
                <h3 className="font-semibold text-foreground text-sm truncate">
                  {tpl.name}
                </h3>
              </div>
              {tpl.is_ai_generated && (
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] py-0 shrink-0">
                  <Sparkles className="h-2.5 w-2.5 mr-1" /> AI
                </Badge>
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-medium line-clamp-1">
              Subject: {tpl.subject}
            </p>

            {/* Merge tag pills */}
            <div className="mt-3 flex flex-wrap gap-1">
              {tpl.merge_tags?.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  &#123;&#123;{tag}&#125;&#125;
                </span>
              ))}
              {(tpl.merge_tags?.length || 0) > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{tpl.merge_tags!.length - 4} more
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectTemplate(tpl)}
              className="gap-1.5 text-xs h-8"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => cloneMutation.mutate(tpl.id)}
                title="Clone template"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeletingId(tpl.id)}
                title="Delete template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Template"
        description="Are you sure you want to delete this template? Any drafts referencing it will need a new template assigned."
        confirmLabel="Delete Template"
        variant="destructive"
        onConfirm={async () => {
          if (deletingId) {
            await deleteMutation.mutateAsync(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
}
