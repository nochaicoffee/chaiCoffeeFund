# 0008. Update bank account balances from emailed statements

- **Status:** Accepted
- **Date:** 2026-10-23

## Context
Balances on the Accounts page are typed in by hand. Three of the banks (HDFC, Slice and Jupiter, whose accounts are with Federal Bank) email statements as password-protected PDFs: monthly, yearly, or for any date range Prathik asks for. A statement is a source of truth for the balance on its last day, and for every month-end inside it. The card statement import (ADR 0006) already reads Gmail and PDFs, but a bank account has no statement row to write: the target is a `BalanceSnapshot`, and a snapshot may already exist for the day, typed by hand or from another statement.

## Decision
- **A second, separate sync** reads a second Gmail label (`GMAIL_ACCOUNT_STATEMENT_LABEL`) and writes `BalanceSnapshots`, marked `source: Statement`. It reuses the card import's Gmail client, PDF reader, time budget, per-email timeout, batched writes and run lock, and has its own email log (`AccountStatementEmails`). The card sync is unchanged. A sync run has a `kind` (Cards or Accounts), so the two don't hold each other up.
- **Only three banks are read**, each by its own parser, found by the statement's layout and not by its name (a UPI narration in one bank's statement names the others). The other accounts stay manual. An account with no PDF password saved is simply not imported.
- **A statement is trusted only if its own numbers add up:** the opening balance, plus or minus each row, must reach each row's printed balance and the closing balance. Otherwise nothing is written and the email is reported.
- **Which balances a statement gives:** the opening balance (the day before the period), the balance after the last transaction of each month with transactions, and the closing balance on the period's last day. A month with no transactions gets none: carrying the last balance forward (decision 1 in `docs/design/accounts.md`) already gives the same figure.
- **The recorded balance always wins.** A statement that disagrees with a balance already recorded for the same account and day changes nothing. It opens a `BalanceReviews` row holding both values, shown as "needs attention" (on the greeting, in a card under it, and on the balance in Balance history) until Prathik chooses **Use the statement's** (writes it) or **Keep the Sheet's** (closes it). The same statement is never raised twice, and a corrected one replaces the open question.
- **Slice's balance includes its round-up ("atom") account.** The range statements print savings plus atoms, and the monthlies show them as separate accounts, so the monthlies add the round-up balance to the opening and closing balance. If the round-up money moved during a statement, only the opening and closing balance are written, since its dates aren't known.
- Matching is by bank and the account number's last 4 digits, never guessed: no match or more than one is reported. An account with no last 4 saved takes it from the statement when it is the bank's only such account and the PDF holds just that one statement: a PDF with several accounts (HDFC's combined one) can't say whose is whose.

## Consequences
- Gmail access stays read-only (`gmail.readonly`). Labels are applied by hand.
- PDF passwords are a second plaintext column in a private Sheet (`Accounts.statementPdfPassword`), accepted under the same reasoning as the card one (ADR 0006, PRD Q3). Edit account takes it, and it is never sent to the browser.
- A new bank needs a parser, written from a real statement's text and tested on invented text in the same layout.
- Like the card sync, it runs from the Sync button or `POST /api/account-statements/sync`; scheduling follows ADR 0007.
- An email that is logged as done is not read again. To re-read one (an account was added since), delete its row in `AccountStatementEmails`. A failed one is tried again on every button press, but a scheduled run leaves out those that failed in the last day, so an email that can only fail until something is changed isn't downloaded over and over.

## Alternatives considered
- **The statement overwrites the Sheet on a mismatch.** The first answer. Rejected for the opposite rule: a hand-typed balance may be right, and silently replacing it hides the disagreement.
- **Savings only for Slice.** Rejected: the range statement can't be split into savings and atoms.
- **One sync for cards and accounts.** Rejected: the targets, matching and failure modes differ, and a bad account statement must not hold up a card one.
