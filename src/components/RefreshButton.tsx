"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshAllData } from "@/app/actions/refresh";

export function RefreshButton() {
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
      className="rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 max-md:min-h-11"
    >
      {isPending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
