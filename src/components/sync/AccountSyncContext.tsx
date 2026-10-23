"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { EmailOutcome } from "@/lib/accountStatementIngestion/types";
import { buildAccountSyncReport, type AccountSyncReport } from "@/lib/format/accountSyncReport";
import { useSyncRunner, type SyncRunner, type SyncRunnerState } from "./useSyncRunner";

export type AccountSyncState = SyncRunnerState<AccountSyncReport>;

const AccountSyncContext = createContext<SyncRunner<AccountSyncReport> | null>(null);

/** The Sync account statements button and its report share this, as the Cards page's do (SyncContext). */
export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const runner = useSyncRunner<EmailOutcome, AccountSyncReport>("/api/account-statements/sync", buildAccountSyncReport);
  return <AccountSyncContext.Provider value={runner}>{children}</AccountSyncContext.Provider>;
}

export function useAccountSync(): SyncRunner<AccountSyncReport> {
  const controls = useContext(AccountSyncContext);
  if (!controls) throw new Error("useAccountSync needs an AccountSyncProvider around the page header");
  return controls;
}
