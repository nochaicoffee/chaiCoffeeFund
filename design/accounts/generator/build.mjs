// Builds the Accounts canvas: design/accounts/*.dc.html + canvas.json (source, committed),
// and out/preview/ (the page for publishing; a build artifact, gitignored, never committed).
// usage: node build.mjs [design/accounts dir, default ..] [--only=AccountsA]
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CSS, FONT_LINK } from "./css.mjs";
import { BOARDS, PAGES, NOTES } from "./boards.mjs";
import { previewPage } from "./preview.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(HERE, ".."));
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
mkdirSync(OUT, { recursive: true });
const BUILD = join(HERE, "out");
const MEASURE = join(BUILD, "measure");
mkdirSync(MEASURE, { recursive: true });

const dc = (inner) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONT_LINK}
  <style>${CSS}</style>
</helmet>
${inner}
</x-dc>
</body>
</html>
`;

const list = BOARDS.filter((b) => !only || b.file.startsWith(only));
const rendered = list.map((b) => ({ ...b, html: b.render() }));

// Pass 1: measure natural heights.
const jobs = rendered.map((b) => {
  const f = join(MEASURE, b.file.replace(".dc.html", ".html"));
  writeFileSync(f, dc(b.html.replace("__H__", "auto")));
  return { url: `file://${f}`, w: b.w + 40, h: 1000, measure: ".chai-app", wait: 900 };
});
const res = JSON.parse(execFileSync("node", [join(HERE, "cdp.mjs"), writeJobs(jobs)], { encoding: "utf8" }).trim().split("\n").at(-1));
function writeJobs(j) { const p = join(MEASURE, "jobs.json"); writeFileSync(p, JSON.stringify(j)); return p; }

const heightsFile = join(HERE, "heights.json");
const heights = existsSync(heightsFile) ? JSON.parse(readFileSync(heightsFile, "utf8")) : {};
rendered.forEach((b, i) => { b.h = res[i].height; heights[b.file] = b.h; });
writeFileSync(heightsFile, JSON.stringify(heights, null, 2));

// Pass 2: the artboards at their measured size.
for (const b of rendered) writeFileSync(join(OUT, b.file), dc(b.html.replace("__H__", `${b.h}px`)));

// canvas.json: one page per direction (desktop, then phone beside it), then states and forms.
const all = BOARDS.map((b) => ({ ...b, h: heights[b.file] ?? 1000 }));
const artboards = [];
for (const page of PAGES) {
  let x = 0;
  for (const b of all.filter((b) => b.page === page.id)) {
    artboards.push({ file: b.file, x, y: 0, w: b.w, h: b.h, page: page.id });
    x += b.w + 120;
  }
}
const canvas = {
  pages: PAGES.map(({ id, name }) => ({ id, name })),
  artboards,
  annotations: NOTES.map((n, i) => ({ id: `note-${i + 1}`, x: 0, y: -90, w: 1100, text: n.text, page: n.page })),
  launch: { view: "canvas", page: PAGES[0].id },
};
writeFileSync(join(OUT, "canvas.json"), `${JSON.stringify(canvas, null, 2)}\n`);

// The single page to publish.
const previewOut = join(BUILD, "preview", "accounts-designs.html");
mkdirSync(dirname(previewOut), { recursive: true });
const { index, fragments } = previewPage(all.map((b) => ({ ...b, html: (rendered.find((r) => r.file === b.file)?.html ?? b.render()).replace("__H__", `${b.h}px`) })), CSS, FONT_LINK);
writeFileSync(previewOut, index);
const boardsDir = join(dirname(previewOut), "boards");
rmSync(boardsDir, { recursive: true, force: true });
mkdirSync(boardsDir, { recursive: true });
for (const f of fragments) writeFileSync(join(dirname(previewOut), f.path), f.html);
writeFileSync(join(dirname(previewOut), "files.json"), JSON.stringify(Object.fromEntries(fragments.map((f) => [f.path, join(dirname(previewOut), f.path)])), null, 1));
console.log(rendered.map((b) => `${b.file} ${b.w}×${b.h}`).join("\n"));
