"use client";

/** The header's "Sync statements" button, for the Cards and the Accounts pages. Its progress and report show under the page header, so the header's buttons stay in one row. */
export function SyncButton({ running, onClick }: { running: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={running}
      aria-busy={running || undefined}
      onClick={onClick}
      className="flex items-center gap-2 rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 max-md:min-h-11"
    >
      {running && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className="animate-spin motion-reduce:animate-none">
          <path d="M21 12a9 9 0 1 1-6.2-8.6" />
        </svg>
      )}
      {running ? "Syncing…" : "Sync statements"}
    </button>
  );
}
