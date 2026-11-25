# Heatmaps on a phone

## Status: board drawn and option D (Ledger) picked 2026-11-26; built the same day

Prathik found the heatmaps scroll sideways on a phone: the table is a year label, twelve months at 46 px minimum and a total column, about 700 px, inside a 390 px card. The Overview's five stacked rows did the same. Board: [`design/phone-heatmap/PhoneHeatmap.html`](../../design/phone-heatmap/PhoneHeatmap.html), four options drawn on three cases (Cards and Income, the Overview's five for a year, the Overview past a year), with a width switcher (390, 360, 340):

| Option | What it is |
|---|---|
| A Tiles | A year as a 4 × 3 block of big month tiles; older years fold to a one-line strip |
| B On its side | The same heatmap turned: months down, years or the five measures across |
| C Small cells + readout | Twelve small squares per row, the figure in a readout when touched |
| **D Ledger (picked)** | A row per month with a bar the length of its amount and the heat shade on it |

## What D is, as built

- **Only on a phone** (under Tailwind's `sm`, 640 px). From a laptop up nothing changes; the table is `hidden sm:block` and the ledger `sm:hidden`.
- **Cards and Income** (`SpendHeatmap` draws both): `HeatmapLedger` (`components/cards/`). A chip per year, newest first, with its total, picks which year's months show (no chips when one year is shown). A row is the month, a bar, and the amount (`₹95.8k`). The bar is the month's amount over the biggest month shown **across all years**, the same scale the shades use, so a bar and its shade agree; a bar is never under 8 % so the smallest month still shows its shade. Marks as in the table: a ring on this month, "Peak" on the peak bar, hatching for no data, a dashed row for a month still to come (Income's holds what is expected). A month outside a range is left out. The year's line under it: months, total, average. Tapping a row opens the same month card as a cell (`data-month`, `MonthCardHover`).
- **Overview, one measure** (a button picked, or past a year): the same `SpendHeatmap`, so the same ledger.
- **Overview, all five** (`TogetherLedger` in `MonthByMonth.tsx`): a row per month with five thin bars, one per measure, each in its own hue and on its own scale (so a month's bars are not comparable with each other, as the table's rows are not). A month opens to list its five figures; the latest month with a figure is open to start with. No month card here; the open list is the card.
- The math is `lib/aggregate/heatLedger.ts` (`barWidth`, `maxAmount`, `ledgerYears`), tested.

## Defaults taken (he can change them)

- Newest year first on a phone (the laptop table runs oldest first).
- Past a year the Overview stays one measure at a time, as it is today.
- A year's total sits in the line under the ledger.

## Not built

- A, B and C stay on the board only.
- Subscriptions' day-by-day grid already has its own phone layout and is untouched.
