# 0002. Keep the Sheet formula-free and compute every derived value in code

- **Status:** Accepted
- **Date:** August 2026 (recorded 2026-10-16)

## Context
The old sheet's worst bugs came from logic living in the Sheet. Apps Script triggers overwrote cells, cross-tab formulas silently broke or were left half-finished, and derived values were stored as if they were raw data, then drifted. Examples: opening and closing balances stored separately, a "Partial Payment" column that duplicated `amountPaid`, and a positions tab maintained by formulas.

## Decision
The Sheet holds only raw rows. Every derived value is a pure TypeScript function in `lib/aggregate/` or `lib/schedule/`, with unit tests against fixture data. This includes single-row values like the next billing date. No Apps Script. The one exception is the planned `Prices` support tab of `GOOGLEFINANCE` lookups, which the app only reads.

## Consequences
- Derived numbers can't drift, because they're recomputed from raw rows on every read.
- Money math is unit-testable without Sheets or the network.
- Viewing the raw Sheet directly shows no totals or rollups. You have to use the app for those.
- Future automation can only ever append rows to log tabs, never overwrite cells.

## Alternatives considered
- **Keeping simple, single-row formulas in the Sheet:** rejected for consistency. It gave two answers to the same problem, a formula for subscriptions' next billing date and code for cards' next statement date.
