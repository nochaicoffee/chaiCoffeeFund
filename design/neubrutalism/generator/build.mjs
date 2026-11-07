// Builds design/neubrutalism/*.dc.html + canvas.json from the board modules.
// usage: node build.mjs [--only=A]   then ./shoot.sh to screenshot (needs Node 22+, Microsoft Edge).
import { writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const names = ["A", "B", "C", "D"].filter((n) => !only || only.includes(n));
const boards = [];
for (const n of names) {
  try { boards.push((await import(`./board${n}.mjs`)).default); } catch (e) { if (e.code !== "ERR_MODULE_NOT_FOUND") throw e; }
}

const dc = (b) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${b.fonts}&display=swap">
  <style>
body { margin: 0; }
${b.css}
  </style>
</helmet>
${b.html}
</x-dc>
</body>
</html>
`;

for (const b of boards) writeFileSync(join(OUT, b.file), dc(b));

const canvas = {
  pages: [{ id: "overview", name: "Overview · illustration styles" }],
  artboards: boards.map((b, i) => ({ file: b.file, x: (i % 2) * (b.w + 120), y: Math.floor(i / 2) * (b.h + 160), w: b.w, h: b.h, page: "overview" })),
  annotations: boards.map((b, i) => ({ id: `note-${i}`, x: (i % 2) * (b.w + 120), y: Math.floor(i / 2) * (b.h + 160) - 90, w: b.w, page: "overview", text: b.note })),
  launch: { view: "canvas", page: "overview" },
};
writeFileSync(join(OUT, "canvas.json"), JSON.stringify(canvas, null, 2) + "\n");
console.log("built", boards.map((b) => b.file).join(", "));
