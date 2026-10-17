"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { IngestionResult } from "@/lib/statementIngestion/types";

export function SyncStatementsButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  // What else the import did, e.g. filling in a card's last 4 (#78). The full sync report is #54.
  const [notes, setNotes] = useState<string[]>([]);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            setNotes([]);
            try {
              const res = await fetch("/api/statements/sync", { method: "POST" });
              const data = await res.json();
              if (!res.ok) {
                setMessage(`Sync failed: ${data.error ?? "unknown error"}`);
              } else {
                const result = data as IngestionResult;
                const created = result.outcomes.filter((o) => o.outcome === "created").length;
                const duplicate = result.outcomes.filter((o) => o.outcome === "duplicate").length;
                const skipped = result.outcomes.filter((o) => o.outcome === "skipped").length;
                setMessage(`Sync: ${created} added, ${duplicate} already had a statement, ${skipped} skipped.`);
                setNotes(result.outcomes.flatMap((o) => o.notes ?? []));
                router.refresh();
              }
            } catch (error) {
              setMessage(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          })
        }
        className="rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 max-md:min-h-11"
      >
        {isPending ? "Syncing…" : "Sync statements"}
      </button>
      {message && <span className="max-w-xs text-right text-xs text-muted">{message}</span>}
      {notes.length > 0 && (
        <ul className="max-w-xs text-right text-xs text-muted">
          {notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
