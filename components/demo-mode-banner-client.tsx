"use client";

import { useState } from "react";

const DISMISS_COOKIE = "tlc_demo_banner_dismissed";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

export function DemoModeBannerControls() {
  const [busy, setBusy] = useState(false);

  async function newHandle() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/handle/regenerate", { method: "POST" });
      // Reload so the server re-renders the banner + any handle-aware UI
      // (testimonial prefill, etc.) with the new cookie.
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  function dismiss() {
    document.cookie = `${DISMISS_COOKIE}=1; path=/; max-age=${ONE_YEAR_S}; samesite=lax`;
    // Hide immediately for the current page; subsequent navigations will
    // be SSR-aware via the cookie.
    const banner = document.currentScript?.closest("aside");
    if (banner) banner.remove();
    else window.location.reload();
  }

  return (
    <span className="flex items-center gap-3 text-christine-700">
      <button
        type="button"
        onClick={newHandle}
        disabled={busy}
        className="underline hover:text-christine-900 disabled:opacity-50"
      >
        new handle
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded px-1 hover:bg-christine-100"
        title="Dismiss"
      >
        ×
      </button>
    </span>
  );
}
