# Goals page (`/goals`)

**Status: planned 2026-10-29, Q1 to Q8 answered the same day (see "Decisions"). Designed in three rounds of mockups (G1 to G12 and the forms, `design/goals/`); the hero is not picked and nothing is built.** This started as the Define and Plan stage of [process.md](../process.md) for a new section. F-GO-01 to F-GO-05 and the M6 milestone are in the PRD.

## Mockups (round 1, 2026-10-29)

[`design/goals/`](../../design/goals/), built by [`design/goals/generator/`](../../design/goals/generator/) (a rebuild overwrites the artboards, so change the generator). Every goal, amount and date is made up; "today" is Oct 29, 2026. The sample has a car upgrade with four live sub-goals and one dropped (its money released), an iPad Pro with a sub-goal, a Fixed-date fridge, a trip, a long-term course, a paused camera and a finished pair of headphones.

Every board has the shared greeting (whose figures point), an attention strip, one hero, then the goals table, Coming up, What your money allows, Set aside lately, Needs and wants, and Finished. **The hero isn't picked yet.**

| Artboard | The hero's idea |
|---|---|
| `GoalsG1` Tanks | A vessel for every piece of a goal, filling as you set money aside. A dashed line marks where it should be by now. |
| `GoalsG2` Runway | A timeline from the day saving began to the date, filled to what's saved. A dotted line is where your plan finishes the goal. |
| `GoalsG3` Funding plan | Hands-on: pick a monthly amount and each goal's finish month moves against its date. |
| `GoalsG4` Matrix | The two axes themselves: Need or Want down the side, Minor or Major across the top. |
| `GoalsForms` | Add goal, Add sub-goal, Set aside, Mark bought. |

**Round 2 (2026-10-29): leaner pages.** Prathik asked for a few more variations with fewer widgets, so each is the greeting, one hero and at most one more card:

| Artboard | The hero's idea |
|---|---|
| `GoalsG5` This month | The set-aside ritual: what each goal planned for the month against what's done, a bar split by goal, and a button for what's left. |
| `GoalsG6` Skyline | A building per goal, taller the bigger it is, floors for sub-goals, lit windows for what's saved, a spire for a Major goal, a flag for a Fixed date. |
| `GoalsG7` Queue | The goal that's next as a focus card, and every piece in funding order with the month it finishes. |
| `GoalsG8` Staircase | Steps for the money that must be set aside by each date, with lines for what ₹27,000 and your ₹65,000 a month put aside. |

**Round 3 (2026-10-29): coloured cards, full widget set.** Prathik said the leaner pages had too few widgets and liked the Queue's coloured card, so these lean on colour cards in the style of the Subscriptions cover, the Accounts cards and the Queue's focus card, with the widgets of the other dashboards underneath (goals table, this month, staircase, coming up, what your money allows, needs and wants, set aside lately, finished).

| Artboard | The hero's idea |
|---|---|
| `GoalsG9` Cover | Accounts' cover: a focus panel and a tall coloured card per goal. Pick a goal and the whole cover takes its colour. The staircase runs along the bottom in white. |
| `GoalsG10` Map | A coloured tile per goal sized by amount, the car's sub-goals inside it, filled to what's saved. The funding order sits beside it. |
| `GoalsG11` Board | Three date lanes (by Feb 2027, the rest of 2027, 2028 and beyond) of coloured cards, each with what's to go and the month's need. |
| `GoalsG12` Tickets | The Queue's focus card, and the funding order as a coloured ticket per piece with its finish month. |

Not yet designed: phone, states (no goals, all funded, overdue, over-funded), Edit, Pause, Drop, Delete, Take back, and the Overview attention items. These follow the pick, per the "update all boards" rule.

**Rules the sample assumes, each needing his yes before it's built** (they're in `design/goals/generator/lib.mjs` and `parts.mjs`):
- **Months left** is whole months from today to the date, at least 1 while the date is ahead. A goal due Dec 20 has 1 month left on Oct 29.
- **Required a month** is what's left over those months, rounded up to the rupee. A parent adds up its own part and each sub-goal at its own date.
- **On track** means planned a month at least equals required; **Behind** otherwise; **No plan** with no planned amount.
- **Where it should be by now** is a straight line from the start date to the target date.
- **Funding plan:** each month every goal first gets what it needs to reach its date (served Fixed dates first, then Needs, then the soonest, then the smaller), then whatever is left goes to goals still open in the same order. The sample finds ₹27,000 a month is just enough to hit every date, against ₹73,690 if each goal is paid evenly on its own.

