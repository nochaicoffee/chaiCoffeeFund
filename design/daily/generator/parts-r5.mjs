// Round 5 (2026-11-19): the budget strip leaves the hero and sits under it. The hero already says what he has spent and how far through the limit that is,
// so the strip's job is what's left. Three treatments, each under the hero (H2's header, the shortest) with the "Right now" widgets below it.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as R from "./parts-r2.mjs";
import * as X from "./parts-r4.mjs";
const { inr } = L;

const m = D.NOVM, b = m.budget;
const over = b.left < 0;
const pill = () => (over ? `<span class="pill pill-due">${inr(-b.left)} over the limit</span>` : b.overPace > 0 ? `<span class="pill pill-warn">${inr(b.overPace)} over pace</span>` : `<span class="pill pill-on">${inr(-b.overPace)} under pace</span>`);
const tone = over ? "neg" : b.overPace > 0 ? "warn" : "ok";
const bar = () => `<span class="bs-bar ${tone}"><i style="width:${Math.min(100, b.used * 100)}%"></i><u style="left:${(b.expected / b.limit) * 100}%"></u></span>`;
const todayCell = () => (b.todayLeft < 0 ? ["Over today by", inr(-b.todayLeft), "neg"] : ["Left today", inr(b.todayLeft), ""]);

/** S1: the strip as it was, light, full width, under the hero. */
export const s1 = (phone = false) => R.strip(m, { wide: !phone });

/** S2: one slim row: what's left, the bar with the pace tick, the pill, left today. Nothing the hero already says. */
export const s2 = () => { const [k, v, c] = todayCell(); return `<div class="sl"><div class="sl-l"><small>${over ? "Over the limit" : "Left to spend"}</small><b class="${over ? "neg" : ""}">${inr(Math.abs(b.left))}</b></div><div class="sl-m">${bar()}<small><i class="bs-t"></i>Pace for the ${m.counted}th: <b>${inr(b.expected)}</b></small></div>${pill()}<div class="sl-r"><span>${k} <b class="${c}">${v}</b></span><span>${b.daysLeft} days to go</span></div></div>`; };

/** S3: a card, what's left with its bar on one side and three small figures (left today, the pace, days to go) on the other. */
export const s3 = () => { const [k, v, c] = todayCell(); return `<div class="s3"><div class="s3-l"><small>${over ? "Over the limit" : "Left to spend"} \u00b7 November</small><div class="s3-big"><b class="${over ? "neg" : ""}">${inr(Math.abs(b.left))}</b><em>of ${inr(b.limit)}</em>${pill()}</div>${bar()}</div><div class="s3-cells"><div class="s3-c"><small>${k}</small><b class="${c}">${v}</b><em>of ${inr(b.allowToday)} for today</em></div><div class="s3-c"><small>Pace today</small><b>${inr(b.expected)}</b><em>for the ${m.counted}th; you're at ${inr(m.total)}</em></div><div class="s3-c"><small>Days to go</small><b>${b.daysLeft}</b><em>incl. today</em></div></div></div>`; };

const STRIPS = { s1, s2, s3 };
/** The hero (no strip inside), the strip under it, then the Right now widgets. */
export const under = (key, { compact = false } = {}) => `${X.heroWith(X.head2, { compact, strip: false })}<div class="under">${STRIPS[key](compact)}</div><div class="under">${R.glance(m, { cols: compact ? 2 : 4 })}</div>`;
