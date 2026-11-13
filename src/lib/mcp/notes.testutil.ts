import { vi } from "vitest";
import { z } from "zod";
import { createItemRoute, createListRoute } from "@/lib/api/createCrudRoutes";
import { NotFoundError } from "@/lib/sheets/repository";
import type { McpEntity } from "./entities";

/** Test doubles for the MCP tools: entities on the app's real route factories over an in-memory repository. */
interface Note {
  id: string;
  title: string;
  amount: number;
  statementPdfPassword?: string;
}

export const noteSchema = z.object({ title: z.string().min(1), amount: z.number().nonnegative(), statementPdfPassword: z.string().optional() });

export function makeNotes(initial: Note[] = []) {
  const rows = [...initial];
  let next = rows.length + 1;
  const repository = {
    list: async () => rows,
    create: async (input: Omit<Note, "id">) => {
      const row = { ...input, id: String(next++) };
      rows.push(row);
      return row;
    },
    update: async (id: string, patch: Partial<Omit<Note, "id">>) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) throw new NotFoundError(`No row ${id}`);
      rows[index] = { ...rows[index], ...patch };
      return rows[index];
    },
    remove: vi.fn(async () => {}),
  };
  // Never sent back: the real accounts and cards routes do the same with a statement PDF password.
  const redact = ({ statementPdfPassword, ...row }: Note) => ({ ...row, hasPassword: Boolean(statementPdfPassword) });
  const list = createListRoute(repository, "notes", noteSchema, redact, { beforeCreate: async (input) => (input.title === "dup" ? "A note called dup already exists" : null) });
  const item = createItemRoute(repository, "notes", noteSchema.partial(), redact);
  const entity: McpEntity = {
    key: "notes",
    label: "Notes",
    about: "A test note.",
    list: list.GET,
    create: list.POST,
    createSchema: noteSchema,
    update: item.PATCH,
    updateSchema: noteSchema.partial(),
  };
  return { rows, repository, entity };
}
