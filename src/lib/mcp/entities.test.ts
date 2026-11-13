import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: () => Promise<unknown>) => fn }));

const { MCP_ENTITIES } = await import("./entities");
const { describeEntities, SECRET_FIELDS } = await import("./tools");

/** The routes that must never be reachable by Claude's writes: only the syncs write them. */
const NOT_EXPOSED = ["account-statements", "dev", "prices"];

describe("the MCP record types", () => {
  it("have unique names and say what they are", () => {
    const keys = MCP_ENTITIES.map((entity) => entity.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entity of MCP_ENTITIES) {
      expect(entity.key).toMatch(/^[a-z_]+$/);
      expect(entity.about.length).toBeGreaterThan(10);
    }
  });

  it("each have a way to list, and a way to change unless nothing could be", () => {
    for (const entity of MCP_ENTITIES) {
      expect(entity.list, entity.key).toBeTypeOf("function");
      expect(entity.update, entity.key).toBeTypeOf("function");
      expect(entity.updateSchema, entity.key).toBeDefined();
      if (entity.create) expect(entity.createSchema, entity.key).toBeDefined();
    }
  });

  it("turn every schema into JSON Schema, and none exposes a secret field", () => {
    for (const described of describeEntities(MCP_ENTITIES)) {
      for (const fields of [described.addFields, described.updateFields]) {
        if (fields === null) continue;
        expect(fields, described.entity).toHaveProperty("properties");
        for (const secret of SECRET_FIELDS) expect(JSON.stringify(fields), described.entity).not.toContain(secret);
      }
      if (described.canAdd) expect(described.addFields, described.entity).not.toBeNull();
      expect(described.updateFields, described.entity).not.toBeNull();
    }
  });

  it("cover the API routes that take hand-written data, and leave out the sync-only ones", () => {
    const apiDir = fileURLToPath(new URL("../../app/api", import.meta.url));
    const routes = readdirSync(apiDir).filter((name) => !NOT_EXPOSED.includes(name));
    const covered = new Set(MCP_ENTITIES.map((entity) => entity.key.replace(/_/g, "-")));
    const missing = routes.filter((name) => !covered.has(name) && name !== "mcp");
    // A new /api/<entity> route has to be added to MCP_ENTITIES, or named here with a reason.
    expect(missing).toEqual([]);
    for (const hidden of ["account-statements", "dev", "prices"]) expect(covered.has(hidden)).toBe(false);
  });
});
