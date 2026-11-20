"use client";

import * as React from "react";

import type { CaptchaFrameMessage } from "@/shared/lib/captcha";

import { CaptchaWidget } from "./CaptchaWidget";

/**
 * The captcha inside a third-party page's iframe. Tells the host page (only
 * `parentOrigin`) when it is solved or expired, and its height so the iframe
 * can fit it.
 */
export function CaptchaFrame({
  siteKey,
  parentOrigin,
  frameId,
}: {
  siteKey: string;
  parentOrigin: string | null;
  frameId: string;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  const post = React.useCallback(
    (message: Omit<CaptchaFrameMessage, "type" | "frame">) => {
      // Without a known parent origin the token is never broadcast.
      if (!parentOrigin || window.parent === window) return;
      const payload: CaptchaFrameMessage = { type: "aa-captcha", frame: frameId, ...message };
      window.parent.postMessage(payload, parentOrigin);
    },
    [parentOrigin, frameId],
  );

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() =>
      post({ event: "resize", height: Math.ceil(root.getBoundingClientRect().height) }),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [post]);

  return (
    <div ref={rootRef} className="p-1">
      <CaptchaWidget
        siteKey={siteKey}
        parentOrigin={parentOrigin}
        onSolved={(token) => post({ event: "solved", token })}
        onExpired={() => post({ event: "expired" })}
        className="bg-background"
      />
      {!parentOrigin ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Preview: embed with captcha.js to pass the token to your form.
        </p>
      ) : null}
    </div>
  );
}
