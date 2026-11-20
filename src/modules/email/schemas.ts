import { z } from "zod";

// ==============================================================================
// Email Account Schemas
// ==============================================================================

export const EmailAccountOutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  label: z.string(),
  from_name: z.string(),
  from_email: z.string().email(),
  smtp_host: z.string(),
  smtp_port: z.number(),
  smtp_username: z.string(),
  smtp_use_tls: z.boolean(),
  imap_host: z.string().nullable().optional(),
  imap_port: z.number().nullable().optional(),
  imap_username: z.string().nullable().optional(),
  imap_use_ssl: z.boolean().default(true),
  is_verified: z.boolean(),
  is_active: z.boolean(),
  daily_send_limit: z.number(),
  sends_today: z.number(),
  last_imap_poll_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmailAccountOut = z.infer<typeof EmailAccountOutSchema>;

export const EmailAccountCreateSchema = z.object({
  label: z.string().min(1, "Label is required"),
  from_name: z.string().min(1, "From Name is required"),
  from_email: z.string().email("Valid sender email is required"),
  smtp_host: z.string().min(1, "SMTP host is required"),
  smtp_port: z.coerce.number().min(1).max(65535).default(587),
  smtp_username: z.string().min(1, "SMTP username is required"),
  smtp_password: z.string().min(1, "SMTP password is required"),
  smtp_use_tls: z.boolean().default(true),
  imap_host: z.string().optional(),
  imap_port: z.coerce.number().min(1).max(65535).optional().default(993),
  imap_username: z.string().optional(),
  imap_password: z.string().optional(),
  imap_use_ssl: z.boolean().default(true),
  daily_send_limit: z.coerce.number().min(1).max(50000).default(200),
});

export type EmailAccountCreate = z.infer<typeof EmailAccountCreateSchema>;

export const EmailAccountTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  smtp_ok: z.boolean(),
  imap_ok: z.boolean().nullable().optional(),
});

export type EmailAccountTestResult = z.infer<typeof EmailAccountTestResultSchema>;

export const EmailAccountHealthSchema = z.object({
  account_id: z.string().uuid(),
  label: z.string(),
  from_email: z.string(),
  is_verified: z.boolean(),
  is_active: z.boolean(),
  daily_send_limit: z.number(),
  sends_today: z.number(),
  remaining_today: z.number(),
  total_sent: z.number(),
  total_bounced: z.number(),
  bounce_rate: z.number(),
  reputation_score: z.string(),
  smtp_status: z.string(),
  imap_status: z.string(),
  last_tested_at: z.string().nullable().optional(),
});

export type EmailAccountHealth = z.infer<typeof EmailAccountHealthSchema>;

// ==============================================================================
// Lead List & Lead Schemas
// ==============================================================================

export const EmailLeadListOutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  lead_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmailLeadListOut = z.infer<typeof EmailLeadListOutSchema>;

