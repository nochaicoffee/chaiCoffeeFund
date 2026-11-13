import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
const refreshPrices = vi.fn();
vi.mock("@/lib/prices/refresh", () => ({
  refreshPrices,
  RefreshBusyError: class RefreshBusyError extends Error {},
}));

const { POST } = await import("./route");

describe("POST /api/prices/refresh", () => {
  it("answers a Sheets quota refusal in words, not with Google's text", async () => {
    refreshPrices.mockRejectedValueOnce(new Error("Quota exceeded for quota metric 'Read requests' ... 'project_number:958936430412'."));
    const response = await POST(new Request("http://x/api/prices/refresh", { method: "POST" }));
    expect(response.status).toBe(429);
    const { error } = (await response.json()) as { error: string };
    expect(error).toMatch(/Google Sheets is busy/);
    expect(error).not.toMatch(/project_number/);
  });
});
