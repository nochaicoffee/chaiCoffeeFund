"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { buildSyncReport, type SyncReport } from "@/lib/format/syncReport";
import type { IngestionOutcome } from "@/lib/statementIngestion/types";
import { useSyncRunner, type SyncRunner, type SyncRunnerState } from "./useSyncRunner";

export type SyncState = SyncRunnerState<SyncReport>;

const SyncContext = createContext<SyncRunner<SyncReport> | null>(null);

/**
 * The Sync statements button and its report share this (#54): the button sits
 * in the page header's actions, and the report under the header's text, so
 * the result never squeezes the buttons. The rounds and the re-read are useSyncRunner's.
 */
export function SyncProvider({ cardNames, children }: { cardNames: Record<string, string>; children: ReactNode }) {
  const names = useMemo(() => new Map(Object.entries(cardNames)), [cardNames]);
  const runner = useSyncRunner<IngestionOutcome, SyncReport>("/api/statements/sync", (outcomes, remaining) => buildSyncReport(outcomes, remaining, names));
  return <SyncContext.Provider value={runner}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncRunner<SyncReport> {
  const controls = useContext(SyncContext);
  if (!controls) throw new Error("useSync needs a SyncProvider around the page header");
  return controls;
}
