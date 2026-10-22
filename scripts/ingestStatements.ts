/**
 * The launchd entrypoint for the 5-day statement-sync schedule.
 *
 * Deliberately does NOT import `runStatementIngestion` directly — that
 * function (and the Sheets/Gmail clients it depends on) live behind
 * `import "server-only"`, which unconditionally throws outside Next's own
 * build (confirmed: a plain `tsx` script importing it fails immediately,
 * even though the equivalent code runs fine inside a Route Handler). So
 * this script instead calls the app's own `/api/statements/sync` route
 * over HTTP — the same endpoint the Cards page's "Sync statements" button
 * uses — which means **the Next server (`npm run dev`, or eventually a
 * persistent `npm start`) must actually be running when this fires**. That
 * is a real limitation of this app's current "npm run dev only, hosting
 * deferred" posture, not something this script can route around.
 *
 * Usage: npx tsx scripts/ingestStatements.ts
 */
import { appendFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOG_PATH = join(PROJECT_ROOT, "logs", "statement-ingestion.log");
const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";

async function log(line: string): Promise<void> {
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(stamped);
  await appendFile(LOG_PATH, stamped).catch(() => {
    // logs/ may not exist yet on a first run — best-effort only, never fail the sync over a log write.
  });
}

/** Syncs in a row for one scheduled run; each reads what fits in its time budget (#82). */
const MAX_ROUNDS = 10;

async function main() {
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    await log(`Requesting POST ${APP_URL}/api/statements/sync`);
    const res = await fetch(`${APP_URL}/api/statements/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "Scheduled" }),
    });
    const body = await res.json();

    if (!res.ok) {
      await log(`FAILED (${res.status}): ${JSON.stringify(body)}`);
      process.exitCode = 1;
      return;
    }
    if (body.status === "already-running") {
      await log(`Another sync is running (started ${body.runningSince}), so this one did nothing.`);
      return;
    }

    const outcomes = body.outcomes as { messageId: string; subject: string; outcome: string; reason?: string }[];
    const created = outcomes.filter((o) => o.outcome === "created").length;
    const duplicate = outcomes.filter((o) => o.outcome === "duplicate").length;
    const skipped = outcomes.filter((o) => o.outcome === "skipped");

    await log(`Done: ${created} created, ${duplicate} duplicate, ${skipped.length} skipped, ${body.remaining} left to read.`);
    for (const s of skipped) {
      await log(`  skipped "${s.subject}" (message ${s.messageId}): ${s.reason}`);
    }
    if (body.remaining === 0) return;
  }
}

main().catch(async (error) => {
  await log(`ERROR: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
