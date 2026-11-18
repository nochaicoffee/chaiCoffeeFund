import { SECTIONS } from "@/components/shell/sections";

/** Why the last sign-in didn't work. */
export type SignInError = "denied" | "cancelled" | "failed";

const ERRORS: readonly SignInError[] = ["denied", "cancelled", "failed"];

/** The `error` in the page's address, if it is one of ours: anything else is ignored rather than shown. */
export function signInError(value: string | null | undefined): SignInError | null {
  return value && ERRORS.includes(value as SignInError) ? (value as SignInError) : null;
}

/** A line of the notice: plain text, or bold. Never HTML, so the page escapes everything it shows. */
export type NoticePart = string | { strong: string };

export interface Notice {
  /** `err` is announced at once (role alert); the others politely (role status). */
  tone: "err" | "warn" | "info" | "ok";
  parts: NoticePart[];
  detail?: string;
}

export interface SignInView {
  notice: Notice | null;
  /** The button's words. */
  button: string;
  /** The button is off: only when the server can't sign anyone in. */
  disabled: boolean;
  /** Google usually refuses sign-in here, so the page offers Copy link and still lets him try. */
  inApp: boolean;
}

export interface SignInInput {
  /** Where he was going (already checked by `safeNextPath`). */
  next: string;
  error: SignInError | null;
  /** Arrived from Sign out. */
  signedOut: boolean;
  /** The proxy sent him here because the cookie he had was no good any more. */
  sessionEnded: boolean;
  /** False when the host has no Google client, allowed address or secret set. */
  configured: boolean;
  /** Opened from Instagram, Facebook or another embedded browser. */
  inApp: boolean;
  /** Name the missing settings: only when running locally, since a stranger shouldn't learn how the host is set up. */
  showSettingNames: boolean;
}

/** The page he was going to, by its name, taken from our own list of pages (never from the address itself, so a link can't put words on the page). */
export function pageLabel(next: string): string | null {
  const first = `/${next.split(/[?#]/)[0].split("/")[1] ?? ""}`;
  return SECTIONS.find((s) => s.href === first && s.href !== "/")?.label ?? null;
}

/** Whether the browser is one Google refuses to sign in from: an app's built-in web view. */
export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  if (/FBAN|FBAV|FB_IAB|Instagram|\bLine\/|LinkedInApp|Snapchat|TikTok|musical_ly|MicroMessenger|; wv\)/i.test(userAgent)) return true;
  // An iPhone's own browsers (Safari, Chrome, Firefox) all say "Safari"; a web view built into an app doesn't.
  return /\b(iPhone|iPad|iPod)\b/.test(userAgent) && /AppleWebKit/.test(userAgent) && !/Safari\//.test(userAgent);
}

/** What the sign-in page says and does for this visit. The first state that applies wins. */
export function signInView(input: SignInInput): SignInView {
  const base = { disabled: false, inApp: false, button: "Continue with Google" };
  if (!input.configured) {
    const settings = "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAIL and SESSION_SECRET.";
    return { ...base, disabled: true, notice: { tone: "err", parts: ["Sign-in isn't set up on this server yet."], detail: input.showSettingNames ? settings : undefined } };
  }
  if (input.inApp) {
    // The button stays usable: this is a guess from the user agent, and being wrong must never lock him out. At worst Google says no and he comes back.
    return { ...base, button: "Try anyway", inApp: true, notice: { tone: "warn", parts: ["Google usually doesn't allow sign-in inside this app's browser."], detail: "Open this page in Safari or Chrome instead." } };
  }
  switch (input.error) {
    case "denied":
      return { ...base, button: "Choose another account", notice: { tone: "err", parts: ["That Google account isn't allowed here."] } };
    case "cancelled":
      return { ...base, button: "Try again", notice: { tone: "info", parts: ["Sign-in was cancelled."], detail: "Nothing was changed." } };
    case "failed":
      return {
        ...base,
        button: "Try again",
        notice: { tone: "err", parts: ["Sign-in didn't work. Try again."], detail: "If it keeps happening, check that cookies are on for this site and that only one sign-in tab is open." },
      };
  }
  if (input.signedOut) {
    return { ...base, button: "Sign in again", notice: { tone: "ok", parts: ["You're signed out on this device."], detail: "Other devices stay signed in." } };
  }
  const label = pageLabel(input.next);
  const carryOn: NoticePart[] = label ? [" to ", { strong: label }, "."] : ["."];
  if (input.sessionEnded) return { ...base, notice: { tone: "info", parts: ["Your session ended. Sign in to carry on", ...carryOn] } };
  if (label) return { ...base, notice: { tone: "info", parts: ["Sign in to carry on", ...carryOn] } };
  return { ...base, notice: null };
}
