# Income page (`/income`) and Entries page (`/income/entries`)

**Final 2026-10-24: Z1, with the E1 Ledger and E3 Passbook. Build from "The final design" at the end; the rounds below are the history. Round 1, 2026-10-24. Round 2 is the hero picked: I4, Year in columns (2026-10-24); Z1, the Income map, picked 2026-10-24 (#184) as the visual beside the Entries card, in round 3's layout. The Entries page is E1, the Ledger, for all sources, and E3, the Passbook, when one source is picked (2026-10-24).** Mockups: [`design/income/`](../../design/income/), built by [`design/income/generator/`](../../design/income/generator/) (a rebuild overwrites the artboards, so change the generator). Every source, amount and date is made up; "today" is Oct 24, 2026. Read `IncomeReadme.dc.html` first: it holds the same decisions as this page, drawn.

| Artboard | What it shows |
|---|---|
| `IncomeI1` Payday river | A lane per source across the year, a bead per payment sized by its amount. Pick a lane to follow it. |
| `IncomeI2` Money flow | A Sankey from sources to the accounts they land in, a dashed ribbon for what's pending. Pick a source or account. |
| `IncomeI3` Income wheel | The year as a wheel, a spoke per month stacked by source. Pick a month to open its payments. On the deep green stage. |
| `IncomeI4` Year in columns | Twelve stacked columns, a usual-month line, By source / Regular and bonus, chips that light one source. |
| `IncomeE1` Ledger | Entries page in Renewals' layout: tiles, filters, month groups, a row per payment. |
| `IncomeE2` Pay grid | Entries page as sources by months, with the entry behind a picked cell. |
| `IncomeE3` Passbook | Entries page for one source at a time: facts, a year of bars, a timeline. |

## Round 4: visuals without RSU and ESPP (Z8 to Z11), 2026-10-24

RSU and ESPP aren't income (decision 7), so the salary is about 93% of the year and Z1's map turned into one big block with slivers too thin to pick. Prathik asked for alternatives in that slot. Each one is Z1's page, heatmap included, with a different visual: **Z8 Year rings** (a ring per source showing how much of its own 2026 has landed, so every ring is the same size), **Z9 Lens** (the salary against everything else, with the rest blown up into its own ring beside it), **Z10 Pay ladder** (every payment as a dot on a ₹2k–₹3L scale that grows ×10 every two lines, a row per source), **Z11 Receipt** (the year so far as a till receipt: a line per source, subtotals by tag, the total, what's still owed). Z4 to Z7 are redrawn without RSU and ESPP too (their older heatmap-less page). Z1 stays picked until one of these replaces it. Older rounds were drawn with RSU and ESPP and are kept as they were (`frozen` in the generator, never rebuilt); the preview shows only the boards still in play.

## Round 3: the layout Prathik described (Z1 to Z7), 2026-10-24

Five rows: (1) the I4 cover, full width; (2) a colourful visual to the left of the Entries card, like Subscriptions' cost map beside Payments; (3) one wide **Trends** card, This year and last with a switch to Month by month and **Pay rhythm**; (4) every source (the I4 table); (5) the **Pay calendar** beside **Pay changes**, drawn as bars in each source's colour (a switch for By % or In ₹) rather than a list. Z1 Income map (blocks sized by what each pays, a Received / A usual month switch), Z2 Bento (a tile per source with a year of months), Z3 Bubbles. Every visual is also a picker: the cover, the Entries card, the Sources table, the rhythm and the calendar follow the pick.

**Z4 to Z7** (asked for after Z1 to Z3 looked too much like the other dashboards' blocks): the same page with a visual that isn't a block or a tile. **Z4 Payday orbits** (a ring per source, a planet sized by what it pays and placed by how far through its cycle it is; 12 o'clock is payday, an unpaid planet that passes it turns amber), **Z5 Coins** (every coin is ₹10,000, dashed for what's still to come), **Z6 Payday dial** (the days of the month round a dial, a dot per payment on the day it landed, the usual window shaded), **Z7 Vials** (a beaker of the year filling in layers, a tube per source showing how full its year is). All four are pickers like Z1 to Z3. New numbers: the cycle position (days since the last expected date over the days to the next) and how full a source's year is (received over received + pending + expected to Dec 31).

**Z1 picked, 2026-10-24, with the income heatmap.** Straight under the cover, built the way the Cards dashboard's spending heatmap is (`SpendHeatmap`): a row of twelve months per year (2026 and 2025 here; the period pill moves them), shaded 1 to 5 against the biggest month shown (`heatLevel`, the same rule), the peak and this month marked, a dashed cell for a month still to come, hatching for a month with no payment, and each year's total with its monthly average on the right. The cells have the ring texture and a hover card with the month's split by source. It follows the cover's pick: pick RSUs and the cells are the RSUs' months only. Only Z1 has it so far.

**The cover's actions** (`IncomeZForms`), as on the Subscriptions and Accounts heroes: All sources offers Record income and Add source; a source offers Mark received (while it's pending), Record income, Edit source, a ⋯ menu (Mark inactive, Delete source) and a link into its entries (the Passbook layout, E3). The right-hand figures become the pick's: usual amount, next, last paid, where it lands, on time. Forms: Edit source (a live preview of its block, and what a usual month becomes), Mark received (Record income opened on the pending entry; received date starts today, amount starts at the usual one), an Undo toast for 6 seconds, and a delete confirm that says what goes with it and offers Mark inactive instead. An income entry records income only; balances are updated on the Accounts page.

