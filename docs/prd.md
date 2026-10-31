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

- **User:** Prathik, the only user. INR is the base currency. He holds several bank accounts and credit cards, has bank loans (borrowed from banks), and money he has lent to friends (lent-out, F-LE), Indian and US equities including NetApp RSU and ESPP shares, fixed deposits, and EPF/PPF-style holdings.
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
| F-OV-01 | Net worth now: bank + investments + fixed income − loans − card balances | P0 | Live. Investments are at cost basis until F-IV-03 lands. Fixed income now includes EPF at the passbook figure (credits plus the interest EPFO has credited, both shares, never the estimate), added 2026-11-05. |
| F-OV-02 | Monthly obligations: subscriptions, this month's EMIs and upcoming card bills | P0 | Live |
| F-OV-03 | What needs attention: upcoming due dates, pending statements, pending income | P0 | Live. A late EPF credit and a deposit that has matured and isn't closed join it (2026-11-05). |
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
| F-AC-03 | Update balances from emailed bank statements (HDFC, Slice, Jupiter), on demand ("Sync statements" on the Accounts page) | P0 | Built, run against real email 2026-10-23 (ADR 0008) |
| F-AC-04 | A balance a statement disagrees with is flagged "needs attention" until answered | P0 | Built (ADR 0008) |

### Subscriptions (`F-SU`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-SU-01 | Subscriptions list: add, pause, next billing date | P0 | Designed (computation built) |
| F-SU-02 | Payment log (paid from an account or a card), monthly-equivalent total, spend by category | P0 | Designed (computation built) |

