# Subscriptions page (`/subscriptions`)

Final design, picked by Prathik on 2026-10-21. Mockups: [`design/subscriptions/`](../../design/subscriptions/), canvas page **Final design**:

| Artboard | What it shows |
|---|---|
| `SubsFinal.dc.html` | Desktop, interactive: turn the carousel, switch the chart, pick from the cost map |
| `SubsFinalPhone.dc.html` | Phone, interactive carousel and chart switch |
| `SubsFinalStates.dc.html` | No subscriptions, a renewal due soon, after Mark paid, paused, cancelled, and every pick's colour |
| `SubsForms.dc.html` | Add / Edit subscription, Record payment, Pause and Cancel, phone sheets |
| `SubsRenewals.dc.html`, `SubsRenewalsPhone`, `SubsRenewalsStates` | The Renewals page, layout R1 (picked 2026-10-21); R2 and R3 were the other options |
| `SubsReadme.dc.html` | Every direction explored, how picks were made, and the decisions that were open when it was picked (decided below) |

Every name, price and date in the mockups is made up. "Today" is Oct 20, 2026.

The artboards and `canvas.json` are built by [`design/subscriptions/generator/`](../../design/subscriptions/generator/). A rebuild overwrites them, so make changes in the generator and rebuild, not in the artboards by hand.

## The page, top to bottom

1. **Greeting**, as on the Cards page: "Subscriptions · Today", "Good morning, Prathik", and one sentence: paid so far this year, the monthly average, the biggest month, and the renewals in the next 30 days.
2. **The coloured cover-flow hero.** One card with a carousel of covers above a caption.
3. **The cost map and payments**, side by side, ending level:
   - **What each one costs**: a treemap of active subscriptions sized by monthly cost, in their category colours. A month / A year and Each / By category toggles, a category legend, and "Not in the map" chips for paused and cancelled ones. Clicking a block or a chip picks that subscription.
   - **Payments** for the pick (Paid on · Amount · Change · Charged to · Status), with Payments / Price history, "Showing 6 of 32 · ₹X paid since …" and "All renewals →". With All picked it lists the latest payments across every subscription. **Charged to** sits under it.
4. **A full-width chart at the end**, like the Cards page's trend, with a switch: **Day by day** (the default), **Payment trend** and **Lifetime cost**. A "Showing" chip names the pick.

## The carousel

- **Order:** All sits at the centre. The active subscriptions follow it clockwise in renewal order (soonest first), then the paused and cancelled ones. The order wraps, so the cards on the left are the ones that renew last.
- **Picking:** click a cover, or the arrows, or **scroll**. A wheel or trackpad movement of 40px steps once (at most one step every 90ms); a horizontal swipe does the same. Dragging steps once per 56px, and the click that ends a drag doesn't pick the cover under it. ← → and ↑ ↓ step when the carousel has focus. Stepping past the last cover comes back to All.
- **Motion:** the front cover faces you with a reflection, and the others turn away in a cover flow (520ms ease-out). Nothing moves for `prefers-reduced-motion`.
- **On a phone** the covers are smaller and a horizontal swipe turns them; the page still scrolls vertically (`touch-action: pan-y`).
- **Accessibility:** the carousel is a focusable group (`aria-roledescription="carousel"`) whose label explains how to turn it. Each cover is a radio, so screen readers announce the pick.

## The hero follows the pick

- **The card's colour is the pick's**: its card gradient (`--card-<colour>-from` → `-to`), crossfading over 650ms. All is emerald. A subscription's colour is the one picked for it in Add or Edit (see "Colour" under Built: the forms); one saved before colours could be picked shows its category's.
- **Everything in the card follows**, nothing stays green: the progress bar, the primary button and the ring round the picked cover use `--pick-soft`, the pick's colour mixed 46% with white; text on them uses `--pick-ink`, the colour's deep shade.
- **The caption:**
  - **All:** "Everything / All subscriptions", the month so far from Oct 1 to Oct 31 ("Next is Netflix, Fri, Oct 23"), then A month, Renews next, Paid this year and Prices, with Record payment and Add subscription.
  - **A subscription:** its category and start date, its name, the cycle so far from the last renewal to the next, then its price, next renewal, paid so far and last price change, with Mark paid, Edit and ⋯ (Pause, Cancel).
  - **Paused:** "Paused · last paid Jul 12", no cycle bar, and Resume instead of Mark paid.
  - **Cancelled:** "Cancelled Sep 14 · won't renew", and Restart.
