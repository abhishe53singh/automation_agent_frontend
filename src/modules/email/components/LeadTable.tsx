"use client";

import { useState } from "react";
import {
  Search,
  Trash2,
  Mail,
  Building,
  Phone,
  TableProperties,
  Upload,
  Globe,
  MapPin,
  ExternalLink,
  Pencil,
  Save,
  Undo2,
  X,
  AlertCircle,
} from "lucide-react";

import { Input } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";

import type { EmailLeadOut } from "../schemas";
import type { EmailLeadEdit } from "../api";
import { useBulkUpdateEmailLeads, useDeleteEmailLead } from "../hooks";

interface LeadTableProps {
  leads: EmailLeadOut[];
  onOpenImport?: () => void;
  onOpenManualSheet?: () => void;
}

/** Editable columns, in table order. Tags are edited as comma-separated text. */
const EDIT_FIELDS = [
  "email",
  "first_name",
  "last_name",
  "company",
  "company_domain",
  "company_size",
  "title",
  "industry",
  "location",
  "phone",
  "linkedin_url",
  "status",
  "tags",
] as const;
type EditField = (typeof EDIT_FIELDS)[number];

const FIELD_LABELS: Record<EditField, string> = {
  email: "Email",
  first_name: "First name",
  last_name: "Last name",
  company: "Company",
  company_domain: "Domain / website",
  company_size: "Company size",
  title: "Job title",
  industry: "Industry",
  location: "Location",
  phone: "Phone",
  linkedin_url: "LinkedIn URL",
  status: "Status",
  tags: "Tags (comma separated)",
};

function originalValue(lead: EmailLeadOut, field: EditField): string {
  if (field === "tags") return (lead.tags ?? []).join(", ");
  return (lead[field] as string | null | undefined) ?? "";
}

// Same cell look as the Spreadsheet Entry sheet (ManualLeadSheet): borderless
// inputs filling the cell, the table's grid lines form the sheet.
const CELL_INPUT =
  "w-full h-9 min-w-0 px-3 bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:bg-primary/5 transition-colors";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Up/Down/Enter move to the same column in the next/previous row, like a spreadsheet. */
function moveVertically(event: React.KeyboardEvent<HTMLElement>, row: number, col: number) {
  const step =
    event.key === "ArrowDown" || (event.key === "Enter" && !event.shiftKey)
      ? 1
      : event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)
        ? -1
        : 0;
  if (!step) return;
  // A <select> uses the arrow keys itself.
  if (event.currentTarget.tagName === "SELECT" && event.key !== "Enter") return;
  const target = document.querySelector<HTMLElement>(`[data-cell="${row + step}:${col}"]`);
  if (target) {
    event.preventDefault();
    target.focus();
    if (target instanceof HTMLInputElement) target.select();
  }
}

