import { NextResponse, type NextRequest } from "next/server";
import { decideAccess, LOGIN_PATH } from "@/lib/auth/gate";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * The login gate (ADR 0007): every page and API route needs the session cookie from
 * /login (Google sign-in), and /api/mcp needs the bearer token instead. The rules are in lib/auth/gate.ts.
 * The proxy runs before the route, so a refused request never reaches the Sheets code.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const access = await decideAccess({
    pathname,
    cookie: request.cookies.get(SESSION_COOKIE)?.value,
    authorization: request.headers.get("authorization"),
    env: process.env,
  });

  switch (access.action) {
    case "allow":
      return NextResponse.next();
    case "login": {
      const url = new URL(LOGIN_PATH, request.url);
      if (pathname !== "/") url.searchParams.set("next", pathname + search);
      // A POST (Sign out, a Server Action) that arrives without a session must not be repeated against /login, which only answers GET: 303 turns it into a GET.
      return NextResponse.redirect(url, request.method === "GET" || request.method === "HEAD" ? 307 : 303);
    }
    case "unauthorized":
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
    case "mcp-disabled":
      return NextResponse.json({ error: "The MCP endpoint is off: MCP_ACCESS_TOKEN isn't set" }, { status: 503 });
    case "misconfigured":
      return new NextResponse("Login isn't set up on this server (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAIL and SESSION_SECRET).", { status: 503 });
  }
}

export const config = {
  // Everything except Next's own static files and the icon, which carry no data.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
