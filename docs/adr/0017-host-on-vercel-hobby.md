# 0017. Host on Vercel's free Hobby plan, with a daily cron for the statement syncs

- **Status:** Accepted. Prathik asked to start deploying on Vercel on 2026-11-17, after confirming it is free for personal use. Settles the platform question in [ADR 0007](0007-hosted-with-login.md).
- **Date:** 2026-11-17

## Context
ADR 0007 required hosting reachable from a phone, with secrets in the host's store and scheduled jobs on the host's scheduler. The login ([ADR 0016](0016-google-sign-in.md)) and the MCP endpoint ([ADR 0015](0015-login-and-mcp-endpoint.md)) were built first. Two things still assumed the laptop: the Sheets service account key was read from a file path, and the statement sync was a launchd script calling a running dev server, which the login would now refuse. Vercel's Hobby plan is $0 and for personal, non-commercial use, which fits one person's money tracker; Vercel may change or drop it, and the terms are the limit on what counts as personal.

## Decision
- **Vercel Hobby**, deploying `main` from GitHub, with no build settings beyond the defaults (`next build`, Turbopack; verified to build and to include the PDF reader's worker file in the traced functions).
- **The Sheets key comes from a setting.** `GOOGLE_SERVICE_ACCOUNT_KEY` holds the key's JSON (or base64 of it); `lib/sheets/credentials.ts` reads it, and falls back to `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` on the laptop. A bad paste is refused with an error that never quotes the value. Gmail's credentials were already settings.
- **One cron route, `/api/cron/sync`.** `vercel.json` has a daily Vercel Cron call (01:30 UTC, about 7:00 in India; I understand Hobby allows a cron once a day and may run it any time in that hour, which is worth confirming in Vercel's docs when setting it up). Cron makes a GET with `Authorization: Bearer $CRON_SECRET`; the proxy and the route both check it, and it opens nothing else (and neither the session cookie nor the MCP token opens it). The route calls the two sync routes' own handlers in-process, as the scheduled script called them over HTTP, so SyncRuns, the duplicate checks and the cache invalidation are the ones the "Sync statements" buttons use. It runs rounds of each until nothing is left (a round reads what fits in 45 seconds, #82), starts no round after 200 seconds, and the function may run 300 seconds. The answer is counts only; a failed sync makes it a 500, which shows in Vercel's cron log; one failing doesn't stop the other.
- **Daily, not every five days.** The launchd job ran every five days. A day is the finest Hobby allows and the syncs skip what's done, so the extra runs cost a Gmail read each. The launchd job and `scripts/ingestStatements.ts` stay for running a sync from the laptop; the launchd job should be switched off once the cron has run.
- **Function region is a project setting, not in the repo.** Mumbai (`bom1`) puts the app next to him; the default is the US east coast. Set it in Vercel under Settings, Functions, Function Region (whichever regions the plan offers).
- **Not scheduled yet:** the price refresh stays a button and a script (`scripts/refreshPrices.ts`). It can become a second cron later.

## Consequences
- Production needs these settings, none in the repo: `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, the five Gmail settings, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL`, `SESSION_SECRET`, `MCP_ACCESS_TOKEN` and `CRON_SECRET`. Without `CRON_SECRET` the cron route answers 503 (the app itself is unaffected).
- **Fluid Compute must stay on** (it is the default for new Vercel projects). The cron route asks for `maxDuration = 300`; I understand Hobby caps functions at 60 seconds without it, in which case the deploy would be refused, and the route's rounds and limits would have to shrink to fit 60 seconds.
- A Hobby function that goes over a limit is cut off rather than billed, so a slow day shows as a failed cron run, and the next day's run picks up what's left.
- The Gmail refresh token must stay valid: if the Gmail OAuth consent screen is in "Testing" status, Google expires the token after seven days, and the cron would fail from then on with a Google error. He needs to check that screen's status (Publishing status) before relying on the cron.
- Preview deployments get no sign-in (their addresses aren't registered with Google) and share the same Sheet, so only the production deployment should be used.
- If Vercel drops the free tier, the app is a plain Next.js app that runs anywhere with Node and the same settings; only `vercel.json` is Vercel's.

## Alternatives considered
- **Vercel Pro ($20/month).** Allows frequent crons and longer functions; nothing here needs them yet.
- **A small always-on server (or the laptop on Tailscale).** Keeps launchd and the dev-server arrangement, but costs money or depends on the laptop being on, and doesn't reach his phone as simply.
- **One cron per sync.** Two schedules whose runs may land anywhere in the same hour could overlap; one route running both in order can't, and the SyncRuns "already running" check stays a backstop only.
- **Calling the repositories directly from the cron route.** Fewer layers, but the revalidation and error handling the sync routes already have would be copied and drift.
