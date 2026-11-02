import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { editContribution, removeContribution } from "@/lib/goals/goalWrites";
import { goalContributionsRepository, updateGoalContributionSchema } from "@/lib/sheets/goalContributions";
import { goalsRepository } from "@/lib/sheets/goals";
import { CACHE_TAGS } from "@/lib/sheets/cached";

const repos = { goals: goalsRepository, contributions: goalContributionsRepository };

/** A custom PATCH: the goal's saved amount must stay at or above 0 once the entry is corrected. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    const parsed = updateGoalContributionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const updated = await editContribution(repos, id, parsed.data as Parameters<typeof editContribution>[2]);
    revalidateTag(CACHE_TAGS.goalContributions, "max");
    return NextResponse.json(updated);
  });
}

/** A custom DELETE: removing a set-aside that a later take-back depends on would take the goal below 0. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    await removeContribution(repos, id);
    revalidateTag(CACHE_TAGS.goalContributions, "max");
    return new NextResponse(null, { status: 204 });
  });
}
