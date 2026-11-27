import { NextResponse } from "next/server";
import { loginConfigured, sessionKey } from "@/lib/auth/config";
import { readCookie } from "@/lib/auth/cookies";
import { isLook, LOOK_COOKIE } from "@/lib/look/look";
import { safeNextPath } from "@/lib/auth/gate";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { loginPage } from "./loginPage";
import { isInAppBrowser, signInError } from "./loginView";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * The sign-in page: one button to Google (/login/google). A route handler rather than a page,
 * so it stands alone without the app's sidebar around it. Nothing is posted here; the
 * sign-in itself happens in /login/google and /login/google/callback.
 *
 * Someone already signed in is sent straight on (a bookmark, or Back after signing in) instead
 * of being shown a sign-in. `next` has been through `safeNextPath`, so it is never /login.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const configured = loginConfigured(process.env);
  const next = safeNextPath(params.get("next"));

  const key = configured ? sessionKey(process.env) : undefined;
  if (key && (await verifySessionToken(readCookie(request.headers.get("cookie"), SESSION_COOKIE), key))) {
    return NextResponse.redirect(new URL(next, request.url), { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  const html = loginPage({
    next,
    error: signInError(params.get("error")),
    signedOut: params.get("signedout") === "1",
    sessionEnded: params.get("session") === "ended",
    configured,
    inApp: isInAppBrowser(request.headers.get("user-agent")),
    // Locally the missing settings are named, as before; on the host a stranger isn't told how it is set up.
    showSettingNames: process.env.NODE_ENV !== "production",
    // The look the browser last saw (ADR 0018's cookie mirror): signed out, the Sheet can't be read.
    look: ((value) => (isLook(value) ? value : undefined))(readCookie(request.headers.get("cookie"), LOOK_COOKIE)),
  });
  return new NextResponse(html, { status: configured ? 200 : 503, headers: HTML_HEADERS });
}
