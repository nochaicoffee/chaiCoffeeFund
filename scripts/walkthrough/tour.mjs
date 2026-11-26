/**
 * Records a captioned tour of the demo app (docs/walkthrough.md) as an MP4: every dashboard, a pointing greeting figure,
 * scrolling, with a visible cursor. With --save-spend it also taps one Daily spend (Lunch, ₹360) to show a save, which writes a row
 * to whatever Sheet the app uses: pass it only for the demo app. The app can't tell the script which Sheet that is, so the choice is
 * the caller's, never the port's.
 * Playwright and ffmpeg-static aren't project dependencies: point PLAYWRIGHT_DIR at a folder where both were installed.
 *
 * Usage: PLAYWRIGHT_DIR=<dir> node scripts/walkthrough/tour.mjs [outDir] [desktop|phone] [--save-spend]
 */
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? ".", "package.json"));
const { chromium } = require("playwright");
const ffmpeg = require("ffmpeg-static");

const APP = process.env.DEMO_URL ?? "http://localhost:3100";
const SAVE_SPEND = process.argv.includes("--save-spend");
const [OUT = "walkthrough-out/video", MODE = "desktop"] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const SIZE = MODE === "phone" ? { width: 390, height: 844 } : { width: 1440, height: 900 };

/** A cursor that the recording can see, captions, and no dev-mode badge. */
const OVERLAY = `
addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = \`
    nextjs-portal { display: none !important; }
    #tour-cursor { position: fixed; z-index: 2147483647; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
      background: rgba(20,20,20,.25); border: 2px solid rgba(255,255,255,.95); box-shadow: 0 1px 6px rgba(0,0,0,.35);
      pointer-events: none; transition: transform .12s; left: -50px; top: -50px; }
    #tour-cursor.down { transform: scale(.7); background: rgba(20,20,20,.45); }
    #tour-caption { position: fixed; z-index: 2147483646; left: 50%; bottom: ${MODE === "phone" ? 96 : 28}px; transform: translateX(-50%);
      max-width: min(860px, 92vw); padding: 12px 20px; border-radius: 14px; background: rgba(17,17,17,.86); color: #fff;
      font: 600 ${MODE === "phone" ? 15 : 19}px/1.35 system-ui, sans-serif; text-align: center; pointer-events: none;
      opacity: 0; transition: opacity .35s; }
    #tour-caption small { display: block; font-weight: 400; opacity: .8; font-size: .82em; margin-top: 2px; }\`;
  document.head.appendChild(style);
  const cursor = Object.assign(document.createElement("div"), { id: "tour-cursor" });
  const caption = Object.assign(document.createElement("div"), { id: "tour-caption" });
  document.body.append(cursor, caption);
  const last = sessionStorage.getItem("tour-xy");
  if (last) { const [x, y] = JSON.parse(last); cursor.style.left = x + "px"; cursor.style.top = y + "px"; }
  const saved = sessionStorage.getItem("tour-caption");
  if (saved) { caption.innerHTML = saved; caption.style.opacity = 1; }
  addEventListener("mousemove", (e) => { cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px"; sessionStorage.setItem("tour-xy", JSON.stringify([e.clientX, e.clientY])); }, true);
  addEventListener("mousedown", () => cursor.classList.add("down"), true);
  addEventListener("mouseup", () => cursor.classList.remove("down"), true);
  window.__tourCaption = (html) => { sessionStorage.setItem("tour-caption", html); caption.innerHTML = html; caption.style.opacity = html ? 1 : 0; };
});`;

mkdirSync(OUT, { recursive: true });
const raw = path.join(OUT, `raw-${MODE}`);
rmSync(raw, { recursive: true, force: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SIZE, deviceScaleFactor: 1, colorScheme: "light", recordVideo: { dir: raw, size: SIZE },
  ...(MODE === "phone" ? { isMobile: true, hasTouch: true } : {}),
});
await context.addInitScript(OVERLAY);
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);
let mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };

