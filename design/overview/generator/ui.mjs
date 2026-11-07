// Small shared pieces of the stages.
export const radios = (p, keys, def = keys[0]) => keys.map((k) => `<input class="pk-in" type="radio" name="${p}" id="${p}-${k}"${k === def ? " checked" : ""}>`).join("");
export const big = (n) => `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`;
export const stile = (k, v, s = "") => `<div class="s-tile"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
export const chip = (k, v) => `<span class="s-chip">${k} <b>${v}</b></span>`;