- **Due soon:** within 3 days the renewal line and Mark paid are what the card leads with. Mark paid records the plan's price on the renewal date, to the usual card, with Undo for 6 seconds.

## The chart

| View | What it shows | With a pick |
|---|---|---|
| **Day by day** | 2026 as a grid of days (weeks across, Mon–Sun down). A day with a renewal is shaded by what it cost: under ₹200, under ₹800, under ₹2,000, more. Days still to come are dashed, a renewal with no payment is amber, today has a ring. Each month's total sits under its weeks. | The pick's days take its colour; the rest fade |
| **Payment trend** | The last 12 months paid and the next 6 expected, as textured bars, with "A usual month" as a dashed line, the peak marked and this month outlined. A light hover card per month lists what renewed. | The pick's part of each month is drawn in its colour, the bars tint to it, and the line becomes its monthly cost |
| **Lifetime cost** | Everything paid to each subscription since it started, biggest first, with its payment count, start date and a small line of what each payment cost. | The rest fade |

## Numbers (definitions)

- **A month** for a subscription is its price divided by the months in its cycle (`monthlyEquivalent`); a year is that × 12. Paused and cancelled ones are left out of every total.
- **A month's spend** in the chart: the payments recorded in that month, for past months. For this month, those plus the renewals still to come. For future months, the renewals expected at today's plan prices, plus any already marked paid ahead.
- **Renewals** come from the schedule (`lib/aggregate/subscriptionRenewals.ts`), stepping from the billing anchor date. A renewal is **paid** when a payment within half a cycle matches it, **skipped** when that payment is a ₹0 Skipped one, **not recorded** when its date has passed with none, and **upcoming** otherwise. After a cancellation the next one is **won't renew**.
- **Lifetime cost** is the sum of a subscription's recorded payments.
- New computations for the build (renewal rows, monthly spend by day and month, lifetime cost) belong in `lib/aggregate/` as pure functions with tests, per CLAUDE.md.

## The Renewals page (`/subscriptions/renewals`)

Layout **R1**, picked 2026-10-21: a table like the Cards Statements page. Every direction links here ("All renewals →"), and filtered to one subscription it's that subscription's whole history.

