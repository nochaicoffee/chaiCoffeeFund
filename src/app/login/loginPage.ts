import { appConfig } from "@/lib/appConfig";
import { SESSION_DAYS } from "@/lib/auth/session";
import { KULHAD_CSS, kulhadSvg } from "@/lib/brand/kulhad";
import { greetingTitle } from "@/lib/format/date";
import { signInView, type Notice, type SignInError, type SignInInput } from "./loginView";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export interface LoginPageProps extends Omit<SignInInput, "error"> {
  /** Why the last try didn't work, if it didn't. */
  error: SignInError | null;
  /** When it is, for the greeting (a parameter so a test can fix it). */
  now?: Date;
}

const ICONS = { err: "!", warn: "!", info: "i", ok: "✓" } as const;

function noticeHtml(notice: Notice): string {
  const body = notice.parts.map((p) => (typeof p === "string" ? escapeHtml(p) : `<b>${escapeHtml(p.strong)}</b>`)).join("");
  const detail = notice.detail ? `<small>${escapeHtml(notice.detail)}</small>` : "";
  const role = notice.tone === "err" ? "alert" : "status";
  return `<div class="notice ${notice.tone}" role="${role}"><span class="ic" aria-hidden="true">${ICONS[notice.tone]}</span><div>${body}${detail}</div></div>`;
}

