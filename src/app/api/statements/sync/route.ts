import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import type { SyncTrigger } from "@/lib/sheets/types";
import { runStatementIngestion } from "@/lib/statementIngestion/runIngestion";

/** Room for the sync's 45-second time budget plus writing what it read (runIngestion.ts), on a host that enforces it. */
export const maxDuration = 60;

/**
 * Manual trigger for the Gmail statement pipeline — the Cards page's "Sync
 * statements" button — and what `scripts/ingestStatements.ts` calls, with
 * `{ "trigger": "Scheduled" }`. A Route Handler (not a Server Action), so cache
 * invalidation uses `revalidateTag(tag, "max")` here, not `updateTag`,
 * per this project's established Route-Handler-vs-Server-Action split.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const trigger: SyncTrigger = typeof body === "object" && body !== null && "trigger" in body && body.trigger === "Scheduled" ? "Scheduled" : "Manual";
  try {
    const result = await runStatementIngestion({ trigger });
    if (result.status === "done") {
      revalidateTag(CACHE_TAGS.statements, "max");
      // The import can fill in a card's last 4 (#78).
      revalidateTag(CACHE_TAGS.cards, "max");
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