### Income (`F-IN`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-IN-01 | Income sources, and an add source form | P0 | Built (2026-10-25, #184–#191) |
| F-IN-02 | Income entries, expected vs. received, with pending income called out and a monthly equivalent | P0 | Built (2026-10-25, #184–#191); the salary from statements awaits its first real run (#187) |

### Lent out (`F-LE`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-LE-01 | Money lent to people: Accruing (simple interest) and Paid-out loans, repayments, and a "Lent out" line in net worth | P1 | Data layer, maths and net worth built (2026-11-06, #305) |
| F-LE-02 | A Lent page: entry forms and a per-loan view | P1 | To design |
| F-LE-03 | Income sources for the Paid-out loans' interest, matched to bank statements | P1 | To do |

### Loans (`F-LO`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-LO-01 | Add a loan, which auto-generates its reducing-balance EMI schedule | P0 | Built 2026-10-26: the Loans page and its Add loan form ([ADR 0004](adr/0004-reducing-balance-emi-schedule.md), `docs/design/loans.md`) |
| F-LO-02 | Mark an installment paid (from an account or a card), and see outstanding balance and next due | P0 | Built 2026-10-26: Mark paid, the Loans page and the Installments page |
| F-LO-03 | Prepayments, rate changes, other repayment structures | P2 | Prepayments built 2026-10-26 (`system-design.md`, Loan). Rate changes and other structures not designed. |

### Fixed Income (`F-FI`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-FI-01 | Fixed deposits: add one, see estimated current value, maturity date and amount | P0 | **Designed final 2026-11-04 on his real deposits** (`docs/design/fixed-income.md`). Repository and computation built; schema tightened 2026-10-26; the Sheet's dropdowns are set (2026-10-31). **Worth today is built (2026-11-05, #260)**: quarterly compounding, which lands on a stored maturity amount; The Sheet layer is built too (2026-11-05, #261): the bank and the maturity amount are optional, and closing records the day, the money received and how it closed (three new columns on the real tab). **The forms are built (2026-11-05, #262)**: add a deposit by start date and tenure (or the day it matures), edit, close with Undo, reopen and delete; the page itself is still to do. Quarterly compounding which reproduces his FD app's accrued interest to within ₹2.50 on each of the seven deposits (₹6 in all), where the current linear estimate is off by up to ₹30 on one and ₹128 in all. |
| F-FI-02 | EPF: contributions and yearly interest per share, the balance as the passbook says, and an estimate of the interest not yet credited | P1 | **Sheet layer, math and forms built 2026-11-05** (the page itself is still to build; [ADR 0011](adr/0011-epf-contributions-and-passbook-import.md) is Accepted). Q1 answered for EPF. The estimate rule (each month's start balance × rate ÷ 12, summed, credited each 31 March) reproduces his credited interest to the rupee for FY 24-25 and FY 25-26. Adds EPF (about ₹9.5L) to net worth at the passbook figure. The rate is kept for each year and says where it came from (implied from the interest EPFO credited, worked out and not stored: 8.25% for each of his three years, two of them to the rupee; assumed for the year in progress until declared), and each month is confirmed, typed, expected or late. The rule is approved (2026-11-05) and the pure functions are built in `lib/aggregate/epf.ts` (#263, tested against his passbooks) and the three tabs and their layer exist on the real Sheet (#264, 2026-11-05); the forms, the import and the page are still to do. |
| F-FI-03 | The Fixed Income page (J1 Doors + widgets): the three doors, the stage, money in each month, credits on time, growth path, deposits, coming up, the EPF card, the states and the phone layout | P1 | **Designed final 2026-11-04** (`design/fixed-income/`, pages FiJ1, FiPhone, FiStates, FiForms). **In build 2026-11-05:** the greeting that points, the attention strip, the three doors and their stages are built (#268); **the widgets are built too (#269)**: money in each month, credits on time with the passbook check, the growth path, the deposits table, coming up and the EPF card. **The states and the phone layout are built (#270)**: an empty door invites the first statement or deposit, a late credit is a red item, a matured deposit is flagged and its row tinted, interest EPFO has just credited is shown against its estimate with the difference, Matured and pre-closed has its own list, and on a phone the doors slide sideways. **The Overview counts EPF in net worth and shows the late and matured items (#271).** His seven deposits are entered (2026-11-05, from his FD app). "Earned so far" counts closed deposits' gains and a paid-out deposit's interest (simple interest, an estimate). Remaining: PPF, NSC, RD and NPS (F-FI-06). |
| F-FI-04 | Add an EPF statement: drop the passbook PDF, review every row and the checks, correct a row or add a missing one in the review, import | P1 | **Built 2026-11-05** (parser #291, import #267: upload, review, confirm; ADR 0011 Accepted). Reads his four passbooks (33 credits; every year reconciles). One year's file at a time; the Gmail label (F-FI-05) and the page's own button wait for the page (#268). |
| F-FI-05 | Import a statement from a Gmail label (EPF first) | P2 | Not designed beyond "a thin second entry calling the same parser" (ADR 0011). |
| F-FI-06 | PPF, NSC, RD and NPS (the rest of the recurring-contribution and certificate holdings) | P2 | Not designed on real data: whether he holds PPF or NPS is unanswered, and each needs a real statement to write against. NSC and RD are drawn only on made-up data (rounds 1 and 2). |

### Investments (`F-IV`)

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-IV-01 | Log a buy or sell: IND or US, Market/RSU/ESPP source, FX rate frozen at the trade date | P0 | Designed (repository built; 65 real trades loaded by file import 2026-11-05, the add form isn't built, [ADR 0003](adr/0003-inr-base-currency-frozen-fx.md)). Schema tightened 2026-10-26: asset type is a fixed list, currency must match the market, rate only on US trades. The Sheet's dropdowns are set (2026-10-31). |
| F-IV-02 | Holdings grouped by category (Indian Equity, US Stocks, RSUs, Debt Fund), with cost basis | P0 | Designed (computation built). Fixed 2026-10-26: same-day trades no longer depend on entry order, and an oversell is reported. RSU is a source, not a category: vested and bought shares of one symbol are one holding. |
| F-IV-03 | Live prices and today's FX rate, for market value and gain or loss | P0 | Not started. Source decided (Q2): Yahoo, AMFI and Frankfurter behind `lib/prices/`. |
| F-IV-09 | The stage: worth against what you put in over time, the big portfolio number, the range (1M to All), a crosshair, and Worth or Race (you against Nifty 50, the S&P in rupees, gold and a 7% deposit) | P1 | **Design final 2026-11-04 (L1 Giant), proposal, not built.** Needs a daily price for every holding and the benchmarks' prices (design doc Q9). |
| F-IV-10 | The lens: pick a holding and see its price, what you paid and every trade of yours marked on the line, with its stats | P1 | Designed 2026-11-02, proposal |
| F-IV-11 | Record an RSU vest (shares vested and sold to cover as two trades at once) and an ESPP purchase; add an instrument with its price ticker; **edit or delete a trade you saved** (editing either trade of a vest opens both, saved together) | P1 | Designed 2026-11-02 (forms), proposal; edit drawn 2026-11-05 (`InvForms` and a phone sheet on `InvPhone`). Writes the existing `InvestmentTransactions`; the instrument needs the proposed `Instruments` tab. |
| F-IV-12 | Go back to a day: the figures and the holdings table as they stood on a past day | P2 | Designed 2026-11-02, proposal. Needs the daily price history. |
| F-IV-13 | Understand it: how it's split six ways, weight against return, what-ifs on prices, a growth path, concentration and who made the gain | P2 | Designed 2026-11-02, proposal. Arithmetic only; the page suggests no split, limit or trade. |
| F-IV-14 | Your targets and limits: numbers you set, shown against today's figures (drift, where new money would go, breaches) | P2 | Designed 2026-11-02, proposal. Needs a small `InvestmentTargets` tab; only ever compared. |
| F-IV-15 | Yearly return as **XIRR** (money-weighted), overall and per holding, with a per-holding annualised return (CAGR) from its first buy. XIRR is the headline return: his money goes in as ESPP and RSU vests over years, so a plain gain % hides how long it took. | P1 | **Wanted 2026-11-04, drawn on the final boards the same day (the Yearly return card, a holding's Yearly return and Price a year stats), not built.** Needs F-IV-03 (prices) and the Q12 answer (RSU vest as cash in at fair value, ESPP as what he paid; answered 2026-11-04). A pure function in `lib/aggregate/` whose test proves the math (a single buy valued later gives exactly the CAGR; a flat value gives 0%). |
| F-IV-16 | Against a benchmark as one figure: "ahead or behind Nifty 50 (and the S&P 500 in rupees) by X% a year", the time-weighted return less the index's over the same days. The Race draws it; this says it in a number. | P1 | **Wanted 2026-11-04, drawn as the Against the index card, not built.** Needs the daily price history for holdings and benchmarks (F-IV-09). A comparison, never advice. |
| F-IV-17 | Realised gain: what sales made (proceeds less the weighted-average cost removed), shown beside the unrealised gain and counted in total return, never in net worth. His RSU sell-to-cover sales produce it from the first vest. | P1 | **Wanted 2026-11-04, drawn as the Made on shares sold card and in Total return, not built.** Pure function with a test. |
| F-IV-18 | Cash at your brokers: the uninvested balance in each brokerage account (dollars at the US broker, rupees at the Indian one), with its date, shown on Investments as its own card and a pointing figure in the greeting, never inside the holdings' worth or the yearly return. A trade can be paid from, or its proceeds land in, one of these accounts, and the form shows what the cash is after. | P1 | **Wanted 2026-11-04, drawn on the final boards (the Cash at your brokers card, the greeting figure, the Paid from field, the Add broker cash form, states G and H), not built.** Needs F-AC-05 (a currency on an account, a Brokerage type) and the existing `settlementAccountId`. Pure functions in `lib/aggregate/` with tests: cash in rupees at today's rate; the idle share (cash over holdings plus cash); a trade's effect on a cash balance. Q13 holds the open rules. |

### Goals (`F-GO`)

Designed 2026-10-29 and built 2026-11-02 (`docs/design/goals.md`, mockups in [`design/goals/`](../design/goals/), the Orbit page). A goal is an earmark, not money: it never changes net worth, and "set aside" is derived from a log. Q1 to Q8 of that doc are answered.

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-GO-01 | Add, edit, pause, drop and finish a goal: name, category, Need or Want, Minor (short-term) or Major (long-term), amount, optional date (Fixed or Flexible) and planned monthly | P1 | Built (#238) |
| F-GO-02 | Sub-goals, one level deep: a goal's total is its own part plus its sub-goals | P1 | Built (#238) |
| F-GO-03 | Set aside and take back money against a goal, with an optional account; saved, funded and standing are derived | P1 | Built (#238) |
| F-GO-04 | The monthly figures: required a month, on track or behind, and a funding plan that serves Fixed dates, then Needs, then the soonest | P1 | Built (#238) |
| F-GO-05 | Goals on Overview's "What needs attention": a Fixed date at risk, an earmark an account can't cover | P2 | Built (#238) |

### Insurance (`F-IS`)

Designed and built 2026-10-29 as its own page (epic #208; design in `docs/design/insurance.md`, the multi-year term model in [ADR 0010](adr/0010-insurance-terms-with-years.md)). It answers Q11: insurance is not a Subscriptions category.

| ID | Feature | Pri | Status |
|---|---|---|---|
| F-IS-01 | Insurance: policies, renewals and what's covered. Add a policy of any kind with its first term; the cover map, the runway of premiums, what renews next and what has lapsed; Renew (with Undo), Cancel and Restart, Edit, and a payments page. A policy's state (In force, Renew soon, Lapsed, Cancelled) is worked out from its dates, never typed in. | P1 | Built (#209 to #215 and the payments page, #225). The 30-day "renew soon" window is a placeholder. A Gmail import of the policy PDFs is not built (it would need its own ADR and a parser per insurer). |

### Proposed additions (gap review, 2026-10-27)

**Proposals only: none are decided, and none are built.** They come from a review of the PRD and `system-design.md` ("Gap review") for kinds of source the app doesn't yet cover. The priorities are proposed too. The last column says whether §10 already put it out of scope.

**P1: the numbers are understated, or can't be rebuilt later**

| ID | Feature | Depends on | §10 |
|---|---|---|---|
| F-OV-07 | Monthly net-worth snapshots, and a price and FX snapshot log once prices land. Past prices and rates can't be reconstructed, so this is the capture side of F-OV-06. | Q2 (for prices) | Net worth history is out of scope, and F-OV-06 stays P2. This is only the capture. |
| F-FI-02 | Valued assets: EPF, PPF, NPS, NSC, insurance surrender value, property and vehicle as a dated value read off a statement | Q1, Q9 | Not excluded |
| F-AC-05 | Foreign-currency balances, and cash at a broker: a USD account (cash at the US broker) and an INR one at the Indian broker, each valued at today's rate, counted once in net worth | Q2 | **Wanted and designed 2026-11-04, rules accepted 2026-11-05 (Q13, Q14, [ADR 0012](adr/0012-foreign-currency-balances.md)); in build (epic #280).** A broker's cash is an `Account` (type Brokerage, purpose Investment, a `currency`), its balance read like any other, so it lives on Accounts and in net worth. The Investments page shows it (F-IV-18) once that page exists; it is never counted in the holdings' worth or yearly return. |
| F-IN-03 | Dividend and interest capture: savings and FD interest and Indian dividends from bank statements, US dividends in USD with tax withheld | F-AC-05, ADR 0009 | Not excluded. **Wanted 2026-11-04:** without it, total return and XIRR (F-IV-15) understate what a payer made. Its income must enter XIRR as cash received. |
| F-IV-04 | Investing costs: what a trade's `total` means once there are fees, so cost basis includes them | Decide with F-IV-01 | Not excluded. **Wanted 2026-11-04:** decide before the first real trade is entered, or every return figure is flattered by the fees left out. |

**P2: later**

| ID | Feature | Depends on | §10 |
|---|---|---|---|
| F-IV-05 | Other asset kinds: REITs, bonds and T-bills, crypto | A holding to track | Not excluded |
| F-IV-06 | Upcoming RSU vests: a list of the next vests, not in net worth | Q10 | **Narrowly reopens "vesting schedules".** A list only, with no grant lifecycle or tax lots. |
| F-SU-03 | Rent and fees as recurring obligations (proposed: reuse Subscriptions). Insurance left this row: it is its own page, F-IS-01. | Q11 (answered) | Not excluded |
| F-OV-08 | Goals and health metrics: emergency-fund months, allocation against a target, a benchmark for XIRR, debt-to-income | F-OV-07, Q2 | Not excluded |
| F-IV-07 | Imports for holdings: the NSDL/CDSL and CAMS/KFintech consolidated statements, and stock-plan statements for RSU and ESPP | An ADR for each | Not excluded |
| F-IV-08 | Foreign-asset disclosure data for India's yearly return (opening, peak and closing value) | F-OV-07 | **Out of scope (tax reporting).** Listed only so the price-history design doesn't rule it out. |

**Not proposed (already out of scope, unchanged):** spending by UPI, debit and cash (statement totals only), tax lots and tax reporting, lending to others, and an automatic bank-data aggregator.

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

### F-AC-03 and F-AC-04: Bank account balances from statements
*As Prathik, I want my bank balances filled in from the statements the banks email me, so that I stop typing them, and I want to be told, not overruled, when a statement disagrees with what I have.*
- [ ] "Sync statements" on the Accounts page reads every labelled, not-yet-read email: monthly, yearly or custom range, and reports what was added, was already there, needs a look, or couldn't be used, and why.
- [ ] A statement gives its closing balance on its last day, its opening balance (the day before it starts, even when an older balance is recorded), and a balance at the end of each month it has transactions in.
- [ ] A statement whose own numbers don't add up writes nothing and is reported.
- [ ] Running sync twice, or reading a monthly inside a range already read, adds nothing and opens no question.
- [ ] A balance already recorded for that account and day is never changed by a sync. If the statement disagrees, a question opens: it shows in the greeting sentence (a figure that points at a card), in a card at the top of the page, and as a chip on that balance in Balance history. **Use the statement's** writes it; **Keep the Sheet's** closes it.
- [ ] A statement for an account that can't be matched (or matches more than one), a closed account, a period not over yet, one before the account was opened, or a PDF that no saved password opens, is reported with what to change and writes nothing.
- [ ] Add/Edit account takes the statement PDF password. It is never shown back and never sent to the browser or out of an API route (cards' passwords the same).
- [ ] Balance history says "from a statement" on a balance a statement gave, and stops saying it once someone types over the balance.
- [ ] Gmail access is read-only, and no credential is ever committed.

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
- **The NetApp salary is read from the HDFC account statements** (#187, ADR 0009): a deposit whose narration contains the source's statement text becomes a received entry, once, **always tagged Regular** (Prathik, 2026-10-25; a bonus is retagged by hand), expected on the nearest payday. Everything else is recorded in the app.
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
| **M5b · Insurance** | F-IS-01 (P1). Built 2026-10-29, between M3 and M4 in practice | A policy can be added, renewed, cancelled and restarted, and every figure on the page agrees with its tested function. Met 2026-10-29: the Policies and PolicyPayments tabs pass `check-sheet` and his real policies are entered. |
| **M6 · Goals** | F-GO-01 to F-GO-05, after Investments in the sidebar (decided 2026-10-29) | A goal can be added with sub-goals, set aside against and finished, and every figure on the page agrees with its tested function. |

## 12. Open questions

| # | Question | Blocks, or the answer |
|---|---|---|
| Q1 | Fixed Income: how should recurring-contribution holdings (EPF, PPF, RD) be modelled, given that an FD is a single lump sum? | F-FI-02, F-FI-06. **Answered for EPF 2026-11-04** (his real passbooks): EPF is **contributions plus yearly interest per share**, with the balance worked out and the passbook's closing balance used as a check ([ADR 0011](adr/0011-epf-contributions-and-passbook-import.md)), not a single balance with dated snapshots. **Still open:** PPF, NSC, RD and NPS (F-FI-06), which waits on whether he holds PPF or NPS and on a real statement for each. |
| Q2 | Where do live prices and FX rates come from: a `GOOGLEFINANCE` Prices tab or a market-data API? And does Indian ticker coverage hold up? | F-IV-01 (FX at entry), F-IV-03. **Answered 2026-10-27:** a price module in code (`lib/prices/`), not a `GOOGLEFINANCE` tab. Yahoo's chart API for stocks, ETFs, indices and today's USD/INR; AMFI's NAV file for Indian mutual funds; Frankfurter (ECB) for the USD/INR rate on a past trade date, as an editable prefill. Results are saved in a `PriceSnapshots` log, and the last one is used (marked stale) when a source is down. `GOOGLEFINANCE` is dropped: it breaks ADR 0002 and was never tested. Spike on a representative basket, not his holdings (the tabs are empty); to re-run on his real tickers before building F-IV-03. Details in `system-design.md`. |
| Q3 | Where do statement PDF passwords live? | **Answered 2026-10-17:** in the Cards Sheet tab (`statementPdfPassword`), as built. The Sheet is private to Prathik and the service account, and this keeps adding passwords inside the app. |
| Q4 | Hosting platform and login method (ADR 0007) | F-PL-01, F-PL-02, F-CC-04 |
| Q5 | Which banks are your current cards with? | **Answered 2026-10-17:** HDFC, ICICI, Axis, YES and CSB/Jupiter. All five have parsers. |
| Q6 | Cards design: which merged-widget option (J–O)? | **Answered 2026-10-17:** none. A new final design replaced them (see §8). |
| Q7 | Phone layouts: per epic, or a mobile design pass up front? | **Answered 2026-10-17:** per epic. M1 sets the shared phone patterns. |
| Q8 | Overview design: needs a mockup in the new design language | F-OV-05 |
| Q9 | Valued assets (EPF, PPF, NPS, NSC, insurance, property, vehicle): one `ValuedAssets` entity with dated valuations for all of them, or one per kind? Proposed: one. | F-FI-02 |
| Q10 | Upcoming RSU vests: reopen "vesting schedules" in §10 for a list of the next vests (date and shares, not in net worth), or leave it out? | F-IV-06 |
| Q11 | Insurance, rent and fees: add them to Subscriptions as new categories (proposed), or give them their own page? | **Answered 2026-10-29 for insurance:** its own page (F-IS-01), with a `Policies` master and a `PolicyPayments` row per term, because it asks whether you're covered and when it lapses, not what you pay each period. Rent and fees stay proposed for Subscriptions (F-SU-03). |
| Q12 | Returns: how does an RSU vest and an ESPP purchase count in XIRR and in "money in"? | F-IV-15, F-IV-16. **Answered 2026-11-04:** an **RSU vest is cash in at fair value on the vest day**, and its same-day sell-to-cover is cash out, so net money in is the value of the shares kept and only later price moves are return. An **ESPP purchase is cash in at what he paid** (the discounted price taken from salary), so the discount shows as return. Dividends are cash received; fees are part of what a trade cost (F-IV-04). Both his picks were the recommended ones. The trade's `price` therefore means fair value for an RSU vest and the price paid for an ESPP purchase. (Not the design doc's own numbered Q12, the growth path; this is its Q3 and Q5.) |
| Q13 | Broker cash: does it count in the Investments worth, the yearly return and the split, or sit beside them? Does a trade pay from it? | F-AC-05, F-IV-18. **Answered 2026-11-05:** cash is an account, counted once in net worth on Accounts; on Investments it is its own card and a greeting figure, **outside** the headline worth, the holdings' split and the XIRR (a transfer to a broker is not a gain, and idle cash earns nothing, so putting it in drags the yearly return for no reason); the page says what share of everything at the brokers is idle; a trade form's *Paid from* can name a cash account, and a buy larger than the cash recorded is a warning, never a block, because the balance may be old. A dollar balance has no cost basis, so the rupee's move on it is not shown as gain. Interest the cash earns is F-IN-03. [ADR 0012](adr/0012-foreign-currency-balances.md). |
| Q14 | Broker cash: where does today's USD/INR come from, and what happens when it can't be fetched? | F-AC-05, F-IV-18. **Answered 2026-11-05:** Frankfurter's latest rate (Q2), behind `lib/prices/usdInr.ts`, read through the same cache as the Sheet tabs with an explicit refresh (ADR 0005). **When it can't be fetched, a dollar account is left out of the totals and the page says so in amber, with its dollars still shown.** It is never counted as ₹0, and never at a rate the app invented or kept quietly. With only rupee accounts nothing is fetched. [ADR 0012](adr/0012-foreign-currency-balances.md). |

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
| 1.8 | 2026-10-23 | Bank account balances from emailed statements (F-AC-03, F-AC-04, ADR 0008): HDFC, Slice and Jupiter; the recorded balance always wins and a disagreement waits for an answer. |
| 1.9 | 2026-10-24 | Income numbers defined (§8 F-IN-01/02): RSU and ESPP are not income, a month counts what landed, late after 3 days, pending computed not stored, the salary read from HDFC statements. Income design final: Z1 with the E1 Ledger and E3 Passbook (#184). |
| 1.10 | 2026-10-24 | Income: pending counts every missed date after the latest received regular payment; only a Regular entry receives a scheduled payment (#186). Overview's pending income is computed from the schedules, a line per source. |
| 1.11 | 2026-10-24 | The Income page (#188): the greeting whose figures point, the attention strip, and the Year in columns cover with a year pill and a source pick; a picked source's columns are drawn on their own scale. |
| 1.12 | 2026-10-25 | Income from bank statements (#187, ADR 0009): the account statement sync records deposits matching a source's statement text, always Regular; `reread` catches up statements read before. |
| 1.13 | 2026-10-25 | The Income page's widgets (#189): the income heatmap, the income map beside Entries, Trends (this year and last, month by month, pay rhythm), Sources, the Pay calendar and Pay changes, all following the pick. |
| 1.14 | 2026-10-25 | Income forms (#190): Add and Edit source (with Next expected, where it lands, the statement text, colour and icon), Record income, Mark received on a payment that's owed, Edit and delete a payment, Mark inactive, Delete source (with its payments; Mark inactive offered instead), and Undo for six seconds after recording. |
| 1.15 | 2026-10-25 | The Income Entries page (#191): the Ledger for every source and a source's Passbook. F-IN-01 and F-IN-02 built. |
| 1.16 | 2026-10-26 | Review of the Investments and Fixed Income design against the code: a holdings bug fixed (same-day trades, oversells, float dust), the trade and FD schemas tightened, and the rest recorded as proposals in `system-design.md`. No scope change. |
| 1.17 | 2026-10-27 | Gap review of what the app doesn't yet cover: proposed additions F-OV-07, F-AC-05, F-IN-03, F-IV-04 (P1) and F-IV-05 to F-IV-08, F-SU-03, F-OV-08 (P2), F-FI-02 widened, and open questions Q9 to Q11. All proposals; see `system-design.md`, "Gap review". |
| 1.18 | 2026-10-27 | Q2 answered: prices come from a code module (Yahoo, AMFI, Frankfurter) saved to a `PriceSnapshots` log; `GOOGLEFINANCE` dropped. Based on a spike run on 2026-10-27. |
| 1.19 | 2026-10-29 | Goals designed (`docs/design/goals.md`): F-GO-01 to F-GO-05 and an M6 milestone. Minor/Major is a time horizon picked per goal; a goal is an earmark and never changes net worth. Round 1 mockups; the hero is not picked yet. |
| 1.20 | 2026-10-31 | Insurance (F-IS-01) written into the PRD as built, and Q11 answered: insurance is its own page, not a Subscriptions category. F-SU-03 now covers rent and fees only. |
| 1.21 | 2026-10-31 | The InvestmentTransactions and FixedDeposits dropdowns are set on the real Sheet from their schemas (#234); `check-sheet` passes on every tab. No scope change. |
| 1.22 | 2026-11-02 | Goals (F-GO-01 to F-GO-05) built as the Orbit page, with its two tabs, tested math, forms with Undo and Overview's attention items. The month-counting, required-a-month, on-track, funding-order and bought-sub-goal rules are confirmed by Prathik. |
| 1.23 | 2026-11-02 | The Investments page is designed (`docs/design/investments.md`, `design/investments/`): the L1 Giant page, its phone layout, states and forms, picked from four rounds of mockups. F-IV-09 to F-IV-14 proposed (the stage, the lens, the RSU and ESPP forms, go back to a day, Understand it, targets and limits). Open questions 1 to 15 in the design doc wait for his answers. |
| 1.24 | 2026-11-04 | The Investments design is final (`docs/design/investments.md`): L1 Giant with a Spin wheel | Treemap split card, its phone, states and forms. F-IV-09 to F-IV-14 stay proposed (Designed, not built); their money rules need his yes first. |
| 1.25 | 2026-11-04 | Investments key metrics reviewed against what the design draws (it has total return and a time-weighted yearly return, but no XIRR, CAGR, return against a benchmark as one figure, or realised gain in the return). Added F-IV-15 (XIRR and per-holding CAGR), F-IV-16 (ahead or behind the index, a year) and F-IV-17 (realised gain), all P1 and wanted; F-IN-03 (dividends) and F-IV-04 (fees in cost basis) moved up to wanted; Q12 (how RSU and ESPP count in XIRR) answered the same day: RSU at fair value, ESPP at what he paid. Nothing built. |
| 1.26 | 2026-11-04 | The Investments boards are redrawn for the key metrics (`design/investments/`, `docs/design/investments.md` "Key metrics"): a yearly-return sentence in the greeting, a six-card Returns row (Yearly return as XIRR, Against the index, Total return all in, Made on shares sold, Dividends, Deepest fall), eight stats per holding, eight cards for a past day, a "too early" state for a holding under a year (one year is the line, decided the same day), and the RSU and ESPP forms saying how each counts. Sample data. Nothing built. |
| 1.27 | 2026-11-04 | The Fixed Income page is designed on his real numbers (`docs/design/fixed-income.md`, `design/fixed-income/`): J1 Doors + widgets, with its phone, states and forms. F-FI-01 is revised (a deposit entered by start date and tenure, bank and maturity amount optional, worth today by quarterly compounding), F-FI-02 is rescoped to EPF as contributions plus yearly interest (Q1 answered for EPF, [ADR 0011](adr/0011-epf-contributions-and-passbook-import.md) proposed), and F-FI-03 to F-FI-06 are added (the page, the EPF statement import, a Gmail entry, and PPF/NSC/RD/NPS). PPF, NSC, RD and NPS stay open. Nothing built. |
| 1.28 | 2026-11-05 | The Fixed Income design is amended after review of his questions: the EPF rate is kept for each financial year with its source (his passbooks imply 8.25% for all three years, not 8.5%; the year in progress is assumed until declared), a month is Confirmed, Typed or Expected and a passbook is complete to its print date, the import review can be corrected in place (fix a row, add a missing one, resolve a conflict), and a year's interest or an opening balance can be typed. [ADR 0011](adr/0011-epf-contributions-and-passbook-import.md) is amended (still Proposed). |
| 1.29 | 2026-11-05 | Broker cash (his $3,000 at the US broker and ₹1 lakh at the Indian one) is decided and in build: F-AC-05 widened to cash at a broker, Q13 (the rules) and Q14 (today's USD/INR, and what happens when it can't be fetched) answered, [ADR 0012](adr/0012-foreign-currency-balances.md) accepted. The Accounts tab gains a `currency` column and a `Brokerage` type (#273, epic #280). |
| 1.30 | 2026-11-05 | The EPF statement import is built (F-FI-04): a pure parser reads the passbook PDF, a plan works out what importing would do (account matched by the member ID's last four, a credit identified by its wage month, conflicts, typed credits the file contradicts), the review can be corrected in place, and one confirm writes it. Tested on made-up passbooks and checked on a real Sheet round trip; his four real passbooks parse and reconcile. |
| 1.31 | 2026-11-05 | The EPF forms are built (F-FI-02): Add a contribution, Add what EPFO credited (a year's interest, dated 31 March, or an opening balance), EPF settings (a rate for each year not yet credited, marked declared or assumed, and the monthly credit) and Edit and Delete with Undo. Everything typed is marked Typed; a row read from a passbook can be deleted but not edited. His four passbooks are imported (33 credits, 3 years of interest, balance ₹4,76,283 for each share). |
| 1.32 | 2026-11-05 | The deposit forms are built (F-FI-01): Add a deposit as his FD app shows it (the day it started and how long it runs, or the day it matures), Edit, Close (the money received and the day; whether it matured or was closed early follows from the day), Reopen and Delete, with Undo for an add or a close. Closing doesn't change an account's balance (balances are updated on the Accounts page). |
| 1.33 | 2026-11-05 | The Fixed Income page is started (F-FI-03, #268): the greeting whose figures point (what it is all worth, EPF, the deposits, what it earns a day, the interest not yet credited, the next deposit to mature), what needs attention (a late EPF credit, a deposit matured and not closed, the year's interest not credited, deposits with no bank and maturity amount), three doors (Everything, EPF, Fixed deposits) and the stage each opens, on his real numbers. A plain list of the deposits and EPF rows stays under it until the widgets are built. |
| 1.34 | 2026-11-05 | The Fixed Income page's widgets are built (F-FI-03, #269): money in each month (a grid with a dot where a deposit was placed, and three figures), credits on time (the days each credit took, and the passbook check for each year: opening + credits + interest = closing, flagging rows he typed), the growth path (5, 10 and 20 years, with what a ₹5,000 higher monthly credit would add), the deposits table as his FD app shows them (with Edit and Close, and Matured and pre-closed), coming up, and the EPF card. Every figure is worked out from the rows and reproduces the J1 mockup on his data. |
| 1.35 | 2026-11-05 | The Fixed Income page is finished (F-FI-03, #270 and #271): the states (nothing yet, a late credit, a matured deposit not closed, the year's interest arriving against its estimate, matured and pre-closed deposits), the doors sliding sideways on a phone, and the Overview: EPF is counted in net worth at the passbook figure (his net worth moves from −₹31,334 to ₹9,21,232) and a late EPF credit or a matured deposit joins what needs attention. [ADR 0011](adr/0011-epf-contributions-and-passbook-import.md) is fully built. |
| 1.36 | 2026-11-04 | Cash at the brokers: his $3,000 at the US broker and ₹1 lakh at the Indian one had no home in the docs or the Investments design. F-AC-05 widened (a broker's cash is an account with a currency), F-IV-18 added (wanted, P1) and Q13 opened (proposed rules). The final Investments boards are redrawn (`design/investments/`, `docs/design/investments.md` "Cash at your brokers"): a greeting figure, a Cash at your brokers card, the Paid from field showing the cash after a buy, an Add broker cash form, and two states (cash is old, a buy is more than the cash). Sample data. Nothing built. The Accounts boards were redrawn for it in 1.29. |
| 1.37 | 2026-11-04 | The Accounts boards are redrawn for broker cash (`design/accounts/`, `docs/design/accounts.md` "Broker cash accounts"): a dollar account kept in dollars and counted in rupees at today's rate, a Brokerage type and a currency in the Add account form, a new Add a broker's cash form, the hero card and Balance history showing the dollars, and a state for it, desktop and phone. F-AC-05's sample is Vested cash ($3,000) and Zerodha cash (₹1,00,000). Only the final boards were rebuilt. Sample data. Nothing built. |
| 1.38 | 2026-11-05 | Broker cash is planned (`docs/design/broker-cash.md`: two epics, ten tasks). Q13 (the rules) accepted and Q14 (where today's USD/INR comes from, and what happens when it can't be fetched) opened and answered; [ADR 0012](adr/0012-foreign-currency-balances.md) accepted. Nothing built; no issues created yet. |
| 1.39 | 2026-11-05 | The Investments build is planned (`docs/design/investments-build.md`: prices, the maths, the page) and approved. The price-history spike passed (Yahoo, AMFI and Frankfurter cover every ticker he holds), which settles Q2. Trades from every broker are loaded from files with `scripts/importTrades.ts` (65 trades; FYERS before April 2024 and April 2025 to March 2026 still missing). F-IV-11 widened: edit or delete a saved trade (the edit forms are drawn on desktop and phone). |
