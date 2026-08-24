import type { FixedDeposit } from "../sheets/types";

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return (to - from) / (24 * 60 * 60 * 1000);
}

/**
 * Linear interpolation between principal and the bank-quoted maturity
 * amount — a clearly-labeled estimate for net worth display, not the
 * actual redemption value (real FDs compound on conventions that vary by
 * bank, which is why maturityAmount itself is a stored fact, not computed).
 */
export function estimatedCurrentValue(fd: FixedDeposit, asOfDate: string): number {
  if (asOfDate <= fd.startDate) return fd.principalAmount;
  if (asOfDate >= fd.maturityDate) return fd.maturityAmount;

  const totalDays = daysBetween(fd.startDate, fd.maturityDate);
  const elapsedDays = daysBetween(fd.startDate, asOfDate);
  const fraction = totalDays > 0 ? elapsedDays / totalDays : 1;
  return fd.principalAmount + (fd.maturityAmount - fd.principalAmount) * fraction;
}

/** Sum of estimated current values across every FD that still holds money (excludes Closed). */
export function totalEstimatedFixedDepositValue(deposits: FixedDeposit[], asOfDate: string): number {
  return deposits
    .filter((fd) => fd.status !== "Closed")
    .reduce((sum, fd) => sum + estimatedCurrentValue(fd, asOfDate), 0);
}
