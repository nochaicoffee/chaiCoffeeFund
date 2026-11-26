import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * ADR 0018: a look changes the app only by redefining tokens, so the shape that is on tokens has to stay on them.
 * These are the patterns step 1 moved; the rest of the radii and borders move area by area, and join this list as they do.
 */
const src = fileURLToPath(new URL("..", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sources(src).map((path) => ({ path: relative(src, path), text: readFileSync(path, "utf8") }));

/**
 * Outlines drawn in the surface line on purpose without surface-edge, each with why. Anything else naming
 * border-surface-line fails, whether it's in one class string or split across a `${…}` branch.
 */
const LINE_WITHOUT_EDGE: Record<string, string> = {
  "components/fixed-income/EpfStatementDialog.tsx": "the passbook drop zone: a 2px dashed target, not a surface",
};

/** Each class string, and each quoted string inside a template's `${…}`, as its list of classes. */
function classLists(text: string): string[][] {
  return [...text.matchAll(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g)].flatMap((m) => {
    const body = m[0].slice(1, -1);
    const nested = m[0].startsWith("`") ? [...body.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)].map((n) => n[1] ?? n[2]) : [];
    return [body.replace(/\$\{[^}]*\}/g, " "), ...nested].map((s) => s.split(/\s+/));
  });
}

describe("shape stays on tokens", () => {
  it("draws a surface's outline with surface-edge, not border-surface-line", () => {
    const offenders = files.filter(({ path, text }) => !(path in LINE_WITHOUT_EDGE) && /(?<![\w-])(?:[\w-]+:)*border-surface-line(?![\w-])/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("draws a solid row rule with rule-t, rule-b or divide-rule, not border-divider", () => {
    const offenders = files.filter(({ text }) =>
      classLists(text).some(
        (classes) =>
          (classes.includes("border-divider") && (classes.includes("border-t") || classes.includes("border-b")) && !classes.includes("border-dashed")) ||
          (classes.includes("divide-divider") && classes.includes("divide-y")),
      ),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("uses rounded-card and rounded-control, not 22px and 13px", () => {
    const offenders = files.filter(({ text }) => /rounded(?:-[a-z]{1,2})?-\[(?:22|13)px\]/.test(text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("draws elevation from the shadow tokens, not literal shadows", () => {
    const literalShadows = [
      "shadow-[0_1px_3px_oklch(0_0_0/0.14)]",
      "shadow-[0_2px_5px_oklch(0_0_0/0.18)]",
      "shadow-[inset_0_1px_0_oklch(1_0_0/0.2)]",
      "shadow-[inset_0_1px_0_oklch(1_0_0/0.25)]",
      "shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_2px_6px_oklch(0_0_0/0.18)]",
      "shadow-[0_2px_6px_oklch(0_0_0/0.4)]",
      "shadow-[0_16px_34px_oklch(0_0_0/0.22)]",
    ];
    const offenders = files.filter(({ text }) => literalShadows.some((shadow) => text.includes(shadow)));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});
