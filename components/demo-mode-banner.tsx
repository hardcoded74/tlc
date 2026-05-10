import { cookies } from "next/headers";
import { HANDLE_COOKIE, unpackHandle } from "@/lib/handle";
import { DemoModeBannerControls } from "./demo-mode-banner-client";

const DISMISS_COOKIE = "tlc_demo_banner_dismissed";

export async function DemoModeBanner() {
  const store = await cookies();
  const dismissed = store.get(DISMISS_COOKIE)?.value === "1";
  if (dismissed) return null;

  const handle = unpackHandle(store.get(HANDLE_COOKIE)?.value ?? null);
  // If middleware hasn't run yet (e.g., the very first request the SSR
  // happens to land on), the handle will be missing — render a generic
  // banner anyway so the messaging is consistent.
  return (
    <aside
      role="status"
      className="border-b border-christine-100 bg-christine-50/80 px-4 py-2 text-xs text-christine-700"
    >
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <span aria-hidden>★</span>
        <p className="flex-1 leading-snug">
          <strong className="font-medium">Demo mode.</strong>{" "}
          {handle ? (
            <>
              You&rsquo;re <span className="text-christine-900 font-medium">{handle}</span>{" "}
              for this browser. No login, no email — just a temporary handle
              that pre-fills your testimonial name and credits any lessons
              you remix.
            </>
          ) : (
            <>
              No login required. Each browser gets a temporary handle (like
              &ldquo;BraveOtter42&rdquo;) that pre-fills the testimonial form
              and credits remixes.
            </>
          )}
        </p>
        <DemoModeBannerControls />
      </div>
    </aside>
  );
}
