# Investments: build plan

**Status: planned 2026-11-05; nothing in this plan is built, no issues created yet.** The design is final ([`investments.md`](investments.md), mockups `design/investments/`). This is the Plan stage of [`process.md`](../process.md): what to build, in what order, and what needs his yes first. PRD: F-IV-01 to F-IV-18.

## Where things stand

- **The data is in.** The real `InvestmentTransactions` tab holds **91 trades** (2026-11-06), loaded with `scripts/importTrades.ts` ([`system-design.md`](../system-design.md) "Importing trades from broker files"): the US brokers (INDmoney DriveWealth and Alpaca, Interactive Brokers), E*TRADE's NetApp plan (complete), Groww and Zerodha (complete) and FYERS (April 2024 to March 2025 and April 2026 onward, plus five opening buys dated 2024-03-31 worked out from the FY2024-25 P&L report, and Rushil's 10-for-1 split). **Not known:** whether he traded at FYERS between April 2025 and March 2026. Indian trades carry no charges (he said ignore them for now); XIRR for the five opening-buy holdings is approximate until their real dates are known (they are all sold, so it only affects past returns).
- **Cash at the brokers** is ready: the maths (`lib/aggregate/brokerCash.ts`, #279) and the Accounts currency and Brokerage type (#273, ADR 0012) are merged.
- **Prices: the spike passed (2026-11-05).** Yahoo's chart API returned five years of daily closes for every ticker he holds (the US ones, NSE ones such as `NIFTYBEES.NS`, `GOLDCASE.NS`, `GROWW.NS`, `FSL.NS`), the Nifty 50 (`^NSEI`), the S&P 500 (`^GSPC`) and `USDINR=X`. Frankfurter gives USD/INR for any day (623 days in one request); AMFI's NAV file answers (he holds no mutual fund today). Two cautions: Yahoo's chart API is unofficial and can change or block, so the code keeps the last price and marks it stale (the design's state B); and `GOLDCASE.NS` and `GROWW.NS` are young (since March 2024 and November 2025), which the page must read as "since it began", never as a gap.
- **Not built:** every computation beyond `computeHoldings`, the price fetch and the two Sheet tabs it needs, the forms and the page. `/investments` is still a "coming soon" page.

## Decisions to settle first (Definition of Ready)

