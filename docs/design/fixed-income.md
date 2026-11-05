# Fixed Income page (`/fixed-income`)

## Status: design final (2026-11-04): J1 Doors + widgets, on his real numbers. Nothing built.

Prathik asked to start designing the Fixed Income dashboard on 2026-11-04. Mockups: [`design/fixed-income/`](../../design/fixed-income/), built by [`design/fixed-income/generator/`](../../design/fixed-income/generator/) (a rebuild overwrites the artboards, so change the generator). The earlier `design/dashboards/FixedIncomeList.dc.html` was not used (the same fate as the stale Investments mock). Not committed.

## Decisions made (2026-11-04)

- **Scope: FDs + RDs + passbook holdings.** Fixed deposits, recurring deposits (an FD plus a generated monthly deposit schedule, PRD Q1's proposal), the NSC (a certificate with a quoted maturity), and EPF, PPF and NPS as holdings with contributions and a dated "passbook says" balance (PRD Q1/Q9 proposals). This answers the *scope*; the data-model questions in the PRD stay open until built.
- **Round 1 draws every idea he ticked, plus two I added** (tax year, real return).
- **Made-up sample data**, as Goals and Investments did.

## What the page answers

1. What is it worth now, what has it earned, what does it earn each day?
2. What matures when, and are there stretches with nothing to reinvest?
3. How much sits with each bank against the insured cover, and what stands behind the money?
4. What do these deposits pay this tax year, and who cuts tax at source?
5. After tax and inflation, what is really left?
6. What needs attention (a matured deposit not yet closed; a bank over the cover)?

Fixed Income is its own page; Investments (including debt funds and gold ETFs) is separate.

## Round 1 (2026-11-04)

Every board shares the greeting (**its figures point**), an attention strip, and the same widgets underneath (deposits table, coming up, passbook holdings). Only the hero differs. Each hero is a **measure against numbers he sets** (tax slab, inflation, bank cover), never advice.

| Artboard | The hero's idea |
|---|---|
| `FiF1` Ladder | Bars by maturity month with what comes back, split by bank; shaded stretches where nothing matures; a "Due" rung for a matured deposit not yet closed. |
| `FiF2` Meter | A gauge of rupees earned a day, split by deposit; beside it the interest piling up across the tax year with maturities marked. |
| `FiF3` Vault | A paper certificate per deposit: bank spine, worth today, ribbon for how far through its term, stamp for its state. |
| `FiF4` Cover | Each bank against the cover line (deposits plus the savings held there, from Accounts), and one strip of who stands behind all of it. |
| `FiF5` Tax year | Interest by payer for April to March against each payer's limit before tax is cut at source, and the months. |
| `FiF6` Real return | A waterfall from the quoted rate to what is left after compounding, tax and inflation, and a dumbbell for each deposit (EPF and PPF assumed tax-free). |

## Round 2 (2026-11-04): coloured stages you pick from

Prathik said the other dashboards have a colourful hero with good interaction and asked for the same here. Four stages that **take the colour of whatever you pick** (a hidden radio and `:has()`, so it works with no script; open any `FiG*.dc.html` and click). Each is built from fixed income's own world, not the Cards, Subscriptions or Accounts patterns.

| Artboard | The stage's idea | Interactions |
|---|---|---|
| `FiG1` Ladder pick | The maturity ladder is the picker. "Everything" shows what you'd hold month by month as each deposit matures and leaves; a rung opens that deposit: its worth, four figures and its steps. | Rungs and Everything; the whole stage glides to the bank's colour |
| `FiG2` Bank doors | A tall coloured door per bank (plus All banks) with a stack of its deposits. A bank opens its cover bar, its deposits and its tax-year interest against the limit. | Doors; recolours |
| `FiG3` Bubbles | Rate against time left, one bubble per deposit (size is money), with EPF and PPF in an open-ended column. A bubble opens its panel. | Bubbles; recolours; hover grows |
| `FiG4` Interest stage | Chips for a day, a month, this tax year and all time swap the big number, its four figures and the by-deposit bars. | Chips; each period has its own colour |

All use the same greeting, attention strip and widgets as round 1. The steps in G1's per-deposit chart are illustrative (quarterly compounding drawn from the quoted rate); the app keeps only what was placed and the quoted maturity amount.

## Round 3 (2026-11-04): redrawn on his real numbers

Prathik shared a screenshot of his FD app and four EPFO passbook PDFs (FY 23-24 to FY 26-27) and asked whether the design fit. Partly. The balance-on-a-date idea matches the passbook exactly, but the scale and shape of his data differ from the made-up sample, so round 3 uses his real figures (his UAN and date of birth are left out; the deposits' bank is not shown on his screenshot, so it is "not set"). Rounds 1 and 2 stay, labelled **Exploration · made-up data**; the sample data is `generator/data-sample.mjs`, the real data `generator/data.mjs`.

**What his data showed:**
- **EPF is the main holding: ₹9.53L against ₹1.23L of deposits (89%).** It leads the page; it was a side card.
- **EPF is two balances** (employee and employer, ₹4,76,283 each, pension ₹0), credited about a month after the wage month (June's wages came late, on 26 July), ₹39,308 a month since the July 2026 wage rise, interest credited each 31 March.
- **His deposits are seven small FDs** (₹15,000 each, one ₹30,000, all 7.75%, 18 months 1 day or 2 years, started about monthly since March): ₹3,020 earned so far. His app shows a start date and tenure, not a maturity date, amount or bank.
- **The bank-cover and tax-year boards (F4, F5, G2) matter little at ₹1.2L and ₹3,020 of interest**, so round 3 drops them. The ladder, interest and certificate ideas suit him.
- **PPF and NPS in the earlier sample were invented**; whether he holds them is unanswered.

**A check the design stands on (verified in `data.mjs`):** EPF interest is, each month, the balance at the start of the month times 8.25% ÷ 12, summed, with a contribution counted from the month after it is credited. It reproduces his credited interest **to the rupee** for FY 24-25 (₹14,422) and FY 25-26 (₹40,924). So the earlier line "the app never works out EPF interest" can relax to a labelled estimate: about ₹39,008 built up this year, not credited (needs his yes before it is built). His FDs' accrued interest matches quarterly compounding, accrued daily, within ₹2.50 on each.

| Artboard | The idea |
|---|---|
| `FiH1` Two pillars | Three coloured doors (Everything, EPF, Fixed deposits). Everything: what you've built up since your first contribution. EPF: every contribution and each March's interest. Deposits: the seven across time. |
| `FiH2` Ladder pick | A rung per deposit, plus EPF and the deposits as a whole; the stage follows the pick. |
| `FiH3` Interest stage | A day, a month, this year or all time: EPF against each deposit. |
| `FiH4` Drawer | An EPF passbook and a certificate per deposit. |
| `FiH5` Real return | Deposits against EPF after tax and inflation (EPF assumed tax-free; check). |

The greeting, attention strip (EPF interest not credited yet; deposits missing a bank and maturity amount), deposits table, coming up and an EPF card sit under every board.

## The picked design (2026-11-04): J1 Doors + widgets

Prathik picked **J1** (the three coloured doors Everything, EPF and Fixed deposits, with Money in each month, Credits on time, Growth path, the deposits table, Coming up and the EPF card). Mockups in [`design/fixed-income/`](../../design/fixed-income/): the canvas opens on four **FINAL** pages, the page (`FiJ1`), the phone (`FiPhone`, seven phones), the states (`FiStates`) and the forms (`FiForms`); everything else is labelled Exploration (rounds 1 and 2 on made-up data, round 3's H boards, and J2 Pillars, which was not picked).

- **Phone:** the doors slide sideways, the stage is one column, the widgets stack; Add EPF statement is a bottom sheet followed by a review sheet.
- **States:** nothing yet; an EPF credit that is late (credits have come about the 17th since June, so one at the 25th is flagged, but only once the passbook has been refreshed past that day); a deposit matured and not closed; the year's interest arriving against its estimate (the credited figure replaces the estimate, and the difference is shown); matured and pre-closed deposits; and **a passbook that stops short** (months it confirms count, the rest are expected and not in the balance, a month you type is marked typed). Dates after today are examples.
- **Forms:** Add an EPF statement (drop the PDF), Review (the checks pass), Review (the totals don't add up: nothing is saved, **and it can be fixed in place** by editing a row or adding the missing one, with the checks re-running), Review after the fix (the added row is marked typed), a credit that conflicts with one already there (choose the passbook's or yours), Already imported (idempotent), Add a deposit (start date and tenure; bank and maturity amount optional), Add a contribution (typed, less certain, replaced by the passbook's own row when imported), **Add what EPFO credited** (a year's interest or an opening balance, typed), Close a deposit with Undo (at maturity or pre-closed), EPF settings (**a rate for each year with its source**, and the monthly credit for the growth path).

**The EPF statement import (decided in chat 2026-11-04, not built):** drop the PDF into the app first; a Gmail label can come later as a thin second entry calling the same parser. One pure function takes the PDF bytes and returns the rows and checks (opening + credits + interest = closing; the rows add to the "Total Contributions" line; EPFO's credited interest against the 8.25% rule), tested against his four passbooks, which the app's own pdf.js reads cleanly (33 credits, all four years reconcile). The review screen shows every row first; a credit is identified by its account and wage month (a year's interest by its account and financial year) and is never added twice; a different day or amount for one already there is shown as a conflict; his UAN, date of birth and member ID are never saved. Needs its own decision record first (PRD F-IV-07).

**Proposed PRD rows (not yet added; the PRD is being edited by another session):** F-FI-03 EPF as contributions plus yearly interest per share, with the statement import; F-FI-04 the EPF interest estimate (balance at the start of each month × rate ÷ 12, summed, credited each March), reproducing his credited interest to the rupee for FY 24-25 and FY 25-26, labelled an estimate until credited; F-FI-05 a deposit entered by start date and tenure with the bank and maturity amount optional; F-FI-06 the money-in grid, credits on time and the growth path. And Q1's answer for EPF: contributions plus yearly interest, not a single balance.

## Plan (2026-11-04): epics and tasks, in milestone `M4 · Wealth`

Drafted here first so each can be copied into an issue as it is. Labels: `feat`, `area:fixed-income`, `P1` (`P0` for deposits). One PR per task; `/code-review` before each merge; tests prove any money math. Nothing is created on GitHub yet.

**Order:** B1 and A1 first (the math), then A2 and B2 (the data), then A3, B3 and C1 (forms and the parser), then C2, then D1 to D4. A and B/C can be built in parallel; D follows both.

| Epic | PRD | Tasks |
|---|---|---|
| **#28 · Fixed deposits** (existing, update its body) | F-FI-01 | A1, A2, A3 |
| **#29 · EPF: contributions and yearly interest** (existing, retitle from "EPF, PPF, NSC and RD") | F-FI-02 | B1, B2, B3 |
| **EPF statement import** (new) | F-FI-04 | C1, C2 |
| **The Fixed Income page** (new) | F-FI-03 | D1, D2, D3, D4 |

**A · Fixed deposits** (acceptance: a deposit is added by start date and tenure; worth today matches his app; closing records what was received, with Undo; real round trip against the Sheet, then clean)
- **A1 · `lib/aggregate/fixedDeposits.ts`: worth today by quarterly compounding.** `principal × (1 + rate/4)^(4 × days/365)`, with the bank's maturity amount winning at the end when stored. A test proves it against his seven deposits' accrued interest within ₹2.50 each, and that a deposit is worth its principal on its start day and its maturity amount on its end. `netWorth.ts` and the Overview use it. **Needs his yes** (replaces the built linear estimate).
- **A2 · Deposit schema and layer: bank and maturity amount optional, maturity from tenure.** `lib/sheets/fixedDeposits.ts`; **adds three optional columns to the `FixedDeposits` tab, `closedDate`, `receivedAmount` and `closeKind`, which A3's Close form needs (a real Sheet edit, with his OK, through the dev columns route, then `check-sheet`)**; a pure helper turns a start date and a tenure (months and days) into a maturity date; `rowRules` keep the other checks; a real create, update, read and delete round trip, then clean.
- **A3 · Deposit forms: Add (start + tenure), Edit, Close with Undo. Built 2026-11-05 (on the stub page, with a plain list, until #268).** The forms in `FiForms`: Add a deposit; Close a deposit (money received, the day, at maturity or pre-closed, into which account). "Matured and pre-closed" list.

**B · EPF** (acceptance: EPF is contributions plus yearly interest per share; the balance is worked out; the interest not yet credited is an estimate that is labelled; typed credits are marked; real round trip)
- **B1 · `lib/aggregate/epf.ts` and tests.** The rate for each year and its source (implied from the credited interest, assumed for the year in progress); each wage month as Confirmed, Typed, Expected or Late from the passbook's print date (a typed credit a later passbook contradicts is flagged); the balance on a day per share; the interest rule (each month's start balance × rate ÷ 12, summed, credited each 31 March); the year-end estimate; the growth path; days from the wage month to each credit and the late-credit rule; money in each month; the "opening + credits + interest = closing" check. **Tests:** the rule gives ₹14,422 for FY 2024-25 and ₹40,924 for FY 2025-26 from the contributions in his passbooks (as fixture numbers, not the PDFs), a single credit grows exactly as the rule says, and the growth path matches a hand-worked case. **Needs his yes on the rule.**
- **B2 · `EpfAccounts`, `EpfEntries` and `EpfRates`: types, sheet layer, routes.** The three tabs as in ADR 0011 (`confirmedThrough` on the account; `EpfRates` holds only Declared and Assumed rates, the implied rate is worked out) (`createCrudRoutes` factories, a cached list and a tag, the entry in `checkedRepositories`); build the tabs in the Sheet (with his OK, through the dev columns route as for the other tabs); `npm run check-sheet`; a real round trip, sequentially. **Needs ADR 0011 accepted.**
- **B3 · EPF forms (built 2026-11-05; on the stub page, with a plain list of the rows, until #268): Add a contribution (typed), Add what EPFO credited (interest or an opening balance), EPF settings (a rate for each year), edit and delete.** A typed row is marked as less certain, and the passbook's row replaces it on import.

**C · EPF statement import** (acceptance: a real passbook imports; one that doesn't reconcile saves nothing; importing twice changes nothing; no UAN, date of birth or member ID is stored)
- **C1 · `lib/epfStatement/`: the parser, pure.** PDF bytes to rows and checks, using `decryptAndExtractText`. **Tests** use a synthetic PDF built locally (never a real passbook): the rows, the two checks that decide acceptance (the rows add to the printed total; opening + credits + interest = closing, per share; the third, the credited interest against the rule at the year's rate, needs the account's rates and sits in the import, C2), a file that doesn't add up, a row it can't read (refused for review, never guessed), and an output with no identifiers beyond the member ID's last four.
- **C2 · "Add EPF statement": upload, review, confirm. Built 2026-11-05 (one year's file at a time; the button is on the stub page until #268).** The server action that plans the import (matches the account by its last four, finds what is already there by wage month and day, replaces a typed credit), shows the review (which can be corrected in place: fix a row, add a missing one as typed, resolve a conflict, with the checks re-running; the interest EPFO credited is compared with the rule and a difference is shown, never overwriting it), sets the account's `confirmedThrough` from the file's print date, and writes the new rows and the year's interest in one batch only after he confirms; the forms in `FiForms` (drop, review passes, review fails, already imported).

**D · The page** (acceptance: the J1 page, its phone layout and its states match the mockups; the greeting's figures point; empty state and the phone checked in the browser, light and dark)
- **D1 · Page shell, greeting that points, attention and the three doors.** `src/app/fixed-income/`, `greetingView.ts` and a `GreetingSentence` on `PointingSentence`; the stage for Everything, EPF and Deposits (with `ComingSoon` removed).
- **D2 · The widgets.** Money in each month, Credits on time (with the passbook check), Growth path, the deposits table, Coming up and the EPF card.
- **D3 · States and the phone layout.** Nothing yet, a late credit, a deposit matured and not closed, the year's interest arriving against its estimate, and closed deposits; the phone layout and its bottom sheets.
- **D4 · Overview: EPF in net worth, attention items, docs.** Net worth counts EPF at the passbook figure (credits plus credited interest, never the estimate); a late credit and a matured, unclosed deposit join "what needs attention"; the PRD statuses, `system-design.md` and ADR 0011's status.

**Not planned yet:** F-FI-05 (a Gmail label as a second way in) and F-FI-06 (PPF, NSC, RD and NPS). They wait on whether he holds PPF or NPS and on a real statement for each.

**Ready?** Per [process.md](../process.md), every task needs its open questions answered. The EPF tasks have none open. A1 and B1 need his yes on a money rule, B2 needs ADR 0011 accepted, and none depends on which bank the deposits are with (the bank is optional).

## Round 4 (2026-11-04): the pillars, and three widgets

Prathik liked H1 Two pillars and asked what was missing, for variations, and for cooler interactions. `FiJ1` is H1 as it was (three coloured doors); `FiJ2` is a literal-pillars variation. Both carry the same three new widgets.

| Artboard | What it adds |
|---|---|
| `FiJ1` Doors + widgets | H1 unchanged, with the new widgets under it |
| `FiJ2` Pillars + widgets | Height is money: the EPF pillar (89%) and the deposits pillar (11%), each made of blocks (EPF: what you put in, what NetApp put in, interest; deposits: one block per FD). **Go back to a day** (Today, a year ago, Mar 2026, Mar 2025, Mar 2024): the pillars rise and fall and the blocks regrow. Pick a pillar to open it; the stage recolours. The pillars grow in on load. |

**New widgets** (under both):
- **Money in each month:** a heat grid of what went into EPF and the deposits each month, a dot where a deposit was placed, hover for the split. A month this year ₹42,345; a deposit in 7 of the last 9 months.
- **Credits on time:** a dot per EPF credit with the days from the end of the wage month to the credit. It shows that from June's wages the credit comes about the 17th, not the 1st (17 to 26 days, against 1). Under it, the passbook check an import would run: opening + credits + interest = closing, which holds for all four years.
- **Growth path:** EPF in 5, 10 and 20 years if the monthly credit stays ₹39,308 and the rate stays 8.25% (₹43.6L, ₹93.7L, ₹2.79 Cr), with how much is put in and how much is interest, and what a ₹5,000 higher credit would add. Arithmetic only, using the same verified rule; never a forecast.

**PDF import (answered in chat, not built):** the app already reads statement PDFs (`src/lib/pdf`, pdf.js), has per-bank parsers and idempotent imports. An EPFO passbook import would take a dropped PDF (not Gmail), show the parsed rows for review, accept it only if opening + credits + interest = closing, never double-import a wage month and credit date, and never store the UAN or date of birth. It needs its own decision record (PRD F-IV-07).

**Also noted:** EPF is not in net worth today, so the Overview is understated by about ₹9.5L until this page is built.

## The sample (rounds 1 and 2, made up)

Rounds 1 and 2 use made-up data: eight deposits (one closed): HDFC 2-year, SBI tax-saver (locked), ICICI 1-year (matures in 36 days), Axis quarterly payout, Bajaj company FD (not bank-insured), Kotak 3-year, SBI 1-year (matured, not closed), an SBI recurring deposit (16 of 24 paid), the NSC, and EPF, PPF and NPS. ₹29.79L in deposits, ₹23.11L in passbook holdings. Savings balances per bank are made up.

## Rules the sample assumes (proposals, each needs his yes and a tested function in `lib/aggregate/` before a page uses it)

- **Worth today** is the existing linear estimate between principal and the bank-quoted maturity amount (`estimatedCurrentValue`). A **payout** deposit is worth its principal; its interest is paid out. An **RD** is each instalment compounded quarterly to today; its maturity amount is bank-quoted.
- **Earned a day**: a cumulative deposit's whole interest spread over its term; a payout deposit's rate on its principal. EPF and PPF are left out (interest is declared yearly).
- **Passbook holdings** (EPF, PPF, NPS): the balance a statement said on a date, plus what was added since. The app never works out their interest.
- **Cover**: a figure per depositor per bank (principal and interest together, deposits plus savings there). A company FD, EPF, PPF and the NSC are outside it. Settings: cover amount.
- **Tax year**: April to March; interest per payer as accrued (cumulative: straight-line; payout: payouts in the year); a limit per payer kind before tax is cut at source (settings: bank ₹50,000, company ₹5,000; **check both figures against current rules before building**); tax at his slab. An estimate, never a return.
- **Real return**: effective yield (from the quoted figures) times (1 − slab), less inflation. EPF and PPF assumed tax-free. Settings: slab, inflation.

## Open questions

1. Which hero (or which parts of several)? Round 1 charts or round 2 stages? Tax year and Real return could be widgets under a coloured stage.
2. The settings (slab, inflation, cover, limits): one small settings card on the page, or a global settings page?
3. Should paid-out interest on a payout deposit be recorded as income entries (the proposal in `system-design.md`)?
4. Is the cover measure wanted on this page, or only as an Overview attention item?
5. PRD Q1 and Q9 (how EPF, PPF, RD and NSC are stored) still need his answers before building. His data suggests EPF as contributions plus yearly interest per share, not a single balance.
6. Which bank or app are the seven deposits with, and does he hold PPF, NPS or other deposits?
7. Import the EPFO passbook PDFs (text-readable) like bank statements, or enter them by hand?
8. The FD form needs a tenure option and optional bank and maturity amount, not a required maturity date.

## Next

His pick, then the phone, states and forms for it on all boards, then PRD rows and the Plan stage.
