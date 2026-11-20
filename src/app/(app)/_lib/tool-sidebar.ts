"use client";

import * as React from "react";

const EMAIL_SIDEBAR_KEY = "aa:sidebar:email_marketing_enabled";
const EMAIL_SIDEBAR_EVENT = "aa:sidebar-email-marketing-changed";

function readEmailSidebarEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EMAIL_SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeEmailSidebar(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === EMAIL_SIDEBAR_KEY) onChange();
  };
  window.addEventListener(EMAIL_SIDEBAR_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EMAIL_SIDEBAR_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function writeEmailSidebarEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EMAIL_SIDEBAR_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable
  }
  window.dispatchEvent(new Event(EMAIL_SIDEBAR_EVENT));
}

export function useEmailSidebarEnabled(): [boolean, (val: boolean) => void] {
  const isEnabled = React.useSyncExternalStore(
    subscribeEmailSidebar,
    readEmailSidebarEnabled,
    () => false
  );
  return [isEnabled, writeEmailSidebarEnabled];
}
