# Investments canvas generator

Builds the Investments design canvas in `design/investments/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping large artboards by hand. A rebuild overwrites them, so make changes here and rebuild. Every trade, price and rate is made-up sample data ("today" is Saturday Oct 31, 2026, so prices are Friday's close). The notes are in [`docs/design/investments.md`](../../../docs/design/investments.md).

Its infrastructure is a copy of the Goals generator's (`css-base.mjs`, `css.mjs`, `cdp.mjs`, `audit.js`, the shell in `lib.mjs`). Needs Node 22 or newer and Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=InvI1 for one), writes heights.json
./shoot.sh InvI1          # out/shots/InvI1.png
./audit.sh                # cards side by side end level, none with empty space inside
node preview.mjs          # out/preview/investments-designs.html: every board in a tab, to hand over
```

- `data.mjs`: the sample trade log (the real `InvestmentTransaction` shape), the instruments and prices, the fold into holdings (weighted-average cost, same-day Buy first, a US trade costed at its own frozen rate), and the sums every board reads.
- `parts.mjs`: the shared widgets (greeting that points, attention strip, holdings table, allocation, recent trades, movers, NetApp shares, prices and rates).
- `history.mjs`: made-up daily prices, USD/INR, the portfolio's value, cost and time-weighted index, and benchmarks (round 2). `charts.mjs`: the interactive chart builder (range views, crosshair, markers). `parts2.mjs`: round 2 widgets (KPI cards, portfolio card, money-in matrix, sparkline carousel, feed). `heroes2.mjs`: the five round 2 boards J1 to J5.
- `heroes3.mjs`: round 3, K1 to K5 (one dark stage that is also the lens, the full-width carousel, the same-money cards, the holdings table with an India/US filter and an "as of" version). `css-inv.mjs` also holds the night theme.
- `heroes.mjs`: the five heroes I1 to I5. `boards.mjs`: every board and the canvas page note. `css-inv.mjs`: Investments' own styles.
- `returns.mjs` and `returnsui.mjs` (2026-11-04): the key metrics for the final page: XIRR (RSU vest as cash in at fair value, ESPP at what he paid, a sale or sell-to-cover as cash out, dividends after tax as cash out), a holding's price CAGR, the gap to Nifty and the S&P, realised gain and made-up dividends; and the six-card Returns row, a holding's eight stats and a past day's eight cards. Only `InvFinal`, `InvPhone`, `InvStates` and `InvForms` use them; the exploration boards keep `kpiTrio`.
- `cash.mjs` and `cashui.mjs` (2026-11-04): cash at the brokers (PRD F-IV-18): two made-up accounts ($3,000 at Vested, ₹1,00,000 at Zerodha), their rupee value at today's rate, the idle share (6.3% of everything at the brokers), the cash after a trade, and the Cash at your brokers card (a summary tile and a ring-textured tile per account). Used by the final page (full width), the phone, state G (cash is old), the Paid from preview and the Add broker cash form. Cash stays outside the worth and the yearly return.
- `trades.mjs` (2026-11-08): the Trades page, round 1: T1 Tape (every trade by month, filters by kind, market and financial year), T2 Book (one holding: shares and average cost after each trade, a step chart), T3 Months (a calendar of money in and out). Every trade is folded again here to get the shares and average cost after each one.
