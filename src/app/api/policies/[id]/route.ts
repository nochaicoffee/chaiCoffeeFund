import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createItemRoute, handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { toClientPolicy } from "@/lib/forms/clientPolicy";
import { deletePolicy } from "@/lib/insurance/policyWrites";
import { policiesRepository, updatePolicySchema } from "@/lib/sheets/policies";
import { policyPaymentsRepository } from "@/lib/sheets/policyPayments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH } = createItemRoute(policiesRepository, CACHE_TAGS.policies, updatePolicySchema, toClientPolicy);

/** A custom DELETE, since it does more than one thing: a policy's payments go with it, or they'd stay in the cash totals with nothing to show them. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    await deletePolicy({ policies: policiesRepository, payments: policyPaymentsRepository }, id);
    revalidateTag(CACHE_TAGS.policies, "max");
    revalidateTag(CACHE_TAGS.policyPayments, "max");
    return new NextResponse(null, { status: 204 });
  });
}
