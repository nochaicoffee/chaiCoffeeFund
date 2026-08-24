import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { loansRepository, createLoanWithSchedule, createLoanSchema } from "@/lib/sheets/loans";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export async function GET() {
  return handleRouteErrors(async () => NextResponse.json(await loansRepository.list()));
}

// Custom (not createListRoute) because creating a loan also generates its
// installment schedule in the same operation — see createLoanWithSchedule.
export async function POST(request: Request) {
  return handleRouteErrors(async () => {
    const body = await request.json();
    const parsed = createLoanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { loan, installments } = await createLoanWithSchedule(parsed.data);
    revalidateTag(CACHE_TAGS.loans, "max");
    revalidateTag(CACHE_TAGS.loanInstallments, "max");
    return NextResponse.json({ loan, installments }, { status: 201 });
  });
}
