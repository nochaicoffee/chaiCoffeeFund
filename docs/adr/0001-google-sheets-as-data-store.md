# 0001. Use Google Sheets as the data store, accessed with a service account

- **Status:** Accepted
- **Date:** August 2026 (re-confirmed 2026-08-31; recorded 2026-10-16)

## Context
The finances already lived in a Google Sheet, and that sheet was failing in specific ways: Apps Script overwrote cells, rollup formulas broke, and nothing gave a single view of net worth. The app has one user and low write volume. Being able to open the raw data from a phone with no admin UI is useful as a fallback.

## Decision
Keep a Google Sheet ("Finance Tracker") as the storage layer: one native Sheets Table per entity, keyed by a short UUID `id`. The Next.js server reaches it through `googleapis` with a **service account**, not OAuth. The key is local-only and gitignored.

## Consequences
- Zero hosting or database cost, and the data stays viewable and editable in Sheets as a fallback.
- No transactions, so multi-row writes need manual rollback. For example, `createLoanWithSchedule` deletes the loan if its schedule fails to write.
- Reads must request `UNFORMATTED_VALUE`, because by default the API returns display-formatted strings.
- Concurrent deletes against one tab race on row indexes, so deletes have to run one at a time.
- No indexes or queries: every read loads the whole tab, which is fine at this volume.
- The app must not depend on Sheets-specific behaviour beyond the repository layer, so that moving to a real database later only means replacing `lib/sheets/`.

## Alternatives considered
- **Postgres or SQLite:** better integrity and querying, but it means hosting and running a database, and you lose direct editing in Sheets. Worth revisiting only if the app gets multiple users or heavy reporting.
- **OAuth as the user:** refresh tokens expire and it needs a consent flow. A service account is simpler for a single user.
