"use client";

import { SyncButton } from "./SyncButton";
import { useAccountSync } from "./sync/AccountSyncContext";

/** Starts a bank account statement sync; its progress and report show under the page header (AccountSyncReportPanel). */
export function SyncAccountStatementsButton() {
  const { state, start } = useAccountSync();
  return <SyncButton running={state.phase === "running"} onClick={start} />;
}
