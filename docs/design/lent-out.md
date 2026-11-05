# Lent out page (`/lent`)

## Status: design final (2026-11-06): L3 Who owes what + the interest clock widget. Build planned (below), not started. Mockups only until then.

Prathik's lent-out data is already tracked (merged: `LentLoans` and `LentRepayments`, `lib/aggregate/lentOut.ts`, the Lent out line in net worth; see "Lent out" in [`../system-design.md`](../system-design.md)). Round 1 designed the page that shows it, and Prathik picked **L3 Who owes what** as the hero and asked for the L2 **Interest clock** to sit under it as its own widget. Mockups: [`design/lent-out/`](../../design/lent-out/), built by [`design/lent-out/generator/`](../../design/lent-out/generator/) (a rebuild overwrites the artboards, so change the generator).

## What the page answers

1. Who owes me what today, and how much of it is interest?
2. What does the money earn me a day, and how fast is the unpaid interest piling up?
3. For a loan that pays interest out, what was promised, what arrived, what is late or never came, and when is the next one?
4. How much rides on one borrower (a measure, never advice)?
5. What needs attention (a payout that is late or missing; a loan that has been out a long time with nothing back)?

## Sample data (read this first)

The three loans are his real ones, at "today" = Fri Nov 6, 2026:

| Loan | Lent | Terms | Owed today |
|---|---|---|---|
| Friend | ₹6,50,000 on 1 Oct 2024 | Accruing, 12% simple, nothing paid back; 766 days: interest ₹1,63,693, grows about ₹214 a day | ₹8,13,693 |
| Friend – ₹3L | ₹3,00,000 on 1 Nov 2025 | Paid-out ₹6,000 a month (24% a year); principal stays out | ₹3,00,000 |
| Friend – ₹1.82L | ₹1,82,000 on 1 Jan 2026 | Paid-out ₹18,000 a quarter (about 39.6% a year); principal stays out | ₹1,82,000 |

Total owed today ₹12,95,693, earning about ₹608 a day at today's pace. Every figure comes from `lentOut.ts`'s formulas (actual days ÷ 365, simple interest, never compounded), ported in `generator/data.mjs` with checks that stop the build if one drifts.

**The interest that arrived is made up.** The payout loans' interest is meant to arrive as Income (an income source per loan, matched to the bank statement), and there are no income entries yet. Every board that shows it carries a "Sample payments, made up" tag. The sample: ₹3L pays 10 of its 12 promised months (Feb never arrived, Nov is 5 days over, Mar came 9 days late), ₹1.82L pays all three quarters (Jul 3 days after the due day, inside the 3-day grace); so ₹1,14,000 of ₹1,26,000 promised has arrived. The Friend's 12% interest is never "missing": it is owed and unpaid by design. Repayments and closing days in the States board are examples.

