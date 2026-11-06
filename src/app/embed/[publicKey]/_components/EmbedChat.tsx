"use client";

import { AlertCircle, MessageCircle, RotateCcw, SendHorizontal, X } from "lucide-react";
import * as React from "react";

import { Markdown } from "@/modules/chat/components/Markdown";
import { cn } from "@/shared/lib/cn";
import {
  EMBED_CLOSE_MESSAGE_TYPE,
  EMBED_MESSAGE_MAX_CHARS,
  isValidPublicKey,
  normalizeOrigin,
  parseHexColor,
  readableTextColor,
} from "@/shared/lib/embed-widget";

/**
 * Public chat widget UI (runs inside the iframe that `public/embed.js` opens).
 *
 * - Anonymous: talks only to `/api/public/embed/**` with plain `fetch` (never
 *   the app's API client, which would react to 401s by redirecting to /login).
 * - Every mount starts a FRESH conversation; its token lives in React state
 *   only — no cookies, no localStorage.
 */

interface WidgetConfig {
  title: string;
  welcome_message: string | null;
  accent_color: string | null;
}

interface Conversation {
  id: string;
  token: string;
}

interface ChatItem {
  id: string;
  /** Groups a user message with its reply so Retry can replace both. */
  exchangeId: string;
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  error?: string;
}

type ScreenError = "forbidden" | "unavailable" | "rate_limited" | "expired" | "error";

interface SendResponse {
  message?: { content?: string };
  reply?: { content?: string | null; status?: string; error?: string | null };
}

const DEFAULT_ACCENT = "#2563eb";

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new RequestError(0, "Network error. Check your connection and try again.");
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = (body as { error?: { message?: unknown } } | undefined)?.error?.message;
    throw new RequestError(
      response.status,
      typeof message === "string" && message ? message : "Something went wrong.",
    );
  }
  return body as T;
}

function screenFor(status: number): ScreenError {
  if (status === 403) return "forbidden";
  if (status === 404) return "unavailable";
  if (status === 429) return "rate_limited";
  if (status === 401) return "expired";
  return "error";
}

const SCREEN_COPY: Record<ScreenError, { title: string; description: string; retry: boolean }> = {
  forbidden: {
    title: "Not available on this site",
    description: "This chat widget is not allowed to run on this website.",
    retry: false,
  },
  unavailable: {
    title: "Chat unavailable",
    description: "This chat widget is not available right now.",
    retry: false,
  },
  rate_limited: {
    title: "Too many messages",
    description: "You have sent too many messages. Please try again later.",
    retry: true,
  },
  expired: {
    title: "Conversation ended",
    description: "This conversation has expired. Start a new one to keep chatting.",
    retry: true,
  },
  error: {
    title: "Something went wrong",
    description: "The chat could not be started. Please try again.",
    retry: true,
  },
};

/** The embedding page's origin: browser-provided first, the loader's hint last. */
export function resolveParentOrigin(originHint?: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const framed = window.parent !== window;
  if (framed) {
    const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList })
      .ancestorOrigins;
    const fromAncestors = normalizeOrigin(ancestors?.[0]);
    if (fromAncestors) return fromAncestors;
    const fromReferrer = normalizeOrigin(document.referrer);
    if (fromReferrer && fromReferrer !== window.location.origin) return fromReferrer;
  }
  return normalizeOrigin(originHint) ?? undefined;
}

const subscribeNever = () => () => undefined;
const isFramed = () => window.parent !== window;
const notFramed = () => false;

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export interface EmbedChatProps {
  publicKey: string;
  originHint?: string;
}