- **Header:** "Subscriptions · Renewals" back link, "Renewals", one sentence (renewals this year, how many aren't recorded, how many are still to come), the period pill (as on the Statements page), Refresh and Record payment.
- **Tiles:** Next 30 days (the feature tile, with rings), Not recorded, Paid this year, Price changes.
- **Toolbar:** All / Upcoming / Paid / Not recorded, a subscription filter, Charged to, search, Newest first.
- **Table:** Coming up in the next 30 days first, then each past month, newest first. Each group header shows its renewals and what was paid, still to come or not recorded. Columns: Subscription · Renews on · Amount (the payment, or the plan's price in muted text for one not paid yet) · Status (Paid, Not recorded, In N days, Upcoming, Won't renew) · Paid on · Charged to · Change (against the last payment, or the plan for the latest one) · an action (Mark paid within 3 days, Record payment when not recorded, ⋯ on paid rows for Edit payment, Open subscription and Delete payment).
- **States** (`SubsRenewalsStates`): filtered to one subscription (a strip with its total and price history above the table), Not recorded only, nothing in the period, and a paid row's menu.
- Upcoming renewals are computed from each schedule; nothing is written until a payment is recorded.

## Phone

The same order: greeting, the hero (smaller covers, a two-column caption), the cost map (tap a block to open that subscription), latest payments, and the chart with its switch. Day by day shows August to December on a phone.

## Decided for the build (2026-10-21, #124)

- **Charged to:** a subscription stores where it's usually charged: `defaultPaidFromCardId` or `defaultPaidFromAccountId`, at most one. New payments start from it.
- **Cancelled:** a third status, with an optional cancelled-on date (`endDate`).
- **Category:** a fixed list, each with a colour: Streaming, Music, Software, Cloud storage, Fitness, Food, Shopping, News, Utilities, Other. The Sheet's dropdown holds exactly these. Utilities (slate) was added on 2026-10-21, for things like home internet and mobile plans.
- **The Sheet:** these columns and dropdowns are added through the Sheets API, and `Quaterly` is fixed to `Quarterly`.
- **Card-charged subscriptions count once, by context.** The Subscriptions page counts every payment. The Overview's monthly obligations counts a card-charged one only inside its card's bill, never again on top.

## Decided for the build (2026-10-21, #125)

The rules are in [`docs/system-design.md`](../system-design.md) under Subscription, and in `lib/aggregate/subscriptionRenewals.ts`.

1. **"It didn't charge"** records a ₹0 payment with status `Skipped`. The renewal shows as skipped, not as not recorded.
2. **Mark paid** is offered from 3 days before the renewal, today included.
3. **A payment within half a cycle** of a renewal, either side, counts for it. Renewals are settled in date order, each by the earliest payment in its window.
4. **A price change** is a payment 2% or more different from the one before it; smaller moves are ignored.
5. **Pending** stays in the model, but the app never writes it: upcoming renewals are computed.

## Built (2026-10-21, #126)

The page lives in `src/app/subscriptions/` and `src/components/subscriptions/`. `?demo` (in development only) shows the design's sample data, which reproduces its figures exactly, and is never written to the Sheet. `?sub=<id>` opens a pick, and turning the carousel keeps it in the address without asking the server again.

Settled while building it:
- **The hero's buttons** (Mark paid, Edit, ⋯, Resume, Restart, Record payment, Add subscription) show disabled with "Coming soon" until the forms land in #128, so the layout already matches the design.
- **"Prices" for All** counts the active subscriptions whose price went up this year, net (decided with Prathik 2026-10-21): the last charge before this year against the latest one this year, or the first this year for one that started this year, counted when it ended up 2% or more higher. A promo that ends, putting the price back where it was, isn't a rise. "₹X more a month" turns a yearly or quarterly rise into its monthly share, so a ₹200 rise on a yearly plan adds ₹17.
- **"In the next 30 days"** is today and the 29 days after it. It counts a renewal already marked paid ahead.
- **A cycle that spans two years** (a yearly plan) shows the year on both ends of its bar.
- **By category** blocks show each category's total and its subscriptions; they don't pick anything, since a category isn't one subscription.
- **With no subscriptions at all**, only the hero shows ("Add your first subscription"); the empty map and payments would only be white space.
- **On a phone**, tapping a block picks it and scrolls the hero into view. Charged to is left out there, as in the spec's phone order.
- **Since then:** the forms came in #128, and the "All renewals →" links with the Renewals page (#130).

## Built: the chart (2026-10-21, #127)

The full-width chart is at the end of the page. The numbers come from `lib/aggregate/subscriptionChart.ts` on top of the renewals math, and on the design's sample data they reproduce its month totals exactly.

Settled while building it:
- **Day by day** doesn't draw a renewal that won't happen (after a cancellation). A day with a renewal not recorded is drawn amber whatever else is on it, and a skipped one (it didn't charge) is drawn plain. Each month's total is the same spend the Payment trend gives it. The cells size to the card's width, so the whole year fits at any desktop width.
- **On a phone**, Day by day shows five months, from two before this one, kept inside the year (August to December in October). The Payment trend shows the last 6 months and the next 6.
- **The Payment trend's peak** is the biggest month so far, this month included with what's still to come in it. Its hover card compares a month with a usual month (what everything active costs a month), and opens on hover, focus or tap.
- **A usual month's line** with a subscription picked is that subscription's monthly cost; a paused or cancelled one has no line.
- **Lifetime cost's caption** for All counts from the first payment recorded ("since Dec 2022").
- **A hover card's rows** list the renewals in the month's total first. A renewal not recorded, or a Pending one, isn't in the total, so it's noted ("not recorded", "pending") and muted. A Pending day in Day by day is drawn dashed, like one still to come.
- **A payment whose subscription no longer exists** is left out of everything on the page, as the Cards page leaves out statements whose card is gone.

## Built: the forms (2026-10-21, #128)

The forms open from the header (Record payment, Add subscription) and from the hero, on the Cards forms' dialog shell. With `?demo` they show disabled ("Sample data can't be changed").
- **Add and Edit subscription**, with a live preview: its cover, a month and a year, the next renewals (or what's been paid, on Edit), and your monthly total before and after. "Next renewal" can be any renewal date, since the schedule counts from it both ways. Edit adds Status (Cancelled asks for its date) and Delete, which removes its payments too.
- **Record a payment** starts on the renewal it's for: the oldest one not recorded, or else the next one to come. It starts at the plan's price and where it's usually charged. When the amount is 2% or more off the plan (the price-change rule), it offers "Update the price from now on", ticked. A ₹0 payment isn't accepted; a renewal that didn't charge is Skipped, which the Renewals page records.
- **Mark paid** is one click from 3 days before a renewal (Record payment otherwise, or to catch up on one not recorded). It records the plan's price on the renewal date, to where it's usually charged, with Undo for 6 seconds.
- **Pause, Resume, Cancel and Restart** each ask first. Cancel asks for its date. Resume and Restart ask when it starts again (today by default) and store it as `resumedOn`, a new column (decided with Prathik 2026-10-21). The renewals between its last payment and that date weren't due, so they're never flagged. Only the latest restart is kept.
- **Editing a paused or cancelled one back to Active** starts it again today, the same as Resume.
- **Colour (Prathik, 2026-10-21):** a subscription's colour is picked freely in Add and Edit, not from its category. There are 14, in `SUBSCRIPTION_COLORS`: the card palette and All's emerald, plus Amber, Rose, Indigo, Forest, Plum, Ocean and Slate, each a token set in `globals.css`. A new subscription starts on the first colour no other one uses. The colour is stored in the `color` column, whose dropdown holds exactly those names. A row from before it shows its category's colour until it's edited. Categories keep their colours for the cost map's By category view, which is now the only view that shows the category legend: in Each, every block is in its own subscription's colour.

## Built: the Renewals page (2026-10-21, #130)

`/subscriptions/renewals`, layout R1. The numbers come from `lib/aggregate/subscriptionRenewalList.ts` on top of the renewals math (unchanged), the words from `app/subscriptions/renewals/views.ts`, and the address from `params.ts`. On the design's sample data and "today" it reproduces the design's figures: 79 renewals in 2026 (16 upcoming, 61 paid, 1 not recorded), the four tiles, each group's header, and 21 rows on page 1 of 4.

Settled while building it:
- **The period** works as on the Statements page: the last 3, 6 or 12 months, each year, all time, or a custom range of months. A year runs to Dec 31, so this year's includes the renewals still to come in it; all time runs from the first subscription's start to the end of this year. The design's "Next 30 days" option was left out: the first group and the first tile always show it, and a period is whole months, as on the Statements page.
- **Groups go by date, not status.** "Coming up" is today and the 29 days after it, so a renewal marked paid ahead stays in it. Renewals after that fold away under "10 more later this year", unless nothing is coming up. Oldest first runs the other way: past months from the oldest, then what's coming. As in the design, a group's count includes a won't-renew row, so "Coming up" says 7 renewals where the tile says 6.
- **A page holds whole months**, as many as fit in 25 rows, so a month is never split across pages. Opened, the later renewals stay on the coming-up ones' page, however many there are, since they open in place.
- **When the period ends inside the next 30 days** (a range ends with this month, and in December the year ends), the first group says what it shows: "Coming up · to Oct 31". Its rows stay inside the period, so the counts still match it; the Next 30 days tile doesn't follow the period.
- **The filters:** Paid includes "didn't charge" (Skipped), Upcoming includes Pending, and a won't-renew row shows only under All. Charged to is the payment's card or account, or for one still to come, the subscription's usual one (drawn faded). One not recorded has none. Each filter's count is what choosing it would show with the others applied.
- **The tiles:** Next 30 days ignores the period, as on the Subscriptions page. The other three follow the period but not the filters, as the Statements page's tiles do. Price changes counts each change of 2% or more in the period up to this month (as Paid does), and "₹X more a month" adds up each one's monthly share.
- **Sorting** is Newest or Oldest first, as on the Statements page. The design's "Biggest first" was left out, since the table is grouped by date.
- **Search** matches a subscription's name, alias, category or cycle, or a renewal's own amount: what was paid, or the plan's price for one not paid yet. So "netflix 649" doesn't find the ones paid at ₹499.
- **Change** is "₹20 over plan" for a subscription's latest charge when it's 2% or more off the plan, otherwise "₹150 vs last" when it moved 2% or more from the charge before.
- **Row actions go through the forms (#128).** Mark paid is one click with Undo, as in the hero. It's offered only on the renewal the forms' Mark paid pays (the next one due within 3 days), and not while an earlier one isn't recorded: Record payment catches that up first. Record payment on a row starts on that row's renewal. The header's Record payment is for the subscription the page is filtered to, or any.
- **The ⋯ menu:** on a recorded renewal, Edit payment, Open the subscription, and Delete payment (it asks first; the renewal shows as not paid again). On one not recorded, It didn't charge and Open. A phone has no menu, as in the design.
- **Edit payment** (no design of its own, so it uses Record a payment's shell) changes when it was paid, what was charged and where. Ticking It didn't charge makes it ₹0, Skipped and charged nowhere. Delete payment is in its footer, as Delete subscription is in Edit subscription.
- **It didn't charge** on a renewal not recorded writes a ₹0 Skipped payment on its date (#125), with Undo for 6 seconds, so it isn't flagged again. The design only had this button in direction G; on R1 it's in the menu.
- **"All renewals →"** under a subscription's payments opens `?sub=<id>&period=all`, its whole history with the strip above the table. With All picked it's "View all renewals →", this year.
- **Narrower than 1280px** the eight columns don't fit, so each row is the phone's two lines. Between 768px and 1280px, rows keep the ⋯ menu; on a phone there's none, as in the design.

## Built: the map's hover card (2026-10-21)

Prathik found the map missing a hover card, and its blocks moving whenever another subscription was picked.
- **The hover card** (`CostMapHover`) is the Cards page's light card: surface, a hairline border and `--pop-shadow`. A block's card has its name, what it costs a month or a year (following the toggle), its plan's own price, its share of the monthly total with a bar in its colour, when it renews, where it's charged, what's been paid, and its latest price change. A category's card lists its subscriptions, biggest first, with a bar split between them.
- **It follows the pointer** on whichever side has room, and glides as it goes. Over the gaps between blocks it stays rather than blinking. A focused block or category (by keyboard) gets it above, or else below, or over its top edge only when neither fits; Esc closes it. It keeps its content while it fades out, and closes if its block goes (switching Each and By category from the keyboard, or a refresh). On touch there's none, since a tap picks.
- **The hovered block lifts 3px and its rings ripple outward**, as the heatmap's cells do (#104). The others step back to 75% and lose some colour. They were faded to 55% at first, which washed the dark blocks out against the page.
- **The blocks stay put.** The map is as tall as the column beside it, and lays its blocks out at that height. The Payments card used to change height with the pick (one row for a yearly plan, six for Netflix, plus the "All subscriptions" line), so every pick moved the blocks. At xl the card now keeps room for six rows in either view, and the line under them is always there. For All it says to pick a block. Its header stays on one line, so a long name truncates rather than wrapping the toggle, and Price history spells out only the latest three price changes ("and 2 earlier changes"), so neither can make it taller.

## Interactions Prathik picked (2026-10-21)

From the working mockups in `design/subscriptions-interactions/SubscriptionsInteractions.html`, he picked:
- **1 · The map:** 1A morph and 1B try without.
- **2 · The hero:** 2A rolling digits, 2B read the cycle bar, and 2C peek. The mockup's small label under the cover wasn't legible, so the hovered cover should slide out a little and show its details on itself.
- **3 · Connecting the pieces:** 3A a payment points at its block, and 3B a card lights its subscriptions.
- **4 · Small moments:** 4A a renewal getting close, and 4B paid with a sweep.
- **5 · The grid:** all of 5A–C.
- **6 · Trend and Lifetime:** all of 6A–C.
- **7 · The quieter widgets:** all of 7A–D.

He left out 1C (blocks fill up to renewal) and 3C (the price change drawn in its row).

**6B's year figure (decided with Prathik):** "on course for ₹X" is what's been paid so far this year, plus the renewals still due before Dec 31 at each plan's current price. Renewals that passed without being recorded aren't counted, and paused and cancelled ones add nothing.

## Built: the map's interactions (1A, 1B, 7C)

- **1A, the morph:** By category no longer swaps the blocks for category tiles. It moves the same blocks into their category's tile, laid out inside it, and fades each one to its category's colour. The tile's name and total sit on top, and they are what's hovered and focused for the category's card. Switching back moves them out again. A month and A year roll every figure on the map and in the legend (`RollingNumber`, shared with the Cards page).
- **1B, try without:** a block's Try without (shown on hover or focus, on blocks with room for it) folds it to its middle while the rest grow to fill. A line over the map then says what's left a month and what that saves a year, with a chip to put each one back and Put all back. By category, the categories are worked out from what's left, so their tiles, totals, legend and cards all agree. It's never saved, and the block hover cards keep the real figures.
- **7C, the ghost:** hovering or focusing a paused or cancelled chip makes room for a dashed block in its colour: "+₹299 a month if you resume it" (or "restart it" for a cancelled one), at its plan's monthly share. By category it gets a tile of its own, since it's in no category's total. When it goes, it shrinks away and the rest grow back.
- **Where it's worked out:** `costMap.ts` (pure, tested) lays the map out for either view, the ones left out and the ghost. The blocks glide between layouts only after the map has been measured, so the first layout doesn't fly in from a guess.

## Built: connecting the pieces (3A, 3B, 7B)

- **3A, a payment points at its block:** hovering a payment row lights its subscription's block in the map and steps the rest back, by the same dimming as the map's own hover. The other way round, hovering a block lights its rows in the payments table when All is shown, and fades the rest. With one subscription picked, every row is its own, so nothing fades.
- **3B, a card lights its subscriptions:** hovering or focusing a row in Charged to lights its subscriptions in the map and splits its bar into them, each in its colour.
- **7B, Charged to shows what lands next:** the same hover opens a light card over the row, with the subscriptions charged there and what lands next.
  - **For a card, its next statement:** the payments already charged to it since its last statement date, plus the renewals still to come up to its next statement date (on that day included) for the subscriptions usually charged there. It shows the statement's date and total.
  - **For a bank account, or nowhere set:** the next three renewals.
  - **The rules:** renewals that passed without being recorded aren't counted, the same as the chart's year total. A payment counts by the card it went on, and one made early is counted once.
  - **Layout:** the card sits over the rows and glides between them, so nothing around it changes size and the map stays where it is. It's worked out in `lib/aggregate/subscriptionNextCharges.ts` (pure, tested).

## Built: the greeting points, and toggles slide (7A, 7D)

- **7A, the greeting points:** each figure in the sentence under the greeting is a button (dotted underline) that opens a light card under it.
  - **Paid this year:** the year's months, with what was paid in each and the months still to come dashed.
  - **The monthly average:** the same strip with the average drawn across it.
  - **The biggest month:** its month lit, and what each subscription paid in it.
  - **The renewals in the next 30 days:** each one with its date.
  - The cards come from the same `yearSummary` as the sentence (`greetingView`), so they always agree. The card glides between figures and closes on Esc. On a touch screen a tap opens it and another closes it.
- **7D, toggles that slide:** every `Segmented` on the page (A month or A year, Each or By category, Payments or Price history, and the chart's views) slides its white pill to the chosen option with a small spring. Until it's been measured, and on the server, the chosen button carries the pill itself. It lives in `Segmented.tsx` (client), and `parts.tsx` re-exports it.

## How it got here

The canvas keeps everything explored, newest first: A–K (layouts), L–P (heroes), Q–Z (selectors), S1–S6 (circular carousels) and S7–S16 (the cover flow refined, each with a different full-width chart). Prathik kept these from them: F's greeting, D's cost map, C's payments table, S's cover flow with All at the centre, scrolling in a circle, S9's coloured stage, S9's Day by day chart, S7's Payment trend and S14's Lifetime cost. Along the way he asked that no section be added just to fill space (a separate colour band was dropped), and that cards side by side end level. A layout check measured this across every pick.
