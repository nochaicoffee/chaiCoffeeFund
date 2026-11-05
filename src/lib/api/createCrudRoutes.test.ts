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

describe("write guards", () => {
  const ctx = { params: Promise.resolve({ id: "1" }) };
  it("refuse a create with a 409 and the message, and write nothing", async () => {
    const create = vi.fn(repository.create);
    const { POST } = createListRoute({ ...repository, create }, "t", schema, undefined, { beforeCreate: async () => "already there" });
    const res = await POST(post({ name: "two" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already there" });
    expect(create).not.toHaveBeenCalled();
  });
  it("let a create through when the guard has no objection", async () => {
    const { POST } = createListRoute(repository, "t", schema, undefined, { beforeCreate: async () => null });
    expect((await POST(post({ name: "two" }))).status).toBe(201);
  });
  it("refuse an update and a delete the same way, and pass the id and the patch to the guard", async () => {
    const update = vi.fn(repository.update);
    const remove = vi.fn(repository.remove);
    const seen: unknown[] = [];
    const { PATCH, DELETE } = createItemRoute({ ...repository, update, remove }, "t", schema.partial(), undefined, {
      beforeUpdate: async (id, patch) => (seen.push([id, patch]), "no change"),
      beforeDelete: async () => "still in use",
    });
    const patched = await PATCH(post({ name: "x" }), ctx);
    expect([patched.status, await patched.json()]).toEqual([409, { error: "no change" }]);
    expect(seen).toEqual([["1", { name: "x" }]]);
    const deleted = await DELETE(new Request("http://x", { method: "DELETE" }), ctx);
    expect([deleted.status, await deleted.json()]).toEqual([409, { error: "still in use" }]);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it("change nothing for routes that pass no guards", async () => {
    const { DELETE } = createItemRoute(repository, "t", schema.partial());
    expect((await DELETE(new Request("http://x", { method: "DELETE" }), ctx)).status).toBe(204);
  });
});

