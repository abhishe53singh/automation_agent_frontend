"use client";

import { useState, useEffect } from "react";
import { Eye, Save, Code, FolderOpen } from "lucide-react";

import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { MergeTagPicker } from "./MergeTagPicker";
import type { EmailTemplateOut } from "../schemas";

interface TemplateEditorProps {
  initialTemplate?: EmailTemplateOut | null;
  onSave: (data: { name: string; subject: string; body_html: string }) => Promise<void>;
  onOpenSelect?: () => void;
  saveLabel?: string;
  isLoading?: boolean;
}

export function TemplateEditor({
  initialTemplate,
  onSave,
  onOpenSelect,
  saveLabel,
  isLoading = false,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialTemplate?.name || "Untitled Template");
  const [subject, setSubject] = useState(
    initialTemplate?.subject || "Quick inquiry for {{first_name}} at {{company}}"
  );
  const [bodyHtml, setBodyHtml] = useState(
    initialTemplate?.body_html ||
      `<p>Hi {{first_name}},</p>\n<p>I hope your week is off to a great start at {{company}}.</p>\n<p>We built an automated platform that helps teams scale their outreach without spending hours each week.</p>\n<p>Would you be open to a 10-minute chat this week?</p>\n<p>Best,<br><strong>Outreach Team</strong></p>\n<p style="font-size: 11px; color: #888;"><a href="{{unsubscribe_link}}">Unsubscribe</a></p>`
  );

  // Synchronize internal state when an assigned or selected template changes
  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name || "Untitled Template");
      setSubject(initialTemplate.subject || "");
      setBodyHtml(initialTemplate.body_html || "");
    }
  }, [initialTemplate]);

  const sampleLead = {
    first_name: "Sarah",
    last_name: "Connor",
    company: "Cyberdyne Systems",
    email: "sarah@cyberdyne.io",
    title: "Chief Technology Officer",
    unsubscribe_link: "#unsubscribe-preview",
  };

  const getRenderedHtml = () => {
    let rendered = bodyHtml;
    rendered = rendered.replace(/\{\{\s*first_name\s*\}\}/g, sampleLead.first_name);
    rendered = rendered.replace(/\{\{\s*last_name\s*\}\}/g, sampleLead.last_name);
    rendered = rendered.replace(/\{\{\s*company\s*\}\}/g, sampleLead.company);
    rendered = rendered.replace(/\{\{\s*title\s*\}\}/g, sampleLead.title);
    rendered = rendered.replace(/\{\{\s*email\s*\}\}/g, sampleLead.email);
    rendered = rendered.replace(/\{\{\s*unsubscribe_link\s*\}\}/g, sampleLead.unsubscribe_link);
    return rendered;
  };

  const getRenderedSubject = () => {
    let rendered = subject;
    rendered = rendered.replace(/\{\{\s*first_name\s*\}\}/g, sampleLead.first_name);
    rendered = rendered.replace(/\{\{\s*company\s*\}\}/g, sampleLead.company);
    return rendered;
  };

  const insertTagAtCursor = (tag: string) => {
    setBodyHtml((prev) => prev + " " + tag);
  };

  const handleSave = async () => {
    await onSave({ name, subject, body_html: bodyHtml });
  };

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="flex-1 max-w-sm space-y-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template Name..."
            className="font-semibold text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenSelect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSelect}
              className="gap-1.5"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Choose from Library</span>
            </Button>
          )}
          <MergeTagPicker onSelectTag={insertTagAtCursor} />
          <Button onClick={handleSave} disabled={isLoading} size="sm" className="gap-1.5">
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Saving..." : (saveLabel || "Save Template")}</span>
          </Button>
        </div>
      </div>

      {/* Subject input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Email Subject Line
        </label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject line with merge tags: e.g. Hey {{first_name}}..."
        />
      </div>

      {/* Split Pane: Code vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Code Editor */}
        <Card className="flex flex-col h-[520px] overflow-hidden border-border bg-card">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-primary" />
              <span>HTML Source Code</span>
            </div>
            <span className="text-[11px]">Supports HTML & Merge Tags</span>
          </div>

          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="Type your HTML email markup here..."
            className="flex-1 w-full resize-none p-4 font-mono text-xs text-foreground bg-transparent focus:outline-none scrollbar-thin"
          />
        </Card>

        {/* Right: Live Preview */}
        <Card className="flex flex-col h-[520px] overflow-hidden border-border bg-card">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Live Sample Preview</span>
            </div>
            <Badge variant="outline" className="text-[10px] py-0 border-primary/30 text-primary">
              Lead: {sampleLead.first_name} @ {sampleLead.company}
            </Badge>
          </div>

          <div className="p-3 bg-muted/20 border-b border-border/40 text-xs">
            <span className="text-muted-foreground">Subject: </span>
            <span className="font-semibold text-foreground">{getRenderedSubject()}</span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-white text-slate-800 rounded-b-xl scrollbar-thin">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
