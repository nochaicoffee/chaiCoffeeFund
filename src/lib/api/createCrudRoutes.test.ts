import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const { createItemRoute, createListRoute } = await import("./createCrudRoutes");

interface Row {
  id: string;
  name: string;
  secret?: string;
}
const rows: Row[] = [{ id: "1", name: "one", secret: "hunter2" }];
const repository = {
  list: async () => rows,
  create: async (input: Omit<Row, "id">) => ({ ...input, id: "2" }),
  update: async (id: string, patch: Partial<Omit<Row, "id">>) => ({ ...rows.find((r) => r.id === id)!, ...patch }),
  remove: async () => {},
};
const schema = z.object({ name: z.string(), secret: z.string().optional() });
const redact = ({ secret, ...row }: Row) => ({ ...row, hasSecret: Boolean(secret) });
const post = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

describe("createListRoute and createItemRoute", () => {
  it("send records as they are without a serializer", async () => {
    const { GET } = createListRoute(repository, "t", schema);
    expect(await (await GET()).json()).toEqual(rows);
  });

  it("send what the serializer returns on list, create and update, so a secret never leaves the server", async () => {
    const { GET, POST } = createListRoute(repository, "t", schema, redact);
    const { PATCH } = createItemRoute(repository, "t", schema.partial(), redact);
    const listed = JSON.stringify(await (await GET()).json());
    const created = JSON.stringify(await (await POST(post({ name: "two", secret: "pw2" }))).json());
    const updated = JSON.stringify(await (await PATCH(post({ secret: "pw3" }), { params: Promise.resolve({ id: "1" }) })).json());
    for (const body of [listed, created, updated]) {
      expect(body).not.toMatch(/hunter2|pw2|pw3/);
      expect(body).toContain("hasSecret");
    }
  });
});
