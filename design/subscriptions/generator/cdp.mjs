// Headless Edge over the DevTools protocol.
// usage: node cdp.mjs jobs.json   — each job: { url, w, h, scale?, out?, measure?: selector, eval?: js }
// HEADLESS_BROWSER overrides the browser binary (any Chromium-based one, e.g. Google Chrome).
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const jobs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const edge = process.env.HEADLESS_BROWSER || "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
if (!existsSync(edge)) throw new Error(`No browser at ${edge}. Set HEADLESS_BROWSER to a Chromium-based browser binary.`);
const profile = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "edge-"));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(edge, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id); });
  const send = (method, params = {}) => new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable");
  for (const job of jobs) {
    await send("Emulation.setDeviceMetricsOverride", { width: job.w, height: job.h ?? 1200, deviceScaleFactor: job.scale ?? 1, mobile: false });
    await send("Page.navigate", { url: job.url });
    await sleep(job.wait ?? 1800);
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });
    if (job.eval) await send("Runtime.evaluate", { expression: job.eval, awaitPromise: true });
    const r = { url: job.url };
    if (job.measure) {
      const m = await send("Runtime.evaluate", { expression: `Math.ceil(document.querySelector(${JSON.stringify(job.measure)}).getBoundingClientRect().height)`, returnByValue: true });
      r.height = m.result?.result?.value;
    }
    if (job.collect) {
      const m = await send("Runtime.evaluate", { expression: job.collect, returnByValue: true, awaitPromise: true });
      r.value = m.result?.result?.value ?? m.result?.exceptionDetails?.exception?.description;
    }
    if (job.out) {
      const clip = job.clip ? { ...job.clip, scale: 1 } : undefined;
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(clip ? { clip } : {}) });
      writeFileSync(job.out, Buffer.from(shot.result.data, "base64"));
      r.out = job.out;
    }
    results.push(r);
  }
  ws.close();
} finally {
  proc.kill();
}
console.log(JSON.stringify(results));
