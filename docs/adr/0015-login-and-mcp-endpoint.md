# 0015. A passphrase login for the pages, and a bearer-token MCP endpoint for Claude

- **Status:** Accepted, except the login method: the passphrase described below was replaced by Google sign-in the same day ([ADR 0016](0016-google-sign-in.md)). The proxy, fail-closed production, the session cookie and the MCP endpoint stand as written.
- **Date:** 2026-11-13

## Context
[ADR 0007](0007-hosted-with-login.md) requires a login on every page and API route before the app is hosted, and left the login method open. The app had no auth at all: on a public URL, anyone could read every balance and write to the Sheet.

Prathik also wants to tell Claude what to add ("log this subscription payment") and have it land in the Sheet once the app is on Vercel. Claude reaches an app through a remote MCP server added as a custom connector. A connector can't fill in a login page. Claude's connector dialog does take fixed request headers, so it can send a bearer token. Claude Code and the desktop app can do the same.

## Decision
> **Superseded in part by [ADR 0016](0016-google-sign-in.md):** the first bullet below (a passphrase, `APP_PASSWORD`, the one-second pause) describes the login this ADR first shipped. It is now Google sign-in, with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `ALLOWED_EMAIL` in place of `APP_PASSWORD`. Everything else here still holds.

- **Pages and API routes: a passphrase, then a signed cookie.** `src/proxy.ts` runs before every route. A request without a valid `chai_session` cookie goes to `/login` (pages) or gets a 401 (API routes). `/login` checks the passphrase against `APP_PASSWORD` and sets an HMAC-signed, HTTP-only, `SameSite=Lax`, `Secure` cookie that lasts 30 days. Nothing is stored server-side; the cookie says "signed in until T" and is signed with `SESSION_SECRET` and `APP_PASSWORD` together, so changing either signs every device out. `POST /logout` clears this device's cookie (there is no button for it yet). A wrong passphrase waits a second before answering.
- **Fails closed.** A production build requires the login whether or not it's configured; with `APP_PASSWORD` or `SESSION_SECRET` missing (or shorter than 16 and 32 characters) it serves a 503 instead of the app. Local `next dev` stays open until `APP_PASSWORD` is set, so working on the app is unchanged.
- **Claude: `/api/mcp`, with a bearer token only.** The proxy and the route both require `Authorization: Bearer <MCP_ACCESS_TOKEN>` (32 characters or more). A session cookie doesn't open it, and the token doesn't open anything else. With no token set the endpoint is off in every environment, local included.
- **Four generic tools, not one per record.** `list_entities` (the names, or with an `entity` that type's fields as JSON Schema from the same zod schema the routes use; the long answer is only sent when asked for), `list_records` (with a field filter and a limit), `add_record` and `update_record`. A tool call runs the app's own API route handler in-process, so validation, cross-row guards, cache invalidation and the removal of secrets from responses are the routes' own, with no second set of rules to keep in step. The pages' Server Actions sometimes do more than the routes (the Accounts page replaces a balance saved twice for the same day); when a rule matters to a route's callers it goes in the route as a guard, as `balanceSnapshotGuards` now does (one balance per account and day, refusing a second and naming the row to update).
- **No delete.** Claude adds and corrects; a row is removed in the app. A wrong add is fixed by `update_record` or removed by hand.
- **Secrets are off limits.** The statement PDF password and a whole policy number aren't in the fields `list_entities` shows, and a call that sets one is refused: through chat they would sit in a conversation's history. (The routes already never return the password and cut the policy number to its last four.) `SECRET_FIELDS` in `lib/mcp/tools.ts` is the list.
- **One write at a time.** The instructions tell Claude to wait for each write to answer: two appends to one tab at once can race (CLAUDE.md), and the endpoint can't serialise requests that run in separate functions.
- **Stateless.** The server is built per request (Streamable HTTP, plain JSON replies), because a Vercel function keeps no session between calls.
- **Which records:** every `/api/<entity>` route that takes hand-written data. The sync-only tabs (`account-statements`, balance reviews, sync logs), `prices/refresh` and the dev routes are not exposed. A test fails when a new `/api/<entity>` route is in neither list.

## Consequences
- The whole app, not only MCP, is private on Vercel once `APP_PASSWORD`, `SESSION_SECRET` and `MCP_ACCESS_TOKEN` are set in its environment settings (secrets, never in the repo).
- A new entity with an API route needs one line in `lib/mcp/entities.ts` (its list and item modules and its two schemas) to be reachable by Claude. Skipping it fails `entities.test.ts`.
- A single shared passphrase has no lockout and no per-device sessions. The one-second pause only slows one client: parallel guesses aren't limited, so the passphrase has a 16-character minimum and should be a long sentence. Signing out everywhere means changing the passphrase or `SESSION_SECRET`. A passkey or Google sign-in would be better and can replace `/login` without touching the proxy's rules (`lib/auth/gate.ts`).
- The token gives write access to the whole Sheet through the validated routes. If it leaks, change `MCP_ACCESS_TOKEN` in Vercel and in the connector; nothing else uses it.
- The Vercel Cron call to `/api/statements/sync` (ADR 0007) is still unsolved: the proxy refuses it without a cookie. It needs its own secret on those two routes (`CRON_SECRET`), left for the hosting task.

## Alternatives considered
- **OAuth for the connector.** The proper answer for a shared or multi-user server, but it means building an authorization server (registration, authorize, token, PKCE) for one person who can already paste a header. Revisit if a client turns up that can't send a header.
- **A secret in the MCP URL.** Works in a connector with no header, but a URL ends up in logs and screenshots.
- **One tool per record type and action** (about 75 tools). Claude's tool list would be larger than the data it describes; four tools with the schema on request keep it small.
- **Calling the repositories directly from the tools.** Fewer layers, but each entity's guards and serializers (loans' schedule, goals, policy terms, the password strip) would have to be copied, and would drift.
- **Putting the site behind Vercel's own protection (a password at the edge).** Simple, but it would block the MCP endpoint and Vercel Cron too, and the login method is the app's to choose.
