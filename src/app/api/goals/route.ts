import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createListRoute, handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { addGoal } from "@/lib/goals/goalWrites";
import { goalContributionsRepository } from "@/lib/sheets/goalContributions";
import { createGoalSchema, goalsRepository } from "@/lib/sheets/goals";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET } = createListRoute(goalsRepository, CACHE_TAGS.goals, createGoalSchema);

/** A custom POST: a sub-goal's parent must exist, be a top-level goal and still be open (a repository checks one row at a time). */
export async function POST(request: Request) {
  return handleRouteErrors(async () => {
    const parsed = createGoalSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const created = await addGoal({ goals: goalsRepository, contributions: goalContributionsRepository }, parsed.data);
    revalidateTag(CACHE_TAGS.goals, "max");
    return NextResponse.json(created, { status: 201 });
  });
}
