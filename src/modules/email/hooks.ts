"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  emailKeys,
  listEmailAccounts,
  getEmailAccount,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  testEmailAccount,
  getEmailAccountHealth,
} from "./api";
import type { EmailAccountCreate, EmailCampaignStepInput } from "./schemas";

export function useEmailAccounts() {
  return useQuery({
    queryKey: emailKeys.accounts.list(),
    queryFn: ({ signal }) => listEmailAccounts(signal),
  });
}

export function useEmailAccount(id: string) {
  return useQuery({
    queryKey: emailKeys.accounts.detail(id),
    queryFn: ({ signal }) => getEmailAccount(id, signal),
    enabled: Boolean(id),
  });
}

export function useEmailAccountHealth(id: string) {
  return useQuery({
    queryKey: emailKeys.accounts.health(id),
    queryFn: ({ signal }) => getEmailAccountHealth(id, signal),
    enabled: Boolean(id),
  });
}

export function useCreateEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmailAccountCreate) => createEmailAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.accounts.all });
      toast.success("Mailbox account connected successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to connect mailbox");
    },
  });
}

export function useUpdateEmailAccount(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<EmailAccountCreate>) => updateEmailAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.accounts.all });
      toast.success("Mailbox updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update mailbox");
    },
  });
}

export function useDeleteEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmailAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.accounts.all });
      toast.success("Mailbox removed successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete mailbox");
    },
  });
}

export function useTestEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => testEmailAccount(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.accounts.all });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Connection test failed");
    },
  });
}


// ==============================================================================
// Lead Lists & Leads Hooks
// ==============================================================================

import {
  listEmailLeadLists,
  createEmailLeadList,
  listEmailLeads,
  createEmailLead,
  deleteEmailLead,
  bulkUpdateEmailLeads,
  type EmailLeadEdit,
  confirmLeadImport,
  createManualLeadsBatch,
  listCampaignLeads,
  updateCampaignLeadStage,
  assignLeadsToCampaign,
  removeLeadFromCampaign,
} from "./api";

export function useEmailLeadLists() {
  return useQuery({
    queryKey: emailKeys.leads.lists(),
    queryFn: ({ signal }) => listEmailLeadLists(signal),
  });
}

export function useCreateEmailLeadList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createEmailLeadList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.lists() });
      toast.success("Lead list created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create lead list");
    },
  });
}

export function useEmailLeads(params?: {
  list_id?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: emailKeys.leads.list(params),
    queryFn: ({ signal }) => listEmailLeads(params, signal),
  });
}

export function useCreateEmailLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createEmailLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.all });
      toast.success("Lead added successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add lead");
    },
  });
}

/** Save in-page spreadsheet edits; errors (bad/duplicate email) are shown by the caller. */
export function useBulkUpdateEmailLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: EmailLeadEdit[]) => bulkUpdateEmailLeads(items),
    onSuccess: (rows) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.all });
      // Campaign recipient tables show the same contacts.
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success(`Saved ${rows.length} contact${rows.length === 1 ? "" : "s"}`);
    },
  });
}

export function useDeleteEmailLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmailLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.all });
      toast.success("Lead deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete lead");
    },
  });
}

export function useConfirmLeadImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => confirmLeadImport(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.all });
      toast.success(
        `Imported ${result.imported} leads! (${result.skipped_dupes} duplicates skipped)`
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Import failed");
    },
  });
}

export function useCreateManualLeadsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      leads: Array<{
        email: string;
        first_name?: string;
        last_name?: string;
        company?: string;
        title?: string;
        phone?: string;
        tags?: string[];
      }>;
      list_id?: string;
      new_list_name?: string;
    }) => createManualLeadsBatch(data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: emailKeys.leads.lists() });
      toast.success(
        `Saved ${result.created} leads! ${
          result.duplicates_skipped > 0 ? `(${result.duplicates_skipped} duplicates skipped)` : ""
        }`
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save leads");
    },
  });
}

export function useCampaignLeads(campaignId: string) {
  return useQuery({
    queryKey: emailKeys.leads.campaignLeads(campaignId),
    queryFn: ({ signal }) => listCampaignLeads(campaignId, signal),
    enabled: Boolean(campaignId),
  });
}

export function useUpdateCampaignLeadStage(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
      updateCampaignLeadStage(campaignId, leadId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailKeys.leads.campaignLeads(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: emailKeys.campaigns.kanban(campaignId),
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update lead pipeline stage");
    },
  });
}

export function useAssignLeadsToCampaign(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { list_id?: string; lead_ids?: string[]; all_leads?: boolean }) =>
      assignLeadsToCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailKeys.leads.campaignLeads(campaignId),
      });
      // Status can change (a completed campaign re-opens to send to the new leads)
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Recipients added to campaign");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign leads");
    },
  });
}

