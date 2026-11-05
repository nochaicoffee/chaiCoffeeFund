# 0012. Keep a balance in its account's own currency, and count it in rupees at today's rate

- **Status:** Accepted
- **Date:** 2026-11-05 (Prathik accepted PRD Q13 and Q14 on 2026-11-05)

## Context
Cash lies uninvested in brokerage accounts: dollars at the US broker, rupees at the Indian one (his example: $3,000 and ₹1 lakh). Accounts have no currency, so a dollar balance has nowhere to live. Everything that adds balances up (the Accounts page, net worth, Goals, the attention items) assumes rupees.

ADR 0003 settled the other half: a trade's cost is frozen at the rate on its day. Cash has no cost basis, so there is nothing to freeze.

## Decision
- An `Account` has an optional **`currency`** (`INR` or `USD`, `INR` when blank, so every existing row reads as before) and its `accountType` gains **`Brokerage`**.
- A `BalanceSnapshot` is **in its account's own currency**. A dollar balance is typed, stored and shown in dollars.
- A dollar balance is **counted in rupees at today's rate**, never a frozen one. A past balance is re-valued at today's rate too, so a history carries no rate, and the change between two balances is the dollar change times today's rate: a rate move alone is not a deposit and is not called gain.
- **Conversion happens at one boundary.** A pure function `inRupees(accounts, snapshots, usdInr)` in `lib/aggregate/accountCurrency.ts` runs right after the Sheet is read and returns snapshots whose `balance` is rupees, with the account's own figure kept as `native`. Everything downstream keeps assuming rupees. Only the places that show dollars read `native`.
- **Today's rate** comes from `lib/prices/usdInr.ts` (Frankfurter's latest rate, PRD Q2), read through the same cache as the Sheet tabs with an explicit refresh (ADR 0005).
- **When the rate can't be fetched** (PRD Q14), a dollar account is **left out of the totals and the page says so in amber**, with its dollars still shown. It is never counted as ₹0, and never at a rate the app invented or kept quietly.
- A broker's cash is **counted once**, as an account in net worth. The Investments page shows it beside the holdings and keeps it **out of** their worth, the split and the XIRR (PRD Q13).

## Consequences
- No aggregate needs to learn about currencies, so the change is one new function and its call sites (the Accounts, Goals and Overview loaders), not a dozen edits.
- A new Sheet column and a new dropdown value. The Sheet's dropdown must have `Brokerage` before the app writes it (a Sheets Table validates against the literal text), so the Sheet change comes first.
- Today's rate becomes a runtime dependency of three pages. A dollar account is the only thing that needs it, so with only rupee accounts nothing is fetched and nothing can fail.
- A rate fetched live and used for the whole history means last year's dollar balance is shown at this year's rate. That is the honest reading of "what is it worth now", and not a record of what it was worth then.
- Only USD is supported. A third currency needs a rate source and a column value, not a redesign.
- Interest the cash earns (F-IN-03) and reading a broker's balance from its statement are separate pieces of work, not covered here.

## Alternatives considered
- **Store every balance in rupees**, converting when it is typed: a frozen rate on a balance that isn't a purchase, and the dollar figure the broker actually shows would be lost.
- **Teach each aggregate about currencies:** a dozen files and a standing risk of counting a dollar account twice or at the wrong rate.
- **A separate tab for broker cash:** a second balance log with its own history, stale rule and forms, for what an account already is.
- **Fall back to the last rate when the fetch fails:** it would show a number that looks current and isn't. A visible gap is better than a quiet wrong figure.
