import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sectionKey } from "./PageHeader";

/** ADR 0018 step 5b: under Neubrutalism each page's tag and figure marker take the colour `--tag-bg-<section key>`. */
const src = fileURLToPath(new URL("../..", import.meta.url));

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe("the page header's tag colour", () => {
  it("keys a section by its name", () => {
    expect(sectionKey("Overview")).toBe("overview");
    expect(sectionKey("Lent out")).toBe("lent-out");
    expect(sectionKey("Bank accounts")).toBe("bank-accounts");
    expect(sectionKey(" Fixed  Income ")).toBe("fixed-income");
    expect(sectionKey("Taxes & GST")).toBe("taxes-gst");
    expect(sectionKey("Rahul's loans!")).toBe("rahul-s-loans");
  });

  it("has a Neubrutalism colour for every section a page names", () => {
    const css = readFileSync(join(src, "app/globals.css"), "utf8");
    const sections = new Set(pages(join(src, "app")).flatMap((path) => [...readFileSync(path, "utf8").matchAll(/section=(?:"([^"]+)"|\{\s*["'`]([^"'`$]+)["'`]\s*\})/g)].map((m) => m[1] ?? m[2])));
    expect(sections.size).toBeGreaterThan(10);
    const missing = [...sections].filter((section) => !css.includes(`--tag-bg-${sectionKey(section)}:`));
    expect(missing).toEqual([]);
    // A section named by anything other than a plain string can't be checked here: keep them literal.
    const computed = pages(join(src, "app")).filter((path) => /section=\{(?!\s*["'`][^"'`$]+["'`]\s*\})/.test(readFileSync(path, "utf8")));
    expect(computed).toEqual([]);
  });
});
