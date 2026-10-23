"use client";

import { SyncButton } from "./SyncButton";
import { useSync } from "./sync/SyncContext";

/** Starts a card statement sync; its progress and report show under the page header (SyncReportPanel). */
export function SyncStatementsButton() {
  const { state, start } = useSync();
  return <SyncButton running={state.phase === "running"} onClick={start} />;
}
