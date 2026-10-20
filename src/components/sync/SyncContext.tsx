"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { refreshAllData } from "@/app/actions/refresh";
import { buildSyncReport, type SyncReport } from "@/lib/format/syncReport";
import type { IngestionOutcome, IngestionResult } from "@/lib/statementIngestion/types";

/** Syncs in a row for one press, each reading what fits in its time budget (#82): plenty for a first sync of years of statements. */
const MAX_ROUNDS = 10;

export type SyncState =
  | { phase: "idle" }
  | { phase: "running"; read: number; remaining: number | null }
  | { phase: "done"; report: SyncReport; finishedAt: number }
  | { phase: "already-running"; since: string }
  /** report: what the rounds before the failure read, if any did. */
  | { phase: "failed"; message: string; report: SyncReport | null };

interface SyncControls {
  state: SyncState;
  start: () => void;
  dismiss: () => void;
}

const SyncContext = createContext<SyncControls | null>(null);

/**
 * The Sync statements button and its report share this (#54): the button sits
 * in the page header's actions, and the report under the header's text, so
 * the result never squeezes the buttons. It runs the sync until no new emails
 * are left, then re-reads the page's data, so every number reflects the new
 * statements without a manual refresh.
 */
export function SyncProvider({ cardNames, children }: { cardNames: Record<string, string>; children: ReactNode }) {
  const [state, setState] = useState<SyncState>({ phase: "idle" });
  const running = useRef(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const names = useMemo(() => new Map(Object.entries(cardNames)), [cardNames]);

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ phase: "running", read: 0, remaining: null });
    const outcomes: IngestionOutcome[] = [];
    let remaining = 0;
    try {
      for (let round = 1; ; round++) {
        const res = await fetch("/api/statements/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "unknown error");
        const result = data as IngestionResult;
        if (result.status === "already-running") {
          if (round === 1) {
            setState({ phase: "already-running", since: result.runningSince });
            return;
          }
          // Another sync started between rounds: it carries on from here.
          break;
        }
        outcomes.push(...result.outcomes);
        remaining = result.remaining;
        if (remaining === 0 || round === MAX_ROUNDS) break;
        setState({ phase: "running", read: outcomes.length, remaining });
      }
      await refresh();
      setState({ phase: "done", report: buildSyncReport(outcomes, remaining, names), finishedAt: Date.now() });
    } catch (error) {
      if (outcomes.length > 0) await refresh().catch(() => {});
      setState({ phase: "failed", message: error instanceof Error ? error.message : String(error), report: outcomes.length > 0 ? buildSyncReport(outcomes, remaining, names) : null });
    } finally {
      running.current = false;
    }

    // The sync route can only mark the cached data stale, and the next read would still be the old one;
    // this re-reads it now (the Refresh button's action) and re-renders the page with it.
    async function refresh() {
      await refreshAllData();
      startTransition(() => router.refresh());
    }
  }, [names, router]);

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);
  const controls = useMemo(() => ({ state, start: () => void start(), dismiss }), [state, start, dismiss]);
  return <SyncContext.Provider value={controls}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncControls {
  const controls = useContext(SyncContext);
  if (!controls) throw new Error("useSync needs a SyncProvider around the page header");
  return controls;
}
