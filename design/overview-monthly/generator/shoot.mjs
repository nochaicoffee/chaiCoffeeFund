// usage: node shoot.mjs MoA [MoB ...]   (a pick: "MoE@e-2026-07")  -> out/shots/<name>.png
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), D = resolve(HERE, "..");
const S = join(HERE, "out", "shots"); mkdirSync(S, { recursive: true });
const h = JSON.parse(readFileSync(join(HERE, "heights.json"), "utf8"));
const jobs = process.argv.slice(2).map((spec) => {
  const [n, pick] = spec.split("@");
  const js = pick ? `(() => { for (const k of '${pick}'.split('+')) { const r = document.getElementById(k); if (r) { r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); } } return 1; })()` : undefined;
  return { url: `file://${D}/${n}.dc.html`, w: 1520, h: h[`${n}.dc.html`], out: join(S, `${n}${pick ? "@" + pick : ""}.png`), wait: 2600, ...(js ? { eval: js } : {}) };
});
const jf = join(HERE, "out", "measure", "shot.json"); writeFileSync(jf, JSON.stringify(jobs));
const out = execFileSync("node", [join(HERE, "cdp.mjs"), jf], { encoding: "utf8" }).trim().split("\n").at(-1);
console.log(out.slice(0, 400));
