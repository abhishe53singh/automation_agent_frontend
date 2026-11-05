"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { useGoogleLogin } from "../hooks";
import { getClientEnv } from "@/config/env";
import { Spinner } from "@/shared/ui";

/**
 * "Continue with Google" via Google Identity Services. GIS hands us an ID
 * token, which goes to the BFF (POST /api/auth/google); the backend verifies
 * it against GOOGLE_CLIENT_ID, finds or creates the user, and the BFF sets the
 * session cookies. Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GsiCredentialResponse {
  credential: string;
}

interface GsiButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GsiId {
  initialize(config: {
    client_id: string;
    callback: (response: GsiCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GsiButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

let gsiPromise: Promise<GsiId> | undefined;

/** Load the GIS script once per page; later callers share the same promise. */
function loadGsi(): Promise<GsiId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  gsiPromise ??= new Promise<GsiId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("Google Identity Services failed to initialise."));
    };
    script.onerror = () => {
      gsiPromise = undefined; // allow a retry on the next mount
      reject(new Error("Could not load Google sign-in."));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

export interface GoogleSignInButtonProps {
  /** Where to go after a successful sign-in. */
  redirectTo: string;
  /** Button label variant — "signup_with" on the register page. */
  text?: GsiButtonOptions["text"];
}

export function GoogleSignInButton({
  redirectTo,
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const clientId = getClientEnv().NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const googleLogin = useGoogleLogin();

  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // GIS keeps the callback from initialize(); route it through a ref so it
  // always sees the latest redirect target and mutation.
  const onCredentialRef = useRef<(credential: string) => void>(() => {});
  const { mutate } = googleLogin;
  useEffect(() => {
    onCredentialRef.current = (credential: string) => {
      mutate(credential, {
        onSuccess: () => {
          // A full refresh re-runs middleware against the freshly set cookies.
          router.replace(redirectTo as Route);
          router.refresh();
        },
        // Errors are toasted by the QueryProvider mutation handler.
      });
    };
  }, [mutate, router, redirectTo]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGsi()
      .then((gsi) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        gsi.initialize({
          client_id: clientId,
          callback: ({ credential }) => onCredentialRef.current(credential),
          ux_mode: "popup",
          cancel_on_tap_outside: true,
        });
        container.replaceChildren();
        gsi.renderButton(container, {
          type: "standard",
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "center",
          // GIS caps the width at 400px; fill the card up to that.
          width: Math.min(400, Math.max(200, Math.round(container.clientWidth))),
        });
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load Google sign-in.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, resolvedTheme, text]);

  if (!clientId) return null;

  return (
    <div className="w-full space-y-2">
      <div className="relative flex min-h-10 w-full items-center justify-center">
        <div
          ref={containerRef}
          className="flex w-full justify-center"
          aria-busy={googleLogin.isPending}
        />
        {googleLogin.isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-card/80">
            <Spinner />
          </div>
        )}
      </div>
      {loadError && <p className="text-center text-sm text-destructive">{loadError}</p>}
    </div>
  );
}

/** "or" separator between the password form and the Google button. */
export function AuthDivider() {
  return (
    <div className="flex w-full items-center gap-3 text-xs uppercase text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
