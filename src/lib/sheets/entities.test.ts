import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkedRepositories } from "./checkSheet";

/** Every module in lib/sheets, read from the folder, so a new entity's file is covered without being listed here. */
const modules = readdirSync(fileURLToPath(new URL(".", import.meta.url)))
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
  .map((file) => `./${file.slice(0, -".ts".length)}`);

/**
 * Loading each entity module creates its repository, which checks the columns
 * against the row schema (assertColumnsMatchSchema) and throws on a mismatch.
 * So a schema field added without its column fails here, not by every row of
 * that tab quietly dropping out of the app.
 */
describe("every repository's columns match its row schema", () => {
  it.each(modules)("%s", async (path) => {
    await expect(import(path)).resolves.toBeDefined();
  });
});

describe("the Sheet check covers every repository", () => {
  it("lists each repository in lib/sheets exactly once", async () => {
    const loaded = await Promise.all(modules.map((path) => import(path)));
    const repositories = loaded.flatMap((exports) =>
      Object.values(exports).filter((value) => typeof value === "object" && value !== null && "expectedColumns" in value),
    );
    expect(repositories.length).toBeGreaterThanOrEqual(12);
    for (const repository of repositories) expect(checkedRepositories).toContain(repository);
    expect(checkedRepositories).toHaveLength(repositories.length);
  });
});
