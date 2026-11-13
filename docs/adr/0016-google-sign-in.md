# 0016. Sign in with Google, for one allowed address, instead of a passphrase

- **Status:** Accepted. Prathik chose Google sign-in over a passkey and over the passphrase on 2026-11-13. It replaces the login method in [ADR 0015](0015-login-and-mcp-endpoint.md); the rest of 0015 (the proxy, fail-closed production, the MCP endpoint and its bearer token) stands.
- **Date:** 2026-11-13

## Context
ADR 0015 shipped a shared passphrase as a default, said so, and listed its weaknesses: one secret for every device, no lockout (a Vercel function has nowhere to count attempts), and a long sentence to type on every new phone or laptop. He was offered the three options and picked Google: no password to remember, Google's own 2-step verification and "sign out of this device", and one tap on his own devices.

## Decision
- **One button on `/login`, then the OAuth authorization-code flow with PKCE.** `GET /login/google` makes a state, a nonce and a PKCE verifier, keeps them in a signed `chai_oauth` cookie (HTTP-only, `Secure`, `SameSite=Lax`, path `/login/google`, ten minutes) and redirects to Google asking only for `openid email`. `GET /login/google/callback` accepts the sign-in only when all of this holds, in this order: the cookie is ours and unexpired; the `state` in the address equals the cookie's; Google's token endpoint accepts the code (with the client secret and the verifier); the ID token's issuer is Google, its audience is this app's client ID, it hasn't expired, its nonce is the cookie's, its email is **verified** and equals `ALLOWED_EMAIL` (compared in lower case). Any other Google account gets "That Google account isn't allowed here" and no session.
- **The session is unchanged.** The same stateless `chai_session` cookie (30 days, HMAC over the expiry) and the same proxy and gate; only how a person earns the cookie changed. Its key is now `SESSION_SECRET` plus the allowed address, so changing either signs every device out. `POST /logout` clears one device and now has a Sign out button in the sidebar (desktop rail, phone menu), shown only when the app is behind a login.
- **The ID token's signature isn't checked, by design.** The token comes from Google's token endpoint over TLS in answer to this server's own request, which OpenID Connect Core allows to stand in for the signature check. That's why there's no JWT library and no Google key fetching. If a token were ever taken from the browser, this would have to change.
- **No new dependency.** Everything is `fetch` and Web Crypto. The pure parts (`lib/auth/google.ts`, `oauthState.ts`, `signing.ts`) are tested without Google; the routes are tested with the token endpoint stubbed.
- **Environment variables.** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL` (one address, not a list) and `SESSION_SECRET`. `APP_PASSWORD` is gone. A production build with any of them missing serves 503, as before. Locally the gate stays off until `ALLOWED_EMAIL` is set.
- **The passphrase is removed, not kept as a second way in.** A fallback is only ever as strong as its weakest door.

## Consequences
- **One-time setup by Prathik in Google Cloud** (the project that holds the Sheets service account will do): Credentials → Create credentials → OAuth client ID → Web application; authorized redirect URIs `https://<the app's domain>/login/google/callback` and, for trying it on the laptop, `http://localhost:3000/login/google/callback`. The consent screen needs only the `openid` and `email` scopes (no Google review). In "Testing" status only listed test users can sign in, which is fine here since he is the only user and no refresh tokens are kept; add his address as a test user.
- **Vercel preview deployments don't sign in**, because each has its own hostname and Google only redirects to registered URIs. The production domain does. A preview that needs login would have its URL registered by hand.
- **`ALLOWED_EMAIL` must be the address exactly as Google reports it for the account** (compared case-insensitively, nothing more). Gmail ignores dots and `+tags` when delivering, but Google's token carries the account's own spelling, and an address written differently is refused as "isn't allowed here". If it ever happens, the fix is the setting, not the code.
- **One sign-in at a time per browser.** The state cookie is a single cookie, so starting a second sign-in in another tab replaces the first's state; the first then ends on "Sign-in didn't work" and the next attempt works.
- **Redirect URI comes from the request's own origin**, so it must match what's registered exactly (scheme and host). A custom domain added later needs its callback registered too.
- The sign-in can't be completed without Google, so the end-to-end flow with real Google has to be tried once by him after the client is set up. Everything up to Google's page, and everything from the token reply on, is tested.
- A Google account with the same address that's recovered or recycled could sign in. That's acceptable for a personal Gmail with 2-step verification; pinning Google's stable `sub` instead of the address is the stricter option if it ever matters.
- Signing out everywhere still means changing `SESSION_SECRET` or `ALLOWED_EMAIL`; Google can also revoke the app's access, but a session already issued stays valid until it runs out (30 days) or the secret changes.

## Alternatives considered
- **A passkey (WebAuthn).** The strongest and phishing-proof, but the app has no database, so the registered public key would have to live in the Sheet or in an environment variable after a one-off registration step. More to build and to lose than Google sign-in, for one user.
- **Keep the passphrase.** Works, but no lockout and one shared secret: the weakest of the three.
- **Auth.js / NextAuth.** Would do this in a few lines, but it's a dependency whose routes, session format and upgrade path would sit under every request to the app, replacing about 200 lines whose every branch is tested here. Revisit if more providers or users are wanted.
- **Verifying the ID token's signature with Google's published keys.** Unnecessary for a token received straight from the token endpoint; adds key fetching, caching and rotation to maintain.
- **A list of allowed addresses.** One person uses the app. A second user would be a bigger change (whose Sheet, whose data), not a longer list.