Two assumptions to confirm: **the first payout falls one period after the day the money was lent** (so ₹3L's first was 1 Dec 2025); and **a payout is "late" up to 14 days over, "missing" after**, with a 3-day grace for "on time".

## Round 1 (2026-11-06)

Every hero board shares the greeting (**its figures point**: hover, focus or tap, as on Cards, Subscriptions and Fixed Income), an attention strip, and the same widgets under the hero (loans table, interest coming up, money back). Only the hero differs. Each hero is a coloured stage that takes the colour of what you pick (hidden radios and `:has()`, so it works with no script; open a board and click).

| Artboard | The hero's idea | Interactions |
|---|---|---|
| `LeL1` Promise ledger | A card per loan with a meter (principal out, interest received, interest owed or missing) and a row of dots for what was promised against what arrived; picking one opens its page: the figures and a ledger of every promise (or, for the 12% loan, what piled up by quarter). | Cards and Everything; the stage glides to the loan's colour |
| `LeL2` Interest clock | A dial of what the money earns, each loan an arc; the 12% pot ticking up beside the payouts, which come in lumps, on one chart of interest adding up since Oct 2024 with the picked period shaded. | A day, a month, a year (at today's pace), all time (really earned); each has its own colour |
| `L3` Who owes what **(picked)** | A block per loan sized by what it owes today; picking one shows the total without it, the share, and what the daily earnings would fall to. | Blocks and Everyone; the stage takes the loan's colour. Now the hero of `LeFinal`; its exploration board was dropped. |
| `LeL4` Year of promises | A column per month, Dec 2025 to now: what was promised (₹6,000 monthly, ₹18,000 quarterly) against what arrived, the missed month and the late one flagged; under it the 12% loan's unpaid interest as a ramp of monthly bars. | Columns and Whole year; each takes the colour of its verdict (on time, late, never came, waiting) |

Round 1's other boards (replaced by the final ones above): `LeForms` (Add a loan accruing and paid-out, with an income source offered for the payout loans; Record a repayment, and the warning when principal paid is more than is out; Mark repaid with the closing day required, and the empty-day error; Edit, with a preview of what a changed rate does; Delete with its repayments, confirmed), `LeStates` (nothing lent yet; a payout that is late; a loan repaid; an accruing loan after part of the principal came back, worked out in two stretches; sixteen made-up people), `LePhone` (L1 on a phone: the cards stack and the picked loan opens under them, the widgets stack, the forms are bottom sheets). All of it is labelled **Exploration** in `canvas.json`; nothing is final.

## The picked design (2026-11-06): L3 Who owes what + the interest clock widget

The canvas opens on four **FINAL** pages (`LeFinal` the page, `LePhone`, `LeStates`, `LeForms`); L1, L2 and L4 stay as one Exploration page, labelled "not picked". The earlier L1-based phone, states and forms boards were replaced, not kept (the owner's rule: when the design changes, every board changes).

**The page, top to bottom:** the greeting (its figures point), the attention strip, the **Who owes what** hero, the **Interest clock** widget, the loans table, **Interest coming up** beside **Money back** (they end level; `audit.sh` measures it).

**Decisions**
- **The hero is L3**: a block per loan sized by what it owes today; picking one shows the total *without* it, its share, and what the daily earnings would fall to. A measure of concentration, never advice. Paid-out blocks carry their promised-against-arrived dots and a "not here" flag; the 12% block carries its interest ramp.
- **The clock is its own widget**, not part of the hero. It has its own colour (a day gold, a month teal, a year indigo, all time green) scoped to the widget, so it never recolours with the hero's pick. It keeps the dial (an arc per loan, a sweeping hand), the day / month / year / all-time switch, the 12% pot beside the payouts, and the chart of interest adding up since Oct 2024. A day, a month and a year are at today's pace; all time is what has really piled up or fallen due.
- **Interest coming up leads with an overdue payout** (amber row), then the 12% loan's daily pile, then the dated payouts. Money back shows what arrived.
- **Past three borrowers the map becomes a scrolling list**, longest first, so sixteen people never become sixteen tiny blocks. A repaid loan owes ₹0, so its block leaves the map and a dashed "Repaid" strip stays under it; the shares recompute over what is still out.
- **Part of the principal returned**: the block shrinks to what is still owed, shows what came back as a dashed part of its meter, and the interest is worked out in two stretches (interest stops on what was paid back from the day it was paid).
- **A late payout** is flagged on its block, highlighted in its table row, leads Interest coming up, and is a red x on the clock's chart.
- **Forms** say where they open from (header buttons, a block's menu, a table row) and their previews show what happens to the blocks: the total, the share, who is left. Principal paid above what is out is a warning with "Record it anyway", not a block. Mark repaid requires the closing day. Delete confirms by typing the name and offers Mark repaid as the gentler option.
- **Phone**: the blocks stack (the biggest full width), the picked block opens under them, the clock is a widget with its own colour and switch, loans become cards, sixteen people are a scrolling list, and the forms are bottom sheets.

**Assumptions (3 and 4 confirmed by him 2026-11-06; 1 and 2 still to check against the bank)**
1. **The first payout falls one period after the day the money was lent** (so ₹3L's first was 1 Dec 2025). To check against the bank statement once real income entries exist.
2. **A payout is "on time" within 3 days of its due day, "late" up to 14 days over, then "missing".** The thresholds are mine.
3. **A missing payout is not added to owed today.** The ₹12,000 shows beside it (in the table, the attention strip, the clock), never inside it, because the maths treats a payout loan's interest as income, not a debt.
4. **An income source per payout loan** is offered by the Add form (checked by default); whether that is how he wants it linked, or a separate step in Income, is unconfirmed.

Still sample: the interest that *arrived* (₹1,14,000 of ₹1,26,000 promised), and every repayment, closing day and the sixteen people in the States board.

## Questions from round 1: where they stand

1. **Which hero**: answered, L3 plus the clock as its own widget.
2. **Income sources for payout loans**: the Add form creates one (checked by default); the loan keeps its id in `incomeSourceId` (task A1). **Answered yes, 2026-11-06.**
3. **When a payout is late or missing**: the 3-day grace is the rule Income already uses (`LATE_AFTER_DAYS` in `incomeSchedule.ts`), so it is not new. "Missing after 14 days" is new (`MISSING_AFTER_DAYS`). A missing payout is not added to owed today. **Answered yes, 2026-11-06: 14 days is proposed for monthly (quarterly follows the match window), and a missing payout is shown beside owed today, not in it.**
4. **The first payout date** (one period after lending) is checked against the bank once real income entries exist.
5. **L3's "without each" wording** is a measure of concentration, not a forecast; kept unless he says otherwise.
6. **Principal paid above what is out** is a warning with "Record it anyway", not a block (task B1).
7. **A paused (Inactive) income source** (found in #326's review): should the loan stop promising its payouts, or keep flagging them? Open, to settle with C2 to C4 (ADR 0014 records it).

## Build plan (2026-11-06): epics and tasks

Drafted here first so each task can be copied into an issue as it is, in the same shape as the Fixed Income plan. Nothing is created on GitHub yet. Labels: `feat`, `area:lent-out` (new), `P1`. One PR per task; `/code-review` before each merge; tests prove every money rule. The data layer, the maths of `lentOut.ts` and the net-worth line are already built (#305); this plan is the page, its forms and the income link.

**Order:** A0 and A1 first, then A2 to A4 (pure maths, in parallel), then B1 and B2, then C1 to C6, then D1. Each of C2 to C4 reads only the views A2 to A4 produce, so they can be built side by side once C1 (the shell) is in.

**A · Data and maths** (acceptance: every figure on the mockups comes from a pure function with a test; nothing is stored that can be worked out)
- **A0 · ADR 0014: lent-out payouts are Income, and a loan keeps the id of its income source.** Records: a Paid-out loan's interest arrives through an income source (so it is matched to the bank statement and shown on the Income page); the loan stores `incomeSourceId`; a missing payout is shown beside owed today, never inside it; the day count is actual days over 365. **His yes on Q2 and Q3 is in (2026-11-06).**
- **A1 · `LentLoans`: optional `incomeSourceId` and `color` columns.** `lib/sheets/lentLoans.ts` and `types.ts`; a rule that only a Paid-out loan has an `incomeSourceId`; `color` is one of the shared palette (`COLORS`), and a row without one gets a stable colour derived from its id, never from its place in the list, so repaying or deleting another loan doesn't recolour it. A real Sheet edit through `/api/dev/sheet-columns?tab=LentLoans` (with his OK), then `npm run check-sheet`, and a real round trip, sequentially.
- **A2 · `lib/aggregate/lentPromises.ts`: what a payout loan promised, and what arrived.** From the loan, its income source and the source's entries: each promised date (the income source's own schedule, from one period after the lent date), its verdict (Arrived on time, Late over `LATE_AFTER_DAYS`, Missing after `MISSING_AFTER_DAYS`, which must not be shorter than the income source's own match window (`MATCH_DAYS`: 15 days monthly, 45 quarterly) or the two pages would disagree about a payout that is still receivable; 14 is proposed for monthly and quarterly follows the window, Waiting), the promised, arrived and missing totals, the next due. Reuses `scheduledDates` and `receivedScheduledDates` (which count both ways from the source's `scheduleDate`, so **dates before the first payout are dropped**), so the Lent page and the Income page can never disagree about whether a payout arrived. **Tests:** a fixture shaped like the mockups' sample (₹3L pays 10 of 12 months, one never came, one 5 days over, one 9 days late; ₹1.82L pays all three quarters) gives ₹1,14,000 of ₹1,26,000; a payout 3 days late is on time and 4 days late is late; one entry cannot receive two dates; a loan with no income source says "not linked", never "missing"; no payout is promised before the first one (a loan lent 1 Nov 2025 promises from 1 Dec 2025).
- **A3 · `lib/aggregate/lentWho.ts`: who owes what.** Each loan's owed today and share of the whole; the total without each (and what is left as a percentage); what the daily earnings fall to without it; the biggest share; the borrowers past three (list, not blocks), longest first; a repaid loan owes ₹0 and leaves the map. **Tests:** shares add to 100%; without-each totals plus that loan's owed equal the whole; repaid loans change nothing but the strip.
- **A4 · `lib/aggregate/lentClock.ts`: the interest clock.** Earnings a day per loan (`principal still out × rate ÷ 365`), a month and a year at today's pace, and all time (**earned**: what has piled up on the 12% loan plus what the payout loans have promised so far; **received**: interest paid on the 12% loan plus the payouts that arrived; the difference is "not here yet", as the mockups show); the chart series of interest adding up since the first loan, with the shaded period and the missing marks. **Tests:** a day times 365 is a year; all time on the 12% loan equals `interestAccrued`; part of the principal returned makes the pace fall from that day (two stretches); a missing payout is a mark on the chart, is in earned (it was promised) and out of received.

**B · Writing** (acceptance: a real round trip against the Sheet for each action, then clean)
- **B1 · `app/lent/loanActions.ts`: add, edit, mark repaid and delete a loan; add a repayment.** Server actions, one validation each: **a repayment names a loan that exists; principal above what is out is a warning that "Record it anyway" confirms; marking repaid needs the closing day, not before the lent day; deleting a loan deletes its repayments first and refuses if one can't be deleted (as Loans does with installments).** This closes the three review findings #305 left for this page (the repayment's link, the cascade, over-repayment). **Tests** for each rule, including the over-repayment warning and the cascade.
- **B2 · Add a payout loan creates its income source.** One action: the source first (a name, the frequency, the usual amount, the first payout date as `scheduleDate`, `category` Investment, the bank statement text as `statementMatch`), then the loan with its `incomeSourceId`; if the loan fails the source is deleted again. Unchecking "set up an income source" saves the loan unlinked. **Tests:** both rows or neither; a failed second write leaves nothing behind.

**C · The page** (acceptance: the L3 page, its phone layout and its states match the mockups; the greeting's figures point; the empty state and the phone are checked in the browser, light and dark)
- **C1 · The shell: `/lent`, the sidebar entry, the greeting that points, the attention strip.** `app/lent/page.tsx`, `views.ts` and `greetingView.ts`, a `GreetingSentence` on `PointingSentence` (CLAUDE.md, "Every dashboard's greeting points"), the skipped-rows notice, the empty state. A test checks the sentence against the greeting cards.
- **C2 · Who owes what.** The blocks, the pick and its colour glide, the "without each" panel, the scrolling list past three borrowers, the repaid strip. From A3.
- **C3 · The interest clock.** The dial, the day / month / year / all-time switch (its own colour, never the hero's), the pot and the lumps, the chart. From A4.
- **C4 · The widgets.** The loans table (with a row menu: record a repayment, edit, mark repaid, delete), Interest coming up (an overdue payout leads), Money back. Cards that sit side by side end level (`audit.sh` equivalent, measured in the browser).
- **C5 · The forms.** Add a loan (accruing and paid-out), Record a repayment (with the warning), Mark repaid, Edit (the preview of a changed rate), Delete (typed name, Mark repaid offered first); dialogs on desktop and bottom sheets on the phone. Wired to B1 and B2.
- **C6 · States and the phone.** Nothing lent yet, a late payout, a repaid loan, part of the principal returned, sixteen people; the phone layout. Checked in the browser, light and dark, desktop and phone width.

**D · Wrap-up**
- **D1 · Overview and docs.** A late or missing payout, and a loan out a long time with nothing back, join "What needs attention"; the Lent out tile links to the page; the PRD statuses, `system-design.md` ("Lent out" loses its "not built yet" line) and ADR 0014's status.

**Not planned:** a Gmail label or statement reading for these payouts (the Income page's own statement reading already matches the bank credit by `statementMatch`); principal repayments read from a statement; lending in a foreign currency.

**Ready?** Per [process.md](../process.md) every task needs its open questions answered. Q2 and Q3 are answered, so every task is ready. Nothing waits on a question now. A3, A4, B1, C1, C2, C3 and C6 depend on no other task; **C4 and C5 read A2 and B2**, so they wait for those tasks, not for any answer (C4's loans table and Money back can be built first with the promised-against-arrived part left until A2). **Needed when the real income sources are set up (not to build):** the text each payout shows in his bank statement, for `statementMatch` (it has to come from a real credit line, which I haven't seen), and the borrowers' names (the loans are named "Friend" for now).
