// Headless Edge over the DevTools protocol.
// usage: node cdp.mjs jobs.json   — each job: { url, w, h, scale?, out?, measure?: selector, eval?: js }
// HEADLESS_BROWSER overrides the browser binary (any Chromium-based one, e.g. Google Chrome).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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
  if (!target) throw new Error(`Edge started but opened no page on port ${port}. Is the port taken, or is another Edge using the profile?`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id); });
  // Every call gives up after 60s, so a page that stops answering fails its job instead of hanging the build.
  const send = (method, params = {}, ms = 60000) => new Promise((res) => { const my = ++id; const timer = setTimeout(() => { pending.delete(my); res({ error: { message: `${method} timed out after ${ms / 1000}s` } }); }, ms); pending.set(my, (m) => { clearTimeout(timer); res(m); }); ws.send(JSON.stringify({ id: my, method, params })); });
  await send("Page.enable");
  for (const job of jobs) {
    await send("Emulation.setDeviceMetricsOverride", { width: job.w, height: job.h ?? 1200, deviceScaleFactor: job.scale ?? 1, mobile: false });
    await send("Page.navigate", { url: job.url });
    await sleep(job.wait ?? 1800);
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });
    if (job.eval) { await send("Runtime.evaluate", { expression: job.eval, awaitPromise: true }); await sleep(job.after ?? 1000); }
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
      if (job.h > 16000) console.error(`warning: ${job.url} is ${job.h}px tall`);
      // Tall pages are captured in 3000px slices (out.part0.png, …) for shoot.sh to stitch: one capture of a whole
      // tall board can stall headless Edge (found 2026-10-21 on the 5,658px Y selectors board).
      const full = job.h ?? 1200;
      if (!job.clip && full > 4000) {
        r.parts = [];
        for (let y = 0, k = 0; y < full; y += 3000, k++) {
          const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y, width: job.w, height: Math.min(3000, full - y), scale: 1 } });
          if (!shot.result?.data) { r.error = shot.error?.message ?? "no screenshot"; break; }
          const part = job.out.replace(/\.png$/, `.part${k}.png`);
          writeFileSync(part, Buffer.from(shot.result.data, "base64"));
          r.parts.push(part);
        }
      } else {
        const clip = job.clip ? { ...job.clip, scale: 1 } : undefined;
        const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(clip ? { clip } : {}) });
        if (shot.result?.data) writeFileSync(job.out, Buffer.from(shot.result.data, "base64")); else r.error = shot.error?.message ?? "no screenshot";
      }
      r.out = job.out;
    }
    results.push(r);
  }
  ws.close();
} finally {
  proc.kill();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }); } catch {}
}
console.log(JSON.stringify(results));
