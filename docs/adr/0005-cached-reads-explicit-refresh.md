# 0005. Cache reads, and refresh explicitly with `updateTag`

- **Status:** Accepted
- **Date:** August 2026 (recorded 2026-10-16)

## Context
Sheets API calls are slow and rate-limited, so reading live on every page load is wasteful. On the other hand, data must be fresh right after the user saves something or presses Refresh. The Sheets client doesn't go through `fetch`, so Next's automatic fetch caching doesn't apply. In this Next.js version, `revalidateTag` only offers stale-while-revalidate.

## Decision
- `lib/sheets/cached.ts` wraps each repository's `list()` in `unstable_cache`, with one tag per entity and a 15-minute revalidate as a safety net.
- Writes from Server Actions and the Refresh button call `updateTag`, which waits for fresh data, then `router.refresh()`.
- Route Handlers can't call `updateTag`, so they use `revalidateTag(tag, "max")`, through the `createCrudRoutes` factory.

## Consequences
- Fast page loads, and you always see your own writes immediately.
- Edits made directly in the Sheet show up after Refresh, or within 15 minutes.
- Writes made through `/api/*` routes, such as the Gmail import, are eventually consistent rather than immediate.

## Alternatives considered
- **Always reading live:** slow, and risks hitting the rate limit.
- **Hand-rolling a separate cache-invalidation layer:** unnecessary, because the framework already provides one.
