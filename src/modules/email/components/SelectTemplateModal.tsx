"use client";

import { useMemo, useState } from "react";
import {
  FolderOpen,
  Search,
  Check,
  FileCode2,
  Sparkles,
  Plus,
  ArrowRight,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import { Skeleton } from "@/shared/ui/Skeleton";
import type { EmailTemplateOut } from "../schemas";

interface SelectTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplateOut[] | undefined;
  isLoading?: boolean;
  currentTemplateId?: string | null;
  onSelect: (template: EmailTemplateOut) => void;
  onNewBlank?: () => void;
  onOpenAi?: () => void;
}

export function SelectTemplateModal({
  open,
  onOpenChange,
  templates = [],
  isLoading = false,
  currentTemplateId,
  onSelect,
  onNewBlank,
  onOpenAi,
}: SelectTemplateModalProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return ["all", ...Array.from(set)];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        categoryFilter === "all" || tpl.category === categoryFilter;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.subject.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [templates, categoryFilter, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-card/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Select Outreach Template
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose a saved email template from your library to attach to this campaign.
              </DialogDescription>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates by name or subject..."
                className="pl-9 h-8 text-xs bg-background"
              />
            </div>

            {categories.length > 2 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat.replace("_", " ")}
                  </option>
                ))}
              </select>
            )}
          </div>
        </DialogHeader>

        {/* Template List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/40">
              <FileCode2 className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">No templates found</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
                {search
                  ? "No templates match your search criteria."
                  : "You haven't created any templates in your library yet."}
              </p>
              <div className="flex items-center gap-2">
                {onOpenAi && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenAi();
                    }}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Generate with AI</span>
                  </Button>
                )}
                {onNewBlank && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onNewBlank();
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Blank Template</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isSelected = tpl.id === currentTemplateId;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    onSelect(tpl);
                    onOpenChange(false);
                  }}
                  className={`group relative p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {tpl.name}
                      </span>
                      {tpl.category && (
                        <Badge variant="outline" className="text-[10px] py-0 border-border text-muted-foreground capitalize">
                          {tpl.category.replace("_", " ")}
                        </Badge>
                      )}
                      {tpl.is_ai_generated && (
                        <Badge variant="outline" className="text-[10px] py-0 border-primary/30 text-primary">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] py-0 gap-1">
                          <Check className="h-2.5 w-2.5" /> Current Campaign Template
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium text-foreground/80">Subject: </span>
                      {tpl.subject}
                    </p>

                    {tpl.merge_tags && tpl.merge_tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {tpl.merge_tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-muted/60 text-muted-foreground rounded px-1.5 py-0.2 font-mono"
                          >
                            &#123;&#123;{tag}&#125;&#125;
                          </span>
                        ))}
                        {tpl.merge_tags.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{tpl.merge_tags.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant={isSelected ? "outline" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(tpl);
                        onOpenChange(false);
                      }}
                      className="gap-1.5 text-xs h-8"
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <span>Apply to Campaign</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            {onNewBlank && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onNewBlank();
                }}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Blank Draft</span>
              </Button>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