| # | Decision | Recommendation | Status |
|---|---|---|---|
| D1 | **Prices come from Yahoo's chart API (stocks, ETFs, indices), AMFI (funds) and Frankfurter (USD/INR)**, behind `lib/prices/`, closes saved once a day. Answers PRD Q2 (#2). | Yes: the spike above shows it works for every holding. Needs an ADR (0013), since an unofficial source is hard to swap once history is stored. | Needs his yes |
| D2 | **Two new Sheet tabs:** `Instruments` (symbol, name, kind, price ticker, colour) and `PriceSnapshots` (date, symbol, close, currency). He builds the tab and dropdowns, or says go and `/api/dev/sheet-columns` does it, as for the earlier tabs. | Yes. A holding with no `Instruments` row is valued at cost and says so (state E). | Needs his yes |
| D3 | **The rupee split** of a US holding's gain: (dollar value − dollar cost) × the rate paid is "price"; dollar value × (today's rate − rate paid) is "the rupee"; they add up to the gain exactly. | As drawn. | Needs his yes |
| D4 | **Day change** = value today less value at the previous close, using the previous close's USD/INR (so a US holding's move includes the rupee's). | As drawn. | Needs his yes |
| D5 | **The employer line** ("NetApp is also the employer", a plain fact, no advice). | Keep. | Needs his yes |
| D6 | **Hold on pushing the design is over** (the performance-metrics session's PR #281 merged 2026-11-05). The design boards and docs are only in the working copy, mixed with other uncommitted work, so they go in as their own PR first. | Yes: split the working copy into reviewable changes before any code PR. | Needs his go |
| Answered | Realised gain: show it, never in net worth (F-IV-17). XIRR: RSU vest as cash in at fair value, ESPP at what he paid, fees in the cost (Q12). Broker cash rules (Q13) and the rate source (Q14). Fees are in a trade's `total`. | — | Done |
| Defaults | Benchmarks Nifty 50 and the S&P in rupees, with gold and a 7% deposit; as-of on; targets and limits on; growth path on; upcoming vests as a list. These are what the design draws; he can say if any should go. | As drawn. | Assumed |

## Epics and tasks (each task is one PR, about a day or less)

**Issues (2026-11-05):** prices are epic #32 (A1 to A4 = #311 to #314), the maths is epic #309 (B1 to B5 = #315 to #319), the page is epic #310 (C1 to C6 = #320 to #325), all in M4 · Wealth.

### A. Prices and history (F-IV-03, `area:investments`, P1)

| # | Task | Main files | Proof | Depends on |
|---|---|---|---|---|
| A1 | **ADR 0013** and the PRD answer to Q2: sources, what "stale" means, what a young listing looks like. | `docs/adr/0013-…`, `docs/prd.md` | docs | D1 |
| A2 | **`Instruments` and `PriceSnapshots` tabs**: types, repositories with row schemas, routes, cached list, `checkedRepositories`, dropdowns; a real round trip. | `lib/sheets/instruments.ts`, `priceSnapshots.ts`, `types.ts`, routes, `cached.ts`, `checkSheet.ts` | `entities.test.ts`, `npm run check-sheet`, create/read/update/delete on the real Sheet | D2 |
| A3 | **`lib/prices/history.ts`**: build the Yahoo and AMFI URLs, parse the answers (pure, tested on saved samples), pick the right source per instrument, mark a price stale. | `lib/prices/` | tests incl. a young listing, a null close, a failure | A1 |
| A4 | **The daily refresh**: a route that saves the day's closes for every instrument (and the two indices and USD/INR) to `PriceSnapshots`, the Refresh button, a backfill for new holdings. | route, `scripts/` | tests; run against the real Sheet and read back | A2, A3 |

### B. The money maths (F-IV-02, F-IV-15 to F-IV-17; pure functions in `lib/aggregate/`, each with a test that proves the maths)

| # | Task | Proof |
|---|---|---|
| B1 | `holdingsAt(date)`: the fold up to a day, with that day's price and rate; weighted-average cost including fees (the log already carries them). | the real trade log as a fixture: NTAP 113 shares, the Groww and Zerodha funds net to zero |
| B2 | **Realised gain** (proceeds less the cost removed) and the **rupee split** (D3), **day change** (D4). | the two parts sum to the gain exactly; a sell never moves the average cost of what is left |
| B3 | **XIRR** overall and per holding, with the Q12 flows; **price CAGR**; "too early" under a year. | a known cash-flow set with a hand-worked answer; a single flow; all-positive flows fail cleanly |
| B4 | **Time-weighted return**, yearly rate and deepest fall; the **gap to Nifty 50 and the S&P** in rupees. | money added later doesn't flatter the return; the gap is the difference of the two |
| B5 | The **greeting view** (`greetingView.ts`) so every figure in the sentence has its card, as on Cards. | the view agrees with the sentence |

B1 and B2 need nothing from his yes except D3 and D4, and can start the same day as A.

### C. The page (F-IV-09 to F-IV-14, F-IV-18)

| # | Task | Depends on |
|---|---|---|
| C1 | **The page without the stage**: the greeting that points, the holdings table, the Understand-it split card (Spin wheel and Treemap) and recent trades, on real data, with the states (no trades, prices down, a sell to fix, no price). | A4, B1, B2, B5 |
| C2 | **The forms** (F-IV-11): add, **edit** and delete a trade (with Undo), the RSU vest (two trades saved together), the ESPP purchase, add an instrument. | A2, C1 |
| C3 | **The Returns row and the cash card** (F-IV-15 to F-IV-18): six cards, a holding's stats, cash at the brokers. | B3, B4, the merged broker-cash maths |
| C4 | **The stage and the lens** (F-IV-09, F-IV-10): worth against what he put in, the range chips, Worth or Race, a crosshair, every trade marked on a holding's price. | A4 (history), B4 |
| C5 | **Go back to a day, Understand it's other widgets, targets and limits** (F-IV-12 to F-IV-14, P2); `InvestmentTargets` needs its own tab. | C4 |
| C6 | **The phone layout**, the edit sheet and a check at both widths in light and dark. | C1 to C4 |

## Order and what runs at once

1. **D6 first:** put the design boards, this plan and the importer in as their own PRs.
2. Then **A1 → A2 → A3 → A4** and **B1 → B2** in parallel (different files). **B3 to B5** follow.
3. **C1** when A4 and B1/B2 are in; **C2** and **C3** next; **C4** once history is saved; **C5** and **C6** last.
4. **FYERS** history is independent of all of this: when the missing tradebooks arrive they are one more `importTrades` run, and every figure corrects itself.

## Risks

- **Yahoo's chart API is unofficial.** If it stops answering, the page keeps the last price and says so; the fix is another source behind the same `lib/prices/` seam, which is why D1 gets an ADR.
- **Weighted-average cost versus E*TRADE's lot-by-lot cost.** NetApp's cost here comes out about ₹1 lakh above E*TRADE's own per-lot figure, because the app averages every lot (and the sell-to-cover removes cost at the average). It is the design's rule (ADR 0003 and `computeHoldings`); if he wants lot-level cost for NetApp that is a change to the rule, not a bug.
- **Six FYERS holdings are wrong until their older tradebooks are loaded** (sells with no buys). The page shows an oversell as something to fix (state C), never hides it.
