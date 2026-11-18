(() => {
  const out = [];
  const name = (el) => { const t = el.querySelector(".card-t, h2, h3, .k, b"); return (t ? t.textContent : el.textContent).trim().replace(/\s+/g, " ").slice(0, 34); };
  const isCard = (el) => el.matches(".card, .stile");
  const bottomOf = (el) => { if (isCard(el)) return el.getBoundingClientRect().bottom; const cs = [...el.querySelectorAll(":scope > .card, :scope > .stile, :scope > div > .card, :scope > section")].filter((c) => c.offsetParent); return cs.length ? Math.max(...cs.map((c) => c.getBoundingClientRect().bottom)) : null; };
  for (const el of document.querySelectorAll(".chai-app *")) {
    const cs = getComputedStyle(el);
    const rowish = cs.display === "grid" || (cs.display === "flex" && cs.flexDirection.startsWith("row"));
    if (!rowish) continue;
    const kids = [...el.children].filter((k) => k.getClientRects().length && getComputedStyle(k).position !== "absolute" && !getComputedStyle(k).gridRow.includes("span") && k.getBoundingClientRect().height > 40);
    const rows = {};
    for (const k of kids) { const r = k.getBoundingClientRect(); (rows[Math.round(r.top / 6)] ||= []).push(k); }
    for (const row of Object.values(rows)) {
      const cards = row.filter((k) => isCard(k) || bottomOf(k) !== null && k.querySelector(".card"));
      if (cards.length < 2) continue;
      const b = cards.map(bottomOf).filter((x) => x != null);
      const gap = Math.max(...b) - Math.min(...b);
      if (gap > 12) out.push(`ROW gap ${Math.round(gap)}px: ${cards.map((c) => `[${name(c)}] ${Math.round(bottomOf(c) - cards[0].getBoundingClientRect().top)}`).join(" | ")}`);
    }
  }
  for (const c of document.querySelectorAll(".chai-app .card")) {
    if (!c.getClientRects().length) continue;
    const r = c.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(c).paddingBottom);
    const kids = [...c.children].filter((k) => k.getClientRects().length && getComputedStyle(k).position !== "absolute" && !k.classList.contains("tex"));
    if (!kids.length) continue;
    const last = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
    const gap = r.bottom - pad - last;
    if (gap > 24) out.push(`INSIDE gap ${Math.round(gap)}px: [${name(c)}]`);
  }
  return [...new Set(out)];
})()
