import "server-only";
import { getSheetsClient, getSpreadsheetId } from "./client";

type Rows = unknown[][];

/**
 * How long the first read waits for others to join it. The reads of one page are started within a few milliseconds of each other (each goes
 * through the data cache first), and every Sheets call costs about a second whatever its size, so a short wait turns 25 calls into one.
 */
export const BATCH_WINDOW_MS = 25;

/** A batchGet takes its ranges in the URL; this keeps one far under any limit. More than this go in a second call, started at once. */
export const MAX_RANGES_PER_CALL = 40;

/** The three things a reader needs from the outside, so it can be tested without Google or a clock. */
export interface ReaderDeps {
  /** One call for several ranges: each range's rows, in the order asked. */
  readMany: (ranges: string[]) => Promise<Rows[]>;
  /** One call for one range. */
  readOne: (range: string) => Promise<Rows>;
  /** Runs `flush` once, after about `ms`. */
  later: (flush: () => void, ms: number) => void;
}

/**
 * Google refused the range itself (a tab that isn't there, a name it can't parse). That refuses a whole batchGet for the one bad range, so the
 * ranges are then read in halves until the bad one is alone, and only it fails: the Overview leans on this to keep a missing optional tab from taking the page down.
 * A quota refusal or a timeout is not this: asking again at once as N calls would only make it worse.
 */
export function isBadRangeError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, status, response } = error as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  return [code, status, response?.status].some((value) => value === 400 || value === 404 || value === "400" || value === "404");
}

interface Waiter {
  resolve: (rows: Rows) => void;
  reject: (error: unknown) => void;
}

/**
 * Reads ranges, joining the ones asked for within BATCH_WINDOW_MS into one `values.batchGet`.
 * - The same range asked for twice in a window is read once and both callers get the rows (the Overview and its Expenses figures both ask for
 *   Accounts). Each caller gets its own copy of the rows (the array and each row in it).
 * - A window with one range is a plain `values.get`, exactly as before.
 * - Every caller is answered by a call sent after it asked, so a read that follows a write never gets rows from before it.
 */
export function createBatchReader(deps: ReaderDeps, windowMs: number = BATCH_WINDOW_MS) {
  let queue = new Map<string, Waiter[]>();

  async function readGroup(ranges: string[]): Promise<Map<string, { rows: Rows } | { error: unknown }>> {
    const results = new Map<string, { rows: Rows } | { error: unknown }>();
    if (ranges.length === 1) {
      try {
        results.set(ranges[0], { rows: await deps.readOne(ranges[0]) });
      } catch (error) {
        results.set(ranges[0], { error });
      }
      return results;
    }
    try {
      const all = await deps.readMany(ranges);
      if (all.length !== ranges.length) throw Object.assign(new Error("batchGet answered with the wrong number of ranges"), { code: 400 });
      ranges.forEach((range, index) => results.set(range, { rows: all[index] }));
    } catch (error) {
      if (isBadRangeError(error)) {
        // Halve the batch until the bad range is on its own: a few calls, not one per range (which would be the quota burst this avoids).
        const middle = Math.ceil(ranges.length / 2);
        const halves = await Promise.all([readGroup(ranges.slice(0, middle)), readGroup(ranges.slice(middle))]);
        for (const half of halves) for (const [range, result] of half) results.set(range, result);
      } else {
        for (const range of ranges) results.set(range, { error });
      }
    }
    return results;
  }

  async function flush(): Promise<void> {
    const waiting = queue;
    queue = new Map();
    const ranges = [...waiting.keys()];
    const groups: string[][] = [];
    for (let i = 0; i < ranges.length; i += MAX_RANGES_PER_CALL) groups.push(ranges.slice(i, i + MAX_RANGES_PER_CALL));
    await Promise.all(
      groups.map(async (group) => {
        const results = await readGroup(group);
        for (const range of group) {
          const result = results.get(range);
          for (const waiter of waiting.get(range) ?? []) {
            if (result && "rows" in result) waiter.resolve(result.rows.map((row) => row.slice()));
            else waiter.reject(result && "error" in result ? result.error : new Error(`${range}: no answer`));
          }
        }
      }),
    );
  }

  return {
    /** The rows of one range, as `values.get` returns them (an empty range is `[]`). */
    read(range: string): Promise<Rows> {
      return new Promise<Rows>((resolve, reject) => {
        const waiters = queue.get(range);
        if (waiters) waiters.push({ resolve, reject });
        else {
          const first = queue.size === 0;
          queue.set(range, [{ resolve, reject }]);
          if (first) deps.later(() => void flush(), windowMs);
        }
      });
    },
  };
}

const RENDER = { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" } as const;

/** One read of one range, as every read was before batching. Also what a tab too big to hold a batch back is read with. */
export async function readRangeAlone(range: string): Promise<Rows> {
  const res = await getSheetsClient().spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range, ...RENDER });
  return res.data.values ?? [];
}

const reader = createBatchReader({
  readOne: readRangeAlone,
  readMany: async (ranges) => {
    const res = await getSheetsClient().spreadsheets.values.batchGet({ spreadsheetId: getSpreadsheetId(), ranges, ...RENDER });
    return (res.data.valueRanges ?? []).map((valueRange) => valueRange.values ?? []);
  },
  later: (flush, ms) => void setTimeout(flush, ms),
});

/** The rows of a range, read together with whatever else is asked for in the next few milliseconds. */
export const readRangeBatched = reader.read;
