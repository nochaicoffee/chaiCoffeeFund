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

- **The card's colour is the pick's**: its card gradient (`--card-<colour>-from` → `-to`), crossfading over 650ms. All is emerald. A subscription's colour comes from its category, so a subscription needs no colour field.
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
- **Category:** a fixed list, each with a colour: Streaming, Music, Software, Cloud storage, Fitness, Food, Shopping, News, Other. The Sheet's dropdown holds exactly these.
- **The Sheet:** these columns and dropdowns are added through the Sheets API, and `Quaterly` is fixed to `Quarterly`.
- **Card-charged subscriptions count once, by context.** The Subscriptions page counts every payment. The Overview's monthly obligations counts a card-charged one only inside its card's bill, never again on top.

## Decided for the build (2026-10-21, #125)

The rules are in [`docs/system-design.md`](../system-design.md) under Subscription, and in `lib/aggregate/subscriptionRenewals.ts`.

1. **"It didn't charge"** records a ₹0 payment with status `Skipped`. The renewal shows as skipped, not as not recorded.
2. **Mark paid** is offered from 3 days before the renewal, today included.
3. **A payment within half a cycle** of a renewal, either side, counts for it. Renewals are settled in date order, each by the earliest payment in its window.
4. **A price change** is a payment 2% or more different from the one before it; smaller moves are ignored.
5. **Pending** stays in the model, but the app never writes it: upcoming renewals are computed.

## How it got here

The canvas keeps everything explored, newest first: A–K (layouts), L–P (heroes), Q–Z (selectors), S1–S6 (circular carousels) and S7–S16 (the cover flow refined, each with a different full-width chart). Prathik kept these from them: F's greeting, D's cost map, C's payments table, S's cover flow with All at the centre, scrolling in a circle, S9's coloured stage, S9's Day by day chart, S7's Payment trend and S14's Lifetime cost. Along the way he asked that no section be added just to fill space (a separate colour band was dropped), and that cards side by side end level. A layout check measured this across every pick.