export function LeadTable({ leads, onOpenImport, onOpenManualSheet }: LeadTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useDeleteEmailLead();

  // In-page spreadsheet editing: drafts[leadId][field] = typed value.
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<EditField, string>>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const bulkUpdate = useBulkUpdateEmailLeads();

  const leadById = new Map((leads || []).map((l) => [l.id, l]));
  const isChanged = (lead: EmailLeadOut, field: EditField) => {
    const value = drafts[lead.id]?.[field];
    return value !== undefined && value.trim() !== originalValue(lead, field).trim();
  };
  const changedIds = Object.keys(drafts).filter((id) => {
    const lead = leadById.get(id);
    return lead && EDIT_FIELDS.some((f) => isChanged(lead, f));
  });

  const setCell = (id: string, field: EditField, value: string) => {
    setSaveError(null);
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const stopEditing = () => {
    setEditing(false);
    setDrafts({});
    setSaveError(null);
  };

  const saveEdits = async () => {
    const items: EmailLeadEdit[] = [];
    for (const id of changedIds) {
      const lead = leadById.get(id)!;
      const item: EmailLeadEdit = { id };
      for (const field of EDIT_FIELDS) {
        if (!isChanged(lead, field)) continue;
        const value = (drafts[id]![field] ?? "").trim();
        if (field === "email") {
          if (!value) {
            setSaveError(`${lead.email}: email can't be empty.`);
            return;
          }
          item.email = value;
        } else if (field === "tags") {
          item.tags = value.split(",").map((t) => t.trim()).filter(Boolean);
        } else if (field === "status") {
          item.status = value;
        } else {
          item[field] = value || null;
        }
      }
      items.push(item);
    }
    if (items.length === 0) {
      stopEditing();
      return;
    }
    try {
      await bulkUpdate.mutateAsync(items);
      stopEditing();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the changes.");
    }
  };

  const filtered = (leads || []).filter((lead) => {
    const matchesSearch =
      !search ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.first_name && lead.first_name.toLowerCase().includes(search.toLowerCase())) ||
      (lead.last_name && lead.last_name.toLowerCase().includes(search.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(search.toLowerCase())) ||
      (lead.company_domain && lead.company_domain.toLowerCase().includes(search.toLowerCase())) ||
      (lead.industry && lead.industry.toLowerCase().includes(search.toLowerCase())) ||
      (lead.location && lead.location.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!leads || leads.length === 0) {
    return (
      <EmptyState
        icon={<Mail className="h-10 w-10 text-muted-foreground" />}
        title="No contacts imported yet"
        description="Add leads manually via spreadsheet grid or upload your target lead lists via CSV/Excel."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onOpenManualSheet && (
              <Button variant="outline" onClick={onOpenManualSheet} className="gap-1.5">
                <TableProperties className="h-4 w-4" />
                <span>Manual Entry (Spreadsheet)</span>
              </Button>
            )}
            {onOpenImport && (
              <Button onClick={onOpenImport} className="gap-1.5">
                <Upload className="h-4 w-4" />
                <span>Import CSV / Excel</span>
              </Button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, email, company, domain, industry..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {editing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={stopEditing} disabled={bulkUpdate.isPending} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                <span>Discard</span>
              </Button>
              <Button size="sm" onClick={saveEdits} disabled={bulkUpdate.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                <span>
                  {bulkUpdate.isPending
                    ? "Saving…"
                    : changedIds.length
                      ? `Save changes (${changedIds.length})`
                      : "Done"}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1.5"
              title="Edit contacts directly in the table, like a spreadsheet"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit contacts</span>
            </Button>
          )}

          <span className="text-xs text-muted-foreground">
            Showing <strong>{filtered.length}</strong> of <strong>{leads.length}</strong> contacts
          </span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </div>

      {editing && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            saveError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary/5 text-muted-foreground"
          }`}
          role={saveError ? "alert" : "status"}
        >
          {saveError ??
            "Editing: change any cell, then Save. Changed cells are highlighted; all rows are saved together, or none if one is invalid."}
        </div>
      )}

      {/* Comprehensive All-Columns Lead Table (X-Scrollable) */}
      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table
            className={`w-full text-left text-xs border-collapse ${
              editing ? "[&_th]:border-border [&_td]:border-border" : ""
            }`}
          >
            <thead
              className={`text-muted-foreground border-b border-border font-semibold whitespace-nowrap text-xs ${
                editing ? "bg-muted/95" : "bg-muted/60"
              }`}
            >
              <tr>
                <th className="w-12 px-3 py-3 text-center border-r border-border/50">#</th>
                <th className="min-w-[220px] px-4 py-3 border-r border-border/50">Email Address</th>
                <th className="min-w-[130px] px-3 py-3 border-r border-border/50">First Name</th>
                <th className="min-w-[130px] px-3 py-3 border-r border-border/50">Last Name</th>
                <th className="min-w-[160px] px-3 py-3 border-r border-border/50">Company</th>
                <th className="min-w-[160px] px-3 py-3 border-r border-border/50">Domain / Website</th>
                <th className="min-w-[120px] px-3 py-3 border-r border-border/50">Scale / Size</th>
                <th className="min-w-[140px] px-3 py-3 border-r border-border/50">Job Title</th>
                <th className="min-w-[140px] px-3 py-3 border-r border-border/50">Industry</th>
                <th className="min-w-[140px] px-3 py-3 border-r border-border/50">Location</th>
                <th className="min-w-[130px] px-3 py-3 border-r border-border/50">Phone</th>
                <th className="min-w-[130px] px-3 py-3 border-r border-border/50">LinkedIn</th>
                <th className="min-w-[100px] px-3 py-3 border-r border-border/50">Status</th>
                <th className="min-w-[140px] px-3 py-3 border-r border-border/50">Tags</th>
                <th className="w-14 px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${editing ? "divide-border" : "divide-border/60"}`}>
              {editing &&
                filtered.map((lead, idx) => (
                  <tr key={lead.id} className="group whitespace-nowrap text-xs hover:bg-muted/20 transition-colors">
                    <td className="w-12 py-1 px-2 text-center text-muted-foreground/80 font-mono text-[11px] border-r border-border bg-muted/15">
                      {idx + 1}
                    </td>
                    {EDIT_FIELDS.map((field, col) => {
                      const value = drafts[lead.id]?.[field] ?? originalValue(lead, field);
                      const changed = isChanged(lead, field);
                      const invalid = field === "email" && !EMAIL_RE.test(value.trim());
                      const tone = invalid
                        ? "border-b-2 border-rose-500 bg-rose-500/5"
                        : changed
                          ? "bg-amber-500/10"
                          : "";
                      const label = `${FIELD_LABELS[field]} for ${lead.email}`;
                      return (
                        <td
                          key={field}
                          className="relative p-0 border-r border-border"
                          title={changed ? `Was: ${originalValue(lead, field) || "(empty)"}` : undefined}
                        >
                          {field === "status" ? (
                            <select
                              aria-label={label}
                              data-cell={`${idx}:${col}`}
                              value={value}
                              onChange={(e) => setCell(lead.id, field, e.target.value)}
                              onKeyDown={(e) => moveVertically(e, idx, col)}
                              className={`${CELL_INPUT} cursor-pointer appearance-none ${tone}`}
                            >
                              <option value="active">active</option>
                              <option value="unsubscribed">unsubscribed</option>
                              <option value="bounced">bounced</option>
                            </select>
                          ) : (
                            <input
                              aria-label={label}
                              aria-invalid={invalid || undefined}
                              data-cell={`${idx}:${col}`}
                              type={field === "email" ? "email" : "text"}
                              value={value}
                              onChange={(e) => setCell(lead.id, field, e.target.value)}
                              onKeyDown={(e) => moveVertically(e, idx, col)}
                              className={`${CELL_INPUT} ${field === "email" ? "font-semibold" : ""} ${tone}`}
                              spellCheck={false}
                            />
                          )}
                          {invalid && (
                            <span title="Invalid email format" className="pointer-events-none absolute right-2 top-2.5 text-rose-500">
                              <AlertCircle className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="w-14 px-2 py-1 text-right">
                      {EDIT_FIELDS.some((f) => isChanged(lead, f)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground"
                          title="Undo changes in this row"
                          aria-label={`Undo changes for ${lead.email}`}
                          onClick={() =>
                            setDrafts((prev) => {
                              const next = { ...prev };
                              delete next[lead.id];
                              return next;
                            })
                          }
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              {!editing && filtered.map((lead, idx) => (
                <tr key={lead.id} className="hover:bg-muted/20 transition-colors whitespace-nowrap text-xs">
                  {/* Row index */}
                  <td className="w-12 px-3 py-3 text-center text-muted-foreground font-mono text-[11px] border-r border-border/40 bg-muted/10">
                    {idx + 1}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 font-semibold text-foreground border-r border-border/40">
                    {lead.email}
                  </td>

                  {/* First Name */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.first_name || <span className="text-muted-foreground/50">—</span>}
                  </td>

                  {/* Last Name */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.last_name || <span className="text-muted-foreground/50">—</span>}
                  </td>

                  {/* Company */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.company ? (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{lead.company}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Domain / Website */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.company_domain ? (
                      <a
                        href={lead.company_domain.startsWith("http") ? lead.company_domain : `https://${lead.company_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        <span>{lead.company_domain}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Scale / Size */}
                  <td className="px-3 py-3 border-r border-border/40">
                    {lead.company_size ? (
                      <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
                        {lead.company_size}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Job Title */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.title || <span className="text-muted-foreground/50">—</span>}
                  </td>

                  {/* Industry */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.industry || <span className="text-muted-foreground/50">—</span>}
                  </td>

                  {/* Location */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.location ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{lead.location}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-3 py-3 text-foreground border-r border-border/40">
                    {lead.phone ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* LinkedIn URL */}
                  <td className="px-3 py-3 border-r border-border/40">
                    {lead.linkedin_url ? (
                      <a
                        href={lead.linkedin_url.startsWith("http") ? lead.linkedin_url : `https://${lead.linkedin_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        <span>Profile</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 border-r border-border/40">
                    <Badge
                      variant="outline"
                      className={
                        lead.status === "active"
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]"
                          : lead.status === "bounced"
                          ? "border-destructive text-destructive bg-destructive/10 text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {lead.status}
                    </Badge>
                  </td>

                  {/* Tags */}
                  <td className="px-3 py-3 border-r border-border/40">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags && lead.tags.length > 0 ? (
                        lead.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="w-14 px-3 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletingId(lead.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Contact Lead"
        description="Are you sure you want to remove this lead? Historical email logs will remain preserved."
        confirmLabel="Delete Lead"
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