export function useRemoveLeadFromCampaign(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: string) => removeLeadFromCampaign(campaignId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailKeys.leads.campaignLeads(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: emailKeys.campaigns.detail(campaignId),
      });
      toast.success("Lead removed from campaign");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove lead from campaign");
    },
  });
}


// ==============================================================================
// Templates Hooks
// ==============================================================================

import {
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  cloneEmailTemplate,
  generateEmailTemplateAi,
} from "./api";

export function useEmailTemplates() {
  return useQuery({
    queryKey: emailKeys.templates.list(),
    queryFn: ({ signal }) => listEmailTemplates(signal),
  });
}

export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: emailKeys.templates.detail(id),
    queryFn: ({ signal }) => getEmailTemplate(id, signal),
    enabled: Boolean(id),
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; subject: string; body_html: string; category?: string }) =>
      createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates.all });
      toast.success("Template created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create template");
    },
  });
}

export function useUpdateEmailTemplate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<{ name: string; subject: string; body_html: string; category?: string }>) =>
      updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates.all });
      toast.success("Template updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update template");
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates.all });
      toast.success("Template deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete template");
    },
  });
}

export function useCloneEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cloneEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates.all });
      toast.success("Template duplicated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to clone template");
    },
  });
}

export function useGenerateEmailTemplateAi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prompt, category }: { prompt: string; category?: string }) =>
      generateEmailTemplateAi(prompt, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates.all });
      toast.success("AI generated template successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "AI generation failed");
    },
  });
}


// ==============================================================================
// Campaigns Hooks
// ==============================================================================

import {
  listEmailCampaigns,
  getEmailCampaign,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  startEmailCampaign,
  pauseEmailCampaign,
  resumeEmailCampaign,
  cancelEmailCampaign,
  cloneEmailCampaign,
  listEmailCampaignSends,
  getEmailCampaignKanban,
  getCampaignSteps,
  updateCampaignSteps,
  previewAiStep,
  getCampaignUsage,
  getSentEmailsForLead,
} from "./api";

export function useEmailCampaigns() {
  return useQuery({
    queryKey: emailKeys.campaigns.list(),
    queryFn: ({ signal }) => listEmailCampaigns(signal),
  });
}

export function useEmailCampaign(id: string) {
  return useQuery({
    queryKey: emailKeys.campaigns.detail(id),
    queryFn: ({ signal }) => getEmailCampaign(id, signal),
    enabled: Boolean(id),
  });
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createEmailCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create campaign");
    },
  });
}

export function useUpdateEmailCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => updateEmailCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update campaign");
    },
  });
}

export function useDeleteEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmailCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete campaign");
    },
  });
}

export function useCampaignSteps(campaignId: string) {
  return useQuery({
    queryKey: emailKeys.campaigns.steps(campaignId),
    queryFn: ({ signal }) => getCampaignSteps(campaignId, signal),
    enabled: Boolean(campaignId),
  });
}

/** Emails sent to one lead of a campaign (only fetched while the popup is open). */
export function useSentEmailsForLead(campaignId: string, sendId: string | null) {
  return useQuery({
    queryKey: [...emailKeys.campaigns.sends(campaignId), sendId, "emails"],
    queryFn: ({ signal }) => getSentEmailsForLead(campaignId, sendId!, signal),
    enabled: Boolean(campaignId && sendId),
  });
}

/** AI usage filed under a campaign; refreshes while the tab is open (sending adds to it). */
export function useCampaignUsage(campaignId: string) {
  return useQuery({
    queryKey: [...emailKeys.campaigns.detail(campaignId), "usage"],
    queryFn: ({ signal }) => getCampaignUsage(campaignId, signal),
    enabled: Boolean(campaignId),
    refetchInterval: 30_000,
  });
}

/** Sample AI-written email for one lead (uses the campaign's AI model; nothing is sent). */
export function usePreviewAiStep(campaignId: string) {
  return useMutation({
    mutationFn: (input: {
      step_number: number;
      same_thread: boolean;
      ai_instructions: string;
      style_profile_id?: string | null;
    }) =>
      previewAiStep(campaignId, input),
    onError: (err: any) => {
      toast.error(err?.message || "Could not write a preview");
    },
  });
}

export function useUpdateCampaignSteps(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (steps: EmailCampaignStepInput[]) => updateCampaignSteps(campaignId, steps),
    onSuccess: () => {
      // Campaign status/template may change (e.g. a completed campaign re-opens for new follow-ups)
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Sequence saved");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save sequence");
    },
  });
}

