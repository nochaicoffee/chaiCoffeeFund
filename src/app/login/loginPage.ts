import { appConfig } from "@/lib/appConfig";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export interface LoginPageProps {
  /** Where to go after signing in (already checked by `safeNextPath`). */
  next: string;
  /** The last try was wrong. */
  failed: boolean;
  /** False when the host has no passphrase or secret set. */
  configured: boolean;
}

/** The sign-in page's HTML, in the app's colours (the tokens in globals.css), working at phone width. */
export function loginPage({ next, failed, configured }: LoginPageProps): string {
  const message = !configured
    ? "Login isn't set up on this server yet. Set APP_PASSWORD and SESSION_SECRET."
    : failed
      ? "That passphrase isn't right."
      : "";
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
  label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; }
  input[type=password] { width: 100%; height: 48px; padding: 0 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--page); color: var(--fg); font-size: 16px; }
  input[type=password]:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  button { width: 100%; height: 48px; margin-top: 14px; border: 0; border-radius: 14px; background: var(--accent); color: var(--on-accent); font-size: 15px; font-weight: 700; cursor: pointer; }
  .error { margin: 12px 0 0; color: var(--negative); font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(appConfig.appName)}</h1>
  <p>Sign in to see ${escapeHtml(appConfig.ownerName)}'s money.</p>
  <form method="post" action="/login">
    <input type="hidden" name="next" value="${escapeHtml(next)}">
    <label for="password">Passphrase</label>
    <input id="password" name="password" type="password" autocomplete="current-password" autofocus required${configured ? "" : " disabled"}>
    <button type="submit"${configured ? "" : " disabled"}>Sign in</button>
    ${message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : ""}
  </form>
</main>
</body>
</html>`;
}
