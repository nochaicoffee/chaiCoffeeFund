import { NextResponse } from "next/server";
import { POST as syncAccountStatements } from "@/app/api/account-statements/sync/route";
import { POST as syncCardStatements } from "@/app/api/statements/sync/route";
import { hasValidCronSecret } from "@/lib/auth/gate";
import { runInRounds, type RoundsReport } from "@/lib/statementIngestion/rounds";

/** Both syncs, several rounds each: Vercel Hobby allows a function up to 300 seconds. */
export const maxDuration = 300;
/**
 * A round takes up to about 65 seconds (45 of reading, then writing), so no round of either sync
 * starts after 200 seconds and the last one ends inside 300. The account sync gets what the card
 * sync leaves, but the card sync stops starting rounds at 100 seconds so it can't use it all.
 */
const ALL_SYNCS_START_NO_LATER_THAN_MS = 200_000;
const CARD_SYNC_START_NO_LATER_THAN_MS = 100_000;
const MAX_ROUNDS = 10;

/** Calls one of the sync routes in-process, as the scheduled script called it over HTTP, and reads its answer. */
function round(path: string, handler: (request: Request) => Promise<Response>) {
  return async () => {
    const response = await handler(new Request(`http://cron.internal${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "Scheduled" }) }));
    const body = (await response.json().catch(() => null)) as { status?: unknown; remaining?: unknown } | null;
    return { ok: response.ok, status: typeof body?.status === "string" ? body.status : "error", remaining: typeof body?.remaining === "number" ? body.remaining : 0 };
  };
}

/**
 * What Vercel Cron calls (vercel.json): the card statement sync, then the bank account statement
 * sync, each as many rounds as fit. Vercel Cron makes a GET and sends `Authorization: Bearer
 * $CRON_SECRET`; the proxy checks it, and it's checked again here so the route is safe even if the
 * proxy's matcher ever changes. The syncs themselves are the routes behind the "Sync statements"
 * buttons, so they keep their own record in the SyncRuns tab, their duplicate checks and their
 * cache invalidation. The answer has counts only (no subjects, amounts or names), and is a 500 if
 * either sync failed, so Vercel's cron log shows it. A sync that found no time left reports
 * "not-started" with 0 rounds, which isn't a failure: the next day's run picks it up.
 */
export async function GET(request: Request) {
  if (!(await hasValidCronSecret(request.headers.get("authorization"), process.env))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  const startedAt = Date.now();
  const cards: RoundsReport = await runInRounds(round("/api/statements/sync", syncCardStatements), {
    startNoLaterThan: startedAt + CARD_SYNC_START_NO_LATER_THAN_MS,
    maxRounds: MAX_ROUNDS,
  }).catch(failed);
  const accounts: RoundsReport = await runInRounds(round("/api/account-statements/sync", syncAccountStatements), {
    startNoLaterThan: startedAt + ALL_SYNCS_START_NO_LATER_THAN_MS,
    maxRounds: MAX_ROUNDS,
  }).catch(failed);
  return NextResponse.json({ cards, accounts }, { status: cards.ok && accounts.ok ? 200 : 500 });
}

/** A sync that threw is reported as a failure of its own and doesn't stop the other one running. */
function failed(): RoundsReport {
  return { ok: false, status: "error", remaining: 0, rounds: 0 };
}
