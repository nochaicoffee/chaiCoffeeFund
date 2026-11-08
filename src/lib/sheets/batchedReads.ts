import "server-only";
import { getSheetsClient, getSpreadsheetId } from "./client";
import { isQuotaError, isTimeoutError } from "./errors";

/**
 * Reads that start at about the same time go to Sheets as one `values.batchGet`. Google counts each
 * request against the quota (60 reads a minute per user), not each range, so a cold Overview's 25 tabs
 * cost one request instead of 25, in one round trip.
 *
 * A read waits this long for others to join it. Next's cache looks each tab up before reading it, so the
 * reads a page starts together don't arrive in the same tick: on a cold Overview the saved prices (read
 * straight, no cache lookup) asked first and the 24 cached tabs 32 ms later in dev, all within 4 ms of each
 * other. Against a Sheets read of half a second or more, the wait costs a lone read little.
 */
export const READ_BATCH_WINDOW_MS = 50;

/** A batch is sent at once when it reaches this many ranges, which keeps the request's URL short. */
export const MAX_RANGES_PER_BATCH = 40;

/** Every read: cells as their raw values, dates as serial numbers (see "Reading from Sheets" in docs/system-design.md). */
const RENDER = { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" } as const;

interface Waiter {
  resolve: (rows: unknown[][]) => void;
  reject: (error: unknown) => void;
}

/** The ranges waiting to be sent, each with everyone asking for it. A range asked for twice is read once. */
let waiting = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * A range's rows, read in a batch with any other range asked for in the same window. Only ranges not yet
 * sent are shared: a read asked for after a batch went out waits for the next one, so it never gets rows
 * read before a write it followed.
 */
export function readRange(range: string): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const waiters = waiting.get(range) ?? [];
    waiters.push({ resolve, reject });
    waiting.set(range, waiters);
    if (waiting.size >= MAX_RANGES_PER_BATCH) flush();
    else timer ??= setTimeout(flush, READ_BATCH_WINDOW_MS);
  });
}

/** Sheets refused the request itself (400), as it does for a range naming a tab that isn't there. */
function isRangeError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, status } = error as { code?: unknown; status?: unknown };
  return code === 400 || status === 400 || code === "400";
}

function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const batch = waiting;
  waiting = new Map();
  void send(batch);
}

async function send(batch: Map<string, Waiter[]>) {
  const ranges = [...batch.keys()];
  const settle = (range: string, outcome: { rows: unknown[][] } | { error: unknown }) => {
    for (const waiter of batch.get(range) ?? []) {
      if ("rows" in outcome) waiter.resolve(outcome.rows);
      else waiter.reject(outcome.error);
    }
  };

  try {
    const res = await getSheetsClient().spreadsheets.values.batchGet({ spreadsheetId: getSpreadsheetId(), ranges, ...RENDER });
    const valueRanges = res.data.valueRanges ?? [];
    if (valueRanges.length !== ranges.length) throw new Error(`Sheets answered ${valueRanges.length} ranges for the ${ranges.length} asked for`);
    // Sheets answers the ranges in the order they were asked for.
    ranges.forEach((range, i) => settle(range, { rows: valueRanges[i].values ?? [] }));
  } catch (error) {
    // Only two failures can be one range's fault: a tab renamed or missing (Sheets refuses the whole batch with
    // a 400), and no answer in time (one big tab can hold up the rest; a read is safe to send again). Then each
    // range is read on its own and only the bad one fails, so a page that can do without a tab shows the rest.
    // Anything else (out of quota, which the client has already retried; Google down; no access) fails every
    // range alike, and asking again one by one would only spend more of the quota.
    if (ranges.length === 1 || isQuotaError(error) || !(isRangeError(error) || isTimeoutError(error))) {
      ranges.forEach((range) => settle(range, { error }));
      return;
    }
    await Promise.all(
      ranges.map(async (range) => {
        try {
          const one = await getSheetsClient().spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range, ...RENDER });
          settle(range, { rows: one.data.values ?? [] });
        } catch (rangeError) {
          settle(range, { error: rangeError });
        }
      }),
    );
  }
}
