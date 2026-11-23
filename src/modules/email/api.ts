import { z } from "zod";
import { apiJson, apiVoid, parseWith } from "@/shared/lib/api";
import {
  EmailAccountOutSchema,
  EmailAccountHealthSchema,
  EmailAccountTestResultSchema,
  EmailLeadListOutSchema,
  EmailLeadOutSchema,
  EmailLeadImportPreviewSchema,
  EmailTemplateOutSchema,
  EmailCampaignOutSchema,
  EmailSendOutSchema,
  CampaignKanbanOutSchema,
  EmailInboxMessageOutSchema,
  EmailThreadItemSchema,
  EmailCampaignStepsOutSchema,
  EmailAiPreviewSchema,
  type EmailAiPreview,
  EmailCampaignUsageSchema,
  type EmailCampaignUsage,
  type EmailAccountOut,
  type EmailAccountCreate,
  type EmailAccountUpdate,
  type EmailAccountHealth,
  type EmailAccountTestResult,
  type EmailLeadListOut,
  type EmailLeadOut,
  type EmailLeadImportPreview,
  type EmailTemplateOut,
  type EmailCampaignOut,
  type EmailSendOut,
  type CampaignKanbanOut,
  type EmailInboxMessageOut,
  type EmailThreadItem,
  type EmailCampaignStepsOut,
  type EmailCampaignStepInput,
} from "./schemas";

export const emailKeys = {
  accounts: {
    all: ["email", "accounts"] as const,
    list: () => ["email", "accounts", "list"] as const,
    detail: (id: string) => ["email", "accounts", id] as const,
    health: (id: string) => ["email", "accounts", id, "health"] as const,
  },
  leads: {
    all: ["email", "leads"] as const,
    list: (params?: Record<string, any>) => ["email", "leads", "list", params] as const,
    lists: () => ["email", "lead-lists"] as const,
    campaignLeads: (campaignId: string) => ["email", "campaigns", campaignId, "leads"] as const,
  },
  templates: {
    all: ["email", "templates"] as const,
    list: () => ["email", "templates", "list"] as const,
    detail: (id: string) => ["email", "templates", id] as const,
  },
  campaigns: {
    all: ["email", "campaigns"] as const,
    list: () => ["email", "campaigns", "list"] as const,
    detail: (id: string) => ["email", "campaigns", id] as const,
    sends: (id: string) => ["email", "campaigns", id, "sends"] as const,
    kanban: (id: string) => ["email", "campaigns", id, "kanban"] as const,
    steps: (id: string) => ["email", "campaigns", id, "steps"] as const,
  },
  inbox: {
    all: ["email", "inbox"] as const,
    list: (params?: Record<string, any>) => ["email", "inbox", "list", params] as const,
    campaign: (campaignId: string) => ["email", "campaigns", campaignId, "inbox"] as const,
    unread: () => ["email", "inbox", "unread-count"] as const,
    thread: (id: string) => ["email", "inbox", id, "thread"] as const,
  },
  analytics: {
    all: ["email", "analytics"] as const,
    overview: () => ["email", "analytics", "overview"] as const,
    timeline: (days: number) => ["email", "analytics", "timeline", days] as const,
    topPerforming: (limit: number) => ["email", "analytics", "top-performing", limit] as const,
    pipelineSummary: () => ["email", "analytics", "pipeline-summary"] as const,
    campaign: (id: string) => ["email", "analytics", "campaigns", id] as const,
  },
};

const accountListSchema = z.array(EmailAccountOutSchema);
const leadListArraySchema = z.array(EmailLeadListOutSchema);
const leadArraySchema = z.array(EmailLeadOutSchema);
const templateArraySchema = z.array(EmailTemplateOutSchema);
const campaignArraySchema = z.array(EmailCampaignOutSchema);
const sendArraySchema = z.array(EmailSendOutSchema);
const inboxArraySchema = z.array(EmailInboxMessageOutSchema);

// ==============================================================================
// Mailboxes API
// ==============================================================================

export function listEmailAccounts(signal?: AbortSignal): Promise<EmailAccountOut[]> {
  return apiJson("/api/email/email-accounts", { signal }, (value) =>
    parseWith(accountListSchema, value, "GET /email-accounts")
  );
}

