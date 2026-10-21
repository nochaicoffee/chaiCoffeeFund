import "server-only";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { z } from "zod";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";

interface Repository<T extends { id: string }> {
  list: () => Promise<T[]>;
  create: (input: Omit<T, "id">) => Promise<T>;
  update: (id: string, patch: Partial<Omit<T, "id">>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/**
 * Route Handlers can't call `updateTag` (Server-Action-only — see
 * lib/sheets/cached.ts), so writes here use `revalidateTag` with the
 * `"max"` profile instead: it marks the tag stale and the next read gets
 * fresh data via stale-while-revalidate, rather than blocking immediately.
 */
function invalidate(tag: string) {
  revalidateTag(tag, "max");
}

/**
 * Wraps a route handler body so a NotFoundError becomes a clean 404, an
 * InvalidRowError (a row that would break its entity's check) a 400, and any
 * other thrown error a 500 with its message — instead of every
 * route needing its own try/catch. Exported for routes that can't use
 * createListRoute/createItemRoute directly (e.g. loans, whose POST also
 * has to create the installment schedule) but still want the same
 * error-handling behavior.
 */
export async function handleRouteErrors(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidRowError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Builds the GET/POST handlers for an entity's list route
 * (`/api/<entity>/route.ts`) — validated create input, and cache
 * invalidation on write, applied consistently for every entity instead of
 * being hand-rolled per route. Adding a new entity's API is now this one
 * call plus the matching `createItemRoute` below, not ~30 lines of
 * hand-written boilerplate per entity.
 */
export function createListRoute<T extends { id: string }>(
  repository: Repository<T>,
  tag: string,
  createSchema: z.ZodType<Omit<T, "id">>,
) {
  async function GET() {
    return handleRouteErrors(async () => NextResponse.json(await repository.list()));
  }

  async function POST(request: Request) {
    return handleRouteErrors(async () => {
      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      const created = await repository.create(parsed.data);
      invalidate(tag);
      return NextResponse.json(created, { status: 201 });
    });
  }

  return { GET, POST };
}

/** Builds the PATCH/DELETE handlers for an entity's item route (`/api/<entity>/[id]/route.ts`). */
export function createItemRoute<T extends { id: string }>(
  repository: Repository<T>,
  tag: string,
  updateSchema: z.ZodType<Partial<Omit<T, "id">>>,
) {
  async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    return handleRouteErrors(async () => {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      const updated = await repository.update(id, parsed.data);
      invalidate(tag);
      return NextResponse.json(updated);
    });
  }

  async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    return handleRouteErrors(async () => {
      const { id } = await params;
      await repository.remove(id);
      invalidate(tag);
      return new NextResponse(null, { status: 204 });
    });
  }

  return { PATCH, DELETE };
}
