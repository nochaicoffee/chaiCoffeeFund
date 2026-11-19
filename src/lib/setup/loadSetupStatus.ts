import "server-only";
import { readFileSync } from "node:fs";
import { parseServiceAccountKey } from "@/lib/sheets/credentials";
import { checkSheet } from "@/lib/sheets/checkSheet";
import { isMissingTabProblem } from "@/lib/sheets/tableStructure";
import { blockingChecks, envChecks, type EnvCheck, type KeyState } from "./envChecks";
import { sheetProblem, type SheetProblem } from "./sheetProblem";

type Env = Record<string, string | undefined>;

/** What reaching the Sheet showed. */
export type SheetState =
  /** Not tried: a required setting is missing, so there's nothing to connect with yet. */
  | { state: "skipped" }
  | { state: "ready"; tabs: number }
  /** Connected, but some tabs are missing (the "Create the missing tabs" button builds them) or don't match the app. */
  | { state: "tabs"; missing: string[]; differing: { tab: string; problems: string[] }[] }
  | { state: "error"; problem: SheetProblem };

export interface SetupStatus {
  checks: EnvCheck[];
  /** The email to share the Sheet with, from the key. It is not a secret (it's shown in Google Cloud and in the Share box). */
  serviceAccountEmail: string | null;
  sheet: SheetState;
}

/** The key's state and its email, from the key setting or the key file. The private key itself is never kept. */
function readKey(env: Env): { state: KeyState; email: string | null } {
  try {
    if (env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim()) return { state: "ok", email: parseServiceAccountKey(env.GOOGLE_SERVICE_ACCOUNT_KEY).client_email };
    if (env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) return { state: "ok", email: parseServiceAccountKey(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE, "utf8")).client_email };
  } catch {
    return { state: "invalid", email: null };
  }
  return { state: "missing", email: null };
}

/**
 * The setup checklist's data: each setting (set or not, never its value), and, when `reachSheet`
 * is true and the Sheet settings are right, one read of the Sheet's structure (no cell values).
 * Callers pass `reachSheet` only for someone signed in: it makes a Google request.
 */
export async function loadSetupStatus(env: Env, reachSheet: boolean): Promise<SetupStatus> {
  const key = readKey(env);
  const checks = envChecks(env, key.state);
  const sheetReady = checks.filter((check) => check.group === "sheet").every((check) => check.ok);
  if (!reachSheet || !sheetReady) return { checks, serviceAccountEmail: key.email, sheet: { state: "skipped" } };
  try {
    const result = await checkSheet();
    const missing = result.tabs.filter((tab) => tab.problems.some(isMissingTabProblem)).map((tab) => tab.tab);
    const differing = result.tabs.filter((tab) => tab.problems.length > 0 && !missing.includes(tab.tab));
    if (missing.length === 0 && differing.length === 0) return { checks, serviceAccountEmail: key.email, sheet: { state: "ready", tabs: result.tabs.length } };
    return { checks, serviceAccountEmail: key.email, sheet: { state: "tabs", missing, differing } };
  } catch (error) {
    return { checks, serviceAccountEmail: key.email, sheet: { state: "error", problem: sheetProblem(error, key.email) } };
  }
}

/**
 * Whether everything the app can't run without is right. Run `local` (npm run dev with no login), the sign-in
 * settings don't count: they're needed on the host, and locally nothing asks you to sign in.
 */
export function isReady(status: SetupStatus, local = false): boolean {
  const blocking = blockingChecks(status.checks).filter((check) => !(local && check.group === "signin"));
  return blocking.length === 0 && status.sheet.state === "ready";
}
