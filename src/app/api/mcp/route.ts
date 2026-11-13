import { NextResponse } from "next/server";
import { hasValidMcpToken } from "@/lib/auth/gate";
import { handleMcpRequest } from "@/lib/mcp/server";

// A sheet read plus a write can take a few seconds; the default would cut a slow one off.
export const maxDuration = 60;

/**
 * The MCP endpoint Claude's connector talks to (docs/adr/0015). The proxy already requires
 * the bearer token for this path; it's checked again here so the route is safe even if the
 * proxy's matcher ever changes.
 */
async function handle(request: Request): Promise<Response> {
  if (!(await hasValidMcpToken(request.headers.get("authorization"), process.env))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  return handleMcpRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
