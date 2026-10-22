#!/bin/zsh
# usage: shoot.sh Name [Name...]  — screenshots design/accounts/<Name>.dc.html at its measured size into out/shots/<Name>.png
# A name can carry a pick: Name@hdfc checks the radio <prefix>-sel-hdfc first (prefix = the board's own).
G=${0:A:h}
D=${G:h}
S=$G/out/shots
mkdir -p $S $G/out/measure
python3 - "$G" "$D" "$S" "$@" <<'PY'
import json, sys
G, D, S, *names = sys.argv[1:]
h = json.load(open(f"{G}/heights.json"))
c = json.load(open(f"{D}/canvas.json"))
jobs = []
for spec in names:
    n, _, pick = spec.partition("@")
    w = next((a["w"] for a in c["artboards"] if a["file"] == f"{n}.dc.html"), 1600)
    js = ""
    if pick:
        js = "(() => { for (const k of '" + pick + "'.split('+')) { const r = [...document.querySelectorAll('input.pk-in')].find((i) => i.id.endsWith('-sel-' + k) || i.id.endsWith('-' + k)); if (r) r.checked = true; } return 1; })()"
    out = f"{S}/{n}{('@' + pick) if pick else ''}.png"
    jobs.append({"url": f"file://{D}/{n}.dc.html", "w": w, "h": h.get(f"{n}.dc.html", 1200), "out": out, "wait": 1200, **({"eval": js} if js else {})})
json.dump(jobs, open(f"{G}/out/measure/shot.json", "w"))
PY
node $G/cdp.mjs $G/out/measure/shot.json > $G/out/measure/shot.out && python3 - "$G/out/measure/shot.out" <<'PY2'
import json, sys, os
from PIL import Image
for r in json.loads(open(sys.argv[1]).read().strip().split("\n")[-1]):
    if r.get("error"): print("failed:", r["url"].split("/")[-1], r["error"])
    parts = r.get("parts") or []
    if parts:
        ims = [Image.open(p) for p in parts]
        out = Image.new("RGB", (ims[0].width, sum(i.height for i in ims)), "white")
        y = 0
        for i in ims: out.paste(i, (0, y)); y += i.height
        out.save(r["out"])
        for p in parts: os.remove(p)
PY2
echo done
