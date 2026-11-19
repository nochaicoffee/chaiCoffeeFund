/**
 * Builds every tab the app reads in your Google Sheet, with its Table, headers, column types and
 * dropdowns, then checks the result. Run it once after you've made an empty spreadsheet and shared
 * it with the service account (docs/setup.md, step 4). It only adds tabs: one that already exists is
 * left alone, so running it again is safe.
 *
 * Like check-sheet, it calls the app's own route instead of importing the Sheets code (which is
 * `server-only` and throws under plain tsx), so `npm run dev` must be running.
 *
 * Usage: npm run create-sheet
 */
import type { CreateSheetResult } from "../src/lib/sheets/createSheet";
import type { SheetCheck } from "../src/lib/sheets/checkSheet";

const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";
const URL_OF_ROUTE = `${APP_URL}/api/setup/sheet`;

async function call<T>(method: "GET" | "POST"): Promise<T> {
  // Not followed: with the login on, the proxy redirects to the sign-in page, and that has to be told apart from an answer.
  const res = await fetch(URL_OF_ROUTE, { method, redirect: "manual" }).catch((error: unknown) => {
    throw new Error(`Couldn't reach ${URL_OF_ROUTE}. Is \`npm run dev\` running? (${error instanceof Error ? error.message : String(error)})`);
  });
  // Read as text first: a dev server that can't compile the route answers with an HTML error page.
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`${method} ${URL_OF_ROUTE} was sent to the sign-in page: the login is on. Remove ALLOWED_EMAIL from .env.local to run this locally, or create the tabs from the /setup page once you're signed in.`);
  }
  const text = await res.text();
  let body: (T & { error?: string }) | undefined;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (!res.ok || !body) {
    const reason = body?.error ?? "the reply wasn't JSON; see the dev server's output";
    throw new Error(`${method} ${URL_OF_ROUTE} failed (${res.status}): ${reason}${res.status === 401 ? " (the login is on: remove ALLOWED_EMAIL from .env.local to run this locally)" : ""}`);
  }
  return body;
}

async function main() {
  const made = await call<CreateSheetResult>("POST");
  if (made.created.length > 0) console.log(`Created ${made.created.length} tab${made.created.length === 1 ? "" : "s"}: ${made.created.join(", ")}`);
  if (made.existing.length > 0) console.log(`Left ${made.existing.length} existing tab${made.existing.length === 1 ? "" : "s"} as they were.`);
  if (made.removedDefaultTab) console.log("Removed the empty Sheet1 tab.");

  const check = await call<SheetCheck>("GET");
  for (const { tab, problems } of check.tabs) {
    if (problems.length === 0) continue;
    console.log(`✗ ${tab}`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
  console.log(check.ok ? `\nEvery tab matches the app. The Sheet is ready.` : `\nSome tabs differ from the app (above). Tabs that existed before are never changed here; fix them in the Sheet, or see docs/setup.md.`);
  if (!check.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
