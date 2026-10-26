import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { loansRepository, deleteLoanWithSchedule, updateLoanSchema } from "@/lib/sheets/loans";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import type { Loan } from "@/lib/sheets/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateLoanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    // "" clears an optional field (see `clearable`), which the repository blanks.
    const updated = await loansRepository.update(id, parsed.data as Partial<Omit<Loan, "id">>);
    revalidateTag(CACHE_TAGS.loans, "max");
    return NextResponse.json(updated);
  });
}

// Custom (not createItemRoute) — deleting a loan also deletes every
// installment that belongs to it. See deleteLoanWithSchedule.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    await deleteLoanWithSchedule(id);
    revalidateTag(CACHE_TAGS.loans, "max");
    revalidateTag(CACHE_TAGS.loanInstallments, "max");
    return new NextResponse(null, { status: 204 });
  });
}
