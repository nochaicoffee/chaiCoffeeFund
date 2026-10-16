# 0003. Use INR as the base currency and freeze each trade's FX rate

- **Status:** Accepted
- **Date:** August 2026 (recorded 2026-10-16)

## Context
Holdings span Indian and US markets, including NetApp RSU and ESPP shares priced in USD. A US position's INR figures answer two different questions. Cost basis depends on the exchange rate on the trade date, which is a historical fact. Current value depends on today's rate.

## Decision
- INR is the app's base currency.
- Each `InvestmentTransaction` with `market: US` stores its own `fxRateToInr`, captured once at entry and never recomputed. The create schema rejects a US trade without it.
- Current portfolio value uses a live USD→INR rate, from the planned `Prices` tab.
- Positions are never stored. They're derived from the transaction log with weighted-average cost basis.
- RSU vests and ESPP purchases are logged as ordinary `Buy` trades tagged by `source`. There's no vesting-schedule or tax-lot tracking.

## Consequences
- Historical cost basis never shifts when rates move.
- Each US trade needs an FX rate at entry. The source for that rate, and for live prices, is still an open question (see the PRD).
- Weighted-average cost isn't FIFO. That's fine for the stated need (current holdings and cost basis), but not for capital-gains tax reporting.

## Alternatives considered
- **One live FX rate for everything:** misstates historical cost basis.
- **FIFO lots:** more complex, and not needed for the stated goal.
