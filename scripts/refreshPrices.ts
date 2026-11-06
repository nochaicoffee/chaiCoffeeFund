/**
 * Brings the saved prices up to date (ADR 0013), for a daily schedule or by hand.
 *
 * Like sync-statements and check-sheet it calls the app's own route instead of importing the Sheets
 * code (which is `server-only` and throws under plain tsx), so the app (`npm run dev`) must be running.
 *
 * Usage: npm run refresh-prices        (add -- --dry-run to see what would be saved)
 */
const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = `${APP_URL}/api/prices/refresh${dryRun ? "?dryRun=1" : ""}`;
  const response = await fetch(url, { method: "POST" }).catch((error: unknown) => {
    throw new Error(`Couldn't reach ${url}. Is \`npm run dev\` running? (${error instanceof Error ? error.message : String(error)})`);
  });
  const body = (await response.json()) as { added: number; failed: number; dryRun: boolean; drifted: number; tickers: { ticker: string; added: number; error?: string; drift?: { days: number; worst: number; firstDay: string } }[]; error?: unknown };
  if (!response.ok) throw new Error(`${url} answered ${response.status}: ${JSON.stringify(body)}`);
  console.log(`${body.dryRun ? "Would save" : "Saved"} ${body.added} closes for ${body.tickers.length} tickers.`);
  for (const t of body.tickers.filter((x) => x.error)) console.log(`  ${t.ticker}: left as it was (${t.error})`);
  for (const t of body.tickers.filter((x) => x.drift)) {
    console.log(`  WARNING ${t.ticker}: ${t.drift!.days} saved days now read differently at the source (up to ${(t.drift!.worst * 100).toFixed(0)}% from ${t.drift!.firstDay}): likely a share split. Saved days are left as they were.`);
  }
  if (body.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