const GOOGLE_G = `<span class="g" data-g aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.200v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.200a6.6 6.6 0 0 1 0-4.2V7.2H2.200a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.400c1.6 0 3 .6 4.1 1.600l3.1-3.1A11 11 0 0 0 2.2 7.2L5.9 10c.9-2.6 3.3-4.6 6.1-4.6z"/></svg></span>`;
const LOCK = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
const MARK = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h12v3c0 3-2.5 5-6 5s-6-2-6-5z" fill="#1c2a20"/><path d="M17 11h1.5a2 2 0 0 1 0 4H17" fill="none" stroke="#1c2a20" stroke-width="2"/><path d="M8 7c-1-1.5 1-2 0-3.5M12 7c-1-1.5 1-2 0-3.5" fill="none" stroke="#1c2a20" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const CSS = `${KULHAD_CSS}
  :root { color-scheme: light; --page: oklch(0.965 0.004 90); --surface: oklch(0.995 0 0); --line: oklch(0 0 0 / 0.07); --fg: oklch(0.19 0.008 260); --muted: oklch(0.52 0.012 260); --fill: oklch(0 0 0 / 0.055); --accent: oklch(0.72 0.19 145); --accent-tint: oklch(0.93 0.06 145); --accent-text: oklch(0.42 0.14 145); --on-accent: oklch(0.16 0.008 260); --ink: oklch(0.16 0.008 260); --negative: oklch(0.55 0.16 25); --negative-tint: oklch(0.95 0.035 40); --warning: oklch(0.72 0.14 75); --warning-tint: oklch(0.95 0.05 85); --warning-text: oklch(0.47 0.1 70); }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); background: var(--page); color: var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; overflow-x: hidden; }
  body::before { content: ""; position: fixed; inset: -30%; pointer-events: none; background: radial-gradient(circle at 50% 40%, oklch(0.93 0.06 145 / 0.7), transparent 38%), repeating-radial-gradient(circle at 50% 40%, transparent 0 46px, oklch(0.42 0.1 152 / 0.05) 46px 47px); }
  main { position: relative; width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--line); border-radius: 28px; padding: 26px 26px 22px; box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 10px 24px oklch(0 0 0 / 0.06); text-align: center; }
  .brand { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 14px; letter-spacing: -0.01em; }
  .mark { width: 26px; height: 26px; border-radius: 9px; background: var(--accent); display: grid; place-items: center; }
  .kh { width: 150px; height: auto; margin: 28px auto 0; }
  h1 { margin: 2px 0 0; font-size: 22px; letter-spacing: -0.015em; }
  .sub { margin: 4px 0 18px; color: var(--muted); font-size: 14px; }
  .notice { display: flex; gap: 10px; text-align: left; border-radius: 14px; padding: 11px 13px; font-size: 13.5px; margin: 0 0 12px; line-height: 1.4; }
  .notice .ic { flex: none; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 11px; margin-top: 1px; }
  .notice small { display: block; opacity: 0.8; margin-top: 3px; font-size: 12.5px; }
  .notice.err { background: var(--negative-tint); color: oklch(0.4 0.14 25); } .notice.err .ic { background: var(--negative); color: #fff; }
  .notice.warn { background: var(--warning-tint); color: var(--warning-text); } .notice.warn .ic { background: var(--warning); color: var(--ink); }
  .notice.info { background: var(--fill); color: var(--fg); } .notice.info .ic { background: var(--fg); color: #fff; }
  .notice.ok { background: var(--accent-tint); color: var(--accent-text); } .notice.ok .ic { background: var(--accent); color: var(--ink); }
  .button { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 48px; border-radius: 14px; background: var(--accent); color: var(--on-accent); font-size: 15px; font-weight: 800; text-decoration: none; transition: transform .12s, filter .12s; }
  .button:hover { filter: brightness(1.04); } .button:active { transform: scale(.985); }
  .button:focus-visible, .copy:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .button[aria-disabled=true] { opacity: 0.45; pointer-events: none; }
  .button.busy { filter: saturate(.6); pointer-events: none; }
  .button .g { flex: none; width: 20px; height: 20px; background: #fff; border-radius: 50%; display: grid; place-items: center; }
  .button [data-label] { text-align: center; line-height: 1.25; padding: 6px 0; }
  .spin { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid oklch(0.16 0.008 260 / .25); border-top-color: var(--ink); animation: spin .8s linear infinite; }
  .spin[hidden], .g[hidden] { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .copy { margin-top: 10px; font: inherit; font-size: 13px; font-weight: 700; background: var(--fill); border: 0; border-radius: 10px; padding: 8px 14px; cursor: pointer; color: var(--fg); }
  .copy[hidden] { display: none; }
  .fine { margin: 16px 0 0; font-size: 12px; color: var(--muted); display: flex; gap: 6px; justify-content: center; align-items: center; line-height: 1.4; text-align: left; }
  .fine svg { flex: none; }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
  /* A phone on its side: the cup and the subtitle step aside so the button never scrolls off. */
  @media (max-height: 480px) { .kh, .sub { display: none; } main { padding: 18px 20px 16px; max-width: 420px; } }
`;

/**
 * The script: it only adds to a page that already works. Without it the button is a plain link
 * to /login/google. It locks the button once pressed (a second tap does nothing), says when Google
 * is slow, resets a page the browser brings back from the back/forward cache, notices being offline,
 * reveals Copy link inside an in-app browser, and tilts the cup toward the pointer.
 */
const SCRIPT = `(function () {
  var b = document.getElementById('go'); if (!b) return;
  var label = b.querySelector('[data-label]'), spin = b.querySelector('.spin'), g = b.querySelector('[data-g]');
  var live = document.getElementById('live'), notice = document.getElementById('notice');
  var idle = label.textContent, locked = b.getAttribute('aria-disabled') === 'true', offline = false, busy = false, timer = 0;
  // The live region is on the page from the start, empty, so a screen reader hears what is put into it.
  function say(tone, text) {
    live.textContent = '';
    if (text) {
      var n = document.createElement('div'), ic = document.createElement('span'), t = document.createElement('div');
      n.className = 'notice ' + tone; ic.className = 'ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = '!'; t.textContent = text;
      n.appendChild(ic); n.appendChild(t); live.appendChild(n);
    }
    if (notice) notice.hidden = !!text;
  }
  function setBusy(on) { busy = on; b.classList.toggle('busy', on); if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); spin.hidden = !on; g.hidden = on; label.textContent = on ? 'Opening Google\\u2026' : idle; }
  function lock(on) { if (locked) return; if (on) { b.setAttribute('aria-disabled', 'true'); b.tabIndex = -1; } else { b.removeAttribute('aria-disabled'); b.removeAttribute('tabindex'); } }
  b.addEventListener('click', function (e) {
    if (busy || offline || locked) { e.preventDefault(); return; }
    setBusy(true); say('', '');
    clearTimeout(timer);
    timer = setTimeout(function () { setBusy(false); label.textContent = 'Try again'; say('warn', 'Google is taking a while. Check your connection, then try again.'); }, 8000);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) { clearTimeout(timer); setBusy(false); say('', ''); } });
  function net() {
    if (navigator.onLine === false) { offline = true; lock(true); say('warn', "You're offline. Sign-in needs the internet. This unlocks when you're back."); }
    else if (offline) { offline = false; lock(false); say('', ''); }
  }
  addEventListener('offline', net); addEventListener('online', net); net();
  var copy = document.getElementById('copy');
  if (copy) { copy.hidden = false; copy.addEventListener('click', function () {
    var done = function (t) { copy.textContent = t; };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { done('Copied'); }, function () { done('Copy it from the address bar'); }); else done('Copy it from the address bar');
  }); }
  var raf = 0;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return; cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { var s = document.documentElement.style; s.setProperty('--tx', ((e.clientX / innerWidth - 0.5) * 2).toFixed(2)); s.setProperty('--ty', ((e.clientY / innerHeight - 0.5) * 2).toFixed(2)); });
  });
})();`;

/** The sign-in page's HTML, in the app's colours, working at phone width and with no script. */
export function loginPage(props: LoginPageProps): string {
  const view = signInView(props);
  const href = `/login/google${props.next !== "/" ? `?next=${encodeURIComponent(props.next)}` : ""}`;
  const owner = escapeHtml(appConfig.ownerName);
  const button = `<a class="button" id="go" href="${escapeHtml(href)}"${view.disabled ? ' aria-disabled="true" tabindex="-1"' : ""}><span class="spin" hidden></span>${GOOGLE_G}<span data-label>${escapeHtml(view.button)}</span></a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Sign in · ${escapeHtml(appConfig.appName)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
  <div class="brand"><span class="mark">${MARK}</span>${escapeHtml(appConfig.appName)}</div>
  ${kulhadSvg()}
  <h1>${escapeHtml(greetingTitle(props.now))}</h1>
  <p class="sub">Sign in with Google to open your money.</p>
  ${view.notice ? `<div id="notice">${noticeHtml(view.notice)}</div>` : ""}
  <div id="live" role="status" aria-live="polite"></div>
  ${button}
  ${view.inApp ? '<button type="button" class="copy" id="copy" hidden>Copy link</button>' : ""}
  <p class="fine">${LOCK}<span>${owner ? `Only ${owner}'s Google account` : "Only the owner's Google account"} can sign in · stays signed in ${SESSION_DAYS} days</span></p>
</main>
<script>${SCRIPT}</script>
</body>
</html>`;
}
