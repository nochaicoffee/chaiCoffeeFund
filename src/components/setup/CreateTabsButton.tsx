"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HEADER_PRIMARY_CLASS } from "@/components/shell/FormTriggerButton";

/** Builds the Sheet's missing tabs (POST /api/setup/sheet), which only ever adds, then reloads the checklist. */
export function CreateTabsButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/setup/sheet", { method: "POST" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(body?.error ?? `That didn't work (${res.status}). Check the checklist above.`);
      else router.refresh();
    } catch {
      setError("Couldn't reach the app. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={create} disabled={busy} className={`${HEADER_PRIMARY_CLASS} disabled:opacity-60`}>
        {busy ? "Creating…" : `Create the ${count} missing tab${count === 1 ? "" : "s"}`}
      </button>
      <p className="text-[12.5px] text-muted">It only adds tabs. A tab that&apos;s already in your Sheet is never changed.</p>
      {error ? (
        <p role="alert" className="text-[12.5px] font-bold text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
