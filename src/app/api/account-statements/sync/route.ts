import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runAccountStatementSync } from "@/lib/accountStatementIngestion/run";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import type { SyncTrigger } from "@/lib/sheets/types";

/** Room for the sync's 45-second time budget plus writing what it read (run.ts), on a host that enforces it. */
export const maxDuration = 60;

/**
 * Reads the bank account statement emails under the account statement label and updates balances:
 * `POST /api/account-statements/sync`, with `{ "trigger": "Scheduled" }` when a script calls it and
 * `{ "dryRun": true }` to see what it would do without writing anything. The twin of
 * `/api/statements/sync` for cards; a Route Handler, so the cache is invalidated with
 * `revalidateTag(tag, "max")`, not `updateTag`.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const field = (name: string) => (typeof body === "object" && body !== null ? (body as Record<string, unknown>)[name] : undefined);
  const trigger: SyncTrigger = field("trigger") === "Scheduled" ? "Scheduled" : "Manual";
  const dryRun = field("dryRun") === true;
  try {
    const result = await runAccountStatementSync({ trigger, dryRun });
    if (result.status === "done" && !result.dryRun) {
      revalidateTag(CACHE_TAGS.balanceSnapshots, "max");
      revalidateTag(CACHE_TAGS.balanceReviews, "max");
      // The import can fill in an account's last 4.
      revalidateTag(CACHE_TAGS.accounts, "max");
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
