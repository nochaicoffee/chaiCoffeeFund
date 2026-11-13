import { NextResponse } from "next/server";
import { sessionKey } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/gate";
import { authorizationUrl, CALLBACK_PATH, pkceChallenge } from "@/lib/auth/google";
import { OAUTH_COOKIE, OAUTH_COOKIE_PATH, OAUTH_MAX_AGE_SECONDS, sealOAuthState } from "@/lib/auth/oauthState";
import { randomToken } from "@/lib/auth/signing";

/**
 * Step one of signing in: make this sign-in's one-time secrets, keep them in a signed cookie
 * for the trip, and send him to Google to pick an account. Step two is ./callback.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // No key means the login isn't configured (it needs the client, the address and the secret); the page says so.
  const key = sessionKey(process.env);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!key || !clientId) return NextResponse.redirect(new URL("/login", url), 303);

  const verifier = randomToken();
  const state = { state: randomToken(), nonce: randomToken(), verifier, next: safeNextPath(url.searchParams.get("next")) };
  const response = NextResponse.redirect(
    authorizationUrl({
      clientId,
      redirectUri: new URL(CALLBACK_PATH, url.origin).toString(),
      state: state.state,
      nonce: state.nonce,
      challenge: await pkceChallenge(verifier),
    }),
    303,
  );
  response.cookies.set({
    name: OAUTH_COOKIE,
    value: await sealOAuthState(key, state),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not Strict: Google's redirect back is a navigation from another site, and Strict would drop the cookie from it.
    sameSite: "lax",
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
