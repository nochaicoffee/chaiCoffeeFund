# 0010. Record insurance as a policy plus a payment for each term, with the years a premium buys

- **Status:** Accepted
- **Date:** 2026-10-29

## Context
The page this serves is specified in [docs/design/insurance.md](../design/insurance.md). Insurance asks different questions from a subscription: whether you're covered, for how much, and when it lapses. Two of the four policies in the first data set are single premiums for three years (a health plan, a bike's long-term package), and the others renew each year. If a policy were one row with a "renews on" date and a yearly premium, a three-year premium would either be spread by hand or look three times dearer than a yearly one, "what left my accounts this year" and "what a year of cover costs" could not both be right, and a lapse could not be told from a policy that simply hasn't been renewed yet. The same shape (a master row and a row for each period) already exists for subscriptions and their payments, and for loans and their installments.

## Decision
- **Two tabs.** `Policies` holds the policy (kind, insurer, what it covers, the sum insured or IDV, status, add-ons, notes). `PolicyPayments` holds one row for each **term**: its start, **`years`** (a whole number, 1 to 5: the cover this premium buys), the amount paid for all of it, the day it was paid (optional), whether it is Paid or Pending, where it was paid from, and for a vehicle its IDV and no-claim step.
- **A term's last day and the renewal date are worked out, never stored:** the start plus `years`, less a day. The policy's renewal date is the latest end of any Paid term, so recording an early renewal moves it at once.
- **A year of cover** is a term's premium over its `years`, and a month of it is that over 12. **Cash paid** is by the calendar year of the day paid (the start of cover when the day isn't known, marked assumed, and today for a term already paid whose cover starts later). So a single premium for three years is all in the year it was paid, and the page says why that differs from a year of cover.
- **Renewing is recording the next term.** There is no "skipped" term: a term nobody paid for is a lapse, worked out from the dates. A policy is lapsed from its renewal date until a later term is recorded, including in a gap before one recorded late.
- **State is derived** (In force, Renew soon, Lapsed, Cancelled, Not started, No term) from the dates and the policy's status, never typed in.
- **Ending a policy deletes nothing.** Cancel sets the status and keeps every payment; only Delete, for a mistake, removes a policy and its payments, payments first.
- **The policy number is kept whole in the private Sheet and shortened to its last four characters on the server before anything reaches the browser.** A number that starts with "…" is refused on save, so the shortened one can't overwrite the whole.

## Consequences
- One shape covers single and yearly premiums, early and late renewals, and multi-year terms, and the runway, renewals, timeline and cost figures all read from the same terms.
- The figures that depend on the day paid carry an assumed flag until it's entered, and say how much of a total is a guess.
- The rules live in `lib/aggregate/insurance.ts` as pure functions with tests (decided with Prathik, 2026-10-29): the 30-day "renew soon" window is a placeholder, and there is no grace period.
- A premium paid in instalments inside one term, and a port to another insurer, are not modelled.
- Claims, and anything about tax deductions, are left out on purpose.

## Alternatives considered
- **One row per policy with a yearly premium and a renewal date:** it can't hold a multi-year premium honestly, loses the history, and can't tell a gap from a late renewal.
- **Insurance as categories of Subscriptions:** a subscription is about what you pay each period; insurance is about whether you're covered and when it lapses, so it needs its own states and its own page.
- **Store a "lapsed" flag or a periodEnd:** both go stale the day after they're written; deriving them from the start, the years and today can't.
- **Import the policies from the PDFs in Gmail:** each insurer's PDF has its own layout, so it needs a parser per insurer and its own ADR. Entering four policies by hand is quicker today.