export function getEmailAccount(id: string, signal?: AbortSignal): Promise<EmailAccountOut> {
  return apiJson(`/api/email/email-accounts/${id}`, { signal }, (value) =>
    parseWith(EmailAccountOutSchema, value, "GET /email-accounts/{id}")
  );
}

export function createEmailAccount(
  data: EmailAccountCreate,
  signal?: AbortSignal
): Promise<EmailAccountOut> {
  return apiJson(
    "/api/email/email-accounts",
    { method: "POST", body: data, signal },
    (value) => parseWith(EmailAccountOutSchema, value, "POST /email-accounts")
  );
}

export function updateEmailAccount(
  id: string,
  data: Partial<EmailAccountCreate>,
  signal?: AbortSignal
): Promise<EmailAccountOut> {
  return apiJson(
    `/api/email/email-accounts/${id}`,
    { method: "PATCH", body: data, signal },
    (value) => parseWith(EmailAccountOutSchema, value, "PATCH /email-accounts/{id}")
  );
}

export function deleteEmailAccount(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/email/email-accounts/${id}`, { method: "DELETE", signal });
}

export function testEmailAccount(
  id: string,
  signal?: AbortSignal
): Promise<EmailAccountTestResult> {
  return apiJson(
    `/api/email/email-accounts/${id}/test`,
    { method: "POST", signal },
    (value) => parseWith(EmailAccountTestResultSchema, value, "POST /email-accounts/{id}/test")
  );
}

export function getEmailAccountHealth(
  id: string,
  signal?: AbortSignal
): Promise<EmailAccountHealth> {
  return apiJson(
    `/api/email/email-accounts/${id}/health`,
    { signal },
    (value) => parseWith(EmailAccountHealthSchema, value, "GET /email-accounts/{id}/health")
  );
}


// ==============================================================================
// Lead Lists & Leads API
// ==============================================================================

export function listEmailLeadLists(signal?: AbortSignal): Promise<EmailLeadListOut[]> {
  return apiJson("/api/email/email-lead-lists", { signal }, (value) =>
    parseWith(leadListArraySchema, value, "GET /email-lead-lists")
  );
}

export function createEmailLeadList(
  data: { name: string; description?: string },
  signal?: AbortSignal
): Promise<EmailLeadListOut> {
  return apiJson(
    "/api/email/email-lead-lists",
    { method: "POST", body: data, signal },
    (value) => parseWith(EmailLeadListOutSchema, value, "POST /email-lead-lists")
  );
}

export function listEmailLeads(
  params?: { list_id?: string; status?: string; search?: string; limit?: number; offset?: number },
  signal?: AbortSignal
): Promise<EmailLeadOut[]> {
  const queryParams = new URLSearchParams();
  if (params?.list_id) queryParams.set("list_id", params.list_id);
  if (params?.status) queryParams.set("status_filter", params.status);
  if (params?.search) queryParams.set("search", params.search);
  if (params?.limit) queryParams.set("limit", String(params.limit));
  if (params?.offset) queryParams.set("offset", String(params.offset));

  const qs = queryParams.toString();
  const url = qs ? `/api/email/email-leads?${qs}` : "/api/email/email-leads";

  return apiJson(url, { signal }, (value) =>
    parseWith(leadArraySchema, value, "GET /email-leads")
  );
}

export function createEmailLead(
  data: any,
  signal?: AbortSignal
): Promise<EmailLeadOut> {
  return apiJson(
    "/api/email/email-leads",
    { method: "POST", body: data, signal },
    (value) => parseWith(EmailLeadOutSchema, value, "POST /email-leads")
  );
}

export function deleteEmailLead(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/email/email-leads/${id}`, { method: "DELETE", signal });
}

/** One edited contact: `id` plus only the fields that changed. */
export type EmailLeadEdit = { id: string } & Partial<{
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  company_domain: string | null;
  company_size: string | null;
  title: string | null;
  industry: string | null;
  location: string | null;
  phone: string | null;
  linkedin_url: string | null;
  status: string;
  tags: string[];
}>;

