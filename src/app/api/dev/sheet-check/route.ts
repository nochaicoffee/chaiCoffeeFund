import { NextResponse } from "next/server";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { checkSheet } from "@/lib/sheets/checkSheet";

/**
 * Dev only: whether the real Sheet's tabs still match the repositories, for
 * `npm run check-sheet` (scripts/checkSheet.ts). A 404 anywhere but `next dev`,
 * so a hosted build never exposes the Sheet's structure.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  return handleRouteErrors(async () => NextResponse.json(await checkSheet()));
}
