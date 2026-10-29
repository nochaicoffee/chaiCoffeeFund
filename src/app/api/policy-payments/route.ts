import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createListRoute, handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { createTerm } from "@/lib/insurance/policyWrites";
import { createPolicyPaymentSchema, policyPaymentsRepository } from "@/lib/sheets/policyPayments";
import { policiesRepository } from "@/lib/sheets/policies";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET } = createListRoute(policyPaymentsRepository, CACHE_TAGS.policyPayments, createPolicyPaymentSchema);

/** A custom POST: a term is checked against the policy's other terms, as Renew does (a repository checks one row at a time). */
export async function POST(request: Request) {
  return handleRouteErrors(async () => {
    const parsed = createPolicyPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const created = await createTerm({ policies: policiesRepository, payments: policyPaymentsRepository }, parsed.data);
    revalidateTag(CACHE_TAGS.policyPayments, "max");
    return NextResponse.json(created, { status: 201 });
  });
}
