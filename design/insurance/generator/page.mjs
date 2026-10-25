// The recommended page: the cover map as the hero (a policy is the pick), then the rest. A pick drives Premiums paid and Policy details
// (CSS only: radios + :has(), so it works in the preview). "All policies" shows every payment and the next renewal's details.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as H from "./heroes.mjs";
const { I, inr, plural } = L;
const { card, cardHead, grid, page } = P;
export const IDS = ["all", ...L.POLICIES.map((p) => p.id)];
const radios = () => IDS.map((id) => `<input type="radio" class="pk-in" name="ins-sel" id="ins-sel-${id}"${id === "all" ? " checked" : ""} aria-label="${id}">`).join("");
const pickCss = () => `<style>.insdir .nb.fill { flex: 1; flex-direction: column; } .insdir .nb.fill > .card { flex: 1; }
${IDS.map((id) => `.insdir:has(#ins-sel-${id}:checked) .nb-${id} { display: flex; }`).join("\n")}
${L.POLICIES.map((p) => `.insdir:has(#ins-sel-${p.id}:checked) .pick:not(.pk-${p.id}) { opacity: 0.45; }
.insdir:has(#ins-sel-${p.id}:checked) label[for="ins-sel-${p.id}"].pol { box-shadow: 0 0 0 2px var(--c), var(--card-shadow); }`).join("\n")}
.insdir:has(#ins-sel-all:checked) label[for="ins-sel-all"].allchip { background: var(--ink); color: var(--on-ink); }</style>`;
const blocks = (render) => IDS.map((id) => `<div class="nb fill nb-${id}">${render(id)}</div>`).join("");
const allChip = `<label for="ins-sel-all" class="chip allchip" style="cursor:pointer">All policies</label>`;
export function build({ w = 1600 } = {}) {
  const hero = H.mapHero({ pick: true, label: "What's protected · pick a policy and the page follows", extra: `<div class="between">${allChip}<span class="muted" style="font-size:12px;font-weight:600">Click a policy to see its payments and details below</span></div>` });
  const rest = `${grid([[7, H.runwayCard({ W: 773, H: 205 })], [5, P.comingUp({ n: 5, filter: false })]])}${grid([[12, P.policiesTable()]])}${grid([[6, blocks((id) => P.paymentsCard({ pickId: id === "all" ? null : id }))], [6, blocks((id) => P.policyDetails(id === "all" ? L.NEXT : L.policy(id), { note: id === "all" ? `<span class="muted" style="font-size:12px;font-weight:600">Showing the next to renew</span>` : "" }))]])}${grid([[7, P.timelineCard()], [5, P.ncbCard()]])}${grid([[12, P.costCard()]])}`;
  return `<div class="chai-app desk insdir" style="width:${w}px;height:__H__">${radios()}${pickCss()}${L.rail()}<main class="main glass"><div style="display:flex;flex-direction:column;gap:20px">${P.greeting()}${P.attention()}${hero}${rest}</div></main></div>`;
}
export const final = () => build();
