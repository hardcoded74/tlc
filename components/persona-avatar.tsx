"use client";

import { useState } from "react";

type PersonaId = "hunter" | "christine";

/**
 * Renders a persona avatar. Tries to load /personas/{id}.png first;
 * if that 404s (or any other load error), falls back to the colored
 * letter circle that's been the placeholder. Drop a PNG at
 * public/personas/hunter.png or public/personas/christine.png and it
 * picks up automatically — no config change needed.
 */
export function PersonaAvatar({
  persona,
  size = "md",
  className = "",
}: {
  persona: PersonaId;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-lg",
    lg: "h-12 w-12 text-xl",
    xl: "h-20 w-20 text-3xl",
  }[size];

  const bgClass =
    persona === "hunter"
      ? "bg-hunter-700 text-white"
      : "bg-christine-500 text-white";

  if (failed) {
    return (
      <div
        className={`${sizeClasses} ${bgClass} rounded-full flex items-center justify-center font-serif shrink-0 ${className}`}
        aria-label={persona === "hunter" ? "Hunter" : "Christine"}
      >
        {persona === "hunter" ? "H" : "C"}
      </div>
    );
  }

  return (
    <img
      src={`/personas/${persona}.png`}
      alt={persona === "hunter" ? "Hunter" : "Christine"}
      onError={() => setFailed(true)}
      className={`${sizeClasses} rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
