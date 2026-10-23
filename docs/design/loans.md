# Loans page (`/loans`)

**Rounds 1 to 3 and the forms, 2026-10-25: heroes L1–L6, hands-on M1–M4, and one-page dashboards with a dark cover N1–N3; none picked yet.** Mockups: [`design/loans/`](../../design/loans/), built by [`design/loans/generator/`](../../design/loans/generator/) (a rebuild overwrites the artboards, so change the generator). Every loan, amount and date is made up; "today" is Oct 25, 2026.

Every board has the shared greeting (whose figures point), an attention strip while an EMI is due within a week, one hero, then the same shared widgets in a different order. The real layout is picked after the hero, as Income did.

| Artboard | The hero's idea |
|---|---|
| `LoansL1` The descent | What you owe, stacked by loan over twenty years, falling to the debt-free date. Flags where each loan ends, the peak, hover a year. Pick a loan to isolate it. |
| `LoansL2` EMI cliffs | What leaves every month as steps that fall when a loan ends, with what you'd pay after each. Hover a year. |
| `LoansL3` Payoff rings | A ring per loan for principal repaid, and a dot for how far through its term it is, so early EMIs that are mostly interest show as the dot running ahead of the ring. |
| `LoansL4` EMI tally | A tick for every EMI on one calendar: paid, paid late (amber cap), next (pulsing), still to come (outline). Hover a tick for its principal and interest. |
| `LoansL5` Cost anatomy | A bar per loan in multiples of what you borrowed (1× line): principal repaid and owed, interest paid and to come. The big figure is what each ₹1 costs (1.88× on the sample). |
| `LoansL6` Debt-free clock | A countdown (years, months, days) to the last EMI on a dark stage, a runway bar per loan, and what each loan ending does to the monthly total. |

