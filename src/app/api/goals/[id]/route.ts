import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { deleteGoal, editGoal } from "@/lib/goals/goalWrites";
import { goalContributionsRepository } from "@/lib/sheets/goalContributions";
import { goalsRepository, updateGoalSchema } from "@/lib/sheets/goals";
import { CACHE_TAGS } from "@/lib/sheets/cached";

const repos = { goals: goalsRepository, contributions: goalContributionsRepository };

/** A custom PATCH: what a goal would be once changed must still hold (one level of sub-goals, an amount above 0). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    const parsed = updateGoalSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const updated = await editGoal(repos, id, parsed.data as Parameters<typeof editGoal>[2]);
    revalidateTag(CACHE_TAGS.goals, "max");
    return NextResponse.json(updated);
  });
}

/** A custom DELETE, since it does more than one thing: a goal's sub-goals and set-asides go with it, or they'd stay in the earmarks with nothing to show them. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRouteErrors(async () => {
    const { id } = await params;
    await deleteGoal(repos, id);
    revalidateTag(CACHE_TAGS.goals, "max");
    revalidateTag(CACHE_TAGS.goalContributions, "max");
    return new NextResponse(null, { status: 204 });
  });
}
