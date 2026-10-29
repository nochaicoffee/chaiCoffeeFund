# Insurance page (`/insurance`)

## Status (2026-10-29)

**Designed on his real policies, and built (#209 to #215): the data layer, the page, its widgets, the forms and the states. What's left is the PRD feature and the system-design section, which wait for the gap-review docs to be committed (#216).** Prathik picked the **Cover map** as the hero. Mockups: [`design/insurance/`](../../design/insurance/), built by [`design/insurance/generator/`](../../design/insurance/generator/) (a rebuild overwrites the artboards, so change the generator).

The policies are his own, read on 2026-10-29 from the four PDFs in his Gmail `Insurance` label (read-only, with the app's Gmail credentials). Identifiers are cut to their last digits, and no address, date of birth, nominee, PAN or customer ID is in the repo. "Today" is Oct 29, 2026; dates after it and the 2027 renewal quotes are illustrative.

This answers the open question from the 2026-10-27 gap review (PRD Q11 and `system-design.md` item 8, still uncommitted in his working docs when this was written; the PRD feature (F-IS-01) and the system-design section are to be written once they're committed): insurance as Subscriptions categories, or its own page. **its own page, one dashboard, not one per type.** Insurance asks different questions from a subscription: whether you're covered, for how much, and when it lapses.

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

## Data model (accepted: [ADR 0010](../adr/0010-insurance-terms-with-years.md))

Like Subscriptions and its payments, and Loans and their installments: a master row and a row for each **term**.

- **`Policies` tab** (built in #209, `lib/sheets/policies.ts`; columns in order): `id`, `name`, `kind` (`Health`, `Life`, `Motor`, `Home`, `Accident`), `insurer`, `policyNumber`, `covers`, `coversDetail`, `sumInsured` (the IDV for a vehicle), `status` (`Active`, `Cancelled`), `endedOn`, `color`, `paidFromAccountId`, `paidFromCardId`, `addOns` (comma-separated), `claimsPhone`, `documentUrl` (http or https only), `notes` (waiting periods, deductible, exclusions: anything to look up when claiming). Enum text matches the Sheet's dropdowns exactly.
- **`PolicyPayments` log** (`lib/sheets/policyPayments.ts`; columns in order): `id`, `policyId`, `periodStart`, **`years`** (a whole number, 1 to 5: the cover this premium buys), `amount`, `paidOn` (**optional**: when blank, `periodStart` is used and the row is shown as "assumed", and the figures that depend on the day (paid this year, a month's bar) carry that assumption until it's entered; a premium paid in a different calendar year from its start would be counted in the wrong one), `status` (`Pending`, `Paid`; a Pending term has no paid-on day), `paidFromAccountId`, `paidFromCardId` (at most one), and per term `sumInsured` (IDV) and `ncb` (the no-claim step: 0, 20, 25, 35, 45 or 50). There is no Skipped status: a term nobody paid for is a lapse, worked out from the dates. **Renewing is recording the next term.** `periodEnd` and the renewal date are worked out from `periodStart` and `years`.
- **What a policy covers:** a text column, `covers` ("You", "Parents", "Car", "Bike", "Home"), that the page groups by, with `coversDetail` for a vehicle's model and the end of its registration. A separate tab for them was weighed and left out: nothing else needs a list of insured things yet (open decision 3).
- **A financed thing with no policy** is worked out, never stored: a `Loans` row of category `Home` or `Auto` with nothing against it. Nothing in his data does today. The page says nothing about whether a policy is needed.

## Numbers (definitions)

Built in `lib/aggregate/insurance.ts` (#210) as pure functions with tests that prove the math. Prathik answered the four open points on 2026-10-29, each with the default below.

- **A term** is a Paid payment: it buys `years` of cover from `periodStart`, and its last day is the day before the start plus its years. A Pending payment is a quote and counts for nothing.
- **State** of a policy: **In force**, **Renew soon** (30 days or fewer to the renewal date), **Lapsed**, **Cancelled**, and two edge states, **Not started** (every term starts after today) and **No term** (a policy with no Paid term). (confirmed 2026-10-29) It's worked out from the dates, never typed in. The 30 days is `RENEW_SOON_DAYS`, a placeholder.
- **Lapsed is on the renewal date** (decided): cover ends on the last day, so from the renewal date on, with no later term, it has lapsed, and 0 days left reads as lapsed. There is no grace period; a health policy's 30-day grace isn't shown.
- **Renewal date and days left** use the end of the **latest recorded term** (decided), so recording an early renewal moves it at once. The term "in force" is the latest one that has started, and "gone by" is measured on it. A term recorded for a start after today's term ends leaves a gap, and the policy is lapsed in the gap (confirmed 2026-10-29). The renewal date is the latest end of any term, so a shorter term inside a longer one can't pull it in.
- **A year of cover** is the in-force term's premium over its years (a single premium is spread evenly); **a month** is that over 12. Lapsed, cancelled, not-started and no-term policies are left out of every total.
- **Paid this year** is the cash that left in the **calendar year** (decided), up to today: each Paid term by its paid-on day, or by its start when the day isn't known, with the amount dated by a guess reported beside it. A Paid term with no paid-on day whose cover starts later (an early renewal) was paid by today, so it's dated today (confirmed 2026-10-29); a paid-on day later than today is a scheduled one and isn't counted yet. A three-year premium is all in the year it was paid, so it can be far more than a year of cover. **Still to pay** is the renewals to come in the year at each held policy's last premium.
- **Premiums by month** (the runway) are the Paid terms by the day the money left, then each held policy stepping on from its renewal date by its latest term's years, at that term's amount. A cancelled or lapsed policy keeps its history and has no future bars.
- **Price change** compares each term's cost of a year with the term before it, so a three-year premium isn't three times dearer.
- **Cover** is shown by kind (health, accident, a vehicle's IDV on its own); unlike things are never added into one grand total. **A year ÷ cover** is a policy's price against its own history, and none when there is no cover figure.
- **No-claim bonus** goes up one step (0, 20, 25, 35, 45, 50%) at renewal after a term without a claim, and the top step stays. The app can't see claims, so the next step is what it expects and the certificate is the truth.
- **A financed thing with no policy** (decided): an active Auto loan with no motor policy held, or an active Home loan with no home policy held. It can't tell which vehicle a loan financed, and it says nothing about whether a policy is needed. A lapsed or cancelled policy isn't held.
- **A premium paid on a card** counts once, as a premium, and not again as card spending (the cross-cutting principle in `system-design.md`).

## The write side (built in #211)

- **Routes:** `/api/policies` and `/api/policy-payments`, from the shared factories, with three custom handlers because each does more than one thing: deleting a policy deletes its payments too, and creating or changing a payment runs the same term guard as Renew (so the API can't record what the forms refuse). The policy routes send the policy number cut to its last four characters ("…3850"), and a number that starts with "…" can't be saved back over the whole one.
- **Cache:** the tags `policies` and `policyPayments`, with cached list and by-id reads, and the Refresh button covers them.
- **Add policy** writes the policy and its first term together; if the term can't be written the policy is taken back out. **Renew** records the next term (`lib/insurance/policyWrites.ts`), refuses one that starts on the same day as, or overlaps, a term already there, refuses a no-claim step on a policy that isn't motor, and refuses a cancelled policy (restart it first). A late renewal is allowed and the gap stays in the history. If the cover can't be moved the new term is taken back out. **Undo** takes the term out and puts the cover back.
- **Cancel** stops a policy counting and keeps every payment. The reason goes on the policy's notes ("Cancelled: Vehicle sold"); the mockup's Refund and "Replaced by" boxes have no column and aren't stored. **Restart** sets it Active, and that alone clears the cancelled-on date.
- **Edit** changes the policy only (the terms are Renew's). A blank optional box clears it, except the policy number: the browser never has it whole, so a blank number is left as it is.
- **Delete** removes a policy's payments and then it, for a mistake. A policy that has ended is cancelled, not deleted.

## The page (built in #212)

- **`/insurance`** after Loans in the sidebar. `loadInsuranceData` reads the Policies, PolicyPayments and Loans tabs in parallel (the loans only for the "financed thing with no policy" check); `?demo` shows sample data in development, `?demo=soon`, `lapsed`, `lapsed-accident`, `renewed`, `cancelled` and `empty` the other states (InsStates), and nothing from a demo is read from or written to the Sheet.
- **The greeting** is a `SentencePart[]` built in `app/insurance/views.ts` with a `greetingView` keyed by the same points (`policies`, a kind's cover, `vehicles`, `year`, `paid`, `next`, `gap`); a test checks that every figure has a card and every card a figure. With nothing in force there are no figures and the sentence is plain.
- **The attention strip**: a policy that has lapsed (red, first), then each renewing within 30 days (amber). Its button, See policy, picks the policy; Renew joins it in #214 with the forms.
- **The cover map** groups policies by their `covers` text (You first, then in Sheet order), one tile per thing, a box per policy with its cover (sum insured, or IDV), a term bar with its own hover card, days left, and what it cost. A loan with nothing insuring it gets a dashed tile. The pick is `?policy=` (default all); the widgets under the map follow it as #213 adds them.
- **The payments page** (`/insurance/payments`, as Cards' Statements and Loans' Installments): every term of every policy, a section each, newest first, with Edit and Delete. Edit is for what the PDFs didn't say (the day paid, where from) and for a mistake in the dates; it can't move a term to another policy, and a change to its start, years or no-claim step must still fit the policy's other terms. Undo for six seconds. Delete removes a term recorded by mistake and leaves the policy.
- **The states** (#215): the empty page offers four kinds to start from; a lapsed accident cover's strip says what it leaves bare when a live motor policy's notes say it leaves owner-driver cover out (`LEAVES_OWNER_DRIVER_OUT`), so write that in the motor policy's notes; a loan with no policy offers Add policy starting as a Home (or Motor) policy.
- **Lapsed is counted from the renewal date**, as decided: "lapsed 9 days ago" is nine days since the day the term would have renewed.
- **Privacy**: the page works from the views alone, which carry no policy number; a test sends a number through every view and looks for it.

## Open decisions (defaults are what the mockups show)

1. Its own page, as drawn, or Subscriptions categories (the gap review's Q11). When those docs are committed, mark Q11 answered and rewrite item 8 to point here.
2. The 30-day "renew soon" window.
3. What "covers" is: its own tab, or a text column.
4. Storing the insurer's claims number and a link to the policy PDF (drawn, optional). The PDFs gave the claims numbers, so they're filled in.
5. **Importing from Gmail.** He keeps these PDFs under a Gmail label, as the card and bank statements are. A third sync (ADR 0006 and 0008's pattern: read-only, idempotent, a disagreement waits for an answer) could read them, but each insurer's PDF has its own layout, and the four here are unlike. It needs its own ADR and a parser per insurer; entering four policies by hand is quicker today.
6. Rent and education fees (the other halves of the gap review's F-SU-03) stay in Subscriptions.

## Not designed yet

Claims history, and anything about tax deductions. Both are left out on purpose. A premium paid in instalments and a port to another insurer are not drawn either.