Shared widgets: **Loans** table (borrowed, EMI, repaid bar, still owed, next EMI, ends), **Coming up** (next EMIs, Mark paid), **Schedule** (one loan's installments, a loan picker), **Principal and interest** by year, **Where the EMIs come from** (account or card), **Cost of borrowing**.

## Round 2: hands-on directions (M1 to M4), 2026-10-25

Prathik asked for a few cool, interactive variations with fewer visuals. Each page is the greeting, the attention strip, one hero you operate with chips (CSS only: radios and `:has()`, so they work in the preview), then the Loans table and Coming up.

| Artboard | What you do |
|---|---|
| `LoansM1` Time machine | Pick a date, past (the Apr 2025 peak) or future (Dec 2027, Apr 2029, ... Jul 2043). A wall of ₹1L bricks, one colour per loan, and the figures for that day. |
| `LoansM2` What if | Pick a loan and an extra monthly amount (none, ₹5,000, ₹10,000, ₹25,000). The balance curve against the scheduled one, the new finish date, interest saved and the extra put in. |
| `LoansM3` EMI anatomy | Pick a loan and an EMI (first, 12th, next, halfway, ...). The EMI split into principal and interest, and the whole loan's curve with a marker on it. |
| `LoansM4` Load gauge | Pick a moment (today, after each loan ends) and a salary (today's, +10%, +25%). A needle for the share of salary that goes to EMIs, with the amount left over. |

New numbers (each needs a yes and a test before building):

- **What if** follows the prepayment design in `system-design.md` (Loan, "Prepayments: designed 2026-10-25"). Pick a loan, an effect (**Reduce tenure**: same EMI, fewer of them; **Reduce EMI**: same end date, lower EMI; **Close**: foreclosure) and an amount. It shows interest saved and the bank's **charge** side by side, never netted, what you'd pay today (principal plus the charge as a separate debit), and the loan's limits as **warnings, not blocks** (HDFC's: after the first EMI, at most 25% of what's left, once a financial year, twice in the loan's life). Each loan starts with its usual effect (the sample's Personal loan reduces its EMI, the others reduce tenure) and its own charge rule (Personal: 4% + GST, 3% after 24 EMIs, 2% after 36; Car: 3% + GST; Home: none; all made up). **Every figure is an estimate**: the interest in the month of a prepayment follows the proposed rule (a normal month on the new balance, plus actual/365 interest on the prepaid amount for the days since the last EMI), to check against a bank letter.
- **Time machine** past dates use the installments' due dates (a balance is the principal less every installment due on or before the date), and a future date assumes every EMI is on time.
- **EMI load** uses Income's sample salary, and the zones (comfortable under 30%, stretched 30 to 40%, heavy over 40%) are placeholders.

## Round 4: payoff widget, colours and a tidier N1 (2026-10-25)

Prathik liked the tiles cover (N1) but said the circle doesn't look good, the principal and interest colours aren't great, and the widgets were off size. What changed:

- **Layout (N1 again):** every two-up row below the cover is the **same equal split** (as on Accounts and Income, so edges line up and cards end level), and the Loans table is full width (like Income's Sources table). The cover's two widgets are equal halves too. Order: cover; **Principal and interest** beside **Payments**; Loans; Schedule beside Coming up; Cost anatomy beside the clock; What if beside Inside an EMI; EMI load beside Cost of borrowing.
- **Payments card** is Subscriptions' Payments card for EMIs: the title carries the pick ("Payments · All loans"), a Payments / Prepayments toggle, a table (Loan, Paid on, Amount, Paid from, Status), "The 6 most recent of N this year", "View all installments", and a hint line ("Pick a loan tile for one loan's payments"). It keeps room for six rows. Prepayments is empty until there is one.
- **Payoff widget, five ways** (`LoansRings`): R1 clean rings (thinner, no dots, a legend instead of labels on the arcs), R2 half dial, R3 donut by what you owe, R4 capsules, R5 three dials. **Picked: R4 capsules** (2026-10-25).
- **Colours, six pairs** (`LoansPalettes`): P1 ink and amber, P2 sapphire and coral, P3 follows the loan (principal in the picked loan's colour, interest its tint), P4 teal and sand, P5 violet and lime, P6 solid and outline. **Picked: P6 solid and outline** (confirmed 2026-10-25). In N1 the interest is a dashed outline in the monthly chart, the EMI split, Cost anatomy and Inside an EMI, and its legend keys. The two colours are now `--c-prin` and `--c-int`, so a palette is one override.
- **EMI load, five ways** (`LoansGauge`; the dial with red, yellow and green blocks and a fat needle needed revising): G1 the salary as a bar (one segment per loan, 30% and 40% marks, what's left), G2 a waffle of 100 squares, G3 a thin arc with shaded zones in the page's own accent, G4 how the share falls as each loan ends, G5 a salary donut. All follow the pick. The zones and the salary (Income's sample) are placeholders. **Picked: G1, the salary as a bar** (2026-10-25), now in N1 in place of the dial.

## Round 3: one page, a dark cover that takes the loan's colour (N1 to N3), 2026-10-25

Prathik liked the hero visuals on the separate pages and asked for them together on a single page. The first try made the whole page dark; the ask was **a dark cover only, as on Subscriptions**, so the page stays light and only the cover on top is dark. Each page is the greeting and attention strip, the cover, and the widgets from rounds 1 and 2 cut down to cards: the descent, EMI cliffs, payoff rings, time machine (bricks), EMI tally, cost anatomy, debt-free clock, EMI load gauge, what-if prepayment, and inside an EMI.

**The pick drives the whole page** (CSS only, radios and `:has()`, so it works in the preview): the cover's background fades to the loan's colour (All loans is emerald, Home sapphire, Car copper, Personal violet), the page's accent follows it, every chart fades the other loans, and the widgets that show one loan's own numbers switch to it (the figures, the rings' centre, the clock, the gauge, the what-if and the EMI anatomy; with All loans they show the whole book, or the Personal loan for the what-if and the Home loan for the EMI anatomy).

| Artboard | The cover |
|---|---|
| `LoansN1` Tiles cover | **Picked by Prathik, then revised (2026-10-25).** The four loan tiles (the picker), the **EMI cliffs** (in place of the descent) and the rings. Under it, in the same place as Subscriptions' Payments, Cards' statements and Accounts' Balance history: **Principal and interest** month by month (a switch to by year, to the end) beside the **EMI history** card (the pick's paid EMIs, six rows kept so the card never changes height, a Prepayments view that is empty until there is one). Then the **Loans** table beside Coming up, the **Schedule** of the picked loan beside Cost anatomy, then the clock, what-if, gauge and inside an EMI. **No time machine and no EMI tally.** |
| `LoansN2` Figures cover | Pills, the big figures and the descent; widgets in two columns below. |
| `LoansN3` Rings cover | The rings on the left, pills, figures and the cliffs on the right; four sections below (where you are, where it's heading, what it costs, day by day). |

The cover is one `.nite` class that overrides the tokens for what's inside it (surfaces become translucent glass, hover cards stay solid), so any widget built on the tokens works on the cover or on the page. The what-if follows the prepayment rules above; the EMI load zones and the salary are still placeholders.

## Loan forms (`LoansForms`), 2026-10-25

Drawn after the prepayment rules were decided (see `system-design.md`): **Add loan** (first EMI date, stamp duty, pre-EMI interest, the loan's usual prepayment effect, charge and limits; the preview shows the net disbursed, with the numbers from the HDFC agreement), **Mark paid** (paying more than the EMI plus any overdue charge records the EMI at its own amount and creates a prepayment for the extra in the same save, and the form says so), **Add prepayment** (date, amount, effect defaulting to the loan's, the charge filled in from the loan's rule, the account paid from, and optional bank EMI and number of EMIs that replace the app's figures), an Undo toast, and the **cost of borrowing** with interest (pre-EMI interest included) and charges (processing fee, stamp duty, prepayment charges) shown apart and totalled.

The sample now carries the new Loan columns (`firstEmiDate`, `stampDuty`, `preEmiInterest`, `prepaymentEffect`) and builds its schedules the way the app does: due dates counted from the first EMI date, the EMI to the paisa, interest to the whole rupee.

## Numbers the mockups use

These are money rules; each needs a yes from Prathik and a test that proves the math before it's built (CLAUDE.md). The schedule itself is ADR 0004 and already built.

- **Still owed** is the sum of `principalDue` over installments not yet paid (`outstandingBalance`, built). **Repaid %** is principal repaid over principal borrowed, active loans only.
- **Interest still to come** is the sum of `interestDue` over pending installments; **interest paid** is the same over paid ones. Both are new aggregates.
- **Debt-free** is the last due date of the longest active loan; the countdown is whole months plus days from today.
- **Through its term** is installments paid over installments in the loan (the dot on L3).
- **Cost multiple** is (principal + all interest) over principal. Processing fees are shown beside it, not inside it.
- **Late** is an installment paid after its due date; late charges are the `overdueCharge` already on the row.
- **EMIs as a share of salary** (L2) uses Income's salary and is a **proposed** figure; nothing is built for it.
- **Paid from a card** counts once, as an EMI, and not again as card spending (the cross-cutting principle in `system-design.md`).

## Open decisions (defaults are what the mockups show)

1. Which hero: one of L1 to L6, or a mix (for instance L3's rings beside L2's cliffs).
2. Whether a closed loan stays in the table (dimmed, as drawn) or moves to a "Closed" filter.
3. New `Loans` columns: `color`, `icon` and the account or card the EMI usually leaves (`paidFrom`). Or colour from the category.
4. Whether "EMIs as a share of salary" is wanted at all (it links this page to Income).
5. The sample's late EMIs show late fees as given on the row. Whether an overdue-by-a-day EMI counts as late, or only after a grace period.

## Not done yet

The Installments page (all installments, as Cards' Statements and Income's Entries), the Edit loan form, a list of a loan's prepayments, phone layouts and the empty / one-loan / all-closed states. Rate changes are not drawn.
