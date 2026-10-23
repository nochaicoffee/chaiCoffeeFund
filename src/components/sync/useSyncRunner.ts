"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { refreshAllData } from "@/app/actions/refresh";

/** Syncs in a row for one press, each reading what fits in its time budget (#82): plenty for a first sync of years of statements. */
const MAX_ROUNDS = 10;

export type SyncRunnerState<Report> =
  | { phase: "idle" }
  | { phase: "running"; read: number; remaining: number | null }
  | { phase: "done"; report: Report; finishedAt: number }
  | { phase: "already-running"; since: string }
  /** report: what the rounds before the failure read, if any did. */
  | { phase: "failed"; message: string; report: Report | null };

/** What a sync route answers, for cards and for accounts alike. */
type RoundResult<Outcome> = { status: "done"; outcomes: Outcome[]; remaining: number } | { status: "already-running"; runningSince: string };

export interface SyncRunner<Report> {
  state: SyncRunnerState<Report>;
  start: () => void;
  dismiss: () => void;
}

/**
 * The state machine behind a Sync button and its report (the Cards and the Accounts pages each have one): it
 * calls the sync route until no new emails are left, then re-reads the page's data, so every number reflects
 * the new statements without a manual refresh. The report is built from every round's outcomes by `buildReport`,
 * which may change between renders (it is read when a sync finishes).
 */
export function useSyncRunner<Outcome, Report>(endpoint: string, buildReport: (outcomes: Outcome[], remaining: number) => Report): SyncRunner<Report> {
  const [state, setState] = useState<SyncRunnerState<Report>>({ phase: "idle" });
  const running = useRef(false);
  const build = useRef(buildReport);
  useEffect(() => {
    build.current = buildReport;
  });
  const [, startTransition] = useTransition();
  const router = useRouter();

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ phase: "running", read: 0, remaining: null });
    const outcomes: Outcome[] = [];
    let remaining = 0;
    try {
      for (let round = 1; ; round++) {
        const res = await fetch(endpoint, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "unknown error");
        const result = data as RoundResult<Outcome>;
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
      setState({ phase: "done", report: build.current(outcomes, remaining), finishedAt: Date.now() });
    } catch (error) {
      if (outcomes.length > 0) await refresh().catch(() => {});
      setState({ phase: "failed", message: error instanceof Error ? error.message : String(error), report: outcomes.length > 0 ? build.current(outcomes, remaining) : null });
    } finally {
      running.current = false;
    }

    // The sync route can only mark the cached data stale, and the next read would still be the old one;
    // this re-reads it now (the Refresh button's action) and re-renders the page with it.
    async function refresh() {
      await refreshAllData();
      startTransition(() => router.refresh());
    }
  }, [endpoint, router]);

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);
  return useMemo(() => ({ state, start: () => void start(), dismiss }), [state, start, dismiss]);
}
