import { NextResponse } from "next/server";
import { loanInstallmentsRepository } from "@/lib/sheets/loanInstallments";

// GET only — installment rows are always created in bulk by
// createLoanWithSchedule() (see /api/loans), never one at a time.
export async function GET() {
  return NextResponse.json(await loanInstallmentsRepository.list());
}