export const EmailLeadOutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  list_id: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company_domain: z.string().nullable().optional(),
  company_size: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  company_linkedin_url: z.string().nullable().optional(),
  custom_fields: z.record(z.string(), z.any()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  status: z.string(),
  source: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmailLeadOut = z.infer<typeof EmailLeadOutSchema>;

export const EmailLeadImportPreviewSchema = z.object({
  total_rows: z.number(),
  headers: z.array(z.string()),
  preview_rows: z.array(z.record(z.string(), z.any())),
  suggested_mapping: z.record(z.string(), z.string()),
});

export type EmailLeadImportPreview = z.infer<typeof EmailLeadImportPreviewSchema>;

// ==============================================================================
// Template Schemas
// ==============================================================================

export const EmailTemplateOutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  subject: z.string(),
  body_html: z.string(),
  body_text: z.string().nullable().optional(),
  merge_tags: z.array(z.string()).nullable().optional(),
  category: z.string().nullable().optional(),
  is_ai_generated: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmailTemplateOut = z.infer<typeof EmailTemplateOutSchema>;

// ==============================================================================
// Campaign Schemas
// ==============================================================================

export const EmailCampaignOutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  list_id: z.string().uuid().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  schedule_at: z.string().nullable().optional(),
  batch_size: z.number(),
  batch_delay_seconds: z.number(),
  kanban_auto_assign: z.boolean(),
  total_recipients: z.number(),
  sent_count: z.number(),
  delivered_count: z.number(),
  opened_count: z.number(),
  clicked_count: z.number(),
  replied_count: z.number(),
  bounced_count: z.number(),
  failed_count: z.number(),
  send_window_enabled: z.boolean().optional().default(false),
  send_timezone: z.string().optional().default("UTC"),
  send_window_start: z.string().optional().default("09:00"),
  send_window_end: z.string().optional().default("17:00"),
  send_days: z.array(z.number()).optional().default([0, 1, 2, 3, 4]),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmailCampaignOut = z.infer<typeof EmailCampaignOutSchema>;

// ==============================================================================
// Sequence (initial email + follow-up rounds, each with template variants)
// ==============================================================================

export const EmailCampaignStepSchema = z.object({
  step_number: z.number(),
  delay_days: z.number(),
  delay_hours: z.number(),
  template_ids: z.array(z.string()),
  same_thread: z.boolean(),
  sent_count: z.number().optional().default(0),
});

export type EmailCampaignStep = z.infer<typeof EmailCampaignStepSchema>;

export const EmailCampaignStepsOutSchema = z.object({
  steps: z.array(EmailCampaignStepSchema),
  active_leads: z.number(),
  finished_leads: z.number(),
  stopped_leads: z.number(),
});

export type EmailCampaignStepsOut = z.infer<typeof EmailCampaignStepsOutSchema>;

export interface EmailCampaignStepInput {
  delay_days: number;
  delay_hours: number;
  template_ids: string[];
  same_thread: boolean;
}

export const EmailSendOutSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  lead_email: z.string().nullable().optional(),
  lead_name: z.string().nullable().optional(),
  status: z.string(),
  pipeline_stage: z.string(),
  pipeline_stage_updated_at: z.string().nullable().optional(),
  rendered_subject: z.string().nullable().optional(),
  message_id: z.string().nullable().optional(),
  tracking_id: z.string().uuid(),
  opened_at: z.string().nullable().optional(),
  open_count: z.number(),
  clicked_at: z.string().nullable().optional(),
  click_count: z.number(),
  replied_at: z.string().nullable().optional(),
  bounced_at: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  created_at: z.string(),
});

export type EmailSendOut = z.infer<typeof EmailSendOutSchema>;

export const KanbanLeadCardSchema = z.object({
  send_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  email: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  pipeline_stage: z.string(),
  status: z.string(),
  open_count: z.number(),
  click_count: z.number(),
  replied_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  pipeline_stage_updated_at: z.string().nullable().optional(),
});

export type KanbanLeadCard = z.infer<typeof KanbanLeadCardSchema>;

export const CampaignKanbanOutSchema = z.object({
  campaign_id: z.string().uuid(),
  stages: z.record(z.string(), z.array(KanbanLeadCardSchema)),
  stage_counts: z.record(z.string(), z.number()),
});

export type CampaignKanbanOut = z.infer<typeof CampaignKanbanOutSchema>;

// ==============================================================================
// Inbox Schemas
// ==============================================================================

export const EmailInboxMessageOutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  account_id: z.string().uuid(),
  campaign_id: z.string().uuid().nullable().optional(),
  send_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  from_email: z.string(),
  from_name: z.string().nullable().optional(),
  to_email: z.string().nullable().optional(),
  cc: z.string().nullable().optional(),
  subject: z.string(),
  body_text: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  received_at: z.string(),
  imap_uid: z.number().nullable().optional(),
  message_id: z.string().nullable().optional(),
  in_reply_to: z.string().nullable().optional(),
  classification: z.string().nullable().optional(),
  is_read: z.boolean(),
  created_at: z.string(),
  // Conversation view only (group: "conversation"): the row stands for a
  // whole thread and these describe its LAST message (theirs or ours).
  reply_count: z.number().nullable().optional(),
  last_from_me: z.boolean().nullable().optional(),
  last_activity_at: z.string().nullable().optional(),
  last_preview: z.string().nullable().optional(),
});

export type EmailInboxMessageOut = z.infer<typeof EmailInboxMessageOutSchema>;

export const EmailThreadItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["cold", "followup", "inbound", "outbound"]),
  step_number: z.number().nullable().optional(),
  from_name: z.string().nullable().optional(),
  from_email: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  subject: z.string(),
  body_text: z.string().nullable().optional(),
  body_html: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  classification: z.string().nullable().optional(),
});

export type EmailThreadItem = z.infer<typeof EmailThreadItemSchema>;
