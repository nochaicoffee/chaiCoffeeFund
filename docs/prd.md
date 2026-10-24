# chaiCoffeeFund: Product Requirements

- **Status:** Approved v1.4 (v1.0 plus M1 clarifications). Scope changes go into v2.
- **Owner:** Prathik
- **Last updated:** 2026-10-19
- **Related:** [system-design.md](system-design.md) (how it works) · [adr/](adr/) (why) · [process.md](process.md) (how we build) · [`design/dashboards/`](../design/dashboards/) (what it looks like)

## 1. Summary

chaiCoffeeFund is a personal finance dashboard for one person. It gives one trustworthy view of bank balances, credit cards, subscriptions, income, bank loans, fixed income and investments, on a laptop or a phone. Google Sheets stays the storage layer, but the app is the only place you add or change data, and every total is computed by tested code instead of spreadsheet formulas.

## 2. Problem

The finances live in a Google Sheet that has stopped being trustworthy:
- Apps Script overwrites cells, and rollup formulas are broken or half-finished.
- Values that should be derived are stored as raw data, so they drift. Examples: opening and closing balances, duplicate payment columns, positions maintained by formulas.
- There's no single net-worth view, and no view of total monthly obligations.
- Loan schedules were never filled in, because typing a 36-row amortisation table by hand doesn't happen.
- Credit card statements arrive as password-protected PDFs by email, and get re-typed by hand every month.
- Nothing works well on a phone.

## 3. Goals and non-goals

**Goals**
1. **One trustworthy picture:** net worth, what's owed and what's due, in one place.
2. **No more Sheet editing:** everything can be added and changed in the app, both master data (a new card or loan) and log entries (a payment or a statement).
3. **Less typing:** automate the most repetitive entry, starting with card statements from Gmail.
4. **Numbers you can trust:** every derived number comes from a tested pure function, and all money math is proven by tests.
5. **Anywhere:** the full app works on a phone as well as on a laptop.