export function useStartEmailCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startEmailCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Outreach campaign started!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to start campaign");
    },
  });
}

export function usePauseEmailCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => pauseEmailCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign paused");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to pause campaign");
    },
  });
}

export function useResumeEmailCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resumeEmailCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign resumed");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to resume campaign");
    },
  });
}

export function useCancelEmailCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelEmailCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign dispatches cancelled");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to cancel campaign");
    },
  });
}

export function useCloneEmailCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cloneEmailCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
      toast.success("Campaign duplicated as new draft");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to clone campaign");
    },
  });
}

export function useEmailCampaignSends(id: string) {
  return useQuery({
    queryKey: emailKeys.campaigns.sends(id),
    queryFn: ({ signal }) => listEmailCampaignSends(id, undefined, signal),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useEmailCampaignKanban(id: string) {
  return useQuery({
    queryKey: emailKeys.campaigns.kanban(id),
    queryFn: ({ signal }) => getEmailCampaignKanban(id, signal),
    enabled: Boolean(id),
  });
}


// ==============================================================================
// Inbox Hooks
// ==============================================================================

import {
  listInboxMessages,
  getInboxMessage,
  getInboxThread,
  updateInboxMessage,
  sendInboxReply,
  draftInboxReply,
  getInboxUnreadCount,
  markAllInboxRead,
  pollInboxNow,
  getEmailAnalyticsOverview,
  getEmailAnalyticsTimeline,
  getEmailTopPerformingCampaigns,
  getEmailPipelineSummary,
} from "./api";

export function useInboxMessages(params?: {
  campaign_id?: string;
  campaign_ids?: string[];
  account_id?: string;
  classification?: string;
  is_read?: boolean;
  search?: string;
  group?: "conversation";
}) {
  return useQuery({
    queryKey: emailKeys.inbox.list(params),
    queryFn: ({ signal }) => listInboxMessages(params, signal),
    refetchInterval: 10000,
  });
}

export function useInboxMessage(id: string) {
  return useQuery({
    queryKey: ["email", "inbox", id],
    queryFn: ({ signal }) => getInboxMessage(id, signal),
    enabled: Boolean(id),
  });
}

export function useInboxThread(id: string) {
  return useQuery({
    queryKey: emailKeys.inbox.thread(id),
    queryFn: ({ signal }) => getInboxThread(id, signal),
    enabled: Boolean(id),
    refetchInterval: 15000,
  });
}

export function useUpdateInboxMessage(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { is_read?: boolean; classification?: string }) =>
      updateInboxMessage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.inbox.all });
    },
  });
}

export function useSendInboxReply(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      subject: string;
      body_text?: string;
      body_html?: string;
      cc?: string;
      files?: File[];
    }) => sendInboxReply(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.inbox.all });
      toast.success("Reply dispatched via mailbox SMTP!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send reply");
    },
  });
}

/** Draft a reply with AI (nothing is sent). */
export function useDraftInboxReply(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notes?: string) => draftInboxReply(id, notes),
    onSuccess: () => {
      // The draft is filed under the campaign's usage.
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns.all });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not generate a reply");
    },
  });
}

export function useInboxUnreadCount() {
  return useQuery({
    queryKey: emailKeys.inbox.unread(),
    queryFn: ({ signal }) => getInboxUnreadCount(signal),
    refetchInterval: 15000,
  });
}

export function useMarkAllInboxRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId?: string) => markAllInboxRead(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.inbox.all });
      toast.success("Marked all messages as read");
    },
  });
}

export function usePollInboxNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => pollInboxNow(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.inbox.all });
      toast.success(`Polled inboxes: ${res.new_messages_fetched} new messages fetched!`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to poll inboxes");
    },
  });
}

// ==============================================================================
// Analytics Hooks
// ==============================================================================

export function useEmailAnalyticsOverview() {
  return useQuery({
    queryKey: emailKeys.analytics.overview(),
    queryFn: ({ signal }) => getEmailAnalyticsOverview(signal),
  });
}

export function useEmailAnalyticsTimeline(days: number = 14) {
  return useQuery({
    queryKey: emailKeys.analytics.timeline(days),
    queryFn: ({ signal }) => getEmailAnalyticsTimeline(days, signal),
  });
}

export function useEmailTopPerformingCampaigns(limit: number = 5) {
  return useQuery({
    queryKey: emailKeys.analytics.topPerforming(limit),
    queryFn: ({ signal }) => getEmailTopPerformingCampaigns(limit, signal),
  });
}

export function useEmailPipelineSummary() {
  return useQuery({
    queryKey: emailKeys.analytics.pipelineSummary(),
    queryFn: ({ signal }) => getEmailPipelineSummary(signal),
  });
}