/** Save spreadsheet edits for several contacts at once (all or nothing). */
export function bulkUpdateEmailLeads(items: EmailLeadEdit[]): Promise<EmailLeadOut[]> {
  return apiJson(
    "/api/email/email-leads/bulk",
    { method: "PATCH", body: { items } },
    (value) => parseWith(z.array(EmailLeadOutSchema), value, "PATCH /email-leads/bulk")
  );
}

export async function previewLeadImport(
  file: File,
  signal?: AbortSignal
): Promise<EmailLeadImportPreview> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/email/email-leads/import/preview", {
    method: "POST",
    body: formData,
    signal,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to preview import file");
  }
  return res.json();
}

export function confirmLeadImport(
  data: any,
  signal?: AbortSignal
): Promise<any> {
  return apiJson(
    "/api/email/email-leads/import/confirm",
    { method: "POST", body: data, signal },
    (value) => value
  );
}

export function createManualLeadsBatch(
  data: {
    leads: Array<{
      email: string;
      first_name?: string;
      last_name?: string;
      company?: string;
      title?: string;
      phone?: string;
      company_domain?: string;
      company_size?: string;
      industry?: string;
      location?: string;
      linkedin_url?: string;
      company_linkedin_url?: string;
      tags?: string[];
      custom_fields?: Record<string, any>;
    }>;
    list_id?: string;
    new_list_name?: string;
  },
  signal?: AbortSignal
): Promise<{ success: boolean; created: number; duplicates_skipped: number; list_id?: string }> {
  return apiJson(
    "/api/email/email-leads/manual-batch",
    { method: "POST", body: data, signal },
    (value) => value as any
  );
}

export function listCampaignLeads(
  campaignId: string,
  signal?: AbortSignal
): Promise<any[]> {
  return apiJson(
    `/api/email/email-campaigns/${campaignId}/leads`,
    { signal },
    (value) => (Array.isArray(value) ? value : [])
  );
}

export function updateCampaignLeadStage(
  campaignId: string,
  leadId: string,
  stage: string,
  signal?: AbortSignal
): Promise<any> {
  return apiJson(
    `/api/email/email-campaigns/${campaignId}/leads/${leadId}/stage`,
    { method: "PATCH", body: { stage }, signal },
    (value) => value
  );
}

export function assignLeadsToCampaign(
  campaignId: string,
  data: { list_id?: string; lead_ids?: string[]; all_leads?: boolean },
  signal?: AbortSignal
): Promise<any> {
  return apiJson(
    `/api/email/email-campaigns/${campaignId}/leads`,
    { method: "POST", body: data, signal },
    (value) => value
  );
}

export function removeLeadFromCampaign(
  campaignId: string,
  leadId: string,
  signal?: AbortSignal
): Promise<void> {
  return apiVoid(`/api/email/email-campaigns/${campaignId}/leads/${leadId}`, {
    method: "DELETE",
    signal,
  });
}


// ==============================================================================
// Templates API
// ==============================================================================

export function listEmailTemplates(signal?: AbortSignal): Promise<EmailTemplateOut[]> {
  return apiJson("/api/email/email-templates", { signal }, (value) =>
    parseWith(templateArraySchema, value, "GET /email-templates")
  );
}

export function getEmailTemplate(id: string, signal?: AbortSignal): Promise<EmailTemplateOut> {
  return apiJson(`/api/email/email-templates/${id}`, { signal }, (value) =>
    parseWith(EmailTemplateOutSchema, value, "GET /email-templates/{id}")
  );
}

export function createEmailTemplate(
  data: { name: string; subject: string; body_html: string; category?: string },
  signal?: AbortSignal
): Promise<EmailTemplateOut> {
  return apiJson(
    "/api/email/email-templates",
    { method: "POST", body: data, signal },
    (value) => parseWith(EmailTemplateOutSchema, value, "POST /email-templates")
  );
}

export function updateEmailTemplate(
  id: string,
  data: Partial<{ name: string; subject: string; body_html: string; category?: string }>,
  signal?: AbortSignal
): Promise<EmailTemplateOut> {
  return apiJson(
    `/api/email/email-templates/${id}`,
    { method: "PATCH", body: data, signal },
    (value) => parseWith(EmailTemplateOutSchema, value, "PATCH /email-templates/{id}")
  );
}

