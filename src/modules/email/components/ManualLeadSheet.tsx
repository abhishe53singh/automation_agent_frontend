"use client";

import { useState } from "react";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  FileSpreadsheet,
  X,
  ListPlus,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import { useCreateManualLeadsBatch, useEmailLeadLists } from "../hooks";

interface SheetRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  phone: string;
  company_domain: string;
  company_size: string;
  industry: string;
  location: string;
  linkedin_url: string;
  tags: string;
}

const createEmptyRow = (): SheetRow => ({
  id: Math.random().toString(36).substring(2, 9),
  email: "",
  first_name: "",
  last_name: "",
  company: "",
  title: "",
  phone: "",
  company_domain: "",
  company_size: "",
  industry: "",
  location: "",
  linkedin_url: "",
  tags: "",
});

interface ManualLeadSheetProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function ManualLeadSheet({
  onClose,
  onSuccess,
}: ManualLeadSheetProps) {
  const [rows, setRows] = useState<SheetRow[]>(() =>
    Array.from({ length: 5 }, createEmptyRow)
  );
  const [selectedListId, setSelectedListId] = useState<string>("none");
  const [newListName, setNewListName] = useState<string>("");

  const { data: leadLists } = useEmailLeadLists();
  const createBatchMutation = useCreateManualLeadsBatch();

  const handleCellChange = (
    index: number,
    field: keyof SheetRow,
    value: string
  ) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddRow = (count: number = 1) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, createEmptyRow),
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRow()];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleClearAll = () => {
    setRows(Array.from({ length: 5 }, createEmptyRow));
  };

  // Smart paste support from Excel / Google Sheets
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: keyof SheetRow
  ) => {
    const text = e.clipboardData.getData("text");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) {
      return; // Regular single-cell paste
    }

    e.preventDefault();
    const lines = text.trim().split(/\r\n|\n|\r/);
    const fieldOrder: (keyof SheetRow)[] = [
      "email",
      "first_name",
      "last_name",
      "company",
      "title",
      "phone",
      "company_domain",
      "company_size",
      "industry",
      "location",
      "linkedin_url",
      "tags",
    ];
    const startColIndex = fieldOrder.indexOf(field);

    setRows((prev) => {
      const updated = [...prev];
      lines.forEach((line, lineOffset) => {
        const targetRowIdx = rowIndex + lineOffset;
        if (!updated[targetRowIdx]) {
          updated[targetRowIdx] = createEmptyRow();
        }

        const cells = line.split("\t");
        cells.forEach((cellVal, colOffset) => {
          const targetFieldIdx = startColIndex + colOffset;
          if (targetFieldIdx < fieldOrder.length) {
            const targetField = fieldOrder[targetFieldIdx];
            updated[targetRowIdx] = {
              ...updated[targetRowIdx],
              [targetField]: cellVal.trim(),
            };
          }
        });
      });
      return updated;
    });

    toast.success(`Pasted ${lines.length} row(s) from spreadsheet`);
  };

  const filledRows = rows.filter((r) => r.email.trim() !== "");

  const handleSave = async () => {
    if (filledRows.length === 0) {
      toast.error("Please enter at least one lead with a valid email address.");
      return;
    }

    // Verify emails
    const invalidEmails = filledRows.filter(
      (r) => !r.email.includes("@") || !r.email.includes(".")
    );
    if (invalidEmails.length > 0) {
      toast.error(
        `Found ${invalidEmails.length} invalid email address(es). Please verify rows.`
      );
      return;
    }

    const payloadLeads = filledRows.map((r) => ({
      email: r.email.trim().toLowerCase(),
      first_name: r.first_name.trim() || undefined,
      last_name: r.last_name.trim() || undefined,
      company: r.company.trim() || undefined,
      title: r.title.trim() || undefined,
      phone: r.phone.trim() || undefined,
      company_domain: r.company_domain.trim() || undefined,
      company_size: r.company_size.trim() || undefined,
      industry: r.industry.trim() || undefined,
      location: r.location.trim() || undefined,
      linkedin_url: r.linkedin_url.trim() || undefined,
      tags: r.tags
        ? r.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    }));

    try {
      await createBatchMutation.mutateAsync({
        leads: payloadLeads,
        list_id: selectedListId !== "none" ? selectedListId : undefined,
        new_list_name: newListName.trim() || undefined,
      });

      // Reset
      setRows(Array.from({ length: 5 }, createEmptyRow));
      setNewListName("");
      if (onSuccess) onSuccess();
    } catch {
      // Error handled by hook toast
    }
  };

  return (
    <Card className="border border-border bg-card rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-border bg-card/60">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Leads</span>
            </Button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Manual Lead Entry</span>
              <Badge variant="outline" className="text-[11px] font-normal py-0">
                In-Page Sheet
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter personal details, company profile, domain, scale, and location. Only email is mandatory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Sheet</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddRow(1)}
            className="text-xs h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Row</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddRow(5)}
            className="text-xs h-8"
          >
            <span>+ 5 Rows</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createBatchMutation.isPending || filledRows.length === 0}
            className="text-xs h-8 gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>
              {createBatchMutation.isPending
                ? "Saving..."
                : `Save Leads (${filledRows.length})`}
            </span>
          </Button>
        </div>
      </div>

      {/* Target List Selector Toolbar */}
      <div className="px-5 py-3 border-b border-border/60 bg-muted/20 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 min-w-[240px]">
          <span className="text-muted-foreground font-medium">Add to List:</span>
          <select
            value={selectedListId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              if (e.target.value !== "new") setNewListName("");
            }}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="none">Default / Unassigned</option>
            <option value="new">+ Create New List...</option>
            {leadLists?.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.total_leads || 0} leads)
              </option>
            ))}
          </select>
        </div>

        {selectedListId === "new" && (
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="text-muted-foreground font-medium">List Name:</span>
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g. Q4 Target Accounts"
              className="h-8 text-xs"
            />
          </div>
        )}

        <div className="ml-auto text-muted-foreground">
          <strong>{filledRows.length}</strong> of <strong>{rows.length}</strong> rows filled
        </div>
      </div>

      {/* Spreadsheet Table View (X-Scrollable & Sticky Header) */}
      <div className="flex-1 overflow-x-auto max-h-[580px] overflow-y-auto bg-card">
        <table className="w-full border-collapse border border-border text-xs select-none">
          {/* Non-editable Pre-filled Header Row */}
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b border-border text-muted-foreground shadow-sm">
            <tr>
              <th className="w-12 py-2.5 px-2 text-center font-semibold border-r border-border bg-muted">
                #
              </th>
              <th className="min-w-[230px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Email Address <span className="text-rose-500">*</span>
              </th>
              <th className="min-w-[140px] py-2.5 px-3 text-left font-semibold border-r border-border">
                First Name
              </th>
              <th className="min-w-[140px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Last Name
              </th>
              <th className="min-w-[160px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Company
              </th>
              <th className="min-w-[160px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Domain / Website
              </th>
              <th className="min-w-[130px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Scale / Size
              </th>
              <th className="min-w-[140px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Job Title
              </th>
              <th className="min-w-[140px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Industry
              </th>
              <th className="min-w-[140px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Location
              </th>
              <th className="min-w-[140px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Phone
              </th>
              <th className="min-w-[160px] py-2.5 px-3 text-left font-semibold border-r border-border">
                LinkedIn URL
              </th>
              <th className="min-w-[160px] py-2.5 px-3 text-left font-semibold border-r border-border">
                Tags (comma-separated)
              </th>
              <th className="w-12 py-2.5 px-2 text-center font-semibold">
                Del
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-sans">
            {rows.map((row, index) => {
              const hasEmail = Boolean(row.email.trim());
              const isInvalid =
                hasEmail && (!row.email.includes("@") || !row.email.includes("."));

              return (
                <tr
                  key={row.id}
                  className="hover:bg-muted/20 group transition-colors"
                >
                  {/* Row Index */}
                  <td className="w-12 py-1 px-2 text-center text-muted-foreground/80 font-mono bg-muted/15 border-r border-border text-[11px]">
                    {index + 1}
                  </td>

                  {/* Email Cell (Required) */}
                  <td className="p-0 border-r border-border relative">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) =>
                        handleCellChange(index, "email", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "email")}
                      className={`w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors ${
                        isInvalid
                          ? "border-b-2 border-rose-500 bg-rose-500/5"
                          : ""
                      }`}
                    />
                    {isInvalid && (
                      <span
                        title="Invalid email format"
                        className="absolute right-2 top-2.5 text-rose-500"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    )}
                  </td>

                  {/* First Name Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.first_name}
                      onChange={(e) =>
                        handleCellChange(index, "first_name", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "first_name")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Last Name Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.last_name}
                      onChange={(e) =>
                        handleCellChange(index, "last_name", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "last_name")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Company Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.company}
                      onChange={(e) =>
                        handleCellChange(index, "company", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "company")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Domain / Website Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.company_domain}
                      onChange={(e) =>
                        handleCellChange(index, "company_domain", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "company_domain")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Scale / Size Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.company_size}
                      onChange={(e) =>
                        handleCellChange(index, "company_size", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "company_size")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Job Title Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        handleCellChange(index, "title", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "title")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Industry Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.industry}
                      onChange={(e) =>
                        handleCellChange(index, "industry", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "industry")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Location Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.location}
                      onChange={(e) =>
                        handleCellChange(index, "location", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "location")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Phone Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="tel"
                      value={row.phone}
                      onChange={(e) =>
                        handleCellChange(index, "phone", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "phone")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* LinkedIn URL Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.linkedin_url}
                      onChange={(e) =>
                        handleCellChange(index, "linkedin_url", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "linkedin_url")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Tags Cell */}
                  <td className="p-0 border-r border-border">
                    <input
                      type="text"
                      value={row.tags}
                      onChange={(e) =>
                        handleCellChange(index, "tags", e.target.value)
                      }
                      onPaste={(e) => handlePaste(e, index, "tags")}
                      className="w-full h-9 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors"
                    />
                  </td>

                  {/* Delete Row Action */}
                  <td className="w-12 py-1 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="p-1 rounded text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom Toolbar & Tips */}
        <div className="p-3 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddRow(1)}
              className="text-xs h-8 gap-1.5 text-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Row</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddRow(5)}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              <span>+ 5 Rows</span>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tip: You can select and copy cells directly from Excel or Google Sheets and paste (Ctrl+V) into any row.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {filledRows.length > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Ready to commit {filledRows.length} valid lead(s)
            </span>
          ) : (
            <span>Enter email addresses to save contacts</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Back to Leads Table
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createBatchMutation.isPending || filledRows.length === 0}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>
              {createBatchMutation.isPending ? "Saving..." : "Save Leads"}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
