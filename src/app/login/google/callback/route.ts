import { NextResponse, type NextRequest } from "next/server";
import { allowedEmail, sessionKey } from "@/lib/auth/config";
import { CALLBACK_PATH, checkIdToken, decodeIdToken, exchangeCode } from "@/lib/auth/google";
import { OAUTH_COOKIE, OAUTH_COOKIE_PATH, openOAuthState } from "@/lib/auth/oauthState";
import { safeEqual } from "@/lib/auth/safeEqual";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

/**
 * Step two of signing in: Google sends him back here with a one-time code. It counts only if it
 * answers the sign-in this browser started (the state in the cookie), trades for an ID token
 * from Google, and the token says the one allowed address, verified, signed in to this app just
 * now. Then, and only then, the session cookie is set. Every failure goes back to /login with a
 * short reason and says nothing about why (which address was expected, what Google replied).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const key = sessionKey(process.env);
  if (!key) return NextResponse.redirect(new URL("/login", url), 303);

  const finish = (response: NextResponse) => {
    // A sign-in's secrets are used once, whatever the outcome.
    response.cookies.set({ name: OAUTH_COOKIE, value: "", path: OAUTH_COOKIE_PATH, maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  const back = (error: string, next?: string) => {
    const login = new URL("/login", url);
    login.searchParams.set("error", error);
    if (next && next !== "/") login.searchParams.set("next", next);
    return finish(NextResponse.redirect(login, 303));
  };

  const sealed = await openOAuthState(key, request.cookies.get(OAUTH_COOKIE)?.value);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!sealed || !returnedState || !(await safeEqual(returnedState, sealed.state))) return back("failed");
  // He pressed Cancel on Google's page, or Google refused: the state matched, so this really is our sign-in.
  if (url.searchParams.get("error")) return back("cancelled", sealed.next);
  if (!code) return back("failed", sealed.next);

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const idToken = await exchangeCode({
    code,
    verifier: sealed.verifier,
    clientId,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
    redirectUri: new URL(CALLBACK_PATH, url.origin).toString(),
  });
  if (!idToken) return back("failed", sealed.next);

  const verdict = checkIdToken(decodeIdToken(idToken), { clientId, nonce: sealed.nonce, allowedEmail: allowedEmail(process.env) });
  if (!verdict.ok) return back(verdict.reason, sealed.next);

  const response = finish(NextResponse.redirect(new URL(sealed.next, url), 303));
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(key),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
