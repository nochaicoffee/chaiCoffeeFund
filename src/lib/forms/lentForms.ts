import { principalOutstanding, summariseLentLoan } from "../aggregate/lentOut";
import { formatInr } from "../format/money";
import { CARD_COLORS, LENT_INTEREST_MODES, type CardColor, type LentInterestMode, type LentLoan, type LentRepayment, type LentRepaymentKind, type RecurrenceCycle } from "../sheets/types";
import { FieldReader, type FieldErrors, type FormFields, type FormResult } from "./fields";

/**
 * The Lent page's forms (docs/design/lent-out.md, task B1; mockups in `design/lent-out/LeForms`): Add or edit a loan, Record a
 * repayment, and Mark repaid. Each reads its fields into what the repository expects, or plain-word errors by field.
 */

export const LENT_PAYOUT_FREQUENCIES: readonly RecurrenceCycle[] = ["Monthly", "Quarterly", "Yearly"];
const REPAYMENT_KINDS: readonly LentRepaymentKind[] = ["Principal", "Interest"];

export interface LentLoanInput {
  borrowerName: string;
  principalAmount: number;
  startDate: string;
  interestMode: LentInterestMode;
  /** Accruing only: the yearly simple rate in percent. */
  interestRate?: number;
  /** Paid-out only. */
  payoutFrequency?: RecurrenceCycle;
  payoutAmount?: number;
  /** Blank is none: the loan gets a stable colour from its id (`lentLoanColor`). */
  color?: CardColor;
}

/**
 * Add a loan, and Edit one. An Accruing loan says its yearly rate; a Paid-out loan says how often it pays and how much, and its
 * rate is worked out from that. `earliestRepayment` is the day of the first repayment already recorded, which the loan can't start after, and
 * `principalReturned` is the principal already back, which the amount lent can't be less than.
 */
export function readLentLoanForm(fields: FormFields, known: { earliestRepayment?: string; principalReturned?: number }, today: string): FormResult<LentLoanInput> {
  const f = new FieldReader(fields);
  const borrowerName = f.text("borrowerName", "Enter who borrowed it");
  const principalAmount = f.amount("principalAmount", { required: "Enter the amount you lent", label: "amount lent" });
  if (principalAmount === 0) f.fail("principalAmount", "The amount lent has to be more than ₹0");
  if (principalAmount !== undefined && known.principalReturned !== undefined && principalAmount < known.principalReturned) f.fail("principalAmount", `${formatInr(known.principalReturned)} of it has already come back, so it can't be less than that`);
  const startDate = f.date("startDate", "Enter the day you lent it");
  if (startDate && startDate > today) f.fail("startDate", "You can't have lent it on a day that hasn't come yet");
  if (startDate && known.earliestRepayment && startDate > known.earliestRepayment) f.fail("startDate", "A repayment is dated before this day. Move it, or lend on an earlier day");
  const interestMode = f.choice("interestMode", LENT_INTEREST_MODES, "Choose whether the interest builds up or is paid out");

  let interestRate: number | undefined;
  let payoutFrequency: RecurrenceCycle | undefined;
  let payoutAmount: number | undefined;
  if (interestMode === "Accruing") {
    interestRate = f.amount("interestRate", { required: "Enter the yearly rate", label: "rate" });
    if (interestRate !== undefined && (interestRate === 0 || interestRate > 100)) f.fail("interestRate", "A rate is a percentage a year, like 12");
  } else if (interestMode === "Paid-out") {
    payoutFrequency = f.choice("payoutFrequency", LENT_PAYOUT_FREQUENCIES, "Choose how often it pays");
    payoutAmount = f.amount("payoutAmount", { required: "Enter how much it pays each time", label: "payout" });
    if (payoutAmount === 0) f.fail("payoutAmount", "The payout has to be more than ₹0");
  }

  const colorText = f.raw("color").trim();
  let color: CardColor | undefined;
  if (colorText !== "") {
    if ((CARD_COLORS as readonly string[]).includes(colorText)) color = colorText as CardColor;
    else f.fail("color", "Choose one of the colours");
  }

  return f.result({
    borrowerName: borrowerName!,
    principalAmount: principalAmount!,
    startDate: startDate!,
    interestMode: interestMode!,
    ...(interestRate !== undefined && { interestRate }),
    ...(payoutFrequency && { payoutFrequency }),
    ...(payoutAmount !== undefined && { payoutAmount }),
    ...(color && { color }),
  });
}

