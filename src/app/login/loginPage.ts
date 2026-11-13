import { appConfig } from "@/lib/appConfig";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Why the last sign-in didn't work. */
export type SignInError = "denied" | "cancelled" | "failed";

const ERROR_MESSAGES: Record<SignInError, string> = {
  denied: "That Google account isn't allowed here.",
  cancelled: "Sign-in was cancelled.",
  failed: "Sign-in didn't work. Try again.",
};

/** The `error` in the page's address, if it is one of ours: anything else is ignored rather than shown. */
export function signInError(value: string | null | undefined): SignInError | null {
  return value && Object.hasOwn(ERROR_MESSAGES, value) ? (value as SignInError) : null;
}

export interface LoginPageProps {
  /** Where to go after signing in (already checked by `safeNextPath`). */
  next: string;
  /** Why the last try didn't work, if it didn't. */
  error: SignInError | null;
  /** False when the host has no Google client, allowed address or secret set. */
  configured: boolean;
}

/** The sign-in page's HTML, in the app's colours (the tokens in globals.css), working at phone width. */
export function loginPage({ next, error, configured }: LoginPageProps): string {
  const message = !configured
    ? "Login isn't set up on this server yet. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAIL and SESSION_SECRET."
    : error
      ? ERROR_MESSAGES[error]
      : "";
  const href = `/login/google${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sign in · ${escapeHtml(appConfig.appName)}</title>
<style>
  :root { color-scheme: light; --page: oklch(0.965 0.004 90); --surface: oklch(0.995 0 0); --line: oklch(0 0 0 / 0.07); --fg: oklch(0.19 0.008 260); --muted: oklch(0.52 0.012 260); --accent: oklch(0.72 0.19 145); --on-accent: oklch(0.16 0.008 260); --negative: oklch(0.55 0.16 25); }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 16px; background: var(--page); color: var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--line); border-radius: 28px; padding: 28px; box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 10px 24px oklch(0 0 0 / 0.06); }
  h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -0.01em; }
  p { margin: 0 0 20px; color: var(--muted); font-size: 14px; }
  .button { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; border-radius: 14px; background: var(--accent); color: var(--on-accent); font-size: 15px; font-weight: 700; text-decoration: none; }
  .button:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .button[aria-disabled=true] { opacity: 0.5; pointer-events: none; }
  .error { margin: 12px 0 0; color: var(--negative); font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(appConfig.appName)}</h1>
  <p>Sign in to see ${escapeHtml(appConfig.ownerName)}'s money.</p>
  <a class="button" href="${escapeHtml(href)}"${configured ? "" : ' aria-disabled="true" tabindex="-1"'}>Continue with Google</a>
  ${message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : ""}
</main>
</body>
</html>`;
}
