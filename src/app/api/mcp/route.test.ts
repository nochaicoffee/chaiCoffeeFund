import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/mcp/server", () => ({ handleMcpRequest: vi.fn(async () => new Response("handled")) }));

const { handleMcpRequest } = await import("@/lib/mcp/server");
const { POST, GET, DELETE } = await import("./route");

const TOKEN = "t".repeat(40);
beforeEach(() => vi.stubEnv("MCP_ACCESS_TOKEN", TOKEN));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const call = (init: RequestInit = {}) => new Request("https://app.example/api/mcp", { method: "POST", ...init });

describe("/api/mcp", () => {
  it("refuses a request without the token even if the proxy let it through", async () => {
    for (const handler of [POST, GET, DELETE]) {
      const res = await handler(call());
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toBe("Bearer");
    }
    expect(handleMcpRequest).not.toHaveBeenCalled();
  });

  it("refuses a wrong token, and every token when none is configured", async () => {
    expect((await POST(call({ headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
    vi.stubEnv("MCP_ACCESS_TOKEN", "");
    expect((await POST(call({ headers: { authorization: "Bearer " } }))).status).toBe(401);
    expect(handleMcpRequest).not.toHaveBeenCalled();
  });

  it("hands a request with the token to the MCP server", async () => {
    const res = await POST(call({ headers: { authorization: `Bearer ${TOKEN}` } }));
    expect(await res.text()).toBe("handled");
    expect(handleMcpRequest).toHaveBeenCalledOnce();
  });
});
