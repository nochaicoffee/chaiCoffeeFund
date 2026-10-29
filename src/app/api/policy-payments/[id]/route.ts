import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createItemRoute, handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { updateTerm } from "@/lib/insurance/policyWrites";
import { policiesRepository } from "@/lib/sheets/policies";
import { policyPaymentsRepository, updatePolicyPaymentSchema } from "@/lib/sheets/policyPayments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { DELETE } = createItemRoute(policyPaymentsRepository, CACHE_TAGS.policyPayments, updatePolicyPaymentSchema);

/** A custom PATCH: what a term would be once changed must still fit the policy's other terms. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    const parsed = updatePolicyPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const updated = await updateTerm({ policies: policiesRepository, payments: policyPaymentsRepository }, id, parsed.data as Parameters<typeof updateTerm>[2]);
    revalidateTag(CACHE_TAGS.policyPayments, "max");
    return NextResponse.json(updated);
  });
}