export function EmbedChat({ publicKey, originHint }: EmbedChatProps) {
  const [config, setConfig] = React.useState<WidgetConfig | null>(null);
  const [conversation, setConversation] = React.useState<Conversation | null>(null);
  const [welcome, setWelcome] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ChatItem[]>([]);
  const [screen, setScreen] = React.useState<ScreenError | null>(null);
  const [starting, setStarting] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const framed = React.useSyncExternalStore(subscribeNever, isFramed, notFramed);
  const [attempt, setAttempt] = React.useState(0);

  const validKey = isValidPublicKey(publicKey);
  const shownScreen: ScreenError | null = validKey ? screen : "unavailable";
  const parentOrigin = React.useMemo(() => resolveParentOrigin(originHint), [originHint]);
  const logRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const inputId = React.useId();
  const counterId = React.useId();

  // Fresh conversation on every mount (and on "Start again").
  React.useEffect(() => {
    if (!validKey) return;
    let cancelled = false;
    const base = `/api/public/embed/${encodeURIComponent(publicKey)}`;

    (async () => {
      try {
        const cfg = await requestJson<WidgetConfig>(`${base}/config`);
        if (cancelled) return;
        setConfig(cfg);
        const started = await requestJson<{
          conversation_id: string;
          token: string;
          welcome_message?: string | null;
        }>(`${base}/conversations`, {
          method: "POST",
          body: JSON.stringify(parentOrigin ? { parent_origin: parentOrigin } : {}),
        });
        if (cancelled) return;
        setConversation({ id: started.conversation_id, token: started.token });
        setWelcome(started.welcome_message || cfg.welcome_message || null);
      } catch (error) {
        if (!cancelled) setScreen(screenFor(error instanceof RequestError ? error.status : 0));
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey, validKey, parentOrigin, attempt]);

  const restart = () => {
    setScreen(null);
    setItems([]);
    setConversation(null);
    setWelcome(null);
    setStarting(true);
    setAttempt((n) => n + 1);
  };

  // Keep the newest message in view.
  React.useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [items, sending, welcome]);

  const send = React.useCallback(
    async (content: string) => {
      if (!conversation || sending) return;
      const exchangeId = nextId();
      setItems((prev) => [...prev, { id: nextId(), exchangeId, role: "user", content }]);
      setSending(true);
      try {
        const data = await requestJson<SendResponse>(
          `/api/public/embed/conversations/${encodeURIComponent(conversation.id)}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${conversation.token}` },
            body: JSON.stringify({ content }),
          },
        );
        const reply = data.reply;
        const failed = reply?.status !== "completed" || !reply?.content;
        setItems((prev) => [
          ...prev,
          {
            id: nextId(),
            exchangeId,
            role: "assistant",
            content: reply?.content ?? "",
            failed,
            error: failed ? reply?.error || "The assistant could not answer." : undefined,
          },
        ]);
      } catch (error) {
        const status = error instanceof RequestError ? error.status : 0;
        if (status === 401 || status === 404) {
          setScreen("expired");
          return;
        }
        const message =
          status === 429
            ? "Too many messages. Please try again later."
            : error instanceof Error
              ? error.message
              : "Message not sent.";
        setItems((prev) =>
          prev.map((item) =>
            item.exchangeId === exchangeId ? { ...item, failed: true, error: message } : item,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [conversation, sending],
  );

  // Re-focus the input once a reply lands (it is disabled while sending).
  React.useEffect(() => {
    if (!sending && conversation) inputRef.current?.focus();
  }, [sending, conversation]);

  const submit = () => {
    const content = draft.trim();
    if (!content || content.length > EMBED_MESSAGE_MAX_CHARS || sending) return;
    setDraft("");
    void send(content);
  };

  const retry = (exchangeId: string, content: string) => {
    if (sending) return;
    setItems((prev) => prev.filter((item) => item.exchangeId !== exchangeId));
    void send(content);
  };

  const close = React.useCallback(() => {
    window.parent.postMessage({ type: EMBED_CLOSE_MESSAGE_TYPE }, parentOrigin ?? "*");
  }, [parentOrigin]);

  // Keydown events do not bubble out of the iframe, so Escape is relayed here.
  React.useEffect(() => {
    if (!framed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [framed, close]);

  const accent = parseHexColor(config?.accent_color) ?? DEFAULT_ACCENT;
  const style = {
    "--embed-accent": accent,
    "--embed-accent-fg": readableTextColor(accent),
  } as React.CSSProperties;
  const title = config?.title || "Chat";

  return (
    <div style={style} className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-2 bg-[var(--embed-accent)] px-4 py-3 text-[var(--embed-accent-fg)]">
        <MessageCircle aria-hidden className="size-5 shrink-0" />
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
        {framed && (
          <button
            type="button"
            onClick={close}
            aria-label="Close chat"
            className="rounded-md p-1 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </header>

      {shownScreen ? (
        <ErrorScreen kind={shownScreen} onRetry={restart} />
      ) : (
        <>
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            aria-busy={starting || sending}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4"
          >
            {starting && <TypingBubble label="Connecting" />}
            {welcome && (
              <Bubble role="assistant">
                <Markdown content={welcome} />
              </Bubble>
            )}
            {items.map((item) => (
              <MessageRow
                key={item.id}
                item={item}
                onRetry={
                  item.failed
                    ? () => {
                        const userItem = items.find(
                          (i) => i.exchangeId === item.exchangeId && i.role === "user",
                        );
                        if (userItem) retry(item.exchangeId, userItem.content);
                      }
                    : undefined
                }
                retryDisabled={sending}
              />
            ))}
            {sending && <TypingBubble label="Assistant is typing" />}
          </div>

          <form
            className="shrink-0 border-t border-border bg-background p-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Message
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id={inputId}
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                maxLength={EMBED_MESSAGE_MAX_CHARS}
                disabled={!conversation || sending}
                placeholder={starting ? "Connecting…" : "Type a message…"}
                aria-describedby={counterId}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm [field-sizing:content] placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-[var(--embed-accent)] disabled:opacity-60"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!conversation || sending || !draft.trim()}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--embed-accent)] text-[var(--embed-accent-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--embed-accent)] disabled:opacity-50"
              >
                <SendHorizontal aria-hidden className="size-4" />
              </button>
            </div>
            <p
              id={counterId}
              className={cn(
                "mt-1 px-1 text-right text-[11px] text-muted-foreground",
                draft.length >= EMBED_MESSAGE_MAX_CHARS * 0.9 && "text-warning",
              )}
            >
              {draft.length}/{EMBED_MESSAGE_MAX_CHARS}
            </p>
          </form>
        </>
      )}
    </div>
  );
}

function Bubble({
  role,
  children,
  failed,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  failed?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm break-words",
          isUser
            ? "rounded-br-sm bg-[var(--embed-accent)] text-[var(--embed-accent-fg)]"
            : "rounded-bl-sm bg-muted text-foreground",
          failed && "ring-1 ring-destructive",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MessageRow({
  item,
  onRetry,
  retryDisabled,
}: {
  item: ChatItem;
  onRetry?: () => void;
  retryDisabled: boolean;
}) {
  const showContent = item.role === "user" || Boolean(item.content);
  return (
    <div className="space-y-1">
      {showContent && (
        <Bubble role={item.role} failed={item.failed}>
          <span className="sr-only">{item.role === "user" ? "You: " : "Assistant: "}</span>
          {item.role === "assistant" ? (
            <Markdown content={item.content} />
          ) : (
            <span className="whitespace-pre-wrap">{item.content}</span>
          )}
        </Bubble>
      )}
      {item.failed && (
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-destructive",
            item.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          <AlertCircle aria-hidden className="size-3.5 shrink-0" />
          <span>{item.error ?? "Message failed."}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryDisabled}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium underline-offset-2 hover:underline disabled:opacity-50"
            >
              <RotateCcw aria-hidden className="size-3" />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div
        role="status"
        aria-label={label}
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden
            style={{ animationDelay: `${delay}ms` }}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorScreen({ kind, onRetry }: { kind: ScreenError; onRetry: () => void }) {
  const copy = SCREEN_COPY[kind];
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <AlertCircle aria-hidden className="size-8 text-muted-foreground" />
      <h2 className="text-base font-semibold">{copy.title}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">{copy.description}</p>
      {copy.retry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-md bg-[var(--embed-accent)] px-4 py-2 text-sm font-medium text-[var(--embed-accent-fg)]"
        >
          {kind === "expired" ? "Start a new conversation" : "Try again"}
        </button>
      )}
    </div>
  );
}
