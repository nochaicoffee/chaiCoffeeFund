import { z } from "zod";
import type { McpEntity } from "./entities";

/** What a tool answers: whether it worked, and the text Claude reads. */
export interface ToolOutcome {
  ok: boolean;
  text: string;
}

/**
 * Fields Claude can neither set nor see. A statement PDF password and a whole policy number are
 * typed into the app's own forms: through chat they would sit in a conversation's history. (The
 * API routes already keep the password out of every response and cut the policy number to its
 * last four characters.) A new field that holds a secret goes here; entities.test.ts checks that
 * none of these appears in any record type's fields.
 */
export const SECRET_FIELDS = ["statementPdfPassword", "policyNumber"];

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

const ok = (value: unknown): ToolOutcome => ({ ok: true, text: JSON.stringify(value, null, 2) });
const fail = (text: string): ToolOutcome => ({ ok: false, text });

/** A record type's fields as JSON Schema, from the same zod schema the API route checks them with. */
export function fieldsSchema(schema: z.ZodType | undefined): Record<string, unknown> | null {
  if (!schema) return null;
  let json: Record<string, unknown>;
  try {
    json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  } catch {
    return null;
  }
  delete json.$schema;
  const properties = json.properties as Record<string, unknown> | undefined;
  if (properties) for (const field of SECRET_FIELDS) delete properties[field];
  if (Array.isArray(json.required)) json.required = json.required.filter((field) => !SECRET_FIELDS.includes(field as string));
  return json;
}

/** What `list_entities` answers: every record type, and the fields to add one with. */
export function describeEntities(entities: McpEntity[]) {
  return entities.map((entity) => ({
    entity: entity.key,
    label: entity.label,
    about: entity.about,
    canAdd: Boolean(entity.create),
    canUpdate: Boolean(entity.update),
    addFields: entity.create ? fieldsSchema(entity.createSchema) : null,
    updateFields: entity.update ? fieldsSchema(entity.updateSchema) : null,
  }));
}

/** What `list_entities` answers with no argument: every record type's name and purpose, without the fields (those are what make it long). */
export function summarizeEntities(entities: McpEntity[]) {
  return entities.map((entity) => ({ entity: entity.key, label: entity.label, about: entity.about, canAdd: Boolean(entity.create), canUpdate: Boolean(entity.update) }));
}

/** `list_entities`: the names of all record types, or one type's fields when it is named. */
export function listEntities(entities: McpEntity[], key?: string): ToolOutcome {
  if (key === undefined) return ok(summarizeEntities(entities));
  const entity = find(entities, key);
  if (isOutcome(entity)) return entity;
  return { ok: true, text: JSON.stringify(describeEntities([entity])[0]) };
}

function find(entities: McpEntity[], key: string): McpEntity | ToolOutcome {
  const entity = entities.find((candidate) => candidate.key === key);
  return entity ?? fail(`There is no "${key}". Call list_entities to see the record types.`);
}

const isOutcome = (value: McpEntity | ToolOutcome): value is ToolOutcome => "ok" in value;

/** Calls one of the app's own route handlers in-process, as a request to a path that is never served. */
async function callRoute<A extends unknown[]>(
  handler: (request: Request, ...rest: A) => Promise<Response>,
  entity: McpEntity,
  method: "GET" | "POST" | "PATCH",
  body: unknown,
  ...rest: A
): Promise<{ status: number; body: unknown }> {
  const request = new Request(`http://mcp.internal/api/${entity.key}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await handler(request, ...rest);
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // A plain-text body stays as text.
  }
  return { status: response.status, body: parsed };
}

/** The route's refusal, in words: the fields a 400 named, or the 409's or 500's message. */
export function describeFailure(status: number, body: unknown): string {
  const error = typeof body === "object" && body !== null && "error" in body ? (body as { error: unknown }).error : body;
  if (typeof error === "string") return status === 409 ? `Refused: ${error}` : status === 404 ? `Not found: ${error}` : error;
  if (typeof error === "object" && error !== null) {
    const { formErrors = [], fieldErrors = {} } = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const lines = [...formErrors, ...Object.entries(fieldErrors).map(([field, messages]) => `${field}: ${messages.join(", ")}`)];
    if (lines.length) return `Not saved. ${lines.join("; ")}`;
  }
  return `Not saved (status ${status}).`;
}

function secretIn(data: Record<string, unknown>): string | null {
  const found = SECRET_FIELDS.find((field) => field in data);
  return found ? `"${found}" is a secret: set it in the app, not through Claude.` : null;
}

export interface ListArgs {
  entity: string;
  where?: Record<string, unknown>;
  limit?: number;
}

/** The newest `limit` rows that match, with how many matched in all. Rows come back in the Sheet's order, oldest first. */
export async function listRecords(entities: McpEntity[], { entity: key, where, limit }: ListArgs): Promise<ToolOutcome> {
  const entity = find(entities, key);
  if (isOutcome(entity)) return entity;
  const { status, body } = await callRoute(entity.list, entity, "GET", undefined);
  if (status !== 200 || !Array.isArray(body)) return fail(describeFailure(status, body));

  const matches = where
    ? (body as Record<string, unknown>[]).filter((record) => Object.entries(where).every(([field, wanted]) => String(record[field]) === String(wanted)))
    : (body as Record<string, unknown>[]);
  const take = Math.min(Math.max(Math.trunc(limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const records = matches.slice(-take);
  return ok({ entity: key, matching: matches.length, returned: records.length, records });
}

export interface AddArgs {
  entity: string;
  data: Record<string, unknown>;
}

export async function addRecord(entities: McpEntity[], { entity: key, data }: AddArgs): Promise<ToolOutcome> {
  const entity = find(entities, key);
  if (isOutcome(entity)) return entity;
  if (!entity.create) return fail(`${entity.label} can't be added one at a time. Call list_entities to see how.`);
  const secret = secretIn(data);
  if (secret) return fail(secret);
  const { status, body } = await callRoute(entity.create, entity, "POST", data);
  return status === 201 || status === 200 ? ok({ added: body }) : fail(describeFailure(status, body));
}

export interface UpdateArgs {
  entity: string;
  id: string;
  data: Record<string, unknown>;
}

export async function updateRecord(entities: McpEntity[], { entity: key, id, data }: UpdateArgs): Promise<ToolOutcome> {
  const entity = find(entities, key);
  if (isOutcome(entity)) return entity;
  if (!entity.update) return fail(`${entity.label} can't be changed.`);
  const secret = secretIn(data);
  if (secret) return fail(secret);
  const { status, body } = await callRoute(entity.update, entity, "PATCH", data, { params: Promise.resolve({ id }) });
  return status === 200 ? ok({ updated: body }) : fail(describeFailure(status, body));
}
