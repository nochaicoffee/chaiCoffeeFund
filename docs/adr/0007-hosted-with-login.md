# 0007. Host the app with a login so it works on a phone

- **Status:** Proposed. The requirement is decided; the platform and login method aren't.
- **Date:** 2026-10-16

## Context
On 2026-10-16, Prathik confirmed the app has to work on his phone as well as his laptop. Today it only runs as `npm run dev` on the laptop, with no login. That's acceptable only because nothing is reachable from outside the machine. Once it's on the internet, anyone with the URL could see the full financial picture and change the data.

Running only locally also limits the Gmail import (ADR 0006): a scheduled sync only runs while the laptop's dev server is up.

## Decision (requirement only, so far)
- The app will be hosted somewhere reachable from a phone.
- Every page and every API route requires a login. There's a single allowed user, and no public sign-up.
- Secrets (the Sheets service account, Gmail OAuth credentials) move to the host's secret store and are never committed.
- Scheduled jobs, such as the statement sync, run on the host's scheduler instead of launchd.

## Still to decide, in the tech design
- **Platform:** for example, Vercel (fits Next.js, and its cron could run the sync), a self-hosted box on Tailscale (private network, so no public URL), or another option.
- **Login method:** for example, Google sign-in restricted to one email, a passkey, or putting the app behind Tailscale or Cloudflare Access.
- Whether the Sheets service account key can live in a hosted secret store, or should be replaced with something like workload identity federation.

## Consequences
- The tech design needs a security section (auth, session handling, how API routes are protected) before any deploy.
- Every page has to work well at phone width, which affects how the mockups (designed at 1600–1700px wide) are turned into real pages.
- Hosting may have a cost, depending on the platform.