## Round 2: I4's hero with different widgets (Y1 to Y4)

`IncomeY1` Everyday, `IncomeY2` Planner, `IncomeY3` Analyst, `IncomeY4` Records-led: the same hero, greeting and attention strip, never more than two widgets in a row. Every page has the Sources table, Pay calendar, Pay rhythm, This year and last (switch: Running total / Month by month) and an Entries card (switch: Entries / Pay changes, link to the Entries page); they differ in order, pairing and which new widgets they carry. The hero's source chips also drive the Entries card, Sources table, Pay rhythm and Pay calendar.

New widgets: **Financial year** (India's Apr to Mar: received so far, still expected at usual amounts with no bonus assumed, against last FY and the same point of it), **What's ahead** (next six months from each schedule), **Salary, investments and one-offs** (by category, and what investments pay a month: ₹8,200 on the sample), **Pay changes** (payments 2% or more off the one before).

New numbers to confirm before building: the financial year projection (received + pending + each active source's schedule to Mar 31, at its usual amount, no bonus), and "what investments pay a month" (the monthly equivalents of Investment-category sources).

## What every dashboard has

Like Cards, Subscriptions and Accounts: a main page and a page that lists every record. The main page opens with the shared greeting (eyebrow, "Good afternoon, Prathik", one sentence whose bold figures point, per CLAUDE.md), an attention strip while income is pending, the hero, then widgets. The Entries page has the back link, the period pill, Refresh and Record income, four tiles, and the records.

## The widgets and what they answer

Month by month (what landed when), Sources (F-IN-01, with a usual amount, a month's worth, a year of months, next, where it lands), Coming up (pending first, then each schedule's next), Where it lands (income by account), Pay rhythm (days between expected and received), This year and last (cumulative, same days), Where it comes from, Regular, bonus and one-off (what a usual month is without bonuses), Pay calendar.

## Numbers (definitions the mockups use)

These are money rules; each needs a yes from Prathik and then a test that proves the math before it's built (CLAUDE.md).

- **A month's income** is what was received in it, by the date it landed. Pending and expected entries are shown, never counted.
- **A usual month (expected)** is the sum of each active source's amount over the months in its cycle (`monthlyEq`): ₹2,24,700 on the sample. One-time sources have none. The greeting's "about ₹2,33,000 a month" is received divided by the months so far, a different number (open decision 1).
- **Against last year** compares Jan 1 to today in both years.
- **Late** is received more than 3 days after it was expected. **Pending** is past its expected date (from the day after) and not received (PRD §8). **Upcoming** is computed from each source's schedule at its usual amount; nothing is saved until it's received.
- **Change** compares a payment with the one before it from the same source and tag, ignored under 2% (Subscriptions' rule).
- Loan repayments and transfers between your own accounts are never income (PRD).

## Open decisions (defaults are what the mockups show)

1. Which usual month leads: the sources' (₹2,24,700) in the figures and the received average in the greeting, or one of them.
2. Late means more than 3 days, for every source, or a number per source.
3. A payment counts in the month it landed, or in the month it was expected.
4. New `IncomeSources` columns: `color`, `icon`, and the account it usually lands in. Or colour from the category.
5. Tags: Regular is anything on a schedule, Bonus is variable pay on top (the March bonus is an entry on Salary), Other is a one-off.
6. Pending entries: computed and saved only when received, or the app writes one per expected payment.
7. RSU and ESPP amounts are what landed in the bank, after tax. The next vest's ₹2,10,000 is a guess.
8. Irregular sources (dividends) go pending the day after their usual date, or can be marked never to.

## Not done yet

Phone layouts, states (no income, one source, a quiet month) and forms (Add source, Record income, Edit entry, Mark received), to come once a direction is picked. The sample figures are not reconciled with the Accounts mockups' "Came in".

## The final design (2026-10-24, #184)

This section is the source of truth for building `/income` and `/income/entries` (#185–#191).

- **`/income` is `IncomeZ1`**, top to bottom: the greeting whose figures point; the attention strip while income is pending; the I4 **Year in columns** cover (stacked month columns, a usual-month line, By source / Regular and bonus, source chips, the pick's figures on the right, and the cover's actions from `IncomeZForms`); the **income heatmap** (2026 and 2025, Cards' spending heatmap grammar, follows the pick); the **Income map** (blocks sized by what each source paid, Received / A usual month) beside the **Entries** card (Entries / Pay changes); one wide **Trends** card (This year and last, Month by month, Pay rhythm); the **Sources** table; the **Pay calendar** beside **Pay changes**. Every visual is also a picker for the cover.
- Prathik kept the block map after seeing it without RSU and ESPP (Salary ≈ 93%, the rest thin) and after round 4's alternatives. The small blocks stay pickable from the cover's source chips too.
- **`/income/entries` is `IncomeE1`, the Ledger**, for all sources; picking one source (from its filter, or a source's "see its entries" on the cover) shows **`IncomeE3`, the Passbook**, for that source.
- **Forms** are `IncomeZForms`: Add / Edit source (with colour, the account it lands in and the statement text that identifies it, for #187), Record income, Mark received, an Undo toast, and a delete confirm that offers Mark inactive.
- **Numbers**: PRD §8, "F-IN-01 and F-IN-02". RSU and ESPP are not income.
- **Not drawn:** phone layouts and the empty / one-source / quiet-month states. Prathik asked to start building on 2026-10-24; they follow the Accounts page's phone and state patterns and are built with each page task.

