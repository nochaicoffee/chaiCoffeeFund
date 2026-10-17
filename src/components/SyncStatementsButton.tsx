"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { IngestionResult } from "@/lib/statementIngestion/types";

/** Syncs in a row for one press, each reading what fits in its time budget: plenty for a first sync of years of statements. */
const MAX_ROUNDS = 10;

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
            const counts = { created: 0, duplicate: 0, skipped: 0 };
            const found: string[] = [];
            const summary = () => `Sync: ${counts.created} added, ${counts.duplicate} already had a statement, ${counts.skipped} skipped`;
            try {
              // Each sync stops after a time budget (#82), so carry on until the emails are all read.
              for (let round = 1; ; round++) {
                const res = await fetch("/api/statements/sync", { method: "POST" });
                const data = await res.json();
                if (!res.ok) {
                  setMessage(`Sync failed: ${data.error ?? "unknown error"}`);
                  break;
                }
                const result = data as IngestionResult;
                if (result.status === "already-running") {
                  setMessage(round === 1 ? "A sync is already running. Try again in a minute." : `${summary()}. Another sync started, so this one stopped there.`);
                  break;
                }
                for (const outcome of result.outcomes) counts[outcome.outcome]++;
                found.push(...result.outcomes.flatMap((o) => o.notes ?? []));
                setNotes([...found]);
                if (result.remaining > 0 && round < MAX_ROUNDS) {
                  setMessage(`${summary()}. Reading ${result.remaining} more…`);
                  continue;
                }
                setMessage(result.remaining > 0 ? `${summary()}. ${result.remaining} more to read: sync again.` : `${summary()}.`);
                break;
              }
              router.refresh();
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
