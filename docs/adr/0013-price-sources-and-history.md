# 0013. Prices come from Yahoo, AMFI and Frankfurter, saved once a day

- **Status:** Accepted
- **Date:** 2026-11-05 (Prathik approved the Investments build plan, which recommends this, on 2026-11-05)

## Context
The Investments page needs what each holding is worth today, and its chart, lens, as-of view and yearly return need a daily price for every holding back to its first buy. PRD Q2 ("where do live prices and FX rates come from?", issue #2) was open. A spike on 2026-10-27 tested today's prices from keyless sources; a second spike on 2026-11-05 tested **history** for every ticker he actually holds. It passed:

- **Yahoo's chart API** returned five years of daily closes for his US stocks (NTAP, INTC, NVDA, ZS, OKLO, CEG, PLTR, AMD, PUBM, CHGG), his NSE stocks and ETFs (`NIFTYBEES.NS`, `GOLDCASE.NS`, `GROWW.NS`, `FSL.NS`, `HDFCAMC.NS`, and the rest), the indices (`^NSEI`, `^GSPC`) and `USDINR=X`.
- **Frankfurter** returns USD to INR for any past day and a whole range in one request.
- **AMFI's NAV file** is current and official for mutual funds. He holds none today.

Yahoo's chart API is unofficial: it has no contract and can change or start refusing requests.

## Decision
- Prices are fetched by one module, **`lib/prices/`**: Yahoo for stocks, ETFs and indices, AMFI for mutual funds (by scheme code), Frankfurter for USD to INR. A holding is tied to its source by an **`Instruments`** row (symbol, name, kind, price ticker, colour).
- Each day's closes are **saved to a `PriceSnapshots` tab** (date, symbol, close, currency), so the history is his own record and doesn't depend on a source being up. A backfill reads the past from the source when a holding is new.
- A holding **with no price source is valued at its cost, and the page says so** (design state E). A source that is down **keeps the last saved price and marks it stale with its date** (state B). Never a made-up price and never a quiet old one.
- A **young listing** (`GOLDCASE.NS` since March 2024, `GROWW.NS` since November 2025) reads as "since it began", never as a gap.
- Today's USD to INR stays as ADR 0012 decided it (Frankfurter's latest, cached, never a frozen rate). A **trade's** rate is frozen on its day (ADR 0003) and is Frankfurter's rate for that day.
- The source is **behind one seam** (`lib/prices/`), so replacing Yahoo means changing one module, not the page.

## Consequences
- Two new Sheet tabs, `Instruments` and `PriceSnapshots` (a Sheets Table validates writes against its dropdown text, so the tabs and dropdowns come first).
- `PriceSnapshots` grows by one row per instrument per trading day (about a dozen holdings, so a few thousand rows a year): fine for a Sheet, and read through the same cache as the other tabs.
- If Yahoo changes or blocks the API, new prices stop and the page shows stale figures until another source is written behind the seam. The saved history is kept.
- Prices are closes, not live ticks: "today" outside market hours is the last close, which the page already says ("Markets are shut: these are Friday's closes").
- Benchmarks (Nifty 50, S&P 500) and USD to INR history use the same saved snapshots, so the Race chart and the yearly-return gap need no other source.

## Alternatives considered
- **A paid or keyed API** (Alpha Vantage, Twelve Data, a broker API): reliable, but a key to keep, a rate limit to live within, and cost, for one user. Left as the replacement behind the seam if Yahoo stops working.
- **GOOGLEFINANCE in the Sheet:** no history that can be saved, and it needs formulas written into his Sheet.
- **Stooq:** returned 404 for everything in the 2026-10-27 spike.
- **Fetch history live on every page view:** slow, and the page would break whenever a source did. Saving once a day is what makes the history his own.
