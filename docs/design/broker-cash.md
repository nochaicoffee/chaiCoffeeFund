# Broker cash: build plan

**Status: planned 2026-11-04; Q13 and Q14 accepted and ADR 0012 written 2026-11-05. Epic A is built and merged (A2 to A7, PRs #281 to #287) and so is B1, the broker-cash maths (PR #288). B2 (the card and the greeting figure) was built 2026-11-07. B3, *Paid from*, was built 2026-11-08 on the Add a trade form ([`investments-build.md`](investments-build.md)); that finishes the plan.** The design is drawn and settled (Investments: [`investments.md`](investments.md) "Cash at your brokers"; Accounts: [`accounts.md`](accounts.md) "Broker cash accounts"; mockups `design/investments/` and `design/accounts/`). This is the Plan stage of [`process.md`](../process.md): what to build, in what order, and what needs his yes first. PRD: F-AC-05 (widened), F-IV-18, Q13.

His example: $3,000 in the US stock account and ₹1 lakh in the Indian brokerage account. After this work both are accounts, counted once in net worth, and shown beside the holdings on Investments.

## What has to be true when it's done

1. A **Brokerage** account can be added, with a **currency** (INR or USD), and its balance is entered in that currency.
2. A dollar balance is **counted in rupees at today's rate**, everywhere a total is made: the Accounts page, the Overview's net worth, Goals, the attention items. It is counted **once**.
3. The Accounts page shows the dollars (hero card, Balance history, the check-in) with the rupee value beside them. The rate's move is never shown as a deposit or a gain.
4. The Investments page shows **Cash at your brokers**: a greeting figure and a card with the idle share. Cash is **outside** the holdings' worth, the split and the XIRR.
5. A trade's *Paid from* can name a cash account; the form shows the cash after, and a buy larger than the cash is a warning, never a block.

## Decisions to settle first (Definition of Ready)

| # | Decision | Recommendation | Status |
|---|---|---|---|
| Q13 | The rules: cash is an account, counted once in net worth, outside the Investments worth, the split and the XIRR; a buy over the cash only warns | As drawn | **Accepted 2026-11-05** |
| Q14 | **Where does today's USD/INR come from, and what happens when it can't be fetched?** `lib/prices/usdInr.ts` now exists (merged 2026-11-05). | Frankfurter's latest rate, behind `lib/prices/usdInr.ts`, read through the same cache as the Sheet tabs with an explicit refresh (ADR 0005). **When it can't be fetched, a dollar account is left out of the total and the page says so in amber, with its dollars still shown.** Never counted as ₹0 and never at an invented or stale rate without saying so. | **Accepted 2026-11-05** |
| Q15 | The Sheet change: `Brokerage` added to the Accounts `accountType` dropdown, and a new `currency` column (`INR` default, `USD`) | A Sheets Table validates writes against its dropdown text, so **he sets the dropdown** (or says go and I add it through the Sheets API in the app's own code); the column is added by the existing `/api/dev/sheet-columns` route | Needs his go, at the time of A2 |
| ADR 0012 | **Foreign-currency balances**: a snapshot is in its account's own currency; a dollar balance is valued at today's rate with no frozen rate; conversion happens at **one boundary** (below). Hard to reverse once real data is in the Sheet, so it gets an ADR, like ADR 0003 did for trades. | Write it in A1 | **Written 2026-11-05** ([ADR 0012](../adr/0012-foreign-currency-balances.md)) |

## The one decision that shapes the code: a single conversion boundary

Everything that sums balances (`balancesOn`, `totalOn`, `balanceTrend`, `sharesOfTotal`, `computeAccountBalances`, `totalAccountBalance` in `lib/aggregate/accounts.ts`, `netWorth.ts`, `accountFlows.ts`, `accountHistory.ts`, `accountCheckIns.ts`, the Goals and Overview loaders) assumes a balance is rupees. Teaching each of them about currencies would touch a dozen files and invite the double count this plan exists to avoid.

**So: convert once, at the edge.** A new pure function `inRupees(accounts, snapshots, usdInr)` in `lib/aggregate/accountCurrency.ts` returns the snapshots with `balance` in rupees and the account's own figure kept as `native`. Every loader calls it right after reading the Sheet, and everything downstream is unchanged. (This is exactly how the mockup generator does it: its snapshots carry `balance` in rupees and `native` in dollars, and no other board needed to change.) Only the places that **show** a dollar figure read `native`.

- A past balance is re-valued at **today's** rate, so a history never carries a rate (ADR 0003's frozen rate is for trades' cost basis, which cash doesn't have).
- A change between two balances is the dollar change times today's rate: a rate move alone changes nothing between two rows.
- An account with no usable rate (Q14) is returned **unconverted and flagged**, and the totals leave it out.

## Epic A: F-AC-05 Foreign-currency and broker-cash accounts (`area:accounts`, P1)

Acceptance criteria are the five points above (1 to 3 for this epic).

| # | Task | Files (main) | Tests and proof | Depends on |
|---|---|---|---|---|
| **A1** | **Docs:** answer Q13 and Q14 in the PRD, write ADR 0012, set F-AC-05 to Designed. **Done and merged 2026-11-05 (#273).** | `docs/prd.md`, `docs/adr/0012-foreign-currency-balances.md`, `docs/adr/README.md` | none (docs) | his yes on Q13, Q14 (given) |
| **A2** | **The Sheet shape:** `Account.currency` (`INR` default, `USD`, optional so old rows read as INR) and `AccountType` gains `Brokerage`; zod schemas, `ACCOUNT_COLUMNS` (append `currency`), `checkSheet` expectations, the demo accounts. | `src/lib/sheets/types.ts`, `accounts.ts`, `checkSheet.ts`, `entities.test.ts`, `src/lib/demo/accountsDemo.ts` | schema tests (a USD account, a row with no currency reads INR, Brokerage accepted); **real round trip** against the actual Sheet (create a Brokerage USD account, read it, update, delete, confirm clean); `npm run check-sheet` | Q15 |
| **A3** | **Today's USD/INR:** `lib/prices/usdInr.ts`: a pure `parseUsdInr(json)` and a fetch of Frankfurter's latest, cached and refreshable like the Sheet tabs; a typed result (`{ ok, rate, asOf }` or `{ ok: false }`). | `src/lib/prices/usdInr.ts`, `src/lib/sheets/cached.ts` (tag) or a sibling cache helper | parser tests (a good body, a missing rate, a zero, a string); the fetch is mocked; one live call by hand | none (parallel to A2) |
| **A4** | **`inRupees`:** the conversion, as a pure function. | `src/lib/aggregate/accountCurrency.ts` (+ test) | **Proves the math:** a USD balance × rate is exact; an INR balance is untouched; a step of $100 moves the total by exactly 100 × rate; two balances' change is the dollar change × rate (a rate move alone is 0); a past balance uses today's rate; no rate leaves the account flagged and out of the total; the `balancesOn` carry-forward still holds | A2 types |
| **A5** | **Wire it:** call `inRupees` in `loadAccountsData`, `loadGoalsData` and the Overview page; `netWorth` counts a dollar account once; the Gmail statement import skips Brokerage accounts (they have no statements); the "rate unavailable" notice. | `src/app/accounts/loadAccountsData.ts`, `src/app/goals/loadGoalsData.ts`, `src/app/page.tsx`, `src/lib/aggregate/netWorth.ts`, `src/lib/accountStatementIngestion/planStatements.ts` | netWorth test (a dollar account counts once, at the rate); ingestion test (a Brokerage account is never matched); a loader test with the rate down | A3, A4 |
| **A6** | **Accounts forms:** Add and Edit account get the Brokerage type and a Currency field; Update balance, the check-in and Edit balance take dollars (a `$` prefix, "≈ ₹…" in the preview); the 20% drop check compares in the account's own currency; **Add a broker's cash** as drawn. | `src/components/accounts/forms/*`, `src/app/accounts/actions.ts`, `src/lib/forms/*` | action tests (a USD balance saved in dollars, the drop check in dollars, INR default); browser check, light and dark, desktop and phone | A5 |
| **A7** | **Accounts display:** the hero card's dollar line, Balance history rows in dollars with "≈ ₹" under, state 8 (a dollar account), the mix, the phone; the views carry `native`. | `src/app/accounts/views.ts`, `detailView.ts`, `src/components/accounts/AccountsHero.tsx`, `HistoryCard.tsx`, `WalletCards.tsx` | view tests (`native` present for USD only, the figure stays rupees); browser check against real data and the empty state | A5 (parallel to A6) |

A6 and A7 each touch separate files and can be built in either order once A5 is merged.

## Epic B: F-IV-18 Cash at your brokers (`area:investments`, P1)

Acceptance criteria are points 4 and 5. **Blocked on the Investments page itself.** `src/app/investments/page.tsx` is still a placeholder, and the page needs F-IV-03 (live prices, for the holdings' worth the idle share is measured against), the price-history spike and the add-trade form. Those have **no epic yet**: the Investments Plan stage is still to do (the next step in [`investments.md`](investments.md)). So B1 can start early; B2 and B3 are tasks to add to the Investments epic when it is planned.

| # | Task | Files (main) | Tests and proof | Depends on |
|---|---|---|---|---|
| **B1** | **Broker-cash maths:** `brokerCash.ts`: cash in rupees by broker, the idle share (cash over holdings plus cash), and a trade's effect on a cash balance (a buy takes its `total` in the account's currency, a sell adds it; short of cash returns a warning, not an error). | `src/lib/aggregate/brokerCash.ts` (+ test) | **Proves the math:** the idle share of ₹3,70,450 against ₹55,47,897 is 6.26%; a buy of $2,525.60 from $3,000 leaves $474.40; a buy of $3,157 leaves −$157 with the warning; INR cash takes `total` as is; no cash gives 0%, not NaN | A4 |
| **B2** | **The card and the greeting figure:** Cash at your brokers (summary tile, an account tile each), the pointing figure in the greeting, the phone card, state G (a balance over 30 days old). | `src/app/investments/greetingView.ts`, `src/components/investments/CashCard.tsx`, the greeting wrapper over `PointingSentence` | view test against the sentence (as `greetingView.test.ts` does for Cards); browser check | Investments page shell, B1, A5 |
| **B3** | **Paid from:** the add-trade form lists cash accounts first and shows "cash after"; a buy larger than the cash warns and still saves (state H); a sell's proceeds land in the same account; `settlementAccountId` carries it. | the add-trade form, `src/lib/sheets/investmentTransactions.ts` (no new column: `settlementAccountId` exists) | action test (warns, saves); `accountFlows` still reads it as a flow out | the add-trade form (F-IV-11), B1 |

## Order

```
A1 (docs, his yes) ──► A2 ──► A4 ──► A5 ──► A6
                  └──► A3 ───────────┘  └──► A7        B1 (after A4)
                                                          B2, B3 (after the Investments page)
```

Seven PRs for Epic A, one more (B1) that can follow A4, and two that wait for Investments. Each PR: one issue, `Closes #n`, CI green, `/code-review` run and its findings fixed or dismissed before the merge, squash and merge, per [`process.md`](../process.md). Any change to `lib/sheets/` (A2) needs the real round trip first, done sequentially.

## Things to watch

- **The double count.** Net worth counts bank balances and also investments. A broker's cash must be in one of them only: it is in the bank-balances term (an account), and the Investments worth stays holdings-only. A5's netWorth test pins this.
- **Trade settlement is not a balance.** A trade paid from a cash account is a flow on `accountFlows` (Money out → Investments), but the balance itself is still read from a statement or typed in: nothing computes it from trades.
- **A change to the loaders is a change to three pages.** A5 touches Accounts, Goals and the Overview; check all three in the browser, not only Accounts.
- **The Sheet's dropdown.** Writing `Brokerage` before the dropdown has it fails validation. A2 must say so in its PR and be tested after he has set it.
- **His real data.** His real Accounts tab has no currency column; every existing row must read as INR. A2's tests and the real round trip prove it, and the `check-sheet` run must stay green for the other tabs.
- **No dollar history before the first dollar balance.** A dollar account's history starts at its first balance, as any account's does; the earlier months are not back-filled.

## What is not in this plan

Interest on idle cash (F-IN-03), importing a broker's statement to read its cash (the Gmail import covers HDFC, Slice and Jupiter only), a Cash slice in the split widget (cash sits beside it, by design), other currencies than USD, and the XIRR including cash.