export interface RepaymentInput {
  date: string;
  amount: number;
  kind: LentRepaymentKind;
}

/** A repayment's result: like any form's, plus `overridable` when the only trouble is a warning that "Record it anyway" answers. */
export type RepaymentResult = FormResult<RepaymentInput> | { ok: false; errors: FieldErrors; overridable: true };

/**
 * Record money that came back. **Principal above what is out, or interest above what is owed, on that day is a warning, not a block**: it is
 * refused until the form is sent again with `confirmed` set. Interest on a Paid-out loan is refused: it arrives through Income (ADR 0014),
 * so recording it here would count it twice. `repayments` are this loan's own.
 */
export function readRepaymentForm(fields: FormFields, loan: LentLoan, repayments: LentRepayment[], today: string): RepaymentResult {
  const f = new FieldReader(fields);
  if (loan.status === "Repaid") f.fail("form", "This loan is marked repaid. Reopen it to record a repayment");
  const kind = f.choice("kind", REPAYMENT_KINDS, "Choose whether it was principal or interest");
  const date = f.date("date", "Enter the day it came back");
  if (date && date > today) f.fail("date", "It can't have come back on a day that hasn't come yet");
  if (date && date < loan.startDate) f.fail("date", "It can't have come back before it was lent");
  const amount = f.amount("amount", { required: "Enter the amount that came back", label: "amount" });
  if (amount === 0) f.fail("amount", "The amount has to be more than ₹0");
  if (kind === "Interest" && loan.interestMode === "Paid-out") f.fail("kind", "A paid-out loan's interest arrives through Income. Record it there so it isn't counted twice");
  if (!f.ok || !kind || !date || amount === undefined) return { ok: false, errors: f.errors };

  // The warnings: more than is out (principal) or owed (interest) on that day.
  let warning: string | undefined;
  if (kind === "Principal") {
    // On that day, and over the whole loan: a back-dated repayment can fit on its day and still take the total above what was lent.
    const out = Math.min(principalOutstanding(loan, repayments, date), principalOutstanding(loan, repayments, today));
    if (amount > out + 0.5) warning = `That's more than the ${formatInr(out)} that would still be out`;
  } else {
    const owed = summariseLentLoan(loan, repayments, date).interestOwed;
    if (amount > owed + 0.5) warning = `That's more than the ${formatInr(owed)} of interest owed on that day`;
  }
  if (warning && f.raw("confirmed") !== "1") return { ok: false, errors: { amount: warning }, overridable: true };
  return { ok: true, input: { date, amount, kind } };
}

export interface RepaidInput {
  closedDate: string;
}

/** Mark a loan repaid: the day the last of it came back. It can't be before the loan, after today, or before a repayment already recorded. */
export function readRepaidForm(fields: FormFields, loan: Pick<LentLoan, "startDate">, repayments: LentRepayment[], today: string): FormResult<RepaidInput> {
  const f = new FieldReader(fields);
  const closedDate = f.date("closedDate", "Enter the day it was paid back in full");
  if (closedDate && closedDate > today) f.fail("closedDate", "It can't have been paid back on a day that hasn't come yet");
  if (closedDate && closedDate < loan.startDate) f.fail("closedDate", "It can't have been paid back before it was lent");
  const latest = repayments.map((r) => r.date).sort().at(-1);
  if (closedDate && latest && closedDate < latest) f.fail("closedDate", "A repayment is dated after this day. Use that day or later");
  return f.result({ closedDate: closedDate! });
}