export function deleteEmailTemplate(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/email/email-templates/${id}`, { method: "DELETE", signal });
}

export function cloneEmailTemplate(id: string, signal?: AbortSignal): Promise<EmailTemplateOut> {
  return apiJson(
    `/api/email/email-templates/${id}/clone`,
    { method: "POST", signal },
    (value) => parseWith(EmailTemplateOutSchema, value, "POST /email-templates/{id}/clone")
  );
}

export function previewEmailTemplate(
  id: string,
  data: { subject?: string; body_html?: string; sample_data?: Record<string, any> },
  signal?: AbortSignal
): Promise<{ rendered_subject: string; rendered_html: string; merge_tags_detected: string[] }> {
  return apiJson(
    `/api/email/email-templates/${id}/preview`,
    { method: "POST", body: data, signal },
    (value) => value as any
  );
}

export function generateEmailTemplateAi(
  prompt: string,
  category: string = "cold_outreach",
  signal?: AbortSignal
): Promise<EmailTemplateOut> {
  return apiJson(
    "/api/email/email-templates/generate",
    { method: "POST", body: { prompt, category }, signal },
    (value) => parseWith(EmailTemplateOutSchema, value, "POST /email-templates/generate")
  );
}


// ==============================================================================
// Campaigns API
// ==============================================================================

export function listEmailCampaigns(signal?: AbortSignal): Promise<EmailCampaignOut[]> {
  return apiJson("/api/email/email-campaigns", { signal }, (value) =>
    parseWith(campaignArraySchema, value, "GET /email-campaigns")
  );
}

export function getEmailCampaign(id: string, signal?: AbortSignal): Promise<any> {
  return apiJson(`/api/email/email-campaigns/${id}`, { signal }, (value) => value);
}

export function createEmailCampaign(
  data: any,
  signal?: AbortSignal
): Promise<EmailCampaignOut> {
  return apiJson(
    "/api/email/email-campaigns",
    { method: "POST", body: data, signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "POST /email-campaigns")
  );
}

export function getCampaignSteps(id: string, signal?: AbortSignal): Promise<EmailCampaignStepsOut> {
  return apiJson(`/api/email/email-campaigns/${id}/steps`, { signal }, (value) =>
    parseWith(EmailCampaignStepsOutSchema, value, "GET /email-campaigns/{id}/steps")
  );
}

export function updateCampaignSteps(
  id: string,
  steps: EmailCampaignStepInput[],
  signal?: AbortSignal
): Promise<EmailCampaignStepsOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/steps`,
    { method: "PUT", body: { steps }, signal },
    (value) => parseWith(EmailCampaignStepsOutSchema, value, "PUT /email-campaigns/{id}/steps")
  );
}

const SentStepEmailSchema = z.object({
  step_number: z.number(),
  subject: z.string(),
  body_html: z.string().nullable().optional(),
  status: z.string(),
  sent_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});
export type SentStepEmail = z.infer<typeof SentStepEmailSchema>;

/** The emails a campaign sent one lead (initial + follow-ups), tracking removed. */
export function getSentEmailsForLead(
  campaignId: string,
  sendId: string,
  signal?: AbortSignal
): Promise<SentStepEmail[]> {
  return apiJson(`/api/email/email-campaigns/${campaignId}/sends/${sendId}/emails`, { signal }, (value) =>
    parseWith(z.array(SentStepEmailSchema), value, "GET /email-campaigns/{id}/sends/{send_id}/emails")
  );
}

/** AI usage (tokens, cost, web searches) filed under one campaign. */
export function getCampaignUsage(id: string, signal?: AbortSignal): Promise<EmailCampaignUsage> {
  return apiJson(`/api/email/email-campaigns/${id}/usage`, { signal }, (value) =>
    parseWith(EmailCampaignUsageSchema, value, "GET /email-campaigns/{id}/usage")
  );
}

/** Write one sample AI email for a lead of the campaign (nothing is sent). */
export function previewAiStep(
  id: string,
  input: {
    step_number: number;
    same_thread: boolean;
    ai_instructions: string;
    style_profile_id?: string | null;
  },
): Promise<EmailAiPreview> {
  return apiJson(
    `/api/email/email-campaigns/${id}/steps/ai-preview`,
    { method: "POST", body: input, timeoutMs: 120_000 },
    (value) => parseWith(EmailAiPreviewSchema, value, "POST /email-campaigns/{id}/steps/ai-preview")
  );
}

