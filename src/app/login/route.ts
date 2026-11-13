import { NextResponse } from "next/server";
import { loginConfigured } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/gate";
import { loginPage, signInError } from "./loginPage";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * The sign-in page: one button to Google (/login/google). A route handler rather than a page,
 * so it stands alone without the app's sidebar around it. Nothing is posted here; the
 * sign-in itself happens in /login/google and /login/google/callback.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const configured = loginConfigured(process.env);
  return new NextResponse(loginPage({ next: safeNextPath(params.get("next")), error: signInError(params.get("error")), configured }), {
    status: configured ? 200 : 503,
    headers: HTML_HEADERS,
  });
}
