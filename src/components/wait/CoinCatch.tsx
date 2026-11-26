"use client";

import { useEffect, useRef, useState } from "react";
import { loadBest, saveBest } from "@/lib/game/bestScore";
import { aim, CUP_W, initGame, resize, step, type CatchState, type Drop } from "@/lib/game/coinCatch";

// The canvas draws with hex, which every browser reads; the cup is the Kulhad's terracotta.
const CLAY = "#a6623e";
const CLAY_DARK = "#7c4426";
const CHAI = "#c08a52";
const COIN = "#efc53b";
const COIN_EDGE = "#c79b1d";
const COIN_INK = "#7a5a14";
const EMI = "#b8453f";
const GOOD = "#2f7d4a";
const MUTED = "#6b6f78";
const SHADOW = "rgba(0,0,0,0.12)";

/** A rounded rectangle path by hand: ctx.roundRect is missing before Safari 16 and Firefox 112, and a throw inside the frame would freeze the board. */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawDrop(ctx: CanvasRenderingContext2D, d: Drop) {
  if (d.kind === "emi") {
    ctx.fillStyle = EMI;
    roundedRect(ctx, d.x - 17, d.y - 10, 34, 20, 6);
    ctx.fill();
    text(ctx, "EMI", d.x, d.y + 1, 10, "#fff");
    return;
  }
  const big = d.kind === "big";
  ctx.beginPath();
  ctx.arc(d.x, d.y, big ? 13 : 10, 0, Math.PI * 2);
  ctx.fillStyle = COIN;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COIN_EDGE;
  ctx.stroke();
  text(ctx, big ? "₹10" : "₹", d.x, d.y + 1, big ? 10 : 12, COIN_INK);
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string) {
  ctx.font = `800 ${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
}

function draw(ctx: CanvasRenderingContext2D, s: CatchState, hint: boolean) {
  ctx.clearRect(0, 0, s.w, s.h);
  for (const d of s.drops) drawDrop(ctx, d);
  // The kulhad: a dish shadow, a tapering body, the chai in its mouth.
  const top = s.h - 46;
  const x = s.cupX;
  const half = CUP_W / 2;
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(x, s.h - 8, half + 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(x - half, 0, x + half, 0);
  body.addColorStop(0, CLAY_DARK);
  body.addColorStop(0.4, CLAY);
  body.addColorStop(1, CLAY_DARK);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - half, top);
  ctx.lineTo(x + half, top);
  ctx.lineTo(x + half - 9, top + 38);
  ctx.lineTo(x - half + 9, top + 38);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (const k of [12, 25]) {
    ctx.beginPath();
    ctx.moveTo(x - half + k * 0.24, top + k);
    ctx.lineTo(x + half - k * 0.24, top + k);
    ctx.stroke();
  }
  ctx.fillStyle = CHAI;
  ctx.beginPath();
  ctx.ellipse(x, top, half, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#d89a62";
  ctx.beginPath();
  ctx.ellipse(x, top, half, 6, 0, 0, Math.PI);
  ctx.stroke();
  for (const f of s.flashes) text(ctx, `${f.delta > 0 ? "+" : ""}${f.delta}`, f.x, f.y, 14, f.delta < 0 ? EMI : GOOD);
  if (hint) text(ctx, "Slide to catch ₹ · dodge EMI", s.w / 2, 22, 12, MUTED);
}

/**
 * Coin catch on a canvas: the rules are in lib/game/coinCatch.ts, this draws them and reads the
 * pointer and keys. Keys only steer while the board has focus, so the page's own scrolling and
 * shortcuts are untouched; a vertical swipe still scrolls the page (touch-action: pan-y); it
 * pauses when the tab is hidden or the board is scrolled off; Esc or the Done button leaves.
 */
export function CoinCatch({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState({ score: 0, best: 0 });
  // The wait screen re-renders every 250 ms and hands a new onExit each time; the game must not restart with it.
  const exit = useRef(onExit);
  useEffect(() => {
    exit.current = onExit;
  });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let state = initGame(1, 1, loadBest());
    let raf = 0;
    let last = 0;
    let hint = 4;
    let onscreen = true;
    const keys = { left: false, right: false };
    let reported = { score: -1, best: -1 };

    let ready = false;
    const fit = () => {
      const r = el.getBoundingClientRect();
      // Not laid out yet (no width): wait for the observer to tell us the real size, so the cup starts in the middle.
      if (r.width <= 0 || r.height <= 0) return;
      ready = true;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.max(1, Math.round(r.width * dpr));
      el.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = resize(state, r.width, r.height);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (!ready) return;
      hint -= dt;
      state = step(state, dt, Math.random, keys);
      draw(ctx, state, hint > 0);
      if (state.score !== reported.score || state.best !== reported.best) {
        reported = { score: state.score, best: state.best };
        setShown(reported);
      }
    };
    const run = () => {
      const should = !document.hidden && onscreen;
      if (should && !raf) raf = requestAnimationFrame(frame);
      if (!should && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        saveBest(state.best);
      }
    };
    const x = (e: PointerEvent) => e.clientX - el.getBoundingClientRect().left;
    const onDown = (e: PointerEvent) => {
      el.focus({ preventScroll: true });
      state = aim(state, x(e));
    };
    const onMove = (e: PointerEvent) => {
      // A mouse steers while it hovers; a finger or pen only while it is down.
      if (e.pointerType === "mouse" || e.buttons) state = aim(state, x(e));
    };
    const onKey = (e: KeyboardEvent) => {
      const down = e.type === "keydown";
      if (e.key === "Escape" && down) return exit.current();
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "ArrowLeft" || k === "a") keys.left = down;
      else if (k === "ArrowRight" || k === "d") keys.right = down;
      else return;
      e.preventDefault();
    };
    const onBlur = () => {
      keys.left = keys.right = false;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      run();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("pagehide", onBlur);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("keydown", onKey);
    el.addEventListener("keyup", onKey);
    el.addEventListener("blur", onBlur);
    el.focus({ preventScroll: true });
    run();
    return () => {
      cancelAnimationFrame(raf);
      saveBest(state.best);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("pagehide", onBlur);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("keyup", onKey);
      el.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div className="wait-in-quick w-[min(100%,460px)]">
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label="Coin catch, an optional game. Arrow keys or drag to move the cup. Escape to leave."
        className="block h-[200px] w-full cursor-grab touch-pan-y rounded-[18px] surface-edge bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-muted">
        <span>
          ₹ {shown.score} · best {shown.best}
        </span>
        <button type="button" onClick={onExit} className="rounded-full bg-fill px-3 py-1 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
          Done
        </button>
      </div>
    </div>
  );
}
