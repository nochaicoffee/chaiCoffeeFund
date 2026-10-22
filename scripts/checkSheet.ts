/**
 * Checks that the real Sheet's tabs still match the app's repositories: tab
 * names, column order and headers, column types and dropdown values (see
 * "Verifying the Sheet" in docs/system-design.md). Exits 1 when any tab differs.
 *
 * Like ingestStatements.ts, it calls the app's dev-only /api/dev/sheet-check
 * route instead of importing the Sheets code, which is `server-only` and
 * throws under plain tsx. So `npm run dev` must be running.
 *
 * Usage: npm run check-sheet
 */
// A type-only import: tsx erases it, so the server-only module itself is never loaded.
import type { SheetCheck } from "../src/lib/sheets/checkSheet";

const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";

async function main() {
  const url = `${APP_URL}/api/dev/sheet-check`;
  const res = await fetch(url).catch((error: unknown) => {
    throw new Error(`Couldn't reach ${url}. Is \`npm run dev\` running? (${error instanceof Error ? error.message : String(error)})`);
  });
  if (res.status === 404) throw new Error(`${url} is a 404: the check only runs under \`npm run dev\`.`);
  // Read as text first: a dev server that can't compile the route answers with an HTML error page.
  const text = await res.text();
  let body: (SheetCheck & { error?: string }) | undefined;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (!res.ok || !body) {
    throw new Error(`The check failed (${res.status}): ${body?.error ?? "the reply wasn't JSON; see the dev server's output"}`);
  }

  const check = body;
  for (const { tab, problems } of check.tabs) {
    console.log(`${problems.length === 0 ? "✓" : "✗"} ${tab}`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
  if (check.otherTabs.length > 0) console.log(`\nTabs the app doesn't read: ${check.otherTabs.join(", ")}`);

  const differing = check.tabs.filter((tab) => tab.problems.length > 0).length;
  console.log(check.ok ? `\nEvery tab matches the code.` : `\n${differing} of ${check.tabs.length} tabs differ from the code.`);
  if (!check.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
