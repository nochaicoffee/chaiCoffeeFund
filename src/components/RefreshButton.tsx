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
      className="rounded-md border border-divider px-3 py-1.5 text-sm hover:bg-fill disabled:opacity-50"
    >
      {isPending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