## What it is

A page for monetary goals you save towards: a car upgrade, an iPad, a fridge. A goal can be split into sub-goals (the car upgrade has suspension, tyres, alloy wheels). Each goal says why it exists (**Need** or **Want**), how long a commitment it is (**Minor**, short-term, or **Major**, long-term), when it's wanted, and how much is set aside so far. The page answers three questions:

1. **What am I saving for, and how far along is each thing?**
2. **What does it take each month to hit the dates?**
3. **If I can't fund everything, what gets money first?**

## The one idea everything hangs on: a goal is an earmark, not money

The money for a goal already exists somewhere the app counts: a bank account, an FD, a holding. So **a goal never adds to net worth** (the same double-count trap as the payment-source principle in `system-design.md`). A goal is a claim on money that's already counted.

That rules the model:

- "Saved so far" is **derived** from a log of amounts set aside, never typed as a total (derive, don't store).
- Net worth, Accounts and Overview don't change. Goals only read them.
- A goal that's bought is a **fact on the goal** (cost, date, paid from). The cash leaving a bank account or a card statement is already recorded by those pages, so Goals records no money movement.

## What to consider (the design checklist)

| Consideration | Proposed answer |
|---|---|
| **Need vs Want** | Stored per goal and per sub-goal: `Need` (something breaks or a duty is missed without it: the dead fridge) or `Want` (the iPad). It's the first thing that decides who gets money. A parent shows its split ("₹60k needs, ₹2.4L wants"). |
| **Minor vs Major** | **Stored, picked per goal** (Q1, decided): `Major` is a long-term financial commitment, `Minor` a short-term thing. It's about time horizon, not cost, so it can disagree with the dates and the app doesn't second-guess it. |
| **Sub-goals** | One level only (a goal and its sub-goals, no grandchildren). Same table, a `parentId`. A sub-goal has its own amount, date, need/want and contributions. |
| **Parent's cost** | Derived: the parent's own part (what isn't itemised yet, can be ₹0) plus its sub-goals. Dropped sub-goals don't count. Open (Q2). |
| **Deadline** | A date is optional. `Fixed` (can't slip: a wedding, the old fridge is dead) or `Flexible` (slides if money is short). Fixed dates are honoured first in the funding plan. No date means "someday". |
| **Status** | Stored: `Active`, `Paused`, `Done` (bought), `Dropped`. **Funded is not stored**: saved at or above the target already says so (the FD `Matured` lesson). On track, behind and overdue are derived too. |
| **Price moves** | The target is editable. Price history (the iPad went up) is deferred: a later `GoalPrices` log, like Subscriptions' price history, if it turns out to matter. |
| **Estimate vs actual** | `Done` records the actual cost, so the page can show how far estimates were off (derived: actual less target). |
| **Pace** | `plannedMonthly` (optional, stored) is what you intend to put aside. The required monthly is derived. On track means planned is at least required. |
| **Not enough money** | A funding plan: given a monthly amount, fill goals in order (Fixed dates, then Needs, then earliest date, then smaller first) and show each one's finish date. The monthly amount is Prathik's input: the app suggests none (the same rule as allocation targets in the gap review). |
| **Is the earmark real?** | A contribution can name the account the money sits in. The page warns (never blocks) when the earmarks in an account exceed its latest balance, or when they sit in an `Emergency-Fund` account. |
| **Payment source** | A `Done` goal says what it was paid from, an account or a card, at most one (the payment-source principle). |
| **Category and colour** | A fixed category list, each with a colour (Vehicle, Home, Appliance, Gadget, Travel, Education, Family, Health, Other), and a goal can take any of the shared `COLORS`. The icon follows the category: no `icon` column. |
| **Currency** | INR only. A USD-priced goal is entered in rupees at today's rate by hand. |

### Deliberately left out of v1

- **Investment returns.** "Saved" is what you set aside, not what the holding is worth. Retirement and corpus goals need a growth assumption, and money math isn't guessed: that is its own design.
- **Linking a goal to an account's whole balance.** One mechanism (the contribution log) is easier to trust than two that can disagree. Revisit if the log feels like a chore.
- **Recurring goals** (a yearly trip). A goal is a one-off purchase. Repeating ones would be a schedule, like a Subscription.
- **Financing by a loan or card EMI.** A car on a loan has a down payment (a goal) and EMIs (the Loans page). Don't track the loan as a goal; an EMI converted on a card is already in that card's statement.
- **The emergency fund.** It's a health metric (F-OV-08), not a purchase. Whether it also appears as a pinned goal is Q6.
- **Monthly "free cash".** The app doesn't track spending, so a true surplus doesn't exist (Accounts' "Everything else" is a residual). The page compares goal contributions to income, as Loans does for EMI load, and says so (Q5).

## Data model

Two tabs, built as Sheets Tables. Enum values Title-Case, hyphenated when multi-word. Ids are short UUIDs.

**`Goals`** (master)

| Column | Type | Notes |
|---|---|---|
| `id` | text | |
| `name` | text | "Car upgrade", "Suspension" |
| `parentId` | text, optional | A top-level goal's id. A goal with a parent can't have children. `""` clears it. |
| `category` | enum | The fixed list above |
| `necessity` | enum | `Need`, `Want` |
| `scale` | enum | `Minor` (short-term), `Major` (long-term commitment) |
| `amount` | number | The goal's own part. A leaf must be above 0; a parent's can be 0 |
| `targetDate` | date, optional | Blank is "someday" |
| `dateType` | enum, optional | `Fixed`, `Flexible` (a row without one reads as Flexible) |
| `startDate` | date | When saving began. Pace counts from it |
| `plannedMonthly` | number, optional | What you intend to put aside |
| `status` | enum | `Active`, `Paused`, `Done`, `Dropped` |
| `doneOn`, `actualCost`, `paidFromAccountId`, `paidFromCardId` | optional | Set when `Done`. At most one paid-from |
| `color`, `link`, `notes` | optional | `color` from `COLORS`; a row without one shows its category's |

**`GoalContributions`** (log)

| Column | Type | Notes |
|---|---|---|
| `id`, `goalId`, `date` | | |
| `amount` | number | Above 0 |
| `kind` | enum | `Set-aside`, `Take-back` (releases money from the goal, for example when it's dropped or the plan changes) |
| `accountId` | optional | Where the money actually sits |
| `note` | text, optional | |

Rules across fields go in one `rowRules` list used as both the create-schema refinement and the repository's whole-row `check`: amount above 0 on a contribution; a goal can't be its own parent; `Done` needs `doneOn`; `paidFromAccountId` and `paidFromCardId` are never both set; a `Fixed` date needs a date. Rules that need other rows (the parent exists and is top-level; a take-back can't exceed what's saved; a parent isn't `Done` while a sub-goal is open) live in the server action, not in `check(row)`.

Deleting a goal deletes its sub-goals and contributions in one read and one write per tab (`removeWhere`), contributions first, so a failed delete leaves the goal there to delete again (as Subscriptions does).

## The math (pure functions, `lib/aggregate/goals.ts`, each with a test that proves it)

Each needs Prathik's yes before it's built: money-math definitions are asked first, not assumed.

1. **Roll-up.** A parent's target = its own `amount` + the sum of its non-Dropped sub-goals. Saved = its own contributions + its sub-goals', where each goal's saved is Set-aside less Take-back. *Test:* a take-back never takes saved below 0; a Dropped sub-goal leaves the target and its money shows as released; the parent's figures always equal the sum of the parts.
2. **Funded.** Saved at or above target. *Test:* exactly at target is funded; over target reports the excess and never a progress above 100%.
3. **Required monthly.** Remaining ÷ whole months left, rounded up to the rupee. The month counting rule needs deciding (calendar months to the date, the date's own month included or not). *Test:* putting the required amount aside each month reaches the target by the date, and never overshoots by a full month's amount. A passed date reports Overdue, not a negative number.
4. **Pace.** On track when planned monthly is at least required; behind otherwise. A goal with no plan shows its required amount and no verdict.
5. **Funding plan.** Given a monthly total, allocate month by month in the funding order and return each goal's finish month. *Test:* no month allocates more than the total, a goal gets nothing after it's funded, every rupee allocated is accounted for, and the same inputs give the same plan whatever order the goals were entered in.
6. **Earmark check.** Earmarks per account against that account's latest balance. Uses the existing account-balance function; it adds none.
7. **Necessity split.** A parent's target split into Need and Want amounts.

## The page (design comes first, in mockups)

Per the project's rules:

- **The greeting's figures point.** A `SentencePart[]`, a `greetingView` and a thin `GreetingSentence` over `PointingSentence`. A draft sentence: "Seven goals: ₹3.2L of ₹9.8L set aside, ₹41,000 a month keeps every date, and the iPad is next on Dec 12." Pointable figures: set aside, total target, monthly needed, next due. A figure with no data stays plain.
- **Its own idea.** Don't reuse Cards' tiles or Subscriptions' cover flow; keep the shared shell. Hero directions to mock up: **tanks** (a vessel per goal that fills, with a waterline at where it should be by now, sub-goals as a stack inside the parent's), **runway** (a timeline of dates with funding bars), **funding plan** (drag the monthly amount and watch the dates move, hands-on like Loans' What if), **shelf** (Needs and Wants as two shelves, sub-goals nested).
- **Widgets** to choose from: the goals table (name, need/want, minor/major, target, saved bar, per month, due), cost by category, Needs against Wants, coming up (dates at risk), recent set-asides, estimate vs actual for finished goals.
- **Pick in the address** (`?goal=`), as Accounts, Income and Loans do. Picking a parent shows its sub-goals; picking a sub-goal shows it inside its parent.
- **Fit neatly:** side-by-side cards end level (measured). Each uses the shared palette.
- **Also designed, not afterthoughts** (the "update all boards" rule): phone, states (no goals, one goal, all funded, overdue, over-funded, a dropped sub-goal, a finished goal), and the forms (Add goal, Add sub-goal, Set aside, Take back, Mark done, Edit, Pause, Drop, Delete).
- **Overview:** a goal with a Fixed date at risk, or an unbacked earmark, joins "What needs attention" (F-OV-03). Overview's net worth is untouched.

## Build plan

Order is Define, Design, Plan, Build ([process.md](../process.md)). One PR per issue. The data layer follows "Adding a new entity" in CLAUDE.md, with no new boilerplate.

| # | Task | Notes |
|---|---|---|
| 0 | **PRD**: a Goals (`F-GO`) section and a milestone | Docs only. Q1 to Q8 are answered |
| 1 | **Design**: mockups in `design/goals/` with a generator, a picking round, then phone, states and forms for the pick | Rebuild every board when the pick changes |
| 2 | **Math**: `lib/aggregate/goals.ts` and tests (the eight above) | Pure, no Sheets dependency. Can start before the design is picked |
| 3 | **Data**: types, `lib/sheets/goals.ts` and `goalContributions.ts` (repository config and schemas together), `checkedRepositories`, `CACHE_TAGS` and cached list/get, `entities.test.ts` | Prathik builds the two tabs; then check their real names and header order, then `npm run check-sheet`, then a sequential create-update-delete round trip on the real Sheet |
| 4 | **Routes**: list and item routes with the factories; a custom delete (cascade) and a custom Mark done | |
| 5 | **Page**: greeting and its points, hero, widgets, `?goal=` pick, empty state | Loading, empty and error states, light and dark, desktop and phone |
| 6 | **Forms and actions**: add and edit goal and sub-goal, set aside, take back, mark done, pause, drop, delete with undo | |
| 7 | **Overview**: attention items | |
| 8 | **Docs**: `system-design.md` entity text, PRD statuses | In the same PRs as the work, as the Definition of Done asks |

Every PR gets `/code-review` before it merges.

## Decisions (answered by Prathik, 2026-10-29)

| # | Question | Answer |
|---|---|---|
| Q1 | Minor/major: size or importance? | **Neither: time horizon.** Major is a long-term financial commitment, minor a short-term thing. Picked per goal, stored in `scale`. Not derived from the amount or the dates. |
| Q2 | A parent's cost | **Its own part plus its sub-goals.** The own part can be ₹0. |
| Q3 | Need/Want, and a priority field | **Two values, no priority field.** Funding order is derived (Fixed dates, Needs, earliest date, smaller first). |
| Q4 | Where "saved" comes from | **A log of set-asides**, with an optional account on each entry. |
| Q5 | What the monthly amount is compared with | **Income less obligations** (Overview's figures), labelled as not a true surplus. |
| Q6 | Is the emergency fund a goal | **No**, a health metric on Overview only. |
| Q7 | Returns | **Plain savings**, no growth. |
| Q8 | Sidebar and milestone | **After Investments, its own milestone.** |

All eight are answered, so the PRD entry (`F-GO`, task 0) can be written.

## What I'd check against the real data before building

Prathik's own list of goals (the car upgrade's sub-goals, the iPad, the fridge): one real example mocked up first, as Insurance was on his real policies. It settles Q1 and Q2 faster than the questions do.
