import type { FixedDeposit } from "../sheets/types";

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return (to - from) / (24 * 60 * 60 * 1000);
}

/**
 * What a deposit needs to be valued: the maturity amount is optional (his FD app shows none), and the
 * rate is used only when there isn't one.
 */
export type ValuableDeposit = Pick<FixedDeposit, "principalAmount" | "interestRate" | "compoundingType" | "startDate" | "maturityDate" | "status"> & {
  maturityAmount?: number;
};

/**
 * `principal` grown for `days` at `ratePercent` a year, compounded quarterly and accrued daily:
 * `principal × (1 + rate/4)^(4 × days/365)`. Checked against the interest his FD app shows on seven
 * deposits: within ₹2.50 on each of them (₹3,014 against ₹3,020 in all).
 */
export function compoundedValue(principal: number, ratePercent: number, days: number): number {
  return principal * (1 + ratePercent / 100 / 4) ** (4 * (days / 365));
}

/**
 * Worth today, as an ESTIMATE, not the redemption value (real deposits compound on conventions that
 * vary by bank, which is why a maturity amount is a stored fact when there is one).
 *
 * - Before the start it is the principal; on or after the maturity date it is the maturity amount.
 * - With a stored maturity amount, the value grows at the rate that principal, that amount and the
 *   two dates imply, so it lands exactly on the amount on the last day and never jumps.
 * - Without one, it is quarterly compounding at the stated rate, and the maturity amount is that
 *   compounding carried to the maturity date.
 * - A payout deposit's interest is paid out, so it stays at its principal throughout, with or without a
 *   maturity amount.
 * - A stored maturity amount that is not a number at least the principal (a bad row) is ignored, so a value
 *   never falls, goes to 0 or becomes NaN and drags a whole total with it.
 */
export function estimatedCurrentValue(fd: ValuableDeposit, asOfDate: string): number {
  // A payout deposit's interest is paid out to him, so what is held stays the principal whatever the maturity amount says.
  if (fd.compoundingType === "Non-Cumulative") return fd.principalAmount;
  if (asOfDate <= fd.startDate || !(fd.principalAmount > 0)) return fd.principalAmount;

  // A stored maturity amount counts only when it is a number at least the principal; anything else is treated as not stored.
  const stored = fd.maturityAmount !== undefined && Number.isFinite(fd.maturityAmount) && fd.maturityAmount >= fd.principalAmount ? fd.maturityAmount : undefined;
  const totalDays = daysBetween(fd.startDate, fd.maturityDate);
  const maturityAmount = stored ?? compoundedValue(fd.principalAmount, fd.interestRate, totalDays);
  if (asOfDate >= fd.maturityDate || totalDays <= 0) return maturityAmount;

  const elapsed = daysBetween(fd.startDate, asOfDate);
  if (stored === undefined) return compoundedValue(fd.principalAmount, fd.interestRate, elapsed);
  return fd.principalAmount * (stored / fd.principalAmount) ** (elapsed / totalDays);
}

/** Sum of estimated current values across every FD that still holds money (excludes Closed). */
export function totalEstimatedFixedDepositValue(deposits: ValuableDeposit[], asOfDate: string): number {
  return deposits
    .filter((fd) => fd.status !== "Closed")
    .reduce((sum, fd) => sum + estimatedCurrentValue(fd, asOfDate), 0);
}
