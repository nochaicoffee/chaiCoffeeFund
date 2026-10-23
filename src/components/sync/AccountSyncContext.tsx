"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { refreshAllData } from "@/app/actions/refresh";
import type { AccountSyncResult, EmailOutcome } from "@/lib/accountStatementIngestion/types";
import { buildAccountSyncReport, type AccountSyncReport } from "@/lib/format/accountSyncReport";

/** Syncs in a row for one press, each reading what fits in its time budget: plenty for a first sync of years of statements. */
const MAX_ROUNDS = 10;

export type AccountSyncState =
  | { phase: "idle" }
  | { phase: "running"; read: number; remaining: number | null }
  | { phase: "done"; report: AccountSyncReport; finishedAt: number }
  | { phase: "already-running"; since: string }
  /** report: what the rounds before the failure read, if any did. */
  | { phase: "failed"; message: string; report: AccountSyncReport | null };

interface AccountSyncControls {
  state: AccountSyncState;
  start: () => void;
  dismiss: () => void;
}

const AccountSyncContext = createContext<AccountSyncControls | null>(null);

/**
 * The Sync account statements button and its report share this, as the Cards page's do (SyncContext): the
 * button sits in the page header's actions and the report under the header's text. It runs the sync until
 * no new emails are left, then re-reads the page's data, so every number and mark reflects what was found.
 */
export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccountSyncState>({ phase: "idle" });
  const running = useRef(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ phase: "running", read: 0, remaining: null });
    const outcomes: EmailOutcome[] = [];
    let remaining = 0;
    try {
      for (let round = 1; ; round++) {
        const res = await fetch("/api/account-statements/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "unknown error");
        const result = data as AccountSyncResult;
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
      setState({ phase: "done", report: buildAccountSyncReport(outcomes, remaining), finishedAt: Date.now() });
    } catch (error) {
      if (outcomes.length > 0) await refresh().catch(() => {});
      setState({ phase: "failed", message: error instanceof Error ? error.message : String(error), report: outcomes.length > 0 ? buildAccountSyncReport(outcomes, remaining) : null });
    } finally {
      running.current = false;
    }

    // The route can only mark cached data stale; this re-reads it now (the Refresh button's action) and re-renders the page.
    async function refresh() {
      await refreshAllData();
      startTransition(() => router.refresh());
    }
  }, [router]);

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);
  const controls = useMemo(() => ({ state, start: () => void start(), dismiss }), [state, start, dismiss]);
  return <AccountSyncContext.Provider value={controls}>{children}</AccountSyncContext.Provider>;
}

export function useAccountSync(): AccountSyncControls {
  const controls = useContext(AccountSyncContext);
  if (!controls) throw new Error("useAccountSync needs an AccountSyncProvider around the page header");
  return controls;
}
