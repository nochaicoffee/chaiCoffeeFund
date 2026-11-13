import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { appConfig } from "@/lib/appConfig";
import { MCP_ENTITIES, type McpEntity } from "./entities";
import { addRecord, listEntities, listRecords, MAX_LIMIT, updateRecord, type ToolOutcome } from "./tools";

const INSTRUCTIONS = `This is ${appConfig.ownerName}'s personal finance app. Its data lives in a Google Sheet, and these tools read and write it through the app's own checks.
- Call list_entities first for the names of the record types, then again with one entity for the fields to add or change it with.
- Amounts are plain numbers in rupees (an account in dollars says so). Dates are ISO, "2026-11-13".
- Records point at each other by id (a payment's subscriptionId). Look the id up with list_records. Never invent one.
- Before adding or changing a record, say what you are about to write and get ${appConfig.ownerName}'s go-ahead, unless he has just asked for exactly that.
- Nothing can be deleted from here. If a mistake needs a row removed, tell him to remove it in the app.
- Write one record at a time: wait for each add_record or update_record to answer before sending the next. The Sheet can't take two writes to the same tab at once.
- If a write is refused, read the reason and fix the data. Don't retry the same call.`;

function asResult({ ok, text }: ToolOutcome) {
  return { content: [{ type: "text" as const, text }], isError: !ok };
}

/** A server with the four tools. Built per request: the endpoint holds no session between calls. */
export function createMcpServer(entities: McpEntity[] = MCP_ENTITIES): McpServer {
  const server = new McpServer({ name: `${appConfig.appName}-mcp`, version: "1.0.0" }, { instructions: INSTRUCTIONS });
  const keys = entities.map((entity) => entity.key) as [string, ...string[]];
  const entityKey = z.enum(keys).describe("The record type, from list_entities");

  server.registerTool(
    "list_entities",
    {
      title: "List record types",
      description: "Every kind of record the app holds and what each is for. Give an entity to get that record type's fields (addFields, updateFields) as JSON Schema. Call this first.",
      inputSchema: { entity: entityKey.optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ entity }) => asResult(listEntities(entities, entity)),
  );

  server.registerTool(
    "list_records",
    {
      title: "List records",
      description: `Read rows of one record type. Returns the newest "limit" rows that match (default 50, at most ${MAX_LIMIT}), oldest of those first, with how many matched in all. Use it to find an id, or to check what is there before adding.`,
      inputSchema: {
        entity: entityKey,
        where: z.record(z.string(), z.unknown()).optional().describe('Only rows whose fields equal these, e.g. {"subscriptionId":"…"}'),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => asResult(await listRecords(entities, args)),
  );

  server.registerTool(
    "add_record",
    {
      title: "Add a record",
      description: "Add one row. `data` holds the fields from list_entities' addFields; the app checks them exactly as its own forms do and refuses a row that doesn't fit.",
      inputSchema: { entity: entityKey, data: z.record(z.string(), z.unknown()).describe("The new row's fields, without an id") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => asResult(await addRecord(entities, args)),
  );

  server.registerTool(
    "update_record",
    {
      title: "Change a record",
      description: "Change fields of one existing row. `data` holds only the fields to change (updateFields in list_entities); the rest stay as they are. An optional field is cleared by setting it to an empty string.",
      inputSchema: {
        entity: entityKey,
        id: z.string().min(1).describe("The row's id, from list_records"),
        data: z.record(z.string(), z.unknown()).describe("The fields to change"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => asResult(await updateRecord(entities, args)),
  );

  return server;
}

/** Answers one MCP request (Streamable HTTP, stateless, plain JSON replies). */
export async function handleMcpRequest(request: Request, entities: McpEntity[] = MCP_ENTITIES): Promise<Response> {
  const server = createMcpServer(entities);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
