import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { importAccountStatementFile } from "@/lib/accountStatementIngestion/run";
import { CACHE_TAGS } from "@/lib/sheets/cached";

/** Bigger than any bank statement: a year of Canara's passbook is under 200 KB. */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * One bank statement PDF given by hand, for a bank whose statements don't come by email (Canara, SBI):
 * `POST /api/account-statements/file?name=<file name>` with the PDF as the body, and `&dryRun=1` to see what it
 * would do without writing. Reads it with the saved PDF passwords and adds balances exactly as the Gmail sync does
 * (`importAccountStatementFile`). `scripts/importAccountStatement.ts` calls it.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const fileName = url.searchParams.get("name")?.trim() || "statement.pdf";
  const dryRun = url.searchParams.get("dryRun") === "1";
  // Refused before it's read when it says it's too big; checked again after, since the header is optional.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "That file is too big to be a bank statement" }, { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return NextResponse.json({ error: "Send the PDF as the request body" }, { status: 400 });
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "That file is too big to be a bank statement" }, { status: 413 });
  try {
    const result = await importAccountStatementFile({ fileName, bytes, dryRun });
    if (!dryRun && result.result === "imported") {
      revalidateTag(CACHE_TAGS.balanceSnapshots, "max");
      revalidateTag(CACHE_TAGS.balanceReviews, "max");
      revalidateTag(CACHE_TAGS.accounts, "max");
      revalidateTag(CACHE_TAGS.incomeEntries, "max");
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
