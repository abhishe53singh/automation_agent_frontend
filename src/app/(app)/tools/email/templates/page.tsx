"use client";

import { useState } from "react";
import { Plus, Sparkles, ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from "@/modules/email/hooks";
import { TemplateList } from "@/modules/email/components/TemplateList";
import { TemplateEditor } from "@/modules/email/components/TemplateEditor";
import { AIGenerateDialog } from "@/modules/email/components/AIGenerateDialog";
import type { EmailTemplateOut } from "@/modules/email/schemas";

export default function TemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateOut | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const { data: templates, isLoading, refetch } = useEmailTemplates();
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate(editingTemplate?.id || "");

  const handleSave = async (data: { name: string; subject: string; body_html: string }) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync(data);
      setEditingTemplate(null);
    } else {
      await createMutation.mutateAsync(data);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Template Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, customize, and AI-generate personalized HTML email templates with dynamic merge tags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editingTemplate || isCreating ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setIsCreating(false);
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Library</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiOpen(true)}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>AI Generate</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>New Template</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {editingTemplate || isCreating ? (
        <TemplateEditor
          initialTemplate={editingTemplate}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <TemplateList
          templates={templates || []}
          onSelectTemplate={(t) => setEditingTemplate(t)}
          onOpenCreate={() => setIsCreating(true)}
          onOpenAi={() => setAiOpen(true)}
        />
      )}

      <AIGenerateDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
