"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";

import { cn } from "@/shared/lib/cn";

/**
 * Self-hosted distorted-text captcha. Used by this app's signup form (site key
 * "app") and by the embeddable iframe page /captcha/{siteKey}.
 *
 * Talks to the same-origin public BFF (/api/public/captcha/...). A correct
 * answer yields a single-use pass token (`onSolved`); when it expires before
 * the form is sent, `onExpired` fires and a fresh image loads. Bump `resetKey`
 * to force a new image (e.g. after a failed submit consumed the token).
 */

interface Challenge {
  challenge_id: string;
  image: string;
  expires_at: string;
  length: number;
}

interface AnswerResult {
  success: boolean;
  token?: string | null;
  token_expires_at?: string | null;
  error?: string | null;
}

type Status = "loading" | "ready" | "checking" | "solved" | "error";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      "The captcha service is unavailable. Try again.";
    throw new Error(message);
  }
  return data as T;
}

export interface CaptchaWidgetProps {
  siteKey: string;
  /** Origin of the page showing the captcha (iframe embeds pass the host page's). */
  parentOrigin?: string | null;
  onSolved: (token: string) => void;
  onExpired?: () => void;
  /** Change to discard the current image/token and load a new one. */
  resetKey?: number;
  disabled?: boolean;
  className?: string;
}

export function CaptchaWidget({
  siteKey,
  parentOrigin,
  onSolved,
  onExpired,
  resetKey = 0,
  disabled,
  className,
}: CaptchaWidgetProps) {
  // Every image request has a key; the loaded image remembers which key it
  // answers, so "loading" is derived instead of set inside an effect.
  const [nonce, setNonce] = React.useState(0);
  const requestKey = `${siteKey}|${parentOrigin ?? ""}|${resetKey}|${nonce}`;
  const [loaded, setLoaded] = React.useState<{
    request: string;
    challenge?: Challenge;
    error?: string;
  } | null>(null);
  const [solvedFor, setSolvedFor] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [answer, setAnswer] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  const current = loaded?.request === requestKey ? loaded : null;
  const challenge = current?.challenge ?? null;
  const status: Status =
    solvedFor === requestKey
      ? "solved"
      : !current
        ? "loading"
        : current.error
          ? "error"
          : checking
            ? "checking"
            : "ready";

  // Latest callbacks without re-running effects when parents re-render.
  const callbacks = React.useRef({ onSolved, onExpired });
  const requestKeyRef = React.useRef(requestKey);
  React.useEffect(() => {
    callbacks.current = { onSolved, onExpired };
    requestKeyRef.current = requestKey;
  });

  React.useEffect(() => {
    let cancelled = false;
    postJson<Challenge>(`/api/public/captcha/${encodeURIComponent(siteKey)}/challenge`, {
      parent_origin: parentOrigin ?? undefined,
    })
      .then((next) => {
        if (!cancelled) setLoaded({ request: requestKey, challenge: next });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded({
            request: requestKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [siteKey, parentOrigin, requestKey]);

  /** New image (from events/timers only). `note` explains why. */
  const reload = React.useCallback((note: string | null = null) => {
    setAnswer("");
    setMessage(note);
    setNonce((n) => n + 1);
  }, []);

  // An unanswered image expires server-side: swap it before the user types into a dead one.
  React.useEffect(() => {
    if (status !== "ready" || !challenge) return;
    const wait = new Date(challenge.expires_at).getTime() - Date.now() - 5_000;
    const timer = window.setTimeout(() => reload(), Math.max(wait, 1_000));
    return () => window.clearTimeout(timer);
  }, [status, challenge, reload]);

  const verify = async () => {
    if (!challenge || !answer.trim() || status !== "ready") return;
    setChecking(true);
    try {
      const result = await postJson<AnswerResult>(
        `/api/public/captcha/challenges/${challenge.challenge_id}/answer`,
        { answer: answer.trim() },
      );
      if (result.success && result.token) {
        const solvedKey = requestKey;
        setSolvedFor(solvedKey);
        setAnswer("");
        setMessage(null);
        callbacks.current.onSolved(result.token);
        const expiresAt = result.token_expires_at ? new Date(result.token_expires_at).getTime() : 0;
        if (expiresAt) {
          window.setTimeout(
            () => {
              // Only if this solve is still the one on screen.
              if (requestKeyRef.current !== solvedKey) return;
              setSolvedFor(null);
              callbacks.current.onExpired?.();
              reload("Verification expired. Please solve the new captcha.");
            },
            Math.max(expiresAt - Date.now() - 3_000, 1_000),
          );
        }
        return;
      }
      // Wrong answers burn the image: load a new one with the reason.
      reload(result.error ?? "That didn't match. Try again.");
      inputRef.current?.focus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(false);
    }
  };

  if (status === "solved") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400",
          className,
        )}
        role="status"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        Verified, you are human
      </div>
    );
  }

  const busy = disabled || status === "loading" || status === "checking";

  return (
    <div className={cn("space-y-2 rounded-md border border-border bg-muted/30 p-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative h-[60px] flex-1 overflow-hidden rounded border border-border bg-white">
          {challenge && status !== "error" ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing to optimise
            <img
              src={challenge.image}
              alt="Captcha: type the characters shown. Letters are case-sensitive."
              className={cn("h-full w-full object-contain", status === "loading" && "opacity-40")}
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {status === "error" ? "Could not load the captcha" : "Loading…"}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => reload()}
          disabled={disabled || status === "loading" || status === "checking"}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Load a different captcha image"
          title="New image"
        >
          <RefreshCw className={cn("h-4 w-4", status === "loading" && "animate-spin")} aria-hidden />
        </button>
      </div>

      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Characters shown in the image (case-sensitive)
        </label>
        <input
          id={inputId}
          ref={inputRef}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            // Enter checks the captcha instead of submitting the surrounding form.
            if (event.key === "Enter") {
              event.preventDefault();
              void verify();
            }
          }}
          disabled={busy || status === "error"}
          placeholder="Type the characters (case-sensitive)"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={32}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm tracking-wider text-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void verify()}
          disabled={busy || !answer.trim()}
          className="h-9 shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {status === "checking" ? "Checking…" : "Verify"}
        </button>
      </div>

      {message || current?.error ? (
        <p role="alert" className="text-xs text-destructive">
          {current?.error ?? message}
        </p>
      ) : null}
    </div>
  );
}
