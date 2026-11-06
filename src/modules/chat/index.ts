/** Chat module public surface (.agent/API_CONTEXT.txt §1). */
export {
  attachmentContentUrl,
  chatKeys,
  chatMessageSchema,
  chatSessionSchema,
  chatToolSchema,
  chatTurnSchema,
  createSession,
  createTurn,
  deleteAttachment,
  deleteSession,
  getAttachmentTypes,
  getResponse,
  getSession,
  listAttachments,
  listChatTools,
  listMessages,
  listSessions,
  listTurns,
  llmResponseSchema,
  setSessionModelEnabled,
  setSessionModels,
  streamTurnUrl,
  updateResponse,
  updateSession,
  uploadAttachments,
  type ChatAttachment,
  type ChatAttachmentTypes,
  type ChatMessage,
  type ChatSession,
  type ChatSessionModel,
  type ChatTool,
  type ChatTurn,
  type LlmResponse,
  type SessionCreate,
  type SessionUpdate,
  type TurnCreate,
} from "./api";
export {
  chatAttachmentSchema,
  chatAttachmentTypesSchema,
  chatMessageRoleSchema,
  filterAttachmentFiles,
  isFinalStatus,
  llmResponseStatusSchema,
  sessionCreateSchema,
  sessionLabel,
  sessionUpdateSchema,
  turnCreateSchema,
  type ChatMessageRole,
  type LlmResponseStatus,
} from "./schemas";
export {
  invalidateChat,
  useAttachments,
  useAttachmentTypes,
  useBranchChildren,
  useChatTools,
  useCreateSession,
  useDeleteAttachment,
  useDeleteSession,
  useMessages,
  useRetryResponse,
  useSession,
  useSessions,
  useSetSessionModels,
  useSubmitTurn,
  useToggleSessionModel,
  useTurns,
  useUpdateSession,
  useUploadAttachments,
} from "./hooks";
export {
  applyResponseEvent,
  useTurnStream,
  type StreamState,
  type UseTurnStreamResult,
} from "./use-turn-stream";
export {
  parseBlocks,
  parseDelimitedTable,
  parseInline,
  safeHref,
  looksLikeCsv,
  type Block,
  type InlineToken,
} from "./markdown";
export { AttachmentChips, TurnAttachments } from "./components/Attachments";
export { ChatFilesPanel } from "./components/ChatFilesPanel";
export { Composer, type ComposerProps } from "./components/Composer";
export {
  useComposerAttachments,
  type ComposerAttachments,
  type PendingAttachment,
} from "./use-composer-attachments";
export { Conversation, type ConversationProps } from "./components/Conversation";
export { CopyButton, Markdown, highlightCode, type MarkdownProps } from "./components/Markdown";
export { MathView } from "./components/MathView";
export {
  BlockToolbar,
  RichTable,
  ToolButton,
  downloadTextFile,
  toCsv,
  useCopyText,
  type TableAlign,
} from "./components/rich-blocks";
export { ModelSetEditor } from "./components/ModelSetEditor";
export { NewChatButton } from "./components/NewChatButton";
export { ResponseCard, type ResponseCardProps } from "./components/ResponseCard";
export { SessionRow } from "./components/SessionRow";
export { SessionSidebar, type SessionSidebarProps } from "./components/SessionSidebar";
