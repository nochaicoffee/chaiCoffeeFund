import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: () => Promise<unknown>) => fn }));

const { makeNotes } = await import("./notes.testutil");
const { handleMcpRequest } = await import("./server");

/** The parts of an MCP reply these tests read. */
interface Result {
  isError?: boolean;
  content: { text: string }[];
  tools: { name: string; annotations: Record<string, boolean>; inputSchema: { properties: { entity: { enum: string[] } } } }[];
  serverInfo: { name: string };
  instructions: string;
}

/** One JSON-RPC call to the endpoint, the way Claude's connector sends it. */
async function rpc(entities: ReturnType<typeof makeNotes>["entity"][], method: string, params: unknown = {}) {
  const response = await handleMcpRequest(
    new Request("https://app.example/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    entities,
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result?: Result; error?: unknown };
  // A protocol error has no result; the tests that expect one read it through `?.`.
  return { result: body.result as Result, error: body.error };
}

describe("the MCP endpoint", () => {
  it("introduces itself and its instructions", async () => {
    const { entity } = makeNotes();
    const { result } = await rpc([entity], "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    expect(result.serverInfo.name).toContain("-mcp");
    expect(result.instructions).toContain("list_entities");
    expect(result.instructions).toMatch(/Nothing can be deleted/);
  });

  it("offers four tools, none that deletes, and marks the reads read-only", async () => {
    const { entity } = makeNotes();
    const { result } = await rpc([entity], "tools/list");
    const tools = result.tools as { name: string; annotations: Record<string, boolean> }[];
    expect(tools.map((tool) => tool.name).sort()).toEqual(["add_record", "list_entities", "list_records", "update_record"]);
    expect(tools.find((tool) => tool.name === "list_records")!.annotations.readOnlyHint).toBe(true);
    expect(tools.find((tool) => tool.name === "add_record")!.annotations.readOnlyHint).toBe(false);
  });

  it("answers list_entities with names only, and with one type's fields when asked", async () => {
    const { entity } = makeNotes();
    const names = await rpc([entity], "tools/call", { name: "list_entities", arguments: {} });
    expect(names.result.content[0].text).not.toContain("addFields");
    const one = await rpc([entity], "tools/call", { name: "list_entities", arguments: { entity: "notes" } });
    expect(JSON.parse(one.result.content[0].text).addFields.required).toEqual(["title", "amount"]);
  });

  it("tells Claude to write one record at a time", async () => {
    const { entity } = makeNotes();
    const { result } = await rpc([entity], "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    expect(result.instructions).toMatch(/one record at a time/);
  });

  it("lists the record type names as an enum, so Claude can't pick one that isn't there", async () => {
    const { entity } = makeNotes();
    const { result } = await rpc([entity], "tools/list");
    const add = result.tools.find((tool) => tool.name === "add_record")!;
    expect(add.inputSchema.properties.entity.enum).toEqual(["notes"]);
  });

  it("adds a record through tools/call and shows it in the next list", async () => {
    const { entity, rows } = makeNotes();
    const added = await rpc([entity], "tools/call", { name: "add_record", arguments: { entity: "notes", data: { title: "rent", amount: 5000 } } });
    expect(added.result.isError).toBe(false);
    expect(rows).toEqual([{ id: "1", title: "rent", amount: 5000 }]);
    const listed = await rpc([entity], "tools/call", { name: "list_records", arguments: { entity: "notes" } });
    expect(JSON.parse(listed.result.content[0].text).records).toHaveLength(1);
  });

  it("reports a refused write as a tool error with the reason, not a protocol error", async () => {
    const { entity } = makeNotes();
    const out = await rpc([entity], "tools/call", { name: "add_record", arguments: { entity: "notes", data: { title: "", amount: 1 } } });
    expect(out.error).toBeUndefined();
    expect(out.result.isError).toBe(true);
    expect(out.result.content[0].text).toMatch(/Not saved.*title/);
  });

  it("rejects a record type that isn't in the list before reaching any route", async () => {
    const { entity } = makeNotes();
    const out = await rpc([entity], "tools/call", { name: "add_record", arguments: { entity: "loans", data: {} } });
    expect(out.result?.isError ?? true).toBe(true);
  });

  it("has no delete tool to call", async () => {
    const { entity, repository } = makeNotes([{ id: "1", title: "a", amount: 1 }]);
    const out = await rpc([entity], "tools/call", { name: "delete_record", arguments: { entity: "notes", id: "1" } });
    expect(out.result?.isError ?? true).toBe(true);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
