import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { checkSheet } = vi.hoisted(() => ({ checkSheet: vi.fn() }));
vi.mock("@/lib/sheets/checkSheet", () => ({ checkSheet }));

describe("GET /api/dev/sheet-check", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    checkSheet.mockReset();
  });

  it("is a 404 outside next dev, without reading the Sheet", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET();
    expect(res.status).toBe(404);
    expect(checkSheet).not.toHaveBeenCalled();
  });

  it("returns the check under next dev", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = { ok: true, tabs: [{ tab: "Cards", problems: [] }], otherTabs: [] };
    checkSheet.mockResolvedValue(result);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
  });

  it("turns a failed read into a 500 with the error, which the script prints", async () => {
    vi.stubEnv("NODE_ENV", "development");
    checkSheet.mockRejectedValue(new Error("Quota exceeded"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Quota exceeded" });
  });
});
