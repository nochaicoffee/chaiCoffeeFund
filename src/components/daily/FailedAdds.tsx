"use client";

import { formatDayDate } from "@/lib/format/date";
import { formatInrExact } from "@/lib/format/money";
import { useDaily } from "./context";

/**
 * Adds that couldn't be saved, at the top of the page whichever day he's looking at: what was typed, why it didn't save, and Retry or Dismiss. They count
 * toward no total. A reason that says it may have been saved asks him to check the day first, so a retry doesn't add it twice.
 */
export function FailedAdds() {
  const daily = useDaily();
  if (daily.failed.length === 0) return null;
  return (
    <div className="fails">
      {daily.failed.map((f) => (
        <div key={f.id} className="fail-banner" role="alert">
          <span>
            <b>
              {formatInrExact(f.input.amount)} on {formatDayDate(f.input.date)} wasn&apos;t saved
            </b>
            <small>{f.message}</small>
          </span>
          <span className="fail-act">
            <button type="button" className="btn-s go" onClick={() => daily.retry(f.id)}>
              Retry
            </button>
            <button type="button" className="btn-s" onClick={() => daily.dismiss(f.id)}>
              Dismiss
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
