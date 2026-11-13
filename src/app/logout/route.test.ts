import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /logout", () => {
  it("clears the session cookie and goes to the login", async () => {
    const res = await POST(new Request("https://app.example/logout", { method: "POST" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example/login");
    const cookie = res.cookies.get("chai_session");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