**Non-goals for v1** (see also [§10](#10-out-of-scope-for-v1))
- Tracking individual purchases, spending categories or budgets. Decided 2026-10-16: statement totals only.
- Push or email reminders. Decided 2026-10-16: in-app reminders only for v1.
- More than one user, or sharing.

## 4. User and context

- **User:** Prathik, the only user. INR is the base currency. He holds several bank accounts and credit cards, has bank loans (borrowed only; he doesn't lend), Indian and US equities including NetApp RSU and ESPP shares, fixed deposits, and EPF/PPF-style holdings.
- **Devices:** a laptop and a phone, with the **full app on both** (decided 2026-10-16). Every screen and form has to work at phone width, not just a read-only subset.
- **Typical rhythm:**
  - A monthly check-in: what's due, what was spent, net worth.
  - Logging events as they happen: a statement arrives, an EMI is paid, a salary lands, a trade happens.

## 5. Success metrics

| Metric | Target |
|---|---|
| Times you need to open the Sheet to add or fix data | 0 per month after v1 |
| Card statements typed in by hand | 0 once the Gmail import is live, for every bank it supports |
| Time for a monthly check-in (what's due, owed and net worth), on laptop or phone | Under 5 minutes |
| Known wrong numbers on screen | 0. Each one found becomes a test. |

## 6. Product principles

1. **The app is the front door.** If something can be added, it can be added in the app.
2. **Derive, don't store.** If a value can be computed from raw rows, it's computed in code and never stored ([ADR 0002](adr/0002-no-formulas-in-sheet.md)).
3. **Prove the money math.** Interest, FX, amortisation and cost basis need a confirmed formula and a test, never a guess.
4. **Private by default.** One user, a login on everything, secrets never committed, and no third-party analytics.
5. **One design language.** Every dashboard follows the same template and works in light and dark mode at any width.

## 7. Feature list

**Priority:**
- **P0:** required for v1.0
- **P1:** should be in v1.0
- **P2:** later

**Status:**
- **Live:** built and verified against the real Sheet
- **Built:** code exists, not fully verified or not styled yet
- **Designed:** a mockup exists, no page yet
- **Not started**

### Platform (`F-PL`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-PL-01 | Login: a single allowed user, protecting every page and API route | P0 | Not started ([ADR 0007](adr/0007-hosted-with-login.md)) |
| F-PL-02 | Hosted and reachable from a phone | P0 | Not started (ADR 0007) |
| F-PL-03 | Responsive: every screen and form fully usable at phone width | P0 | Not started. Mockups are desktop-only (1600–1700px). |
| F-PL-04 | Light and dark mode | P0 | Designed |
| F-PL-05 | App shell: collapsible sidebar and nav across all sections | P0 | Built (basic nav, not collapsible), and designed |
| F-PL-06 | Refresh button and last-updated time | P0 | Live |
| F-PL-07 | Edit and delete existing rows from the UI | P1 | Not started. The repositories support it, but there's no UI yet. |
| F-PL-08 | Push or email reminders | P2 | Not started. In-app only for v1. |

### Overview (`F-OV`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-OV-01 | Net worth now: bank + investments + fixed income − loans − card balances | P0 | Live. Investments are at cost basis until F-IV-03 lands. |
| F-OV-02 | Monthly obligations: subscriptions, this month's EMIs and upcoming card bills | P0 | Live |
| F-OV-03 | What needs attention: upcoming due dates, pending statements, pending income | P0 | Live |
| F-OV-04 | Bank-balance trend chart | P0 | Live |
| F-OV-05 | Overview in the new design language | P0 | Not designed (no mockup yet) |
| F-OV-06 | Net worth over time | P2 | Not started. It needs past loan, card and investment state reconstructed. |

### Cards (`F-CC`): first milestone

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-CC-01 | Card list with utilization, and an add card form | P0 | Built (plain UI) |
| F-CC-02 | Statements: add one, mark it paid (from which account), see over- or under-payment | P0 | Built (plain UI) |
| F-CC-03 | Import statements from Gmail, on demand ("Sync statements") | P0 | Built. Never run against real email. |
| F-CC-04 | Import statements on a schedule | P1 | Built for launchd on the laptop. Needs the host's scheduler (ADR 0007). |
| F-CC-05 | Cards dashboard matching the mockup | P0 | Designed. Waiting on the J–O pick (Q6). |
| F-CC-06 | Upcoming statement and due-date alerts per card | P0 | Built (computed). Not on the dashboard yet. |

### Accounts (`F-AC`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-AC-01 | Accounts list grouped by purpose, and an add account form | P0 | Built (#160–#165, #171) |
| F-AC-02 | Log a balance snapshot, and see each account's trend and month-over-month change | P0 | Built (#160–#165, #171); the Flow map and an Undo after saving are left out |

### Subscriptions (`F-SU`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-SU-01 | Subscriptions list: add, pause, next billing date | P0 | Designed (computation built) |
| F-SU-02 | Payment log (paid from an account or a card), monthly-equivalent total, spend by category | P0 | Designed (computation built) |

### Income (`F-IN`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-IN-01 | Income sources, and an add source form | P0 | Designed (final 2026-10-24, #184) |
| F-IN-02 | Income entries, expected vs. received, with pending income called out and a monthly equivalent | P0 | Designed (final 2026-10-24, #184; computation partly built) |

### Loans (`F-LO`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-LO-01 | Add a loan, which auto-generates its reducing-balance EMI schedule | P0 | Designed (API and schedule built, [ADR 0004](adr/0004-reducing-balance-emi-schedule.md)) |
| F-LO-02 | Mark an installment paid (from an account or a card), and see outstanding balance and next due | P0 | Designed (computation built) |
| F-LO-03 | Prepayments, rate changes, other repayment structures | P2 | Not designed |

### Fixed Income (`F-FI`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-FI-01 | Fixed deposits: add one, see estimated current value, maturity date and amount | P0 | Designed (repository and computation built) |
| F-FI-02 | EPF, PPF, NSC and RD (recurring-contribution holdings) | P1 | Designed loosely. The data model is open (Q1). |

### Investments (`F-IV`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-IV-01 | Log a buy or sell: IND or US, Market/RSU/ESPP source, FX rate frozen at the trade date | P0 | Designed (repository built, [ADR 0003](adr/0003-inr-base-currency-frozen-fx.md)) |
| F-IV-02 | Holdings grouped by category (Indian Equity, US Stocks, RSUs, Debt Fund), with cost basis | P0 | Designed (computation built) |
| F-IV-03 | Live prices and today's FX rate, for market value and gain or loss | P0 | Not started. The source is open (Q2). |

## 8. Requirements for the first milestone (M1: Cards end-to-end)

Following standard practice, acceptance criteria are written in full only for the next milestone. Every other area gets its criteria when its epic is planned.

### F-CC-01 and F-CC-02: Cards and statements
*As Prathik, I want to add my cards and their statements in the app, so that I never type them into the Sheet.*
- [ ] I can add a card with these fields, and it appears straight away with no manual refresh (fields decided 2026-10-19, #75):
  - a name, alias, issuer and card type (Reward Points or Cashback);
  - a colour and the credit limit, plus the last 4 digits if known. Otherwise the statement import fills them in (#78);
  - the statement day of the month, and how many days after it the bill is due;
  - optionally, the statement PDF password, email keywords and the account it's usually paid from.
  - Each statement's own due date comes from its PDF. The card's schedule only predicts the next statement and prefills a new one.
- [ ] I can add a statement to a card with a statement date, due date, total due and minimum due.
- [ ] I can mark a statement paid with an amount, a date and the account it was paid from. The card's outstanding balance and utilization update.
- [ ] A part payment can leave the bill Pending until I pay the rest, and a paid bill's payment can be edited, for example to record a second payment (#84).
- [ ] Paying more or less than the total due shows as overpaid or underpaid by the exact difference.
- [ ] Every new row lands inside the Sheet's Table with its dropdowns intact. This is verified with a real round trip.

### F-CC-03: Import statements from Gmail
*As Prathik, I want statements pulled from my email automatically, so that I stop re-typing PDFs.*
- [ ] Clicking "Sync statements" processes every labelled, not-yet-imported statement email and reports how many were imported, skipped or failed, and why.
- [ ] For each bank with a current card (HDFC, ICICI, Axis, YES and CSB/Jupiter; Q5), a real statement imports with the statement date, due date, total due and minimum due all matching the PDF exactly.
- [ ] Running sync twice never creates a duplicate statement.
- [ ] A statement that matches no card or more than one card is **not written**. It's listed so I can fix the card's keywords.
- [ ] A PDF that no stored password opens is reported, not silently skipped.
- [ ] The import reads the masked card number from each PDF. It fills in a card's missing last 4, and won't import a statement whose card number doesn't match the card it was matched to (#78).
- [ ] Gmail access is read-only, and no credential is ever committed. Statement PDF passwords live in the Cards Sheet tab (Q3).

### F-CC-05 and F-CC-06: Cards dashboard
*As Prathik, I want the Cards page to show my card spending at a glance, so that a monthly check-in takes minutes.*

**How the numbers are defined** (decided 2026-10-17):
- **A month's spend** is the sum of `totalAmountDue` across statements whose **statement date** falls in that month.
- **The monthly average** is the period's total spend ÷ **every month so far in the period**:
  - This year: January to the current month.
  - A past year: 12 months.
  - All time: the month of the first statement to the current month.
  - The last 3, 6 or 12 months, or a custom range: every month of the range up to the current month, **including months with no statements**, the same rule as the years (confirmed by Prathik 2026-10-20, #113).
- **The period** can be this year, a past year, all time, the last 3, 6 or 12 months (the current month included), or a custom range of whole months. A range counts statements by statement date, like the years (decided 2026-10-20, #113).
- **Highest and lowest month** only look at months that have statements.
- **A credit balance** (a negative total due) counts as ₹0 spend. The credit already lowers the next statement's total.
- **Outstanding** is what's still due on pending bills: total minus anything paid, never below ₹0. It includes closed cards, because their unpaid bills are still owed. That also applies to net worth.
- **Utilization** is outstanding ÷ credit limit, using **active cards only**: their unpaid bills ÷ their limits.
- **The pending line** counts **all** pending statements, plus the next due date. Its total always equals outstanding.
- **Statements whose card no longer exists** are left out of every total.
- On the Statements page (decided 2026-10-17 with #50):
  - **Due now** is the pending line: every pending bill's remaining amount, whatever period is shown.
  - **Minimum due** is each pending bill's minimum due less anything already paid on it, never below ₹0. A payment counts towards the minimum first.
  - **Paid** is the amount paid on the period's statements marked Paid. **Paid in full** counts those where the amount paid is at least the total due.
  - **Variance** is amount paid − total due, to the paisa: paid in full at ₹0, otherwise overpaid or underpaid by that difference.

**Criteria:**
- [ ] Layout matches the final mockup, [`CardsListLight.dc.html`](../design/dashboards/CardsListLight.dc.html), in light mode, and in dark once a dark palette is picked.
- [ ] A greeting summary at the top shows: total spent in the selected period, the monthly average, the highest month with its amount (and the year, if the period spans years), and the pending line.
- [ ] Card tiles: an "All Cards" tile that combines every card, one tile per card in its own colour with issuer and last 4 digits, and an add card tile. The selected tile is clearly marked.
- [ ] A spending heatmap by month for the selected period, one row per year, from statement totals.
- [ ] A details card coloured to match the selected tile: outstanding, utilization against the limit, available credit, highest and lowest month, total spent, and a Next-due bar split by pending bill.
- [ ] Beside it, a panel with the 5 most recent statements (linking to the full Statements page), and a Spend range view showing where the current month sits against highest, lowest and average.
- [ ] A statement trend chart (By card / Total, bars and/or line) over the selected period. It follows the page's period and has no ranges of its own (decided 2026-10-20, #113).
- [ ] A full **Statements page** ([`StatementsList.dc.html`](../design/dashboards/StatementsList.dc.html)) lists every statement grouped by month, with status and card filters, payment details and variance, and Mark paid on pending rows. Statement history lives here, not on the dashboard.
- [ ] The next expected statement date and due date are shown per card, and show up in the Overview's "needs attention" list.
- [ ] Everything works at phone width (F-PL-03). Phone layouts and the forms, sync report and empty states are designed in code in the same design language (decided 2026-10-17).
- [ ] With zero cards or zero statements, the page shows a clear empty state with the add actions.

### F-AC-01 and F-AC-02: Accounts, how the numbers are defined

Confirmed by Prathik on 2026-10-22 (he accepted the defaults the mockups show for decisions 1–12 and 19 in [`design/accounts.md`](design/accounts.md)); each is a tested pure function in `lib/aggregate/accounts.ts` and `accountFlows.ts`.

- A **total on a date** counts each account at its latest balance on or before that date, and nothing before its first. Two balances for one account on one day: the later row wins. A step on one account moves the total by exactly that step.
- **Stale:** an active account whose latest balance is more than 30 days old. It still counts in the total.
- **Closing** an account adds a ₹0 balance on the day and sets it Inactive (shown as Closed). Its history stays.
- **Money out** of an account is worked out from card bills paid from it, subscriptions charged to it (not to a card), EMIs paid from it and shares bought from it. **Everything else** is the balance change those don't explain (UPI, cash, transfers between own accounts), shown as worked out, never as a statement.
- **Saved = came in − expenses**, where expenses are card bills, subscriptions and EMIs. Money invested counts as saved; "kept in the bank" is saved minus invested. Sale proceeds move a balance but are not "came in".
- **A balance saved on a day that already has one replaces it.** A balance more than 20% below the last one asks you to check it, and never blocks the save.
- **An opening balance isn't a change** (confirmed 2026-10-22): an account first read inside a period counts from its first balance in "since" figures, and the Bridge shows what it arrived with as its own "Accounts opened" step, so it still ends on what's held. All the change figures run to the period's end; a period longer than 24 months is cut to its last 24 for the charts and everything beside them.
- **Closing** takes a day not in the future and not before the account's latest balance. A balance can't be moved onto a day that already has one.
- **Colour** is an optional per-account choice of the six card colours, falling back to the purpose's; **last 4** is optional text.

### F-IN-01 and F-IN-02: Income, how the numbers are defined

Confirmed by Prathik on 2026-10-24 (he accepted the defaults the mockups show for decisions 1–8 in [`design/income.md`](design/income.md), except 7, which he changed); each becomes a tested pure function in `lib/aggregate/`.

- **RSU vests and ESPP purchases are not income.** They land shares, not cash, and ESPP is already taken out of the salary credit, so they live in Investments (`InvestmentTransactions` with source RSU or ESPP). Selling those shares isn't income either. Dividends on them are.
- **A month's income** is what was received in it, by the date it landed. Pending and expected payments are shown, never counted.
- **A usual month** is the sum of each active source's amount over the months in its cycle; one-time sources have none. The page's figures lead with it. The greeting's "about … a month" is received ÷ the months so far.
- **Late** is received more than 3 days after it was expected, for every source. **Pending** is a payment whose expected date has passed (from the day after) and that hasn't been received, for every source. **Upcoming** comes from each active source's schedule at its usual amount.
- **Pending and upcoming payments are computed, never stored.** An `IncomeEntries` row is written only when money is received.
- **How far back pending goes** (confirmed 2026-10-24, #186): every scheduled date after the source's latest received regular payment, up to yesterday. A source with nothing received yet counts from its schedule date. Older gaps are history and never show as pending.
- **What receives a scheduled payment** (confirmed 2026-10-24, #186): an entry for that source tagged Regular for that payment. A Bonus or Other entry never fills in a missing regular payment. The entry receives the scheduled date nearest its expected date, within half a cycle, so a salary recorded as expected Sep 30 receives the Oct 1 one (found in review, #194).
- **A source's schedule date is entered as its next expected date** ("Next expected" on the form, #190), not the day it first paid, so a new source doesn't arrive with years of pending payments.
- **Tags:** Regular is anything on a schedule; Bonus is variable pay on top (an entry on the Salary source); Other is a one-off.
- **Against last year** compares Jan 1 to today in both years. **The financial year** (Apr–Mar) projection is received + pending + each active source's schedule to Mar 31 at its usual amount, with no bonus assumed.
- **A pay change** is a payment 2% or more off the one before it from the same source and tag.
- Loan disbursements and repayments, transfers between your own accounts, and sale proceeds are never income.
- **The NetApp salary is read from the HDFC account statements** (#187): a deposit whose narration matches the source's statement text becomes a received entry, once. Everything else is recorded in the app.
- Sources get an optional colour, icon and the account they usually land in.

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Login on every page and API route. Secrets only in local env files or the host's secret store, never in the repo. Gmail scope is read-only. |
| Privacy | No third-party analytics or trackers. Financial data lives only in the Sheet and the app's host. |
| Correctness | Every money computation has a test. INR is formatted with Indian digit grouping (₹2,10,000). |
| Reliability | Imports are idempotent. A partial multi-row write rolls back (as loan creation already does). |
| Performance | Pages served from cache load in under 2 seconds on a phone over mobile data (proposed target). |
| Accessibility | Text contrast meets WCAG AA in both themes. Touch targets are at least 44px on phone. |
| Browsers | Latest Chrome on desktop and latest Safari on iOS. |

## 10. Out of scope for v1

- Individual transactions, spending categories, budgets (decided 2026-10-16)
- Push or email reminders (decided 2026-10-16)
- Lending money to others
- Tax reporting, tax lots, vesting schedules
- Multiple users or sharing
- Automatic bank sync through an aggregator
- Net worth history (F-OV-06 is P2)

## 11. Proposed release plan

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M0 · Foundation** (in progress) | Baseline committed, docs, CI, tracker and board set up | CI green on `main`. PRD v1.0 approved. |
| **M1 · Cards end-to-end** | F-CC-01–03, 05, 06. F-PL-04 and F-PL-05 (theme and shell, since this is the first designed page). F-PL-03 for Cards. | Every §8 acceptance criterion passes against real data. |
| **M2 · Hosted and secure** | F-PL-01, F-PL-02, F-CC-04 (scheduled import on the host) | The app is usable from a phone behind a login. Sync runs unattended. |
| **M3 · Everyday money** | Accounts, Subscriptions, Income, Loans (P0 features) | No Sheet editing needed for these four areas. |
| **M4 · Wealth** | Fixed Income, Investments, live prices (F-IV-03) | Net worth uses market value, not cost basis. |
| **M5 · v1.0** | Overview redesign (F-OV-05), edit and delete (F-PL-07), polish | Every P0 and P1 item is done, and the §5 metrics are met for a month. |

## 12. Open questions

| # | Question | Blocks, or the answer |
|---|---|---|
| Q1 | Fixed Income: how should recurring-contribution holdings (EPF, PPF, RD) be modelled, given that an FD is a single lump sum? | F-FI-02 |
| Q2 | Where do live prices and FX rates come from: a `GOOGLEFINANCE` Prices tab or a market-data API? And does Indian ticker coverage hold up? | F-IV-01 (FX at entry), F-IV-03 |
| Q3 | Where do statement PDF passwords live? | **Answered 2026-10-17:** in the Cards Sheet tab (`statementPdfPassword`), as built. The Sheet is private to Prathik and the service account, and this keeps adding passwords inside the app. |
| Q4 | Hosting platform and login method (ADR 0007) | F-PL-01, F-PL-02, F-CC-04 |
| Q5 | Which banks are your current cards with? | **Answered 2026-10-17:** HDFC, ICICI, Axis, YES and CSB/Jupiter. All five have parsers. |
| Q6 | Cards design: which merged-widget option (J–O)? | **Answered 2026-10-17:** none. A new final design replaced them (see §8). |
| Q7 | Phone layouts: per epic, or a mobile design pass up front? | **Answered 2026-10-17:** per epic. M1 sets the shared phone patterns. |
| Q8 | Overview design: needs a mockup in the new design language | F-OV-05 |

Each open question is also a GitHub issue labelled `question`, in the milestone it blocks. When one is answered, record the answer here (and in an ADR, if it's a hard-to-reverse decision), then close its issue.

## 13. Document history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-16 | First draft, consolidating the system design, the mockups, the as-built code, and these decisions from 2026-10-16: the Standard process, GitHub Issues + Projects, laptop and phone with the full app on both, statement totals only, in-app reminders only, and Cards first. |
| 1.0 | 2026-10-16 | Approved by Prathik as written, including the priorities, success metrics, out-of-scope list and release plan. Further changes go into v2. |
| 1.1 | 2026-10-17 | Clarifications for M1, no scope change. Answers to Q3, Q5, Q6 and Q7. §8 updated to the final Cards design (a separate Statements page, and `last4` and colour on cards). Card-spend definitions added (statement-date month, average over every month so far, all pending bills). Undesigned pieces get designed in code. |
| 1.2 | 2026-10-17 | More card-spend rules confirmed while building the math (#44): highest and lowest month use months with statements; a credit balance counts as ₹0; outstanding includes closed cards (in net worth too) and always equals the pending total; utilization uses active cards only; statements on deleted cards are left out. |
| 1.3 | 2026-10-19 | Card setup matches the old sheet (#75): a card type (Reward Points or Cashback), and the schedule as a statement day plus a due-day buffer instead of two full dates. Also adds issuer and colour dropdowns and an optional default payment account. |
| 1.4 | 2026-10-19 | A card's last 4 is optional when it's added. The import fills it in from the statement PDF, then uses it to check each statement belongs to its card (#78). |
| 1.5 | 2026-10-20 | The period can also be the last 3, 6 or 12 months or a custom range of months, by statement date, and a range's average divides by every month of it so far (#113). The trend chart follows the period instead of having its own 3M to All ranges. |
| 1.6 | 2026-10-22 | Accounts numbers defined (carry-forward totals, stale after 30 days, closing, money out and Everything else, saved, same-day replace, 20% drop warning), per the Accounts design (#155). |
| 1.7 | 2026-10-22 | Accounts page built end to end (F-AC-01 and F-AC-02), to the design in #155. The Flow map and an Undo toast after saving a balance are not built. |
| 1.9 | 2026-10-24 | Income numbers defined (§8 F-IN-01/02): RSU and ESPP are not income, a month counts what landed, late after 3 days, pending computed not stored, the salary read from HDFC statements. Income design final: Z1 with the E1 Ledger and E3 Passbook (#184). |
| 1.10 | 2026-10-24 | Income: pending counts every missed date after the latest received regular payment; only a Regular entry receives a scheduled payment (#186). Overview's pending income is computed from the schedules, a line per source. |
| 1.11 | 2026-10-24 | The Income page (#188): the greeting whose figures point, the attention strip, and the Year in columns cover with a year pill and a source pick; a picked source's columns are drawn on their own scale. |