export function updateEmailCampaign(
  id: string,
  data: any,
  signal?: AbortSignal
): Promise<EmailCampaignOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}`,
    { method: "PATCH", body: data, signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "PATCH /email-campaigns/{id}")
  );
}

export function deleteEmailCampaign(id: string, signal?: AbortSignal): Promise<void> {
  return apiVoid(`/api/email/email-campaigns/${id}`, { method: "DELETE", signal });
}

export function startEmailCampaign(id: string, signal?: AbortSignal): Promise<EmailCampaignOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/start`,
    { method: "POST", signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "POST /email-campaigns/{id}/start")
  );
}

export function pauseEmailCampaign(id: string, signal?: AbortSignal): Promise<EmailCampaignOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/pause`,
    { method: "POST", signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "POST /email-campaigns/{id}/pause")
  );
}

export function resumeEmailCampaign(id: string, signal?: AbortSignal): Promise<EmailCampaignOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/resume`,
    { method: "POST", signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "POST /email-campaigns/{id}/resume")
  );
}

export function cancelEmailCampaign(id: string, signal?: AbortSignal): Promise<EmailCampaignOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/cancel`,
    { method: "POST", signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "POST /email-campaigns/{id}/cancel")
  );
}

export function cloneEmailCampaign(id: string, signal?: AbortSignal): Promise<EmailCampaignOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/clone`,
    { method: "POST", signal },
    (value) => parseWith(EmailCampaignOutSchema, value, "POST /email-campaigns/{id}/clone")
  );
}

export function listEmailCampaignSends(
  id: string,
  params?: { limit?: number; offset?: number },
  signal?: AbortSignal
): Promise<EmailSendOut[]> {
  const qs = params ? `?limit=${params.limit || 100}&offset=${params.offset || 0}` : "";
  return apiJson(`/api/email/email-campaigns/${id}/sends${qs}`, { signal }, (value) =>
    parseWith(sendArraySchema, value, "GET /email-campaigns/{id}/sends")
  );
}

export function getEmailCampaignKanban(
  id: string,
  signal?: AbortSignal
): Promise<CampaignKanbanOut> {
  return apiJson(
    `/api/email/email-campaigns/${id}/kanban`,
    { signal },
    (value) => parseWith(CampaignKanbanOutSchema, value, "GET /email-campaigns/{id}/kanban")
  );
}


// ==============================================================================
// Inbox API
// ==============================================================================

