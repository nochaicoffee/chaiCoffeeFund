import { z } from "zod";
import type { AccountChoice, ReviewEdits, Resolution } from "./importPlan";

/**
 * What the review screen sends with the file when he confirms: his corrections and answers. The server never takes the rows from
 * the browser, only these corrections, which it applies to its own reading of the same file and checks again.
 */
const figures = z.object({ date: z.string(), employee: z.number(), employer: z.number(), pension: z.number() });
const decisionsSchema = z.object({
  edits: z.object({ changed: z.record(z.string(), figures), added: z.array(figures.extend({ wageMonth: z.string() })) }),
  choice: z.union([z.object({ kind: z.literal("existing"), id: z.string() }), z.object({ kind: z.literal("new"), name: z.string() })]).nullable(),
  resolutions: z.record(z.string(), z.enum(["passbook", "mine"])),
  contradicted: z.record(z.string(), z.enum(["keep", "remove"])),
});

export interface ReviewDecisions {
  edits: ReviewEdits;
  choice: AccountChoice | null;
  resolutions: Record<string, Resolution>;
  contradicted: Record<string, "keep" | "remove">;
}

export const encodeDecisions = (decisions: ReviewDecisions): string => JSON.stringify(decisions);

/** The decisions in a confirm request, or null when they aren't well formed. */
export function parseDecisions(text: string): ReviewDecisions | null {
  try {
    const parsed = decisionsSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
