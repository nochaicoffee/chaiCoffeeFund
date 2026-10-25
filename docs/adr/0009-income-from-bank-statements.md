# 0009. Record income from the bank statements the sync already reads

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
Prathik's NetApp salary lands in his HDFC account every month, and the account statement sync (ADR 0008) already reads HDFC's statements for balances. Typing the salary in by hand as well would be the same money entered twice. Everything else he earns (interest, dividends, one-offs) he records himself. RSU vests and ESPP purchases aren't income at all (PRD §8): they're investments.

## Decision
- **Income rides on the account statement sync**, not a sync of its own. A statement that's used for balances (its numbers add up and it matched an account) also gives its income. Both HDFC readers keep each row's narration (`StatementRow.narration`).
- **A source opts in with a statement text** (`IncomeSources.statementMatch`, "NETAPP"). A deposit whose narration contains it, ignoring case and spaces (pdf.js wraps narrations with stray spaces), is that source's. The longest text wins if two match; a source with an account only takes deposits into it.
- **Always Regular** (Prathik, 2026-10-25): amount never decides, so a raise is never mistaken for a bonus. A bonus is retagged by hand.
- **Its expected date** is the source's scheduled date nearest the day it landed, within half a cycle (a salary landing Sep 30 receives the Oct 1 payday), so pending and late work the same as for income typed in.
- **Never twice:** an entry carries `statementRef` (account, date, amount, and which of that day's same-amount lines it is), and a deposit is skipped when the source already had an entry of the same amount within 3 days before this statement; two lines of one statement are two payments. Only active sources match. The second rule covers the same money read from a monthly statement (dated by posting) and a yearly one (dated by value date), and money already typed in.
- Entries are `origin: Statement` and written before the email is logged, like balances.

## Consequences
- Statements read before this existed are read again with `POST /api/account-statements/sync` `{ "reread": true }`, which plans every labelled email, done or not. That's safe for balances: a recorded one comes back unchanged and a disagreement already waiting opens no second review.
- A bonus credited in the same cycle as the salary counts as that cycle's or the next one's regular payment until it's retagged.
- A new kind of statement income needs only a source with a statement text, as long as its bank's reader keeps narrations (Slice and Jupiter's don't yet).

## Alternatives considered
- **A separate income sync over the same emails:** two reads of the same PDFs and two logs to keep in step, for no gain.
- **Tag a large or second credit as Bonus:** offered; Prathik chose always Regular, since amount rules misfire on a raise or arrears.
