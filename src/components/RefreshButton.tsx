"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshAllData } from "@/app/actions/refresh";

export function RefreshButton({ iconOnly = false }: { iconOnly?: boolean } = {}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          // updateTag() alone only invalidates the cache — the current
          // page's already-rendered data needs router.refresh() to
          // actually re-fetch and re-render with the fresh result.
          await refreshAllData();
          router.refresh();
        })
      }
      aria-label={iconOnly ? (isPending ? "Refreshing data" : "Refresh data") : undefined}
      title={iconOnly ? "Refresh data from the Sheet" : undefined}
      className={`rounded-full bg-fill text-[13px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
        iconOnly ? "flex size-11 items-center justify-center md:size-10" : "px-5 py-2.5 max-md:min-h-11"
      }`}
    >
      {iconOnly ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={isPending ? "animate-spin motion-reduce:animate-none" : undefined}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      ) : isPending ? (
        "Refreshing…"
      ) : (
        "Refresh"
      )}
    </button>
  );
}
