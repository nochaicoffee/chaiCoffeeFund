import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { runStatementIngestion } from "@/lib/statementIngestion/runIngestion";

/**
 * Manual trigger for the Gmail statement pipeline — the Cards page's "Sync
 * statements" button. A Route Handler (not a Server Action), so cache
 * invalidation uses `revalidateTag(tag, "max")` here, not `updateTag`,
 * per this project's established Route-Handler-vs-Server-Action split.
 */
export async function POST() {
  try {
    const result = await runStatementIngestion();
    revalidateTag(CACHE_TAGS.statements, "max");
    // The import can fill in a card's last 4 (#78).
    revalidateTag(CACHE_TAGS.cards, "max");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
