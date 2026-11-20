"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Check, ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import { previewLeadImport } from "../api";
import { useConfirmLeadImport, useEmailLeadLists } from "../hooks";
import type { EmailLeadImportPreview } from "../schemas";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetListId?: string;
  onSuccess?: () => void;
}

export function ImportWizard({
  open,
  onOpenChange,
  targetListId,
  onSuccess,
}: ImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<EmailLeadImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [listName, setListName] = useState("");
  const [tagInput, setTagInput] = useState("cold_outreach");

  const { data: leadLists } = useEmailLeadLists();
  const confirmMutation = useConfirmLeadImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsUploading(true);

    try {
      const data = await previewLeadImport(selected);
      setPreview(data);
      setMapping(data.suggested_mapping || {});
      setListName(selected.name.replace(/\.[^/.]+$/, ""));
      setStep(2);
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse import file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !file) return;

    // Check if email column is assigned
    const hasEmail = Object.values(mapping).some((v) => v === "email");
    if (!hasEmail) {
      toast.error("Please designate an Email column in your mapping.");
      return;
    }

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await confirmMutation.mutateAsync({
      list_id: targetListId || undefined,
      list_name: targetListId ? undefined : listName || "Imported List",
      column_mapping: mapping,
      rows: preview.preview_rows, // In production, pass full parsed payload or send via stream
      tags,
    });

    onOpenChange(false);
    setStep(1);
    setFile(null);
    setPreview(null);
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <DialogTitle>Import Contacts from CSV / Excel</DialogTitle>
          </div>
          <DialogDescription>
            Upload lead files to automatically parse, map columns, and ingest contacts.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-y border-border/40 py-2.5 my-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </span>
            <span className={step === 1 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              Upload File
            </span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
            <span className={step === 2 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              Map Columns
            </span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </span>
            <span className={step === 3 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              Review & Import
            </span>
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="py-8 text-center">
            <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center">
              {isUploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-sm font-medium text-foreground">Reading and parsing rows...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <h4 className="text-sm font-semibold text-foreground">
                    Drag and drop your spreadsheet, or browse
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Supports CSV and modern Excel (.xlsx). Deduplication is automatically applied to protect your user list.
                  </p>
                  <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                    <span>Select File</span>
                    <input
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Map Columns */}
        {step === 2 && preview && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Found <strong>{preview.total_rows}</strong> records with <strong>{preview.headers.length}</strong> columns.
              </span>
              <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                <Sparkles className="h-3 w-3" /> Auto-suggested mappings
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden divide-y divide-border/60 max-h-64 overflow-y-auto">
              {preview.headers.map((header) => (
                <div key={header} className="p-3 flex items-center justify-between gap-4 bg-card/60">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{header}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Sample: {preview.preview_rows[0]?.[header] || "—"}
                    </p>
                  </div>

                  <select
                    value={mapping[header] || `custom.${header}`}
                    onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="email">Email Address (Required)</option>
                    <optgroup label="Personal Info">
                      <option value="first_name">First Name</option>
                      <option value="last_name">Last Name</option>
                      <option value="title">Job Title</option>
                      <option value="phone">Phone / Mobile</option>
                      <option value="location">Location / City</option>
                      <option value="linkedin_url">Personal LinkedIn URL</option>
                    </optgroup>
                    <optgroup label="Company Info">
                      <option value="company">Company Name</option>
                      <option value="company_domain">Company Domain / Website</option>
                      <option value="company_size">Company Scale / Size</option>
                      <option value="industry">Industry / Vertical</option>
                      <option value="company_linkedin_url">Company LinkedIn URL</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value={`custom.${header}`}>Custom Field ({header})</option>
                      <option value="ignore">Don't Import (Ignore)</option>
                    </optgroup>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button size="sm" onClick={() => setStep(3)} className="gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm & List Assignment */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            {!targetListId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Target Lead List Name</label>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g. Q4 Cold Outreach Enterprise"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Lead Tags (comma separated)</label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="cold_outreach, tech, us_leads"
              />
            </div>

            <div className="rounded-lg bg-muted/30 border border-border/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source File:</span>
                <span className="font-medium text-foreground">{file?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rows to import:</span>
                <span className="font-medium text-foreground">{preview?.total_rows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duplicate Policy:</span>
                <span className="font-medium text-foreground">Skip existing contacts by email</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                size="sm"
                disabled={confirmMutation.isPending}
                onClick={handleConfirm}
                className="gap-2"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Commit Import</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
