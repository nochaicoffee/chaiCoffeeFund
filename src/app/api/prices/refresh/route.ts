import { NextResponse } from "next/server";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { RefreshBusyError, refreshPrices } from "@/lib/prices/refresh";

/** The day in India, where he is: the refresh keeps prices up to this day. */
function today(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Brings the saved prices up to date (ADR 0013): `POST /api/prices/refresh`, or `?dryRun=1` to see
 * what would be saved without saving it. Safe to run twice: a saved day is never written again.
 */
export async function POST(request: Request) {
  return handleRouteErrors(async () => {
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
    const report = await refreshPrices({ today: today(), dryRun }).catch((error: unknown) => {
      if (error instanceof RefreshBusyError) return error;
      throw error;
    });
    if (report instanceof RefreshBusyError) return NextResponse.json({ error: report.message }, { status: 409 });
    return NextResponse.json({
      dryRun,
      added: report.reduce((sum, r) => sum + r.added, 0),
      failed: report.filter((r) => r.error).length,
      drifted: report.filter((r) => r.drift).length,
      tickers: report,
    });
  });
}
