/** Chat module public surface (.agent/API_CONTEXT.txt §1). */
export {
  chatKeys,
  chatMessageSchema,
  chatSessionSchema,
  chatTurnSchema,
  createSession,
  createTurn,
  deleteSession,
  getResponse,
  getSession,
  listMessages,
  listSessions,
  listTurns,
  llmResponseSchema,
  setSessionModelEnabled,
  setSessionModels,
  streamTurnUrl,
  updateResponse,
  updateSession,
  type ChatMessage,
  type ChatSession,
  type ChatSessionModel,
  type ChatTurn,
  type LlmResponse,
  type SessionCreate,
  type SessionUpdate,
  type TurnCreate,
} from "./api";
export {
  chatMessageRoleSchema,
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
  useBranchChildren,
  useCreateSession,
  useDeleteSession,
  useMessages,
  useSession,
  useSessions,
  useSetSessionModels,
  useSubmitTurn,
  useToggleSessionModel,
  useTurns,
  useUpdateSession,
} from "./hooks";
export {
  applyResponseEvent,
  useTurnStream,
  type StreamState,
  type UseTurnStreamResult,
} from "./use-turn-stream";
export { parseBlocks, parseInline, safeHref, type Block, type InlineToken } from "./markdown";
export { Composer, type ComposerProps } from "./components/Composer";
export { Conversation, type ConversationProps } from "./components/Conversation";
export { CopyButton, Markdown, highlightCode, type MarkdownProps } from "./components/Markdown";
export { ModelSetEditor } from "./components/ModelSetEditor";
export { NewChatButton } from "./components/NewChatButton";
export { ResponseCard, type ResponseCardProps } from "./components/ResponseCard";
export { SessionRow } from "./components/SessionRow";
export { SessionSidebar, type SessionSidebarProps } from "./components/SessionSidebar";