async function glide(x, y, steps = 25) {
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}
async function point(locator, hold = 2200) {
  const box = await locator.boundingBox();
  if (!box) return false;
  await glide(box.x + box.width / 2, box.y + box.height / 2);
  await wait(hold);
  return true;
}
async function click(locator) {
  await locator.scrollIntoViewIfNeeded();
  await point(locator, 350);
  await locator.click();
}
async function scroll(px, step = 40) {
  await glide(SIZE.width * (MODE === "phone" ? 0.5 : 0.62), SIZE.height * 0.55, 10);
  for (let done = 0; done < px; done += step) {
    await page.mouse.wheel(0, step);
    await wait(45);
  }
}
const caption = (title, more = "") => page.evaluate((html) => window.__tourCaption?.(html), title ? `${title}${more ? `<small>${more}</small>` : ""}` : "");
async function open(href) {
  if (MODE === "phone") {
    await page.goto(APP + href, { waitUntil: "networkidle" });
  } else {
    await click(page.locator(`nav a[href="${href}"], aside a[href="${href}"]`).first());
    await page.waitForURL((url) => url.pathname === href, { timeout: 60_000 });
    await page.waitForLoadState("networkidle");
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator("h1").first().waitFor({ timeout: 60_000 });
  await wait(900);
}
/** The greeting's first pointable figure: a button with a rupee figure in it, inside the page's header. */
const firstFigure = () => page.locator("header button, h1 ~ p button, h1 + p button").filter({ hasText: "₹" }).first();

// Every stop: page, caption, what it's for, how far to scroll.
const STOPS = [
  ["/accounts", "Accounts", "Every bank balance, and how money moved in and out each month.", 1500],
  ["/cards", "Cards", "Each credit card's bill, due date and spending. Mark a bill paid from here.", 1700],
  ["/subscriptions", "Subscriptions", "Everything that renews: what it costs a month, a year, and what's due next.", 1500],
  ["/income", "Income", "Salary and other income, month by month, with pay changes.", 1200],
  ["/expenses", "Expenses", "Where each month's money went: card bills, cash and UPI, big spends.", 1400],
  ["/loans", "Loans", "Each loan's EMIs, what's left, and what a prepayment would save.", 1200],
  ["/lent", "Lent out", "Money lent to friends: what's owed back, with interest.", 1000],
  ["/insurance", "Insurance", "Every policy, what it covers, and when it renews.", 1000],
  ["/goals", "Goals", "Plan for things: each goal is a planet. Set money aside and watch it fill.", 700],
  ["/investments", "Investments", "Holdings at today's prices, returns against the index, and your targets.", 2200],
  ["/fixed-income", "Fixed income", "Fixed deposits and PF: what they're worth and when they mature.", 1100],
];

await page.goto(APP + "/", { waitUntil: "networkidle", timeout: 120_000 });
await wait(1200);
if (MODE !== "phone") {
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible().catch(() => false)) await click(expand);
}
await caption("Chai Coffee Fund", "A personal finance dashboard on your own Google Sheet. Everything here is made up.");
await wait(3500);
await caption("Overview", "Your whole picture: net worth, this month, and what's coming up.");
await wait(2000);
await caption("Bold figures explain themselves", "Point at one (or tap it on a phone) to see what's behind it.");
if (await point(firstFigure(), 3500)) await glide(mouse.x, mouse.y + 220, 15);
await caption("Overview", "Tiles for every part of your money, then month by month.");
await scroll(2600);
await wait(800);

for (const [href, title, more, px] of STOPS.slice(0, 5)) {
  await caption(title, more);
  await open(href);
  await wait(3200);
  await scroll(px);
  await wait(1500);
}

await caption("Daily", "A quick diary of everyday spends.");
await open("/daily");
await wait(1500);
await caption("Add a spend in one tap", "Tap a usual one, or type an amount, pick UPI, card or cash, and save.");
// The page also holds the phone layout's copy of each chip, hidden: take the one on screen.
let chip;
for (const candidate of await page.getByRole("button", { name: /^Add Lunch/ }).all()) if (await candidate.isVisible()) chip = candidate;
if (!chip) console.warn("No Lunch chip on screen: the Daily stop shows the page only.");
else if (!SAVE_SPEND) await point(chip, 3000); // Points at it without tapping: nothing is written.
else {
  await point(chip, 1600);
  await chip.click();
  await caption("Saved straight to the Sheet", "Today's total and the month update at once. Undo is there for a few seconds.");
  await wait(4500);
}
await scroll(900);
await wait(1200);

for (const [href, title, more, px] of STOPS.slice(5)) {
  await caption(title, more);
  await open(href);
  await wait(3200);
  await scroll(px);
  await wait(1500);
}
await caption("That's the app", "Set up your own copy from the Setup page: your Sheet, your Google sign-in, nothing shared.");
await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
await wait(3500);

const video = page.video();
await context.close();
await browser.close();
const webm = await video.path();
const mp4 = path.join(OUT, `tour-${MODE}.mp4`);
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "medium", "-movflags", "+faststart", mp4]);
rmSync(raw, { recursive: true, force: true });
console.log(mp4);
