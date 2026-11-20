"use client";

import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { Textarea } from "@/shared/ui/Textarea";
import { useGenerateEmailTemplateAi } from "../hooks";

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onGenerated?: (template: any) => void;
}

export function AIGenerateDialog({
  open,
  onOpenChange,
  onSuccess,
  onGenerated,
}: AIGenerateDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("cold_outreach");
  const generateMutation = useGenerateEmailTemplateAi();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      const generated = await generateMutation.mutateAsync({ prompt, category });
      onOpenChange(false);
      setPrompt("");
      if (onGenerated) onGenerated(generated);
      if (onSuccess) onSuccess();
    } catch {
      // error handled by mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>AI Email Template Generator</DialogTitle>
          </div>
          <DialogDescription>
            Describe your email goal, target persona, and value proposition. AI will craft a high-converting HTML template with merge tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Outreach Objective & Audience
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Introduce our new automated scraping platform to Heads of Growth at B2B SaaS companies. Keep it under 100 words with a casual Tuesday/Thursday call request."
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="cold_outreach">Cold Outreach</option>
              <option value="follow_up">Follow Up</option>
              <option value="product_update">Product Announcement</option>
              <option value="newsletter">Newsletter</option>
            </select>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Crafting Template...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Generate Template</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
