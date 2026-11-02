import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createListRoute, handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { addContribution } from "@/lib/goals/goalWrites";
import { createGoalContributionSchema, goalContributionsRepository } from "@/lib/sheets/goalContributions";
import { goalsRepository } from "@/lib/sheets/goals";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET } = createListRoute(goalContributionsRepository, CACHE_TAGS.goalContributions, createGoalContributionSchema);

/** A custom POST: a take-back can't be more than what's set aside, and a bought or dropped goal takes no more money. */
export async function POST(request: Request) {
  return handleRouteErrors(async () => {
    const parsed = createGoalContributionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const created = await addContribution({ goals: goalsRepository, contributions: goalContributionsRepository }, parsed.data);
    revalidateTag(CACHE_TAGS.goalContributions, "max");
    return NextResponse.json(created, { status: 201 });
  });
}
