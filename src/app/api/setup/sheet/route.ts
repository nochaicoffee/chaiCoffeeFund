import { NextResponse } from "next/server";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { checkSheet } from "@/lib/sheets/checkSheet";
import { createMissingTabs } from "@/lib/sheets/createSheet";

/**
 * Setting up the Sheet (docs/setup.md). Behind the login like every /api route, and not
 * listed for Claude: it changes the Sheet's structure, never its rows.
 *
 * GET says whether the Sheet's tabs match the app (the same check as `npm run check-sheet`).
 * POST builds the tabs that are missing and leaves the ones that exist alone (lib/sheets/createSheet.ts).
 */
export async function GET() {
  return handleRouteErrors(async () => NextResponse.json(await checkSheet()));
}

export async function POST() {
  return handleRouteErrors(async () => NextResponse.json(await createMissingTabs()));
}