export function listInboxMessages(
  params?: {
    campaign_id?: string;
    /** Any of these campaigns (empty/undefined = no campaign filter). */
    campaign_ids?: string[];
    account_id?: string;
    classification?: string;
    is_read?: boolean;
    search?: string;
    /** "conversation": one row per lead conversation, showing its last message. */
    group?: "conversation";
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
): Promise<EmailInboxMessageOut[]> {
  const queryParams = new URLSearchParams();
  if (params?.group) queryParams.set("group", params.group);
  if (params?.campaign_id) queryParams.set("campaign_id", params.campaign_id);
  for (const id of params?.campaign_ids ?? []) queryParams.append("campaign_ids", id);
  if (params?.account_id) queryParams.set("account_id", params.account_id);
  if (params?.classification) queryParams.set("classification", params.classification);
  if (params?.is_read !== undefined) queryParams.set("is_read", String(params.is_read));
  if (params?.search) queryParams.set("search", params.search);
  if (params?.limit) queryParams.set("limit", String(params.limit));
  if (params?.offset) queryParams.set("offset", String(params.offset));

  const qs = queryParams.toString();
  const url = qs ? `/api/email/email-inbox?${qs}` : "/api/email/email-inbox";

  return apiJson(url, { signal }, (value) =>
    parseWith(inboxArraySchema, value, "GET /email-inbox")
  );
}

export function getInboxMessage(id: string, signal?: AbortSignal): Promise<EmailInboxMessageOut> {
  return apiJson(`/api/email/email-inbox/${id}`, { signal }, (value) =>
    parseWith(EmailInboxMessageOutSchema, value, "GET /email-inbox/{id}")
  );
}

const threadArraySchema = z.array(EmailThreadItemSchema);

export function getInboxThread(id: string, signal?: AbortSignal): Promise<EmailThreadItem[]> {
  return apiJson(`/api/email/email-inbox/${id}/thread`, { signal }, (value) =>
    parseWith(threadArraySchema, value, "GET /email-inbox/{id}/thread")
  );
}

export function updateInboxMessage(
  id: string,
  data: { is_read?: boolean; classification?: string },
  signal?: AbortSignal
): Promise<EmailInboxMessageOut> {
  return apiJson(
    `/api/email/email-inbox/${id}`,
    { method: "PATCH", body: data, signal },
    (value) => parseWith(EmailInboxMessageOutSchema, value, "PATCH /email-inbox/{id}")
  );
}

/** Reply limits (mirrors backend email_sender): attachments total and count. */
export const REPLY_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const REPLY_ATTACHMENT_MAX_FILES = 10;

export function sendInboxReply(
  id: string,
  data: { subject: string; body_text?: string; body_html?: string; cc?: string; files?: File[] },
  signal?: AbortSignal
): Promise<any> {
  const { files, ...fields } = data;
  let body: unknown = fields;
  if (files && files.length > 0) {
    // Multipart: same fields + `files`.
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
    for (const file of files) form.append("files", file, file.name);
    body = form;
  }
  return apiJson(
    `/api/email/email-inbox/${id}/reply`,
    { method: "POST", body: body as never, signal, timeoutMs: 120_000 },
    (value) => value
  );
}

/** AI-drafted reply from the whole conversation (campaign's AI model). `notes` = what the user typed. */
export function draftInboxReply(id: string, notes?: string): Promise<{ body_text: string }> {
  return apiJson(
    `/api/email/email-inbox/${id}/draft-reply`,
    { method: "POST", body: { notes: notes || undefined }, timeoutMs: 120_000 },
    (value) => parseWith(z.object({ body_text: z.string() }), value, "POST /email-inbox/{id}/draft-reply")
  );
}

export function getInboxUnreadCount(signal?: AbortSignal): Promise<{ unread_count: number }> {
  return apiJson("/api/email/email-inbox/unread-count", { signal }, (value) => value as any);
}

export function markAllInboxRead(campaignId?: string, signal?: AbortSignal): Promise<any> {
  const qs = campaignId ? `?campaign_id=${campaignId}` : "";
  return apiJson(`/api/email/email-inbox/mark-all-read${qs}`, { method: "POST", signal }, (value) => value);
}

export function pollInboxNow(signal?: AbortSignal): Promise<{ status: string; new_messages_fetched: number }> {
  return apiJson("/api/email/email-inbox/poll", { method: "POST", signal }, (value) => value as any);
}

// ---------------------------------------------------------------------------
// Analytics APIs
// ---------------------------------------------------------------------------

export function getEmailAnalyticsOverview(signal?: AbortSignal): Promise<{
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  total_bounced: number;
  open_rate_pct: number;
  click_rate_pct: number;
  reply_rate_pct: number;
  bounce_rate_pct: number;
}> {
  return apiJson("/api/email/email-analytics/overview", { signal }, (value) => value as any);
}

export function getEmailAnalyticsTimeline(
  days: number = 14,
  signal?: AbortSignal
): Promise<Array<{ date: string; sent: number; opened: number }>> {
  return apiJson(`/api/email/email-analytics/timeline?days=${days}`, { signal }, (value) =>
    Array.isArray(value) ? value : []
  );
}

export function getEmailTopPerformingCampaigns(
  limit: number = 5,
  signal?: AbortSignal
): Promise<any[]> {
  return apiJson(`/api/email/email-analytics/top-performing?limit=${limit}`, { signal }, (value) =>
    Array.isArray(value) ? value : []
  );
}

export function getEmailPipelineSummary(signal?: AbortSignal): Promise<{
  stage_counts: Record<string, number>;
  conversions: {
    contacted_to_opened_pct: number;
    opened_to_replied_pct: number;
    replied_to_interested_pct: number;
    interested_to_meeting_pct: number;
    meeting_to_converted_pct: number;
  };
}> {
  return apiJson("/api/email/email-analytics/pipeline-summary", { signal }, (value) => value as any);
}

