# 0006. Import credit card statements from Gmail

- **Status:** Accepted
- **Date:** 2026-09-09 (recorded 2026-10-16)

## Context
Credit card statements arrive by email as password-protected PDFs. Typing each statement's dates and amounts in by hand is the most frequent manual chore in the app. An earlier personal tool (`cc_processor` and Apps Script) already parsed eight banks' formats, but it matched statements to cards by first match, so it could silently pick the wrong card.

## Decision
- Pull statement emails carrying a dedicated Gmail label, through the Gmail API with an OAuth client and refresh token for the user's own mailbox.
- Decrypt each PDF by trying the candidate passwords, detect the bank, and parse it with one of the eight ported bank parsers.
- Match the statement to a `Card` by name, alias and `emailMatchKeywords`. If more than one card matches, report the ambiguity instead of guessing.
- Write a `Statement` row, and record processed message IDs so nothing is imported twice.
- Run it with a "Sync statements" button that calls `POST /api/statements/sync`, and later on a schedule that calls the same route.

## Consequences
- This is a second credential with real reach, read access to the mailbox, and it must stay local-only.
- `statementPdfPassword` is currently planned as a column in the `Cards` Sheet tab, which keeps a password in plaintext. Whether that's acceptable is an open question, and it should be decided before go-live.
- A standalone script can't import modules marked `server-only`, so scheduled runs have to call the HTTP route. That means a server must be running. ADR 0007 (hosting) changes how scheduling works.
- Status: built and unit-tested (113 tests), but never run against real email. Gmail OAuth isn't set up yet.

## Alternatives considered
- **Manual entry only:** that's the chore this exists to remove.
- **Reusing the old Apps Script:** it breaks ADR 0002, and it matched cards ambiguously.

## Updates
- **2026-10-17:** the open point on PDF passwords is resolved (PRD Q3). `statementPdfPassword` stays a column in the `Cards` Sheet tab. The Sheet is private to Prathik and the service account, and this keeps adding passwords inside the app. Current cards are with HDFC, ICICI, Axis, YES and CSB/Jupiter (Q5).
