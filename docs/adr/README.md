# Architecture Decision Records

An ADR records one decision that's expensive to reverse: what we chose, why, and what it costs. Each one is short, and once a decision is accepted its ADR isn't rewritten. When an open point it lists gets resolved, append a dated line under `## Updates`. If the decision itself changes, write a new ADR that supersedes the old one, and set the old one's status to `Superseded by NNNN`.

Write an ADR when a choice affects the data model, storage, hosting, security, money math, or an external integration. Routine implementation choices go in [system-design.md](../system-design.md) instead.

ADRs 0001–0006 were backfilled on 2026-10-16 from decisions made between 2026-08-24 and 2026-09-09. The original reasoning is in [system-design.md](../system-design.md).

| # | Decision | Status |
|---|---|---|
| [0001](0001-google-sheets-as-data-store.md) | Use Google Sheets as the data store, accessed with a service account | Accepted |
| [0002](0002-no-formulas-in-sheet.md) | Keep the Sheet formula-free and compute every derived value in code | Accepted |
| [0003](0003-inr-base-currency-frozen-fx.md) | Use INR as the base currency and freeze each trade's FX rate | Accepted |
| [0004](0004-reducing-balance-emi-schedule.md) | Use reducing-balance EMI with an auto-generated installment schedule | Accepted |
| [0005](0005-cached-reads-explicit-refresh.md) | Cache reads, and refresh explicitly with `updateTag` | Accepted |
| [0006](0006-gmail-statement-import.md) | Import credit card statements from Gmail | Accepted |
| [0007](0007-hosted-with-login.md) | Host the app with a login so it works on a phone | Proposed (login method: see 0015) |
| [0008](0008-bank-account-statements-from-gmail.md) | Update bank account balances from emailed statements | Accepted |
| [0009](0009-income-from-bank-statements.md) | Record income from the bank statements the sync already reads | Accepted |
| [0010](0010-insurance-terms-with-years.md) | Record insurance as a policy plus a payment for each term, with the years a premium buys | Accepted |
| [0011](0011-epf-contributions-and-passbook-import.md) | Record EPF as contributions plus yearly interest, and import the passbook PDF | Accepted |
| [0012](0012-foreign-currency-balances.md) | Keep a balance in its account's own currency, and count it in rupees at today's rate | Accepted |
| [0013](0013-price-sources-and-history.md) | Prices come from Yahoo, AMFI and Frankfurter, saved once a day | Accepted |
| [0014](0014-lent-out-payouts-are-income.md) | A lent loan's payouts arrive as Income, and the loan keeps its income source's id | Accepted |
| [0015](0015-login-and-mcp-endpoint.md) | A login for the pages (passphrase, since replaced), and a bearer-token MCP endpoint for Claude | Accepted |
| [0016](0016-google-sign-in.md) | Sign in with Google, for one allowed address, instead of a passphrase | Accepted |

## Template

```markdown
# NNNN. Title in the imperative

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD

## Context
The forces at play: the requirement, constraints, and what goes wrong without a decision.

## Decision
What we're doing, in one or two sentences, then any detail.

## Consequences
What gets easier, what gets harder, and what we're now committed to.

## Alternatives considered
Each option we rejected, and why.
```
