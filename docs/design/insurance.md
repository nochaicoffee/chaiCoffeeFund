# Insurance page (`/insurance`)

## Status (2026-10-29)

**Designed on his real policies, not built.** Prathik picked the **Cover map** as the hero. Mockups: [`design/insurance/`](../../design/insurance/), built by [`design/insurance/generator/`](../../design/insurance/generator/) (a rebuild overwrites the artboards, so change the generator).

The policies are his own, read on 2026-10-29 from the four PDFs in his Gmail `Insurance` label (read-only, with the app's Gmail credentials). Identifiers are cut to their last digits, and no address, date of birth, nominee, PAN or customer ID is in the repo. "Today" is Oct 29, 2026; dates after it and the 2027 renewal quotes are illustrative.

This answers the open question from the 2026-10-27 gap review (PRD Q11 and `system-design.md` item 8, still uncommitted in the working docs when this was written): insurance as Subscriptions categories, or its own page. **its own page, one dashboard, not one per type.** Insurance asks different questions from a subscription: whether you're covered, for how much, and when it lapses.

## His policies

| Policy | Insurer | Cover | Term | Paid |
|---|---|---|---|---|
| Health, Lifetime Health (India Plan, individual) | ManipalCigna | ₹50,00,000 | Jul 5, 2026 to Jul 4, 2029 | ₹38,428 **once, for 3 years** |
| Accident, owner-driver cover | Digit | ₹15,00,000 | Mar 21, 2026 to Mar 20, 2027 | ₹451 |
| Car, Comprehensive Platinum (Honda City, 2011) | Acko | IDV ₹4,42,000 | Aug 6, 2026 to Aug 5, 2027 | ₹5,504 (no-claim bonus 50%) |
| Bike, Long-term package (Gixxer SF 250, 2020) | Bajaj General | IDV ₹73,545 | Mar 21, 2026 to Mar 20, 2029 | ₹5,241 **once, for 3 years** |

Things the PDFs say that the design uses:

- **Two are single premiums for three years.** A year of cover is ₹20,511 (₹1,709 a month), but ₹49,624 left his accounts this year. 77% of it is the health cover. So the page shows both, and a policy's "a year" is its premium over the years it bought.
- **The bike's policy leaves out owner-driver accident cover** ("already having PA cover of Rs. 15 lac"), because the Digit cover exists. If the Digit cover lapses, nothing covers him as the bike's driver. The lapsed state says so.
- **Nothing is due for 143 days** (the accident cover, Mar 21, 2027), so today the page has no attention strip.
- The PDFs don't say **where any premium was paid from**, or **the day the health and car premiums were paid**. Paid-from shows "Not recorded"; the payment day is taken as the day cover began, and marked "assumed". **Decided 2026-10-29: keep it that way** until he enters the real ones in the app.
- Health: a 30-day initial and a 24-month waiting period apply; the 15% cumulative bonus and OPD are listed, and worldwide emergency cover is a separate ₹25,00,000 benefit (it's the figure I first mistook for the sum insured). There is no deductible. Car: ₹1,000 deductible, no zero-depreciation add-on. Bike: ₹100 deductible, 24x7 spot assistance.
- The bike's schedule lists own-damage ₹343 and liability ₹4,098 for the three years. It's worth checking with Bajaj that own-damage runs the whole three years.
- No term life, parents' health or home policy is in the label. They aren't invented: the page has a dashed "Something else?" tile.

## The canvas

| Artboard | What it shows |
|---|---|
| `InsFinal` | **The page.** The cover map hero (a policy is the pick; Premiums paid and Policy details follow it), runway, renewals, policies table, cover timeline, no-claim bonus, what cover costs |
| `InsStates` | No policies, a renewal close, lapsed, renewed, cancelled, a home with a loan and no policy |
| `InsPhone` | The stacked cover map, the runway, renewals and payments, and the Renew bottom sheet |
| `InsForms` | Add policy (health paid once for three years, and motor), Renew (on time and after a lapse), Cancel |

**Round 1 (2026-10-29)** drew four heroes on made-up policies: **I1 Premium runway** (kept, as a widget), **I2 Cover map** (picked), **I3 Premium creep** (what each policy cost term by term; it needs earlier terms, which the PDFs don't hold, so it waits until earlier years are entered), and **I4 Year wheel** (a ring per policy; dropped, since the cover timeline shows the same thing with multi-year terms more plainly). Those artboards were replaced when the sample became his real data.

The greeting's figures point, as on every dashboard (`pointLede` in `parts.mjs`).

## Data model (proposed; needs a yes)

Like Subscriptions and its payments, and Loans and their installments: a master row and a row for each **term**.

- **`Policies` tab** (built in #209, `lib/sheets/policies.ts`; columns in order): `id`, `name`, `kind` (`Health`, `Life`, `Motor`, `Home`, `Accident`), `insurer`, `policyNumber`, `covers`, `coversDetail`, `sumInsured` (the IDV for a vehicle), `status` (`Active`, `Cancelled`), `endedOn`, `color`, `paidFromAccountId`, `paidFromCardId`, `addOns` (comma-separated), `claimsPhone`, `documentUrl` (http or https only), `notes` (waiting periods, deductible, exclusions: anything to look up when claiming). Enum text matches the Sheet's dropdowns exactly.
- **`PolicyPayments` log** (`lib/sheets/policyPayments.ts`; columns in order): `id`, `policyId`, `periodStart`, **`years`** (a whole number, 1 to 5: the cover this premium buys), `amount`, `paidOn` (**optional**: when blank, `periodStart` is used and the row is shown as "assumed", and the figures that depend on the day (paid this year, a month's bar) carry that assumption until it's entered; a premium paid in a different calendar year from its start would be counted in the wrong one), `status` (`Pending`, `Paid`; a Pending term has no paid-on day), `paidFromAccountId`, `paidFromCardId` (at most one), and per term `sumInsured` (IDV) and `ncb` (the no-claim step: 0, 20, 25, 35, 45 or 50). There is no Skipped status: a term nobody paid for is a lapse, worked out from the dates. **Renewing is recording the next term.** `periodEnd` and the renewal date are worked out from `periodStart` and `years`.
- **What a policy covers:** a text column, `covers` ("You", "Parents", "Car", "Bike", "Home"), that the page groups by, with `coversDetail` for a vehicle's model and the end of its registration. A separate tab for them was weighed and left out: nothing else needs a list of insured things yet (open decision 3).
- **A financed thing with no policy** is worked out, never stored: a `Loans` row of category `Home` or `Auto` with nothing against it. Nothing in his data does today. The page says nothing about whether a policy is needed.

## Numbers (definitions)

Each needs a yes and a test that proves the math before it's built (CLAUDE.md); all go in `lib/aggregate/insurance.ts` as pure functions.

- **State** of a policy: **In force**, **Renew soon** (the renewal is within 30 days), **Lapsed** (the renewal date has passed with no payment recorded), **Cancelled**. It's worked out from the dates, never typed in. The 30 days is a placeholder.
- **A year of cover** is each policy's last premium over the years it bought (`premium ÷ years`); **a month** is that over 12. **Paid this year** is the cash that left in the calendar year, so it can be far more than a year of cover. The page says why when they differ.
- **Cover** is shown by kind: health and accident are separate, and a vehicle shows its IDV. It's never one grand total of unlike things. Two health policies wouldn't pool: each covers its own people.
- **A year ÷ cover** is a policy's price against its own history, not a comparison between kinds.
- **No-claim bonus** goes up one step (0, 20, 25, 35, 45, 50%) at renewal after a term without a claim, and back to 0 after one. The app can't see claims, so the next step is what it expects and the certificate is the truth. The car is at the top step; the bike's first comes with its renewal in 2029.
- **A premium paid on a card** counts once, as a premium, and not again as card spending (the cross-cutting principle in `system-design.md`).

## Open decisions (defaults are what the mockups show)

1. Its own page, as drawn, or Subscriptions categories (the gap review's Q11). When those docs are committed, mark Q11 answered and rewrite item 8 to point here.
2. The 30-day "renew soon" window.
3. What "covers" is: its own tab, or a text column.
4. Storing the insurer's claims number and a link to the policy PDF (drawn, optional). The PDFs gave the claims numbers, so they're filled in.
5. **Importing from Gmail.** He keeps these PDFs under a Gmail label, as the card and bank statements are. A third sync (ADR 0006 and 0008's pattern: read-only, idempotent, a disagreement waits for an answer) could read them, but each insurer's PDF has its own layout, and the four here are unlike. It needs its own ADR and a parser per insurer; entering four policies by hand is quicker today.
6. Rent and education fees (the other halves of the gap review's F-SU-03) stay in Subscriptions.

## Not designed yet

Claims history, and anything about tax deductions. Both are left out on purpose. A premium paid in instalments and a port to another insurer are not drawn either.
